/**
 * PerformanceCollector - Lightweight periodic performance metrics collector
 * Collects CPU, memory, disk I/O, and network data and persists to SQLite.
 * Batches writes to minimize I/O overhead.
 */
import si from 'systeminformation';
import type { Database } from './database';
import type { SettingsManager } from './settings-manager';
import type { PerformanceSample, PerformanceAverages } from '../../shared/types';

export class PerformanceCollector {
  private buffer: PerformanceSample[] = [];
  private collectHandle: ReturnType<typeof setInterval> | null = null;
  private flushHandle: ReturnType<typeof setInterval> | null = null;
  private pruneHandle: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /** Flush buffer every 30 seconds */
  private static FLUSH_INTERVAL_MS = 30_000;
  /** Prune old data every hour */
  private static PRUNE_INTERVAL_MS = 60 * 60 * 1000;

  constructor(
    private db: Database | null,
    private settings?: SettingsManager,
  ) {}

  /** Start collecting metrics */
  start() {
    if (this.running) return;
    this.running = true;

    const intervalMs = this.getCollectionInterval();

    // Collect samples at configured interval
    this.collectHandle = setInterval(async () => {
      if (!this.running) return;
      try {
        const sample = await this.collectSample();
        this.buffer.push(sample);
      } catch { /* skip failed collection */ }
    }, intervalMs);

    // Flush buffer to DB periodically
    this.flushHandle = setInterval(() => {
      this.flush();
    }, PerformanceCollector.FLUSH_INTERVAL_MS);

    // Prune old data
    this.pruneHandle = setInterval(() => {
      this.prune();
    }, PerformanceCollector.PRUNE_INTERVAL_MS);
  }

  /** Stop collecting */
  stop() {
    this.running = false;
    if (this.collectHandle) { clearInterval(this.collectHandle); this.collectHandle = null; }
    if (this.flushHandle) { clearInterval(this.flushHandle); this.flushHandle = null; }
    if (this.pruneHandle) { clearInterval(this.pruneHandle); this.pruneHandle = null; }
    // Final flush
    this.flush();
  }

  /** Flush buffered samples to DB */
  private flush() {
    if (this.buffer.length === 0 || !this.db) return;
    try {
      const samples = [...this.buffer];
      this.buffer = [];
      this.db.savePerformanceSamples(samples);
    } catch { /* non-critical */ }
  }

  /** Prune data older than retention period */
  private prune() {
    if (!this.db || !this.settings) return;
    const retentionMs = this.settings.getRetentionMs();
    if (retentionMs === 0) return; // Keep forever
    try {
      this.db.prunePerformanceHistory(Date.now() - retentionMs);
    } catch { /* non-critical */ }
  }

  /** Collect a single performance sample */
  private async collectSample(): Promise<PerformanceSample> {
    const [cpuLoad, mem, diskIo, netStats] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.disksIO().catch(() => ({ rIO: 0, wIO: 0 })),
      si.networkStats().catch(() => [{ rx_bytes: 0, tx_bytes: 0, rx_sec: 0, tx_sec: 0 }]),
    ]);

    return {
      timestamp: Date.now(),
      cpu_load: cpuLoad.currentLoad,
      mem_used: mem.used,
      mem_total: mem.total,
      disk_read: (diskIo as any).rIO || 0,
      disk_write: (diskIo as any).wIO || 0,
      net_rx: netStats[0]?.rx_sec || 0,
      net_tx: netStats[0]?.tx_sec || 0,
    };
  }

  /** Get performance history for charts */
  getHistory(durationMs: number): PerformanceSample[] {
    if (!this.db) return [];
    try {
      const sinceMs = Date.now() - durationMs;
      return this.db.getPerformanceHistory(sinceMs) as PerformanceSample[];
    } catch {
      return [];
    }
  }

  /** Get averaged metrics for a time period */
  getAverages(durationMs: number): PerformanceAverages | null {
    const history = this.getHistory(durationMs);
    if (history.length === 0) return null;

    const count = history.length;
    let cpuSum = 0, cpuMax = 0;
    let memSum = 0, memMax = 0;
    let diskReadSum = 0, diskWriteSum = 0;
    let netRxSum = 0, netTxSum = 0;

    for (const s of history) {
      cpuSum += s.cpu_load;
      cpuMax = Math.max(cpuMax, s.cpu_load);
      memSum += s.mem_used;
      memMax = Math.max(memMax, s.mem_used);
      diskReadSum += s.disk_read;
      diskWriteSum += s.disk_write;
      netRxSum += s.net_rx;
      netTxSum += s.net_tx;
    }

    return {
      period: `${durationMs / 60000}m`,
      cpu_avg: cpuSum / count,
      cpu_max: cpuMax,
      mem_avg: memSum / count,
      mem_max: memMax,
      disk_read_avg: diskReadSum / count,
      disk_write_avg: diskWriteSum / count,
      net_rx_avg: netRxSum / count,
      net_tx_avg: netTxSum / count,
      sample_count: count,
    };
  }

  /** Get collection interval from settings (monitoring refresh interval) */
  private getCollectionInterval(): number {
    // Default: collect every 5 seconds
    // Settings could expose this as a configurable option
    return 5000;
  }

  /** Get the current buffer size (for monitoring) */
  getBufferSize(): number {
    return this.buffer.length;
  }
}
