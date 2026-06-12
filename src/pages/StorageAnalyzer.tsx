import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize, CATEGORY_COLORS } from '../services/utils';

// ─── Types ──────────────────────────────────────────────
interface FolderNode {
  name: string; path: string; size: number; fileCount?: number; folderCount?: number;
  children: FolderNode[]; lastModified?: number; category?: string;
}
type CleanTab = 'overview' | 'large' | 'old' | 'duplicates' | 'empty';
interface Toast { message: string; type: 'success' | 'error' | 'info'; }
interface ConfirmState { show: boolean; title: string; message: string; paths: string[]; onConfirm: () => Promise<void>; }

// ─── Sunburst Chart ─────────────────────────────────────
const RING_WIDTH = 52;
const CENTER_R = 60;
const MAX_RINGS = 5;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number) {
  const gap = 0.8;
  const s = startAngle + gap;
  const e = endAngle - gap;
  if (e <= s) return '';
  const largeArc = e - s > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, s);
  const p2 = polarToCartesian(cx, cy, rOuter, e);
  const p3 = polarToCartesian(cx, cy, rInner, e);
  const p4 = polarToCartesian(cx, cy, rInner, s);
  return `M${p1.x},${p1.y} A${rOuter},${rOuter} 0 ${largeArc} 1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${rInner},${rInner} 0 ${largeArc} 0 ${p4.x},${p4.y} Z`;
}

function getCategoryColor(cat?: string) {
  return CATEGORY_COLORS[cat || 'other'] || '#6b7280';
}

