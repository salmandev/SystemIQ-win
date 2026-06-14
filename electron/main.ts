import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { Database } from './services/database';
import { SystemService } from './services/system-service';
import { StorageScanner } from './services/storage-scanner';
import { JunkDetector } from './services/junk-detector';
import { DuplicateFinder } from './services/duplicate-finder';
import { StartupManager } from './services/startup-manager';
import { SsdHealthAnalyzer } from './services/ssd-health';
import { HealthCalculator } from './services/health-calculator';
import { AIEngine } from './services/ai-engine';
import { OptimizationEngine } from './services/optimization-engine';
import { DevToolsScanner } from './services/devtools-scanner';
import { AutomationEngine } from './services/automation-engine';
import { PluginManager } from './services/plugin-manager';
import { IntelligenceService } from './services/intelligence-service';
import { DataCache } from './services/data-cache';
import { SettingsManager } from './services/settings-manager';
import { ScanTracker } from './services/scan-tracker';
import { VMScanner } from './services/vm-scanner';
import { PerformanceCollector } from './services/performance-collector';
import { NotificationEvaluator } from './services/notification-evaluator';

let mainWindow: BrowserWindow | null = null;
let db: Database;
let settingsManager: SettingsManager;
let scanTracker: ScanTracker;
let systemService: SystemService;
let storageScanner: StorageScanner;
let junkDetector: JunkDetector;
let duplicateFinder: DuplicateFinder;
let startupManager: StartupManager;
let ssdAnalyzer: SsdHealthAnalyzer;
let healthCalculator: HealthCalculator;
let aiEngine: AIEngine;
let optimizationEngine: OptimizationEngine;
let devToolsScanner: DevToolsScanner;
let automationEngine: AutomationEngine;
let pluginManager: PluginManager;
let intelligenceService: IntelligenceService;
let dataCache: DataCache;
let vmScanner: VMScanner;
let performanceCollector: PerformanceCollector;
let notificationEvaluator: NotificationEvaluator;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'SystemIQ',
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#202020',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#202020',
      symbolColor: '#FFFFFF',
      height: 40,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeServices() {
  try {
    db = new Database();
    db.initialize();
  } catch (err) {
    console.warn('Database initialization failed (native module may need rebuild):', err);
    db = null as any;
  }

  // Core infrastructure services
  settingsManager = new SettingsManager(db);
  scanTracker = new ScanTracker(db);

  // Domain services
  systemService = new SystemService();
  storageScanner = new StorageScanner(db, settingsManager);
  junkDetector = new JunkDetector(settingsManager);
  duplicateFinder = new DuplicateFinder();
  startupManager = new StartupManager();
  ssdAnalyzer = new SsdHealthAnalyzer();
  healthCalculator = new HealthCalculator();
  aiEngine = new AIEngine();
  optimizationEngine = new OptimizationEngine();
  devToolsScanner = new DevToolsScanner();
  automationEngine = new AutomationEngine(db);
  pluginManager = new PluginManager();
  intelligenceService = new IntelligenceService(db);
  vmScanner = new VMScanner(db);
  performanceCollector = new PerformanceCollector(db, settingsManager);
  notificationEvaluator = new NotificationEvaluator(db, settingsManager);

  // Background data cache with settings and scan tracking
  dataCache = new DataCache(db, {
    system: systemService,
    storage: storageScanner,
    junk: junkDetector,
    duplicates: duplicateFinder,
    startup: startupManager,
    ssd: ssdAnalyzer,
    health: healthCalculator,
    ai: aiEngine,
    devtools: devToolsScanner,
    intelligence: intelligenceService,
  }, settingsManager, scanTracker);
  dataCache.loadFromDB();
}

