import si from 'systeminformation';
import type { HealthScore, ScoreDetail, ScoreIssue, ImprovementAction } from '../../shared/types';

export class HealthCalculator {
  async calculate(): Promise<HealthScore> {
    const [mem, fsSize, cpuLoad, processes] = await Promise.all([
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.processes(),
    ]);

    const storage = this.calculateStorageScore(fsSize);
    const memory = this.calculateMemoryScore(mem);
    const cpu = this.calculateCpuScore(cpuLoad, processes);
    const startup = await this.calculateStartupScore();
    const security = await this.calculateSecurityScore();

    const overall = Math.round(
      storage.score * 0.3 + memory.score * 0.25 + cpu.score * 0.2 + startup.score * 0.15 + security.score * 0.1
    );

    return {
      overall,
      storage,
      memory,
      cpu,
      startup,
      security,
      trend: [],
    };
  }

  private calculateStorageScore(fsSize: any[]): ScoreDetail {
    const issues: ScoreIssue[] = [];
    const improvements: ImprovementAction[] = [];
    let score = 100;

    for (const disk of fsSize) {
      const usedPercent = disk.use || 0;
      if (usedPercent > 90) {
        score -= 30;
        issues.push({
          title: `${disk.mount} is critically full`,
          description: `${disk.mount} is ${usedPercent}% full with only ${this.formatSize(disk.available)} free`,
          severity: 'critical',
          impact: 30,
        });
        improvements.push({
          title: `Free up space on ${disk.mount}`,
          description: `Clean temporary files, uninstall unused apps, and move large files to external storage`,
          estimatedBenefit: `Recover up to ${this.formatSize(disk.available * 0.5)}`,
          riskLevel: 'safe',
          category: 'storage',
        });
      } else if (usedPercent > 80) {
        score -= 15;
        issues.push({
          title: `${disk.mount} running low on space`,
          description: `${disk.mount} is ${usedPercent}% full`,
          severity: 'warning',
          impact: 15,
        });
        improvements.push({
          title: `Clean up ${disk.mount}`,
          description: `Run disk cleanup and remove unnecessary files`,
          estimatedBenefit: `Recover approximately ${this.formatSize(disk.available * 0.3)}`,
          riskLevel: 'safe',
          category: 'storage',
        });
      } else if (usedPercent > 70) {
        score -= 5;
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      status: this.getScoreStatus(score),
      issues,
      improvements,
    };
  }

  private calculateMemoryScore(mem: any): ScoreDetail {
    const issues: ScoreIssue[] = [];
    const improvements: ImprovementAction[] = [];
    let score = 100;
    const usedPercent = (mem.used / mem.total) * 100;

    if (usedPercent > 90) {
      score -= 35;
      issues.push({
        title: 'Memory usage is critically high',
        description: `${usedPercent.toFixed(0)}% of RAM is in use (${this.formatSize(mem.used)} / ${this.formatSize(mem.total)})`,
        severity: 'critical',
        impact: 35,
      });
      improvements.push({
        title: 'Reduce memory usage',
        description: 'Close unnecessary applications and browser tabs. Consider restarting memory-intensive applications.',
        estimatedBenefit: 'Free up 2-4 GB of RAM',
        riskLevel: 'safe',
        category: 'memory',
      });
    } else if (usedPercent > 75) {
      score -= 15;
      issues.push({
        title: 'Memory usage is elevated',
        description: `${usedPercent.toFixed(0)}% of RAM is in use`,
        severity: 'warning',
        impact: 15,
      });
    }

    if (mem.swaptotal > 0 && mem.swapused / mem.swaptotal > 0.5) {
      score -= 15;
      issues.push({
        title: 'High swap usage',
        description: 'System is relying heavily on swap memory, indicating insufficient RAM',
        severity: 'warning',
        impact: 15,
      });
      improvements.push({
        title: 'Consider upgrading RAM',
        description: 'Your system frequently uses swap memory. Adding more RAM would improve performance.',
        estimatedBenefit: 'Significant performance improvement',
        riskLevel: 'safe',
        category: 'memory',
      });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      status: this.getScoreStatus(score),
      issues,
      improvements,
    };
  }

  private calculateCpuScore(cpuLoad: any, processes: any): ScoreDetail {
    const issues: ScoreIssue[] = [];
    const improvements: ImprovementAction[] = [];
    let score = 100;

    if (cpuLoad.currentLoad > 80) {
      score -= 30;
      issues.push({
        title: 'High CPU utilization',
        description: `CPU is at ${cpuLoad.currentLoad.toFixed(0)}% utilization`,
        severity: 'critical',
        impact: 30,
      });

      const topProcesses = processes.list
        .sort((a: any, b: any) => b.cpu - a.cpu)
        .slice(0, 5);
      const topCpuNames = topProcesses.map((p: any) => `${p.name} (${p.cpu.toFixed(0)}%)`).join(', ');

      improvements.push({
        title: 'Reduce CPU load',
        description: `Top CPU consumers: ${topCpuNames}. Consider closing or throttling these.`,
        estimatedBenefit: 'Reduce CPU usage by 20-40%',
        riskLevel: 'safe',
        category: 'cpu',
      });
    } else if (cpuLoad.currentLoad > 60) {
      score -= 10;
      issues.push({
        title: 'Elevated CPU usage',
        description: `CPU is at ${cpuLoad.currentLoad.toFixed(0)}% utilization`,
        severity: 'warning',
        impact: 10,
      });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      status: this.getScoreStatus(score),
      issues,
      improvements,
    };
  }

  private async calculateStartupScore(): Promise<ScoreDetail> {
    const issues: ScoreIssue[] = [];
    const improvements: ImprovementAction[] = [];
    let score = 100;

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" 2>nul'
      );
      const entries = stdout.split('\n').filter((l: string) => l.includes('REG_SZ'));

      if (entries.length > 8) {
        score -= 20;
        issues.push({
          title: 'Too many startup applications',
          description: `${entries.length} applications are set to start automatically`,
          severity: 'warning',
          impact: 20,
        });
        improvements.push({
          title: 'Disable unnecessary startup apps',
          description: `Review and disable startup items you don't need immediately at boot`,
          estimatedBenefit: 'Reduce boot time by 5-15 seconds',
          riskLevel: 'safe',
          category: 'startup',
        });
      } else if (entries.length > 5) {
        score -= 10;
      }
    } catch {
      // Can't check startup
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      status: this.getScoreStatus(score),
      issues,
      improvements,
    };
  }

  private async calculateSecurityScore(): Promise<ScoreDetail> {
    const issues: ScoreIssue[] = [];
    const improvements: ImprovementAction[] = [];
    let score = 100;

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Check Windows Defender status
      try {
        const { stdout } = await execAsync('powershell -Command "Get-MpComputerStatus | Select-Object AMRunningMode" 2>nul');
        if (!stdout.includes('Normal')) {
          score -= 20;
          issues.push({
            title: 'Windows Defender may be inactive',
            description: 'Your antivirus protection may not be running',
            severity: 'critical',
            impact: 20,
          });
        }
      } catch {
        // Can't check
      }

      // Check Windows Update
      try {
        const { stdout } = await execAsync(
          'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update" /v AUOptions 2>nul'
        );
        if (stdout.includes('0x1')) {
          score -= 15;
          issues.push({
            title: 'Automatic updates are disabled',
            description: 'Windows Update is set to disabled, missing security patches',
            severity: 'warning',
            impact: 15,
          });
          improvements.push({
            title: 'Enable automatic updates',
            description: 'Turn on automatic Windows updates to receive security patches',
            estimatedBenefit: 'Improved security protection',
            riskLevel: 'safe',
            category: 'security',
          });
        }
      } catch {
        // Can't check
      }
    } catch {
      // Skip security checks
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      status: this.getScoreStatus(score),
      issues,
      improvements,
    };
  }

  private getScoreStatus(score: number): ScoreDetail['status'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'critical';
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
}
