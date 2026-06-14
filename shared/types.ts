// ============================================================
// SystemIQ - Shared Type Definitions
// ============================================================

// ---- System & Resource Types ----
export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  os: string;
  osVersion: string;
  uptime: number;
  cpu: CpuInfo;
  memory: MemoryInfo;
  disks: DiskInfo[];
  gpus: GpuInfo[];
  network: NetworkInfo;
  battery?: BatteryInfo;
}

export interface CpuInfo {
  manufacturer: string;
  brand: string;
  cores: number;
  physicalCores: number;
  speed: number;
  currentLoad: number;
  loads: number[];
  temperature?: number;
}

export interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  usedPercent: number;
  swapTotal: number;
  swapUsed: number;
  swapFree: number;
}

export interface DiskInfo {
  drive: string;
  label: string;
  fsType: string;
  total: number;
  used: number;
  free: number;
  usedPercent: number;
  mount: string;
  type: string;
}

export interface GpuInfo {
  name: string;
  vendor: string;
  memoryTotal: number;
  memoryUsed: number;
  utilization: number;
  temperature: number;
}

export interface NetworkInfo {
  interfaces: NetworkInterface[];
  downloadSpeed: number;
  uploadSpeed: number;
}

export interface NetworkInterface {
  name: string;
  type: string;
  ip4: string;
  mac: string;
  speed: number;
  rxBytes: number;
  txBytes: number;
}

export interface BatteryInfo {
  hasBattery: boolean;
  percent: number;
  isCharging: boolean;
  acConnected: boolean;
  healthPercent: number;
  timeRemaining: number;
  cycleCount: number;
  temperature?: number;
}

// ---- Process Types ----
export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  cpu: number;
  memory: number;
  memoryPercent: number;
  diskRead: number;
  diskWrite: number;
  networkRx: number;
  networkTx: number;
  gpu?: number;
  status: string;
  started: string;
  user: string;
  priority: number;
  aiInsight?: string;
}

// ---- Storage Types ----
export interface StorageScanResult {
  scanId: string;
  timestamp: number;
  drives: DriveScan[];
  totalSize: number;
  totalUsed: number;
  largestFiles: FileInfo[];
  largestFolders: FolderInfo[];
  duration: number;
}

export interface DriveScan {
  drive: string;
  label: string;
  totalSize: number;
  usedSpace: number;
  freeSpace: number;
  rootFolders: FolderNode[];
}

export interface FolderNode {
  name: string;
  path: string;
  size: number;
  fileCount: number;
  folderCount: number;
  children: FolderNode[];
  lastModified: number;
  category?: StorageCategory;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  lastAccessed: number;
  lastModified: number;
  created: number;
  hash?: string;
}

export interface FolderInfo {
  name: string;
  path: string;
  size: number;
  fileCount: number;
  folderCount: number;
  lastModified: number;
  growthPercent?: number;
  previousSize?: number;
}

export type StorageCategory =
  | 'windows'
  | 'applications'
  | 'media'
  | 'documents'
  | 'archives'
  | 'development'
  | 'games'
  | 'system'
  | 'cache'
  | 'temp'
  | 'other';

// ---- Storage Growth ----
export interface StorageGrowthRecord {
  scanId: string;
  timestamp: number;
  path: string;
  size: number;
}

export interface StorageGrowthAlert {
  path: string;
  previousSize: number;
  currentSize: number;
  growthBytes: number;
  growthPercent: number;
  periodDays: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

// ---- Junk Detection Types ----
export interface JunkScanResult {
  scanId: string;
  timestamp: number;
  totalRecoverable: number;
  categories: JunkCategory[];
  duration: number;
}

export interface JunkCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  size: number;
  itemCount: number;
  items: JunkItem[];
  riskLevel: 'safe' | 'moderate' | 'aggressive';
  recommended: boolean;
}

export interface JunkItem {
  path: string;
  name: string;
  size: number;
  lastModified: number;
  safe: boolean;
  description: string;
}

