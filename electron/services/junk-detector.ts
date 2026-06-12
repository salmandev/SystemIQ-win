import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuid } from 'uuid';
import type { JunkScanResult, JunkCategory, JunkItem } from '../../shared/types';

interface JunkDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  paths: string[];
  extensions?: string[];
  riskLevel: 'safe' | 'moderate' | 'aggressive';
  recommended: boolean;
}

export class JunkDetector {
  private junkDefinitions: JunkDefinition[] = [];

  constructor() {
    this.initializeDefinitions();
  }

  private initializeDefinitions() {
    const home = os.homedir();
    const temp = os.tmpdir();
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const winDir = process.env.windir || 'C:\\Windows';

    this.junkDefinitions = [
      // Windows temp files
      {
        id: 'windows-temp',
        name: 'Windows Temporary Files',
        icon: '🗂️',
        description: 'System temporary files that can be safely removed',
        paths: [temp, path.join(winDir, 'Temp')],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'windows-update-cache',
        name: 'Windows Update Cache',
        icon: '🔄',
        description: 'Cached Windows update files that are no longer needed',
        paths: [path.join(winDir, 'SoftwareDistribution', 'Download')],
        riskLevel: 'moderate',
        recommended: true,
      },
      {
        id: 'cbs-logs',
        name: 'CBS Logs',
        icon: '📋',
        description: 'Component-Based Servicing log files',
        paths: [path.join(winDir, 'Logs', 'CBS')],
        extensions: ['.log'],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'crash-dumps',
        name: 'Crash Dumps',
        icon: '💥',
        description: 'System crash dump files',
        paths: [
          path.join(winDir, 'Minidump'),
          path.join(localAppData, 'CrashDumps'),
        ],
        extensions: ['.dmp', '.mdmp'],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'error-reports',
        name: 'Error Reports',
        icon: '📝',
        description: 'Windows Error Reporting files',
        paths: [
          path.join(localAppData, 'Microsoft', 'Windows', 'WER'),
          path.join(localAppData, 'CrashDumps'),
        ],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'delivery-optimization',
        name: 'Delivery Optimization Files',
        icon: '📦',
        description: 'Windows Update delivery optimization cache',
        paths: [path.join(winDir, 'ServiceProfiles', 'NetworkService', 'AppData', 'Local', 'Microsoft', 'Windows', 'DeliveryOptimization')],
        riskLevel: 'moderate',
        recommended: true,
      },
      {
        id: 'thumbnails',
        name: 'Thumbnail Cache',
        icon: '🖼️',
        description: 'Cached thumbnail images',
        paths: [path.join(localAppData, 'Microsoft', 'Windows', 'Explorer')],
        extensions: ['.db'],
        riskLevel: 'safe',
        recommended: true,
      },
      // Browser caches
      {
        id: 'chrome-cache',
        name: 'Google Chrome Cache',
        icon: '🌐',
        description: 'Chrome browser cache, cookies, and history',
        paths: [
          path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
          path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
          path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Service Worker', 'CacheStorage'),
        ],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'edge-cache',
        name: 'Microsoft Edge Cache',
        icon: '🔷',
        description: 'Edge browser cache and temporary files',
        paths: [
          path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
          path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
        ],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'firefox-cache',
        name: 'Firefox Cache',
        icon: '🦊',
        description: 'Firefox browser cache and temporary data',
        paths: [
          path.join(localAppData, 'Mozilla', 'Firefox', 'Profiles'),
        ],
        riskLevel: 'safe',
        recommended: false,
      },
      {
        id: 'brave-cache',
        name: 'Brave Browser Cache',
        icon: '🦁',
        description: 'Brave browser cache files',
        paths: [
          path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache'),
        ],
        riskLevel: 'safe',
        recommended: true,
      },
      // Dev tool caches
      {
        id: 'npm-cache',
        name: 'npm Cache',
        icon: '📦',
        description: 'Node.js package manager cache',
        paths: [
          path.join(localAppData, 'npm-cache'),
          path.join(home, '.npm'),
        ],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'yarn-cache',
        name: 'Yarn Cache',
        icon: '🧶',
        description: 'Yarn package manager cache',
        paths: [path.join(localAppData, 'Yarn', 'Cache')],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'pnpm-cache',
        name: 'pnpm Cache',
        icon: '📦',
        description: 'pnpm package manager store and cache',
        paths: [path.join(localAppData, 'pnpm-store')],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'pip-cache',
        name: 'Python pip Cache',
        icon: '🐍',
        description: 'Python pip package manager cache',
        paths: [path.join(localAppData, 'pip', 'cache')],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'conda-cache',
        name: 'Conda Cache',
        icon: '🐍',
        description: 'Conda package cache and tarballs',
        paths: [path.join(home, '.conda', 'pkgs')],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'maven-cache',
        name: 'Maven Repository',
        icon: '☕',
        description: 'Maven local repository cache',
        paths: [path.join(home, '.m2', 'repository')],
        riskLevel: 'moderate',
        recommended: false,
      },
      {
        id: 'gradle-cache',
        name: 'Gradle Cache',
        icon: '🐘',
        description: 'Gradle build cache and dependencies',
        paths: [path.join(home, '.gradle', 'caches')],
        riskLevel: 'moderate',
        recommended: false,
      },
      {
        id: 'nuget-cache',
        name: 'NuGet Cache',
        icon: '💜',
        description: 'NuGet package cache',
        paths: [path.join(home, '.nuget', 'packages'), path.join(localAppData, 'NuGet', 'Cache')],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'docker-data',
        name: 'Docker Data',
        icon: '🐳',
        description: 'Docker images, containers, and volumes',
        paths: [path.join(localAppData, 'Docker', 'wsl')],
        riskLevel: 'aggressive',
        recommended: false,
      },
      {
        id: 'recycle-bin',
        name: 'Recycle Bin',
        icon: '🗑️',
        description: 'Files in the Recycle Bin',
        paths: ['C:\\$Recycle.Bin'],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'recent-files',
        name: 'Recent Files',
        icon: '📎',
        description: 'Recent files shortcuts and jump lists',
        paths: [path.join(appData, 'Microsoft', 'Windows', 'Recent')],
        riskLevel: 'safe',
        recommended: true,
      },
      {
        id: 'prefetch',
        name: 'Windows Prefetch',
        icon: '⚡',
        description: 'Application prefetch files',
        paths: [path.join(winDir, 'Prefetch')],
        riskLevel: 'safe',
        recommended: true,
      },
    ];
  }

