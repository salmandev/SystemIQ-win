import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize } from '../services/utils';

interface Toast { message: string; type: 'success' | 'error' | 'info'; }
interface ConfirmState { show: boolean; title: string; message: string; paths: string[]; }

function ToastNotification({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  useEffect(() => {
    if (toast) { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }
  }, [toast, onDismiss]);
  if (!toast) return null;
  const colors = { success: 'bg-emerald-600/90 border-emerald-500', error: 'bg-red-600/90 border-red-500', info: 'bg-blue-600/90 border-blue-500' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border text-white shadow-2xl animate-slide-up ${colors[toast.type]}`}>
      <span className="text-lg font-bold">{icons[toast.type]}</span>
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 text-white/60 hover:text-white">✕</button>
    </div>
  );
}

export function DuplicateFinder() {
  const duplicateScan = useAppStore(s => s.duplicateScan);
  const setDuplicateScan = useAppStore(s => s.setDuplicateScan);
  const loading = useAppStore(s => s.loading);
  const setLoading = useAppStore(s => s.setLoading);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({ show: false, title: '', message: '', paths: [] });

  useEffect(() => {
    api.cache.get('duplicates-scan').then((c: any) => {
      if (c?.data) setDuplicateScan(c.data as any);
      else if (!duplicateScan) handleScan();
    }).catch(() => { if (!duplicateScan) handleScan(); });
  }, []);

  const handleScan = async () => {
    setLoading('dup-scan', true);
    try { setDuplicateScan(await api.duplicates.scan(['C:\\Users'])); } finally { setLoading('dup-scan', false); }
  };

  const toggleSelect = (path: string) => {
    setSelectedPaths(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; });
  };

  const autoSelectCopies = () => {
    // Select all files except the first (keep) in each group
    const newSet = new Set<string>();
    duplicateScan?.groups.forEach(g => {
      g.files.slice(1).forEach(f => newSet.add(f.path));
    });
    setSelectedPaths(newSet);
  };

  const clearSelection = () => setSelectedPaths(new Set());

  const handleDelete = async () => {
    const paths = Array.from(selectedPaths);
    if (!paths.length) return;
    setIsDeleting(true);
    try {
      const result = await api.duplicates.clean(paths);
      if (result.errors.length > 0 && result.cleaned === 0) {
        setToast({ message: `Failed to delete: ${result.errors[0]}`, type: 'error' });
      } else {
        setToast({ message: `Removed ${result.cleaned} duplicate${result.cleaned !== 1 ? 's' : ''} · Freed ${formatSize(result.freed)}`, type: 'success' });
        setSelectedPaths(new Set());
        await handleScan();
      }
    } catch (err: any) {
      setToast({ message: `Error: ${err.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsDeleting(false);
      setConfirm(prev => ({ ...prev, show: false }));
    }
  };

  const handleDeleteSingle = (path: string, name: string) => {
    setConfirm({ show: true, title: 'Delete Duplicate', message: `Permanently delete "${name}"?`, paths: [path] });
  };

  const confirmBatchDelete = () => {
    const paths = Array.from(selectedPaths);
    const totalSize = duplicateScan?.groups.flatMap(g => g.files).filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0) || 0;
    setConfirm({
      show: true,
      title: 'Delete Duplicate Files',
      message: `Remove ${paths.length} duplicate file${paths.length !== 1 ? 's' : ''} (${formatSize(totalSize)})? Make sure you keep at least one copy of each group.`,
      paths,
    });
  };

  const selectedCount = selectedPaths.size;
  const selectedSize = duplicateScan?.groups.flatMap(g => g.files).filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0) || 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Duplicate Finder</h1>
          <p className="text-sm text-[var(--text-secondary)]">Find and remove duplicate files using hash comparison</p>
        </div>
        <button onClick={handleScan} disabled={loading['dup-scan']} className="fluent-btn fluent-btn-primary">{loading['dup-scan'] ? 'Scanning...' : 'Scan for Duplicates'}</button>
      </div>

      {duplicateScan && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="fluent-card p-4 text-center">
              <p className="text-xs text-[var(--text-tertiary)]">Total Wasted Space</p>
              <p className="text-xl font-bold text-[var(--error)]">{formatSize(duplicateScan.totalWasted)}</p>
            </div>
            <div className="fluent-card p-4 text-center">
              <p className="text-xs text-[var(--text-tertiary)]">Duplicate Groups</p>
              <p className="text-xl font-bold">{duplicateScan.groups.length}</p>
            </div>
            <div className="fluent-card p-4 text-center">
              <p className="text-xs text-[var(--text-tertiary)]">Total Duplicate Files</p>
              <p className="text-xl font-bold">{duplicateScan.groups.reduce((s, g) => s + g.files.length - 1, 0)}</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between fluent-card p-3">
            <div className="flex items-center gap-3">
              <button onClick={autoSelectCopies} className="text-xs text-[var(--text-accent)] hover:underline">Auto-Select Copies</button>
              <span className="text-[var(--border)]">|</span>
              <button onClick={clearSelection} className="text-xs text-[var(--text-accent)] hover:underline">Clear Selection</button>
              {selectedCount > 0 && (
                <span className="text-xs text-[var(--text-tertiary)] ml-2">{selectedCount} selected · {formatSize(selectedSize)}</span>
              )}
            </div>
            {selectedCount > 0 && (
              <button onClick={confirmBatchDelete} disabled={isDeleting}
                className="fluent-btn bg-red-600 hover:bg-red-700 text-white text-xs px-4 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {isDeleting ? 'Deleting...' : `Delete ${selectedCount} Duplicates (${formatSize(selectedSize)})`}
              </button>
            )}
          </div>

          {/* Groups */}
          <div className="space-y-3">
            {duplicateScan.groups.map(group => (
              <div key={group.id} className="fluent-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👯</span>
                    <div>
                      <p className="text-sm font-semibold">{group.files.length} duplicate files</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Each {formatSize(group.size)} · Potential savings: {formatSize(group.savingsIfCleaned)}</p>
                    </div>
                  </div>
                  <span className="badge badge-warning">{formatSize(group.savingsIfCleaned)} recoverable</span>
                </div>
                <div className="space-y-1">
                  {group.files.map((file, i) => {
                    const sel = selectedPaths.has(file.path);
                    return (
                      <div key={i} onClick={() => toggleSelect(file.path)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                          i === 0 && !sel ? 'bg-green-500/8 border border-green-500/20' :
                          sel ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30' :
                          'bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/80'
                        }`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Checkbox */}
                          <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ borderColor: sel ? 'var(--accent)' : 'var(--border-strong)', background: sel ? 'var(--accent)' : 'transparent' }}>
                            {sel && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">KEEP</span>}
                          <span className="text-xs font-medium truncate">{file.name}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)] truncate">{file.path}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-[var(--text-tertiary)]">{formatSize(file.size)}</span>
                          {i > 0 && (
                            <button className="w-6 h-6 rounded-md bg-[var(--bg-hover)] hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                              onClick={(e) => { e.stopPropagation(); handleDeleteSingle(file.path, file.name); }}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirm Modal */}
      {confirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setConfirm(prev => ({ ...prev, show: false }))}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{confirm.title}</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-2">{confirm.message}</p>
              {confirm.paths.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-[var(--bg-hover)] p-2 space-y-1">
                  {confirm.paths.slice(0, 10).map((p, i) => (
                    <p key={i} className="text-[10px] text-[var(--text-tertiary)] truncate font-mono">{p}</p>
                  ))}
                  {confirm.paths.length > 10 && <p className="text-[10px] text-[var(--text-tertiary)]">...and {confirm.paths.length - 10} more</p>}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-[var(--border)]">
              <button onClick={() => setConfirm(prev => ({ ...prev, show: false }))} disabled={isDeleting} className="flex-1 fluent-btn fluent-btn-subtle">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 fluent-btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Deleting...
                  </span>
                ) : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
