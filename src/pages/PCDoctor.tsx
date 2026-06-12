import React, { useState } from 'react';
import { api } from '../services/api';
import type { PCHealthReport } from '../../shared/types';

export function PCDoctor() {
  const [report, setReport] = useState<PCHealthReport | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const checks = ['Storage scan', 'Startup scan', 'Memory analysis', 'Driver check', 'Windows health', 'Security checks'];

  const handleDiagnose = async () => {
    setRunning(true);
    setProgress(0);
    for (let i = 0; i < checks.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setProgress(((i + 1) / checks.length) * 100);
    }
    const result = await api.intelligence.diagnosePC();
    setReport(result);
    setRunning(false);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">PC Health Doctor</h1>
          <p className="text-sm text-[var(--text-secondary)]">Comprehensive diagnosis like Apple Genius Bar — for your Windows PC</p>
        </div>
      </div>

      {/* Diagnose Button */}
      {!report && !running && (
        <div className="fluent-card p-12 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-5xl shadow-2xl">
            🩺
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Diagnose My PC</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Runs a comprehensive check of your storage, startup, memory, drivers, Windows health, and security</p>
          </div>
          <button onClick={handleDiagnose}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold hover:opacity-90 transition-fluent shadow-lg">
            🏥 Start Full Diagnosis
          </button>
        </div>
      )}

      {/* Running Progress */}
      {running && (
        <div className="fluent-card p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
              <span className="text-3xl">🔍</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Running Diagnosis...</h3>
              <p className="text-sm text-[var(--text-secondary)]">Please wait while we scan your system</p>
            </div>
          </div>
          <div className="h-3 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {checks.map((check, i) => {
              const done = progress >= ((i + 1) / checks.length) * 100;
              const active = !done && progress >= (i / checks.length) * 100;
              return (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${done ? 'bg-green-500/10' : active ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg-hover)]'}`}>
                  <span className="text-sm">{done ? '✅' : active ? '⟳' : '○'}</span>
                  <span className={`text-xs ${done ? 'text-green-500' : active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}>{check}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-6 animate-fade-in">
          {/* Overall Score */}
          <div className="fluent-card p-8 flex items-center gap-8">
            <div className="relative">
              <svg width={120} height={120} className="progress-ring">
                <circle cx={60} cy={60} r={52} stroke="var(--border)" strokeWidth={8} fill="none" />
                <circle cx={60} cy={60} r={52}
                  stroke={report.overall >= 80 ? 'var(--success)' : report.overall >= 60 ? 'var(--warning)' : 'var(--error)'}
                  strokeWidth={8} fill="none"
                  strokeDasharray={326.73} strokeDashoffset={326.73 * (1 - report.overall / report.maxScore)}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{report.overall}</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">/ {report.maxScore}</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">PC Health Report</h2>
              <p className={`text-lg font-semibold mt-1 ${report.overall >= 80 ? 'text-green-500' : report.overall >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                Overall: {report.overall >= 80 ? 'Good' : report.overall >= 60 ? 'Needs Attention' : 'Critical'}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{report.issues.length} issues found</p>
            </div>
          </div>

          {/* Check Results */}
          <div className="fluent-card p-5">
            <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Diagnostic Checks</h3>
            <div className="grid grid-cols-2 gap-3">
              {report.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-hover)]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    check.status === 'pass' ? 'bg-green-500/20 text-green-500' :
                    check.status === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '✕'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{check.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{check.detail}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold" style={{ color: check.status === 'pass' ? 'var(--success)' : 'var(--warning)' }}>
                    {check.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Issues */}
          <div className="fluent-card p-5">
            <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Issues Found</h3>
            <div className="space-y-2">
              {report.issues.map((issue, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                  issue.severity === 'critical' ? 'bg-red-500/10' :
                  issue.severity === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                }`}>
                  <span className="text-lg flex-shrink-0">{issue.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{issue.title}</p>
                      {issue.fixable && <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-500 text-[10px] font-bold">FIXABLE</span>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{issue.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fix Plan */}
          <div className="fluent-card p-6 border-l-4 border-l-green-500">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">⚡ Fix Plan</h3>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Estimated Time</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{report.fixPlan.estimatedMinutes} minutes</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Expected Improvement</p>
                <p className="text-lg font-bold text-green-500">+{report.fixPlan.expectedImprovement}%</p>
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              {report.fixPlan.actions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="text-green-500">{i + 1}.</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold hover:opacity-90 transition-fluent">
              🔧 Execute Fix Plan
            </button>
          </div>

          {/* Re-diagnose */}
          <button onClick={() => { setReport(null); handleDiagnose(); }}
            className="w-full py-3 rounded-xl bg-[var(--bg-hover)] text-sm text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white transition-fluent">
            ↻ Re-run Diagnosis
          </button>
        </div>
      )}
    </div>
  );
}
