// ============================================================
// SystemIQ API Layer
// Provides a unified API that works in both Electron and browser
// Falls back to mock data when Electron IPC returns null
// ============================================================

import {
  formatSize, formatDuration, formatTimeAgo,
  getScoreColor, getScoreLabel, getUsageColor,
  CATEGORY_COLORS,
} from './utils';

import type {
  SettingsConfig, PerformanceSample, PerformanceAverages,
  NotificationEvent, VMInventory, ScanStatus,
} from '../../shared/types';

import {
  generateMockProcesses, generateMockStorageScan, generateMockJunkScan,
  generateMockDuplicateScan, generateMockStartupItems, generateMockSsdHealth,
  generateMockHealthScore, generateMockRecommendations, generateMockMachineProfile,
  generateMockRootCause, generateMockTimeline, generateMockPCDiagnosis,
  generateMockModeConfigs, generateMockInstalledApps, generateMockPrivacyScan,
  generateMockProcessInsights, generateMockDevProjects, generateMockDockerInfo,
  generateMockK8sWSLInfo,
} from './mock-data';

// Re-export utilities for backward compatibility
export { formatSize, formatDuration, formatTimeAgo, getScoreColor, getScoreLabel, getUsageColor, CATEGORY_COLORS };

// Electron API proxy - works both in Electron and browser
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

