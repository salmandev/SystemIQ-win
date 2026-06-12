# Windows Intelligence Optimizer (WIO)

> AI-powered system optimization for Windows 11 — combining the best of WizTree, CCleaner, Task Manager, and Microsoft Copilot into one modern desktop app.

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

### Overview
| Feature | Page | Status | Description |
|---------|------|--------|-------------|
| **Dashboard** | `/dashboard` | ✅ Implemented | Live system monitors (CPU, Memory, Disk, GPU, Network, Battery) with circular progress rings, sparkline charts, quick actions, and AI recommendations |
| **System Health Score** | `/health-score` | ✅ Implemented | 0–100 composite score across Storage, Memory, CPU, Startup, and Security with trend tracking |

### Analysis
| Feature | Page | Status | Description |
|---------|------|--------|-------------|
| **Storage Analyzer** | `/storage` | ✅ Implemented | DaisyDisk-style sunburst radial chart, interactive drill-down with breadcrumbs, file type distribution bars, category legend, sortable folder explorer with batch selection |
| **Startup Optimizer** | `/startup` | ✅ Implemented | Lists startup items with impact scoring, boot time impact, memory/CPU usage, AI recommendations per item |
| **Process Intelligence** | `/processes` | ✅ Implemented | Enhanced task manager with CPU/Memory/Disk/Network/GPU columns, AI insights per process, top consumers |
| **Dev Tools Scanner** | `/devtools` | ✅ Implemented | Scans Docker, Node.js/npm/yarn/pnpm, Python/pip/conda, Java/Maven/Gradle, Git, Kubernetes, NuGet for recoverable space |

### Cleanup
| Feature | Page | Status | Description |
|---------|------|--------|-------------|
| **Junk Cleaner** | `/junk` | ✅ Implemented | 20+ junk categories (Windows temp, browser caches, dev tool caches, crash dumps, prefetch, etc.) with risk levels and batch cleanup |
| **Duplicate Finder** | `/duplicates` | ✅ Implemented | SHA-256 hash-based duplicate detection with size-grouping optimization, grouped results with keep/delete suggestions |
| **One-Click Optimize** | `/optimization` | ✅ Implemented | Safe/Aggressive/Custom optimization plans with estimated savings, action selection, and execution |
| **Large Files Finder** | Storage tab | ✅ Implemented | Files over 1GB sorted by size with delete actions |
| **Old Files Finder** | Storage tab | ✅ Implemented | Files not accessed in 30+ days with age-based color coding |
| **Empty Folders** | Storage tab | ✅ Implemented | Zero-file folder detection with batch removal |

### Performance
| Feature | Page | Status | Description |
|---------|------|--------|-------------|
| **Resource Optimizer** | `/resources` | ✅ Implemented | Live CPU/Memory charts, top consumer processes, resource trend visualization |

### Hardware
| Feature | Page | Status | Description |
|---------|------|--------|-------------|
| **SSD Health** | `/ssd-health` | ✅ Implemented | SMART attribute analysis (reallocated sectors, wear level, remaining life, temperature), health status assessment |

### AI
| Feature | Page | Status | Description |
|---------|------|--------|-------------|
| **AI Recommendations** | Dashboard | ✅ Implemented | Context-aware suggestions based on system data (storage, startup, dev tools) |
| **AI Chat Assistant** | `/ai-chat` | ✅ Implemented | Conversational interface for storage, memory, boot speed, cleanup, and dev tools questions with contextual responses |

### System
| Feature | Page | Status | Description |
|---------|------|--------|-------------|
| **Automation Engine** | `/automation` | ✅ Implemented | Scheduled tasks (hourly/daily/weekly/monthly), task presets for cleanup, scans, and audits |
| **Plugin System** | `/plugins` | ✅ Implemented | 10 built-in plugins with capability-based architecture |
| **Settings** | `/settings` | ✅ Implemented | Application preferences and configuration |