function registerIpcHandlers() {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

  // System info
  ipcMain.handle('system:get-info', async () => {
    try { return await systemService.getSystemInfo(); } catch { return null; }
  });

  ipcMain.handle('system:get-processes', async () => {
    try { return await systemService.getProcesses(); } catch { return []; }
  });

  ipcMain.handle('system:get-realtime', async () => {
    try { return await systemService.getRealtimeStats(); } catch { return null; }
  });

  // Storage
  ipcMain.handle('storage:scan', async (_event, drive?: string) => {
    try { return await storageScanner.scan(drive); } catch { return null; }
  });

  ipcMain.handle('storage:get-history', async () => {
    try { return await storageScanner.getHistory(); } catch { return []; }
  });

  ipcMain.handle('storage:get-growth', async () => {
    try { return await storageScanner.getGrowthAlerts(); } catch { return []; }
  });

  ipcMain.handle('storage:delete-files', async (_event, paths: string[]) => {
    try { return await storageScanner.deleteFiles(paths); } catch { return { deleted: 0, freed: 0, errors: ['Failed to delete files'] }; }
  });

  // Junk
  ipcMain.handle('junk:scan', async () => {
    try { return await junkDetector.scan(); } catch { return null; }
  });

  ipcMain.handle('junk:clean', async (_event, items: string[]) => {
    try { return await junkDetector.clean(items); } catch { return { cleaned: 0, freed: 0, errors: [] }; }
  });

  // Duplicates
  ipcMain.handle('duplicates:scan', async (_event, paths: string[]) => {
    try { return await duplicateFinder.scan(paths); } catch { return null; }
  });

  ipcMain.handle('duplicates:clean', async (_event, files: string[]) => {
    try { return await duplicateFinder.clean(files); } catch { return { cleaned: 0, freed: 0, errors: [] }; }
  });

  // Startup
  ipcMain.handle('startup:get-items', async () => {
    try { return await startupManager.getItems(); } catch { return []; }
  });

  ipcMain.handle('startup:toggle', async (_event, name: string, enabled: boolean) => {
    try { return await startupManager.toggle(name, enabled); } catch { return { success: false }; }
  });

  // SSD Health
  ipcMain.handle('ssd:get-health', async () => {
    try { return await ssdAnalyzer.getHealth(); } catch { return null; }
  });

  // Health Score
  ipcMain.handle('health:calculate', async () => {
    try { return await healthCalculator.calculate(); } catch { return null; }
  });

  // AI
  ipcMain.handle('ai:recommend', async () => {
    try { return await aiEngine.getRecommendations(); } catch { return []; }
  });

  ipcMain.handle('ai:chat', async (_event, message: string, context?: Record<string, unknown>) => {
    try { return await aiEngine.chat(message, context); } catch { return null; }
  });

  // Optimization
  ipcMain.handle('optimize:plan', async (_event, mode: string) => {
    try { return await optimizationEngine.createPlan(mode); } catch { return null; }
  });

  ipcMain.handle('optimize:execute', async (_event, planId: string) => {
    try { return await optimizationEngine.execute(planId); } catch { return null; }
  });

  // Dev Tools
  ipcMain.handle('devtools:scan', async () => {
    try { return await devToolsScanner.scan(); } catch { return null; }
  });

  // Automation
  ipcMain.handle('automation:schedule', async (_event, task: unknown) => {
    try { return await automationEngine.schedule(task as any); } catch { return null; }
  });

  ipcMain.handle('automation:get-tasks', async () => {
    try { return await automationEngine.getTasks(); } catch { return []; }
  });

  ipcMain.handle('automation:toggle', async (_event, id: string, enabled: boolean) => {
    try { return await automationEngine.toggle(id, enabled); } catch { return { success: false }; }
  });

  // Reports
  ipcMain.handle('report:generate', async (_event, config: unknown) => {
    try { return await systemService.generateReport(config as any); } catch { return '{}'; }
  });

  // Settings
  ipcMain.handle('settings:get', async (_event, key?: string) => {
    try { return db?.getSettings(key) ?? {}; } catch { return {}; }
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: unknown) => {
    try { return db?.setSetting(key, value); } catch { /* no-op */ }
  });

  // Settings Manager (typed)
  ipcMain.handle('settings:get-all', async () => {
    try { return settingsManager.getAll(); } catch { return null; }
  });

  ipcMain.handle('settings:update', async (_event, partial: unknown) => {
    try { settingsManager.update(partial as any); return true; } catch { return false; }
  });

  // Performance History
  ipcMain.handle('performance:history', async (_event, durationMs: number) => {
    try { return performanceCollector.getHistory(durationMs || 3600000); } catch { return []; }
  });

  ipcMain.handle('performance:averages', async (_event, durationMs: number) => {
    try { return performanceCollector.getAverages(durationMs || 3600000); } catch { return null; }
  });

  // Notifications
  ipcMain.handle('notifications:get', async () => {
    try { return notificationEvaluator.getPending(); } catch { return []; }
  });

  ipcMain.handle('notifications:dismiss', async (_event, id: string) => {
    try { notificationEvaluator.dismiss(id); return true; } catch { return false; }
  });

  // VM Scanner
  ipcMain.handle('vm:scan', async () => {
    try { return await vmScanner.scan(); } catch { return []; }
  });

  // Scan Status
  ipcMain.handle('scan:status', async () => {
    try { return scanTracker.getStatusSummary(); } catch { return {}; }
  });

  ipcMain.handle('scan:trigger', async (_event, key: string) => {
    try { return await dataCache.refreshKey(key, mainWindow); } catch { return null; }
  });

  // Open external link
  ipcMain.handle('shell:open', async (_event, url: string) => {
    return shell.openExternal(url);
  });

  // Plugins
  ipcMain.handle('plugins:get', async () => {
    try { return await pluginManager.getPlugins(); } catch { return []; }
  });

  ipcMain.handle('plugins:toggle', async (_event, id: string, enabled: boolean) => {
    try { return await pluginManager.toggle(id, enabled); } catch { return { success: false }; }
  });

  // Intelligence
  ipcMain.handle('intelligence:get-profile', async () => {
    try { return await intelligenceService.getProfile(); } catch { return null; }
  });

  ipcMain.handle('intelligence:analyze-root-cause', async (_event, query: string) => {
    try { return await intelligenceService.analyzeRootCause(query); } catch { return null; }
  });

  ipcMain.handle('intelligence:get-timeline', async () => {
    try { return await intelligenceService.getTimeline(); } catch { return []; }
  });

  ipcMain.handle('intelligence:diagnose-pc', async () => {
    try { return await intelligenceService.diagnosePC(); } catch { return null; }
  });

  ipcMain.handle('intelligence:get-mode-config', async () => {
    try { return await intelligenceService.getModeConfig(); } catch { return []; }
  });

  ipcMain.handle('intelligence:get-installed-apps', async () => {
    try { return await intelligenceService.getInstalledApps(); } catch { return []; }
  });

  ipcMain.handle('intelligence:scan-privacy', async () => {
    try { return await intelligenceService.scanPrivacy(); } catch { return null; }
  });

  ipcMain.handle('intelligence:get-process-insights', async () => {
    try { return await intelligenceService.getProcessInsights(); } catch { return []; }
  });

  ipcMain.handle('intelligence:scan-dev-projects', async () => {
    try { return await intelligenceService.scanDevProjects(); } catch { return []; }
  });

  ipcMain.handle('intelligence:get-docker-info', async () => {
    try { return await intelligenceService.getDockerInfo(); } catch { return null; }
  });

  ipcMain.handle('intelligence:get-k8s-wsl-info', async () => {
    try { return await intelligenceService.getK8sWSLInfo(); } catch { return null; }
  });

  // Data Cache
  ipcMain.handle('cache:get', async (_event, key: string) => {
    return dataCache.get(key);
  });

  ipcMain.handle('cache:get-all', async () => {
    return dataCache.getAll();
  });

  ipcMain.handle('cache:refresh', async (_event, key: string) => {
    return await dataCache.refreshKey(key, mainWindow);
  });

  ipcMain.handle('cache:is-scanning', async () => {
    return dataCache.isScanning();
  });
}

app.whenReady().then(() => {
  initializeServices();
  createWindow();
  registerIpcHandlers();
  try { automationEngine.start(); } catch { /* db may be unavailable */ }
  // Start background data caching (initial scan after 3s + hourly)
  dataCache.start(mainWindow);
  // Start performance metrics collection
  performanceCollector.start();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try { automationEngine.stop(); } catch { /* no-op */ }
    try { dataCache.stop(); } catch { /* no-op */ }
    try { performanceCollector.stop(); } catch { /* no-op */ }
    try { db?.close(); } catch { /* no-op */ }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
