import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatSize, formatTimeAgo } from '../services/utils';
import type { InstalledApp, ProcessInsight } from '../../shared/types';

type Tab = 'apps' | 'processes';

export function AppIntelligence() {
  const [tab, setTab] = useState<Tab>('apps');
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [insights, setInsights] = useState<ProcessInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([api.intelligence.getInstalledApps(), api.intelligence.getProcessInsights()])
      .then(([a, p]) => { setApps(a); setInsights(p); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96 text-sm text-[var(--text-secondary)]">Loading...</div>;

  const categories = ['all', ...new Set(apps.map(a => a.category))];
  const filteredApps = filter === 'all' ? apps : apps.filter(a => a.category === filter);
  const unusedApps = apps.filter(a => a.usageFrequency === 'never' || a.usageFrequency === 'rarely');
  const totalUnusedSize = unusedApps.reduce((s, a) => s + a.size, 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Application Intelligence</h1>
        <p className="text-sm text-[var(--text-secondary)]">Understand every app and process running on your machine</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="fluent-card p-4">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Installed Apps</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{apps.length}</p>
        </div>
        <div className="fluent-card p-4">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Unused/Rare</p>
          <p className="text-2xl font-bold text-amber-500">{unusedApps.length}</p>
        </div>
        <div className="fluent-card p-4">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Reclaimable</p>
          <p className="text-2xl font-bold text-green-500">{formatSize(totalUnusedSize)}</p>
        </div>
        <div className="fluent-card p-4">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Active Processes</p>
          <p className="text-2xl font-bold text-[var(--accent)]">{insights.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        <button onClick={() => setTab('apps')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'apps' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
          📦 Installed Apps
        </button>
        <button onClick={() => setTab('processes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'processes' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
          ⚙️ Process Intelligence
        </button>
      </div>

      {tab === 'apps' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === c ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white'}`}>
                {c}
              </button>
            ))}
          </div>

          {/* App Grid */}
          <div className="grid gap-3 md:grid-cols-2">
            {filteredApps.map(app => (
              <div key={app.id} className="fluent-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(app.category)}</span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{app.name}</h3>
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{app.publisher} &bull; v{app.version}</p>
                  </div>
                  <FrequencyBadge freq={app.usageFrequency} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="px-2 py-1 rounded bg-[var(--bg-hover)]">
                    <p className="text-[10px] text-[var(--text-tertiary)]">Size</p>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{formatSize(app.size)}</p>
                  </div>
                  <div className="px-2 py-1 rounded bg-[var(--bg-hover)]">
                    <p className="text-[10px] text-[var(--text-tertiary)]">Last Used</p>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{formatTimeAgo(app.lastUsed)}</p>
                  </div>
                  <div className="px-2 py-1 rounded bg-[var(--bg-hover)]">
                    <p className="text-[10px] text-[var(--text-tertiary)]">Installed</p>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{formatTimeAgo(app.installDate)}</p>
                  </div>
                </div>
                {app.recommendation && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-2">
                    <p className="text-[10px] text-amber-500 font-medium">💡 {app.recommendation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'processes' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Why is this running?</h3>
          {insights.map(insight => (
            <div key={insight.pid} className="fluent-card p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                  insight.impact === 'high' ? 'bg-red-500/20 text-red-500' :
                  insight.impact === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-green-500/20 text-green-500'
                }`}>
                  {insight.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{insight.name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">PID: {insight.pid}</p>
                    </div>
                    <ImpactBadge impact={insight.impact} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-[10px] text-[var(--text-tertiary)]">Purpose</p>
                      <p className="text-xs text-[var(--text-secondary)]">{insight.purpose}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-tertiary)]">Started by</p>
                      <p className="text-xs text-[var(--text-secondary)]">{insight.startedBy}</p>
                    </div>
                  </div>
                  <div className="mt-2 p-2 rounded-lg bg-[var(--bg-hover)] flex items-center gap-2">
                    <span className="text-xs">{insight.safeToStop ? '✅' : '⚠️'}</span>
                    <p className="text-xs text-[var(--text-secondary)]">{insight.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCategoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    development: '🛠️', productivity: '📊', media: '🎵', gaming: '🎮',
    communication: '💬', utility: '🔧', browser: '🌐', other: '📦',
  };
  return icons[cat] || '📦';
}

function FrequencyBadge({ freq }: { freq: string }) {
  const colors: Record<string, string> = {
    daily: 'bg-green-500/20 text-green-500', weekly: 'bg-blue-500/20 text-blue-500',
    monthly: 'bg-amber-500/20 text-amber-500', rarely: 'bg-orange-500/20 text-orange-500',
    never: 'bg-red-500/20 text-red-500',
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${colors[freq] || ''}`}>{freq}</span>;
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-500/20 text-red-500', medium: 'bg-amber-500/20 text-amber-500', low: 'bg-green-500/20 text-green-500',
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${colors[impact] || ''}`}>{impact} impact</span>;
}
