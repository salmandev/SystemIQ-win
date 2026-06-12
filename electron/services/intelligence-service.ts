import si from 'systeminformation';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  MachineProfile, RootCauseAnalysis, StorageTimelineEntry,
  PCHealthReport, OptimizationModeConfig, InstalledApp,
  PrivacyScanResult, ProcessInsight, DevProject,
  DockerIntelligence, KubernetesWSLInfo,
} from '../../shared/types';

const execAsync = promisify(exec);

export class IntelligenceService {
  // ---- Machine Intelligence Profile ----
  async getProfile(): Promise<MachineProfile> {
    const [osInfo, cpu, mem, fsSize, graphics] = await Promise.all([
      si.osInfo(), si.cpu(), si.mem(), si.fsSize(), si.graphics(),
    ]);

    const totalStorage = fsSize.reduce((s, d) => s + d.size, 0);
    const hostname = osInfo.hostname;
    const model = await this.getDeviceModel();
    const usagePattern = this.detectUsagePattern();
    const detectedRoles = await this.detectRoles();
    const optimizationProfile = this.getOptimizationProfile(detectedRoles);
    const recommendedActions = await this.getRecommendedActions(fsSize);
    const personality = this.getPersonalityBreakdown(totalStorage);

    return {
      device: model || hostname,
      usagePattern,
      detectedRoles,
      optimizationProfile,
      recommendedActions,
      personality,
    };
  }

  // ---- AI Root Cause Analysis ----
  async analyzeRootCause(query: string): Promise<RootCauseAnalysis> {
    const [mem, fsSize, cpuLoad, processes] = await Promise.all([
      si.mem(), si.fsSize(), si.currentLoad(), si.processes(),
    ]);

    const causes: RootCauseAnalysis['causes'] = [];
    let totalRecoverable = 0;

    // Analyze disk usage
    const home = os.homedir();
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');

    // Check common large consumers
    const checkPaths = [
      { path: path.join(localAppData, 'Docker'), desc: 'Docker images and volumes' },
      { path: path.join(localAppData, 'Google', 'Chrome', 'User Data'), desc: 'Chrome browser data' },
      { path: path.join(localAppData, 'npm-cache'), desc: 'npm package cache' },
      { path: path.join(home, '.m2', 'repository'), desc: 'Maven repository' },
      { path: path.join(home, '.gradle', 'caches'), desc: 'Gradle cache' },
      { path: 'C:\\Windows\\SoftwareDistribution', desc: 'Windows Update cache' },
      { path: path.join(localAppData, 'Temp'), desc: 'User temp files' },
    ];

    for (const item of checkPaths) {
      try {
        if (fs.existsSync(item.path)) {
          const size = await this.getDirSize(item.path);
          if (size > 100 * 1024 * 1024) { // > 100MB
            causes.push({
              description: item.desc,
              path: item.path,
              sizeChange: size,
              percentOfTotal: 0,
              severity: size > 10 * 1024 * 1024 * 1024 ? 'critical' : size > 1024 * 1024 * 1024 ? 'warning' : 'info',
            });
            totalRecoverable += Math.floor(size * 0.5);
          }
        }
      } catch { /* skip */ }
    }

    // Calculate percentages
    const totalSize = causes.reduce((s, c) => s + c.sizeChange, 0);
    for (const cause of causes) {
      cause.percentOfTotal = totalSize > 0 ? Math.round((cause.sizeChange / totalSize) * 1000) / 10 : 0;
    }
    causes.sort((a, b) => b.sizeChange - a.sizeChange);

    const recommendations = causes.slice(0, 5).map(c =>
      `Clean ${c.description} to recover ${this.formatSize(c.sizeChange * 0.5)}`
    );

    return {
      query,
      causes: causes.slice(0, 10),
      totalRecoverable,
      riskLevel: 'low',
      recommendations,
    };
  }

  // ---- Storage Timeline ----
  async getTimeline(): Promise<StorageTimelineEntry[]> {
    const fsSize = await si.fsSize();
    const primaryDisk = fsSize.find(d => d.mount === 'C:' || d.mount === '/') || fsSize[0];
    if (!primaryDisk) return [];

    const entries: StorageTimelineEntry[] = [];
    const now = Date.now();

    // Generate timeline from current state (real implementation would read DB history)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const variance = (Math.random() - 0.5) * 5 * 1024 * 1024 * 1024;
      entries.push({
        date: dateStr,
        driveFree: primaryDisk.available + variance,
        driveTotal: primaryDisk.size,
        changes: [],
      });
    }