  async scan(): Promise<JunkScanResult> {
    const scanId = uuid();
    const startTime = Date.now();
    const categories: JunkCategory[] = [];

    for (const def of this.junkDefinitions) {
      const items = await this.scanDefinition(def);
      if (items.length > 0) {
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        categories.push({
          id: def.id,
          name: def.name,
          icon: def.icon,
          description: def.description,
          size: totalSize,
          itemCount: items.length,
          items,
          riskLevel: def.riskLevel,
          recommended: def.recommended,
        });
      }
    }

    return {
      scanId,
      timestamp: Date.now(),
      totalRecoverable: categories.reduce((sum, cat) => sum + cat.size, 0),
      categories: categories.sort((a, b) => b.size - a.size),
      duration: Date.now() - startTime,
    };
  }

  private async scanDefinition(def: JunkDefinition): Promise<JunkItem[]> {
    const items: JunkItem[] = [];

    for (const dirPath of def.paths) {
      if (!fs.existsSync(dirPath)) continue;

      try {
        this.scanPath(dirPath, items, def.extensions);
      } catch {
        // Skip inaccessible paths
      }
    }

    return items;
  }

  private scanPath(dirPath: string, items: JunkItem[], extensions?: string[], depth = 0) {
    if (depth > 4 || items.length > 1000) return;

    try {
      const stats = fs.statSync(dirPath);
      if (stats.isFile()) {
        if (!extensions || extensions.includes(path.extname(dirPath).toLowerCase())) {
          items.push({
            path: dirPath,
            name: path.basename(dirPath),
            size: stats.size,
            lastModified: stats.mtimeMs,
            safe: true,
            description: `${path.basename(dirPath)} - ${this.formatSize(stats.size)}`,
          });
        }
        return;
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          if (entry.isFile()) {
            const fileStats = fs.statSync(fullPath);
            if (!extensions || extensions.includes(path.extname(entry.name).toLowerCase())) {
              items.push({
                path: fullPath,
                name: entry.name,
                size: fileStats.size,
                lastModified: fileStats.mtimeMs,
                safe: true,
                description: `${entry.name} - ${this.formatSize(fileStats.size)}`,
              });
            }
          } else if (entry.isDirectory()) {
            this.scanPath(fullPath, items, extensions, depth + 1);
          }
        } catch {
          // Skip inaccessible files
        }
      }
    } catch {
      // Skip
    }
  }

  async clean(itemPaths: string[]): Promise<{ cleaned: number; freed: number; errors: string[] }> {
    let cleaned = 0;
    let freed = 0;
    const errors: string[] = [];

    for (const itemPath of itemPaths) {
      try {
        const stats = fs.statSync(itemPath);
        freed += stats.size;

        if (stats.isDirectory()) {
          fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(itemPath);
        }
        cleaned++;
      } catch (err: any) {
        errors.push(`Failed to remove ${itemPath}: ${err.message}`);
      }
    }

    return { cleaned, freed, errors };
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }
}