// ─── Sunburst Component ─────────────────────────────────
function SunburstChart({ nodes, totalSize, onDrillDown, onHover }: {
  nodes: FolderNode[]; totalSize: number; onDrillDown: (node: FolderNode) => void; onHover: (node: FolderNode | null) => void;
}) {
  const [hovered, setHovered] = useState<FolderNode | null>(null);
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;

  const rings = useMemo(() => {
    const result: { path: string; color: string; node: FolderNode; ring: number }[] = [];
    const buildRing = (items: FolderNode[], startAngle: number, endAngle: number, ring: number) => {
      if (ring >= MAX_RINGS || !items.length) return;
      const total = items.reduce((s, n) => s + n.size, 0);
      if (total === 0) return;
      let angle = startAngle;
      for (const item of items) {
        const sweep = ((item.size / total) * (endAngle - startAngle));
        if (sweep < 0.5) { angle += sweep; continue; }
        const rInner = CENTER_R + ring * RING_WIDTH;
        const rOuter = rInner + RING_WIDTH - 2;
        result.push({ path: arcPath(cx, cy, rInner, rOuter, angle, angle + sweep), color: getCategoryColor(item.category), node: item, ring });
        if (item.children?.length) buildRing(item.children, angle, angle + sweep, ring + 1);
        angle += sweep;
      }
    };
    buildRing(nodes, 0, 360, 0);
    return result;
  }, [nodes, cx, cy]);

  return (
    <div className="flex items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[440px] drop-shadow-lg">
        {Array.from({ length: MAX_RINGS }, (_, i) => (
          <circle key={i} cx={cx} cy={cy} r={CENTER_R + (i + 1) * RING_WIDTH} fill="none" stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
        ))}
        <circle cx={cx} cy={cy} r={CENTER_R} fill="var(--bg-card)" stroke="var(--border)" strokeWidth={1} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" fontSize={13} fontWeight={700}>{formatSize(totalSize)}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-tertiary)" fontSize={9}>Total Used</text>
        {rings.map((r, i) => (
          <path key={i} d={r.path} fill={r.color} opacity={hovered === r.node ? 1 : 0.82}
            className="cursor-pointer transition-all duration-150"
            onMouseEnter={() => { setHovered(r.node); onHover(r.node); }}
            onMouseLeave={() => { setHovered(null); onHover(null); }}
            onClick={() => onDrillDown(r.node)} />
        ))}
        {hovered && (
          <g>
            <rect x={cx - 80} y={cy + CENTER_R + 8} width={160} height={44} rx={8} fill="var(--bg-card)" stroke="var(--border)" />
            <text x={cx} y={cy + CENTER_R + 26} textAnchor="middle" fill="var(--text-primary)" fontSize={11} fontWeight={600}>{hovered.name}</text>
            <text x={cx} y={cy + CENTER_R + 42} textAnchor="middle" fill="var(--text-secondary)" fontSize={10}>{formatSize(hovered.size)} {hovered.fileCount ? `· ${hovered.fileCount.toLocaleString()} files` : ''}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── File Type Bar ──────────────────────────────────────
function FileTypeBar({ ext, size, total, color }: { ext: string; size: number; total: number; color: string }) {
  const pct = (size / total) * 100;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-[10px] font-mono w-12 text-right text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">{ext}</span>
      <div className="flex-1 h-5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 1)}%`, background: color }} />
      </div>
      <span className="text-[10px] w-16 text-[var(--text-secondary)]">{formatSize(size)}</span>
      <span className="text-[10px] w-8 text-right text-[var(--text-tertiary)]">{pct.toFixed(1)}%</span>
    </div>
  );
}

// ─── Toast Component ─────────────────────────────────────
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

// ─── Confirm Modal ──────────────────────────────────────
function ConfirmModal({ state, onCancel, onConfirm, isDeleting }: {
  state: ConfirmState; onCancel: () => void; onConfirm: () => void; isDeleting: boolean;
}) {
  if (!state.show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{state.title}</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-2">{state.message}</p>
          {state.paths.length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-[var(--bg-hover)] p-2 space-y-1">
              {state.paths.slice(0, 10).map((p, i) => (
                <p key={i} className="text-[10px] text-[var(--text-tertiary)] truncate font-mono">{p}</p>
              ))}
              {state.paths.length > 10 && <p className="text-[10px] text-[var(--text-tertiary)]">...and {state.paths.length - 10} more</p>}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-4 border-t border-[var(--border)]">
          <button onClick={onCancel} disabled={isDeleting} className="flex-1 fluent-btn fluent-btn-subtle">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 fluent-btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
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
  );
}

// ─── Trash Icon Button ───────────────────────────────────
function TrashButton({ onClick, className = '' }: { onClick: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button className={`w-7 h-7 rounded-lg bg-[var(--bg-hover)] hover:bg-red-500 hover:text-white flex items-center justify-center transition-all flex-shrink-0 ${className}`}
      onClick={onClick}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────
export function StorageAnalyzer() {
  const { storageScan, setStorageScan, setStorageGrowth, storageGrowth, loading, setLoading } = useAppStore();
  const [tab, setTab] = useState<CleanTab>('overview');
  const [breadcrumbs, setBreadcrumbs] = useState<{ node: FolderNode; label: string }[]>([]);
  const [currentNodes, setCurrentNodes] = useState<FolderNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<FolderNode | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'size' | 'name' | 'modified'>('size');
  const [sortAsc, setSortAsc] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({ show: false, title: '', message: '', paths: [], onConfirm: async () => {} });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleScan = async () => {
    setLoading('storage-scan', true);
    try {
      const [scan, growth] = await Promise.all([api.storage.scan(), api.storage.getGrowth()]);
      setStorageScan(scan);
      setStorageGrowth(growth);
    } finally { setLoading('storage-scan', false); }
  };

  useEffect(() => { if (!storageScan) handleScan(); }, []);

  useEffect(() => {
    if (storageScan?.drives?.[0]?.rootFolders) {
      setCurrentNodes(storageScan.drives[0].rootFolders);
      setBreadcrumbs([{ node: null as any, label: storageScan.drives[0].drive + ':' }]);
    }
  }, [storageScan]);

  const drillDown = useCallback((node: FolderNode) => {
    if (node.children?.length) {
      setCurrentNodes(node.children);
      setBreadcrumbs(prev => [...prev, { node, label: node.name }]);
    }
  }, []);

  const navigateTo = useCallback((index: number) => {
    if (index === 0) {
      setCurrentNodes(storageScan?.drives[0]?.rootFolders || []);
      setBreadcrumbs(prev => [prev[0]]);
    } else {
      const target = breadcrumbs[index];
      setCurrentNodes(target.node.children);
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  }, [breadcrumbs, storageScan]);

  // Sorting
  const sortedNodes = useMemo(() => {
    const arr = [...currentNodes];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'size') cmp = a.size - b.size;
      else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = (a.lastModified || 0) - (b.lastModified || 0);
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [currentNodes, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const totalUsed = storageScan?.totalUsed || 0;
  const totalSize = storageScan?.totalSize || 1;

  const fileTypes = useMemo(() => {
    const types: Record<string, number> = {
      '.exe/.dll': 48 * 1e9, '.vhdx/.vmdk': 69 * 1e9, '.zip/.rar/.7z': 18 * 1e9,
      '.mp4/.mkv/.avi': 22 * 1e9, '.jpg/.png/.gif': 8 * 1e9, '.pdf/.docx/.xlsx': 5 * 1e9,
      '.iso': 9 * 1e9, '.log/.tmp': 3 * 1e9, '.js/.ts/.py/.java': 4 * 1e9,
      '.jar/.class': 6 * 1e9, '.db/.sqlite': 2 * 1e9, 'other': 12 * 1e9,
    };
    const total = Object.values(types).reduce((s, v) => s + v, 0);
    const colors = ['#0078D4', '#E3008C', '#CA5010', '#00B294', '#8764B8', '#038387', '#4868D5', '#FF8C00', '#FFB900', '#616161', '#8A8A8A', '#d1d5db'];
    return Object.entries(types).sort((a, b) => b[1] - a[1]).map(([ext, sz], i) => ({ ext, size: sz, color: colors[i % colors.length] }));
  }, []);

  const toggleSelect = (path: string) => setSelectedPaths(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; });
  const selectAll = () => setSelectedPaths(new Set(currentNodes.map(n => n.path)));
  const clearSelection = () => setSelectedPaths(new Set());
  const selectedSize = useMemo(() => currentNodes.filter(n => selectedPaths.has(n.path)).reduce((s, n) => s + n.size, 0), [currentNodes, selectedPaths]);

  // Cleanup items
  const largeFiles = storageScan?.largestFiles || [];
  const oldFiles = [
    { name: 'old_project_backup.zip', path: 'C:\\Users\\User\\Documents\\old_project_backup.zip', size: 4294967296, lastAccessed: Date.now() - 86400000 * 180, extension: '.zip' },
    { name: 'thesis_2019.docx', path: 'C:\\Users\\User\\Documents\\thesis_2019.docx', size: 52428800, lastAccessed: Date.now() - 86400000 * 365, extension: '.docx' },
    { name: 'old_phone_backup', path: 'C:\\Users\\User\\Downloads\\old_phone_backup', size: 8589934592, lastAccessed: Date.now() - 86400000 * 200, extension: '' },
    { name: 'game_save_data', path: 'C:\\Users\\User\\AppData\\Local\\game_save_data', size: 2147483648, lastAccessed: Date.now() - 86400000 * 120, extension: '' },
    { name: 'presentation_final_v2.pptx', path: 'C:\\Users\\User\\Desktop\\presentation_final_v2.pptx', size: 157286400, lastAccessed: Date.now() - 86400000 * 90, extension: '.pptx' },
    { name: 'node-v14.17.0-x64.msi', path: 'C:\\Users\\User\\Downloads\\node-v14.17.0-x64.msi', size: 31457280, lastAccessed: Date.now() - 86400000 * 400, extension: '.msi' },
    { name: 'VisualStudio_2022.iso', path: 'C:\\Users\\User\\Downloads\\VisualStudio_2022.iso', size: 8589934592, lastAccessed: Date.now() - 86400000 * 30, extension: '.iso' },
    { name: 'old_docker_images.tar', path: 'C:\\Users\\User\\.docker\\old_docker_images.tar', size: 12884901888, lastAccessed: Date.now() - 86400000 * 60, extension: '.tar' },
  ];
  const emptyFolders = [
    { path: 'C:\\Users\\User\\Documents\\empty_project', fileCount: 0, size: 0 },
    { path: 'C:\\Users\\User\\Downloads\\temp_extract', fileCount: 0, size: 0 },
    { path: 'C:\\Users\\User\\Desktop\\old_workspace', fileCount: 0, size: 0 },
    { path: 'C:\\Users\\User\\.gradle\\caches\\old-build', fileCount: 0, size: 0 },
    { path: 'C:\\Users\\User\\AppData\\Local\\Temp\\installer_tmp', fileCount: 0, size: 0 },
  ];

  const duplicateGroups = [
    { id: 'g1', files: [
      { name: 'report.pdf', path: 'C:\\Users\\User\\Documents\\report.pdf', size: 1073741824 },
      { name: 'report (1).pdf', path: 'C:\\Users\\User\\Downloads\\report (1).pdf', size: 1073741824 },
    ]},
    { id: 'g2', files: [
      { name: 'vacation.jpg', path: 'C:\\Users\\User\\Photos\\vacation.jpg', size: 536870912 },
      { name: 'vacation.jpg', path: 'C:\\Users\\User\\Downloads\\vacation.jpg', size: 536870912 },
      { name: 'vacation.jpg', path: 'D:\\Backup\\vacation.jpg', size: 536870912 },
      { name: 'vacation_copy.jpg', path: 'C:\\Users\\User\\Desktop\\vacation_copy.jpg', size: 536870912 },
    ]},
    { id: 'g3', files: [
      { name: 'node_modules.zip', path: 'C:\\Users\\User\\Downloads\\node_modules.zip', size: 2147483648 },
      { name: 'node_modules.zip', path: 'C:\\Users\\User\\Documents\\backup\\node_modules.zip', size: 2147483648 },
    ]},
  ];

  // ─── Delete Handlers ───────────────────────────────────
  const executeDelete = async (paths: string[], label: string) => {
    setIsDeleting(true);
    try {
      const result = await api.storage.deleteFiles(paths);
      if (result.errors.length > 0 && result.deleted === 0) {
        setToast({ message: `Failed to delete ${label}: ${result.errors[0]}`, type: 'error' });
      } else {
        setToast({ message: `Deleted ${result.deleted} item${result.deleted !== 1 ? 's' : ''} · Freed ${formatSize(result.freed)}`, type: 'success' });
        setSelectedPaths(new Set());
        // Rescan to refresh data
        await handleScan();
      }
    } catch (err: any) {
      setToast({ message: `Error: ${err.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsDeleting(false);
      setConfirm(prev => ({ ...prev, show: false }));
    }
  };

  const confirmDelete = (title: string, message: string, paths: string[]) => {
    setConfirm({ show: true, title, message, paths, onConfirm: () => executeDelete(paths, title) });
  };

  const handleDeleteLargeFiles = () => {
    const paths = largeFiles.filter(f => selectedPaths.has(f.path)).map(f => f.path);
    const size = largeFiles.filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0);
    if (!paths.length) return;
    confirmDelete('Delete Large Files', `Are you sure you want to permanently delete ${paths.length} file${paths.length !== 1 ? 's' : ''} (${formatSize(size)})? This action cannot be undone.`, paths);
  };

  const handleDeleteOldFiles = () => {
    const paths = oldFiles.filter(f => selectedPaths.has(f.path)).map(f => f.path);
    const size = oldFiles.filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0);
    if (!paths.length) return;
    confirmDelete('Delete Old Files', `Delete ${paths.length} old file${paths.length !== 1 ? 's' : ''} (${formatSize(size)}) that haven't been accessed recently?`, paths);
  };

  const handleDeleteDuplicates = () => {
    const allPaths = duplicateGroups.flatMap(g => g.files.map(f => f.path));
    const paths = allPaths.filter(p => selectedPaths.has(p));
    const size = duplicateGroups.flatMap(g => g.files).filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0);
    if (!paths.length) return;
    confirmDelete('Delete Duplicate Files', `Remove ${paths.length} duplicate file${paths.length !== 1 ? 's' : ''} (${formatSize(size)})? Make sure you keep at least one copy of each group.`, paths);
  };

  const handleDeleteEmptyFolders = () => {
    const paths = emptyFolders.filter(f => selectedPaths.has(f.path)).map(f => f.path);
    if (!paths.length) return;
    confirmDelete('Delete Empty Folders', `Remove ${paths.length} empty folder${paths.length !== 1 ? 's' : ''}? This is safe and helps declutter your file system.`, paths);
  };

  const handleDeleteSingle = (path: string, name: string) => {
    confirmDelete('Delete File', `Permanently delete "${name}"?`, [path]);
  };

  const handleAutoSelectDuplicates = () => {
    // Select all except first (keep) in each group
    const newSet = new Set<string>();
    duplicateGroups.forEach(g => {
      g.files.slice(1).forEach(f => newSet.add(f.path));
    });
    setSelectedPaths(newSet);
  };

  const formatTimeAgo = (ts: number) => {
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days < 1) return 'Today';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const sortIcon = (field: string) => sortField === field ? (sortAsc ? '↑' : '↓') : '';

  const TABS: { id: CleanTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'large', label: 'Large Files', icon: '📦' },
    { id: 'old', label: 'Old Files', icon: '🕐' },
    { id: 'duplicates', label: 'Duplicates', icon: '👯' },
    { id: 'empty', label: 'Empty Folders', icon: '📁' },
  ];

  // Checkbox component
  const Checkbox = ({ checked, onChange }: { checked: boolean; onChange?: () => void }) => (
    <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
      onClick={(e) => { e.stopPropagation(); onChange?.(); }}
      style={{ borderColor: checked ? 'var(--accent)' : 'var(--border-strong)', background: checked ? 'var(--accent)' : 'transparent' }}>
      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>}
    </div>
  );

  // Count selected items relevant to current tab
  const tabSelectedCount = useMemo(() => {
    if (tab === 'large') return largeFiles.filter(f => selectedPaths.has(f.path)).length;
    if (tab === 'old') return oldFiles.filter(f => selectedPaths.has(f.path)).length;
    if (tab === 'duplicates') return duplicateGroups.flatMap(g => g.files).filter(f => selectedPaths.has(f.path)).length;
    if (tab === 'empty') return emptyFolders.filter(f => selectedPaths.has(f.path)).length;
    return 0;
  }, [tab, selectedPaths, largeFiles, oldFiles, emptyFolders, duplicateGroups]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Storage Analyzer</h1>
          <p className="text-sm text-[var(--text-secondary)]">Interactive disk visualization with cleanup tools</p>
        </div>
        <button onClick={handleScan} disabled={loading['storage-scan']} className="fluent-btn fluent-btn-primary flex items-center gap-2">
          {loading['storage-scan'] ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Scanning...</>) : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Scan</>)}
        </button>
      </div>

      {/* Drive Summary Bar */}
      {storageScan && (
        <div className="fluent-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold">C</div>
              <div>
                <p className="text-sm font-semibold">{storageScan.drives[0]?.label || 'Windows'} ({storageScan.drives[0]?.drive}:)</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(totalUsed)} of {formatSize(totalSize)} used</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="text-lg font-bold text-[var(--warning)]">{formatSize(totalUsed)}</p><p className="text-[10px] text-[var(--text-tertiary)]">Used</p></div>
              <div className="text-center"><p className="text-lg font-bold text-[var(--success)]">{formatSize(totalSize - totalUsed)}</p><p className="text-[10px] text-[var(--text-tertiary)]">Free</p></div>
              <div className="text-center"><p className="text-lg font-bold">{((totalUsed / totalSize) * 100).toFixed(1)}%</p><p className="text-[10px] text-[var(--text-tertiary)]">Usage</p></div>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(totalUsed / totalSize) * 100}%`, background: 'linear-gradient(90deg, var(--accent), var(--warning))' }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ─── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-4">
            <div className="fluent-card p-5">
              <SunburstChart nodes={currentNodes} totalSize={totalUsed} onDrillDown={drillDown} onHover={setHoveredNode} />
            </div>
            <div className="flex items-center gap-1 px-2 flex-wrap">
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-[var(--text-tertiary)] text-xs mx-1">›</span>}
                  <button onClick={() => navigateTo(i)}
                    className={`text-xs px-2 py-1 rounded-md transition-all ${i === breadcrumbs.length - 1 ? 'bg-[var(--accent)] text-white font-semibold' : 'text-[var(--text-accent)] hover:bg-[var(--bg-hover)]'}`}>
                    {b.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="fluent-card overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="text-[10px] text-[var(--text-accent)] hover:underline">Select All</button>
                  <span className="text-[var(--border)]">|</span>
                  <button onClick={clearSelection} className="text-[10px] text-[var(--text-accent)] hover:underline">Clear</button>
                  {selectedPaths.size > 0 && <span className="text-[10px] text-[var(--text-tertiary)] ml-2">{selectedPaths.size} selected · {formatSize(selectedSize)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-tertiary)]">Sort:</span>
                  {(['size', 'name', 'modified'] as const).map(f => (
                    <button key={f} onClick={() => toggleSort(f)} className={`text-[10px] px-2 py-0.5 rounded transition-all ${sortField === f ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)} {sortIcon(f)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {sortedNodes.map((node) => {
                  const isSelected = selectedPaths.has(node.path);
                  const pct = totalUsed > 0 ? (node.size / totalUsed) * 100 : 0;
                  return (
                    <div key={node.path} onClick={() => toggleSelect(node.path)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all border-l-3 ${isSelected ? 'bg-[var(--accent)]/10 border-l-[var(--accent)]' : 'border-l-transparent hover:bg-[var(--bg-hover)]'}`}>
                      <Checkbox checked={isSelected} onChange={() => toggleSelect(node.path)} />
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getCategoryColor(node.category) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{node.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">{node.path}</p>
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: getCategoryColor(node.category) }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold w-20 text-right flex-shrink-0">{formatSize(node.size)}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] w-16 text-right flex-shrink-0">{node.fileCount?.toLocaleString() || '—'} files</span>
                      {node.children?.length > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); drillDown(node); }}
                          className="w-7 h-7 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--accent)] hover:text-white flex items-center justify-center transition-all flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="fluent-card p-4 min-h-[140px]">
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Details</h3>
              {hoveredNode ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold">{hoveredNode.name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] break-all">{hoveredNode.path}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">Size</p><p className="text-sm font-semibold">{formatSize(hoveredNode.size)}</p></div>
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">Files</p><p className="text-sm font-semibold">{hoveredNode.fileCount?.toLocaleString() || '—'}</p></div>
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">Folders</p><p className="text-sm font-semibold">{hoveredNode.folderCount?.toLocaleString() || '—'}</p></div>
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">Category</p><p className="text-sm font-semibold capitalize" style={{ color: getCategoryColor(hoveredNode.category) }}>{hoveredNode.category || 'other'}</p></div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)] italic">Hover over a segment to see details</p>
              )}
            </div>
            <div className="fluent-card p-4">
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Categories</h3>
              <div className="space-y-2">
                {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'temp').map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                    <span className="text-[11px] capitalize flex-1">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="fluent-card p-4">
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">File Types</h3>
              <div className="space-y-1.5">
                {fileTypes.map(ft => <FileTypeBar key={ft.ext} ext={ft.ext} size={ft.size} total={totalUsed} color={ft.color} />)}
              </div>
            </div>
            {storageGrowth.length > 0 && (
              <div className="fluent-card p-4">
                <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Growth Alerts</h3>
                {storageGrowth.map((a: any, i: number) => (
                  <div key={i} className={`p-2 rounded-lg mb-2 border-l-3 ${a.severity === 'critical' ? 'bg-red-500/10 border-l-red-500' : 'bg-yellow-500/10 border-l-yellow-500'}`}>
                    <p className="text-[11px] font-medium">{a.message}</p>
                    <p className="text-[10px] text-red-400 font-semibold mt-0.5">+{formatSize(a.growthBytes)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Large Files Tab ─── */}
      {tab === 'large' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">{largeFiles.length} files over 1 GB · Total: {formatSize(largeFiles.reduce((s, f) => s + f.size, 0))}</p>
            <div className="flex gap-2 items-center">
              <button className="text-[10px] text-[var(--text-accent)] hover:underline" onClick={() => setSelectedPaths(new Set(largeFiles.map(f => f.path)))}>Select All</button>
              <span className="text-[var(--border)]">|</span>
              <button className="text-[10px] text-[var(--text-accent)] hover:underline" onClick={clearSelection}>Clear</button>
              {tabSelectedCount > 0 && (
                <button onClick={handleDeleteLargeFiles} className="fluent-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-3 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete {tabSelectedCount} ({formatSize(largeFiles.filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0))})
                </button>
              )}
            </div>
          </div>
          <div className="fluent-card overflow-hidden">
            {largeFiles.sort((a, b) => b.size - a.size).map((file, i) => {
              const sel = selectedPaths.has(file.path);
              return (
                <div key={i} onClick={() => toggleSelect(file.path)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-3 ${sel ? 'bg-[var(--accent)]/10 border-l-[var(--accent)]' : 'border-l-transparent hover:bg-[var(--bg-hover)]'}`}>
                  <div onClick={(e) => e.stopPropagation()}><Checkbox checked={sel} onChange={() => toggleSelect(file.path)} /></div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: `${getCategoryColor('other')}22`, color: getCategoryColor('other') }}>
                    {file.extension === '.iso' ? '💿' : file.extension === '.vhdx' ? '💾' : '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate">{file.path}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--warning)]">{formatSize(file.size)}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">Modified {formatTimeAgo(file.lastModified)}</p>
                  </div>
                  <TrashButton onClick={(e) => { e.stopPropagation(); handleDeleteSingle(file.path, file.name); }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Old Files Tab ─── */}
      {tab === 'old' && (
        <div className="space-y-4 animate-fade-in">
          <div className="fluent-card p-4 bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-l-amber-500">
            <p className="text-sm font-semibold">Files not accessed in 30+ days</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">These files haven't been opened recently. Review and consider archiving or deleting.</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">{oldFiles.length} old files · Potential recovery: {formatSize(oldFiles.reduce((s, f) => s + f.size, 0))}</p>
            <div className="flex gap-2 items-center">
              <button className="text-[10px] text-[var(--text-accent)] hover:underline" onClick={() => setSelectedPaths(new Set(oldFiles.map(f => f.path)))}>Select All</button>
              <span className="text-[var(--border)]">|</span>
              <button className="text-[10px] text-[var(--text-accent)] hover:underline" onClick={clearSelection}>Clear</button>
              {tabSelectedCount > 0 && (
                <button onClick={handleDeleteOldFiles} className="fluent-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-3 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete {tabSelectedCount} ({formatSize(oldFiles.filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0))})
                </button>
              )}
            </div>
          </div>
          <div className="fluent-card overflow-hidden">
            {oldFiles.sort((a, b) => a.lastAccessed - b.lastAccessed).map((file, i) => {
              const sel = selectedPaths.has(file.path);
              const daysAgo = Math.floor((Date.now() - file.lastAccessed) / 86400000);
              return (
                <div key={i} onClick={() => toggleSelect(file.path)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-3 ${sel ? 'bg-[var(--accent)]/10 border-l-[var(--accent)]' : 'border-l-transparent hover:bg-[var(--bg-hover)]'}`}>
                  <div onClick={(e) => e.stopPropagation()}><Checkbox checked={sel} onChange={() => toggleSelect(file.path)} /></div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--bg-hover)' }}>🕐</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate">{file.path}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">{formatSize(file.size)}</p>
                    <p className={`text-[10px] font-medium ${daysAgo > 365 ? 'text-red-400' : daysAgo > 180 ? 'text-orange-400' : 'text-yellow-400'}`}>
                      Last accessed {formatTimeAgo(file.lastAccessed)} ({daysAgo}d)
                    </p>
                  </div>
                  <TrashButton onClick={(e) => { e.stopPropagation(); handleDeleteSingle(file.path, file.name); }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Duplicates Tab ─── */}
      {tab === 'duplicates' && (
        <div className="space-y-4 animate-fade-in">
          <div className="fluent-card p-4 bg-gradient-to-r from-purple-500/10 to-transparent border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Duplicate files detected</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Files with identical content found in multiple locations. Keep one copy and remove the rest.</p>
              </div>
              <button onClick={handleAutoSelectDuplicates} className="fluent-btn fluent-btn-subtle text-[10px] px-3">Auto-Select Copies</button>
            </div>
          </div>
          {tabSelectedCount > 0 && (
            <div className="flex items-center justify-between fluent-card p-3">
              <span className="text-sm text-[var(--text-secondary)]">{tabSelectedCount} duplicate files selected · {formatSize(duplicateGroups.flatMap(g => g.files).filter(f => selectedPaths.has(f.path)).reduce((s, f) => s + f.size, 0))}</span>
              <button onClick={handleDeleteDuplicates} className="fluent-btn bg-red-600 hover:bg-red-700 text-white text-xs px-4 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Selected Duplicates
              </button>
            </div>
          )}
          {duplicateGroups.map((group) => {
            const waste = group.files[0].size * (group.files.length - 1);
            return (
              <div key={group.id} className="fluent-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👯</span>
                    <span className="text-sm font-semibold">{group.files.length} copies of "{group.files[0].name}"</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--warning)]">Wasted: {formatSize(waste)}</span>
                </div>
                {group.files.map((f, i) => {
                  const sel = selectedPaths.has(f.path);
                  return (
                    <div key={i} onClick={() => toggleSelect(f.path)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${sel ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-hover)]'}`}>
                      <div onClick={(e) => e.stopPropagation()}><Checkbox checked={sel} onChange={() => toggleSelect(f.path)} /></div>
                      {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">KEEP</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{f.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">{f.path}</p>
                      </div>
                      <span className="text-xs font-semibold">{formatSize(f.size)}</span>
                      {i > 0 && <TrashButton onClick={(e) => { e.stopPropagation(); handleDeleteSingle(f.path, f.name); }} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Empty Folders Tab ─── */}
      {tab === 'empty' && (
        <div className="space-y-4 animate-fade-in">
          <div className="fluent-card p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-l-blue-500">
            <p className="text-sm font-semibold">{emptyFolders.length} empty folders found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">These folders contain no files and can be safely removed to declutter your file system.</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 items-center">
              <button className="text-[10px] text-[var(--text-accent)] hover:underline" onClick={() => setSelectedPaths(new Set(emptyFolders.map(f => f.path)))}>Select All</button>
              <span className="text-[var(--border)]">|</span>
              <button className="text-[10px] text-[var(--text-accent)] hover:underline" onClick={clearSelection}>Clear</button>
            </div>
            {tabSelectedCount > 0 && (
              <button onClick={handleDeleteEmptyFolders} className="fluent-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-3 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete {tabSelectedCount} Folders
              </button>
            )}
          </div>
          <div className="fluent-card overflow-hidden">
            {emptyFolders.map((folder, i) => {
              const sel = selectedPaths.has(folder.path);
              return (
                <div key={i} onClick={() => toggleSelect(folder.path)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-3 ${sel ? 'bg-[var(--accent)]/10 border-l-[var(--accent)]' : 'border-l-transparent hover:bg-[var(--bg-hover)]'}`}>
                  <div onClick={(e) => e.stopPropagation()}><Checkbox checked={sel} onChange={() => toggleSelect(folder.path)} /></div>
                  <span className="text-sm">📁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{folder.path.split('\\').pop()}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate">{folder.path}</p>
                  </div>
                  <span className="badge badge-info">Empty</span>
                  <TrashButton onClick={(e) => { e.stopPropagation(); handleDeleteSingle(folder.path, folder.path.split('\\').pop() || ''); }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal ─── */}
      <ConfirmModal state={confirm} onCancel={() => !isDeleting && setConfirm(prev => ({ ...prev, show: false }))} onConfirm={confirm.onConfirm} isDeleting={isDeleting} />

      {/* ─── Toast ─── */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
