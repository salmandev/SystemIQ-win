import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize, formatTimeAgo } from '../services/utils';

export function OneClickOptimize() {
  const { optimizationPlan, setOptimizationPlan } = useAppStore();
  const [mode, setMode] = useState<'safe' | 'aggressive' | 'custom'>('safe');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const createPlan = async () => { const plan = await api.optimize.plan(mode); setOptimizationPlan(plan); };
  const execute = async () => {
    if (!optimizationPlan) return;
    setExecuting(true);
    try { setResult(await api.optimize.execute(optimizationPlan.id)); } finally { setExecuting(false); }
  };

  useEffect(() => { createPlan(); }, [mode]);
  const selectedSavings = optimizationPlan?.actions.filter(a => a.selected).reduce((s, a) => s + a.estimatedSavings, 0) || 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">One-Click Optimization</h1><p className="text-sm text-[var(--text-secondary)]">Safe, aggressive, or custom optimization modes</p></div>
      <div className="grid grid-cols-3 gap-4">
        {[{ id: 'safe', label: 'Safe Mode', desc: 'Only safe operations', icon: '🛡️', color: 'var(--success)' }, { id: 'aggressive', label: 'Aggressive', desc: 'Advanced cleanup', icon: '⚡', color: 'var(--warning)' }, { id: 'custom', label: 'Custom', desc: 'User-selected', icon: '🔧', color: 'var(--accent)' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id as any)} className={`fluent-card p-5 text-center transition-all border-2 ${mode === m.id ? 'border-[var(--accent)] scale-[1.02]' : 'border-transparent hover:border-[var(--border)]'}`}>
            <span className="text-3xl">{m.icon}</span><p className="text-sm font-semibold mt-2">{m.label}</p><p className="text-[10px] text-[var(--text-tertiary)]">{m.desc}</p>
          </button>
        ))}
      </div>
      {optimizationPlan && (
        <>
          <div className="fluent-card p-4 flex items-center justify-between">
            <div><p className="text-xs text-[var(--text-tertiary)]">Estimated Space Recovery</p><p className="text-xl font-bold text-[var(--success)]">{formatSize(selectedSavings)}</p></div>
            <button onClick={execute} disabled={executing} className="fluent-btn fluent-btn-primary px-6 py-3">{executing ? 'Optimizing...' : `Optimize Now (${formatSize(selectedSavings)})`}</button>
          </div>
          <div className="space-y-2">{optimizationPlan.actions.map((action, i) => (
            <div key={i} className="fluent-card p-4 flex items-center gap-4">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${action.selected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-strong)]'}`}>{action.selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}</div>
              <div className="flex-1"><p className="text-sm font-medium">{action.name}</p><p className="text-[11px] text-[var(--text-secondary)]">{action.description}</p></div>
              <span className={`badge ${action.riskLevel === 'safe' ? 'badge-safe' : action.riskLevel === 'moderate' ? 'badge-warning' : 'badge-error'}`}>{action.riskLevel}</span>
              <span className="text-sm font-bold">{formatSize(action.estimatedSavings)}</span>
            </div>
          ))}</div>
        </>
      )}
      {result && (
        <div className="fluent-card p-6 text-center bg-[var(--success-bg)] border border-green-500">
          <span className="text-4xl">✅</span><p className="text-lg font-bold mt-2">Optimization Complete!</p><p className="text-sm text-[var(--text-secondary)] mt-1">Recovered {formatSize(result.spaceRecovered)} • {result.actionsExecuted} actions completed</p>
        </div>
      )}
    </div>
  );
}

