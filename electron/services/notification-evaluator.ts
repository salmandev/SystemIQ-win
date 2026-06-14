/**
 * NotificationEvaluator - Evaluates notification rules against current system data
 * Generates notification events when thresholds are breached.
 */
import { v4 as uuid } from 'uuid';
import { BrowserWindow } from 'electron';
import type { Database } from './database';
import type { SettingsManager } from './settings-manager';
import type {
  NotificationEvent, NotificationSeverity, NotificationType,
  NotificationRule, DockerIntelligence,
} from '../../shared/types';

interface SystemSnapshot {
  diskUsagePercent?: Record<string, number>;
  memoryUsagePercent?: number;
  dockerTotalSize?: number;
  dockerPreviousSize?: number;
  startupCount?: number;
  previousStartupCount?: number;
}

export class NotificationEvaluator {
  private pendingNotifications: NotificationEvent[] = [];

  constructor(
    private db: Database | null,
    private settings?: SettingsManager,
  ) {
    this.initializeDefaultRules();
  }

  /** Initialize default notification rules in DB if they don't exist */
  private initializeDefaultRules() {
    if (!this.db) return;
    try {
      const existing = this.db.getNotificationRules() as NotificationRule[];
      if (existing.length > 0) return; // Already initialized

      const defaults = this.getDefaultRules();
      for (const rule of defaults) {
        this.db.upsertNotificationRule({
          id: rule.id,
          name: rule.name,
          metric: rule.metric,
          operator: rule.operator,
          threshold: rule.threshold,
          enabled: true,
          cooldown_ms: rule.cooldown_ms,
          actions: rule.actions,
        });
      }
    } catch { /* non-critical */ }
  }

  private getDefaultRules(): NotificationRule[] {
    const thresholds = this.settings?.notificationRules;
    return [
      {
        id: 'disk-warning',
        name: 'Disk Usage Warning',
        metric: 'disk_percent',
        operator: '>',
        threshold: thresholds?.disk_warning_threshold || 80,
        enabled: true,
        last_triggered: 0,
        cooldown_ms: 4 * 60 * 60 * 1000, // 4 hours
        actions: ['notification'],
      },
      {
        id: 'disk-critical',
        name: 'Disk Usage Critical',
        metric: 'disk_percent',
        operator: '>',
        threshold: thresholds?.disk_critical_threshold || 90,
        enabled: true,
        last_triggered: 0,
        cooldown_ms: 1 * 60 * 60 * 1000, // 1 hour
        actions: ['notification'],
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        metric: 'memory_percent',
        operator: '>',
        threshold: thresholds?.memory_threshold || 85,
        enabled: true,
        last_triggered: 0,
        cooldown_ms: 30 * 60 * 1000, // 30 min
        actions: ['notification'],
      },
      {
        id: 'docker-size',
        name: 'Docker Storage Alert',
        metric: 'docker_total_size',
        operator: '>',
        threshold: thresholds?.docker_size_alert || 20 * 1024 * 1024 * 1024,
        enabled: true,
        last_triggered: 0,
        cooldown_ms: 24 * 60 * 60 * 1000,
        actions: ['notification'],
      },
      {
        id: 'docker-growth',
        name: 'Docker Growth Alert',
        metric: 'docker_growth_weekly',
        operator: '>',
        threshold: thresholds?.docker_growth_alert || 5 * 1024 * 1024 * 1024,
        enabled: true,
        last_triggered: 0,
        cooldown_ms: 7 * 24 * 60 * 60 * 1000,
        actions: ['notification'],
      },
      {
        id: 'startup-added',
        name: 'New Startup App',
        metric: 'startup_count_changed',
        operator: 'changed',
        threshold: 0,
        enabled: thresholds?.startup_app_added !== false,
        last_triggered: 0,
        cooldown_ms: 60 * 60 * 1000,
        actions: ['notification'],
      },
    ];
  }

  /** Evaluate all rules against a system snapshot */
  evaluate(snapshot: SystemSnapshot, notifyWindow?: BrowserWindow | null): NotificationEvent[] {
    if (!this.db) return [];
    const rules = this.db.getNotificationRules() as NotificationRule[];
    const now = Date.now();
    const newNotifications: NotificationEvent[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.last_triggered && (now - rule.last_triggered) < rule.cooldown_ms) continue;

      const triggered = this.evaluateRule(rule, snapshot);
      if (triggered) {
        const notification = this.createNotification(rule, snapshot);
        newNotifications.push(notification);
        this.pendingNotifications.push(notification);

        // Update last triggered
        try { this.db.updateNotificationTriggered(rule.id); } catch { /* */ }
      }
    }

    // Send to renderer
    if (notifyWindow && !notifyWindow.isDestroyed() && newNotifications.length > 0) {
      for (const n of newNotifications) {
        notifyWindow.webContents.send('notification:push', n);
      }
    }

