import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { OptimizationModeConfig, OptimizationMode, ModeAction } from '../../shared/types';

export function OptimizationModes() {
  const [modes, setModes] = useState<OptimizationModeConfig[]>([]);
  const [active, setActive] = useState<OptimizationMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.intelligence.getModeConfig().then((data: OptimizationModeConfig[] | null) => {
      const items = data || [];
      setModes(items);
      setLoading(false);
      // Init toggled state
      const t: Record<string, boolean> = {};
      items.forEach((m: OptimizationModeConfig) => m.actions.forEach((a: ModeAction) => { t[a.id] = a.enabled; }));
      setToggled(t);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-pulse text-sm text-[var(--text-secondary)]">Loading optimization modes...</div>
    </div>
  );

  const activeMode = modes.find(m => m.mode === active);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Smart Optimization Modes</h1>
        <p className="text-sm text-[var(--text-secondary)]">Choose a mode tailored to your current activity</p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-4 gap-4">
        {modes.map(mode => (
          <button key={mode.mode} onClick={() => setActive(mode.mode)}
            className={`fluent-card p-5 text-left transition-all hover:scale-[1.02] ${active === mode.mode ? 'ring-2' : ''}`}
            style={active === mode.mode ? { boxShadow: `0 0 0 2px ${mode.color}` } : {}}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3" style={{ background: `${mode.color}20` }}>
              {mode.icon}
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{mode.name}</h3>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1 line-clamp-2">{mode.description}</p>
            <p className="text-[10px] font-semibold mt-2" style={{ color: mode.color }}>{mode.actions.length} actions</p>
          </button>
        ))}
      </div>

      {/* Active Mode Detail */}
      {activeMode && (
        <div className="fluent-card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{activeMode.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{activeMode.name}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{activeMode.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            {activeMode.actions.map(action => (
              <div key={action.id} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-hover)]">
                {/* Toggle */}
                <button onClick={() => setToggled(t => ({ ...t, [action.id]: !t[action.id] }))}
                  className={`w-10 h-6 rounded-full transition-all relative ${toggled[action.id] ? 'bg-green-500' : 'bg-gray-400'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${toggled[action.id] ? 'left-5' : 'left-1'}`} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{action.name}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      action.impact === 'high' ? 'bg-red-500/20 text-red-500' :
                      action.impact === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-green-500/20 text-green-500'
                    }`}>{action.impact}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{action.description}</p>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase">{action.category}</span>
              </div>
            ))}
          </div>

          <button
            className="w-full py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-fluent"
            style={{ background: `linear-gradient(to right, ${activeMode.color}, ${activeMode.color}CC)` }}>
            ⚡ Activate {activeMode.name}
          </button>
        </div>
      )}
    </div>
  );
}
