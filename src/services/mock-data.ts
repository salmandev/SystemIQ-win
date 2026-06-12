// ============================================================
// Mock Data Generators for SystemIQ
// Used when running in browser or when Electron services return null
// ============================================================

export function generateMockProcesses() {
  const names = ['chrome.exe', 'Code.exe', 'docker.exe', 'explorer.exe', 'Teams.exe', 'System', 'svchost.exe', 'SearchHost.exe', 'RuntimeBroker.exe', 'Discord.exe', 'Spotify.exe', 'node.exe', 'python.exe', 'java.exe', 'nginx.exe'];
  return names.map((name, i) => ({
    pid: 1000 + i * 100,
    name,
    command: `C:\\Program Files\\${name}`,
    cpu: Math.random() * 15,
    memory: Math.random() * 2147483648,
    memoryPercent: Math.random() * 8,
    diskRead: Math.random() * 104857600,
    diskWrite: Math.random() * 52428800,
    networkRx: Math.random() * 10485760,
    networkTx: Math.random() * 5242880,
    gpu: Math.random() * 5,
    status: 'running',
    started: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    user: 'User',
    priority: 8,
    aiInsight: name === 'chrome.exe' ? 'Chrome is using 3 GB across 15+ tabs. Consider closing unused tabs.' : name === 'docker.exe' ? 'Docker Desktop is consuming 2 GB. 3 containers running.' : undefined,
  }));
}

export function generateMockStorageScan() {
  return {
    scanId: 'scan-1', timestamp: Date.now(), duration: 15000,
    totalSize: 1000204886016, totalUsed: 756153664512,
    drives: [{
      drive: 'C', label: 'Windows', totalSize: 1000204886016, usedSpace: 756153664512, freeSpace: 244051221504,
      rootFolders: [
        { name: 'Windows', path: 'C:\\Windows', size: 32212254720, fileCount: 280000, folderCount: 45000, children: [], lastModified: Date.now(), category: 'windows' },
        { name: 'Users', path: 'C:\\Users', size: 429496729600, fileCount: 1500000, folderCount: 85000, children: [
          { name: 'User', path: 'C:\\Users\\User', size: 418759311360, fileCount: 1400000, folderCount: 80000, children: [
            { name: 'AppData', path: 'C:\\Users\\User\\AppData', size: 45097156608, fileCount: 800000, folderCount: 50000, children: [
              { name: 'Local', path: 'C:\\Users\\User\\AppData\\Local', size: 38654705664, fileCount: 600000, folderCount: 40000, children: [
                { name: 'Google', path: 'C:\\Users\\User\\AppData\\Local\\Google', size: 12884901888, fileCount: 200000, folderCount: 5000, children: [], lastModified: Date.now(), category: 'cache' },
                { name: 'Docker', path: 'C:\\Users\\User\\AppData\\Local\\Docker', size: 15032385536, fileCount: 50000, folderCount: 3000, children: [], lastModified: Date.now(), category: 'development' },
                { name: 'npm-cache', path: 'C:\\Users\\User\\AppData\\Local\\npm-cache', size: 8589934592, fileCount: 100000, folderCount: 8000, children: [], lastModified: Date.now(), category: 'development' },
                { name: 'Microsoft', path: 'C:\\Users\\User\\AppData\\Local\\Microsoft', size: 2147483648, fileCount: 150000, folderCount: 12000, children: [], lastModified: Date.now(), category: 'system' },
              ], lastModified: Date.now(), category: 'system' },
              { name: 'Roaming', path: 'C:\\Users\\User\\AppData\\Roaming', size: 6442450944, fileCount: 200000, folderCount: 10000, children: [], lastModified: Date.now(), category: 'system' },
            ], lastModified: Date.now(), category: 'system' },
            { name: 'Downloads', path: 'C:\\Users\\User\\Downloads', size: 29527900160, fileCount: 500, folderCount: 50, children: [], lastModified: Date.now(), category: 'documents' },
            { name: 'Documents', path: 'C:\\Users\\User\\Documents', size: 53687091200, fileCount: 20000, folderCount: 1500, children: [], lastModified: Date.now(), category: 'documents' },
            { name: 'Desktop', path: 'C:\\Users\\User\\Desktop', size: 5368709120, fileCount: 150, folderCount: 30, children: [], lastModified: Date.now(), category: 'documents' },
            { name: '.docker', path: 'C:\\Users\\User\\.docker', size: 2147483648, fileCount: 50, folderCount: 10, children: [], lastModified: Date.now(), category: 'development' },
            { name: '.gradle', path: 'C:\\Users\\User\\.gradle', size: 5368709120, fileCount: 10000, folderCount: 800, children: [], lastModified: Date.now(), category: 'development' },
            { name: '.m2', path: 'C:\\Users\\User\\.m2', size: 10737418240, fileCount: 50000, folderCount: 5000, children: [], lastModified: Date.now(), category: 'development' },
          ], lastModified: Date.now(), category: 'documents' },
        ], lastModified: Date.now(), category: 'documents' },
        { name: 'Program Files', path: 'C:\\Program Files', size: 37580963840, fileCount: 100000, folderCount: 5000, children: [], lastModified: Date.now(), category: 'applications' },
        { name: 'Program Files (x86)', path: 'C:\\Program Files (x86)', size: 21474836480, fileCount: 80000, folderCount: 4000, children: [], lastModified: Date.now(), category: 'applications' },
      ],
    }],
    largestFiles: [
      { name: 'docker-desktop.vhdx', path: 'C:\\Users\\User\\AppData\\Local\\Docker\\wsl\\disk\\docker-desktop.vhdx', size: 16106127360, extension: '.vhdx', lastAccessed: Date.now(), lastModified: Date.now() - 86400000, created: Date.now() - 86400000 * 90 },
      { name: 'VisualStudio_2022.iso', path: 'C:\\Users\\User\\Downloads\\VisualStudio_2022.iso', size: 8589934592, extension: '.iso', lastAccessed: Date.now() - 86400000 * 30, lastModified: Date.now() - 86400000 * 60, created: Date.now() - 86400000 * 60 },
      { name: 'windows-11-backup.vhdx', path: 'C:\\Users\\User\\Documents\\backup.vhdx', size: 53687091200, extension: '.vhdx', lastAccessed: Date.now() - 86400000 * 7, lastModified: Date.now() - 86400000 * 7, created: Date.now() - 86400000 * 14 },
      { name: 'game_data.zip', path: 'C:\\Users\\User\\Downloads\\game_data.zip', size: 12884901888, extension: '.zip', lastAccessed: Date.now() - 86400000 * 14, lastModified: Date.now() - 86400000 * 14, created: Date.now() - 86400000 * 14 },
    ],
    largestFolders: [
      { name: 'AppData', path: 'C:\\Users\\User\\AppData', size: 45097156608, fileCount: 800000, folderCount: 50000, lastModified: Date.now() },
      { name: 'Docker', path: 'C:\\Users\\User\\AppData\\Local\\Docker', size: 15032385536, fileCount: 50000, folderCount: 3000, lastModified: Date.now() },
      { name: 'node_modules (total)', path: 'Various', size: 12884901888, fileCount: 200000, folderCount: 15000, lastModified: Date.now() },
      { name: '.m2\\repository', path: 'C:\\Users\\User\\.m2\\repository', size: 10737418240, fileCount: 50000, folderCount: 5000, lastModified: Date.now() },
    ],
  };
}