export function Automation() {
  const { scheduledTasks, setScheduledTasks } = useAppStore();
  useEffect(() => { api.automation.getTasks().then(setScheduledTasks); }, []);
  const handleToggle = async (id: string, enabled: boolean) => { await api.automation.toggle(id, enabled); setScheduledTasks(scheduledTasks.map(t => t.id === id ? { ...t, enabled } : t)); };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">Automation Engine</h1><p className="text-sm text-[var(--text-secondary)]">Schedule automated cleanup, scans, and optimization</p></div>
      <div className="space-y-3">{scheduledTasks.map(task => (
        <div key={task.id} className="fluent-card p-4 flex items-center gap-4">
          <button onClick={() => handleToggle(task.id, !task.enabled)} className={`w-10 h-6 rounded-full transition-all relative ${task.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-active)]'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${task.enabled ? 'left-5' : 'left-1'}`} />
          </button>
          <div className="flex-1"><p className="text-sm font-semibold">{task.name}</p><p className="text-xs text-[var(--text-tertiary)]">{task.type} • Schedule: {task.schedule}</p></div>
          <div className="text-right"><p className="text-[10px] text-[var(--text-tertiary)]">{task.lastRun ? `Last: ${formatTimeAgo(task.lastRun)}` : 'Never run'}</p>{task.nextRun && <p className="text-[10px] text-[var(--text-accent)]">Next: {formatTimeAgo(task.nextRun)}</p>}</div>
        </div>
      ))}</div>
    </div>
  );
}

export function Plugins() {
  const { plugins, setPlugins } = useAppStore();
  useEffect(() => { if (plugins.length === 0) api.plugins.get().then(setPlugins); }, []);
  const handleToggle = async (id: string, enabled: boolean) => { await api.plugins.toggle(id, enabled); setPlugins(plugins.map(p => p.id === id ? { ...p, enabled } : p)); };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">Plugins</h1><p className="text-sm text-[var(--text-secondary)]">Manage installed plugins and extensions</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{plugins.map(plugin => (
        <div key={plugin.id} className="fluent-card p-5 flex items-start gap-4">
          <span className="text-3xl">{plugin.icon}</span>
          <div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold">{plugin.name}</p><span className="text-[10px] text-[var(--text-tertiary)]">v{plugin.version}</span></div><p className="text-xs text-[var(--text-secondary)] mt-1">{plugin.description}</p><p className="text-[10px] text-[var(--text-tertiary)] mt-1">by {plugin.author}</p></div>
          <button onClick={() => handleToggle(plugin.id, !plugin.enabled)} className={`w-10 h-6 rounded-full transition-all relative ${plugin.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-active)]'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${plugin.enabled ? 'left-5' : 'left-1'}`} />
          </button>
        </div>
      ))}</div>
    </div>
  );
}

export function Settings() {
  const { theme, toggleTheme } = useAppStore();
  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-[var(--text-secondary)]">Configure Windows Intelligence Optimizer</p></div>
      <div className="fluent-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Appearance</h3>
        <div className="flex items-center justify-between">
          <div><p className="text-sm">Theme</p><p className="text-xs text-[var(--text-tertiary)]">Switch between light and dark mode</p></div>
          <button onClick={toggleTheme} className="fluent-btn fluent-btn-subtle">{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</button>
        </div>
      </div>
      <div className="fluent-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">General</h3>
        <div className="flex items-center justify-between"><div><p className="text-sm">Developer Mode</p><p className="text-xs text-[var(--text-tertiary)]">Enable advanced developer tools features</p></div><div className="w-10 h-6 rounded-full bg-[var(--accent)] relative"><div className="w-4 h-4 rounded-full bg-white shadow absolute top-1 left-5" /></div></div>
        <div className="flex items-center justify-between"><div><p className="text-sm">Auto-scan on startup</p><p className="text-xs text-[var(--text-tertiary)]">Automatically scan system when app opens</p></div><div className="w-10 h-6 rounded-full bg-[var(--bg-active)] relative"><div className="w-4 h-4 rounded-full bg-white shadow absolute top-1 left-1" /></div></div>
        <div className="flex items-center justify-between"><div><p className="text-sm">Confirm before cleaning</p><p className="text-xs text-[var(--text-tertiary)]">Always require confirmation before deleting files</p></div><div className="w-10 h-6 rounded-full bg-[var(--accent)] relative"><div className="w-4 h-4 rounded-full bg-white shadow absolute top-1 left-5" /></div></div>
      </div>
      <div className="fluent-card p-5"><h3 className="text-sm font-semibold mb-3">About</h3><p className="text-xs text-[var(--text-secondary)]">Windows Intelligence Optimizer v1.0.0</p><p className="text-[11px] text-[var(--text-tertiary)] mt-1">AI-powered system optimization combining deep storage analytics, resource optimization, developer tool cleanup, and intelligent recommendations.</p></div>
    </div>
  );
}
