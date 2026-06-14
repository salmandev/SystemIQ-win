/**
 * DataCache - Smart Background Intelligence Engine
 * Transformed from simple interval scanner into a configurable, resource-aware
 * background intelligence system with incremental scanning support.
 *
 * Backward-compatible API: get, getAll, refreshKey, isScanning, start, stop, loadFromDB
 */
import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import si from 'systeminformation';
import type { Database } from './database';
import type { SettingsManager } from './settings-manager';
import type { ScanTracker } from './scan-tracker';
import type { SystemService } from './system-service';
import type { StorageScanner } from './storage-scanner';
import type { JunkDetector } from './junk-detector';
import type { DuplicateFinder } from './duplicate-finder';
import type { StartupManager } from './startup-manager';
import type { SsdHealthAnalyzer } from './ssd-health';
import type { HealthCalculator } from './health-calculator';
import type { AIEngine } from './ai-engine';
import type { DevToolsScanner } from './devtools-scanner';
import type { IntelligenceService } from './intelligence-service';

export interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
}

type ScanFn = () => Promise<unknown>;

interface ScanDefinition {
  key: string;
  scan: ScanFn;
  /** Interval in ms for this specific scan type */
  intervalMs: number;
  /** Priority: lower = runs first */
  priority: number;
  /** Whether this scan is heavy (resource-intensive) */
  heavy: boolean;
  /** Feature flag to check */
  featureFlag?: string;
}

const DEFAULT_INTERVALS: Record<string, number> = {
  'system-info': 5 * 60 * 1000,        // 5 min
  'health-score': 30 * 60 * 1000,       // 30 min
  'recommendations': 30 * 60 * 1000,    // 30 min
  'junk-scan': 60 * 60 * 1000,          // 1 hr
  'startup-items': 60 * 60 * 1000,      // 1 hr
  'ssd-health': 6 * 60 * 60 * 1000,     // 6 hr
  'devtools': 60 * 60 * 1000,           // 1 hr
  'machine-profile': 6 * 60 * 60 * 1000, // 6 hr
  'installed-apps': 6 * 60 * 60 * 1000, // 6 hr
  'privacy-scan': 24 * 60 * 60 * 1000,  // daily
  'process-insights': 10 * 60 * 1000,   // 10 min
  'dev-projects': 2 * 60 * 60 * 1000,   // 2 hr
  'docker-info': 6 * 60 * 60 * 1000,    // 6 hr
  'k8s-wsl-info': 6 * 60 * 60 * 1000,   // 6 hr
  'timeline': 24 * 60 * 60 * 1000,      // daily
  'pc-diagnosis': 60 * 60 * 1000,       // 1 hr
  'mode-config': 24 * 60 * 60 * 1000,   // daily
  'vm-inventory': 24 * 60 * 60 * 1000,  // daily
};

const SCAN_PRIORITIES: Record<string, number> = {
  'system-info': 1,
  'health-score': 2,
  'recommendations': 3,
  'pc-diagnosis': 4,
  'process-insights': 5,
  'junk-scan': 10,
  'startup-items': 11,
  'ssd-health': 12,
  'devtools': 20,
  'dev-projects': 21,
  'docker-info': 22,
  'k8s-wsl-info': 23,
  'vm-inventory': 24,
  'machine-profile': 30,
  'installed-apps': 31,
  'privacy-scan': 40,
  'timeline': 41,
  'mode-config': 50,
};

const HEAVY_SCANS = new Set([
  'junk-scan', 'devtools', 'dev-projects', 'docker-info',
  'k8s-wsl-info', 'vm-inventory', 'privacy-scan', 'installed-apps',
]);

const FEATURE_FLAG_MAP: Record<string, string> = {
  'junk-scan': 'junk_detection',
  'devtools': 'developer_scanning',
  'dev-projects': 'developer_scanning',
  'docker-info': 'docker_monitoring',
  'k8s-wsl-info': 'wsl_monitoring',
  'vm-inventory': 'vm_scanning',
  'storage-scan': 'storage_scanner',
};