// ---- Duplicate Detection ----
export interface DuplicateScanResult {
  scanId: string;
  timestamp: number;
  totalWasted: number;
  groups: DuplicateGroup[];
  duration: number;
}

export interface DuplicateGroup {
  id: string;
  hash: string;
  size: number;
  files: DuplicateFile[];
  suggestedKeep: string;
  savingsIfCleaned: number;
}

export interface DuplicateFile {
  path: string;
  name: string;
  size: number;
  lastModified: number;
  lastAccessed: number;
  drive: string;
}

// ---- Startup Types ----
export interface StartupItem {
  name: string;
  publisher: string;
  command: string;
  location: string;
  enabled: boolean;
  impactScore: number;
  bootTimeImpact: number;
  memoryUsage: number;
  cpuUsage: number;
  aiRecommendation: string;
  category: 'application' | 'service' | 'scheduled-task';
}

// ---- SSD Health ----
export interface SsdHealth {
  drive: string;
  model: string;
  serial: string;
  firmware: string;
  capacity: number;
  temperature: number;
  powerOnHours: number;
  totalBytesWritten: number;
  wearLevel: number;
  remainingLife: number;
  smartAttributes: SmartAttribute[];
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface SmartAttribute {
  id: string;
  name: string;
  value: number;
  worst: number;
  threshold: number;
  raw: number;
  status: 'ok' | 'warning' | 'critical';
}

// ---- Health Score ----
export interface HealthScore {
  overall: number;
  storage: ScoreDetail;
  memory: ScoreDetail;
  cpu: ScoreDetail;
  startup: ScoreDetail;
  security: ScoreDetail;
  trend: ScoreTrend[];
}

export interface ScoreDetail {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  issues: ScoreIssue[];
  improvements: ImprovementAction[];
}

export interface ScoreIssue {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  impact: number;
}

export interface ImprovementAction {
  title: string;
  description: string;
  estimatedBenefit: string;
  riskLevel: 'safe' | 'moderate' | 'aggressive';
  category: string;
}

export interface ScoreTrend {
  timestamp: number;
  score: number;
}

// ---- AI Types ----
export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  explanation: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings?: number;
  riskLevel: 'safe' | 'moderate' | 'aggressive';
  action?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    relatedItems?: string[];
    actions?: ActionItem[];
  };
}

export interface ActionItem {
  label: string;
  action: string;
  params: Record<string, unknown>;
  riskLevel: 'safe' | 'moderate' | 'aggressive';
}

// ---- Automation Types ----
export interface ScheduledTask {
  id: string;
  name: string;
  type: 'cleanup' | 'optimization' | 'scan' | 'audit';
  schedule: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  config: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  enabled: boolean;
  lastTriggered?: number;
  actions: AlertAction[];
}

export interface AlertCondition {
  metric: 'disk' | 'memory' | 'cpu' | 'folder-growth' | 'file-size';
  operator: '>' | '<' | '>=' | '<=' | 'changed';
  threshold: number;
  path?: string;
}

export interface AlertAction {
  type: 'notification' | 'cleanup' | 'log';
  config: Record<string, unknown>;
}

// ---- Optimization Types ----
export interface OptimizationPlan {
  id: string;
  name: string;
  mode: 'safe' | 'aggressive' | 'custom';
  actions: OptimizationAction[];
  estimatedBefore: number;
  estimatedAfter: number;
  estimatedSavings: number;
}

export interface OptimizationAction {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedSavings: number;
  riskLevel: 'safe' | 'moderate' | 'aggressive';
  selected: boolean;
  requiresAdmin: boolean;
}

export interface OptimizationResult {
  planId: string;
  timestamp: number;
  actionsExecuted: number;
  actionsFailed: number;
  spaceRecovered: number;
  duration: number;
  details: ActionResult[];
}