export function generateMockJunkScan() {
  return {
    scanId: 'junk-1', timestamp: Date.now(), duration: 8000,
    totalRecoverable: 19327352832,
    categories: [
      { id: 'chrome-cache', name: 'Chrome Cache', icon: '🌐', description: 'Chrome browser cache files', size: 6442450944, itemCount: 15000, items: [], riskLevel: 'safe' as const, recommended: true },
      { id: 'edge-cache', name: 'Edge Cache', icon: '🔷', description: 'Edge browser cache', size: 3221225472, itemCount: 8000, items: [], riskLevel: 'safe' as const, recommended: true },
      { id: 'npm-cache', name: 'npm Cache', icon: '📦', description: 'Node.js npm cache', size: 8589934592, itemCount: 50000, items: [], riskLevel: 'safe' as const, recommended: true },
      { id: 'windows-temp', name: 'Windows Temp', icon: '🗂️', description: 'Temporary files', size: 536870912, itemCount: 200, items: [], riskLevel: 'safe' as const, recommended: true },
      { id: 'crash-dumps', name: 'Crash Dumps', icon: '💥', description: 'System crash dumps', size: 268435456, itemCount: 5, items: [], riskLevel: 'safe' as const, recommended: true },
      { id: 'prefetch', name: 'Windows Prefetch', icon: '⚡', description: 'Prefetch data', size: 134217728, itemCount: 150, items: [], riskLevel: 'safe' as const, recommended: true },
      { id: 'error-reports', name: 'Error Reports', icon: '📝', description: 'Windows Error Reports', size: 134217728, itemCount: 45, items: [], riskLevel: 'safe' as const, recommended: true },
    ],
  };
}