export class DataCache extends EventEmitter {
  private cache = new Map<string, CacheEntry>();
  private scanning = false;
  private schedulerHandle: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private currentWindow: BrowserWindow | null = null;

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
    private settings?: SettingsManager,
    private scanTracker?: ScanTracker,
  ) {
    super();
  }

  /** Load persisted cache from DB on startup */
  loadFromDB() {
    if (!this.db) return;
    try {
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

  /** Build scan definitions with per-key scheduling */
  private getScanDefinitions(): ScanDefinition[] {
    const s = this.services;
    const globalInterval = this.settings?.getScheduleIntervalMs() || 60 * 60 * 1000;
    const intensityScale = this.getIntensityScale();

    const rawDefs: [string, ScanFn, boolean][] = [
      ['system-info', () => s.system.getSystemInfo(), false],
      ['health-score', () => s.health.calculate(), false],
      ['recommendations', () => s.ai.getRecommendations(), false],
      ['junk-scan', () => s.junk.scan(), true],
      ['startup-items', () => s.startup.getItems(), false],
      ['ssd-health', () => s.ssd.getHealth(), false],
      ['devtools', () => s.devtools.scan(), true],
      ['machine-profile', () => s.intelligence.getProfile(), false],
      ['installed-apps', () => s.intelligence.getInstalledApps(), true],
      ['privacy-scan', () => s.intelligence.scanPrivacy(), true],
      ['process-insights', () => s.intelligence.getProcessInsights(), false],
      ['dev-projects', () => s.intelligence.scanDevProjects(), true],
      ['docker-info', () => s.intelligence.getDockerInfo(), true],
      ['k8s-wsl-info', () => s.intelligence.getK8sWSLInfo(), true],
      ['timeline', () => s.intelligence.getTimeline(), false],
      ['pc-diagnosis', () => s.intelligence.diagnosePC(), false],
      ['mode-config', () => s.intelligence.getModeConfig(), false],
    ];

    return rawDefs.map(([key, scan, heavy]) => {
      const baseInterval = DEFAULT_INTERVALS[key] || globalInterval;
      return {
        key,
        scan,
        intervalMs: Math.round(baseInterval * intensityScale),
        priority: SCAN_PRIORITIES[key] || 99,
        heavy: heavy || HEAVY_SCANS.has(key),
        featureFlag: FEATURE_FLAG_MAP[key],
      };
    });
  }

  /** Get intensity scaling factor for intervals */
  private getIntensityScale(): number {
    const intensity = this.settings?.scanPreferences.scan_intensity || 'balanced';
    switch (intensity) {
      case 'low_cpu': return 2.0;   // Scan less frequently
      case 'balanced': return 1.0;
      case 'aggressive': return 0.5; // Scan more frequently
      default: return 1.0;
    }
  }

  /** Get delay between scans based on intensity */
  private getScanDelay(): number {
    const intensity = this.settings?.scanPreferences.scan_intensity || 'balanced';
    switch (intensity) {
      case 'low_cpu': return 2000;   // 2s between each scan
      case 'balanced': return 500;
      case 'aggressive': return 100;
      default: return 500;
    }
  }

  /** Check if system resources allow running heavy scans */
  private async canRunHeavyScan(): Promise<boolean> {
    try {
      const [cpuLoad, mem] = await Promise.all([si.currentLoad(), si.mem()]);
      const cpuOk = cpuLoad.currentLoad < 80;
      const memOk = (mem.used / mem.total) < 0.85;
      return cpuOk && memOk;
    } catch {
      return true; // Assume ok if we can't check
    }
  }

  /** Check if a feature flag allows this scan */
  private isFeatureAllowed(def: ScanDefinition): boolean {
    if (!def.featureFlag || !this.settings) return true;
    return this.settings.isFeatureEnabled(def.featureFlag as any);
  }

  /** Run eligible scans in priority order */
  async runScheduledCycle(notifyWindow?: BrowserWindow | null) {
    if (this.scanning) return;
    this.scanning = true;

    const definitions = this.getScanDefinitions()
      .sort((a, b) => a.priority - b.priority);

    const delay = this.getScanDelay();
    const incrementalEnabled = this.settings?.scanPreferences.incremental_scanning ?? true;

    for (const def of definitions) {
      // Check feature flag
      if (!this.isFeatureAllowed(def)) continue;

      // Check if enough time has passed for this specific key
      if (this.scanTracker) {
        if (!this.scanTracker.shouldScan(def.key, def.intervalMs)) continue;
      }

      // Check resource availability for heavy scans
      if (def.heavy && !(await this.canRunHeavyScan())) {
        continue; // Skip heavy scan when system is busy
      }

      // Check max scan time
      const maxTime = (this.settings?.scanPreferences.max_scan_time || 0) * 60 * 1000;

      try {
        this.scanTracker?.markRunning(def.key);
        const start = Date.now();

        // Run with timeout if max time is set
        const data = maxTime > 0
          ? await this.withTimeout(def.scan(), maxTime)
          : await def.scan();

        const duration = Date.now() - start;
        const entry: CacheEntry = { key: def.key, data, timestamp: Date.now() };
        this.cache.set(def.key, entry);

        // Persist to DB
        this.persistToDB(def.key, data, duration);

        // Record scan metadata
        this.scanTracker?.recordScan(def.key, duration, 1, incrementalEnabled);

        // Notify renderer
        if (notifyWindow && !notifyWindow.isDestroyed()) {
          notifyWindow.webContents.send('cache:updated', {
            key: def.key,
            timestamp: entry.timestamp,
          });
        }

        this.emit('scan-complete', { key: def.key, duration });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        this.scanTracker?.recordScan(def.key, 0, 0, false, errMsg);
        this.emit('scan-error', { key: def.key, error: errMsg });
      }

      // Delay between scans to reduce CPU pressure
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    this.scanning = false;
    this.emit('cycle-complete');
  }

  /** Run a scan with timeout */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Scan timeout')), timeoutMs);
      promise
        .then(v => { clearTimeout(timer); resolve(v); })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  /** Refresh a single cache key on demand */
  async refreshKey(key: string, notifyWindow?: BrowserWindow | null) {
    const def = this.getScanDefinitions().find(d => d.key === key);
    if (!def) return null;

    try {
      this.scanTracker?.markRunning(key);
      const start = Date.now();
      const data = await def.scan();
      const duration = Date.now() - start;
      const entry: CacheEntry = { key: def.key, data, timestamp: Date.now() };
      this.cache.set(def.key, entry);
      this.persistToDB(def.key, data, duration);
      this.scanTracker?.recordScan(key, duration, 1, false);

      if (notifyWindow && !notifyWindow.isDestroyed()) {
        notifyWindow.webContents.send('cache:updated', {
          key: def.key,
          timestamp: entry.timestamp,
        });
      }
      return entry;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      this.scanTracker?.recordScan(key, 0, 0, false, errMsg);
      return null;
    }
  }

  /** Start the background intelligence loop */
  start(window?: BrowserWindow | null) {
    this.running = true;
    this.currentWindow = window || null;

    // Check if this is the first run
    const isFirstRun = this.scanTracker
      ? !this.scanTracker.getLastScan('system-info')
      : true;

    // First run: scan after 3 seconds to let UI render
    const initialDelay = isFirstRun ? 3000 : 10000;

    const scheduleNext = () => {
      if (!this.running) return;
      const interval = this.settings?.getScheduleIntervalMs() || 60 * 60 * 1000;
      // Use the smaller of global interval or 15 min for the scheduler loop
      const nextDelay = Math.min(interval, 15 * 60 * 1000);
      this.schedulerHandle = setTimeout(async () => {
        if (!this.running) return;
        if (this.settings?.featureFlags.background_monitoring !== false) {
          await this.runScheduledCycle(this.currentWindow);
        }
        scheduleNext();
      }, nextDelay);
    };

    // Initial cycle
    setTimeout(async () => {
      if (!this.running) return;
      await this.runScheduledCycle(this.currentWindow);
      scheduleNext();
    }, initialDelay);
  }

  /** Stop the background scan loop */
  stop() {
    this.running = false;
    if (this.schedulerHandle) {
      clearTimeout(this.schedulerHandle);
      this.schedulerHandle = null;
    }
  }

  /** Persist a scan result to the DB */
  private persistToDB(key: string, data: unknown, duration: number) {
    if (!this.db) return;
    try {
      this.db.saveScan(key, key, data, duration);
    } catch { /* non-critical */ }
  }

  /** Backward compat: run all scans (for manual trigger) */
  async refreshAll(notifyWindow?: BrowserWindow | null) {
    return this.runScheduledCycle(notifyWindow);
  }
}