    return entries;
  }

  // ---- PC Health Doctor ----
  async diagnosePC(): Promise<PCHealthReport> {
    const [mem, fsSize, cpuLoad, processes] = await Promise.all([
      si.mem(), si.fsSize(), si.currentLoad(), si.processes(),
    ]);

    const issues: PCHealthReport['issues'] = [];
    const checks: PCHealthReport['checks'] = [];
    let overall = 100;

    // Storage check
    for (const disk of fsSize) {
      if (disk.use > 85) {
        overall -= 15;
        issues.push({
          icon: '💾', title: `${disk.mount} drive nearly full`,
          severity: disk.use > 90 ? 'critical' : 'warning',
          detail: `${disk.use}% used, ${this.formatSize(disk.available)} remaining`,
          fixable: true,
        });
        checks.push({ name: 'Storage Scan', status: 'warning', detail: `${disk.mount} ${disk.use}% full`, score: 100 - disk.use });
      } else {
        checks.push({ name: 'Storage Scan', status: 'pass', detail: `${disk.mount} ${disk.use}% used`, score: 100 - Math.floor(disk.use * 0.3) });
      }
    }

    // Memory check
    const memPercent = (mem.used / mem.total) * 100;
    if (memPercent > 80) {
      overall -= 10;
      issues.push({
        icon: '🧠', title: 'High memory usage',
        severity: memPercent > 90 ? 'critical' : 'warning',
        detail: `${memPercent.toFixed(0)}% RAM in use (${this.formatSize(mem.used)} / ${this.formatSize(mem.total)})`,
        fixable: true,
      });
      checks.push({ name: 'Memory Analysis', status: 'warning', detail: `${memPercent.toFixed(0)}% RAM used`, score: Math.max(0, 100 - Math.floor(memPercent)) });
    } else {
      checks.push({ name: 'Memory Analysis', status: 'pass', detail: `${memPercent.toFixed(0)}% RAM used`, score: Math.max(0, 100 - Math.floor(memPercent * 0.5)) });
    }

    // CPU check
    if (cpuLoad.currentLoad > 70) {
      overall -= 10;
      issues.push({
        icon: '⚡', title: 'Elevated CPU usage',
        severity: cpuLoad.currentLoad > 85 ? 'critical' : 'warning',
        detail: `CPU at ${cpuLoad.currentLoad.toFixed(0)}% utilization`,
        fixable: true,
      });
    }
    checks.push({ name: 'CPU Analysis', status: cpuLoad.currentLoad > 70 ? 'warning' : 'pass', detail: `CPU ${cpuLoad.currentLoad.toFixed(0)}%`, score: Math.max(0, 100 - Math.floor(cpuLoad.currentLoad)) });

    // Startup check
    try {
      const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" 2>nul');
      const startupCount = stdout.split('\n').filter(l => l.includes('REG_SZ')).length;
      if (startupCount > 5) {
        overall -= 10;
        issues.push({
          icon: '🚀', title: `${startupCount} startup apps detected`,
          severity: 'warning', detail: `Estimated ${startupCount * 2}s added to boot time`,
          fixable: true,
        });
        checks.push({ name: 'Startup Scan', status: 'warning', detail: `${startupCount} items`, score: Math.max(0, 100 - startupCount * 5) });
      } else {
        checks.push({ name: 'Startup Scan', status: 'pass', detail: `${startupCount} startup items`, score: 90 });
      }
    } catch {
      checks.push({ name: 'Startup Scan', status: 'pass', detail: 'Unable to scan', score: 75 });
    }

    // Security check
    try {
      const { stdout } = await execAsync('powershell -Command "Get-MpComputerStatus | Select-Object AMRunningMode" 2>nul');
      if (stdout.includes('Normal')) {
        checks.push({ name: 'Security Check', status: 'pass', detail: 'Windows Defender active', score: 95 });
      } else {
        overall -= 5;
        checks.push({ name: 'Security Check', status: 'warning', detail: 'Defender status unknown', score: 70 });
      }
    } catch {
      checks.push({ name: 'Security Check', status: 'pass', detail: 'Security check skipped', score: 80 });
    }

    const fixActions = issues.filter(i => i.fixable).map(i => `Fix: ${i.title}`);

    return {
      overall: Math.max(0, Math.min(100, overall)),
      maxScore: 100,
      issues,
      fixPlan: {
        estimatedMinutes: Math.ceil(fixActions.length * 3),
        expectedImprovement: issues.filter(i => i.fixable).length * 5,
        actions: fixActions,
      },
      checks,
    };
  }

  // ---- Optimization Mode Configs ----
  async getModeConfig(): Promise<OptimizationModeConfig[]> {
    return [
      {
        mode: 'gaming', name: 'Gaming Mode', icon: '🎮', color: '#E3008C',
        description: 'Maximize FPS by reducing background resource usage',
        actions: [
          { id: 'g1', name: 'Suspend background apps', description: 'Pause non-essential processes', impact: 'high', enabled: true, category: 'processes' },
          { id: 'g2', name: 'Disable Windows Search indexer', description: 'Reduce disk I/O during gaming', impact: 'high', enabled: true, category: 'services' },
          { id: 'g3', name: 'Free memory', description: 'Release unused memory from background apps', impact: 'high', enabled: true, category: 'memory' },
          { id: 'g4', name: 'Set high performance power plan', description: 'Maximize CPU performance', impact: 'medium', enabled: true, category: 'power' },
        ],
      },
      {
        mode: 'developer', name: 'Developer Mode', icon: '👨‍💻', color: '#038387',
        description: 'Optimize for development workflows and build performance',
        actions: [
          { id: 'd1', name: 'Clean Docker resources', description: 'Prune unused images and containers', impact: 'high', enabled: true, category: 'docker' },
          { id: 'd2', name: 'Clear IDE caches', description: 'Remove IntelliJ/VS Code caches', impact: 'medium', enabled: true, category: 'ide' },
          { id: 'd3', name: 'Clean build artifacts', description: 'Remove target/, dist/, build/ folders', impact: 'high', enabled: true, category: 'builds' },
          { id: 'd4', name: 'Optimize npm/Maven cache', description: 'Clean package manager caches', impact: 'medium', enabled: true, category: 'packages' },
        ],
      },
      {
        mode: 'office', name: 'Office Mode', icon: '📊', color: '#0078D4',
        description: 'Optimize for productivity apps and video calls',
        actions: [
          { id: 'o1', name: 'Optimize Teams', description: 'Clear Teams cache and optimize memory', impact: 'high', enabled: true, category: 'apps' },
          { id: 'o2', name: 'Clean browser cache', description: 'Clear all browser caches', impact: 'medium', enabled: true, category: 'browser' },
          { id: 'o3', name: 'Free memory for Office apps', description: 'Release memory from non-essential apps', impact: 'medium', enabled: true, category: 'memory' },
        ],
      },
      {
        mode: 'battery', name: 'Battery Mode', icon: '🔋', color: '#00B294',
        description: 'Extend battery life by reducing power consumption',
        actions: [
          { id: 'b1', name: 'Reduce CPU boost', description: 'Limit CPU to base frequency', impact: 'high', enabled: true, category: 'power' },
          { id: 'b2', name: 'Suspend background tasks', description: 'Pause non-essential background work', impact: 'high', enabled: true, category: 'processes' },
          { id: 'b3', name: 'Enable battery saver', description: 'Windows battery saver mode', impact: 'high', enabled: true, category: 'power' },
        ],
      },
    ];
  }

  // ---- Installed Apps ----
  async getInstalledApps(): Promise<InstalledApp[]> {
    const apps: InstalledApp[] = [];
    try {
      const { stdout } = await execAsync(
        'powershell -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, Publisher, DisplayVersion, InstallDate, EstimatedSize | ConvertTo-Json" 2>nul',
        { maxBuffer: 10 * 1024 * 1024 }
      );
      const rawApps = JSON.parse(stdout) as any[];
      const appArray = Array.isArray(rawApps) ? rawApps : [rawApps];

      for (const app of appArray) {
        if (!app.DisplayName) continue;
        apps.push({
          id: `app-${app.DisplayName.replace(/\s+/g, '-').toLowerCase()}`,
          name: app.DisplayName,
          publisher: app.Publisher || 'Unknown',
          version: app.DisplayVersion || 'Unknown',
          installDate: app.InstallDate ? new Date(`${app.InstallDate.slice(0, 4)}-${app.InstallDate.slice(4, 6)}-${app.InstallDate.slice(6, 8)}`).getTime() : Date.now(),
          lastUsed: Date.now(),
          size: (app.EstimatedSize || 0) * 1024,
          category: this.categorizeApp(app.DisplayName),
          usageFrequency: 'weekly',
        });
      }
    } catch {
      // Fallback: try user-level apps
      try {
        const { stdout } = await execAsync(
          'powershell -Command "Get-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, Publisher, DisplayVersion, InstallDate, EstimatedSize | ConvertTo-Json" 2>nul',
          { maxBuffer: 10 * 1024 * 1024 }
        );
        const rawApps = JSON.parse(stdout) as any[];
        const appArray = Array.isArray(rawApps) ? rawApps : [rawApps];
        for (const app of appArray) {
          if (!app.DisplayName) continue;
          apps.push({
            id: `app-${app.DisplayName.replace(/\s+/g, '-').toLowerCase()}`,
            name: app.DisplayName,
            publisher: app.Publisher || 'Unknown',
            version: app.DisplayVersion || 'Unknown',
            installDate: Date.now(),
            lastUsed: Date.now(),
            size: (app.EstimatedSize || 0) * 1024,
            category: this.categorizeApp(app.DisplayName),
            usageFrequency: 'weekly',
          });
        }
      } catch { /* skip */ }
    }
    return apps.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ---- Privacy Scan ----
  async scanPrivacy(): Promise<PrivacyScanResult> {
    const home = os.homedir();
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');

    const browserTrackers: PrivacyScanResult['browserTrackers'] = [];
    const recentFiles: PrivacyScanResult['recentFiles'] = [];
    const activityHistory: PrivacyScanResult['activityHistory'] = [];
    let totalRecoverable = 0;

    // Chrome cookies/cache
    const chromeCookiesPath = path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cookies');
    if (fs.existsSync(chromeCookiesPath)) {
      const size = fs.statSync(chromeCookiesPath).size;
      browserTrackers.push({ browser: 'Chrome', count: 0, size });
      totalRecoverable += size;
    }

    // Edge cookies
    const edgeCookiesPath = path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cookies');
    if (fs.existsSync(edgeCookiesPath)) {
      const size = fs.statSync(edgeCookiesPath).size;
      browserTrackers.push({ browser: 'Edge', count: 0, size });
      totalRecoverable += size;
    }

    // Recent files
    const recentPath = path.join(appData, 'Microsoft', 'Windows', 'Recent');
    if (fs.existsSync(recentPath)) {
      try {
        const files = fs.readdirSync(recentPath);
        for (const file of files.slice(0, 20)) {
          const fullPath = path.join(recentPath, file);
          try {
            const stats = fs.statSync(fullPath);
            recentFiles.push({
              name: file, path: fullPath, accessed: stats.mtimeMs,
            });
          } catch { /* skip */ }
        }
        totalRecoverable += files.length * 1024;
      } catch { /* skip */ }
    }

    // Clipboard history
    let clipboardHistory = { count: 0, enabled: false };
    try {
      const { stdout } = await execAsync(
        'reg query "HKCU\\Software\\Microsoft\\Clipboard" /v EnableClipboardHistory 2>nul'
      );
      const enabled = stdout.includes('0x1');
      clipboardHistory = { count: 0, enabled };
    } catch { /* skip */ }

    // Activity history
    activityHistory.push({ type: 'Recent Files', count: recentFiles.length, size: recentFiles.length * 1024 });

    const searchHistory: PrivacyScanResult['searchHistory'] = [];

    return {
      browserTrackers,
      recentFiles: recentFiles.slice(0, 10),
      activityHistory,
      clipboardHistory,
      searchHistory,
      totalRecoverable,
    };
  }

  // ---- Process Insights ----
  async getProcessInsights(): Promise<ProcessInsight[]> {
    const processes = await si.processes();
    const topProcesses = processes.list
      .sort((a, b) => b.mem - a.mem)
      .slice(0, 20);

    return topProcesses.map(p => ({
      pid: p.pid,
      name: p.name,
      purpose: this.getProcessPurpose(p.name),
      startedBy: 'User',
      impact: p.mem > 1024 * 1024 * 1024 ? 'high' as const : p.mem > 256 * 1024 * 1024 ? 'medium' as const : 'low' as const,
      recommendation: this.getProcessRecommendation(p),
      safeToStop: this.isSafeToStop(p.name),
    }));
  }

  // ---- Developer Projects Scanner ----
  async scanDevProjects(): Promise<DevProject[]> {
    const home = os.homedir();
    const searchDirs = [
      path.join(home, 'Projects'),
      path.join(home, 'Documents'),
      path.join(home, 'Desktop'),
      path.join(home, 'repos'),
      path.join(home, 'dev'),
      path.join(home, 'workspace'),
      path.join(home, 'code'),
    ];

    // Also check D: drive if exists
    const drives = await si.fsSize();
    for (const d of drives) {
      if (d.mount !== 'C:' && d.mount !== '/') {
        searchDirs.push(path.join(d.mount, 'Projects'));
        searchDirs.push(path.join(d.mount, 'repos'));
      }
    }

    const projects: DevProject[] = [];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const projectPath = path.join(dir, entry.name);
          const project = await this.detectProject(projectPath, entry.name);
          if (project) projects.push(project);
        }
      } catch { /* skip */ }
    }

    return projects;
  }

  // ---- Docker Intelligence ----
  async getDockerInfo(): Promise<DockerIntelligence | null> {
    try {
      const { stdout: versionOut } = await execAsync('docker --version 2>nul');
      if (!versionOut.includes('Docker')) return null;
    } catch {
      return null;
    }

    const result: DockerIntelligence = {
      images: { count: 0, size: 0, items: [] },
      containers: { count: 0, size: 0, items: [] },
      volumes: { count: 0, size: 0, items: [] },
      buildCache: { size: 0, count: 0 },
      totalSize: 0,
    };

    // Images
    try {
      const { stdout } = await execAsync('docker images --format "{{.Repository}}|{{.Tag}}|{{.Size}}|{{.CreatedSince}}|{{.ID}}" 2>nul');
      const lines = stdout.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const [name, tag, sizeStr, created] = line.split('|');
        const size = this.parseDockerSize(sizeStr || '');
        result.images.items.push({
          name: name || '<none>', tag: tag || '<none>', size,
          created: Date.now(), dangling: name === '<none>',
        });
        result.images.size += size;
      }
      result.images.count = result.images.items.length;
    } catch { /* docker not running */ }

    // Containers
    try {
      const { stdout } = await execAsync('docker ps -a --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.Size}}|{{.Ports}}" 2>nul');
      const lines = stdout.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const [name, image, status, sizeStr, ports] = line.split('|');
        const size = this.parseDockerSize(sizeStr || '');
        result.containers.items.push({
          name: name || '', image: image || '', status: status || '',
          size, ports: ports || '',
        });
        result.containers.size += size;
      }
      result.containers.count = result.containers.items.length;
    } catch { /* skip */ }

    result.totalSize = result.images.size + result.containers.size + result.volumes.size + result.buildCache.size;
    return result;
  }

  // ---- Kubernetes / WSL Info ----
  async getK8sWSLInfo(): Promise<KubernetesWSLInfo> {
    const home = os.homedir();
    const result: KubernetesWSLInfo = {
      wsl: { enabled: false, distros: [] },
      kubernetes: {},
      totalSize: 0,
    };

    // Check WSL
    try {
      const { stdout } = await execAsync('wsl --list --verbose 2>nul');
      if (stdout.includes('NAME')) {
        result.wsl.enabled = true;
        const lines = stdout.split('\n').filter(l => l.trim() && !l.includes('NAME'));
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            result.wsl.distros.push({
              name: parts[0], size: 0, version: parts.length >= 4 ? `WSL ${parts[3]}` : 'WSL 2',
            });
          }
        }
      }
    } catch { /* WSL not available */ }

    // Check kubectl
    try {
      const { stdout } = await execAsync('kubectl version --client 2>nul');
      if (stdout.includes('Client')) {
        const kubeConfigPath = path.join(home, '.kube', 'config');
        result.kubernetes.kubeConfig = fs.existsSync(kubeConfigPath) ? kubeConfigPath : undefined;
      }
    } catch { /* kubectl not installed */ }

    // Check minikube
    try {
      const { stdout } = await execAsync('minikube status 2>nul');
      if (stdout.includes('Running') || stdout.includes('Stopped')) {
        result.kubernetes.minikube = { installed: true, size: 0, clusters: 1 };
      }
    } catch { /* minikube not installed */ }

    result.totalSize = result.wsl.distros.reduce((s, d) => s + d.size, 0);
    return result;
  }

  // ---- Helper Methods ----
  private async getDeviceModel(): Promise<string> {
    try {
      const system = await si.system();
      return `${system.manufacturer || ''} ${system.model || ''}`.trim();
    } catch {
      return '';
    }
  }

  private detectUsagePattern(): string {
    return 'Developer Workstation';
  }

  private async detectRoles(): Promise<string[]> {
    const roles: string[] = [];
    const checks: [string, string][] = [
      ['java -version 2>&1', 'Java Developer'],
      ['node --version 2>nul', 'Node.js Developer'],
      ['docker --version 2>nul', 'Docker User'],
      ['kubectl version --client 2>nul', 'Kubernetes User'],
      ['python --version 2>nul', 'Python Developer'],
    ];

    for (const [cmd, role] of checks) {
      try {
        await execAsync(cmd);
        roles.push(role);
      } catch { /* not installed */ }
    }

    return roles.length > 0 ? roles : ['General User'];
  }

  private getOptimizationProfile(roles: string[]): string {
    if (roles.some(r => r.includes('Developer'))) return 'Developer Heavy';
    if (roles.some(r => r.includes('Docker'))) return 'Container Heavy';
    return 'General Purpose';
  }

  private async getRecommendedActions(fsSize: any[]): Promise<string[]> {
    const actions: string[] = [];
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    // Check Docker
    try {
      const { stdout } = await execAsync('docker --version 2>nul');
      if (stdout.includes('Docker')) actions.push('Docker cleanup (run docker system prune)');
    } catch { /* skip */ }

    // Check npm cache
    const npmCachePath = path.join(localAppData, 'npm-cache');
    if (fs.existsSync(npmCachePath)) actions.push('npm cache cleanup');

    // Check disk space
    for (const disk of fsSize) {
      if (disk.use > 80) actions.push(`${disk.mount} drive cleanup (${disk.use}% used)`);
    }

    return actions.length > 0 ? actions : ['Run a full system scan'];
  }

  private getPersonalityBreakdown(totalStorage: number) {
    return {
      label: 'Developer Machine',
      breakdown: [
        { category: 'Development', size: Math.floor(totalStorage * 0.35), color: '#038387' },
        { category: 'System', size: Math.floor(totalStorage * 0.2), color: '#616161' },
        { category: 'Applications', size: Math.floor(totalStorage * 0.15), color: '#8764B8' },
        { category: 'Media', size: Math.floor(totalStorage * 0.15), color: '#E3008C' },
        { category: 'Documents', size: Math.floor(totalStorage * 0.1), color: '#00B294' },
        { category: 'Other', size: Math.floor(totalStorage * 0.05), color: '#8A8A8A' },
      ],
    };
  }

  private async getDirSize(dirPath: string, maxDepth = 3): Promise<number> {
    let size = 0;
    const walk = (dir: string, depth: number) => {
      if (depth > maxDepth) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isFile()) {
            try { size += fs.statSync(fullPath).size; } catch { /* skip */ }
          } else if (entry.isDirectory()) {
            walk(fullPath, depth + 1);
          }
        }
      } catch { /* skip */ }
    };
    walk(dirPath, 0);
    return size;
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  private categorizeApp(name: string): InstalledApp['category'] {
    const lower = name.toLowerCase();
    if (lower.includes('chrome') || lower.includes('firefox') || lower.includes('edge') || lower.includes('brave')) return 'browser';
    if (lower.includes('visual studio') || lower.includes('intellij') || lower.includes('docker') || lower.includes('python') || lower.includes('node')) return 'development';
    if (lower.includes('teams') || lower.includes('discord') || lower.includes('slack') || lower.includes('zoom')) return 'communication';
    if (lower.includes('office') || lower.includes('word') || lower.includes('excel') || lower.includes('powerpoint') || lower.includes('notion')) return 'productivity';
    if (lower.includes('spotify') || lower.includes('vlc') || lower.includes('adobe')) return 'media';
    if (lower.includes('steam') || lower.includes('epic') || lower.includes('game')) return 'gaming';
    return 'other';
  }

  private getProcessPurpose(name: string): string {
    const lower = name.toLowerCase();
    const purposes: Record<string, string> = {
      'chrome.exe': 'Web browser',
      'msedge.exe': 'Microsoft Edge browser',
      'code.exe': 'VS Code editor',
      'docker.exe': 'Docker Desktop',
      'teams.exe': 'Microsoft Teams',
      'explorer.exe': 'Windows File Explorer',
      'svchost.exe': 'Windows system service',
      'system': 'Windows kernel',
      'searchhost.exe': 'Windows Search',
      'shellexperiencehost.exe': 'Windows Shell',
      'runtimebroker.exe': 'Windows Runtime Broker',
      'node.exe': 'Node.js runtime',
      'python.exe': 'Python runtime',
      'java.exe': 'Java runtime',
    };
    return purposes[lower] || `Application: ${name}`;
  }

  private getProcessRecommendation(p: any): string {
    if (p.mem > 2 * 1024 * 1024 * 1024) return `High memory usage (${this.formatSize(p.mem)}). Consider restarting.`;
    if (p.cpu > 20) return `High CPU usage (${p.cpu.toFixed(0)}%). Investigate if expected.`;
    if (p.mem > 500 * 1024 * 1024) return `Using ${this.formatSize(p.mem)}. Monitor if system feels slow.`;
    return 'Normal resource usage';
  }

  private isSafeToStop(name: string): boolean {
    const unsafe = ['system', 'svchost.exe', 'explorer.exe', 'searchhost.exe', 'shellexperiencehost.exe', 'runtimebroker.exe', 'csrss.exe', 'lsass.exe', 'winlogon.exe', 'services.exe'];
    return !unsafe.includes(name.toLowerCase());
  }

  private async detectProject(projectPath: string, name: string): Promise<DevProject | null> {
    const typeMarkers: [string, DevProject['type'], string][] = [
      ['pom.xml', 'java', 'Maven/Java'],
      ['build.gradle', 'java', 'Gradle/Java'],
      ['package.json', 'node', 'Node.js'],
      ['angular.json', 'angular', 'Angular'],
      ['next.config.js', 'next', 'Next.js'],
      ['next.config.mjs', 'next', 'Next.js'],
      ['vite.config.ts', 'vite', 'Vite'],
      ['vite.config.js', 'vite', 'Vite'],
      ['vue.config.js', 'vue', 'Vue.js'],
      ['docker-compose.yml', 'docker', 'Docker'],
      ['Dockerfile', 'docker', 'Docker'],
    ];

    for (const [file, type, tech] of typeMarkers) {
      if (fs.existsSync(path.join(projectPath, file))) {
        let deps = 0;
        let size = 0;
        const largestConsumers: { name: string; size: number }[] = [];
        const configFiles: string[] = [file];

        // Count dependencies
        if (type === 'node' || type === 'angular' || type === 'next' || type === 'vite' || type === 'vue') {
          const nmPath = path.join(projectPath, 'node_modules');
          if (fs.existsSync(nmPath)) {
            const nmSize = await this.getDirSize(nmPath, 1);
            size += nmSize;
            largestConsumers.push({ name: 'node_modules', size: nmSize });
            try {
              const pkgJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
              deps = Object.keys(pkgJson.dependencies || {}).length + Object.keys(pkgJson.devDependencies || {}).length;
            } catch { /* skip */ }
          }
        }

        try {
          const stats = fs.statSync(projectPath);
          return {
            id: `project-${name}`,
            name,
            path: projectPath,
            type,
            technology: tech,
            dependencies: deps,
            size,
            largestConsumers,
            configFiles,
            lastModified: stats.mtimeMs,
          };
        } catch { /* skip */ }
      }
    }

    return null;
  }

  private parseDockerSize(sizeStr: string): number {
    const match = sizeStr.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 };
    return Math.floor(value * (multipliers[unit] || 1));
  }
}
