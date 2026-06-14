import { create } from 'zustand';
import { api } from '../services/api';
import type {
  SystemInfo, ProcessInfo, StorageScanResult, JunkScanResult,
  DuplicateScanResult, StartupItem, SsdHealth, HealthScore,
  AIRecommendation, AIMessage, OptimizationPlan, DevToolsScanResult,
  ScheduledTask, Plugin, SettingsConfig, PerformanceSample,
  PerformanceAverages, NotificationEvent, VMInventory, ScanStatus,
} from '../../shared/types';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

type Page =
  | 'dashboard'
  | 'storage'
  | 'junk'
  | 'duplicates'
  | 'resources'
  | 'startup'
  | 'processes'
  | 'devtools'
  | 'ssd-health'
  | 'health-score'
  | 'ai-chat'
  | 'optimization'
  | 'automation'
  | 'plugins'
  | 'settings'
  | 'developer-center'
  | 'ai-analyzer'
  | 'timeline'
  | 'pc-doctor'
  | 'opt-modes'
  | 'app-intelligence'
  | 'security-privacy';

interface AppState {
  // Navigation
  currentPage: Page;
  setPage: (page: Page) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Loading states
  loading: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;

  // System data
  systemInfo: SystemInfo | null;
  setSystemInfo: (info: SystemInfo) => void;
  realtimeData: any;
  setRealtimeData: (data: any) => void;
  processes: ProcessInfo[];
  setProcesses: (procs: ProcessInfo[]) => void;

  // Storage
  storageScan: StorageScanResult | null;
  setStorageScan: (scan: StorageScanResult) => void;
  storageGrowth: any[];
  setStorageGrowth: (alerts: any[]) => void;

  // Junk
  junkScan: JunkScanResult | null;
  setJunkScan: (scan: JunkScanResult) => void;

  // Duplicates
  duplicateScan: DuplicateScanResult | null;
  setDuplicateScan: (scan: DuplicateScanResult) => void;

  // Startup
  startupItems: StartupItem[];
  setStartupItems: (items: StartupItem[]) => void;

  // SSD Health
  ssdHealth: SsdHealth[];
  setSsdHealth: (health: SsdHealth[]) => void;

  // Health Score
  healthScore: HealthScore | null;
  setHealthScore: (score: HealthScore) => void;

  // AI
  recommendations: AIRecommendation[];
  setRecommendations: (recs: AIRecommendation[]) => void;
  chatMessages: AIMessage[];
  addChatMessage: (msg: AIMessage) => void;
  clearChat: () => void;

  // Optimization
  optimizationPlan: OptimizationPlan | null;
  setOptimizationPlan: (plan: OptimizationPlan) => void;

  // Dev Tools
  devToolsScan: DevToolsScanResult | null;
  setDevToolsScan: (scan: DevToolsScanResult) => void;

  // Automation
  scheduledTasks: ScheduledTask[];
  setScheduledTasks: (tasks: ScheduledTask[]) => void;

  // Plugins
  plugins: Plugin[];
  setPlugins: (plugins: Plugin[]) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchOpen: boolean;
  toggleSearch: () => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Settings (typed)
  settingsConfig: SettingsConfig | null;
  setSettingsConfig: (config: SettingsConfig) => void;
  updateSettings: (partial: Partial<SettingsConfig>) => Promise<void>;

  // Performance History
  performanceHistory: PerformanceSample[];
  setPerformanceHistory: (samples: PerformanceSample[]) => void;
  performanceAverages: PerformanceAverages | null;
  setPerformanceAverages: (avg: PerformanceAverages | null) => void;

  // Notifications
  notifications: NotificationEvent[];
  setNotifications: (events: NotificationEvent[]) => void;
  dismissNotification: (id: string) => void;

  // VM Inventory
  vmInventory: VMInventory[];
  setVMInventory: (vms: VMInventory[]) => void;

  // Scan Status
  scanStatus: Record<string, { status: ScanStatus; last_run: number }>;
  setScanStatus: (status: Record<string, { status: ScanStatus; last_run: number }>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Theme
  theme: 'dark',
  toggleTheme: () => set((s) => {
    const newTheme = s.theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    return { theme: newTheme };
  }),

  // Loading
  loading: {},
  setLoading: (key, value) => set((s) => ({
    loading: { ...s.loading, [key]: value },
  })),

  // System
  systemInfo: null,
  setSystemInfo: (info) => set({ systemInfo: info }),
  realtimeData: null,
  setRealtimeData: (data) => set({ realtimeData: data }),
  processes: [],
  setProcesses: (procs) => set({ processes: procs }),

  // Storage
  storageScan: null,
  setStorageScan: (scan) => set({ storageScan: scan }),
  storageGrowth: [],
  setStorageGrowth: (alerts) => set({ storageGrowth: alerts }),

  // Junk
  junkScan: null,
  setJunkScan: (scan) => set({ junkScan: scan }),

  // Duplicates
  duplicateScan: null,
  setDuplicateScan: (scan) => set({ duplicateScan: scan }),

  // Startup
  startupItems: [],
  setStartupItems: (items) => set({ startupItems: items }),

  // SSD Health
  ssdHealth: [],
  setSsdHealth: (health) => set({ ssdHealth: health }),

  // Health Score
  healthScore: null,
  setHealthScore: (score) => set({ healthScore: score }),

  // AI
  recommendations: [],
  setRecommendations: (recs) => set({ recommendations: recs }),
  chatMessages: [],
  addChatMessage: (msg) => set((s) => ({
    chatMessages: [...s.chatMessages, msg],
  })),
  clearChat: () => set({ chatMessages: [] }),

  // Optimization
  optimizationPlan: null,
  setOptimizationPlan: (plan) => set({ optimizationPlan: plan }),

  // Dev Tools
  devToolsScan: null,
  setDevToolsScan: (scan) => set({ devToolsScan: scan }),

  // Automation
  scheduledTasks: [],
  setScheduledTasks: (tasks) => set({ scheduledTasks: tasks }),

  // Plugins
  plugins: [],
  setPlugins: (plugins) => set({ plugins }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchOpen: false,
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),

  // Toasts
  toasts: [],
  addToast: (toast) => set((s) => ({
    toasts: [...s.toasts, { ...toast, id: Date.now().toString(36) + Math.random().toString(36).slice(2) }],
  })),
  removeToast: (id) => set((s) => ({
    toasts: s.toasts.filter((t) => t.id !== id),
  })),

  // Settings
  settingsConfig: null,
  setSettingsConfig: (config) => set({ settingsConfig: config }),
  updateSettings: async (partial) => {
    await api.settings.update(partial);
    const updated = await api.settings.getAll();
    set({ settingsConfig: updated });
  },

  // Performance History
  performanceHistory: [],
  setPerformanceHistory: (samples) => set({ performanceHistory: samples }),
  performanceAverages: null,
  setPerformanceAverages: (avg) => set({ performanceAverages: avg }),

  // Notifications
  notifications: [],
  setNotifications: (events) => set({ notifications: events }),
  dismissNotification: (id) => set((s) => ({
    notifications: s.notifications.map((n) =>
      n.id === id ? { ...n, dismissed: true } : n
    ),
  })),

  // VM Inventory
  vmInventory: [],
  setVMInventory: (vms) => set({ vmInventory: vms }),

  // Scan Status
  scanStatus: {},
  setScanStatus: (status) => set({ scanStatus: status }),
}));
