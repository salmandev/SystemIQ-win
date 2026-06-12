import React, { useState } from 'react';
import { api } from '../services/api';
import { formatSize } from '../services/utils';
import type { RootCauseAnalysis, MachineProfile } from '../../shared/types';

export function AIAnalyzer() {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [profile, setProfile] = useState<MachineProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  React.useEffect(() => {
    api.intelligence.getProfile().then(setProfile);
  }, []);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnalyzed(false);
    await new Promise(r => setTimeout(r, 1500));
    const result = await api.intelligence.analyzeRootCause(query);
    setAnalysis(result);
    setLoading(false);
    setAnalyzed(true);
  };

  const exampleQueries = [
    'My C drive suddenly became full',
    'Why is my computer running slow?',
    'What is using all my disk space?',
    'Docker is consuming too much storage',
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Root Cause Analyzer</h1>
        <p className="text-sm text-[var(--text-secondary)]">Describe your problem in natural language and let AI identify the root cause</p>
      </div>

      {/* Input */}
      <div className="fluent-card p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder='Describe your issue... e.g. "My C drive suddenly became full"'
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-fluent"
            />
          </div>
          <button onClick={handleAnalyze} disabled={loading}
            className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-fluent">
            {loading ? '⏳ Analyzing...' : '🔍 Analyze'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {exampleQueries.map((eq, i) => (
            <button key={i} onClick={() => { setQuery(eq); }}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-fluent">
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Animation */}
      {loading && (
        <div className="fluent-card p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">Analyzing storage event...</p>
            <div className="space-y-1">
              {['Scanning disk usage patterns', 'Comparing with historical data', 'Identifying growth sources', 'Calculating recovery potential'].map((step, i) => (
                <p key={i} className="text-xs text-[var(--text-tertiary)] animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                  {i < 3 ? '✓' : '⟳'} {step}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {analyzed && analysis && (
        <div className="space-y-4 animate-fade-in">
          {/* Cause Identified */}
          <div className="fluent-card p-6 border-l-4 border-l-[var(--accent)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">🎯 Cause Identified</h3>
            <div className="space-y-3">
              {analysis.causes.map((cause, i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-[var(--bg-hover)]">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ background: cause.severity === 'critical' ? 'var(--error)' : cause.severity === 'warning' ? 'var(--warning)' : 'var(--info)', color: 'white' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{cause.description}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono truncate">{cause.path}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs font-bold" style={{ color: cause.severity === 'critical' ? 'var(--error)' : 'var(--warning)' }}>
                        +{formatSize(cause.sizeChange)}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{cause.percentOfTotal}% of total change</span>
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden max-w-[100px]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${cause.percentOfTotal}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="fluent-card p-5 text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Recoverable</p>
              <p className="text-2xl font-bold text-green-500">{formatSize(analysis.totalRecoverable)}</p>
            </div>
            <div className="fluent-card p-5 text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Risk Level</p>
              <p className={`text-2xl font-bold ${analysis.riskLevel === 'low' ? 'text-green-500' : analysis.riskLevel === 'medium' ? 'text-amber-500' : 'text-red-500'}`}>
                {analysis.riskLevel.charAt(0).toUpperCase() + analysis.riskLevel.slice(1)}
              </p>
            </div>
            <div className="fluent-card p-5 text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Causes Found</p>
              <p className="text-2xl font-bold text-[var(--accent)]">{analysis.causes.length}</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="fluent-card p-6">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Recommended Actions</h3>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-hover)]">
                  <span className="text-green-500 text-sm">✓</span>
                  <span className="text-sm text-[var(--text-secondary)]">{rec}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold hover:opacity-90 transition-fluent">
              ⚡ Execute All — Recover {formatSize(analysis.totalRecoverable)}
            </button>
          </div>
        </div>
      )}

      {/* Storage DNA (Feature #5) */}
      {profile && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Storage DNA</h2>
          <div className="fluent-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-2xl">🧬</div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Your Drive Personality</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{profile.personality.label}</p>
              </div>
            </div>

            {/* DNA Bar */}
            <div className="h-6 rounded-full overflow-hidden flex mb-4">
              {profile.personality.breakdown.map((b, i) => {
                const total = profile.personality.breakdown.reduce((s, x) => s + x.size, 0);
                const pct = (b.size / total) * 100;
                return <div key={i} style={{ width: `${pct}%`, background: b.color }} className="h-full transition-all duration-500" title={`${b.category}: ${formatSize(b.size)}`} />;
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-3">
              {profile.personality.breakdown.map((b, i) => {
                const total = profile.personality.breakdown.reduce((s, x) => s + x.size, 0);
                return (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-hover)]">
                    <div className="w-3 h-3 rounded-sm" style={{ background: b.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{b.category}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(b.size)} ({((b.size / total) * 100).toFixed(1)}%)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
