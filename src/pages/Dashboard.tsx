import React, { useEffect, useState, useRef, useMemo } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize, formatDuration, getScoreColor, getScoreLabel } from '../services/utils';
import type { MachineProfile } from '../../shared/types';

// ---- Circular Progress Component ----
function CircularProgress({ value, max = 100, size = 80, strokeWidth = 6, color, label, sublabel }: {
  value: number; max?: number; size?: number; strokeWidth?: number; color?: string; label: string; sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);
  const dynamicColor = color || (progress > 0.75 ? 'var(--error)' : progress > 0.5 ? 'var(--warning)' : 'var(--success)');

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="progress-ring">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth={strokeWidth} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke={dynamicColor} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
      {sublabel && <span className="text-[10px] text-[var(--text-tertiary)]">{sublabel}</span>}
    </div>
  );
}

// ---- Stat Card Component ----
function StatCard({ title, value, subtitle, icon, color = 'var(--accent)', trend }: {
  title: string; value: string; subtitle?: string; icon: string; color?: string; trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <div className="fluent-card p-4 hover:scale-[1.02] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-[var(--text-tertiary)] font-medium mb-1">{title}</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
          {subtitle && <p className="text-[11px] text-[var(--text-secondary)] mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span className={`text-[10px] font-medium ${trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-[var(--text-tertiary)]'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        </div>
      )}
    </div>
  );
}

