import type { AIRecommendation, AIMessage, SystemInfo, JunkScanResult, HealthScore } from '../../shared/types';

export class AIEngine {
  private context: Record<string, unknown> = {};

  async getRecommendations(): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // These would normally come from actual scan results
    // For now, we generate context-aware recommendations
    const si = await import('systeminformation');
    const [mem, fsSize, cpuLoad, processes] = await Promise.all([
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.processes(),
    ]);

    // Storage recommendations
    for (const disk of fsSize) {
      if (disk.use > 85) {
        recommendations.push({
          id: `storage-${disk.mount}`,
          title: `${disk.mount} drive is ${disk.use}% full`,
          description: `Your ${disk.mount} drive has only ${this.formatSize(disk.available)} of free space remaining.`,
          explanation: `Your ${disk.mount} drive is consuming ${disk.use}% of its capacity. When drives exceed 85% usage, Windows performance degrades significantly. Temporary files, Windows update caches, browser caches, and developer tool caches are typically the largest culprits. I recommend running the Storage Analyzer to identify what's consuming your space, then using the Junk Cleaner to safely remove unnecessary files.`,
          category: 'storage',
          priority: 'high',
          riskLevel: 'safe',
          action: 'open-storage-analyzer',
        });
      }
    }

    // Memory recommendations
    const memPercent = (mem.used / mem.total) * 100;
    if (memPercent > 75) {
      const topMemProcs = processes.list
        .sort((a, b) => b.mem - a.mem)
        .slice(0, 5);
      const procList = topMemProcs.map(p => `${p.name} (${this.formatSize(p.mem)})`).join(', ');

      recommendations.push({
        id: 'memory-high',
        title: `Memory usage is at ${memPercent.toFixed(0)}%`,
        description: `Your system is using ${this.formatSize(mem.used)} out of ${this.formatSize(mem.total)} RAM.`,
        explanation: `High memory usage causes Windows to use slower swap memory on disk, dramatically affecting performance. The top memory consumers are: ${procList}. Consider closing unused applications and browser tabs. If this persists, a system restart can clear memory leaks.`,
        category: 'memory',
        priority: 'high',
        riskLevel: 'safe',
        action: 'open-resource-optimizer',
      });
    }

    // CPU recommendations
    if (cpuLoad.currentLoad > 70) {
      const topCpuProcs = processes.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 3);
      const cpuList = topCpuProcs.map(p => `${p.name} (${p.cpu.toFixed(0)}%)`).join(', ');