export interface ActionResult {
  actionId: string;
  status: 'success' | 'failed' | 'skipped';
  spaceRecovered: number;
  error?: string;
}

// ---- Developer Workstation Types ----
export interface DevToolsScanResult {
  scanId: string;
  timestamp: number;
  totalRecoverable: number;
  tools: DevToolReport[];
}

export interface DevToolReport {
  name: string;
  icon: string;
  installed: boolean;
  version?: string;
  size: number;
  recoverable: number;
  items: DevToolItem[];
  recommendations: string[];
}

export interface DevToolItem {
  name: string;
  path: string;
  size: number;
  description: string;
  safeToDelete: boolean;
}

// ---- Plugin Types ----
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  icon: string;
  capabilities: PluginCapability[];
  settings: Record<string, unknown>;
}

export interface PluginCapability {
  type: 'analyzer' | 'cleaner' | 'monitor' | 'reporter';
  name: string;
  handler: string;
}

// ---- Enterprise Types ----
export interface MachineInfo {
  id: string;
  hostname: string;
  ip: string;
  lastSeen: number;
  healthScore: number;
  alerts: number;
  os: string;
}

export interface ReportConfig {
  type: 'pdf' | 'excel' | 'csv';
  includeScans: boolean;
  includeHealth: boolean;
  includeRecommendations: boolean;
  includeStorage: boolean;
  dateRange?: { from: number; to: number };
}

// ---- Machine Intelligence Profile (Feature #1) ----
export interface MachineProfile {
  device: string;
  usagePattern: string;
  detectedRoles: string[];
  optimizationProfile: string;
  recommendedActions: string[];
  personality: {
    label: string;
    breakdown: { category: string; size: number; color: string }[];
  };
}

// ---- Developer Center Types (Feature #2) ----
export interface DevProject {
  id: string;
  name: string;
  path: string;
  type: 'java' | 'node' | 'angular' | 'react' | 'next' | 'vite' | 'vue' | 'docker' | 'kubernetes' | 'wsl';
  technology: string;
  version?: string;
  dependencies: number;
  size: number;
  largestConsumers: { name: string; size: number }[];
  configFiles: string[];
  lastModified: number;
}

export interface DockerIntelligence {
  images: { count: number; size: number; items: { name: string; tag: string; size: number; created: number; dangling: boolean }[] };
  containers: { count: number; size: number; items: { name: string; image: string; status: string; size: number; ports: string }[] };
  volumes: { count: number; size: number; items: { name: string; size: number; driver: string; inUse: boolean }[] };
  buildCache: { size: number; count: number };
  totalSize: number;
}

export interface KubernetesWSLInfo {
  wsl: { enabled: boolean; distros: { name: string; size: number; version: string }[]; configPath?: string };
  kubernetes: {
    minikube?: { installed: boolean; size: number; clusters: number };
    dockerDesktop?: { enabled: boolean; size: number };
    kind?: { installed: boolean; clusters: number };
    k3d?: { installed: boolean; clusters: number };
    kubeConfig?: string;
  };
  totalSize: number;
}

