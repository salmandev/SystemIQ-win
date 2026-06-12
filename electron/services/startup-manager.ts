import { exec } from 'child_process';
import { promisify } from 'util';
import type { StartupItem } from '../../shared/types';

const execAsync = promisify(exec);

export class StartupManager {
  async getItems(): Promise<StartupItem[]> {
    const items: StartupItem[] = [];

    try {
      // Get startup apps from registry
      const { stdout: userStartup } = await execAsync(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" 2>nul'
      );
      this.parseRegistryEntries(userStartup, 'Current User', items);
    } catch {
      // No user startup items
    }

    try {
      const { stdout: systemStartup } = await execAsync(
        'reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" 2>nul'
      );
      this.parseRegistryEntries(systemStartup, 'All Users', items);
    } catch {
      // No system startup items
    }

    try {
      // Get scheduled tasks
      const { stdout } = await execAsync('schtasks /query /fo csv /nh 2>nul');
      this.parseScheduledTasks(stdout, items);
    } catch {
      // Can't read scheduled tasks
    }

    try {
      // Get services set to automatic
      const { stdout } = await execAsync(
        'wmic service where "StartMode=\'Auto\'" get Name,DisplayName,State /format:csv 2>nul'
      );
      this.parseServices(stdout, items);
    } catch {
      // Can't read services
    }

    // Add AI recommendations
    for (const item of items) {
      item.aiRecommendation = this.generateRecommendation(item);
    }

    return items;
  }

  private parseRegistryEntries(output: string, location: string, items: StartupItem[]) {
    const lines = output.split('\n').filter(l => l.trim() && l.includes('REG_SZ'));
    for (const line of lines) {
      const match = line.match(/^\s+(.+?)\s+REG_SZ\s+(.+)$/);
      if (match) {
        const name = match[1].trim();
        const command = match[2].trim();
        items.push({
          name,
          publisher: name,
          command,
          location: `Registry: ${location}`,
          enabled: true,
          impactScore: this.estimateImpact(name),
          bootTimeImpact: this.estimateBootImpact(name),
          memoryUsage: this.estimateMemory(name),
          cpuUsage: this.estimateCpu(name),
          aiRecommendation: '',
          category: 'application',
        });
      }
    }
  }

  private parseScheduledTasks(output: string, items: StartupItem[]) {
    const lines = output.split('\n').filter(l => l.includes(','));
    for (const line of lines.slice(0, 20)) {
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
      if (parts.length >= 2 && parts[0]) {
        const name = parts[0].split('\\').pop() || parts[0];
        items.push({
          name,
          publisher: 'Microsoft',
          command: parts[0],
          location: 'Scheduled Tasks',
          enabled: parts[2] === 'Ready' || parts[2] === 'Running',
          impactScore: 20,
          bootTimeImpact: 0.5,
          memoryUsage: 10 * 1024 * 1024,
          cpuUsage: 1,
          aiRecommendation: '',
          category: 'scheduled-task',
        });
      }
    }
  }

  private parseServices(output: string, items: StartupItem[]) {
    const lines = output.split('\n').filter(l => l.includes(','));
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3 && parts[1] && parts[1] !== 'DisplayName') {
        items.push({
          name: parts[2] || parts[1],
          publisher: 'Windows',
          command: parts[1],
          location: 'Windows Service',
          enabled: parts[3] === 'Running',
          impactScore: 30,
          bootTimeImpact: 1,
          memoryUsage: 20 * 1024 * 1024,
          cpuUsage: 2,
          aiRecommendation: '',
          category: 'service',
        });
      }
    }
  }

  private estimateImpact(name: string): number {
    const highImpact = ['chrome', 'firefox', 'edge', 'spotify', 'discord', 'teams', 'slack', 'docker', 'vscode'];
    const mediumImpact = ['onedrive', 'dropbox', 'skype', 'steam', 'epic'];
    const lower = name.toLowerCase();

    if (highImpact.some(h => lower.includes(h))) return 85;
    if (mediumImpact.some(m => lower.includes(m))) return 55;
    return 25;
  }

  private estimateBootImpact(name: string): number {
    const lower = name.toLowerCase();
    if (lower.includes('chrome') || lower.includes('docker')) return 8;
    if (lower.includes('spotify') || lower.includes('teams')) return 7;
    if (lower.includes('onedrive') || lower.includes('dropbox')) return 4;
    return 2;
  }

  private estimateMemory(name: string): number {
    const lower = name.toLowerCase();
    if (lower.includes('chrome')) return 300 * 1024 * 1024;
    if (lower.includes('docker')) return 500 * 1024 * 1024;
    if (lower.includes('teams')) return 250 * 1024 * 1024;
    if (lower.includes('spotify')) return 150 * 1024 * 1024;
    if (lower.includes('discord')) return 200 * 1024 * 1024;
    return 50 * 1024 * 1024;
  }

  private estimateCpu(name: string): number {
    const lower = name.toLowerCase();
    if (lower.includes('docker') || lower.includes('chrome')) return 8;
    if (lower.includes('antimalware') || lower.includes('defender')) return 5;
    return 2;
  }

  private generateRecommendation(item: StartupItem): string {
    if (item.impactScore > 70) {
      return `${item.name} has a high startup impact, adding approximately ${item.bootTimeImpact}s to boot time. Consider disabling it if not needed at startup.`;
    }
    if (item.impactScore > 40) {
      return `${item.name} has a moderate startup impact. It uses ~${Math.round(item.memoryUsage / (1024 * 1024))} MB of RAM. You can disable it and launch manually when needed.`;
    }
    return `${item.name} has a low startup impact and is generally safe to keep enabled.`;
  }

  async toggle(name: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const state = enabled ? 'ENABLE' : 'DISABLE';
      // Try registry first
      await execAsync(
        `reg ${state === 'ENABLE' ? 'add' : 'delete'} "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${name}" /f 2>nul`
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