function createMockApi() {
  return {
    window: {
      minimize: async () => {},
      maximize: async () => {},
      close: async () => {},
      isMaximized: async () => false,
    },
    system: {
      getInfo: async () => ({
        hostname: 'DESKTOP-WIO',
        platform: 'Windows',
        arch: 'x64',
        os: 'Windows 11 Pro 10.0.22631',
        osVersion: '10.0.22631',
        uptime: 345600,
        cpu: { manufacturer: 'Intel', brand: 'Core i9-13900K', cores: 24, physicalCores: 16, speed: 3.0, currentLoad: 32, loads: Array(24).fill(0).map(() => Math.random() * 60), temperature: 58 },
        memory: { total: 34359738368, used: 19327352832, free: 15032385536, usedPercent: 56.2, swapTotal: 8589934592, swapUsed: 1073741824, swapFree: 7516192768 },
        disks: [
          { drive: 'C', label: 'Windows', fsType: 'NTFS', total: 1000204886016, used: 756153664512, free: 244051221504, usedPercent: 75.6, mount: 'C:', type: 'ssd' },
          { drive: 'D', label: 'Data', fsType: 'NTFS', total: 2000398934016, used: 1200239360410, free: 800159573606, usedPercent: 60, mount: 'D:', type: 'ssd' },
        ],
        gpus: [{ name: 'NVIDIA GeForce RTX 4090', vendor: 'NVIDIA', memoryTotal: 25769803776, memoryUsed: 8589934592, utilization: 15, temperature: 45 }],
        network: { interfaces: [{ name: 'Ethernet', type: 'wired', ip4: '192.168.1.100', mac: 'AA:BB:CC:DD:EE:FF', speed: 1000, rxBytes: 107374182400, txBytes: 53687091200 }], downloadSpeed: 5242880, uploadSpeed: 2621440 },
        battery: { hasBattery: false, percent: 0, isCharging: false, acConnected: true, healthPercent: 100, timeRemaining: 0, cycleCount: 0 },
      }),
      getProcesses: async () => generateMockProcesses(),
      getRealtime: async () => ({
        cpu: { load: 25 + Math.random() * 30, loads: Array(24).fill(0).map(() => Math.random() * 60) },
        memory: { total: 34359738368, used: 19327352832 + Math.random() * 2147483648, free: 15032385536, usedPercent: 52 + Math.random() * 15 },
        disks: [
          { drive: 'C:', used: 756153664512, total: 1000204886016, usedPercent: 75.6 },
          { drive: 'D:', used: 1200239360410, total: 2000398934016, usedPercent: 60 },
        ],
        network: { downloadSpeed: Math.random() * 10485760, uploadSpeed: Math.random() * 5242880, totalDownload: 107374182400, totalUpload: 53687091200 },
        topCpu: [{ name: 'chrome.exe', pid: 1234, cpu: 12, mem: 524288000 }, { name: 'Code.exe', pid: 2345, cpu: 8, mem: 838860800 }, { name: 'docker.exe', pid: 3456, cpu: 6, mem: 1073741824 }],
        topMem: [{ name: 'chrome.exe', pid: 1234, cpu: 12, mem: 3221225472 }, { name: 'docker.exe', pid: 3456, cpu: 6, mem: 2147483648 }, { name: 'Code.exe', pid: 2345, cpu: 8, mem: 1610612736 }],
      }),
      generateReport: async () => '{"status": "generated"}',
    },
    storage: {
      scan: async () => generateMockStorageScan(),
      getHistory: async () => [],
      getGrowth: async () => [
        { path: 'C:\\Users\\User\\Downloads', previousSize: 10737418240, currentSize: 29527900160, growthBytes: 18790481920, growthPercent: 175, periodDays: 3, severity: 'critical', message: 'Downloads folder increased by 17.5 GB in 3 days' },
        { path: 'C:\\Users\\User\\AppData\\Local\\Docker', previousSize: 21474836480, currentSize: 28991029248, growthBytes: 7516192768, growthPercent: 35, periodDays: 7, severity: 'warning', message: 'Docker data grew by 7 GB in 1 week' },
      ],
      deleteFiles: async (paths: string[]) => ({ deleted: paths.length, freed: paths.length * 1073741824, errors: [] }),
    },
    junk: {
      scan: async () => generateMockJunkScan(),
      clean: async () => ({ cleaned: 150, freed: 5368709120, errors: [] }),
    },
    duplicates: {
      scan: async () => generateMockDuplicateScan(),
      clean: async () => ({ cleaned: 25, freed: 2147483648, errors: [] }),
    },
    startup: {
      getItems: async () => generateMockStartupItems(),
      toggle: async () => ({ success: true }),
    },
    ssd: {
      getHealth: async () => generateMockSsdHealth(),
    },
    health: {
      calculate: async () => generateMockHealthScore(),
    },
    ai: {
      recommend: async () => generateMockRecommendations(),
      chat: async (message: string) => {
        await new Promise(r => setTimeout(r, 500));
        const lowerMsg = message.toLowerCase();
        let content = '';
        if (lowerMsg.includes('drive') || lowerMsg.includes('full') || lowerMsg.includes('space')) {
          content = "Based on my analysis of your system, your C: drive is at 75.6% capacity. The biggest consumers are:\n\n1. **AppData folder** (42 GB) - Chrome cache (12 GB), npm cache (8 GB), Docker images (14 GB)\n2. **Windows folder** (28 GB) - WinSxS, update cache\n3. **Program Files** (35 GB) - Installed applications\n\nI recommend running the Junk Cleaner first - it can safely recover approximately **18.5 GB**. After that, review the Developer Tools section for Docker and npm cleanup.";
        } else if (lowerMsg.includes('memory') || lowerMsg.includes('ram') || lowerMsg.includes('slow')) {
          content = "Your system is using 56.2% of RAM (18 GB out of 32 GB). Top memory consumers:\n\n1. **Chrome** - 3 GB (likely 15+ tabs open)\n2. **Docker Desktop** - 2 GB (3 containers running)\n3. **VS Code** - 1.5 GB (multiple extensions)\n4. **Teams** - 800 MB\n\n**Quick wins:**\n- Close unused Chrome tabs (saves ~1 GB per 5 tabs)\n- Stop unused Docker containers\n- Consider disabling VS Code extensions you don't use daily";
        } else if (lowerMsg.includes('boot') || lowerMsg.includes('startup')) {
          content = "Your system has 12 startup items that collectively add approximately **23 seconds** to boot time:\n\n- **Docker Desktop** - 12s impact (disable if not needed daily)\n- **Spotify** - 7s impact (safe to disable)\n- **Discord** - 5s impact (safe to disable)\n- **OneDrive** - 4s impact (keep if you use sync)\n\nDisabling the top 3 alone would save approximately **24 seconds** on every boot.";
        } else {
          content = "I'm your Windows Intelligence Optimizer assistant. I can help with:\n\n- **Storage issues** - \"Why is my C drive full?\"\n- **Performance** - \"Why is memory/CPU high?\"\n- **Boot speed** - \"How to improve startup?\"\n- **Cleanup** - \"What can I safely delete?\"\n- **Developer tools** - \"Clean Docker/npm caches\"\n\nTry asking me a specific question about your system!";
        }
        return { id: `msg-${Date.now()}`, role: 'assistant', content, timestamp: Date.now(), metadata: { actions: [{ label: 'Run Quick Scan', action: 'scan', params: {}, riskLevel: 'safe' }] } };
      },
    },
    optimize: {
      plan: async (mode: string) => ({
        id: 'plan-1', name: `${mode} Optimization`, mode,
        actions: [
          { id: 'a1', name: 'Clear Temp Files', description: 'Remove Windows temp files', category: 'windows', estimatedSavings: 2147483648, riskLevel: 'safe', selected: true, requiresAdmin: false },
          { id: 'a2', name: 'Clear Browser Cache', description: 'Remove browser caches', category: 'browsers', estimatedSavings: 5368709120, riskLevel: 'safe', selected: true, requiresAdmin: false },
          { id: 'a3', name: 'Clear npm Cache', description: 'Remove npm package cache', category: 'development', estimatedSavings: 8589934592, riskLevel: 'safe', selected: mode !== 'safe', requiresAdmin: false },
          { id: 'a4', name: 'Clear Docker Images', description: 'Remove unused Docker images', category: 'development', estimatedSavings: 16106127360, riskLevel: 'aggressive', selected: false, requiresAdmin: false },
        ],
        estimatedBefore: 0, estimatedAfter: 16106127360, estimatedSavings: 16106127360,
      }),
      execute: async () => ({ planId: 'plan-1', timestamp: Date.now(), actionsExecuted: 3, actionsFailed: 0, spaceRecovered: 12884901888, duration: 45000, details: [] }),
    },
    devtools: {
      scan: async () => ({
        scanId: 'dev-1', timestamp: Date.now(), totalRecoverable: 32212254720,
        tools: [
          { name: 'Docker', icon: '🐳', installed: true, version: 'Docker 24.0.7', size: 26843545600, recoverable: 16106127360, items: [{ name: '8 Dangling Images', path: 'docker', size: 8589934592, description: 'Unused images', safeToDelete: true }, { name: '12 Stopped Containers', path: 'docker', size: 3221225472, description: 'Exited containers', safeToDelete: true }, { name: '5 Unused Volumes', path: 'docker', size: 4294967296, description: 'Orphan volumes', safeToDelete: true }], recommendations: ['Run docker system prune -a to recover 15 GB'] },
          { name: 'Node.js / npm', icon: '🟢', installed: true, version: 'v20.11.0', size: 12884901888, recoverable: 8589934592, items: [{ name: 'npm Cache', path: 'npm-cache', size: 8589934592, description: 'Package cache', safeToDelete: true }, { name: '23 node_modules', path: 'various', size: 4294967296, description: 'Dependency folders', safeToDelete: false }], recommendations: ['Run npm cache clean --force', 'Use npx npkill for old node_modules'] },
          { name: 'Python', icon: '🐍', installed: true, version: 'Python 3.11.5', size: 4294967296, recoverable: 2147483648, items: [{ name: 'pip Cache', path: 'pip cache', size: 1073741824, description: 'Package cache', safeToDelete: true }, { name: '3 Virtual Envs', path: 'venvs', size: 1073741824, description: 'Python environments', safeToDelete: false }], recommendations: ['Run pip cache purge'] },
          { name: 'Java / Maven / Gradle', icon: '☕', installed: true, version: 'OpenJDK 21', size: 16106127360, recoverable: 5368709120, items: [{ name: 'Maven Repository', path: '.m2/repository', size: 10737418240, description: 'Artifact cache', safeToDelete: false }, { name: 'Gradle Cache', path: '.gradle/caches', size: 5368709120, description: 'Build cache', safeToDelete: true }], recommendations: ['Delete old Maven artifacts', 'Clean Gradle caches'] },
        ],
      }),
    },
    automation: {
      schedule: async (task: any) => ({ ...task, id: `task-${Date.now()}` }),
      getTasks: async () => [
        { id: 't1', name: 'Weekly Disk Cleanup', type: 'cleanup', schedule: 'weekly', enabled: true, lastRun: Date.now() - 86400000 * 3, nextRun: Date.now() + 86400000 * 4, config: { mode: 'safe' } },
        { id: 't2', name: 'Monthly Storage Scan', type: 'scan', schedule: 'monthly', enabled: true, lastRun: Date.now() - 86400000 * 15, nextRun: Date.now() + 86400000 * 15, config: {} },
        { id: 't3', name: 'Startup Audit', type: 'audit', schedule: 'weekly', enabled: false, config: {} },
      ],
      toggle: async () => {},
    },
    settings: {
      get: async () => ({ developerMode: true, autoScan: false }),
      set: async () => {},
      getAll: async (): Promise<SettingsConfig> => ({
        feature_flags: {
          first_scan_enabled: true, background_monitoring: true, storage_scanner: true,
          docker_monitoring: true, wsl_monitoring: true, vm_scanning: true,
          ai_assistant: true, developer_scanning: true, junk_detection: true, duplicate_detection: true,
        },
        scan_preferences: {
          scan_depth: 'normal', scan_intensity: 'balanced', schedule_interval: '1hr',
          max_scan_time: 60, include_drives: ['C:', 'D:'], ignore_folders: ['Windows', '$Recycle.Bin'],
          large_file_threshold: 52428800, hash_method: 'balanced', incremental_scanning: true,
        },
        notification_rules: {
          disk_warning_threshold: 80, disk_critical_threshold: 90, memory_threshold: 85,
          docker_size_alert: 21474836480, docker_growth_alert: 5368709120,
          startup_app_added: true, new_large_file: true,
        },
        optimization_rules: {
          auto_clean_safe: false, confirm_moderate: true, confirm_aggressive: true,
          rollback_enabled: true, data_retention_days: 90,
        },
        user_preferences: {
          theme: 'dark', language: 'en', animations: true,
          start_with_windows: false, run_background: true, start_minimized: false,
        },
      }),
      update: async () => true,
    },
    performance: {
      getHistory: async (_durationMs?: number): Promise<PerformanceSample[]> => {
        const now = Date.now();
        return Array.from({ length: 60 }, (_, i) => ({
          timestamp: now - (60 - i) * 60000,
          cpu_load: 20 + Math.random() * 40,
          mem_used: 17179869184 + Math.random() * 4294967296,
          mem_total: 34359738368,
          disk_read: Math.random() * 104857600,
          disk_write: Math.random() * 52428800,
          net_rx: Math.random() * 10485760,
          net_tx: Math.random() * 5242880,
        }));
      },
      getAverages: async (_durationMs?: number): Promise<PerformanceAverages> => ({
        period: '1h', cpu_avg: 35, cpu_max: 78, mem_avg: 19327352832, mem_max: 23622320128,
        disk_read_avg: 52428800, disk_write_avg: 26214400, net_rx_avg: 5242880, net_tx_avg: 2621440,
        sample_count: 720,
      }),
    },
    notifications: {
      get: async (): Promise<NotificationEvent[]> => [
        {
          id: 'n1', type: 'disk', title: 'Disk Usage Warning',
          message: 'C: drive is at 75.6% capacity', severity: 'warning',
          timestamp: Date.now() - 300000, dismissed: false,
          action: { label: 'Run Cleanup', handler: 'optimize', params: { mode: 'safe' } },
        },
      ],
      dismiss: async () => true,
    },
    vm: {
      scan: async (): Promise<VMInventory[]> => [
        {
          id: 'vm-1', name: 'Ubuntu 22.04', type: 'hyperv', state: 'stopped',
          memory: 4294967296, cpus: 4, disks: [{ path: 'C:\\VMs\\ubuntu.vhdx', size: 32212254720, type: 'vhdx' }],
          snapshots: [], total_size: 32212254720, last_used: Date.now() - 86400000 * 3, path: 'C:\\VMs',
        },
      ],
    },
    scan: {
      getStatus: async (): Promise<Record<string, { status: ScanStatus; last_run: number }>> => ({
        'system-info': { status: 'completed', last_run: Date.now() - 300000 },
        storage: { status: 'completed', last_run: Date.now() - 3600000 },
        docker: { status: 'idle', last_run: Date.now() - 21600000 },
        wsl: { status: 'idle', last_run: Date.now() - 21600000 },
        vm: { status: 'idle', last_run: 0 },
      }),
      trigger: async () => null,
    },
    shell: { open: async () => {} },
    plugins: {
      get: async () => [
        { id: 'storage-analyzer', name: 'Storage Analyzer', version: '1.0.0', description: 'Deep storage analysis', author: 'WIO', enabled: true, icon: '📊', capabilities: [], settings: {} },
        { id: 'junk-cleaner', name: 'Junk Cleaner', version: '1.0.0', description: 'Clean junk files', author: 'WIO', enabled: true, icon: '🧹', capabilities: [], settings: {} },
        { id: 'ai-assistant', name: 'AI Assistant', version: '1.0.0', description: 'AI-powered optimization', author: 'WIO', enabled: true, icon: '🤖', capabilities: [], settings: {} },
      ],
      toggle: async () => {},
    },
    on: () => {},
    off: () => {},
    cache: {
      get: async () => null,
      getAll: async () => ({}),
      refresh: async () => null,
      isScanning: async () => false,
    },
    intelligence: {
      getProfile: async () => generateMockMachineProfile(),
      analyzeRootCause: async (query: string) => generateMockRootCause(query),
      getTimeline: async () => generateMockTimeline(),
      diagnosePC: async () => generateMockPCDiagnosis(),
      getModeConfig: async () => generateMockModeConfigs(),
      getInstalledApps: async () => generateMockInstalledApps(),
      scanPrivacy: async () => generateMockPrivacyScan(),
      getProcessInsights: async () => generateMockProcessInsights(),
      scanDevProjects: async () => generateMockDevProjects(),
      getDockerInfo: async () => generateMockDockerInfo(),
      getK8sWSLInfo: async () => generateMockK8sWSLInfo(),
    },
  };
}