export function generateMockDuplicateScan() {
  return {
    scanId: 'dup-1', timestamp: Date.now(), duration: 25000, totalWasted: 5368709120,
    groups: [
      { id: 'g1', hash: 'abc123', size: 1073741824, savingsIfCleaned: 1073741824, suggestedKeep: 'C:\\Users\\User\\Documents\\report.pdf', files: [
        { path: 'C:\\Users\\User\\Documents\\report.pdf', name: 'report.pdf', size: 1073741824, lastModified: Date.now(), lastAccessed: Date.now(), drive: 'C' },
        { path: 'C:\\Users\\User\\Downloads\\report (1).pdf', name: 'report (1).pdf', size: 1073741824, lastModified: Date.now() - 86400000, lastAccessed: Date.now() - 86400000 * 5, drive: 'C' },
      ]},
      { id: 'g2', hash: 'def456', size: 536870912, savingsIfCleaned: 1610612736, suggestedKeep: 'C:\\Users\\User\\Photos\\vacation.jpg', files: [
        { path: 'C:\\Users\\User\\Photos\\vacation.jpg', name: 'vacation.jpg', size: 536870912, lastModified: Date.now(), lastAccessed: Date.now(), drive: 'C' },
        { path: 'C:\\Users\\User\\Downloads\\vacation.jpg', name: 'vacation.jpg', size: 536870912, lastModified: Date.now() - 86400000 * 3, lastAccessed: Date.now() - 86400000 * 10, drive: 'C' },
        { path: 'D:\\Backup\\vacation.jpg', name: 'vacation.jpg', size: 536870912, lastModified: Date.now() - 86400000 * 30, lastAccessed: Date.now() - 86400000 * 60, drive: 'D' },
        { path: 'C:\\Users\\User\\Desktop\\vacation_copy.jpg', name: 'vacation_copy.jpg', size: 536870912, lastModified: Date.now() - 86400000 * 7, lastAccessed: Date.now() - 86400000 * 14, drive: 'C' },
      ]},
    ],
  };
}

