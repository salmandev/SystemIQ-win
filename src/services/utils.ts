// Format bytes to human-readable size
export function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

// Format seconds to human-readable duration
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

// Format timestamp to relative time
export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Get score color
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-500';
  if (score >= 25) return 'text-orange-500';
  return 'text-red-500';
}

// Get score label
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Poor';
  return 'Critical';
}

// Get usage color for bars
export function getUsageColor(percent: number): string {
  if (percent < 50) return 'var(--success)';
  if (percent < 75) return 'var(--warning)';
  return 'var(--error)';
}

// Category colors for treemap
export const CATEGORY_COLORS: Record<string, string> = {
  windows: '#0078D4',
  applications: '#8764B8',
  media: '#E3008C',
  documents: '#00B294',
  archives: '#CA5010',
  development: '#038387',
  games: '#4868D5',
  system: '#616161',
  cache: '#FFB900',
  temp: '#FF8C00',
  other: '#8A8A8A',
};

// Re-export from api for convenience
export { formatSize as fs };
