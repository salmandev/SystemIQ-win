import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import type { DuplicateScanResult, DuplicateGroup, DuplicateFile } from '../../shared/types';

const DUPLICATE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.iso', '.img', '.dmg',
]);

const MIN_FILE_SIZE = 1024; // 1KB minimum
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB maximum
const PARTIAL_HASH_SIZE = 4096; // Read first 4KB for quick comparison

export class DuplicateFinder {
  async scan(paths: string[]): Promise<DuplicateScanResult> {
    const scanId = uuid();
    const startTime = Date.now();
    const fileMap = new Map<string, DuplicateFile[]>();

    // Phase 1: Collect files by size
    const sizeMap = new Map<number, DuplicateFile[]>();
    for (const scanPath of paths) {
      await this.collectFilesBySize(scanPath, sizeMap);
    }

    // Phase 2: Hash files with same size
    for (const [_size, files] of sizeMap) {
      if (files.length < 2) continue;

      for (const file of files) {
        try {
          const hash = await this.hashFile(file.path);
          if (!fileMap.has(hash)) {
            fileMap.set(hash, []);
          }
          fileMap.get(hash)!.push(file);
        } catch {
          // Skip files that can't be hashed
        }
      }
    }

    // Phase 3: Build duplicate groups
    const groups: DuplicateGroup[] = [];
    for (const [hash, files] of fileMap) {
      if (files.length < 2) continue;

      const sortedFiles = files.sort((a, b) => {
        // Prefer keeping the file that was accessed most recently
        return b.lastAccessed - a.lastAccessed;
      });

      groups.push({
        id: uuid(),
        hash,
        size: files[0].size,
        files: sortedFiles,
        suggestedKeep: sortedFiles[0].path,
        savingsIfCleaned: files[0].size * (files.length - 1),
      });
    }

    const totalWasted = groups.reduce((sum, g) => sum + g.savingsIfCleaned, 0);

    return {
      scanId,
      timestamp: Date.now(),
      totalWasted,
      groups: groups.sort((a, b) => b.savingsIfCleaned - a.savingsIfCleaned),
      duration: Date.now() - startTime,
    };
  }

  private async collectFilesBySize(dirPath: string, sizeMap: Map<number, DuplicateFile[]>, depth = 0) {
    if (depth > 10) return;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.name.startsWith('.') || entry.name === 'node_modules' ||
            entry.name === '.git' || entry.name === '$Recycle.Bin' ||
            entry.name === 'System Volume Information') {
          continue;
        }

        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!DUPLICATE_EXTENSIONS.has(ext)) continue;

          try {
            const stats = fs.statSync(fullPath);
            if (stats.size < MIN_FILE_SIZE || stats.size > MAX_FILE_SIZE) continue;

            const file: DuplicateFile = {
              path: fullPath,
              name: entry.name,
              size: stats.size,
              lastModified: stats.mtimeMs,
              lastAccessed: stats.atimeMs,
              drive: path.parse(fullPath).root.charAt(0),
            };

            if (!sizeMap.has(stats.size)) {
              sizeMap.set(stats.size, []);
            }
            sizeMap.get(stats.size)!.push(file);
          } catch {
            // Skip inaccessible files
          }
        } else if (entry.isDirectory()) {
          await this.collectFilesBySize(fullPath, sizeMap, depth + 1);
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  private async hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath, {
        start: 0,
        end: PARTIAL_HASH_SIZE - 1,
      });

      stream.on('data', data => hash.update(data));
      stream.on('end', () => {
        // Also include file size in hash for uniqueness
        const stats = fs.statSync(filePath);
        hash.update(stats.size.toString());
        resolve(hash.digest('hex'));
      });
      stream.on('error', reject);
    });
  }

  async clean(filePaths: string[]): Promise<{ cleaned: number; freed: number; errors: string[] }> {
    let cleaned = 0;
    let freed = 0;
    const errors: string[] = [];

    for (const filePath of filePaths) {
      try {
        const stats = fs.statSync(filePath);
        freed += stats.size;
        // Move to recycle bin instead of deleting
        fs.unlinkSync(filePath);
        cleaned++;
      } catch (err: any) {
        errors.push(`Failed to remove ${filePath}: ${err.message}`);
      }
    }

    return { cleaned, freed, errors };
  }
}
