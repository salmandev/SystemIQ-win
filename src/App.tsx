import React, { useEffect, Suspense, lazy } from 'react';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { useAppStore } from './stores/appStore';

// Eagerly load Dashboard (default page - always needed immediately)
import { Dashboard } from './pages/Dashboard';

// Lazy-load all other pages (loaded on first navigation)
const StorageAnalyzer = lazy(() => import('./pages/StorageAnalyzer').then(m => ({ default: m.StorageAnalyzer })));
const JunkCleaner = lazy(() => import('./pages/JunkCleaner').then(m => ({ default: m.JunkCleaner })));
const DuplicateFinder = lazy(() => import('./pages/DuplicateFinder').then(m => ({ default: m.DuplicateFinder })));
const ResourceOptimizer = lazy(() => import('./pages/ResourceOptimizer').then(m => ({ default: m.ResourceOptimizer })));
const StartupOptimizer = lazy(() => import('./pages/AnalysisPages').then(m => ({ default: m.StartupOptimizer })));
const ProcessIntelligence = lazy(() => import('./pages/AnalysisPages').then(m => ({ default: m.ProcessIntelligence })));
const DevToolsScanner = lazy(() => import('./pages/AnalysisPages').then(m => ({ default: m.DevToolsScanner })));
const SsdHealth = lazy(() => import('./pages/SystemPages').then(m => ({ default: m.SsdHealth })));
const HealthScore = lazy(() => import('./pages/SystemPages').then(m => ({ default: m.HealthScore })));
const AIChat = lazy(() => import('./pages/SystemPages').then(m => ({ default: m.AIChat })));
const OneClickOptimize = lazy(() => import('./pages/UtilityPages').then(m => ({ default: m.OneClickOptimize })));
const Automation = lazy(() => import('./pages/UtilityPages').then(m => ({ default: m.Automation })));
const Plugins = lazy(() => import('./pages/UtilityPages').then(m => ({ default: m.Plugins })));
const Settings = lazy(() => import('./pages/UtilityPages').then(m => ({ default: m.Settings })));
const DeveloperCenter = lazy(() => import('./pages/DeveloperCenter').then(m => ({ default: m.DeveloperCenter })));
const AIAnalyzer = lazy(() => import('./pages/AIAnalyzer').then(m => ({ default: m.AIAnalyzer })));
const Timeline = lazy(() => import('./pages/Timeline').then(m => ({ default: m.Timeline })));
const PCDoctor = lazy(() => import('./pages/PCDoctor').then(m => ({ default: m.PCDoctor })));
const OptimizationModes = lazy(() => import('./pages/OptimizationModes').then(m => ({ default: m.OptimizationModes })));
const AppIntelligence = lazy(() => import('./pages/AppIntelligence').then(m => ({ default: m.AppIntelligence })));
const SecurityPrivacy = lazy(() => import('./pages/SecurityPrivacy').then(m => ({ default: m.SecurityPrivacy })));

// Skeleton loading fallback
function PageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      <div>
        <div className="h-7 w-64 rounded bg-[var(--bg-hover)]" />
        <div className="h-4 w-96 rounded bg-[var(--bg-hover)] mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 rounded-lg bg-[var(--bg-hover)]" />
        <div className="h-48 rounded-lg bg-[var(--bg-hover)]" />
      </div>
    </div>
  );
}

export function App() {
  const currentPage = useAppStore(s => s.currentPage);
  const theme = useAppStore(s => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'storage': return <StorageAnalyzer />;
      case 'junk': return <JunkCleaner />;
      case 'duplicates': return <DuplicateFinder />;
      case 'resources': return <ResourceOptimizer />;
      case 'startup': return <StartupOptimizer />;
      case 'processes': return <ProcessIntelligence />;
      case 'devtools': return <DevToolsScanner />;
      case 'ssd-health': return <SsdHealth />;
      case 'health-score': return <HealthScore />;
      case 'ai-chat': return <AIChat />;
      case 'optimization': return <OneClickOptimize />;
      case 'automation': return <Automation />;
      case 'plugins': return <Plugins />;
      case 'settings': return <Settings />;
      case 'developer-center': return <DeveloperCenter />;
      case 'ai-analyzer': return <AIAnalyzer />;
      case 'timeline': return <Timeline />;
      case 'pc-doctor': return <PCDoctor />;
      case 'opt-modes': return <OptimizationModes />;
      case 'app-intelligence': return <AppIntelligence />;
      case 'security-privacy': return <SecurityPrivacy />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          {renderPage()}
        </Suspense>
      </ErrorBoundary>
      <ToastContainer />
    </Layout>
  );
}
