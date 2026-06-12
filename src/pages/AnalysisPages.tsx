import React, { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize, formatDuration } from '../services/utils';

export function StartupOptimizer() {
  const { startupItems, setStartupItems } = useAppStore();
  useEffect(() => { if (startupItems.length === 0) api.startup.getItems().then(setStartupItems); }, []);
  const totalBootImpact = startupItems.filter(i => i.enabled).reduce((s, i) => s + i.bootTimeImpact, 0);
  const totalMemory = startupItems.filter(i => i.enabled).reduce((s, i) => s + i.memoryUsage, 0);

  const handleToggle = async (name: string, enabled: boolean) => {
    await api.startup.toggle(name, enabled);
    setStartupItems(startupItems.map(i => i.name === name ? { ...i, enabled } : i));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">Startup Optimizer</h1><p className="text-sm text-[var(--text-secondary)]">Manage startup apps, services, and scheduled tasks</p></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="fluent-card p-4 text-center"><p className="text-xs text-[var(--text-tertiary)]">Startup Items</p><p className="text-xl font-bold">{startupItems.length}</p></div>
        <div className="fluent-card p-4 text-center"><p className="text-xs text-[var(--text-tertiary)]">Total Boot Impact</p><p className="text-xl font-bold text-[var(--warning)]">{totalBootImpact.toFixed(0)}s</p></div>
        <div className="fluent-card p-4 text-center"><p className="text-xs text-[var(--text-tertiary)]">Startup Memory</p><p className="text-xl font-bold">{formatSize(totalMemory)}</p></div>
      </div>
      <div className="space-y-3">
        {startupItems.sort((a, b) => b.impactScore - a.impactScore).map((item, i) => (
          <div key={i} className="fluent-card p-4">
            <div className="flex items-center gap-4">
              <button onClick={() => handleToggle(item.name, !item.enabled)} className={`w-10 h-6 rounded-full transition-all relative ${item.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-active)]'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-all ${item.enabled ? 'left-5' : 'left-1'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="text-sm font-semibold">{item.name}</p><span className={`badge ${item.impactScore > 70 ? 'badge-error' : item.impactScore > 40 ? 'badge-warning' : 'badge-safe'}`}>{item.impactScore > 70 ? 'High' : item.impactScore > 40 ? 'Medium' : 'Low'} Impact</span><span className="text-[10px] text-[var(--text-tertiary)]">{item.category}</span></div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{item.aiRecommendation}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[10px] text-[var(--text-tertiary)]">Boot: +{item.bootTimeImpact}s</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">RAM: {formatSize(item.memoryUsage)}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">CPU: {item.cpuUsage}%</span>
                </div>
              </div>
              <div className="w-16 h-16 relative"><svg width={64} height={64} className="progress-ring"><circle cx={32} cy={32} r={26} stroke="var(--border)" strokeWidth={4} fill="none" /><circle cx={32} cy={32} r={26} stroke={item.impactScore > 70 ? 'var(--error)' : item.impactScore > 40 ? 'var(--warning)' : 'var(--success)'} strokeWidth={4} fill="none" strokeDasharray={163.36} strokeDashoffset={163.36 * (1 - item.impactScore / 100)} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold">{item.impactScore}</span></div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProcessIntelligence() {
  const { processes, setProcesses } = useAppStore();
  useEffect(() => {
    api.system.getProcesses().then(setProcesses);
    const interval = setInterval(() => api.system.getProcesses().then(setProcesses), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">Process Intelligence</h1><p className="text-sm text-[var(--text-secondary)]">Task Manager on steroids - AI-powered process analysis</p></div>
      <div className="fluent-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[var(--bg-hover)]"><tr>{['Process', 'PID', 'CPU', 'Memory', 'Disk I/O', 'Network', 'Status'].map(h => (<th key={h} className="text-left p-3 font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>))}</tr></thead>
            <tbody>
              {processes.sort((a, b) => b.cpu - a.cpu).slice(0, 30).map((p, i) => (
                <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-fluent">
                  <td className="p-3"><div><p className="font-medium">{p.name}</p>{p.aiInsight && <p className="text-[10px] text-[var(--info)] mt-0.5">{p.aiInsight}</p>}</div></td>
                  <td className="p-3 text-[var(--text-tertiary)]">{p.pid}</td>
                  <td className="p-3"><span className={p.cpu > 10 ? 'text-red-500 font-bold' : ''}>{p.cpu.toFixed(1)}%</span></td>
                  <td className="p-3">{formatSize(p.memory)}</td>
                  <td className="p-3 text-[var(--text-tertiary)]">{formatSize(p.diskRead + p.diskWrite)}/s</td>
                  <td className="p-3 text-[var(--text-tertiary)]">{formatSize(p.networkRx + p.networkTx)}/s</td>
                  <td className="p-3"><span className="badge badge-safe">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DevToolsScanner() {
  const { devToolsScan, setDevToolsScan, loading, setLoading } = useAppStore();
  useEffect(() => { if (!devToolsScan) handleScan(); }, []);
  const handleScan = async () => { setLoading('devtools', true); try { setDevToolsScan(await api.devtools.scan()); } finally { setLoading('devtools', false); } };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Developer Tools Scanner</h1><p className="text-sm text-[var(--text-secondary)]">Scan Docker, Node.js, Python, Java, and other dev tool caches</p></div>
        <button onClick={handleScan} disabled={loading['devtools']} className="fluent-btn fluent-btn-primary">{loading['devtools'] ? 'Scanning...' : 'Scan Dev Tools'}</button>
      </div>
      {devToolsScan && (
        <>
          <div className="fluent-card p-4 text-center"><p className="text-xs text-[var(--text-tertiary)]">Total Recoverable</p><p className="text-2xl font-bold text-[var(--warning)]">{formatSize(devToolsScan.totalRecoverable)}</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devToolsScan.tools.map((tool, i) => (
              <div key={i} className="fluent-card p-5">
                <div className="flex items-center gap-3 mb-3"><span className="text-2xl">{tool.icon}</span><div><p className="text-sm font-semibold">{tool.name}</p><p className="text-[10px] text-[var(--text-tertiary)]">{tool.version}</p></div><span className="ml-auto text-sm font-bold">{formatSize(tool.size)}</span></div>
                <div className="h-2 rounded-full bg-[var(--bg-hover)] mb-3 overflow-hidden"><div className="h-full rounded-full bg-[var(--warning)]" style={{ width: `${(tool.recoverable / Math.max(tool.size, 1)) * 100}%` }} /></div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Recoverable: <span className="font-bold text-[var(--warning)]">{formatSize(tool.recoverable)}</span></p>
                <div className="space-y-1">{tool.items.map((item, j) => (<div key={j} className="flex items-center justify-between p-2 rounded bg-[var(--bg-hover)] text-xs"><span>{item.name}</span><span className="text-[var(--text-tertiary)]">{formatSize(item.size)}</span></div>))}</div>
                {tool.recommendations.length > 0 && <div className="mt-3 space-y-1">{tool.recommendations.map((rec, k) => (<p key={k} className="text-[11px] text-[var(--info)] flex items-start gap-1"><span>→</span>{rec}</p>))}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