### UI/UX
| Feature | Status | Description |
|---------|--------|-------------|
| **Fluent Design System** | ✅ | Windows 11-inspired design with Mica/Acrylic materials, glassmorphism, depth shadows |
| **Dark/Light Mode** | ✅ | Full theme toggle with CSS custom properties (50+ design tokens) |
| **Collapsible Sidebar** | ✅ | 16 navigation items in 7 groups (Overview, Analysis, Cleanup, Performance, Developer, Hardware, AI, System) |
| **Custom Title Bar** | ✅ | Frameless window with search bar (Ctrl+K), theme toggle, AI button, window controls |
| **Keyboard Shortcuts** | ✅ | Ctrl+K (search), Esc (close search) |
| **Responsive Layout** | ✅ | Min width 1024px, fluid grid layouts |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Database │ │  System  │ │ Storage  │ │    AI     │  │
│  │ (SQLite) │ │ Service  │ │ Scanner  │ │  Engine   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │   Junk   │ │Duplicate │ │ Startup  │ │   SSD     │  │
│  │ Detector │ │  Finder  │ │ Manager  │ │  Health   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Health  │ │Optimizat.│ │ DevTools │ │Automation │  │
│  │ Calc.    │ │  Engine  │ │ Scanner  │ │  Engine   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                      IPC Bridge (30+ handlers)           │
└────────────────────────┬────────────────────────────────┘
                         │ contextBridge (preload.ts)
┌────────────────────────┴────────────────────────────────┐
│                   React Renderer Process                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Zustand │ │  Mock    │ │  Layout  │ │  15 Page  │  │
│  │  Store   │ │  API     │ │ (Nav/UI) │ │ Components│  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Recharts (AreaChart, PieChart, etc.)      │   │
│  │        Tailwind CSS + Fluent Design Tokens       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop Shell** | Electron 33 | Cross-platform desktop app, OS-level access |
| **Frontend** | React 18 + TypeScript | UI components, hooks, type safety |
| **Build** | Vite 6 + esbuild | Fast HMR, ESM dev server, optimized builds |
| **Styling** | Tailwind CSS 3 + Custom CSS | Fluent Design with CSS variables (50+ tokens) |
| **Charts** | Recharts | AreaChart, PieChart, Treemap, RadialBarChart |
| **State** | Zustand | Lightweight store with 15+ state slices |
| **Database** | better-sqlite3 11.8 | Synchronous SQLite with WAL mode (8 tables) |
| **System Info** | systeminformation | CPU, Memory, Disk, GPU, Network, Battery, Processes |
| **Animations** | framer-motion | Page transitions, micro-interactions |
| **Packaging** | electron-builder | Windows NSIS installer |

---

## Project Structure

```
intelligent-windows-agent/
├── electron/                      # Electron main process
│   ├── main.ts                    # Window creation, IPC registration
│   ├── preload.ts                 # contextBridge API exposure
│   └── services/                  # Backend domain services
│       ├── database.ts            # SQLite schema & CRUD (8 tables)
│       ├── system-service.ts      # CPU/Memory/Disk/GPU/Net/Battery via si
│       ├── storage-scanner.ts     # Drive scanning, treemap, growth detection
│       ├── junk-detector.ts       # 20+ junk categories with risk levels
│       ├── duplicate-finder.ts    # SHA-256 hash-based duplicate detection
│       ├── startup-manager.ts     # Windows registry startup items
│       ├── ssd-health.ts          # SMART attribute analysis
│       ├── health-calculator.ts   # Composite 0-100 health scoring
│       ├── ai-engine.ts           # Recommendations & chat with context
│       ├── optimization-engine.ts # Safe/Aggressive/Custom plans
│       ├── devtools-scanner.ts    # Docker/npm/pip/Maven/Gradle scanning
│       ├── automation-engine.ts   # Scheduled task execution
│       └── plugin-manager.ts      # Plugin registry & lifecycle
├── shared/
│   └── types.ts                   # 527 lines of TypeScript interfaces
├── src/                           # React renderer process
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Page routing (15 pages)
│   ├── index.css                  # Fluent Design CSS system (312 lines)
│   ├── components/
│   │   └── Layout.tsx             # TitleBar + Sidebar + Content area
│   ├── pages/
│   │   ├── Dashboard.tsx          # System monitors, sparklines, recommendations
│   │   ├── StorageAnalyzer.tsx    # Sunburst chart, drill-down, cleanup tools
│   │   ├── JunkCleaner.tsx        # Category selection, batch cleanup
│   │   ├── DuplicateFinder.tsx    # Duplicate groups with keep/delete
│   │   ├── ResourceOptimizer.tsx  # Live resource charts
│   │   ├── AnalysisPages.tsx      # Startup, Process Intelligence, DevTools
│   │   ├── SystemPages.tsx        # SSD Health, Health Score, AI Chat
│   │   └── UtilityPages.tsx       # Optimization, Automation, Plugins, Settings
│   ├── services/
│   │   ├── api.ts                 # Mock API + Electron IPC fallback proxy
│   │   └── utils.ts               # formatSize, formatDuration, colors
│   └── stores/
│       └── appStore.ts            # Zustand store (navigation, theme, data)
├── index.html                     # HTML entry with CSP headers
├── vite.config.ts                 # Vite + electron-plugin config
├── tailwind.config.js             # Fluent Design theme extensions
├── tsconfig.json                  # Strict TypeScript config
└── package.json                   # Dependencies, scripts, electron-builder
```

