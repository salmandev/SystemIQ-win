import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuid } from 'uuid';
import type { Database } from './database';
import type { SettingsManager } from './settings-manager';
import type { StorageScanResult, FolderNode, FileInfo, FolderInfo, StorageGrowthAlert, StorageCategory } from '../../shared/types';

const EXCLUDED_DIRS = new Set([
  '$Recycle.Bin', 'System Volume Information', '$WINDOWS.~BT',
  'Windows.old', '$WinREAgent', 'Recovery'
]);

export class StorageScanner {
  constructor(
    private db: Database,
    private settings?: SettingsManager,
  ) {}

  async scan(drive?: string): Promise<StorageScanResult> {
    const scanId = uuid();
    const startTime = Date.now();
    const drives = await this.scanDrives(drive);
    const largestFiles = this.collectLargestFiles(drives, 100);
    const largestFolders = this.collectLargestFolders(drives, 50);

    const result: StorageScanResult = {
      scanId,
      timestamp: Date.now(),
      drives,
      totalSize: drives.reduce((sum, d) => sum + d.totalSize, 0),
      totalUsed: drives.reduce((sum, d) => sum + d.usedSpace, 0),
      largestFiles,
      largestFolders,
      duration: Date.now() - startTime,
    };

    this.db.saveScan(scanId, 'storage', result, result.duration);

    const historyEntries = this.flattenFolderSizes(drives.flatMap(d => d.rootFolders));
    this.db.saveStorageHistory(scanId, historyEntries);

    return result;
  }

  private async scanDrives(specificDrive?: string) {
    const drives: { drive: string; label: string; totalSize: number; usedSpace: number; freeSpace: number; rootFolders: FolderNode[] }[] = [];
    const configuredDrives = this.settings?.scanPreferences.include_drives;
    const driveLetters = specificDrive
      ? [specificDrive]
      : configuredDrives && configuredDrives.length > 0
        ? configuredDrives
        : this.getAvailableDrives();

    for (const letter of driveLetters) {
      try {
        const stats = await this.getDriveStats(letter);
        const rootFolders = await this.scanDirectory(letter + path.sep, 3);
        drives.push({
          drive: letter,
          label: `${letter}:`,
          totalSize: stats.total,
          usedSpace: stats.used,
          freeSpace: stats.free,
          rootFolders,
        });
      } catch {
        // Skip inaccessible drives
      }
    }
    return drives;
  }

