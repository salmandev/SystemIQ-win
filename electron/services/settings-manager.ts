/**
 * SettingsManager - Centralized configuration system
 * Wraps DB settings with typed defaults, validation, and change events.
 */
import { EventEmitter } from 'events';
import type { Database } from './database';
import type {
  SettingsConfig, FeatureFlags, ScanPreferences,
  NotificationRuleSettings, OptimizationRules, UserPreferences,
} from '../../shared/types';

const SETTINGS_KEY = 'settings_config_v1';

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  first_scan_enabled: true,
  background_monitoring: true,
  storage_scanner: true,
  docker_monitoring: true,
  wsl_monitoring: true,
  vm_scanning: false,
  ai_assistant: true,
  developer_scanning: true,
  junk_detection: true,
  duplicate_detection: true,
};

const DEFAULT_SCAN_PREFERENCES: ScanPreferences = {
  scan_depth: 'normal',
  scan_intensity: 'balanced',
  schedule_interval: '1hr',
  max_scan_time: 30,
  include_drives: ['C'],
  ignore_folders: ['node_modules', '.git', 'cache', 'temp'],
  large_file_threshold: 500 * 1024 * 1024, // 500 MB
  hash_method: 'balanced',
  incremental_scanning: true,
};

const DEFAULT_NOTIFICATION_RULES: NotificationRuleSettings = {
  disk_warning_threshold: 80,
  disk_critical_threshold: 90,
  memory_threshold: 85,
  docker_size_alert: 20 * 1024 * 1024 * 1024, // 20 GB
  docker_growth_alert: 5 * 1024 * 1024 * 1024, // 5 GB/week
  startup_app_added: true,
  new_large_file: true,
};

const DEFAULT_OPTIMIZATION_RULES: OptimizationRules = {
  auto_clean_safe: false,
  confirm_moderate: true,
  confirm_aggressive: true,
  rollback_enabled: true,
  data_retention_days: 90,
};

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'dark',
  language: 'en',
  animations: true,
  start_with_windows: false,
  run_background: true,
  start_minimized: false,
};

const DEFAULTS: SettingsConfig = {
  feature_flags: DEFAULT_FEATURE_FLAGS,
  scan_preferences: DEFAULT_SCAN_PREFERENCES,
  notification_rules: DEFAULT_NOTIFICATION_RULES,
  optimization_rules: DEFAULT_OPTIMIZATION_RULES,
  user_preferences: DEFAULT_USER_PREFERENCES,
};

export class SettingsManager extends EventEmitter {
  private config: SettingsConfig;
  private loaded = false;

  constructor(private db: Database | null) {
    super();
    this.config = { ...DEFAULTS };
    this.load();
  }

  /** Load settings from DB, merging with defaults */
  private load() {
    if (!this.db) return;
    try {
      const stored = this.db.getSettings(SETTINGS_KEY) as Partial<SettingsConfig> | null;
      if (stored) {
        this.config = {
          feature_flags: { ...DEFAULT_FEATURE_FLAGS, ...(stored.feature_flags || {}) },
          scan_preferences: { ...DEFAULT_SCAN_PREFERENCES, ...(stored.scan_preferences || {}) },
          notification_rules: { ...DEFAULT_NOTIFICATION_RULES, ...(stored.notification_rules || {}) },
          optimization_rules: { ...DEFAULT_OPTIMIZATION_RULES, ...(stored.optimization_rules || {}) },
          user_preferences: { ...DEFAULT_USER_PREFERENCES, ...(stored.user_preferences || {}) },
        };
      }
      this.loaded = true;
    } catch {
      // DB may not be available yet
    }
  }

  /** Persist current config to DB */
  private save() {
    if (!this.db) return;
    try {
      this.db.setSetting(SETTINGS_KEY, this.config);
    } catch { /* non-critical */ }
  }

  /** Get the full settings config */
  getAll(): SettingsConfig {
    return { ...this.config };
  }

  /** Get a specific settings section */
  getSection<K extends keyof SettingsConfig>(section: K): SettingsConfig[K] {
    return { ...this.config[section] };
  }

  /** Get a single setting value */
  get<K extends keyof SettingsConfig, SK extends keyof SettingsConfig[K]>(
    section: K,
    key: SK,
  ): SettingsConfig[K][SK] {
    return this.config[section][key];
  }

  /** Update a single setting */
  set<K extends keyof SettingsConfig, SK extends keyof SettingsConfig[K]>(
    section: K,
    key: SK,
    value: SettingsConfig[K][SK],
  ) {
    const oldValue = this.config[section][key];
    if (oldValue === value) return;
    (this.config[section] as unknown as Record<string, unknown>)[key as string] = value;
    this.save();
    this.emit('change', { section, key, value, oldValue });
    this.emit(`change:${section}`, { key, value, oldValue });
  }

  /** Update multiple settings at once */
  update(partial: Partial<SettingsConfig>) {
    const changes: { section: string; key: string; value: unknown }[] = [];
    for (const [sectionKey, sectionValue] of Object.entries(partial)) {
      const section = sectionKey as keyof SettingsConfig;
      if (sectionValue && typeof sectionValue === 'object') {
        for (const [k, v] of Object.entries(sectionValue as unknown as Record<string, unknown>)) {
          const sectionObj = (this.config as any)[section] as Record<string, unknown>;
          const oldV = sectionObj[k];
          if (oldV !== v) {
            sectionObj[k] = v;
            changes.push({ section: sectionKey, key: k, value: v });
          }
        }
      }
    }
    if (changes.length > 0) {
      this.save();
      for (const c of changes) {
        this.emit('change', c);
        this.emit(`change:${c.section}`, { key: c.key, value: c.value });
      }
    }
  }

  /** Reset a section to defaults */
  resetSection(section: keyof SettingsConfig) {
    (this.config as unknown as Record<string, unknown>)[section] = { ...DEFAULTS[section] };
    this.save();
    this.emit('change', { section, reset: true });
  }

  /** Reset all settings to defaults */
  resetAll() {
    this.config = { ...DEFAULTS };
    this.save();
    this.emit('change', { reset: true });
  }

  // ---- Convenience getters ----
  get featureFlags(): FeatureFlags { return this.config.feature_flags; }
  get scanPreferences(): ScanPreferences { return this.config.scan_preferences; }
  get notificationRules(): NotificationRuleSettings { return this.config.notification_rules; }
  get optimizationRules(): OptimizationRules { return this.config.optimization_rules; }
  get userPreferences(): UserPreferences { return this.config.user_preferences; }

  /** Get schedule interval in milliseconds */
  getScheduleIntervalMs(): number {
    const map: Record<string, number> = {
      '15min': 15 * 60 * 1000,
      '1hr': 60 * 60 * 1000,
      '6hr': 6 * 60 * 60 * 1000,
      'daily': 24 * 60 * 60 * 1000,
      'weekly': 7 * 24 * 60 * 60 * 1000,
    };
    return map[this.config.scan_preferences.schedule_interval] || 60 * 60 * 1000;
  }

  /** Get data retention in milliseconds (0 = forever) */
  getRetentionMs(): number {
    const days = this.config.optimization_rules.data_retention_days;
    return days === 0 ? 0 : days * 24 * 60 * 60 * 1000;
  }

  /** Check if a feature is enabled */
  isFeatureEnabled(flag: keyof FeatureFlags): boolean {
    return this.config.feature_flags[flag];
  }
}
