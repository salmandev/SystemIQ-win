import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export class Database {
  private db!: BetterSqlite3.Database;

  initialize() {
    const dbPath = path.join(app.getPath('userData'), 'wio-database.sqlite');
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.createTables();
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        data TEXT NOT NULL,
        duration INTEGER
      );

      CREATE TABLE IF NOT EXISTS storage_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        path TEXT NOT NULL,
        size INTEGER NOT NULL,
        FOREIGN KEY (scan_id) REFERENCES scans(id)
      );

      CREATE TABLE IF NOT EXISTS health_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        overall INTEGER NOT NULL,
        storage INTEGER NOT NULL,
        memory INTEGER NOT NULL,
        cpu INTEGER NOT NULL,
        startup INTEGER NOT NULL,
        security INTEGER NOT NULL,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL,
        space_affected INTEGER
      );

      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        schedule TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_run INTEGER,
        next_run INTEGER,
        config TEXT
      );

      CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        settings TEXT
      );

      CREATE TABLE IF NOT EXISTS optimization_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        mode TEXT NOT NULL,
        space_recovered INTEGER NOT NULL,
        actions_executed INTEGER NOT NULL,
        actions_failed INTEGER NOT NULL,
        details TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
      CREATE INDEX IF NOT EXISTS idx_storage_history_path ON storage_history(path);
      CREATE INDEX IF NOT EXISTS idx_health_scores_timestamp ON health_scores(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    `);
  }

  // Scan operations
  saveScan(id: string, type: string, data: unknown, duration: number) {
    const stmt = this.db.prepare(
      'INSERT INTO scans (id, type, timestamp, data, duration) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, type, Date.now(), JSON.stringify(data), duration);
  }

  getScans(type?: string, limit = 50) {
    if (type) {
      return this.db
        .prepare('SELECT * FROM scans WHERE type = ? ORDER BY timestamp DESC LIMIT ?')
        .all(type, limit);
    }
    return this.db.prepare('SELECT * FROM scans ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  // Storage history
  saveStorageHistory(scanId: string, entries: { path: string; size: number }[]) {
    const stmt = this.db.prepare(
      'INSERT INTO storage_history (scan_id, timestamp, path, size) VALUES (?, ?, ?, ?)'
    );
    const now = Date.now();
    const tx = this.db.transaction((items: typeof entries) => {
      for (const item of items) {
        stmt.run(scanId, now, item.path, item.size);
      }
    });
    tx(entries);
  }

  getStorageHistory(path: string, limit = 20) {
    return this.db
      .prepare(
        'SELECT * FROM storage_history WHERE path = ? ORDER BY timestamp DESC LIMIT ?'
      )
      .all(path, limit);
  }

  // Health scores
  saveHealthScore(scores: {
    overall: number;
    storage: number;
    memory: number;
    cpu: number;
    startup: number;
    security: number;
    data?: unknown;
  }) {
    this.db
      .prepare(
        `INSERT INTO health_scores (timestamp, overall, storage, memory, cpu, startup, security, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Date.now(),
        scores.overall,
        scores.storage,
        scores.memory,
        scores.cpu,
        scores.startup,
        scores.security,
        scores.data ? JSON.stringify(scores.data) : null
      );
  }

  getHealthHistory(limit = 30) {
    return this.db
      .prepare('SELECT * FROM health_scores ORDER BY timestamp DESC LIMIT ?')
      .all(limit);
  }

  // Settings
  getSettings(key?: string): unknown {
    if (key) {
      const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
        | { value: string }
        | undefined;
      return row ? JSON.parse(row.value) : null;
    }
    const rows = this.db.prepare('SELECT * FROM settings').all() as {
      key: string;
      value: string;
    }[];
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = JSON.parse(row.value);
    }
    return settings;
  }

  setSetting(key: string, value: unknown) {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, JSON.stringify(value));
  }

  // Audit log
  addAuditLog(entry: {
    action: string;
    category: string;
    details?: string;
    status: string;
    spaceAffected?: number;
  }) {
    this.db
      .prepare(
        `INSERT INTO audit_log (timestamp, action, category, details, status, space_affected)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        Date.now(),
        entry.action,
        entry.category,
        entry.details || null,
        entry.status,
        entry.spaceAffected || null
      );
  }

  getAuditLog(limit = 100) {
    return this.db
      .prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?')
      .all(limit);
  }

  // Scheduled tasks
  saveScheduledTask(task: {
    id: string;
    name: string;
    type: string;
    schedule: string;
    enabled: boolean;
    config?: unknown;
  }) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO scheduled_tasks (id, name, type, schedule, enabled, config)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(task.id, task.name, task.type, task.schedule, task.enabled ? 1 : 0, task.config ? JSON.stringify(task.config) : null);
  }

  getScheduledTasks() {
    return this.db.prepare('SELECT * FROM scheduled_tasks').all();
  }

  deleteScheduledTask(id: string) {
    this.db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
  }

  updateTaskRun(id: string, lastRun: number, nextRun: number) {
    this.db
      .prepare('UPDATE scheduled_tasks SET last_run = ?, next_run = ? WHERE id = ?')
      .run(lastRun, nextRun, id);
  }

  // Optimization history
  saveOptimizationResult(result: {
    planId: string;
    mode: string;
    spaceRecovered: number;
    actionsExecuted: number;
    actionsFailed: number;
    details?: unknown;
  }) {
    this.db
      .prepare(
        `INSERT INTO optimization_history (plan_id, timestamp, mode, space_recovered, actions_executed, actions_failed, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        result.planId,
        Date.now(),
        result.mode,
        result.spaceRecovered,
        result.actionsExecuted,
        result.actionsFailed,
        result.details ? JSON.stringify(result.details) : null
      );
  }

  close() {
    this.db?.close();
  }
}
