import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatSize } from '../services/utils';
import type { DevProject, DockerIntelligence, KubernetesWSLInfo } from '../../shared/types';

type Tab = 'java' | 'node' | 'docker' | 'k8s';

export function DeveloperCenter() {
  const [tab, setTab] = useState<Tab>('java');
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [docker, setDocker] = useState<DockerIntelligence | null>(null);
  const [k8swsl, setK8swsl] = useState<KubernetesWSLInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [p, d, k] = await Promise.all([
          api.intelligence.scanDevProjects(),
          api.intelligence.getDockerInfo(),
          api.intelligence.getK8sWSLInfo(),
        ]);
        setProjects(p);
        setDocker(d);
        setK8swsl(k);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'java', label: 'Java Projects', icon: '☕' },
    { id: 'node', label: 'Node / Frontend', icon: '🟢' },
    { id: 'docker', label: 'Docker', icon: '🐳' },
    { id: 'k8s', label: 'K8s / WSL', icon: '⎈' },
  ];

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Developer Center</h1>
          <p className="text-sm text-[var(--text-secondary)]">Scan your entire machine for development projects, containers, and infrastructure</p>
        </div>
        <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 800); }}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-fluent">
          ↻ Re-scan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === 'java' && <JavaProjects projects={projects.filter(p => p.type === 'java')} />}
      {tab === 'node' && <NodeProjects projects={projects.filter(p => ['node', 'angular', 'react', 'next', 'vite', 'vue'].includes(p.type))} />}
      {tab === 'docker' && docker && <DockerSection docker={docker} />}
      {tab === 'k8s' && k8swsl && <K8sWSLSection k8swsl={k8swsl} />}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center animate-pulse">
          <span className="text-2xl">🔍</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Scanning your development workspace...</p>
      </div>
    </div>
  );
}

