import { v4 as uuid } from 'uuid';
import type { Database } from './database';
import type { ScheduledTask } from '../../shared/types';

export class AutomationEngine {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private db: Database) {}

  start() {
    this.loadAndScheduleTasks();
  }

  stop() {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  async schedule(task: ScheduledTask): Promise<ScheduledTask> {
    const newTask = {
      ...task,
      id: task.id || uuid(),
      enabled: task.enabled !== false,
    };

    this.db.saveScheduledTask(newTask);
    if (newTask.enabled) {
      this.scheduleTask(newTask);
    }
    return newTask;
  }

  async getTasks(): Promise<ScheduledTask[]> {
    const rows = this.db.getScheduledTasks() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      schedule: row.schedule,
      enabled: row.enabled === 1,
      lastRun: row.last_run,
      nextRun: row.next_run,
      config: row.config ? JSON.parse(row.config) : {},
    }));
  }

  async toggle(id: string, enabled: boolean): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.enabled = enabled;
      this.db.saveScheduledTask(task as any);
      if (enabled) {
        this.scheduleTask(task);
      } else {
        this.unscheduleTask(id);
      }
    }
  }

  private loadAndScheduleTasks() {
    this.getTasks().then(tasks => {
      for (const task of tasks.filter(t => t.enabled)) {
        this.scheduleTask(task);
      }
    }).catch(() => {});
  }

  private scheduleTask(task: ScheduledTask) {
    this.unscheduleTask(task.id);
    const interval = this.parseSchedule(task.schedule);
    if (interval > 0) {
      const timer = setInterval(() => {
        this.executeTask(task);
      }, interval);
      this.timers.set(task.id, timer);
    }
  }

  private unscheduleTask(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }

  private parseSchedule(schedule: string): number {
    // Simple cron-like parsing: daily, weekly, monthly
    switch (schedule.toLowerCase()) {
      case 'hourly': return 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000; // Default daily
    }
  }

  private async executeTask(task: ScheduledTask) {
    const now = Date.now();
    const nextRun = now + this.parseSchedule(task.schedule);
    this.db.updateTaskRun(task.id, now, nextRun);

    this.db.addAuditLog({
      action: `Scheduled task: ${task.name}`,
      category: 'automation',
      status: 'completed',
    });
  }

  // Default task presets
  static getDefaultTasks(): ScheduledTask[] {
    return [
      {
        id: uuid(), name: 'Weekly Disk Cleanup', type: 'cleanup',
        schedule: 'weekly', enabled: true, config: { mode: 'safe' },
      },
      {
        id: uuid(), name: 'Monthly Storage Scan', type: 'scan',
        schedule: 'monthly', enabled: true, config: { fullScan: true },
      },
      {
        id: uuid(), name: 'Weekly Startup Audit', type: 'audit',
        schedule: 'weekly', enabled: false, config: { checkNewItems: true },
      },
      {
        id: uuid(), name: 'Daily Health Check', type: 'optimization',
        schedule: 'daily', enabled: false, config: { quickCheck: true },
      },
    ];
  }
}