  private getAvailableDrives(): string[] {
    const drives: string[] = [];
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      try {
        const testPath = `${letter}:\\`;
        if (fs.existsSync(testPath)) {
          drives.push(letter);
        }
      } catch {
        // Drive not available
      }
    }
    return drives;
  }

  private async getDriveStats(drive: string): Promise<{ total: number; used: number; free: number }> {
    try {
      const si = await import('systeminformation');
      const fsData = await si.fsSize();
      const match = fsData.find(d => d.mount?.startsWith(drive + ':'));
      if (match) {
        return { total: match.size, used: match.used, free: match.available };
      }
    } catch {
      // Fallback
    }
    return { total: 0, used: 0, free: 0 };
  }

  private async scanDirectory(dirPath: string, maxDepth: number, currentDepth = 0): Promise<FolderNode[]> {
    if (currentDepth >= maxDepth) return [];

    const nodes: FolderNode[] = [];
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        // Skip folders in the ignore list from settings
        const ignoreFolders = this.settings?.scanPreferences.ignore_folders || [];
        if (ignoreFolders.some(ig => entry.name.toLowerCase() === ig.toLowerCase())) continue;

        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          try {
            const { size, fileCount, folderCount } = this.getDirectorySize(fullPath);
            const children = currentDepth < maxDepth - 1
              ? await this.scanDirectory(fullPath, maxDepth, currentDepth + 1)
              : [];

            nodes.push({
              name: entry.name,
              path: fullPath,
              size,
              fileCount,
              folderCount,
              children,
              lastModified: Date.now(),
              category: this.categorizeFolder(entry.name, fullPath),
            });
          } catch {
            // Skip inaccessible directories
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }

    return nodes.sort((a, b) => b.size - a.size).slice(0, 30);
  }

  private getDirectorySize(dirPath: string): { size: number; fileCount: number; folderCount: number } {
    let size = 0;
    let fileCount = 0;
    let folderCount = 0;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile()) {
          try {
            const stats = fs.statSync(fullPath);
            size += stats.size;
            fileCount++;
          } catch {
            // Skip
          }
        } else if (entry.isDirectory()) {
          folderCount++;
          try {
            const sub = this.getDirectorySize(fullPath);
            size += sub.size;
            fileCount += sub.fileCount;
            folderCount += sub.folderCount;
          } catch {
            // Skip
          }
        }
      }
    } catch {
      // Skip
    }

    return { size, fileCount, folderCount };
  }

  private categorizeFolder(name: string, fullPath: string): StorageCategory {
    const lower = name.toLowerCase();
    const pathLower = fullPath.toLowerCase();

    if (pathLower.includes('windows')) return 'windows';
    if (pathLower.includes('program files') || pathLower.includes('applications')) return 'applications';
    if (['videos', 'music', 'pictures', 'movies'].includes(lower)) return 'media';
    if (['documents', 'desktop'].includes(lower)) return 'documents';
    if (['node_modules', '.git', 'src', 'build', 'dist'].includes(lower)) return 'development';
    if (lower === 'steamapps' || lower === 'games') return 'games';
    if (['temp', 'tmp', 'cache', 'caches'].includes(lower)) return 'cache';
    if (lower === 'appdata' || pathLower.includes('appdata')) return 'system';
    return 'other';
  }

  private collectLargestFiles(drives: StorageScanResult['drives'], limit: number): FileInfo[] {
    const files: FileInfo[] = [];
    for (const drive of drives) {
      this.walkForFiles(drive.drive + path.sep, files);
    }
    return files.sort((a, b) => b.size - a.size).slice(0, limit);
  }

  private walkForFiles(dirPath: string, files: FileInfo[], depth = 0) {
    if (depth > 5 || files.length > 5000) return;
    const largeFileThreshold = this.settings?.scanPreferences.large_file_threshold || 50 * 1024 * 1024;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile()) {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.size > largeFileThreshold) { // Configurable threshold
              files.push({
                name: entry.name,
                path: fullPath,
                size: stats.size,
                extension: path.extname(entry.name).toLowerCase(),
                lastAccessed: stats.atimeMs,
                lastModified: stats.mtimeMs,
                created: stats.birthtimeMs,
              });
            }
          } catch {
            // Skip
          }
        } else if (entry.isDirectory()) {
          this.walkForFiles(fullPath, files, depth + 1);
        }
      }
    } catch {
      // Skip
    }
  }

  private collectLargestFolders(drives: StorageScanResult['drives'], limit: number): FolderInfo[] {
    const folders: FolderInfo[] = [];
    for (const drive of drives) {
      this.flattenFolders(drive.rootFolders, folders);
    }
    return folders.sort((a, b) => b.size - a.size).slice(0, limit);
  }

  private flattenFolders(nodes: FolderNode[], result: FolderInfo[]) {
    for (const node of nodes) {
      result.push({
        name: node.name,
        path: node.path,
        size: node.size,
        fileCount: node.fileCount,
        folderCount: node.folderCount,
        lastModified: node.lastModified,
      });
      this.flattenFolders(node.children, result);
    }
  }

  private flattenFolderSizes(nodes: FolderNode[]): { path: string; size: number }[] {
    const result: { path: string; size: number }[] = [];
    for (const node of nodes) {
      result.push({ path: node.path, size: node.size });
      result.push(...this.flattenFolderSizes(node.children));
    }
    return result;
  }

  async getHistory() {
    return this.db.getScans('storage', 10);
  }

  async getGrowthAlerts(): Promise<StorageGrowthAlert[]> {
    const alerts: StorageGrowthAlert[] = [];
    const history = this.db.getScans('storage', 2);
    if (history.length < 2) return alerts;

    // Compare latest two scans for growth
    const latest = JSON.parse((history[0] as any).data);
    const previous = JSON.parse((history[1] as any).data);

    const prevFolders = new Map<string, number>();
    this.collectFolderSizes(previous.drives?.flatMap((d: any) => d.rootFolders) || [], prevFolders);

    const currFolders = new Map<string, number>();
    this.collectFolderSizes(latest.drives?.flatMap((d: any) => d.rootFolders) || [], currFolders);

    for (const [folderPath, currentSize] of currFolders) {
      const previousSize = prevFolders.get(folderPath);
      if (previousSize !== undefined && currentSize > previousSize) {
        const growth = currentSize - previousSize;
        const growthPercent = (growth / previousSize) * 100;
        if (growth > 100 * 1024 * 1024 || growthPercent > 20) { // >100MB or >20%
          alerts.push({
            path: folderPath,
            previousSize,
            currentSize,
            growthBytes: growth,
            growthPercent,
            periodDays: 1,
            severity: growth > 1024 * 1024 * 1024 ? 'critical' : growth > 500 * 1024 * 1024 ? 'warning' : 'info',
            message: `${path.basename(folderPath)} increased by ${this.formatSize(growth)}`,
          });
        }
      }
    }

    return alerts.sort((a, b) => b.growthBytes - a.growthBytes);
  }

  private collectFolderSizes(nodes: FolderNode[], map: Map<string, number>) {
    for (const node of nodes) {
      map.set(node.path, node.size);
      this.collectFolderSizes(node.children, map);
    }
  }

  async deleteFiles(filePaths: string[]): Promise<{ deleted: number; freed: number; errors: string[] }> {
    let deleted = 0;
    let freed = 0;
    const errors: string[] = [];

    for (const filePath of filePaths) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          // Get folder size before deleting
          const folderSize = this.getDirectorySize(filePath);
          fs.rmSync(filePath, { recursive: true, force: true });
          freed += folderSize.size;
        } else {
          freed += stats.size;
          fs.unlinkSync(filePath);
        }
        deleted++;
      } catch (err: any) {
        errors.push(`Failed to delete ${filePath}: ${err.message}`);
      }
    }

    return { deleted, freed, errors };
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }
}