export function generateMockStartupItems() {
  return [
    { name: 'Docker Desktop', publisher: 'Docker Inc', command: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe', location: 'Registry: All Users', enabled: true, impactScore: 90, bootTimeImpact: 12, memoryUsage: 524288000, cpuUsage: 5, aiRecommendation: 'Docker Desktop adds 12 seconds to boot time and consumes 500 MB RAM. Disable if not needed daily.', category: 'application' as const },
    { name: 'Spotify', publisher: 'Spotify AB', command: 'C:\\Users\\User\\AppData\\Roaming\\Spotify\\Spotify.exe', location: 'Registry: Current User', enabled: true, impactScore: 70, bootTimeImpact: 7, memoryUsage: 157286400, cpuUsage: 3, aiRecommendation: 'Spotify adds 7 seconds to startup and uses 150 MB RAM. Consider disabling and launching manually.', category: 'application' as const },
    { name: 'Discord', publisher: 'Discord Inc', command: 'C:\\Users\\User\\AppData\\Local\\Discord\\Update.exe', location: 'Registry: Current User', enabled: true, impactScore: 65, bootTimeImpact: 5, memoryUsage: 209715200, cpuUsage: 2, aiRecommendation: 'Discord starts automatically and uses 200 MB RAM. Safe to disable.', category: 'application' as const },
    { name: 'OneDrive', publisher: 'Microsoft', command: 'C:\\Users\\User\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe', location: 'Registry: Current User', enabled: true, impactScore: 45, bootTimeImpact: 4, memoryUsage: 104857600, cpuUsage: 1, aiRecommendation: 'OneDrive provides cloud sync. Keep enabled if you use file syncing.', category: 'application' as const },
    { name: 'Microsoft Teams', publisher: 'Microsoft', command: 'C:\\Users\\User\\AppData\\Local\\Microsoft\\Teams\\Update.exe', location: 'Registry: Current User', enabled: true, impactScore: 75, bootTimeImpact: 6, memoryUsage: 262144000, cpuUsage: 4, aiRecommendation: 'Teams adds 6 seconds to boot time and uses 250 MB RAM. Disable if not needed for work.', category: 'application' as const },
    { name: 'Steam', publisher: 'Valve', command: 'C:\\Program Files (x86)\\Steam\\steam.exe', location: 'Registry: Current User', enabled: false, impactScore: 60, bootTimeImpact: 5, memoryUsage: 157286400, cpuUsage: 2, aiRecommendation: 'Steam is already disabled. Good choice for boot performance.', category: 'application' as const },
  ];
}

export function generateMockSsdHealth() {
  return [{
    drive: 'C:', model: 'Samsung 990 PRO 1TB', serial: 'S6Z2NJ0T123456', firmware: '4B2QJXD7',
    capacity: 1000204886016, temperature: 38, powerOnHours: 8760,
    totalBytesWritten: 12345678901234, wearLevel: 12, remainingLife: 88,
    smartAttributes: [
      { id: '05', name: 'Reallocated Sectors', value: 100, worst: 100, threshold: 10, raw: 0, status: 'ok' as const },
      { id: '09', name: 'Power-On Hours', value: 95, worst: 95, threshold: 0, raw: 8760, status: 'ok' as const },
      { id: 'B1', name: 'Wear Leveling Count', value: 88, worst: 88, threshold: 0, raw: 88, status: 'ok' as const },
      { id: 'E7', name: 'Remaining Lifetime', value: 88, worst: 88, threshold: 10, raw: 88, status: 'ok' as const },
      { id: 'F1', name: 'Total LBAs Written', value: 100, worst: 100, threshold: 0, raw: 12345678, status: 'ok' as const },
      { id: 'C2', name: 'Temperature', value: 62, worst: 50, threshold: 0, raw: 38, status: 'ok' as const },
    ],
    healthStatus: 'healthy' as const,
  }];
}

export function generateMockHealthScore() {
  return {
    overall: 72,
    storage: { score: 65, status: 'fair' as const, issues: [
      { title: 'C: drive is 75.6% full', description: 'Only 227 GB free on C: drive', severity: 'warning' as const, impact: 15 },
    ], improvements: [
      { title: 'Clean junk files', description: 'Recover up to 18 GB of space', estimatedBenefit: '18 GB recovered', riskLevel: 'safe' as const, category: 'storage' },
    ]},
    memory: { score: 78, status: 'good' as const, issues: [
      { title: 'Memory usage elevated', description: '56% RAM in use', severity: 'info' as const, impact: 8 },
    ], improvements: []},
    cpu: { score: 85, status: 'good' as const, issues: [], improvements: []},
    startup: { score: 55, status: 'fair' as const, issues: [
      { title: 'Too many startup apps', description: '5 apps with high impact', severity: 'warning' as const, impact: 25 },
    ], improvements: [
      { title: 'Disable high-impact startup apps', description: 'Docker, Spotify, Discord add 24s to boot', estimatedBenefit: '24s faster boot', riskLevel: 'safe' as const, category: 'startup' },
    ]},
    security: { score: 90, status: 'excellent' as const, issues: [], improvements: []},
    trend: Array(7).fill(0).map((_, i) => ({ timestamp: Date.now() - 86400000 * (6 - i), score: 65 + Math.random() * 15 })),
  };
}

export function generateMockRecommendations() {
  return [
    { id: 'r1', title: 'C: drive is 75.6% full', description: 'Only 227 GB remaining. Clean junk files and review large folders.', explanation: 'Your C: drive has 756 GB used out of 1 TB. The biggest consumers are AppData (42 GB), Program Files (35 GB), and your Downloads folder (27.5 GB). I recommend running the Junk Cleaner to recover approximately 18 GB, then reviewing Docker images and npm cache which together consume 23 GB.', category: 'storage', priority: 'high' as const, riskLevel: 'safe' as const, estimatedSavings: 19327352832, action: 'open-junk-cleaner' },
    { id: 'r2', title: 'Docker is consuming 15 GB', description: 'Unused images and containers are wasting significant disk space.', explanation: 'Docker Desktop has accumulated 8 dangling images, 12 stopped containers, and 5 unused volumes. Running docker system prune -a would safely recover approximately 15 GB. This won\'t affect your running containers.', category: 'development', priority: 'high' as const, riskLevel: 'safe' as const, estimatedSavings: 16106127360, action: 'open-devtools-scanner' },
    { id: 'r3', title: '5 high-impact startup applications', description: 'Disabling unnecessary startup apps can save 24 seconds on boot.', explanation: 'Docker Desktop (12s), Spotify (7s), Discord (5s), Teams (6s), and OneDrive (4s) all start automatically. Disabling the first 3 alone saves 24 seconds per boot and frees ~850 MB of RAM.', category: 'startup', priority: 'medium' as const, riskLevel: 'safe' as const, action: 'open-startup-optimizer' },
    { id: 'r4', title: 'npm cache is 8 GB', description: 'Package manager caches can be safely cleared.', explanation: 'Your npm cache has grown to 8 GB. Running npm cache clean --force will safely remove this. Packages will be re-downloaded when needed.', category: 'development', priority: 'low' as const, riskLevel: 'safe' as const, estimatedSavings: 8589934592, action: 'open-devtools-scanner' },
  ];
}

export function generateMockMachineProfile() {
  return {
    device: 'Dell Precision 5680',
    usagePattern: 'Developer Workstation',
    detectedRoles: ['Java Developer', 'Node.js Developer', 'Docker User', 'Kubernetes User', 'Microsoft Office User'],
    optimizationProfile: 'Developer Heavy',
    recommendedActions: ['Docker cleanup (15 GB recoverable)', 'Maven cache cleanup (10 GB)', 'npm cache optimization (8 GB)', 'WSL disk cleanup (25 GB)', 'Browser cache optimization (9 GB)'],
    personality: {
      label: 'Developer Machine',
      breakdown: [
        { category: 'Development', size: 450971566080, color: '#038387' },
        { category: 'Media', size: 128849018880, color: '#E3008C' },
        { category: 'Games', size: 85899345920, color: '#4868D5' },
        { category: 'System', size: 64424509440, color: '#616161' },
        { category: 'Documents', size: 53687091200, color: '#00B294' },
        { category: 'Applications', size: 37580963840, color: '#8764B8' },
      ],
    },
  };
}

export function generateMockRootCause(query: string) {
  return {
    query,
    causes: [
      { description: 'Docker images and volumes', path: 'C:\\Users\\User\\AppData\\Local\\Docker', sizeChange: 40802189312, percentOfTotal: 66.7, severity: 'critical' as const },
      { description: 'Chrome browser cache', path: 'C:\\Users\\User\\AppData\\Local\\Google\\Chrome\\User Data', sizeChange: 7516192768, percentOfTotal: 12.2, severity: 'warning' as const },
      { description: 'Windows Update cleanup', path: 'C:\\Windows\\SoftwareDistribution', sizeChange: 12884901888, percentOfTotal: 21.1, severity: 'warning' as const },
    ],
    totalRecoverable: 61203283968,
    riskLevel: 'low' as const,
    recommendations: ['Run docker system prune -a to recover 38 GB', 'Clear Chrome cache to recover 7 GB', 'Run Disk Cleanup for Windows Update files'],
  };
}

export function generateMockTimeline() {
  return [
    { date: '2025-06-01', driveFree: 244051221504, driveTotal: 1000204886016, changes: [] },
    { date: '2025-06-02', driveFree: 238000000000, driveTotal: 1000204886016, changes: [{ category: 'Downloads', change: 5368709120, icon: '📥' }] },
    { date: '2025-06-03', driveFree: 230000000000, driveTotal: 1000204886016, changes: [{ category: 'Docker', change: 6442450944, icon: '🐳' }, { category: 'npm cache', change: 1073741824, icon: '📦' }] },
    { date: '2025-06-05', driveFree: 210000000000, driveTotal: 1000204886016, changes: [{ category: 'Docker', change: 16106127360, icon: '🐳' }] },
    { date: '2025-06-07', driveFree: 190000000000, driveTotal: 1000204886016, changes: [{ category: 'Docker', change: 10737418240, icon: '🐳' }, { category: 'Downloads', change: 8589934592, icon: '📥' }] },
    { date: '2025-06-09', driveFree: 170000000000, driveTotal: 1000204886016, changes: [{ category: 'Windows Update', change: 12884901888, icon: '🔄' }, { category: 'Docker', change: 5368709120, icon: '🐳' }] },
    { date: '2025-06-10', driveFree: 145000000000, driveTotal: 1000204886016, changes: [{ category: 'Docker', change: 16106127360, icon: '🐳' }, { category: 'npm cache', change: 4294967296, icon: '📦' }, { category: 'Downloads', change: 2684354560, icon: '📥' }] },
  ];
}

export function generateMockPCDiagnosis() {
  return {
    overall: 72, maxScore: 100,
    issues: [
      { icon: '🐳', title: 'Docker consuming excessive storage', severity: 'warning' as const, detail: '78 GB used across images, containers, and volumes', fixable: true },
      { icon: '🚀', title: '14 startup apps slowing boot', severity: 'warning' as const, detail: 'Estimated 35 seconds added to boot time', fixable: true },
      { icon: '💾', title: 'Memory pressure detected', severity: 'info' as const, detail: '56% RAM in use with 5 heavy processes', fixable: true },
      { icon: '💽', title: 'SSD wear at 82%', severity: 'info' as const, detail: '12% wear level - healthy but monitor', fixable: false },
      { icon: '🗑️', title: '18.5 GB of recoverable junk', severity: 'warning' as const, detail: 'Temp files, browser cache, crash dumps', fixable: true },
      { icon: '🔒', title: 'Privacy traces found', severity: 'info' as const, detail: 'Browser trackers and activity history detected', fixable: true },
    ],
    fixPlan: { estimatedMinutes: 15, expectedImprovement: 35, actions: ['Clean junk files (18.5 GB)', 'Prune Docker images (38 GB)', 'Disable 5 startup apps', 'Clear browser cache', 'Clean privacy traces'] },
    checks: [
      { name: 'Storage Scan', status: 'warning' as const, detail: 'C: drive 75.6% full', score: 65 },
      { name: 'Startup Scan', status: 'warning' as const, detail: '14 items, 5 high-impact', score: 55 },
      { name: 'Memory Analysis', status: 'warning' as const, detail: '56% RAM used', score: 78 },
      { name: 'Driver Check', status: 'pass' as const, detail: 'All drivers up to date', score: 95 },
      { name: 'Windows Health', status: 'pass' as const, detail: 'System files intact', score: 90 },
      { name: 'Security Check', status: 'pass' as const, detail: 'Defender active, firewall on', score: 92 },
    ],
  };
}

export function generateMockModeConfigs() {
  return [
    { mode: 'gaming' as const, name: 'Gaming Mode', icon: '🎮', color: '#E3008C', description: 'Maximize FPS by reducing background resource usage', actions: [
      { id: 'g1', name: 'Suspend background apps', description: 'Pause non-essential processes', impact: 'high' as const, enabled: true, category: 'processes' },
      { id: 'g2', name: 'Disable Windows Search indexer', description: 'Reduce disk I/O during gaming', impact: 'high' as const, enabled: true, category: 'services' },
      { id: 'g3', name: 'Free memory', description: 'Release unused memory from background apps', impact: 'high' as const, enabled: true, category: 'memory' },
      { id: 'g4', name: 'Disable startup apps', description: 'Prevent unnecessary apps from loading', impact: 'medium' as const, enabled: true, category: 'startup' },
      { id: 'g5', name: 'Set high performance power plan', description: 'Maximize CPU performance', impact: 'medium' as const, enabled: true, category: 'power' },
    ]},
    { mode: 'developer' as const, name: 'Developer Mode', icon: '👨‍💻', color: '#038387', description: 'Optimize for development workflows and build performance', actions: [
      { id: 'd1', name: 'Clean Docker resources', description: 'Prune unused images and containers', impact: 'high' as const, enabled: true, category: 'docker' },
      { id: 'd2', name: 'Clear IDE caches', description: 'Remove IntelliJ/VS Code caches', impact: 'medium' as const, enabled: true, category: 'ide' },
      { id: 'd3', name: 'Clean build artifacts', description: 'Remove target/, dist/, build/ folders', impact: 'high' as const, enabled: true, category: 'builds' },
      { id: 'd4', name: 'Optimize npm/Maven cache', description: 'Clean package manager caches', impact: 'medium' as const, enabled: true, category: 'packages' },
      { id: 'd5', name: 'Allocate more memory to builds', description: 'Increase heap for Maven/Gradle', impact: 'medium' as const, enabled: false, category: 'builds' },
    ]},
    { mode: 'office' as const, name: 'Office Mode', icon: '📊', color: '#0078D4', description: 'Optimize for productivity apps and video calls', actions: [
      { id: 'o1', name: 'Optimize Teams', description: 'Clear Teams cache and optimize memory', impact: 'high' as const, enabled: true, category: 'apps' },
      { id: 'o2', name: 'Optimize Outlook', description: 'Compact PST files, clear temp', impact: 'medium' as const, enabled: true, category: 'apps' },
      { id: 'o3', name: 'Clean browser cache', description: 'Clear all browser caches', impact: 'medium' as const, enabled: true, category: 'browser' },
      { id: 'o4', name: 'Free memory for Office apps', description: 'Release memory from non-essential apps', impact: 'medium' as const, enabled: true, category: 'memory' },
    ]},
    { mode: 'battery' as const, name: 'Battery Mode', icon: '🔋', color: '#00B294', description: 'Extend battery life by reducing power consumption', actions: [
      { id: 'b1', name: 'Reduce CPU boost', description: 'Limit CPU to base frequency', impact: 'high' as const, enabled: true, category: 'power' },
      { id: 'b2', name: 'Suspend background tasks', description: 'Pause non-essential background work', impact: 'high' as const, enabled: true, category: 'processes' },
      { id: 'b3', name: 'Dim display', description: 'Reduce screen brightness', impact: 'medium' as const, enabled: true, category: 'display' },
      { id: 'b4', name: 'Disable Bluetooth', description: 'Turn off Bluetooth adapter', impact: 'low' as const, enabled: false, category: 'hardware' },
      { id: 'b5', name: 'Enable battery saver', description: 'Windows battery saver mode', impact: 'high' as const, enabled: true, category: 'power' },
    ]},
  ];
}

export function generateMockInstalledApps() {
  return [
    { id: 'a1', name: 'Visual Studio Code', publisher: 'Microsoft', version: '1.90.0', installDate: Date.now() - 86400000 * 365, lastUsed: Date.now() - 3600000, size: 805306368, category: 'development' as const, usageFrequency: 'daily' as const },
    { id: 'a2', name: 'IntelliJ IDEA Ultimate', publisher: 'JetBrains', version: '2024.1.3', installDate: Date.now() - 86400000 * 300, lastUsed: Date.now() - 7200000, size: 2147483648, category: 'development' as const, usageFrequency: 'daily' as const },
    { id: 'a3', name: 'Docker Desktop', publisher: 'Docker Inc', version: '4.30.0', installDate: Date.now() - 86400000 * 200, lastUsed: Date.now() - 1800000, size: 1610612736, category: 'development' as const, usageFrequency: 'daily' as const },
    { id: 'a4', name: 'Google Chrome', publisher: 'Google', version: '125.0.6422.112', installDate: Date.now() - 86400000 * 500, lastUsed: Date.now() - 600000, size: 536870912, category: 'browser' as const, usageFrequency: 'daily' as const },
    { id: 'a5', name: 'Microsoft Teams', publisher: 'Microsoft', version: '1.7.00.12055', installDate: Date.now() - 86400000 * 400, lastUsed: Date.now() - 3600000, size: 314572800, category: 'communication' as const, usageFrequency: 'daily' as const },
    { id: 'a6', name: 'Adobe Acrobat Reader', publisher: 'Adobe', version: '23.001.20142', installDate: Date.now() - 86400000 * 600, lastUsed: Date.now() - 86400000 * 421, size: 8589934592, category: 'productivity' as const, usageFrequency: 'never' as const, recommendation: 'Not used in 421 days. Consider uninstalling to free 8 GB.' },
    { id: 'a7', name: 'Spotify', publisher: 'Spotify AB', version: '1.2.37.701', installDate: Date.now() - 86400000 * 350, lastUsed: Date.now() - 86400000 * 2, size: 268435456, category: 'media' as const, usageFrequency: 'weekly' as const },
    { id: 'a8', name: 'Discord', publisher: 'Discord Inc', version: '1.0.9035', installDate: Date.now() - 86400000 * 300, lastUsed: Date.now() - 86400000 * 5, size: 209715200, category: 'communication' as const, usageFrequency: 'weekly' as const },
    { id: 'a9', name: 'WinRAR', publisher: 'RARLAB', version: '6.24', installDate: Date.now() - 86400000 * 700, lastUsed: Date.now() - 86400000 * 15, size: 10485760, category: 'utility' as const, usageFrequency: 'monthly' as const },
    { id: 'a10', name: 'Steam', publisher: 'Valve', version: 'Latest', installDate: Date.now() - 86400000 * 500, lastUsed: Date.now() - 86400000 * 60, size: 12884901888, category: 'gaming' as const, usageFrequency: 'rarely' as const, recommendation: 'Not used in 60 days. Game library takes 12 GB.' },
    { id: 'a11', name: 'Postman', publisher: 'Postman Inc', version: '11.2.0', installDate: Date.now() - 86400000 * 250, lastUsed: Date.now() - 86400000, size: 419430400, category: 'development' as const, usageFrequency: 'weekly' as const },
    { id: 'a12', name: 'Notion', publisher: 'Notion Labs', version: '3.2.0', installDate: Date.now() - 86400000 * 180, lastUsed: Date.now() - 86400000 * 3, size: 367001600, category: 'productivity' as const, usageFrequency: 'weekly' as const },
  ];
}

export function generateMockPrivacyScan() {
  return {
    browserTrackers: [
      { browser: 'Chrome', count: 247, size: 15728640 },
      { browser: 'Edge', count: 89, size: 5242880 },
      { browser: 'Firefox', count: 156, size: 8388608 },
    ],
    recentFiles: [
      { name: 'quarterly-report.xlsx', path: 'C:\\Users\\User\\Documents\\quarterly-report.xlsx', accessed: Date.now() - 3600000 },
      { name: 'meeting-notes.docx', path: 'C:\\Users\\User\\Documents\\meeting-notes.docx', accessed: Date.now() - 7200000 },
      { name: 'password-list.txt', path: 'C:\\Users\\User\\Desktop\\password-list.txt', accessed: Date.now() - 86400000 },
      { name: 'bank-statement.pdf', path: 'C:\\Users\\User\\Downloads\\bank-statement.pdf', accessed: Date.now() - 172800000 },
    ],
    activityHistory: [
      { type: 'App Usage', count: 1247, size: 2097152 },
      { type: 'Clipboard', count: 89, size: 524288 },
      { type: 'Search History', count: 342, size: 1048576 },
      { type: 'Location History', count: 56, size: 262144 },
    ],
    clipboardHistory: { count: 89, enabled: true },
    searchHistory: [
      { browser: 'Chrome', entries: 342 },
      { browser: 'Edge', entries: 127 },
    ],
    totalRecoverable: 31457280,
  };
}

export function generateMockProcessInsights() {
  return [
    { pid: 1234, name: 'chrome.exe', purpose: 'Web browser - 15+ tabs open', startedBy: 'User', impact: 'high' as const, recommendation: 'Close unused tabs to free ~2 GB RAM', safeToStop: false },
    { pid: 2345, name: 'Code.exe', purpose: 'VS Code editor with 12 extensions', startedBy: 'User', impact: 'medium' as const, recommendation: 'Consider disabling unused extensions', safeToStop: false },
    { pid: 3456, name: 'docker.exe', purpose: 'Docker Desktop running 3 containers', startedBy: 'Startup', impact: 'high' as const, recommendation: 'Stop unused containers to free 1.5 GB', safeToStop: false },
    { pid: 4567, name: 'java.exe', purpose: 'Maven build process', startedBy: 'IntelliJ IDEA', impact: 'high' as const, recommendation: 'Build in progress - safe to stop after completion', safeToStop: true },
    { pid: 5678, name: 'node.exe', purpose: 'Angular development server', startedBy: 'VS Code Terminal', impact: 'medium' as const, recommendation: 'Dev server running - stop when done developing', safeToStop: true },
    { pid: 6789, name: 'Teams.exe', purpose: 'Microsoft Teams for video calls', startedBy: 'Startup', impact: 'medium' as const, recommendation: 'Using 250 MB RAM - disable from startup if not needed', safeToStop: true },
    { pid: 7890, name: 'Spotify.exe', purpose: 'Music streaming application', startedBy: 'Startup', impact: 'low' as const, recommendation: 'Safe to stop - using 150 MB RAM', safeToStop: true },
    { pid: 8901, name: 'SearchHost.exe', purpose: 'Windows Search indexer', startedBy: 'Windows', impact: 'low' as const, recommendation: 'System process - do not stop', safeToStop: false },
  ];
}

export function generateMockDevProjects() {
  return [
    { id: 'p1', name: 'Payment Gateway', path: 'D:\\Projects\\payment-api', type: 'java' as const, technology: 'Spring Boot', version: '17', dependencies: 245, size: 12884901888, largestConsumers: [{ name: '.m2 cache', size: 8589934592 }, { name: 'target/ folders', size: 3221225472 }, { name: 'logs', size: 1073741824 }], configFiles: ['pom.xml', 'settings.gradle'], lastModified: Date.now() - 3600000 },
    { id: 'p2', name: 'Customer Portal', path: 'D:\\Projects\\customer-portal', type: 'angular' as const, technology: 'Angular 18', version: '20', dependencies: 1890, size: 10737418240, largestConsumers: [{ name: 'node_modules', size: 8589934592 }, { name: '.angular cache', size: 1610612736 }, { name: 'dist/', size: 536870912 }], configFiles: ['package.json', 'angular.json', 'package-lock.json'], lastModified: Date.now() - 7200000 },
    { id: 'p3', name: 'Admin Dashboard', path: 'D:\\Projects\\admin-dash', type: 'react' as const, technology: 'React + Vite', version: '20', dependencies: 634, size: 4294967296, largestConsumers: [{ name: 'node_modules', size: 3221225472 }, { name: '.vite cache', size: 536870912 }, { name: 'dist/', size: 268435456 }], configFiles: ['package.json', 'vite.config.ts', 'pnpm-lock.yaml'], lastModified: Date.now() - 86400000 },
    { id: 'p4', name: 'E-Commerce Backend', path: 'D:\\Projects\\ecom-api', type: 'java' as const, technology: 'Spring Boot', version: '21', dependencies: 312, size: 16106127360, largestConsumers: [{ name: '.m2 cache', size: 10737418240 }, { name: 'target/ folders', size: 4294967296 }, { name: 'test-reports', size: 536870912 }], configFiles: ['pom.xml', 'build.gradle'], lastModified: Date.now() - 172800000 },
    { id: 'p5', name: 'Mobile App API', path: 'D:\\Projects\\mobile-api', type: 'next' as const, technology: 'Next.js 14', version: '20', dependencies: 456, size: 3221225472, largestConsumers: [{ name: 'node_modules', size: 2147483648 }, { name: '.next cache', size: 536870912 }, { name: '.turbo cache', size: 268435456 }], configFiles: ['package.json', 'next.config.js', 'yarn.lock'], lastModified: Date.now() - 259200000 },
  ];
}

export function generateMockDockerInfo() {
  return {
    images: { count: 45, size: 83745083392, items: [
      { name: 'postgres', tag: '16', size: 4294967296, created: Date.now() - 86400000 * 30, dangling: false },
      { name: 'node', tag: '20-alpine', size: 1932735283, created: Date.now() - 86400000 * 15, dangling: false },
      { name: 'redis', tag: '7', size: 1073741824, created: Date.now() - 86400000 * 60, dangling: false },
      { name: '<none>', tag: '<none>', size: 5368709120, created: Date.now() - 86400000 * 90, dangling: true },
      { name: '<none>', tag: '<none>', size: 3221225472, created: Date.now() - 86400000 * 45, dangling: true },
      { name: 'nginx', tag: 'latest', size: 1610612736, created: Date.now() - 86400000 * 20, dangling: false },
    ]},
    containers: { count: 12, size: 12884901888, items: [
      { name: 'payment-db', image: 'postgres:16', status: 'running', size: 2147483648, ports: '5432:5432' },
      { name: 'payment-api', image: 'node:20-alpine', status: 'running', size: 1073741824, ports: '3000:3000' },
      { name: 'redis-cache', image: 'redis:7', status: 'running', size: 536870912, ports: '6379:6379' },
      { name: 'old-test-db', image: 'postgres:14', status: 'exited', size: 4294967296, ports: '' },
      { name: 'legacy-api', image: 'node:18', status: 'exited', size: 2147483648, ports: '' },
    ]},
    volumes: { count: 18, size: 48318382080, items: [
      { name: 'payment_data', size: 8589934592, driver: 'local', inUse: true },
      { name: 'redis_data', size: 2147483648, driver: 'local', inUse: true },
      { name: 'old_project_vol', size: 16106127360, driver: 'local', inUse: false },
      { name: 'test_volume', size: 10737418240, driver: 'local', inUse: false },
      { name: 'cache_vol', size: 5368709120, driver: 'local', inUse: false },
    ]},
    buildCache: { size: 6442450944, count: 234 },
    totalSize: 151183556608,
  };
}

export function generateMockK8sWSLInfo() {
  return {
    wsl: { enabled: true, distros: [
      { name: 'Ubuntu-22.04', size: 26843545600, version: 'WSL 2' },
      { name: 'docker-desktop-data', size: 45097156608, version: 'WSL 2' },
      { name: 'docker-desktop', size: 5368709120, version: 'WSL 2' },
    ], configPath: 'C:\\Users\\User\\.wslconfig' },
    kubernetes: {
      minikube: { installed: true, size: 26843545600, clusters: 2 },
      dockerDesktop: { enabled: true, size: 45097156608 },
      kind: { installed: false, clusters: 0 },
      k3d: { installed: false, clusters: 0 },
      kubeConfig: 'C:\\Users\\User\\.kube\\config',
    },
    totalSize: 104152629248,
  };
}