// ---- AI Root Cause Analysis Types (Feature #3) ----
export interface RootCauseAnalysis {
  query: string;
  causes: {
    description: string;
    path: string;
    sizeChange: number;
    percentOfTotal: number;
    severity: 'info' | 'warning' | 'critical';
  }[];
  totalRecoverable: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// ---- Storage Timeline Types (Feature #4) ----
export interface StorageTimelineEntry {
  date: string;
  driveFree: number;
  driveTotal: number;
  changes: {
    category: string;
    change: number;
    icon: string;
  }[];
}

// ---- PC Health Doctor Types (Feature #6) ----
export interface PCHealthReport {
  overall: number;
  maxScore: number;
  issues: {
    icon: string;
    title: string;
    severity: 'info' | 'warning' | 'critical';
    detail: string;
    fixable: boolean;
  }[];
  fixPlan: {
    estimatedMinutes: number;
    expectedImprovement: number;
    actions: string[];
  };
  checks: {
    name: string;
    status: 'pass' | 'warning' | 'fail';
    detail: string;
    score: number;
  }[];
}

// ---- Optimization Mode Types (Feature #7) ----
export type OptimizationMode = 'gaming' | 'developer' | 'office' | 'battery';

export interface ModeAction {
  id: string;
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  enabled: boolean;
  category: string;
}

export interface OptimizationModeConfig {
  mode: OptimizationMode;
  name: string;
  icon: string;
  color: string;
  description: string;
  actions: ModeAction[];
}

// ---- Application Intelligence Types (Feature #9) ----
export interface InstalledApp {
  id: string;
  name: string;
  publisher: string;
  version: string;
  installDate: number;
  lastUsed: number;
  size: number;
  category: 'productivity' | 'development' | 'media' | 'gaming' | 'communication' | 'utility' | 'browser' | 'other';
  usageFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely' | 'never';
  recommendation?: string;
}

// ---- Security & Privacy Types (Feature #10) ----
export interface PrivacyScanResult {
  browserTrackers: { browser: string; count: number; size: number }[];
  recentFiles: { name: string; path: string; accessed: number }[];
  activityHistory: { type: string; count: number; size: number }[];
  clipboardHistory: { count: number; enabled: boolean };
  searchHistory: { browser: string; entries: number }[];
  totalRecoverable: number;
}

// ---- Process Intelligence Enhancement (Feature #8) ----
export interface ProcessInsight {
  pid: number;
  name: string;
  purpose: string;
  startedBy: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  safeToStop: boolean;
}

// ---- Settings Types ----
export interface FeatureFlags {
  first_scan_enabled: boolean;
  background_monitoring: boolean;
  storage_scanner: boolean;
  docker_monitoring: boolean;
  wsl_monitoring: boolean;
  vm_scanning: boolean;
  ai_assistant: boolean;
  developer_scanning: boolean;
  junk_detection: boolean;
  duplicate_detection: boolean;
}

export type ScanDepth = 'light' | 'normal' | 'deep';
export type ScanIntensity = 'low_cpu' | 'balanced' | 'aggressive';
export type ScheduleInterval = '15min' | '1hr' | '6hr' | 'daily' | 'weekly';
export type HashMethod = 'fast' | 'balanced' | 'deep';

export interface ScanPreferences {
  scan_depth: ScanDepth;
  scan_intensity: ScanIntensity;
  schedule_interval: ScheduleInterval;
  max_scan_time: number; // minutes, 0 = unlimited
  include_drives: string[];
  ignore_folders: string[];
  large_file_threshold: number; // bytes
  hash_method: HashMethod;
  incremental_scanning: boolean;
}

export interface NotificationRuleSettings {
  disk_warning_threshold: number; // percent
  disk_critical_threshold: number;
  memory_threshold: number;
  docker_size_alert: number; // bytes
  docker_growth_alert: number; // bytes/week
  startup_app_added: boolean;
  new_large_file: boolean;
}

export interface OptimizationRules {
  auto_clean_safe: boolean;
  confirm_moderate: boolean;
  confirm_aggressive: boolean;
  rollback_enabled: boolean;
  data_retention_days: number; // 0 = forever
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  animations: boolean;
  start_with_windows: boolean;
  run_background: boolean;
  start_minimized: boolean;
}

export interface SettingsConfig {
  feature_flags: FeatureFlags;
  scan_preferences: ScanPreferences;
  notification_rules: NotificationRuleSettings;
  optimization_rules: OptimizationRules;
  user_preferences: UserPreferences;
}

// ---- VM Inventory Types ----
export type VMType = 'hyperv' | 'vmware' | 'virtualbox' | 'unknown';
export type VMState = 'running' | 'stopped' | 'paused' | 'saved' | 'unknown';

export interface VMDisk {
  path: string;
  size: number;
  type: 'vhdx' | 'vmdk' | 'vdi' | 'unknown';
}

export interface VMSnapshot {
  name: string;
  timestamp: number;
  size: number;
}

export interface VMInventory {
  id: string;
  name: string;
  type: VMType;
  state: VMState;
  memory: number;
  cpus: number;
  disks: VMDisk[];
  snapshots: VMSnapshot[];
  total_size: number;
  last_used: number;
  path: string;
}

// ---- Performance History Types ----
export interface PerformanceSample {
  timestamp: number;
  cpu_load: number;
  mem_used: number;
  mem_total: number;
  disk_read: number;
  disk_write: number;
  net_rx: number;
  net_tx: number;
}

export interface PerformanceAverages {
  period: string;
  cpu_avg: number;
  cpu_max: number;
  mem_avg: number;
  mem_max: number;
  disk_read_avg: number;
  disk_write_avg: number;
  net_rx_avg: number;
  net_tx_avg: number;
  sample_count: number;
}

// ---- Notification Types ----
export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationType = 'disk' | 'memory' | 'docker' | 'startup' | 'performance' | 'scan' | 'system';

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: number;
  dismissed: boolean;
  action?: { label: string; handler: string; params?: Record<string, unknown> };
}

