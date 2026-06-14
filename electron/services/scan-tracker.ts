/**
 * ScanTracker - Tracks scan execution metadata
 * Enables incremental scanning by recording what was scanned and when.
 */
import fs from 'fs';
import path from 'path';
import type { Database } from './database';
import type { ScanMetadata, ScanStatus } from '../../shared/types';

export class ScanTracker {
  constructor(private db: Database | null) {}

  /** Record that a scan completed */
  recordScan(
    key: string,
    duration: number,
    itemCount: number,
    incremental = false,
    error?: string,
  ) {
    if (!this.db) return;
    try {
      this.db.upsertScanMetadata({
        key,
        last_run: Date.now(),
        duration,
        status: error ? 'failed' : 'completed',
        incremental,
        items_scanned: itemCount,
        error,
      });
    } catch { /* non-critical */ }
  }

  /** Mark a scan as running */
  markRunning(key: string) {
    if (!this.db) return;
    try {
      const existing = this.db.getScanMetadata(key) as ScanMetadata | null;
      this.db.upsertScanMetadata({
        key,
        last_run: existing?.last_run || 0,
        duration: 0,
        status: 'running',
        incremental: false,
        items_scanned: 0,
      });
    } catch { /* non-critical */ }
  }

  /** Get the last scan info for a key */
  getLastScan(key: string): ScanMetadata | null {
    if (!this.db) return null;
    try {
      return this.db.getScanMetadata(key) as ScanMetadata | null;
    } catch {
      return null;
    }
  }

  /** Get all scan metadata */
  getAllScans(): ScanMetadata[] {
    if (!this.db) return [];
    try {
      return this.db.getScanMetadata() as ScanMetadata[];
    } catch {
      return [];
    }
  }

  /**
   * Check if a scan should run based on interval.
   * Returns true if enough time has passed or never scanned.
   */
  shouldScan(key: string, intervalMs: number): boolean {
    const last = this.getLastScan(key);
    if (!last || !last.last_run) return true;
    if (last.status === 'running') return false; // Don't re-run if already in progress
    return Date.now() - last.last_run >= intervalMs;
  }

  /**
   * Get directories that have changed since a given timestamp.
   * Uses file system mtime to detect changes - foundation for incremental scanning.
   */
  getChangedPaths(basePaths: string[], sinceMs: number): string[] {
    const changed: string[] = [];
    for (const basePath of basePaths) {
      if (!fs.existsSync(basePath)) continue;
      try {
        this.walkForChanges(basePath, sinceMs, changed, 0, 3);
      } catch { /* skip */ }
    }
    return changed;
  }

  private walkForChanges(
    dirPath: string,
    sinceMs: number,
    changed: string[],
    depth: number,
    maxDepth: number,
  ) {
    if (depth >= maxDepth || changed.length > 500) return;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.mtimeMs > sinceMs) {
            changed.push(fullPath);
          }
          if (entry.isDirectory() && depth < maxDepth - 1) {
            this.walkForChanges(fullPath, sinceMs, changed, depth + 1, maxDepth);
          }
        } catch { /* skip inaccessible */ }
      }
    } catch { /* skip */ }
  }

  /**
   * Check if incremental scanning is possible for a key.
   * Returns true if we have a previous successful scan to diff against.
   */
  canIncremental(key: string): boolean {
    const last = this.getLastScan(key);
    return !!(last && last.last_run && last.status === 'completed');
  }

  /** Get scan status summary for all tracked scans */
  getStatusSummary(): Record<string, ScanStatus> {
    const all = this.getAllScans();
    const summary: Record<string, ScanStatus> = {};
    for (const s of all) {
      summary[s.key] = s.status;
    }
    return summary;
  }
}