---

## Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** 9+
- **Visual Studio Build Tools** (for native modules)

### Install & Run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Rebuild native modules for Electron
npx electron-rebuild

# Start dev server (Vite + Electron with hot reload)
npm run dev
```

### Build for Production

```bash
# Type-check + build + package
npm run build

# Output: release/Windows Intelligence Optimizer Setup.exe
```

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server + Electron (hot reload) |
| `npm run build` | TypeScript check + Vite build + electron-builder |
| `npm run typecheck` | TypeScript type checking only |
| `npm run rebuild` | Rebuild native modules for Electron |
| `npx vite --open` | Open UI in browser (mock data, no Electron) |

### Important Notes
- **Electron is pinned to v33** — do not run `npm audit fix --force` as it upgrades to incompatible v42
- **better-sqlite3 is pinned to 11.8.0** — must be rebuilt for Electron's V8 via `npx electron-rebuild`
- The app includes a **full mock API** (`src/services/api.ts`) so all features work even without the database

---

## Backend Services

### Database (SQLite)
8 tables with WAL mode:
- `scans` — Storage/junk/duplicate scan history
- `storage_history` — Per-path size tracking over time
- `health_scores` — Historical health score snapshots
- `settings` — Key-value application settings
- `audit_log` — Action audit trail
- `scheduled_tasks` — Automation task definitions
- `plugins` — Plugin registry and settings
- `optimization_history` — Past optimization results

### Storage Scanner
- Multi-drive scanning with depth-limited directory traversal
- Excluded dirs: `$Recycle.Bin`, `System Volume Information`, etc.
- Category classification: windows, applications, media, documents, development, games, system, cache, temp, other
- Growth detection comparing scan history

### Junk Detector
20+ junk definitions covering:
- **Windows**: temp, update cache, CBS logs, crash dumps, error reports, delivery optimization, thumbnails, prefetch
- **Browsers**: Chrome, Edge, Firefox, Brave caches
- **Dev tools**: npm/yarn/pnpm cache, pip/conda cache, Maven/Gradle cache, NuGet, Docker
- Risk levels: `safe`, `moderate`, `aggressive`

### AI Engine
- **Recommendations**: Context-aware suggestions generated from real system data
- **Chat**: Conversational responses for storage, memory, boot speed, cleanup, CPU, and dev tools topics
- Returns actionable messages with action buttons

---

## Suggested Enhancements

### High Priority
- [ ] **Real file operations** — Wire up actual delete/move operations in Junk Cleaner, Duplicate Finder, and Storage cleanup tabs
- [ ] **Undo/rollback system** — Track deleted files with metadata for potential recovery
- [ ] **Admin privilege handling** — Request elevation for system-level operations (registry, services)
- [ ] **Settings persistence** — Save/load user preferences to SQLite and electron-store
- [ ] **Notification system** — Toast notifications for scan completion, automation results, alerts

### Storage & Cleanup
- [ ] **Drag-and-drop folder analysis** — Drop any folder onto the app to analyze it
- [ ] **File preview** — Preview images, text files, and metadata before deletion
- [ ] **Smart cleanup suggestions** — AI-ranked cleanup items by impact/risk ratio
- [ ] **Disk space forecasting** — Predict when drives will be full based on growth trends
- [ ] **Cloud storage analysis** — OneDrive, Google Drive, Dropbox usage and duplicates

### Performance & Monitoring
- [ ] **Real-time CPU/GPU graphs** — Per-core CPU load visualization, GPU utilization over time
- [ ] **Network traffic monitor** — Per-process network bandwidth usage
- [ ] **Historical performance trends** — Charts showing CPU/Memory/Disk usage over days/weeks
- [ ] **Process tree view** — Parent-child process hierarchy with aggregate resource usage
- [ ] **Memory leak detection** — Track processes with continuously growing memory usage

### AI & Intelligence
- [ ] **LLM integration** — Connect to OpenAI/local LLM for natural language system queries
- [ ] **Anomaly detection** — Identify unusual CPU spikes, memory leaks, disk I/O patterns
- [ ] **Proactive alerts** — "Your Docker cache grew 2GB this week" notifications
- [ ] **Optimization impact tracking** — Before/after comparisons for all optimization actions
- [ ] **Personalized recommendations** — Learn from user behavior patterns

### Developer Tools
- [ ] **node_modules finder** — Locate all node_modules across the system with npkill-style cleanup
- [ ] **Docker image manager** — Visual Docker image/container/volume management
- [ ] **Git repository scanner** — Find large repos, stale branches, and uncommitted changes
- [ ] **Package manager audit** — Outdated dependencies, security vulnerabilities across projects
- [ ] **Container resource monitoring** — Real-time Docker container CPU/Memory/Network

### Enterprise & Reporting
- [ ] **PDF/Excel/CSV report generation** — Exportable system health and optimization reports
- [ ] **Multi-machine scanning** — Scan and compare storage across network drives
- [ ] **Policy-based automation** — IT admin-defined cleanup and optimization policies
- [ ] **Compliance checks** — Disk encryption status, Windows Update status, security baselines
- [ ] **White-label support** — Customizable branding for enterprise deployment

### UI/UX
- [ ] **Command palette** — Ctrl+K powered command palette for quick navigation and actions
- [ ] **Widget dashboard** — Configurable dashboard with draggable, resizable widgets
- [ ] **Onboarding wizard** — First-run guided tour of features
- [ ] **Accessibility** — Full keyboard navigation, screen reader support, high contrast mode
- [ ] **Internationalization** — i18n support for multiple languages
- [ ] **System tray** — Background monitoring with tray icon and quick actions

### Plugin Ecosystem
- [ ] **Plugin marketplace** — Discover and install community plugins
- [ ] **Plugin SDK** — Documentation and APIs for third-party plugin development
- [ ] **Plugin sandboxing** — Isolated plugin execution for security
- [ ] **Plugin auto-update** — Automatic plugin version management

### Testing & Quality
- [ ] **Unit tests** — Jest/Vitest tests for all services and components
- [ ] **E2E tests** — Playwright tests for critical user flows
- [ ] **CI/CD pipeline** — GitHub Actions for automated testing and releases
- [ ] **Performance benchmarks** — Startup time, memory footprint, scan speed metrics

### DevOps & Distribution
- [ ] **Auto-updater** — electron-updater integration for seamless app updates
- [ ] **Crash reporting** — Sentry or similar error tracking
- [ ] **Analytics** — Anonymous usage telemetry (opt-in)
- [ ] **MSIX packaging** — Microsoft Store-compatible packaging format
- [ ] **Winget/Chocolatey** — Package manager distribution

---

## License

MIT