export interface NotificationRule {
  id: string;
  name: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | 'changed';
  threshold: number;
  enabled: boolean;
  last_triggered: number;
  cooldown_ms: number;
  actions: string[];
}

// ---- Scan Metadata Types ----
export type ScanStatus = 'idle' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ScanMetadata {
  key: string;
  last_run: number;
  duration: number;
  status: ScanStatus;
  incremental: boolean;
  items_scanned: number;
  error?: string;
}

// ---- Docker Growth Alert ----
export interface DockerGrowthAlert {
  category: 'images' | 'containers' | 'volumes' | 'build_cache' | 'total';
  previous_size: number;
  current_size: number;
  growth_bytes: number;
  growth_percent: number;
  period_days: number;
  severity: NotificationSeverity;
  message: string;
}

// ---- WSL Distribution Enhanced ----
export interface WSLDistribution {
  name: string;
  version: string;
  size: number;
  vhdx_path?: string;
  state: 'running' | 'stopped' | 'unknown';
  last_used?: number;
  package_cache_size?: number;
}

// ---- Optimization Profile ----
export interface OptimizationProfile {
  id: string;
  name: string;
  config: Record<string, unknown>;
  active: boolean;
}

// ---- IPC Channel Types ----
export type IpcChannel =
  | 'system:get-info'
  | 'system:get-processes'
  | 'storage:scan'
  | 'storage:get-history'
  | 'junk:scan'
  | 'junk:clean'
  | 'duplicates:scan'
  | 'duplicates:clean'
  | 'startup:get-items'
  | 'startup:toggle'
  | 'ssd:get-health'
  | 'health:calculate'
  | 'ai:recommend'
  | 'ai:chat'
  | 'optimize:plan'
  | 'optimize:execute'
  | 'devtools:scan'
  | 'automation:schedule'
  | 'automation:get-tasks'
  | 'report:generate'
  | 'settings:get'
  | 'settings:set'
  | 'settings:get-all'
  | 'settings:update'
  | 'theme:get'
  | 'theme:set'
  | 'intelligence:get-profile'
  | 'intelligence:analyze-root-cause'
  | 'intelligence:get-timeline'
  | 'intelligence:diagnose-pc'
  | 'intelligence:get-mode-config'
  | 'intelligence:get-installed-apps'
  | 'intelligence:scan-privacy'
  | 'intelligence:get-process-insights'
  | 'intelligence:scan-dev-projects'
  | 'intelligence:get-docker-info'
  | 'intelligence:get-k8s-wsl-info'
  | 'performance:history'
  | 'performance:averages'
  | 'notifications:get'
  | 'notifications:dismiss'
  | 'vm:scan'
  | 'scan:status'
  | 'scan:trigger';
