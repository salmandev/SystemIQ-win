import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize } from '../services/utils';

export function JunkCleaner() {
  const { junkScan, setJunkScan, loading, setLoading } = useAppStore();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => { if (!junkScan) handleScan(); }, []);

  const handleScan = async () => {
    setLoading('junk-scan', true);
    try {
      const scan = await api.junk.scan();
      setJunkScan(scan);
      // Auto-select safe+recommended categories
      const selected = new Set<string>();
      scan.categories.forEach((c: any) => { if (c.recommended) selected.add(c.id); });
      setSelectedCategories(selected);
    } finally {
      setLoading('junk-scan', false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedCategories(new Set(junkScan?.categories.map(c => c.id) || []));
  const selectNone = () => setSelectedCategories(new Set());

  const handleClean = async () => {
    setCleaning(true);
    try {
      const items = junkScan?.categories.filter(c => selectedCategories.has(c.id)).flatMap(c => c.items.map(i => i.path)) || [];
      await api.junk.clean(items);
      await handleScan();
    } finally {
      setCleaning(false);
    }
  };

  const selectedSize = junkScan?.categories.filter(c => selectedCategories.has(c.id)).reduce((s, c) => s + c.size, 0) || 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Junk Cleaner</h1>
          <p className="text-sm text-[var(--text-secondary)]">Detect and clean Windows, browser, and developer tool caches</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleScan} disabled={loading['junk-scan']} className="fluent-btn fluent-btn-subtle">
            {loading['junk-scan'] ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {junkScan && (
        <div className="grid grid-cols-3 gap-4">
          <div className="fluent-card p-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)]">Total Junk Found</p>
            <p className="text-xl font-bold text-[var(--warning)]">{formatSize(junkScan.totalRecoverable)}</p>
          </div>
          <div className="fluent-card p-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)]">Categories</p>
            <p className="text-xl font-bold">{junkScan.categories.length}</p>
          </div>
          <div className="fluent-card p-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)]">Selected to Clean</p>
            <p className="text-xl font-bold text-[var(--success)]">{formatSize(selectedSize)}</p>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      {junkScan && (
        <div className="flex items-center justify-between fluent-card p-3">
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-[var(--text-accent)] hover:underline">Select All</button>
            <span className="text-[var(--border)]">|</span>
            <button onClick={selectNone} className="text-xs text-[var(--text-accent)] hover:underline">Select None</button>
          </div>
          <button onClick={handleClean} disabled={cleaning || selectedSize === 0}
            className="fluent-btn fluent-btn-primary">
            {cleaning ? 'Cleaning...' : `Clean ${formatSize(selectedSize)}`}
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {junkScan?.categories.map(cat => (
          <div key={cat.id} onClick={() => toggleCategory(cat.id)}
            className={`fluent-card p-4 cursor-pointer transition-all border-2 ${selectedCategories.has(cat.id) ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--border-strong)]'}`}>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{ borderColor: selectedCategories.has(cat.id) ? 'var(--accent)' : 'var(--border-strong)', background: selectedCategories.has(cat.id) ? 'var(--accent)' : 'transparent' }}>
                {selectedCategories.has(cat.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-semibold">{cat.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>{formatSize(cat.size)}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{cat.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-[var(--text-tertiary)]">{cat.itemCount.toLocaleString()} items</span>
                  <span className={`badge ${cat.riskLevel === 'safe' ? 'badge-safe' : cat.riskLevel === 'moderate' ? 'badge-warning' : 'badge-error'}`}>
                    {cat.riskLevel}
                  </span>
                  {cat.recommended && <span className="badge badge-info">recommended</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading['junk-scan'] && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center animate-pulse-subtle">
              <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Scanning for junk files...</p>
          </div>
        </div>
      )}
    </div>
  );
}