// ---- Java Projects ----
function JavaProjects({ projects }: { projects: DevProject[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Java Projects</h2>
        <span className="text-xs text-[var(--text-tertiary)]">{projects.length} projects detected</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map(p => (
          <div key={p.id} className="fluent-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">☕</span>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{p.name}</h3>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{p.path}</p>
              </div>
              <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase">{p.technology}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <InfoBlock label="Java" value={p.version || 'N/A'} />
              <InfoBlock label="Dependencies" value={String(p.dependencies)} />
              <InfoBlock label="Size" value={formatSize(p.size)} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase mb-2">Largest Consumers</p>
              <div className="space-y-1.5">
                {p.largestConsumers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{c.name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{formatSize(c.size)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
              <ActionButton label="Clean target/" color="amber" />
              <ActionButton label="Analyze deps" color="blue" />
              <ActionButton label="Find unused" color="purple" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Node / Frontend Projects ----
function NodeProjects({ projects }: { projects: DevProject[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Node / Frontend Projects</h2>
        <span className="text-xs text-[var(--text-tertiary)]">{projects.length} projects detected</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map(p => (
          <div key={p.id} className="fluent-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.type === 'angular' ? '🅰️' : p.type === 'react' ? '⚛️' : p.type === 'next' ? '▲' : '🟢'}</span>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{p.name}</h3>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{p.path}</p>
              </div>
              <span className="px-2 py-1 rounded-md bg-green-500/20 text-green-500 text-[10px] font-bold uppercase">{p.technology}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <InfoBlock label="Node" value={`v${p.version || '?'}`} />
              <InfoBlock label="Dependencies" value={String(p.dependencies)} />
              <InfoBlock label="Size" value={formatSize(p.size)} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase mb-2">Size Breakdown</p>
              <div className="space-y-1.5">
                {p.largestConsumers.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{c.name}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{formatSize(c.size)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              {p.configFiles.map((f, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[10px] text-[var(--text-tertiary)] font-mono">{f}</span>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
              <ActionButton label="Remove node_modules" color="red" />
              <ActionButton label="Reinstall" color="green" />
              <ActionButton label="Analyze deps" color="blue" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Docker Intelligence ----
function DockerSection({ docker }: { docker: DockerIntelligence }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard icon="🖼️" label="Images" value={formatSize(docker.images.size)} sub={`${docker.images.count} images`} color="#0078D4" />
        <SummaryCard icon="📦" label="Containers" value={formatSize(docker.containers.size)} sub={`${docker.containers.count} containers`} color="#8764B8" />
        <SummaryCard icon="💾" label="Volumes" value={formatSize(docker.volumes.size)} sub={`${docker.volumes.count} volumes`} color="#E3008C" />
        <SummaryCard icon="🔨" label="Build Cache" value={formatSize(docker.buildCache.size)} sub={`${docker.buildCache.count} layers`} color="#CA5010" />
      </div>

      {/* Total */}
      <div className="fluent-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">Total Docker Storage</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{formatSize(docker.totalSize)}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/30 transition-fluent">
            docker system prune
          </button>
          <button className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-500 text-sm font-medium hover:bg-amber-500/30 transition-fluent">
            docker builder prune
          </button>
        </div>
      </div>

      {/* Dangling Images */}
      <div className="fluent-card p-5">
        <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Images ({docker.images.count})</h3>
        <div className="space-y-2">
          {docker.images.items.map((img, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <div className="flex items-center gap-3">
                {img.dangling && <span className="w-2 h-2 rounded-full bg-red-500" />}
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{img.name}:{img.tag}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Created {new Date(img.created).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{formatSize(img.size)}</span>
                {img.dangling && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px]">Dangling</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Containers */}
      <div className="fluent-card p-5">
        <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Containers ({docker.containers.count})</h3>
        <div className="space-y-2">
          {docker.containers.items.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${c.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{c.name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{c.image} {c.ports ? `• ${c.ports}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{formatSize(c.size)}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${c.status === 'running' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Volumes */}
      <div className="fluent-card p-5">
        <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Volumes ({docker.volumes.count})</h3>
        <div className="space-y-2">
          {docker.volumes.items.map((v, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{v.name}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Driver: {v.driver} {v.inUse ? '• In use' : '• Unused'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{formatSize(v.size)}</span>
                {!v.inUse && <button className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] hover:bg-red-500/30">Remove</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- K8s / WSL ----
function K8sWSLSection({ k8swsl }: { k8swsl: KubernetesWSLInfo }) {
  return (
    <div className="space-y-6">
      {/* WSL */}
      <div className="fluent-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Windows Subsystem for Linux (WSL)</h3>
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${k8swsl.wsl.enabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>
            {k8swsl.wsl.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        {k8swsl.wsl.enabled && (
          <>
            <div className="space-y-2">
              {k8swsl.wsl.distros.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🐧</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{d.name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{d.version}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{formatSize(d.size)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Total WSL Storage</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{formatSize(k8swsl.wsl.distros.reduce((s, d) => s + d.size, 0))}</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-500 text-sm font-medium hover:bg-amber-500/30">
                Compact WSL Disks
              </button>
            </div>
          </>
        )}
      </div>

      {/* Kubernetes */}
      <div className="fluent-card p-5">
        <h3 className="text-sm font-semibold mb-4 text-[var(--text-primary)]">Kubernetes Storage</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {k8swsl.kubernetes.minikube?.installed && (
            <K8sCard name="Minikube" size={k8swsl.kubernetes.minikube.size} clusters={k8swsl.kubernetes.minikube.clusters} icon="⎈" />
          )}
          {k8swsl.kubernetes.dockerDesktop?.enabled && (
            <K8sCard name="Docker Desktop K8s" size={k8swsl.kubernetes.dockerDesktop.size} clusters={1} icon="🐳" />
          )}
          {k8swsl.kubernetes.kind?.installed && (
            <K8sCard name="Kind" size={0} clusters={k8swsl.kubernetes.kind.clusters} icon="🔧" />
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">Total K8s + WSL</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{formatSize(k8swsl.totalSize)}</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/30">Remove old images</button>
            <button className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-500 text-sm font-medium hover:bg-amber-500/30">Clear logs</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Shared Components ----
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-[var(--bg-hover)]">
      <p className="text-[10px] text-[var(--text-tertiary)]">{label}</p>
      <p className="text-xs font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function ActionButton({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-500/20 text-red-500 hover:bg-red-500/30',
    green: 'bg-green-500/20 text-green-500 hover:bg-green-500/30',
    blue: 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30',
    purple: 'bg-purple-500/20 text-purple-500 hover:bg-purple-500/30',
  };
  return <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-fluent ${colorMap[color] || colorMap.blue}`}>{label}</button>;
}

function SummaryCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="fluent-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: `${color}20` }}>{icon}</div>
        <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      </div>
      <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--text-tertiary)]">{sub}</p>
    </div>
  );
}

function K8sCard({ name, size, clusters, icon }: { name: string; size: number; clusters: number; icon: string }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-hover)] space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">{name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoBlock label="Size" value={formatSize(size)} />
        <InfoBlock label="Clusters" value={String(clusters)} />
      </div>
    </div>
  );
}