// ---- Mini Sparkline Chart ----
function Sparkline({ data, color = 'var(--accent)', height = 40 }: { data: number[]; color?: string; height?: number }) {
  const chartData = data.map((v, i) => ({ value: v, index: i }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} fill={`url(#spark-${color})`} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---- Disk Usage Bar ----
function DiskBar({ drive, usedPercent, total, free, used }: {
  drive: string; usedPercent: number; total: number; free: number; used: number;
}) {
  const color = usedPercent > 90 ? 'var(--error)' : usedPercent > 75 ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="fluent-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${color}20`, color }}>
            {drive}
          </div>
          <div>
            <p className="text-xs font-semibold">{drive}: Drive</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(total)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold" style={{ color }}>{usedPercent.toFixed(1)}%</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(free)} free</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${usedPercent}%`, background: color }} />
      </div>
    </div>
  );
}

// ---- Main Dashboard ----
export function Dashboard() {
  const systemInfo = useAppStore(s => s.systemInfo);
  const realtimeData = useAppStore(s => s.realtimeData);
  const healthScore = useAppStore(s => s.healthScore);
  const setHealthScore = useAppStore(s => s.setHealthScore);
  const recommendations = useAppStore(s => s.recommendations);
  const setRecommendations = useAppStore(s => s.setRecommendations);
  const setPage = useAppStore(s => s.setPage);
  const [profile, setProfile] = useState<MachineProfile | null>(null);

  // Use refs for chart history to avoid re-render cascades
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(20).fill(30));
  const [memHistory, setMemHistory] = useState<number[]>(Array(20).fill(55));
  const [netHistory, setNetHistory] = useState<number[]>(Array(20).fill(20));
  const rtRef = useRef(realtimeData);
  rtRef.current = realtimeData;

  useEffect(() => {
    if (realtimeData) {
      setCpuHistory(prev => [...prev.slice(1), realtimeData.cpu.load]);
      setMemHistory(prev => [...prev.slice(1), realtimeData.memory.usedPercent]);
      setNetHistory(prev => [...prev.slice(1), Math.min(100, realtimeData.network.downloadSpeed / 104857.6)]);
    }
  }, [realtimeData]);

  useEffect(() => {
    api.health.calculate().then(setHealthScore);
    api.ai.recommend().then(setRecommendations);
    api.intelligence.getProfile().then(setProfile);
  }, []);

  const info = systemInfo;
  const rt = realtimeData;

  if (!info) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 animate-pulse-subtle">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Loading system information...</p>
        </div>
      </div>
    );
  }

  const storageData = info.disks.map(d => ({
    name: d.drive || d.mount,
    used: d.used,
    free: d.free,
    total: d.total,
    percent: d.usedPercent,
  }));

  const pieData = [
    { name: 'Used', value: rt?.memory?.used || info.memory.used, fill: 'var(--accent)' },
    { name: 'Free', value: rt?.memory?.free || info.memory.free, fill: 'var(--border)' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">{info.hostname} &bull; {info.os} &bull; Uptime: {formatDuration(info.uptime)}</p>
        </div>
        {healthScore && (
          <button onClick={() => setPage('health-score')} className="flex items-center gap-3 px-4 py-2 rounded-xl fluent-card hover:scale-[1.02] transition-all cursor-pointer">
            <div className="w-12 h-12 relative">
              <svg width={48} height={48} className="progress-ring">
                <circle cx={24} cy={24} r={20} stroke="var(--border)" strokeWidth={4} fill="none" />
                <circle cx={24} cy={24} r={20} stroke={healthScore.overall >= 75 ? 'var(--success)' : healthScore.overall >= 50 ? 'var(--warning)' : 'var(--error)'}
                  strokeWidth={4} fill="none" strokeDasharray={125.66} strokeDashoffset={125.66 * (1 - healthScore.overall / 100)}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold">{healthScore.overall}</span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-[var(--text-tertiary)]">Health Score</p>
              <p className={`text-sm font-bold ${getScoreColor(healthScore.overall)}`}>{getScoreLabel(healthScore.overall)}</p>
            </div>
          </button>
        )}
      </div>

      {/* System Overview - Circular Progress */}
      <div className="fluent-card p-6">
        <h2 className="text-sm font-semibold mb-4 text-[var(--text-secondary)]">System Overview</h2>
        <div className="flex items-center justify-around flex-wrap gap-4">
          <CircularProgress value={rt?.cpu?.load || info.cpu.currentLoad} label="CPU" sublabel={info.cpu.brand} color="var(--chart-1)" />
          <CircularProgress value={rt?.memory?.usedPercent || info.memory.usedPercent} label="Memory" sublabel={`${formatSize(rt?.memory?.used || info.memory.used)} / ${formatSize(info.memory.total)}`} color="var(--chart-2)" />
          <CircularProgress value={info.disks[0]?.usedPercent || 0} label="Disk (C:)" sublabel={`${formatSize(info.disks[0]?.free || 0)} free`} color="var(--chart-3)" />
          <CircularProgress value={info.gpus[0]?.utilization || 0} label="GPU" sublabel={info.gpus[0]?.name || 'N/A'} color="var(--chart-4)" />
          <CircularProgress value={Math.min(100, (rt?.network?.downloadSpeed || 0) / 104857.6)} label="Network" sublabel={`${formatSize(rt?.network?.downloadSpeed || 0)}/s`} color="var(--chart-5)" />
          {info.battery?.hasBattery && (
            <CircularProgress value={info.battery.percent} label="Battery" sublabel={info.battery.isCharging ? 'Charging' : 'On Battery'} color="var(--chart-6)" />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="CPU Cores" value={`${info.cpu.cores}`} subtitle={`${info.cpu.physicalCores} physical`} icon="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" color="var(--chart-1)" />
        <StatCard title="Total RAM" value={formatSize(info.memory.total)} subtitle={`${formatSize(info.memory.free)} available`} icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" color="var(--chart-2)" />
        <StatCard title="Storage" value={formatSize(info.disks.reduce((s, d) => s + d.total, 0))} subtitle={`${formatSize(info.disks.reduce((s, d) => s + d.free, 0))} free`} icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" color="var(--chart-3)" />
        <StatCard title="GPU" value={info.gpus[0]?.name?.split(' ').slice(-2).join(' ') || 'N/A'} subtitle={`${formatSize(info.gpus[0]?.memoryTotal || 0)} VRAM`} icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" color="var(--chart-4)" />
      </div>

      {/* Live Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="fluent-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)]">CPU Usage</h3>
            <span className="text-xs font-bold" style={{ color: 'var(--chart-1)' }}>{(rt?.cpu?.load || info.cpu.currentLoad).toFixed(1)}%</span>
          </div>
          <Sparkline data={cpuHistory} color="var(--chart-1)" />
        </div>
        <div className="fluent-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Memory Usage</h3>
            <span className="text-xs font-bold" style={{ color: 'var(--chart-2)' }}>{(rt?.memory?.usedPercent || info.memory.usedPercent).toFixed(1)}%</span>
          </div>
          <Sparkline data={memHistory} color="var(--chart-2)" />
        </div>
        <div className="fluent-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)]">Network</h3>
            <span className="text-xs font-bold" style={{ color: 'var(--chart-5)' }}>{formatSize(rt?.network?.downloadSpeed || 0)}/s</span>
          </div>
          <Sparkline data={netHistory} color="var(--chart-5)" />
        </div>
      </div>

      {/* Disk & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Storage Overview */}
        <div className="fluent-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Storage Overview</h3>
            <button onClick={() => setPage('storage')} className="text-xs text-[var(--text-accent)] hover:underline cursor-pointer">View Details →</button>
          </div>
          <div className="space-y-3">
            {info.disks.map(disk => (
              <DiskBar key={disk.drive || disk.mount} drive={disk.drive || disk.mount.charAt(0)} usedPercent={disk.usedPercent} total={disk.total} free={disk.free} used={disk.used} />
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="fluent-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">AI Recommendations</h3>
            <button onClick={() => setPage('ai-chat')} className="text-xs text-[var(--text-accent)] hover:underline cursor-pointer">Chat with AI →</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recommendations.slice(0, 4).map(rec => (
              <div key={rec.id} className="p-3 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] transition-fluent cursor-pointer"
                onClick={() => rec.action && setPage(rec.action.replace('open-', '') as any)}>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{rec.title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{rec.description}</p>
                    {rec.estimatedSavings && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full badge-safe">
                        Save {formatSize(rec.estimatedSavings)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My PC Intelligence Profile */}
      {profile && (
        <div className="fluent-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-xl">🧠</div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">My PC Intelligence</h3>
                <p className="text-[10px] text-[var(--text-tertiary)]">AI-generated machine profile</p>
              </div>
            </div>
            <button onClick={() => setPage('ai-analyzer')} className="text-xs text-[var(--text-accent)] hover:underline cursor-pointer">View Details →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-hover)] space-y-3">
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Device</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{profile.device}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Usage Pattern</p>
                <p className="text-sm font-semibold text-[var(--text-secondary)]">{profile.usagePattern}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold mb-1">Detected Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.detectedRoles.map((role, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-medium">{role}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Optimization Profile</p>
                <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{profile.optimizationProfile}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-hover)] space-y-3">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Recommended Actions</p>
              <div className="space-y-1.5">
                {profile.recommendedActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-green-500">✓</span>
                    <span className="text-[var(--text-secondary)]">{action}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setPage('developer-center')} className="mt-2 w-full py-2 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent)]/30 transition-fluent">
                Open Developer Center →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'PC Doctor', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', page: 'pc-doctor', color: 'var(--success)' },
          { label: 'Dev Center', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', page: 'developer-center', color: 'var(--chart-1)' },
          { label: 'AI Analyze', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', page: 'ai-analyzer', color: 'var(--chart-2)' },
          { label: 'Quick Clean', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', page: 'optimization', color: 'var(--chart-3)' },
          { label: 'AI Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', page: 'ai-chat', color: 'var(--chart-4)' },
        ].map(action => (
          <button key={action.label} onClick={() => setPage(action.page as any)}
            className="fluent-card p-4 flex flex-col items-center gap-2 hover:scale-[1.03] transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `${action.color}15` }}>
              <svg className="w-5 h-5" style={{ color: action.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
              </svg>
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
