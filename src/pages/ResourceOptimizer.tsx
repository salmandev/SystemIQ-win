import React, { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize } from '../services/utils';

export function ResourceOptimizer() {
  const realtimeData = useAppStore(s => s.realtimeData);
  const systemInfo = useAppStore(s => s.systemInfo);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(30));
  const [memHistory, setMemHistory] = useState<number[]>(Array(30).fill(55));

  // Consume realtime data from store (Layout already polls it)
  useEffect(() => {
    if (realtimeData) {
      setCpuHistory(prev => [...prev.slice(1), realtimeData.cpu.load]);
      setMemHistory(prev => [...prev.slice(1), realtimeData.memory.usedPercent]);
    }
  }, [realtimeData]);

  const rt = realtimeData;
  if (!rt) return <div className="flex items-center justify-center h-64"><p className="text-[var(--text-secondary)]">Loading resource data...</p></div>;

  const cpuCores = rt.cpu.loads.map((load: number, i: number) => ({ core: `C${i}`, load }));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">Resource Optimizer</h1><p className="text-sm text-[var(--text-secondary)]">CPU, Memory, and resource analysis with AI insights</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="fluent-card p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">CPU Usage - {rt.cpu.load.toFixed(1)}%</h3></div>
          <ResponsiveContainer width="100%" height={120}><AreaChart data={cpuHistory.map((v, i) => ({ v, i }))}><defs><linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke="var(--chart-1)" fill="url(#cpuG)" strokeWidth={2} /></AreaChart></ResponsiveContainer>
          <div className="mt-3 grid grid-cols-8 gap-1">{cpuCores.slice(0, 16).map((c: any, i: number) => (<div key={i} className="text-center"><div className="h-8 rounded bg-[var(--bg-hover)] relative overflow-hidden"><div className="absolute bottom-0 w-full rounded transition-all" style={{ height: `${c.load}%`, background: c.load > 75 ? 'var(--error)' : 'var(--chart-1)' }} /></div><span className="text-[8px] text-[var(--text-tertiary)]">{c.core}</span></div>))}</div>
        </div>
        <div className="fluent-card p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">Memory - {rt.memory.usedPercent.toFixed(1)}%</h3><span className="text-xs text-[var(--text-tertiary)]">{formatSize(rt.memory.used)} / {formatSize(rt.memory.total)}</span></div>
          <ResponsiveContainer width="100%" height={120}><AreaChart data={memHistory.map((v, i) => ({ v, i }))}><defs><linearGradient id="memG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke="var(--chart-2)" fill="url(#memG)" strokeWidth={2} /></AreaChart></ResponsiveContainer>
          <div className="h-4 rounded-full bg-[var(--bg-hover)] mt-4 overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${rt.memory.usedPercent}%`, background: rt.memory.usedPercent > 80 ? 'var(--error)' : 'var(--chart-2)' }} /></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="fluent-card p-5">
          <h3 className="text-sm font-semibold mb-3">Top CPU Consumers</h3>
          <div className="space-y-2">{rt.topCpu?.map((p: any, i: number) => (<div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-hover)]"><div className="w-8 h-8 rounded-lg bg-[var(--chart-1)] bg-opacity-10 flex items-center justify-center text-xs font-bold text-[var(--chart-1)]">{p.cpu.toFixed(0)}%</div><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{p.name}</p><p className="text-[10px] text-[var(--text-tertiary)]">PID: {p.pid}</p></div><div className="h-2 w-20 rounded-full bg-[var(--bg-active)] overflow-hidden"><div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.min(100, p.cpu * 4)}%` }} /></div></div>))}</div>
        </div>
        <div className="fluent-card p-5">
          <h3 className="text-sm font-semibold mb-3">Top Memory Consumers</h3>
          <div className="space-y-2">{rt.topMem?.map((p: any, i: number) => (<div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-hover)]"><div className="w-8 h-8 rounded-lg bg-[var(--chart-2)] bg-opacity-10 flex items-center justify-center text-[10px] font-bold text-[var(--chart-2)]">{formatSize(p.mem)}</div><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{p.name}</p><p className="text-[10px] text-[var(--text-tertiary)]">PID: {p.pid}</p></div><div className="h-2 w-20 rounded-full bg-[var(--bg-active)] overflow-hidden"><div className="h-full rounded-full bg-[var(--chart-2)]" style={{ width: `${Math.min(100, (p.mem / rt.memory.total) * 100 * 5)}%` }} /></div></div>))}</div>
        </div>
      </div>
      <div className="fluent-card p-5">
        <h3 className="text-sm font-semibold mb-2">AI Resource Insights</h3>
        <div className="space-y-2">
          {rt.cpu.load > 60 && <div className="p-3 rounded-lg bg-[var(--warning-bg)] border-l-4 border-l-yellow-500"><p className="text-xs font-semibold">High CPU usage detected</p><p className="text-[11px] text-[var(--text-secondary)] mt-1">CPU is at {rt.cpu.load.toFixed(0)}%. Consider closing resource-intensive applications or scheduling heavy tasks for off-peak hours.</p></div>}
          {rt.memory.usedPercent > 70 && <div className="p-3 rounded-lg bg-[var(--info-bg)] border-l-4 border-l-blue-500"><p className="text-xs font-semibold">Memory pressure</p><p className="text-[11px] text-[var(--text-secondary)] mt-1">Memory usage is {rt.memory.usedPercent.toFixed(0)}%. Close unused browser tabs and background applications to free up RAM.</p></div>}
          {rt.cpu.load <= 60 && rt.memory.usedPercent <= 70 && <div className="p-3 rounded-lg bg-[var(--success-bg)] border-l-4 border-l-green-500"><p className="text-xs font-semibold">System is performing well</p><p className="text-[11px] text-[var(--text-secondary)] mt-1">Resource usage is within normal ranges. No immediate optimization needed.</p></div>}
        </div>
      </div>
    </div>
  );
}
