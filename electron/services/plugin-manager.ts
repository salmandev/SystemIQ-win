import type { Plugin } from '../../shared/types';

export class PluginManager {
  private plugins: Plugin[] = [];

  constructor() {
    this.initializeBuiltInPlugins();
  }

  private initializeBuiltInPlugins() {
    this.plugins = [
      {
        id: 'storage-analyzer',
        name: 'Storage Analyzer',
        version: '1.0.0',
        description: 'Deep storage analysis with treemap visualization and growth tracking',
        author: 'WIO Team',
        enabled: true,
        icon: '📊',
        capabilities: [
          { type: 'analyzer', name: 'Storage Scan', handler: 'storage:scan' },
        ],
        settings: {},
      },
      {
        id: 'junk-cleaner',
        name: 'Junk Cleaner',
        version: '1.0.0',
        description: 'Detect and clean junk files from Windows, browsers, and developer tools',
        author: 'WIO Team',
        enabled: true,
        icon: '🧹',
        capabilities: [
          { type: 'cleaner', name: 'Junk Detection', handler: 'junk:scan' },
          { type: 'cleaner', name: 'Junk Cleanup', handler: 'junk:clean' },
        ],
        settings: {},
      },
      {
        id: 'duplicate-finder',
        name: 'Duplicate Finder',
        version: '1.0.0',
        description: 'Find and remove duplicate files using hash comparison',
        author: 'WIO Team',
        enabled: true,
        icon: '🔍',
        capabilities: [
          { type: 'analyzer', name: 'Duplicate Scan', handler: 'duplicates:scan' },
        ],
        settings: {},
      },
      {
        id: 'resource-optimizer',
        name: 'Resource Optimizer',
        version: '1.0.0',
        description: 'CPU, memory, and process optimization with AI insights',
        author: 'WIO Team',
        enabled: true,
        icon: '⚡',
        capabilities: [
          { type: 'monitor', name: 'Resource Monitor', handler: 'system:get-realtime' },
        ],
        settings: {},
      },
      {
        id: 'startup-optimizer',
        name: 'Startup Optimizer',
        version: '1.0.0',
        description: 'Manage startup applications to improve boot time',
        author: 'WIO Team',
        enabled: true,
        icon: '🚀',
        capabilities: [
          { type: 'analyzer', name: 'Startup Analysis', handler: 'startup:get-items' },
        ],
        settings: {},
      },
      {
        id: 'ssd-health',
        name: 'SSD Health Analyzer',
        version: '1.0.0',
        description: 'Monitor SSD health, SMART data, and drive temperature',
        author: 'WIO Team',
        enabled: true,
        icon: '💾',
        capabilities: [
          { type: 'monitor', name: 'SSD Health', handler: 'ssd:get-health' },
        ],
        settings: {},
      },
      {
        id: 'ai-assistant',
        name: 'AI Assistant',
        version: '1.0.0',
        description: 'AI-powered optimization assistant and chat',
        author: 'WIO Team',
        enabled: true,
        icon: '🤖',
        capabilities: [
          { type: 'analyzer', name: 'AI Recommendations', handler: 'ai:recommend' },
          { type: 'analyzer', name: 'AI Chat', handler: 'ai:chat' },
        ],
        settings: {},
      },
      {
        id: 'devtools-scanner',
        name: 'Developer Tools Scanner',
        version: '1.0.0',
        description: 'Scan and clean developer tool caches (Docker, npm, Python, Java)',
        author: 'WIO Team',
        enabled: true,
        icon: '🛠️',
        capabilities: [
          { type: 'analyzer', name: 'Dev Tools Scan', handler: 'devtools:scan' },
        ],
        settings: {},
      },
      {
        id: 'automation',
        name: 'Automation Engine',
        version: '1.0.0',
        description: 'Schedule automated cleanup, scans, and optimization tasks',
        author: 'WIO Team',
        enabled: true,
        icon: '⏰',
        capabilities: [
          { type: 'monitor', name: 'Task Scheduler', handler: 'automation:schedule' },
        ],
        settings: {},
      },
      {
        id: 'enterprise-reports',
        name: 'Enterprise Reports',
        version: '1.0.0',
        description: 'Generate PDF, Excel, and CSV reports for IT teams',
        author: 'WIO Team',
        enabled: true,
        icon: '📄',
        capabilities: [
          { type: 'reporter', name: 'Report Generator', handler: 'report:generate' },
        ],
        settings: {},
      },
    ];
  }

  getPlugins(): Plugin[] {
    return this.plugins;
  }

  toggle(id: string, enabled: boolean): Plugin | undefined {
    const plugin = this.plugins.find(p => p.id === id);
    if (plugin) {
      plugin.enabled = enabled;
    }
    return plugin;
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.find(p => p.id === id);
  }

  getEnabledPlugins(): Plugin[] {
    return this.plugins.filter(p => p.enabled);
  }
}
