import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatSize } from '../services/utils';
import type { PrivacyScanResult } from '../../shared/types';

export function SecurityPrivacy() {
  const [scan, setScan] = useState<PrivacyScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cleaned, setCleaned] = useState<Record<string, boolean>>({});

  useEffect(() => {
    handleScan();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 800));
    const result = await api.intelligence.scanPrivacy();
    setScan(result);
    setScanning(false);
  };

  const handleClean = (id: string) => {
    setCleaned(c => ({ ...c, [id]: true }));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Security & Privacy</h1>
          <p className="text-sm text-[var(--text-secondary)]">Clean privacy traces and protect your digital footprint</p>
        </div>
        <button onClick={handleScan} disabled={scanning}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-fluent disabled:opacity-50">
          {scanning ? '🔍 Scanning...' : '🔄 Re-scan'}
        </button>
      </div>

      {!scan || scanning ? (
        <div className="fluent-card p-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Scanning for privacy traces...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="fluent-card p-5 text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Privacy Traces</p>
              <p className="text-2xl font-bold text-red-500">
                {scan.browserTrackers.reduce((s, b) => s + b.count, 0) + scan.activityHistory.reduce((s, a) => s + a.count, 0)}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">items found</p>
            </div>
            <div className="fluent-card p-5 text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Recoverable</p>
              <p className="text-2xl font-bold text-green-500">{formatSize(scan.totalRecoverable)}</p>
            </div>
            <div className="fluent-card p-5 text-center">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Sensitive Files</p>
              <p className="text-2xl font-bold text-amber-500">{scan.recentFiles.length}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">recently accessed</p>
            </div>
          </div>

          {/* Browser Trackers */}
          <div className="fluent-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">🌐 Browser Trackers</h3>
              {!cleaned['trackers'] ? (
                <button onClick={() => handleClean('trackers')} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/30">Clean All</button>
              ) : (
                <span className="text-xs text-green-500 font-medium">✅ Cleaned</span>
              )}
            </div>
            <div className="space-y-2">
              {scan.browserTrackers.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-hover)]">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{b.browser === 'Chrome' ? '🟢' : b.browser === 'Edge' ? '🔷' : '🟠'}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{b.browser}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{b.count} tracking cookies</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{formatSize(b.size)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity History */}
          <div className="fluent-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">📋 Activity History</h3>
              {!cleaned['activity'] ? (
                <button onClick={() => handleClean('activity')} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/30">Clear All</button>
              ) : (
                <span className="text-xs text-green-500 font-medium">✅ Cleared</span>
              )}
            </div>
            <div className="space-y-2">
              {scan.activityHistory.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-hover)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{a.type}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{a.count} entries</p>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{formatSize(a.size)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clipboard & Search */}
          <div className="grid grid-cols-2 gap-4">
            <div className="fluent-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">📋 Clipboard History</h3>
                {!cleaned['clipboard'] ? (
                  <button onClick={() => handleClean('clipboard')} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/30">Clear</button>
                ) : (
                  <span className="text-xs text-green-500 font-medium">✅ Done</span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{scan.clipboardHistory.count} items stored</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{scan.clipboardHistory.enabled ? 'Currently enabled' : 'Currently disabled'}</p>
            </div>
            <div className="fluent-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">🔍 Search History</h3>
                {!cleaned['search'] ? (
                  <button onClick={() => handleClean('search')} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/30">Clear</button>
                ) : (
                  <span className="text-xs text-green-500 font-medium">✅ Done</span>
                )}
              </div>
              {scan.searchHistory.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{s.browser}</span>
                  <span className="font-bold text-[var(--text-primary)]">{s.entries} entries</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sensitive Recent Files */}
          <div className="fluent-card p-5">
            <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">🗂️ Recently Accessed Sensitive Files</h3>
            <div className="space-y-2">
              {scan.recentFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-hover)]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{f.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono truncate">{f.path}</p>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0 ml-3">{new Date(f.accessed).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clean All */}
          {Object.keys(cleaned).length < 4 && (
            <button onClick={() => { handleClean('trackers'); handleClean('activity'); handleClean('clipboard'); handleClean('search'); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-fluent">
              🧹 Clean All Privacy Traces — Recover {formatSize(scan.totalRecoverable)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