      recommendations.push({
        id: 'cpu-high',
        title: `CPU utilization is elevated at ${cpuLoad.currentLoad.toFixed(0)}%`,
        description: `Several processes are consuming significant CPU resources.`,
        explanation: `Your CPU is running at ${cpuLoad.currentLoad.toFixed(0)}% which is higher than normal for idle workloads. The primary consumers are: ${cpuList}. High CPU usage causes system lag, increased fan noise, and higher power consumption. Consider investigating these processes and checking if any can be paused or disabled.`,
        category: 'cpu',
        priority: cpuLoad.currentLoad > 85 ? 'high' : 'medium',
        riskLevel: 'safe',
        action: 'open-process-manager',
      });
    }

    // Startup recommendations
    recommendations.push({
      id: 'startup-review',
      title: 'Review startup applications',
      description: 'Optimizing startup apps can significantly reduce boot time.',
      explanation: `Many applications add themselves to Windows startup, adding several seconds to your boot time. Each startup app also consumes memory immediately after boot. I recommend reviewing your startup items and disabling those you don't need immediately. This alone can reduce boot time by 10-30 seconds.`,
      category: 'startup',
      priority: 'medium',
      riskLevel: 'safe',
      action: 'open-startup-optimizer',
    });

    // Developer tools recommendation
    recommendations.push({
      id: 'devtools-cleanup',
      title: 'Clean developer tool caches',
      description: 'npm, Docker, and other dev tools can consume tens of GBs.',
      explanation: `Developer tools like Docker, npm, Maven, Gradle, and Python virtual environments accumulate cached data that can consume significant disk space over time. A Docker installation alone can use 20+ GB with unused images and containers. Running the Developer Workstation scan can identify and safely clean these caches, potentially recovering 10-50 GB.`,
      category: 'development',
      priority: 'medium',
      riskLevel: 'safe',
      action: 'open-devtools-scanner',
    });

    // Regular maintenance
    recommendations.push({
      id: 'regular-maintenance',
      title: 'Schedule regular maintenance',
      description: 'Automate cleanup to keep your system optimized.',
      explanation: `The best way to maintain system health is through regular automated maintenance. Setting up weekly disk cleanup, monthly startup audits, and continuous monitoring prevents issues from accumulating. Configure the Automation Engine to run these tasks automatically so your system stays optimized without manual intervention.`,
      category: 'automation',
      priority: 'low',
      riskLevel: 'safe',
      action: 'open-automation',
    });

    return recommendations.sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    });
  }

  async chat(message: string, context?: Record<string, unknown>): Promise<AIMessage> {
    const lowerMsg = message.toLowerCase();
    let response = '';
    const actions: Array<{ label: string; action: string; params: Record<string, unknown>; riskLevel: 'safe' | 'moderate' | 'aggressive' }> = [];

    if (lowerMsg.includes('c drive') || lowerMsg.includes('c:') || lowerMsg.includes('full') || lowerMsg.includes('disk space') || lowerMsg.includes('storage')) {
      response = `Let me analyze your C: drive situation. Common reasons for a full C: drive include:

1. **Windows Temp Files** - These accumulate over time and can reach several GBs
2. **Browser Caches** - Chrome, Edge, and Firefox caches can each be 5-15 GB
3. **Developer Tool Caches** - npm (2-8 GB), Docker (10-30 GB), Maven/Gradle (5-15 GB)
4. **Windows Updates** - Old update files can take 10-20 GB
5. **Large Downloads** - Old files in Downloads folder
6. **AppData** - Application data in AppData\\Local and AppData\\Roaming

I recommend running the Storage Analyzer first to see exactly what's consuming space, then using the Junk Cleaner for safe removal.`;

      actions.push(
        { label: 'Run Storage Analyzer', action: 'open-storage-analyzer', params: {}, riskLevel: 'safe' },
        { label: 'Run Junk Cleaner', action: 'open-junk-cleaner', params: {}, riskLevel: 'safe' }
      );
    } else if (lowerMsg.includes('memory') || lowerMsg.includes('ram') || lowerMsg.includes('slow')) {
      response = `High memory usage is a common cause of system slowdowns. Here's what typically causes it:

1. **Browser Tabs** - Each Chrome/Edge tab can use 100-500 MB of RAM
2. **Background Apps** - Apps like Teams, Discord, Spotify run in background
3. **Memory Leaks** - Some applications don't release memory properly
4. **Windows Services** - Search indexer, Superfetch, etc.

**Quick Fixes:**
- Close unused browser tabs (use a tab manager extension)
- Disable unnecessary background apps in Settings > Apps > Startup
- Restart applications that have been running for a long time
- Run the Resource Optimizer to identify memory hogs`;

      actions.push(
        { label: 'View Resource Optimizer', action: 'open-resource-optimizer', params: {}, riskLevel: 'safe' },
        { label: 'Check Processes', action: 'open-process-manager', params: {}, riskLevel: 'safe' }
      );
    } else if (lowerMsg.includes('boot') || lowerMsg.includes('startup') || lowerMsg.includes('slow start')) {
      response = `Slow boot times are usually caused by too many startup applications. Here's how to improve:

1. **Disable Startup Apps** - Each startup app adds 2-10 seconds to boot
2. **Fast Startup** - Ensure Windows Fast Startup is enabled
3. **Services** - Set non-essential services to delayed start
4. **Disk Health** - SSD vs HDD makes a huge difference

**Impact Analysis:**
- Spotify: ~7 seconds boot impact
- Discord: ~5 seconds boot impact  
- Docker Desktop: ~12 seconds boot impact
- Chrome: ~5 seconds boot impact

I recommend reviewing your startup items and disabling anything you don't need immediately after boot.`;

      actions.push(
        { label: 'Open Startup Optimizer', action: 'open-startup-optimizer', params: {}, riskLevel: 'safe' }
      );
    } else if (lowerMsg.includes('clean') || lowerMsg.includes('safe') || lowerMsg.includes('delete')) {
      response = `Here's what you can safely delete on your Windows system:

**Completely Safe:**
- Windows Temp files (C:\\Windows\\Temp and %TEMP%)
- Browser cache files
- Windows Update cleanup (old update files)
- Recycle Bin contents
- Thumbnail cache
- Recent files list
- Crash dump files (.dmp)

**Moderately Safe (review first):**
- npm/yarn/pnpm cache (safe if you reinstall packages when needed)
- Docker unused images and containers
- Old Windows restore points
- Delivery Optimization files

**Review Carefully:**
- Maven/Gradle repositories (will re-download when building)
- Python virtual environments (must be recreated)
- Large files in Downloads (check if still needed)

Use the Junk Cleaner to automatically identify and safely remove these.`;

      actions.push(
        { label: 'Run Junk Cleaner', action: 'open-junk-cleaner', params: {}, riskLevel: 'safe' },
        { label: 'Run One-Click Optimize', action: 'run-optimization', params: { mode: 'safe' }, riskLevel: 'safe' }
      );
    } else if (lowerMsg.includes('cpu') || lowerMsg.includes('process') || lowerMsg.includes('high usage')) {
      response = `High CPU usage can make your system feel sluggish. Common causes:

1. **Windows Update** - Often causes high CPU while scanning/installing
2. **Antivirus Scans** - Scheduled scans can spike CPU
3. **Search Indexing** - Windows Search indexing service
4. **Browser** - Heavy web pages with lots of JavaScript
5. **Background Services** - Windows telemetry, diagnostics

**Solutions:**
- Check Process Intelligence view to see what's using CPU
- Schedule antivirus scans for when you're not working
- Consider disabling Windows Search indexing if not needed
- Close resource-heavy browser tabs
- Use the Resource Optimizer for detailed analysis`;

      actions.push(
        { label: 'Open Process Intelligence', action: 'open-process-manager', params: {}, riskLevel: 'safe' }
      );
    } else if (lowerMsg.includes('docker') || lowerMsg.includes('developer') || lowerMsg.includes('node') || lowerMsg.includes('npm')) {
      response = `Developer tools are often the biggest disk space consumers. Here's what to check:

**Docker** (can use 10-50 GB):
- Run \`docker system prune -a\` to remove unused images/containers
- Check Docker Desktop's resource usage in settings
- Unused volumes can be cleaned with \`docker volume prune\`

**Node.js** (can use 5-20 GB):
- \`npm cache clean --force\` clears the npm cache
- Check for old \`node_modules\` folders in projects you no longer work on
- Use \`npx npkill\` to find and clean old node_modules

**Python** (can use 5-15 GB):
- Clean pip cache: \`pip cache purge\`
- Remove unused virtual environments
- Clean conda packages: \`conda clean --all\`

**Maven/Gradle** (can use 5-20 GB):
- Maven: Delete old artifacts in ~/.m2/repository
- Gradle: Run \`gradle --stop\` and clean ~/.gradle/caches

Run the Developer Workstation scan for a comprehensive analysis.`;

      actions.push(
        { label: 'Scan Developer Tools', action: 'open-devtools-scanner', params: {}, riskLevel: 'safe' }
      );
    } else {
      response = `I'm your Windows Intelligence Optimizer assistant. I can help you with:

- **Storage Issues** - "Why is my C drive full?", "What can I safely delete?"
- **Performance** - "Why is my PC slow?", "What's using CPU/memory?"
- **Boot Speed** - "How do I improve boot speed?", "Which startup apps should I disable?"
- **Cleanup** - "Clean junk files", "Clear browser cache", "Remove old downloads"
- **Developer Tools** - "Clean Docker", "Remove old node_modules", "Clear npm cache"
- **System Health** - "How healthy is my PC?", "Check SSD health"

What would you like help with?`;

      actions.push(
        { label: 'Run Full Scan', action: 'run-full-scan', params: {}, riskLevel: 'safe' },
        { label: 'Check Health Score', action: 'open-health-score', params: {}, riskLevel: 'safe' }
      );
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      metadata: {
        actions,
      },
    };
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
}
