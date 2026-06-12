/**
 * DataCache - Background data indexing service
 * Caches scan results in memory + SQLite for instant page loads.
 * Runs heavy scans on a configurable interval (default: 1 hour).
 */
import { BrowserWindow } from 'electron';
import { Database } from './database';
import { SystemService } from './system-service';
import { StorageScanner } from './storage-scanner';
import { JunkDetector } from './junk-detector';
import { DuplicateFinder } from './duplicate-finder';
import { StartupManager } from './startup-manager';
import { SsdHealthAnalyzer } from './ssd-health';
import { HealthCalculator } from './health-calculator';
import { AIEngine } from './ai-engine';
import { DevToolsScanner } from './devtools-scanner';
import { IntelligenceService } from './intelligence-service';

export interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number; // epoch ms
}

type ScanFn = () => Promise<unknown>;

interface ScanDefinition {
  key: string;
  scan: ScanFn;
}

export class DataCache {
  private cache = new Map<string, CacheEntry>();
  private scanning = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private scanIntervalMs: number;

  constructor(
    private db: Database | null,
    private services: {
      system: SystemService;
      storage: StorageScanner;
      junk: JunkDetector;
      duplicates: DuplicateFinder;
      startup: StartupManager;
      ssd: SsdHealthAnalyzer;
      health: HealthCalculator;
      ai: AIEngine;
      devtools: DevToolsScanner;
      intelligence: IntelligenceService;
    },
    intervalMinutes = 60,
  ) {
    this.scanIntervalMs = intervalMinutes * 60 * 1000;
  }

  /** Load persisted cache from DB on startup */
  loadFromDB() {
    if (!this.db) return;
    try {
      // Get latest scan for each type
      const definitions = this.getScanDefinitions();
      for (const def of definitions) {
        const rows = this.db.getScans(def.key, 1) as any[];
        if (rows.length > 0) {
          try {
            const data = JSON.parse(rows[0].data);
            this.cache.set(def.key, {
              key: def.key,
              data,
              timestamp: rows[0].timestamp,
            });
          } catch { /* skip corrupt entries */ }
        }
      }
    } catch { /* DB may not be available */ }
  }

  /** Get cached data for a key */
  get(key: string): CacheEntry | null {
    return this.cache.get(key) ?? null;
  }

  /** Get all cached data as a record */
  getAll(): Record<string, CacheEntry> {
    const result: Record<string, CacheEntry> = {};
    this.cache.forEach((v, k) => { result[k] = v; });
    return result;
  }

  /** Check if a background scan is currently running */
  isScanning(): boolean {
    return this.scanning;
  }

  /** Build the list of scan definitions */
  private getScanDefinitions(): ScanDefinition[] {
    const s = this.services;
    return [
      { key: 'system-info', scan: () => s.system.getSystemInfo() },
      { key: 'health-score', scan: () => s.health.calculate() },
      { key: 'recommendations', scan: () => s.ai.getRecommendations() },
      { key: 'junk-scan', scan: () => s.junk.scan() },
      { key: 'startup-items', scan: () => s.startup.getItems() },
      { key: 'ssd-health', scan: () => s.ssd.getHealth() },
      { key: 'devtools', scan: () => s.devtools.scan() },
      { key: 'machine-profile', scan: () => s.intelligence.getProfile() },
      { key: 'installed-apps', scan: () => s.intelligence.getInstalledApps() },
      { key: 'privacy-scan', scan: () => s.intelligence.scanPrivacy() },
      { key: 'process-insights', scan: () => s.intelligence.getProcessInsights() },
      { key: 'dev-projects', scan: () => s.intelligence.scanDevProjects() },
      { key: 'docker-info', scan: () => s.intelligence.getDockerInfo() },
      { key: 'k8s-wsl-info', scan: () => s.intelligence.getK8sWSLInfo() },
      { key: 'timeline', scan: () => s.intelligence.getTimeline() },
      { key: 'pc-diagnosis', scan: () => s.intelligence.diagnosePC() },
      { key: 'mode-config', scan: () => s.intelligence.getModeConfig() },
    ];
  }

  /** Run all scans sequentially in the background */
  async refreshAll(notifyWindow?: BrowserWindow | null) {
    if (this.scanning) return;
    this.scanning = true;

    const definitions = this.getScanDefinitions();

    for (const def of definitions) {
      try {
        const start = Date.now();
        const data = await def.scan();
        const entry: CacheEntry = { key: def.key, data, timestamp: Date.now() };
        this.cache.set(def.key, entry);

        // Persist to DB
        this.persistToDB(def.key, data, Date.now(), Date.now() - start);

        // Notify renderer of updated cache
        if (notifyWindow && !notifyWindow.isDestroyed()) {
          notifyWindow.webContents.send('cache:updated', {
            key: def.key,
            timestamp: entry.timestamp,
          });
        }
      } catch (err) {
        console.warn(`[DataCache] Scan "${def.key}" failed:`, err);
      }
    }

    this.scanning = false;
  }

  /** Refresh a single cache key on demand */
  async refreshKey(key: string, notifyWindow?: BrowserWindow | null) {
    const def = this.getScanDefinitions().find(d => d.key === key);
    if (!def) return null;

    try {
      const start = Date.now();
      const data = await def.scan();
      const entry: CacheEntry = { key: def.key, data, timestamp: Date.now() };
      this.cache.set(def.key, entry);
      this.persistToDB(def.key, data, Date.now(), Date.now() - start);

      if (notifyWindow && !notifyWindow.isDestroyed()) {
        notifyWindow.webContents.send('cache:updated', {
          key: def.key,
          timestamp: entry.timestamp,
        });
      }
      return entry;
    } catch (err) {
      console.warn(`[DataCache] Scan "${key}" failed:`, err);
      return null;
    }
  }

  /** Start the hourly background scan loop */
  start(window?: BrowserWindow | null) {
    // Initial scan (delayed 3s to let the app render first)
    setTimeout(() => this.refreshAll(window), 3000);

    // Recurring scans
    this.intervalHandle = setInterval(() => {
      this.refreshAll(window);
    }, this.scanIntervalMs);
  }

  /** Stop the background scan loop */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** Persist a scan result to the DB */
  private persistToDB(key: string, data: unknown, _timestamp: number, duration: number) {
    if (!this.db) return;
    try {
      this.db.saveScan(key, key, data, duration);
    } catch { /* non-critical */ }
  }
}
