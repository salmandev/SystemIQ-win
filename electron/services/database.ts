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

      -- Projects table
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        framework TEXT,
        language TEXT,
        dependencies INTEGER DEFAULT 0,
        size INTEGER DEFAULT 0,
        last_modified INTEGER,
        last_opened INTEGER,
        git_status TEXT,
        docker_usage INTEGER DEFAULT 0,
        metadata TEXT
      );

      -- Docker inventory snapshots
      CREATE TABLE IF NOT EXISTS docker_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        images_count INTEGER DEFAULT 0,
        images_size INTEGER DEFAULT 0,
        containers_count INTEGER DEFAULT 0,
        containers_size INTEGER DEFAULT 0,
        volumes_count INTEGER DEFAULT 0,
        volumes_size INTEGER DEFAULT 0,
        build_cache_size INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        details TEXT
      );

      -- WSL inventory
      CREATE TABLE IF NOT EXISTS wsl_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        distro_name TEXT NOT NULL,
        version TEXT,
        vhdx_path TEXT,
        disk_size INTEGER DEFAULT 0,
        state TEXT,
        last_used INTEGER,
        package_cache_size INTEGER DEFAULT 0,
        metadata TEXT
      );

      -- VM inventory
      CREATE TABLE IF NOT EXISTS vm_inventory (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        state TEXT,
        memory INTEGER DEFAULT 0,
        cpus INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        snapshot_count INTEGER DEFAULT 0,
        disk_path TEXT,
        last_used INTEGER,
        metadata TEXT
      );

      -- Performance history
      CREATE TABLE IF NOT EXISTS performance_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        cpu_load REAL,
        mem_used INTEGER,
        mem_total INTEGER,
        disk_read INTEGER,
        disk_write INTEGER,
        net_rx INTEGER,
        net_tx INTEGER
      );

      -- AI recommendations persisted
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        category TEXT,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT,
        status TEXT DEFAULT 'active',
        dismissed INTEGER DEFAULT 0,
        metadata TEXT
      );

      -- Notification rules
      CREATE TABLE IF NOT EXISTS notification_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        metric TEXT NOT NULL,
        operator TEXT NOT NULL,
        threshold REAL NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_triggered INTEGER,
        cooldown_ms INTEGER DEFAULT 3600000,
        actions TEXT
      );

      -- Scan metadata tracker
      CREATE TABLE IF NOT EXISTS scan_metadata (
        key TEXT PRIMARY KEY,
        last_run INTEGER,
        duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'idle',
        incremental INTEGER DEFAULT 0,
        items_scanned INTEGER DEFAULT 0,
        error TEXT
      );

      -- Optimization profiles
      CREATE TABLE IF NOT EXISTS optimization_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        active INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_docker_inventory_ts ON docker_inventory(timestamp);
      CREATE INDEX IF NOT EXISTS idx_wsl_inventory_ts ON wsl_inventory(timestamp);
      CREATE INDEX IF NOT EXISTS idx_vm_inventory_ts ON vm_inventory(timestamp);
      CREATE INDEX IF NOT EXISTS idx_performance_history_ts ON performance_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ai_recommendations_ts ON ai_recommendations(timestamp);
      CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
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

  // ---- Projects ----
  upsertProject(project: {
    id: string; name: string; path: string; framework?: string; language?: string;
    dependencies?: number; size?: number; last_modified?: number; last_opened?: number;
    git_status?: string; docker_usage?: number; metadata?: unknown;
  }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO projects (id, name, path, framework, language, dependencies, size, last_modified, last_opened, git_status, docker_usage, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      project.id, project.name, project.path, project.framework || null, project.language || null,
      project.dependencies || 0, project.size || 0, project.last_modified || null,
      project.last_opened || null, project.git_status || null, project.docker_usage || 0,
      project.metadata ? JSON.stringify(project.metadata) : null
    );
  }

  getProjects() {
    return this.db.prepare('SELECT * FROM projects ORDER BY last_modified DESC').all();
  }

  // ---- Docker Inventory ----
  saveDockerInventory(entry: {
    images_count: number; images_size: number; containers_count: number; containers_size: number;
    volumes_count: number; volumes_size: number; build_cache_size: number; total_size: number; details?: unknown;
  }) {
    this.db.prepare(
      `INSERT INTO docker_inventory (timestamp, images_count, images_size, containers_count, containers_size, volumes_count, volumes_size, build_cache_size, total_size, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(Date.now(), entry.images_count, entry.images_size, entry.containers_count, entry.containers_size,
      entry.volumes_count, entry.volumes_size, entry.build_cache_size, entry.total_size,
      entry.details ? JSON.stringify(entry.details) : null);
  }

  getDockerHistory(limit = 30) {
    return this.db.prepare('SELECT * FROM docker_inventory ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  // ---- WSL Inventory ----
  saveWSLDistro(entry: {
    distro_name: string; version?: string; vhdx_path?: string; disk_size?: number;
    state?: string; last_used?: number; package_cache_size?: number; metadata?: unknown;
  }) {
    this.db.prepare(
      `INSERT INTO wsl_inventory (timestamp, distro_name, version, vhdx_path, disk_size, state, last_used, package_cache_size, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(Date.now(), entry.distro_name, entry.version || null, entry.vhdx_path || null,
      entry.disk_size || 0, entry.state || null, entry.last_used || null,
      entry.package_cache_size || 0, entry.metadata ? JSON.stringify(entry.metadata) : null);
  }

  getWSLHistory(limit = 30) {
    return this.db.prepare('SELECT * FROM wsl_inventory ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  // ---- VM Inventory ----
  upsertVM(vm: {
    id: string; name: string; type: string; state?: string; memory?: number; cpus?: number;
    total_size?: number; snapshot_count?: number; disk_path?: string; last_used?: number; metadata?: unknown;
  }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO vm_inventory (id, timestamp, name, type, state, memory, cpus, total_size, snapshot_count, disk_path, last_used, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(vm.id, Date.now(), vm.name, vm.type, vm.state || null, vm.memory || 0, vm.cpus || 0,
      vm.total_size || 0, vm.snapshot_count || 0, vm.disk_path || null, vm.last_used || null,
      vm.metadata ? JSON.stringify(vm.metadata) : null);
  }

  getVMs() {
    return this.db.prepare('SELECT * FROM vm_inventory ORDER BY timestamp DESC').all();
  }

  // ---- Performance History ----
  savePerformanceSamples(samples: {
    timestamp: number; cpu_load: number; mem_used: number; mem_total: number;
    disk_read: number; disk_write: number; net_rx: number; net_tx: number;
  }[]) {
    const stmt = this.db.prepare(
      `INSERT INTO performance_history (timestamp, cpu_load, mem_used, mem_total, disk_read, disk_write, net_rx, net_tx)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const tx = this.db.transaction((items: typeof samples) => {
      for (const s of items) {
        stmt.run(s.timestamp, s.cpu_load, s.mem_used, s.mem_total, s.disk_read, s.disk_write, s.net_rx, s.net_tx);
      }
    });
    tx(samples);
  }

  getPerformanceHistory(sinceMs: number, limit = 1000) {
    return this.db.prepare(
      'SELECT * FROM performance_history WHERE timestamp >= ? ORDER BY timestamp ASC LIMIT ?'
    ).all(sinceMs, limit);
  }

  prunePerformanceHistory(olderThanMs: number) {
    this.db.prepare('DELETE FROM performance_history WHERE timestamp < ?').run(olderThanMs);
  }

  // ---- AI Recommendations ----
  saveRecommendation(rec: {
    id: string; category?: string; title: string; description?: string;
    priority?: string; status?: string; dismissed?: boolean; metadata?: unknown;
  }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO ai_recommendations (id, timestamp, category, title, description, priority, status, dismissed, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(rec.id, Date.now(), rec.category || null, rec.title, rec.description || null,
      rec.priority || 'medium', rec.status || 'active', rec.dismissed ? 1 : 0,
      rec.metadata ? JSON.stringify(rec.metadata) : null);
  }

  getRecommendations(limit = 50) {
    return this.db.prepare('SELECT * FROM ai_recommendations WHERE dismissed = 0 ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  dismissRecommendation(id: string) {
    this.db.prepare('UPDATE ai_recommendations SET dismissed = 1 WHERE id = ?').run(id);
  }

  // ---- Notification Rules ----
  upsertNotificationRule(rule: {
    id: string; name: string; metric: string; operator: string; threshold: number;
    enabled?: boolean; cooldown_ms?: number; actions?: string[];
  }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO notification_rules (id, name, metric, operator, threshold, enabled, cooldown_ms, actions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(rule.id, rule.name, rule.metric, rule.operator, rule.threshold,
      rule.enabled !== false ? 1 : 0, rule.cooldown_ms || 3600000,
      rule.actions ? JSON.stringify(rule.actions) : null);
  }

  getNotificationRules() {
    return this.db.prepare('SELECT * FROM notification_rules').all();
  }

  updateNotificationTriggered(id: string) {
    this.db.prepare('UPDATE notification_rules SET last_triggered = ? WHERE id = ?').run(Date.now(), id);
  }

  // ---- Scan Metadata ----
  upsertScanMetadata(entry: {
    key: string; last_run?: number; duration?: number; status?: string;
    incremental?: boolean; items_scanned?: number; error?: string;
  }) {
    this.db.prepare(
      `INSERT OR REPLACE INTO scan_metadata (key, last_run, duration, status, incremental, items_scanned, error)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(entry.key, entry.last_run || Date.now(), entry.duration || 0, entry.status || 'idle',
      entry.incremental ? 1 : 0, entry.items_scanned || 0, entry.error || null);
  }

  getScanMetadata(key?: string) {
    if (key) {
      return this.db.prepare('SELECT * FROM scan_metadata WHERE key = ?').get(key) || null;
    }
    return this.db.prepare('SELECT * FROM scan_metadata').all();
  }

  // ---- Optimization Profiles ----
  saveProfile(profile: { id: string; name: string; config: unknown; active?: boolean }) {
    this.db.prepare(
      'INSERT OR REPLACE INTO optimization_profiles (id, name, config, active) VALUES (?, ?, ?, ?)'
    ).run(profile.id, profile.name, JSON.stringify(profile.config), profile.active ? 1 : 0);
  }

  getProfiles() {
    return this.db.prepare('SELECT * FROM optimization_profiles').all();
  }

  close() {
    this.db?.close();
  }
}