const mockApi = createMockApi();

function createFallbackApi() {
  if (!isElectron) return mockApi;
  const electronApi = (window as any).electronAPI;
  // Wrap each service group to fall back to mock when Electron returns null
  const wrap = (electron: any, mock: any) => {
    const wrapped: any = {};
    for (const key of Object.keys(mock)) {
      if (typeof mock[key] === 'function') {
        wrapped[key] = async (...args: any[]) => {
          try {
            const result = await electron[key](...args);
            return result != null ? result : await mock[key](...args);
          } catch {
            return await mock[key](...args);
          }
        };
      } else {
        wrapped[key] = mock[key];
      }
    }
    return wrapped;
  };
  return {
    window: electronApi.window,
    system: wrap(electronApi.system, mockApi.system),
    storage: wrap(electronApi.storage, mockApi.storage),
    junk: wrap(electronApi.junk, mockApi.junk),
    duplicates: wrap(electronApi.duplicates, mockApi.duplicates),
    startup: wrap(electronApi.startup, mockApi.startup),
    ssd: wrap(electronApi.ssd, mockApi.ssd),
    health: wrap(electronApi.health, mockApi.health),
    ai: wrap(electronApi.ai, mockApi.ai),
    optimize: wrap(electronApi.optimize, mockApi.optimize),
    devtools: wrap(electronApi.devtools, mockApi.devtools),
    automation: wrap(electronApi.automation, mockApi.automation),
    settings: wrap(electronApi.settings, mockApi.settings),
    performance: wrap(electronApi.performance ?? {}, mockApi.performance),
    notifications: wrap(electronApi.notifications ?? {}, mockApi.notifications),
    vm: wrap(electronApi.vm ?? {}, mockApi.vm),
    scan: wrap(electronApi.scan ?? {}, mockApi.scan),
    shell: electronApi.shell,
    plugins: wrap(electronApi.plugins, mockApi.plugins),
    intelligence: wrap(electronApi.intelligence ?? {}, mockApi.intelligence),
    cache: electronApi.cache ?? mockApi.cache,
    on: electronApi.on?.bind(electronApi) ?? (() => {}),
    off: electronApi.off?.bind(electronApi) ?? (() => {}),
  };
}

export const api = createFallbackApi();
