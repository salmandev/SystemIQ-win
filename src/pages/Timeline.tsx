import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatSize } from '../services/utils';
import type { StorageTimelineEntry } from '../../shared/types';

export function Timeline() {
  const [entries, setEntries] = useState<StorageTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.intelligence.getTimeline().then((data: StorageTimelineEntry[] | null) => { setEntries(data || []); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl">⏳</div>
        <p className="text-sm text-[var(--text-secondary)]">Building your storage timeline...</p>
      </div>
    </div>
  );

  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];
  const totalChange = firstEntry && lastEntry ? firstEntry.driveFree - lastEntry.driveFree : 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">What Changed?</h1>
        <p className="text-sm text-[var(--text-secondary)]">Like Git history for your PC — track every storage change over time</p>
      </div>

      {/* Summary */}
      {firstEntry && lastEntry && (
        <div className="grid grid-cols-3 gap-4">
          <div className="fluent-card p-5">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Free Space (Start)</p>
            <p className="text-2xl font-bold text-green-500">{formatSize(firstEntry.driveFree)}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{firstEntry.date}</p>
          </div>
          <div className="fluent-card p-5">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Free Space (Now)</p>
            <p className="text-2xl font-bold text-red-500">{formatSize(lastEntry.driveFree)}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{lastEntry.date}</p>
          </div>
          <div className="fluent-card p-5">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Total Change</p>
            <p className="text-2xl font-bold text-[var(--error)]">-{formatSize(totalChange)}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">over {entries.length} snapshots</p>
          </div>
        </div>
      )}

      {/* Visual Bar Chart */}
      <div className="fluent-card p-6">
        <h3 className="text-sm font-semibold mb-4 text-[var(--text-primary)]">Free Space Over Time</h3>
        <div className="flex items-end gap-2 h-48">
          {entries.map((entry, i) => {
            const maxFree = Math.max(...entries.map(e => e.driveFree));
            const pct = (entry.driveFree / entry.driveTotal) * 100;
            const barHeight = (entry.driveFree / maxFree) * 100;
            const color = pct > 30 ? 'var(--success)' : pct > 15 ? 'var(--warning)' : 'var(--error)';
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex-1 flex items-end">
                  <div className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
                    style={{ height: `${barHeight}%`, background: color, minHeight: 4 }}
                    title={`${entry.date}: ${formatSize(entry.driveFree)} free`} />
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2 py-1 shadow-lg z-10 whitespace-nowrap">
                    <p className="text-[10px] font-semibold">{formatSize(entry.driveFree)} free</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{pct.toFixed(1)}%</p>
                  </div>
                </div>
                <span className="text-[9px] text-[var(--text-tertiary)] transform -rotate-45 origin-top-left whitespace-nowrap">{entry.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Entries */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Change Log</h3>
        {entries.slice().reverse().map((entry, i) => (
          <div key={i} className="flex gap-4 items-start">
            {/* Date column */}
            <div className="w-24 flex-shrink-0 text-right pt-3">
              <p className="text-xs font-bold text-[var(--text-primary)]">{entry.date.slice(5)}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(entry.driveFree)}</p>
            </div>
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 ${entry.changes.length > 0 ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)] bg-transparent'}`} />
              {i < entries.length - 1 && <div className="w-px flex-1 bg-[var(--border)] min-h-[40px]" />}
            </div>
            {/* Content */}
            <div className="flex-1 pb-4">
              {entry.changes.length > 0 ? (
                <div className="fluent-card p-3 space-y-1.5">
                  {entry.changes.map((change, ci) => (
                    <div key={ci} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{change.icon}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{change.category}</span>
                      </div>
                      <span className="text-xs font-bold text-red-500">+{formatSize(change.change)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[var(--text-tertiary)] italic pt-1">No significant changes</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