    return newNotifications;
  }

  private evaluateRule(rule: NotificationRule, snapshot: SystemSnapshot): boolean {
    switch (rule.metric) {
      case 'disk_percent': {
        if (!snapshot.diskUsagePercent) return false;
        return Object.values(snapshot.diskUsagePercent).some(
          pct => this.compareOp(pct, rule.operator, rule.threshold)
        );
      }
      case 'memory_percent':
        if (snapshot.memoryUsagePercent == null) return false;
        return this.compareOp(snapshot.memoryUsagePercent, rule.operator, rule.threshold);

      case 'docker_total_size':
        if (snapshot.dockerTotalSize == null) return false;
        return this.compareOp(snapshot.dockerTotalSize, rule.operator, rule.threshold);

      case 'docker_growth_weekly': {
        if (snapshot.dockerTotalSize == null || snapshot.dockerPreviousSize == null) return false;
        const growth = snapshot.dockerTotalSize - snapshot.dockerPreviousSize;
        return this.compareOp(growth, rule.operator, rule.threshold);
      }

      case 'startup_count_changed': {
        if (snapshot.startupCount == null || snapshot.previousStartupCount == null) return false;
        return snapshot.startupCount !== snapshot.previousStartupCount;
      }

      default:
        return false;
    }
  }

  private compareOp(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      default: return false;
    }
  }

  private createNotification(rule: NotificationRule, snapshot: SystemSnapshot): NotificationEvent {
    const severity = this.getSeverity(rule, snapshot);
    const type = this.getType(rule);
    const { title, message } = this.getMessage(rule, snapshot);

    return {
      id: uuid(),
      type,
      title,
      message,
      severity,
      timestamp: Date.now(),
      dismissed: false,
      action: this.getAction(rule),
    };
  }

  private getSeverity(rule: NotificationRule, snapshot: SystemSnapshot): NotificationSeverity {
    if (rule.id === 'disk-critical') return 'critical';
    if (rule.id === 'disk-warning') return 'warning';
    if (rule.metric === 'memory_percent' && snapshot.memoryUsagePercent && snapshot.memoryUsagePercent > 90) return 'critical';
    return 'warning';
  }

  private getType(rule: NotificationRule): NotificationType {
    if (rule.metric.includes('disk')) return 'disk';
    if (rule.metric.includes('memory')) return 'memory';
    if (rule.metric.includes('docker')) return 'docker';
    if (rule.metric.includes('startup')) return 'startup';
    return 'system';
  }

  private getMessage(rule: NotificationRule, snapshot: SystemSnapshot): { title: string; message: string } {
    switch (rule.id) {
      case 'disk-warning': {
        const drives = Object.entries(snapshot.diskUsagePercent || {})
          .filter(([, pct]) => pct > rule.threshold)
          .map(([d]) => `${d}:`);
        return {
          title: 'Disk Usage Warning',
          message: `Drive(s) ${drives.join(', ')} exceeded ${rule.threshold}% usage. Consider running cleanup.`,
        };
      }
      case 'disk-critical': {
        const drives = Object.entries(snapshot.diskUsagePercent || {})
          .filter(([, pct]) => pct > rule.threshold)
          .map(([d]) => `${d}:`);
        return {
          title: 'Disk Space Critical',
          message: `Drive(s) ${drives.join(', ')} are above ${rule.threshold}%. Immediate action recommended.`,
        };
      }
      case 'memory-high':
        return {
          title: 'High Memory Usage',
          message: `Memory usage is at ${snapshot.memoryUsagePercent?.toFixed(0)}%. Consider closing unused applications.`,
        };
      case 'docker-size':
        return {
          title: 'Docker Storage Alert',
          message: `Docker is using ${this.formatSize(snapshot.dockerTotalSize || 0)}. Consider running docker system prune.`,
        };
      case 'docker-growth': {
        const growth = (snapshot.dockerTotalSize || 0) - (snapshot.dockerPreviousSize || 0);
        return {
          title: 'Docker Growth Detected',
          message: `Docker storage grew by ${this.formatSize(growth)}. Review unused images and volumes.`,
        };
      }
      case 'startup-added': {
        const diff = (snapshot.startupCount || 0) - (snapshot.previousStartupCount || 0);
        return {
          title: 'Startup Apps Changed',
          message: diff > 0
            ? `${diff} new startup app(s) detected. Review in Startup Optimizer.`
            : `Startup count changed. Review in Startup Optimizer.`,
        };
      }
      default:
        return { title: rule.name, message: `Threshold breached for ${rule.metric}.` };
    }
  }

  private getAction(rule: NotificationRule): NotificationEvent['action'] | undefined {
    switch (rule.id) {
      case 'disk-warning':
      case 'disk-critical':
        return { label: 'Open Storage Analyzer', handler: 'navigate', params: { page: 'storage' } };
      case 'memory-high':
        return { label: 'View Processes', handler: 'navigate', params: { page: 'processes' } };
      case 'docker-size':
      case 'docker-growth':
        return { label: 'Open Dev Center', handler: 'navigate', params: { page: 'developer-center' } };
      case 'startup-added':
        return { label: 'Open Startup', handler: 'navigate', params: { page: 'startup' } };
      default:
        return undefined;
    }
  }

  /** Get all pending notifications */
  getPending(): NotificationEvent[] {
    return this.pendingNotifications.filter(n => !n.dismissed);
  }

  /** Dismiss a notification */
  dismiss(id: string) {
    const n = this.pendingNotifications.find(n => n.id === id);
    if (n) n.dismissed = true;
  }

  /** Clear all dismissed notifications */
  clearDismissed() {
    this.pendingNotifications = this.pendingNotifications.filter(n => !n.dismissed);
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
}
