import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { Dashboard } from './pages/Dashboard';
import { StorageAnalyzer } from './pages/StorageAnalyzer';
import { JunkCleaner } from './pages/JunkCleaner';
import { DuplicateFinder } from './pages/DuplicateFinder';
import { ResourceOptimizer } from './pages/ResourceOptimizer';
import { StartupOptimizer, ProcessIntelligence, DevToolsScanner } from './pages/AnalysisPages';
import { SsdHealth, HealthScore, AIChat } from './pages/SystemPages';
import { OneClickOptimize, Automation, Plugins, Settings } from './pages/UtilityPages';
import { DeveloperCenter } from './pages/DeveloperCenter';
import { AIAnalyzer } from './pages/AIAnalyzer';
import { Timeline } from './pages/Timeline';
import { PCDoctor } from './pages/PCDoctor';
import { OptimizationModes } from './pages/OptimizationModes';
import { AppIntelligence } from './pages/AppIntelligence';
import { SecurityPrivacy } from './pages/SecurityPrivacy';
import { useAppStore } from './stores/appStore';

export function App() {
  const { currentPage, theme } = useAppStore();

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
        {renderPage()}
      </ErrorBoundary>
      <ToastContainer />
    </Layout>
  );
}
