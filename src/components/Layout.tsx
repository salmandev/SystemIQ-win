import React, { ReactNode, useState, useEffect, useCallback, memo } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { formatSize, formatDuration } from '../services/utils';

// ---- Navigation Items ----
const navItems = [
  // Main
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', group: 'Main' },
  { id: 'health-score', label: 'Health Score', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', group: 'Main' },
  { id: 'pc-doctor', label: 'PC Doctor', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', group: 'Main' },
  { id: 'ai-chat', label: 'AI Assistant', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', group: 'Main' },

  // Analyze
  { id: 'storage', label: 'Storage', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', group: 'Analyze' },
  { id: 'timeline', label: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', group: 'Analyze' },
  { id: 'ai-analyzer', label: 'Root Cause AI', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', group: 'Analyze' },
  { id: 'processes', label: 'Processes', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', group: 'Analyze' },
  { id: 'app-intelligence', label: 'Apps', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', group: 'Analyze' },
  { id: 'security-privacy', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', group: 'Analyze' },

  // Clean
  { id: 'junk', label: 'Junk Cleaner', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', group: 'Clean' },
  { id: 'duplicates', label: 'Duplicates', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z', group: 'Clean' },
  { id: 'optimization', label: 'Quick Optimize', icon: 'M13 10V3L4 14h7v7l9-11h-7z', group: 'Clean' },

  // Optimize
  { id: 'opt-modes', label: 'Smart Modes', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', group: 'Optimize' },
  { id: 'resources', label: 'Resources', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', group: 'Optimize' },
  { id: 'startup', label: 'Startup', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', group: 'Optimize' },
  { id: 'ssd-health', label: 'SSD Health', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', group: 'Optimize' },

  // System
  { id: 'developer-center', label: 'Dev Center', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', group: 'System' },
  { id: 'automation', label: 'Automation', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', group: 'System' },
  { id: 'plugins', label: 'Plugins', icon: 'M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z', group: 'System' },
  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', group: 'System' },
];

// ---- SVG Icon Component ----
function Icon({ path, className = 'w-5 h-5' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

// ---- Title Bar ----
const TitleBar = memo(function TitleBar() {
  const theme = useAppStore(s => s.theme);
  const toggleTheme = useAppStore(s => s.toggleTheme);
  const searchOpen = useAppStore(s => s.searchOpen);
  const toggleSearch = useAppStore(s => s.toggleSearch);
  const searchQuery = useAppStore(s => s.searchQuery);
  const setSearchQuery = useAppStore(s => s.setSearchQuery);
  const setPage = useAppStore(s => s.setPage);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => api.window.minimize();
  const handleMaximize = () => { api.window.maximize(); setIsMaximized(!isMaximized); };
  const handleClose = () => api.window.close();

  return (
    <div className="flex items-center h-10 bg-[var(--bg-titlebar)] border-b border-[var(--border)] select-none z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {/* App Icon & Title */}
      <div className="flex items-center gap-2 px-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-[var(--accent)] to-purple-500" />
        <span className="text-xs font-semibold text-[var(--text-secondary)]">SystemIQ</span>
      </div>

      {/* Search Bar - Draggable spacer, only button/input is no-drag */}
      <div className="flex-1 flex justify-center" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        {searchOpen ? (
          <div className="flex items-center gap-2 w-96 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1 animate-fade-in" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search everywhere..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder-[var(--text-tertiary)]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Escape') toggleSearch(); }}
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)]">Esc</kbd>
          </div>
        ) : (
          <button onClick={toggleSearch} className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] ml-2">Ctrl+K</kbd>
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 pr-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-fluent text-[var(--text-secondary)]" title="Toggle theme">
          {theme === 'dark' ? (
            <Icon path="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" className="w-4 h-4" />
          ) : (
            <Icon path="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" className="w-4 h-4" />
          )}
        </button>
        <button onClick={() => setPage('ai-chat')} className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-fluent text-[var(--text-secondary)]" title="AI Assistant">
          <Icon path="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <button onClick={handleMinimize} className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-fluent text-[var(--text-secondary)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14" /></svg>
        </button>
        <button onClick={handleMaximize} className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-fluent text-[var(--text-secondary)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isMaximized ? <path d="M8 8h8v8H8zM4 4h6v2H6v4H4zm10 10h4v-4h2v6h-6z" /> : <path d="M4 4h16v16H4z" />}
          </svg>
        </button>
        <button onClick={handleClose} className="p-2 rounded-md hover:bg-red-500 hover:text-white transition-fluent text-[var(--text-secondary)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
});

// ---- Sidebar ----
const Sidebar = memo(function Sidebar() {
  const currentPage = useAppStore(s => s.currentPage);
  const setPage = useAppStore(s => s.setPage);
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed);
  const toggleSidebar = useAppStore(s => s.toggleSidebar);

  const groups = Array.from(new Set(navItems.map(i => i.group)));

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] ${sidebarCollapsed ? 'w-[52px]' : 'w-[220px]'}`} style={{ transition: 'width 0.3s ease-in-out' }}>
      {/* Logo */}
      <div className={`flex items-center gap-3 h-10 border-b border-[var(--border)] flex-shrink-0 ${sidebarCollapsed ? 'justify-center px-1' : 'px-3'}`}>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-white text-[10px] font-bold">IQ</span>
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in overflow-hidden">
            <div className="text-sm font-bold gradient-text leading-tight">SystemIQ</div>
            <div className="text-[9px] text-[var(--text-tertiary)]">v1.0.0</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {groups.map((group, gi) => (
          <div key={group} className={gi > 0 ? 'mt-1' : ''}>
            {/* Group divider */}
            {gi > 0 && (
              <div className={`mx-3 my-1.5 border-t border-[var(--border)]`} />
            )}
            {!sidebarCollapsed && (
              <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest px-3 mb-0.5">
                {group}
              </div>
            )}
            <div className={sidebarCollapsed ? 'px-1.5' : 'px-2'}>
              {navItems.filter(i => i.group === group).map(item => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id as any)}
                    className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] transition-all duration-150 mb-0.5 relative
                      ${sidebarCollapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[6px]'}
                      ${isActive
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent)]" />
                    )}
                    <Icon path={item.icon} className={`flex-shrink-0 ${sidebarCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button onClick={toggleSidebar} className="flex items-center justify-center py-2.5 border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-fluent text-[var(--text-tertiary)]">
        <svg className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
});

// ---- Main Layout ----
export function Layout({ children }: { children: ReactNode }) {
  const setSystemInfo = useAppStore(s => s.setSystemInfo);
  const setRealtimeData = useAppStore(s => s.setRealtimeData);
  const setHealthScore = useAppStore(s => s.setHealthScore);
  const setRecommendations = useAppStore(s => s.setRecommendations);
  const systemInfo = useAppStore(s => s.systemInfo);
  const [bgScanning, setBgScanning] = useState(false);

  // Load cached data instantly on mount, then subscribe to updates
  useEffect(() => {
    const loadCached = async () => {
      try {
        // Try to load system info from cache first (instant)
        const cachedSys = await api.cache.get('system-info');
        if (cachedSys?.data) setSystemInfo(cachedSys.data as any);

        const cachedHealth = await api.cache.get('health-score');
        if (cachedHealth?.data) setHealthScore(cachedHealth.data as any);

        const cachedRecs = await api.cache.get('recommendations');
        if (cachedRecs?.data) setRecommendations(cachedRecs.data as any);
      } catch { /* cache not available */ }
    };
    loadCached();

    // Also fetch fresh system info if not cached
    if (!systemInfo) {
      api.system.getInfo().then((info: any) => { if (info) setSystemInfo(info); }).catch(() => {});
    }

    // Realtime updates every 3 seconds (reduced from 2s for performance)
    const interval = setInterval(async () => {
      try {
        const data = await api.system.getRealtime();
        setRealtimeData(data);
      } catch { /* ignore */ }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to background cache updates
  useEffect(() => {
    const handler = (update: { key: string; timestamp: number }) => {
      // When cache updates, refresh relevant store data
      if (update.key === 'system-info') {
        api.cache.get('system-info').then((entry: any) => {
          if (entry?.data) setSystemInfo(entry.data as any);
        }).catch(() => {});
      }
      if (update.key === 'health-score') {
        api.cache.get('health-score').then((entry: any) => {
          if (entry?.data) setHealthScore(entry.data as any);
        }).catch(() => {});
      }
      if (update.key === 'recommendations') {
        api.cache.get('recommendations').then((entry: any) => {
          if (entry?.data) setRecommendations(entry.data as any);
        }).catch(() => {});
      }
    };
    api.on('cache:updated', handler);
    return () => { api.off('cache:updated'); };
  }, []);

  // Poll scanning status for UI indicator
  useEffect(() => {
    const poll = setInterval(async () => {
      try { setBgScanning(await api.cache.isScanning()); } catch { /* */ }
    }, 3000);
    return () => clearInterval(poll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        useAppStore.getState().toggleSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Background scan indicator */}
      {bgScanning && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-[100] bg-[var(--accent)]/20 overflow-hidden">
          <div className="h-full bg-[var(--accent)] animate-scan-bar" />
        </div>
      )}
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
