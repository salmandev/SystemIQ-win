import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // System
  system: {
    getInfo: () => ipcRenderer.invoke('system:get-info'),
    getProcesses: () => ipcRenderer.invoke('system:get-processes'),
    getRealtime: () => ipcRenderer.invoke('system:get-realtime'),
    generateReport: (config: unknown) => ipcRenderer.invoke('report:generate', config),
  },

  // Storage
  storage: {
    scan: (drive?: string) => ipcRenderer.invoke('storage:scan', drive),
    getHistory: () => ipcRenderer.invoke('storage:get-history'),
    getGrowth: () => ipcRenderer.invoke('storage:get-growth'),
    deleteFiles: (paths: string[]) => ipcRenderer.invoke('storage:delete-files', paths),
  },

  // Junk
  junk: {
    scan: () => ipcRenderer.invoke('junk:scan'),
    clean: (items: string[]) => ipcRenderer.invoke('junk:clean', items),
  },

  // Duplicates
  duplicates: {
    scan: (paths: string[]) => ipcRenderer.invoke('duplicates:scan', paths),
    clean: (files: string[]) => ipcRenderer.invoke('duplicates:clean', files),
  },

  // Startup
  startup: {
    getItems: () => ipcRenderer.invoke('startup:get-items'),
    toggle: (name: string, enabled: boolean) => ipcRenderer.invoke('startup:toggle', name, enabled),
  },

  // SSD Health
  ssd: {
    getHealth: () => ipcRenderer.invoke('ssd:get-health'),
  },

  // Health Score
  health: {
    calculate: () => ipcRenderer.invoke('health:calculate'),
  },

  // AI
  ai: {
    recommend: () => ipcRenderer.invoke('ai:recommend'),
    chat: (message: string, context?: Record<string, unknown>) =>
      ipcRenderer.invoke('ai:chat', message, context),
  },

  // Optimization
  optimize: {
    plan: (mode: string) => ipcRenderer.invoke('optimize:plan', mode),
    execute: (planId: string) => ipcRenderer.invoke('optimize:execute', planId),
  },

  // Dev Tools
  devtools: {
    scan: () => ipcRenderer.invoke('devtools:scan'),
  },

  // Automation
  automation: {
    schedule: (task: unknown) => ipcRenderer.invoke('automation:schedule', task),
    getTasks: () => ipcRenderer.invoke('automation:get-tasks'),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('automation:toggle', id, enabled),
  },

  // Settings (legacy key-value)
  settings: {
    get: (key?: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    update: (partial: unknown) => ipcRenderer.invoke('settings:update', partial),
  },

  // Performance History
  performance: {
    getHistory: (durationMs?: number) => ipcRenderer.invoke('performance:history', durationMs),
    getAverages: (durationMs?: number) => ipcRenderer.invoke('performance:averages', durationMs),
  },

  // Notifications
  notifications: {
    get: () => ipcRenderer.invoke('notifications:get'),
    dismiss: (id: string) => ipcRenderer.invoke('notifications:dismiss', id),
  },

  // VM Scanner
  vm: {
    scan: () => ipcRenderer.invoke('vm:scan'),
  },

  // Scan Status
  scan: {
    getStatus: () => ipcRenderer.invoke('scan:status'),
    trigger: (key: string) => ipcRenderer.invoke('scan:trigger', key),
  },

  // Shell
  shell: {
    open: (url: string) => ipcRenderer.invoke('shell:open', url),
  },

  // Plugins
  plugins: {
    get: () => ipcRenderer.invoke('plugins:get'),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('plugins:toggle', id, enabled),
  },

  // Intelligence
  intelligence: {
    getProfile: () => ipcRenderer.invoke('intelligence:get-profile'),
    analyzeRootCause: (query: string) => ipcRenderer.invoke('intelligence:analyze-root-cause', query),
    getTimeline: () => ipcRenderer.invoke('intelligence:get-timeline'),
    diagnosePC: () => ipcRenderer.invoke('intelligence:diagnose-pc'),
    getModeConfig: () => ipcRenderer.invoke('intelligence:get-mode-config'),
    getInstalledApps: () => ipcRenderer.invoke('intelligence:get-installed-apps'),
    scanPrivacy: () => ipcRenderer.invoke('intelligence:scan-privacy'),
    getProcessInsights: () => ipcRenderer.invoke('intelligence:get-process-insights'),
    scanDevProjects: () => ipcRenderer.invoke('intelligence:scan-dev-projects'),
    getDockerInfo: () => ipcRenderer.invoke('intelligence:get-docker-info'),
    getK8sWSLInfo: () => ipcRenderer.invoke('intelligence:get-k8s-wsl-info'),
  },

  // Data Cache
  cache: {
    get: (key: string) => ipcRenderer.invoke('cache:get', key),
    getAll: () => ipcRenderer.invoke('cache:get-all'),
    refresh: (key: string) => ipcRenderer.invoke('cache:refresh', key),
    isScanning: () => ipcRenderer.invoke('cache:is-scanning'),
  },

  // Realtime subscriptions
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
