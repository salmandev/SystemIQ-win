import React, { useEffect } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize, formatDuration, getScoreColor, getScoreLabel } from '../services/utils';

export function SsdHealth() {
  const ssdHealth = useAppStore(s => s.ssdHealth);
  const setSsdHealth = useAppStore(s => s.setSsdHealth);
  useEffect(() => {
    // Load from cache first, then refresh
    api.cache.get('ssd-health').then((c: any) => { if (c?.data) setSsdHealth(c.data as any); }).catch(() => {});
    api.ssd.getHealth().then(setSsdHealth).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">SSD Health Analyzer</h1><p className="text-sm text-[var(--text-secondary)]">Monitor SMART data, drive temperature, wear level, and remaining life</p></div>
      {ssdHealth.map((drive, i) => (
        <div key={i} className="fluent-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div><p className="text-lg font-bold">{drive.model}</p><p className="text-xs text-[var(--text-tertiary)]">{drive.drive} &bull; {drive.serial} &bull; FW: {drive.firmware}</p></div>
            <span className={`badge ${drive.healthStatus === 'healthy' ? 'badge-safe' : drive.healthStatus === 'warning' ? 'badge-warning' : 'badge-error'}`}>{drive.healthStatus.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center"><p className="text-xs text-[var(--text-tertiary)]">Temperature</p><p className="text-lg font-bold" style={{ color: drive.temperature > 50 ? 'var(--error)' : 'var(--success)' }}>{drive.temperature}°C</p></div>
            <div className="text-center"><p className="text-xs text-[var(--text-tertiary)]">Remaining Life</p><p className="text-lg font-bold" style={{ color: drive.remainingLife > 50 ? 'var(--success)' : 'var(--error)' }}>{drive.remainingLife}%</p></div>
            <div className="text-center"><p className="text-xs text-[var(--text-tertiary)]">Wear Level</p><p className="text-lg font-bold">{drive.wearLevel}%</p></div>
            <div className="text-center"><p className="text-xs text-[var(--text-tertiary)]">Power-On Hours</p><p className="text-lg font-bold">{drive.powerOnHours.toLocaleString()}</p></div>
            <div className="text-center"><p className="text-xs text-[var(--text-tertiary)]">Capacity</p><p className="text-lg font-bold">{formatSize(drive.capacity)}</p></div>
          </div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">SMART Attributes</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {drive.smartAttributes.map((attr, j) => (
              <div key={j} className="p-2 rounded-lg bg-[var(--bg-hover)] flex items-center justify-between">
                <div><p className="text-xs font-medium">{attr.name}</p><p className="text-[10px] text-[var(--text-tertiary)]">ID: {attr.id}</p></div>
                <div className="text-right"><p className="text-xs font-bold">{attr.value}</p><p className="text-[10px] text-[var(--text-tertiary)]">Raw: {attr.raw}</p></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HealthScore() {
  const healthScore = useAppStore(s => s.healthScore);
  const setHealthScore = useAppStore(s => s.setHealthScore);
  useEffect(() => {
    api.cache.get('health-score').then((c: any) => { if (c?.data) setHealthScore(c.data as any); }).catch(() => {});
    api.health.calculate().then(setHealthScore).catch(() => {});
  }, []);
  if (!healthScore) return <div className="flex items-center justify-center h-64"><p className="text-[var(--text-secondary)]">Calculating health score...</p></div>;

  const scores = [
    { label: 'Storage', score: healthScore.storage.score, data: healthScore.storage },
    { label: 'Memory', score: healthScore.memory.score, data: healthScore.memory },
    { label: 'CPU', score: healthScore.cpu.score, data: healthScore.cpu },
    { label: 'Startup', score: healthScore.startup.score, data: healthScore.startup },
    { label: 'Security', score: healthScore.security.score, data: healthScore.security },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div><h1 className="text-2xl font-bold">System Health Score</h1><p className="text-sm text-[var(--text-secondary)]">Comprehensive system health assessment with improvement actions</p></div>
      <div className="fluent-card p-8 text-center">
        <div className="w-32 h-32 mx-auto relative mb-4">
          <svg width={128} height={128} className="progress-ring"><circle cx={64} cy={64} r={56} stroke="var(--border)" strokeWidth={8} fill="none" /><circle cx={64} cy={64} r={56} stroke={healthScore.overall >= 75 ? 'var(--success)' : healthScore.overall >= 50 ? 'var(--warning)' : 'var(--error)'} strokeWidth={8} fill="none" strokeDasharray={351.86} strokeDashoffset={351.86 * (1 - healthScore.overall / 100)} strokeLinecap="round" className="transition-all duration-1000" /></svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold">{healthScore.overall}</span><span className="text-xs text-[var(--text-tertiary)]">/ 100</span></div>
        </div>
        <p className={`text-lg font-bold ${getScoreColor(healthScore.overall)}`}>{getScoreLabel(healthScore.overall)}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {scores.map(s => (
          <div key={s.label} className="fluent-card p-4 text-center">
            <div className="w-16 h-16 mx-auto relative mb-2"><svg width={64} height={64} className="progress-ring"><circle cx={32} cy={32} r={26} stroke="var(--border)" strokeWidth={4} fill="none" /><circle cx={32} cy={32} r={26} stroke={s.score >= 75 ? 'var(--success)' : s.score >= 50 ? 'var(--warning)' : 'var(--error)'} strokeWidth={4} fill="none" strokeDasharray={163.36} strokeDashoffset={163.36 * (1 - s.score / 100)} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold">{s.score}</span></div></div>
            <p className="text-xs font-semibold">{s.label}</p>
            <p className={`text-[10px] ${getScoreColor(s.score)}`}>{getScoreLabel(s.score)}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {scores.filter(s => s.data.issues.length > 0 || s.data.improvements.length > 0).map(s => (
          <div key={s.label} className="fluent-card p-5">
            <h3 className="text-sm font-semibold mb-3">{s.label} Issues & Improvements</h3>
            {s.data.issues.map((issue, i) => (
              <div key={i} className={`p-3 rounded-lg mb-2 border-l-4 ${issue.severity === 'critical' ? 'bg-[var(--error-bg)] border-l-red-500' : issue.severity === 'warning' ? 'bg-[var(--warning-bg)] border-l-yellow-500' : 'bg-[var(--info-bg)] border-l-blue-500'}`}>
                <p className="text-xs font-semibold">{issue.title}</p><p className="text-[11px] text-[var(--text-secondary)]">{issue.description}</p>
              </div>
            ))}
            {s.data.improvements.map((imp, i) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--success-bg)] border-l-4 border-l-green-500 mb-2">
                <p className="text-xs font-semibold">{imp.title}</p><p className="text-[11px] text-[var(--text-secondary)]">{imp.description}</p><p className="text-[10px] text-[var(--success)] mt-1 font-medium">Benefit: {imp.estimatedBenefit}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIChat() {
  const chatMessages = useAppStore(s => s.chatMessages);
  const addChatMessage = useAppStore(s => s.addChatMessage);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: input, timestamp: Date.now() };
    addChatMessage(userMsg);
    setInput('');
    setLoading(true);
    try {
      const response = await api.ai.chat(input);
      addChatMessage(response);
    } finally { setLoading(false); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const suggestions = ['Why is my C drive full?', 'What can I safely delete?', 'Why is memory usage high?', 'How do I improve boot speed?', 'Clean Docker caches'];

  return (
    <div className="flex flex-col h-full max-w-[1000px] mx-auto">
      <div className="mb-4"><h1 className="text-2xl font-bold">AI Optimization Assistant</h1><p className="text-sm text-[var(--text-secondary)]">Ask anything about your system optimization</p></div>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 pb-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center"><span className="text-3xl">🤖</span></div>
            <div className="text-center"><p className="text-lg font-semibold">Windows Intelligence Assistant</p><p className="text-sm text-[var(--text-secondary)] mt-1">Ask me anything about optimizing your system</p></div>
            <div className="flex flex-wrap justify-center gap-2">{suggestions.map(s => (<button key={s} onClick={() => { setInput(s); }} className="px-3 py-2 rounded-lg text-xs bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-fluent">{s}</button>))}</div>
          </div>
        )}
        {chatMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-[var(--accent)] text-white rounded-br-sm' : 'fluent-card rounded-bl-sm'}`}>
              <p className="text-sm whitespace-pre-line">{msg.content}</p>
              {msg.metadata?.actions && msg.metadata.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">{msg.metadata.actions.map((a, i) => (<button key={i} className="px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)] bg-opacity-20 text-[var(--text-accent)] hover:bg-opacity-30 transition-all font-medium">{a.label}</button>))}</div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="fluent-card p-4 rounded-2xl rounded-bl-sm"><div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask about your system..." className="flex-1 bg-transparent text-sm outline-none placeholder-[var(--text-tertiary)]" />
        <button onClick={sendMessage} disabled={!input.trim() || loading} className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}
