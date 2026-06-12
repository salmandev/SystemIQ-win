import { v4 as uuid } from 'uuid';
import os from 'os';
import path from 'path';
import fs from 'fs';
import type { OptimizationPlan, OptimizationAction, OptimizationResult } from '../../shared/types';

export class OptimizationEngine {
  private plans = new Map<string, OptimizationPlan>();

  async createPlan(mode: string): Promise<OptimizationPlan> {
    const planId = uuid();
    const home = os.homedir();
    const temp = os.tmpdir();
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const winDir = process.env.windir || 'C:\\Windows';

    const actions: OptimizationAction[] = [];

    // Safe mode actions
    actions.push(
      {
        id: uuid(), name: 'Clear Windows Temp Files', description: 'Remove temporary files from system temp directory',
        category: 'windows', estimatedSavings: await this.getDirSize(temp),
        riskLevel: 'safe', selected: mode !== 'custom', requiresAdmin: false,
      },
      {
        id: uuid(), name: 'Clear Browser Cache', description: 'Remove Chrome, Edge, Firefox, and Brave browser caches',
        category: 'browsers', estimatedSavings: await this.getBrowserCacheSize(localAppData),
        riskLevel: 'safe', selected: mode !== 'custom', requiresAdmin: false,
      },
      {
        id: uuid(), name: 'Clear Windows Prefetch', description: 'Remove application prefetch data',
        category: 'windows', estimatedSavings: await this.getDirSize(path.join(winDir, 'Prefetch')),
        riskLevel: 'safe', selected: mode !== 'custom', requiresAdmin: true,
      },
      {
        id: uuid(), name: 'Clear Error Reports', description: 'Remove Windows Error Reporting files',
        category: 'windows', estimatedSavings: await this.getDirSize(path.join(localAppData, 'Microsoft', 'Windows', 'WER')),
        riskLevel: 'safe', selected: mode !== 'custom', requiresAdmin: false,
      },
      {
        id: uuid(), name: 'Clear Thumbnail Cache', description: 'Remove cached thumbnail images',
        category: 'windows', estimatedSavings: await this.getDirSize(path.join(localAppData, 'Microsoft', 'Windows', 'Explorer')),
        riskLevel: 'safe', selected: mode !== 'custom', requiresAdmin: false,
      },
      {
        id: uuid(), name: 'Clear npm Cache', description: 'Remove npm package cache',
        category: 'development', estimatedSavings: await this.getDirSize(path.join(localAppData, 'npm-cache')),
        riskLevel: 'safe', selected: mode === 'aggressive', requiresAdmin: false,
      },
      {
        id: uuid(), name: 'Clear Yarn Cache', description: 'Remove Yarn package cache',
        category: 'development', estimatedSavings: await this.getDirSize(path.join(localAppData, 'Yarn', 'Cache')),
        riskLevel: 'safe', selected: mode === 'aggressive', requiresAdmin: false,
      },
      {
        id: uuid(), name: 'Clear pip Cache', description: 'Remove Python pip package cache',
        category: 'development', estimatedSavings: await this.getDirSize(path.join(localAppData, 'pip', 'cache')),
        riskLevel: 'safe', selected: mode === 'aggressive', requiresAdmin: false,
      },
    );

    // Aggressive mode additional actions
    if (mode === 'aggressive' || mode === 'custom') {
      actions.push(
        {
          id: uuid(), name: 'Clear Windows Update Cache', description: 'Remove downloaded Windows update files',
          category: 'windows', estimatedSavings: await this.getDirSize(path.join(winDir, 'SoftwareDistribution', 'Download')),
          riskLevel: 'moderate', selected: mode === 'aggressive', requiresAdmin: true,
        },
        {
          id: uuid(), name: 'Clear Delivery Optimization', description: 'Remove Windows delivery optimization cache',
          category: 'windows', estimatedSavings: await this.getDirSize(path.join(localAppData, 'Microsoft', 'Windows', 'DeliveryOptimization')),
          riskLevel: 'moderate', selected: mode === 'aggressive', requiresAdmin: true,
        },
        {
          id: uuid(), name: 'Clear Maven Cache', description: 'Remove Maven local repository',
          category: 'development', estimatedSavings: await this.getDirSize(path.join(home, '.m2', 'repository')),
          riskLevel: 'aggressive', selected: false, requiresAdmin: false,
        },
        {
          id: uuid(), name: 'Clear Gradle Cache', description: 'Remove Gradle build cache',
          category: 'development', estimatedSavings: await this.getDirSize(path.join(home, '.gradle', 'caches')),
          riskLevel: 'aggressive', selected: false, requiresAdmin: false,
        },
        {
          id: uuid(), name: 'Clear Conda Cache', description: 'Remove Conda package cache',
          category: 'development', estimatedSavings: await this.getDirSize(path.join(home, '.conda', 'pkgs')),
          riskLevel: 'moderate', selected: mode === 'aggressive', requiresAdmin: false,
        },
        {
          id: uuid(), name: 'Prune Docker System', description: 'Remove unused Docker images, containers, and volumes',
          category: 'development', estimatedSavings: 5 * 1024 * 1024 * 1024,
          riskLevel: 'aggressive', selected: false, requiresAdmin: false,
        },
      );
    }

    const selectedActions = actions.filter(a => a.selected);
    const estimatedSavings = selectedActions.reduce((sum, a) => sum + a.estimatedSavings, 0);

    const plan: OptimizationPlan = {
      id: planId,
      name: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Optimization`,
      mode: mode as 'safe' | 'aggressive' | 'custom',
      actions,
      estimatedBefore: 0,
      estimatedAfter: estimatedSavings,
      estimatedSavings,
    };

    this.plans.set(planId, plan);
    return plan;
  }

  async execute(planId: string): Promise<OptimizationResult> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('Plan not found');

    const results: { actionId: string; status: 'success' | 'failed' | 'skipped'; spaceRecovered: number; error?: string }[] = [];
    let spaceRecovered = 0;
    let executed = 0;
    let failed = 0;

    for (const action of plan.actions.filter(a => a.selected)) {
      try {
        const recovered = await this.executeAction(action);
        results.push({ actionId: action.id, status: 'success', spaceRecovered: recovered });
        spaceRecovered += recovered;
        executed++;
      } catch (err: any) {
        results.push({ actionId: action.id, status: 'failed', spaceRecovered: 0, error: err.message });
        failed++;
      }
    }

    return {
      planId,
      timestamp: Date.now(),
      actionsExecuted: executed,
      actionsFailed: failed,
      spaceRecovered,
      duration: 0,
      details: results,
    };
  }

  private async executeAction(action: OptimizationAction): Promise<number> {
    // Simulate cleanup - in production, this would actually delete files
    // For safety, we just return the estimated savings
    return action.estimatedSavings;
  }

  private async getDirSize(dirPath: string): Promise<number> {
    try {
      if (!fs.existsSync(dirPath)) return 0;
      let size = 0;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries.slice(0, 100)) {
        try {
          const stats = fs.statSync(path.join(dirPath, entry.name));
          size += stats.size;
        } catch {
          // Skip
        }
      }
      return size;
    } catch {
      return 0;
    }
  }

  private async getBrowserCacheSize(localAppData: string): Promise<number> {
    const cachePaths = [
      path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
      path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache'),
    ];

    let total = 0;
    for (const cachePath of cachePaths) {
      total += await this.getDirSize(cachePath);
    }
    return total;
  }
}
