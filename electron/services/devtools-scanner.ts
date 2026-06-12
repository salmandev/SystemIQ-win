import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import type { DevToolsScanResult, DevToolReport, DevToolItem } from '../../shared/types';

const execAsync = promisify(exec);

export class DevToolsScanner {
  async scan(): Promise<DevToolsScanResult> {
    const home = os.homedir();
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const tools: DevToolReport[] = [];

    tools.push(await this.scanDocker(home, localAppData));
    tools.push(await this.scanNodeJs(home, localAppData));
    tools.push(await this.scanPython(home, localAppData));
    tools.push(await this.scanJava(home));
    tools.push(await this.scanGit(home));
    tools.push(await this.scanKubernetes(home));
    tools.push(await this.scanNuGet(home, localAppData));
    tools.push(await this.scanVisualStudio(localAppData));

    const installedTools = tools.filter(t => t.installed);
    const totalRecoverable = installedTools.reduce((sum, t) => sum + t.recoverable, 0);

    return {
      scanId: uuid(),
      timestamp: Date.now(),
      totalRecoverable,
      tools: installedTools,
    };
  }

  private async scanDocker(home: string, localAppData: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'Docker', icon: '🐳', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    try {
      const { stdout } = await execAsync('docker --version 2>nul');
      if (stdout.includes('Docker')) {
        report.installed = true;
        report.version = stdout.trim();

        // Check Docker data size
        const dockerPath = path.join(localAppData, 'Docker', 'wsl');
        if (fs.existsSync(dockerPath)) {
          const size = await this.getDirSize(dockerPath);
          report.size = size;
        }

        // Check for dangling images
        try {
          const { stdout: dangling } = await execAsync('docker images -f dangling=true -q 2>nul');
          const imageCount = dangling.split('\n').filter(l => l.trim()).length;
          if (imageCount > 0) {
            report.items.push({
              name: `${imageCount} Dangling Images`,
              path: 'docker images',
              size: imageCount * 500 * 1024 * 1024,
              description: 'Unused Docker images with no tags',
              safeToDelete: true,
            });
            report.recoverable += imageCount * 500 * 1024 * 1024;
            report.recommendations.push(`Run 'docker image prune' to remove ${imageCount} dangling images`);
          }
        } catch {
          // Docker not running
        }

        // Check stopped containers
        try {
          const { stdout: containers } = await execAsync('docker ps -a -f status=exited -q 2>nul');
          const containerCount = containers.split('\n').filter(l => l.trim()).length;
          if (containerCount > 0) {
            report.items.push({
              name: `${containerCount} Stopped Containers`,
              path: 'docker ps -a',
              size: containerCount * 100 * 1024 * 1024,
              description: 'Docker containers that have stopped',
              safeToDelete: true,
            });
            report.recoverable += containerCount * 100 * 1024 * 1024;
            report.recommendations.push(`Run 'docker container prune' to remove ${containerCount} stopped containers`);
          }
        } catch {
          // Docker not running
        }
      }
    } catch {
      // Docker not installed
    }

    return report;
  }

  private async scanNodeJs(home: string, localAppData: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'Node.js / npm', icon: '🟢', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    try {
      const { stdout } = await execAsync('node --version 2>nul');
      if (stdout.includes('v')) {
        report.installed = true;
        report.version = stdout.trim();

        // npm cache
        const npmCachePath = path.join(localAppData, 'npm-cache');
        if (fs.existsSync(npmCachePath)) {
          const size = await this.getDirSize(npmCachePath);
          report.size += size;
          report.items.push({
            name: 'npm Cache', path: npmCachePath, size,
            description: 'npm package cache', safeToDelete: true,
          });
          report.recoverable += size;
          report.recommendations.push(`Run 'npm cache clean --force' to clear ${(size / (1024 * 1024 * 1024)).toFixed(1)} GB npm cache`);
        }

        // yarn cache
        const yarnCachePath = path.join(localAppData, 'Yarn', 'Cache');
        if (fs.existsSync(yarnCachePath)) {
          const size = await this.getDirSize(yarnCachePath);
          report.size += size;
          report.items.push({
            name: 'Yarn Cache', path: yarnCachePath, size,
            description: 'Yarn package cache', safeToDelete: true,
          });
          report.recoverable += size;
        }

        // pnpm store
        const pnpmStorePath = path.join(localAppData, 'pnpm-store');
        if (fs.existsSync(pnpmStorePath)) {
          const size = await this.getDirSize(pnpmStorePath);
          report.size += size;
          report.items.push({
            name: 'pnpm Store', path: pnpmStorePath, size,
            description: 'pnpm global store', safeToDelete: true,
          });
          report.recoverable += size;
        }

        // Find node_modules folders
        const homeDir = os.homedir();
        const nmPaths = [
          path.join(homeDir, 'Documents'),
          path.join(homeDir, 'Desktop'),
          path.join(homeDir, 'Projects'),
        ];
        let nmTotalSize = 0;
        let nmCount = 0;
        for (const searchPath of nmPaths) {
          if (fs.existsSync(searchPath)) {
            const found = await this.findNodeModules(searchPath);
            nmTotalSize += found.reduce((s, f) => s + f.size, 0);
            nmCount += found.length;
          }
        }
        if (nmCount > 0) {
          report.size += nmTotalSize;
          report.items.push({
            name: `${nmCount} node_modules Folders`,
            path: 'Multiple locations',
            size: nmTotalSize,
            description: 'Node.js dependency folders across your projects',
            safeToDelete: false,
          });
          report.recoverable += nmTotalSize * 0.5; // Estimate 50% are unused
          report.recommendations.push(`Found ${nmCount} node_modules folders totaling ${(nmTotalSize / (1024 * 1024 * 1024)).toFixed(1)} GB. Use 'npx npkill' to find and clean unused ones.`);
        }
      }
    } catch {
      // Node.js not installed
    }

    return report;
  }

  private async scanPython(home: string, localAppData: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'Python', icon: '🐍', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    try {
      const { stdout } = await execAsync('python --version 2>nul');
      if (stdout.includes('Python')) {
        report.installed = true;
        report.version = stdout.trim();

        // pip cache
        const pipCachePath = path.join(localAppData, 'pip', 'cache');
        if (fs.existsSync(pipCachePath)) {
          const size = await this.getDirSize(pipCachePath);
          report.size += size;
          report.items.push({
            name: 'pip Cache', path: pipCachePath, size,
            description: 'Python pip package cache', safeToDelete: true,
          });
          report.recoverable += size;
          report.recommendations.push(`Run 'pip cache purge' to clear pip cache`);
        }

        // Conda packages
        const condaPath = path.join(home, '.conda', 'pkgs');
        if (fs.existsSync(condaPath)) {
          const size = await this.getDirSize(condaPath);
          report.size += size;
          report.items.push({
            name: 'Conda Packages', path: condaPath, size,
            description: 'Conda package cache and tarballs', safeToDelete: true,
          });
          report.recoverable += size;
          report.recommendations.push(`Run 'conda clean --all' to clean conda packages`);
        }
      }
    } catch {
      // Python not installed
    }

    return report;
  }

  private async scanJava(home: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'Java / Maven / Gradle', icon: '☕', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    try {
      const { stdout } = await execAsync('java -version 2>&1');
      if (stdout.includes('java') || stdout.includes('jdk')) {
        report.installed = true;
        report.version = stdout.split('\n')[0]?.trim() || '';

        // Maven repository
        const mavenPath = path.join(home, '.m2', 'repository');
        if (fs.existsSync(mavenPath)) {
          const size = await this.getDirSize(mavenPath);
          report.size += size;
          report.items.push({
            name: 'Maven Repository', path: mavenPath, size,
            description: 'Maven local artifact repository', safeToDelete: false,
          });
          report.recoverable += size * 0.3;
          report.recommendations.push(`Maven repository is ${(size / (1024 * 1024 * 1024)).toFixed(1)} GB. Delete old artifacts you no longer need.`);
        }

        // Gradle cache
        const gradlePath = path.join(home, '.gradle', 'caches');
        if (fs.existsSync(gradlePath)) {
          const size = await this.getDirSize(gradlePath);
          report.size += size;
          report.items.push({
            name: 'Gradle Cache', path: gradlePath, size,
            description: 'Gradle dependency and build cache', safeToDelete: true,
          });
          report.recoverable += size;
          report.recommendations.push(`Run 'gradle --stop' and delete ~/.gradle/caches to recover ${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`);
        }
      }
    } catch {
      // Java not installed
    }

    return report;
  }

  private async scanGit(home: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'Git', icon: '📝', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    try {
      const { stdout } = await execAsync('git --version 2>nul');
      if (stdout.includes('git')) {
        report.installed = true;
        report.version = stdout.trim();
        report.recommendations.push('Run git gc on large repositories to optimize storage');
      }
    } catch {
      // Git not installed
    }

    return report;
  }

  private async scanKubernetes(home: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'Kubernetes', icon: '☸️', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    try {
      const { stdout } = await execAsync('kubectl version --client 2>nul');
      if (stdout.includes('Client')) {
        report.installed = true;

        const kubePath = path.join(home, '.kube');
        if (fs.existsSync(kubePath)) {
          const size = await this.getDirSize(kubePath);
          report.size = size;
          report.items.push({
            name: 'Kubernetes Config & Cache', path: kubePath, size,
            description: 'kubectl configuration and cache', safeToDelete: false,
          });
        }
        report.recommendations.push('Review ~/.kube/cache for old cluster data');
      }
    } catch {
      // kubectl not installed
    }

    return report;
  }

  private async scanNuGet(home: string, localAppData: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'NuGet', icon: '💜', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    const nugetPath = path.join(home, '.nuget', 'packages');
    if (fs.existsSync(nugetPath)) {
      report.installed = true;
      const size = await this.getDirSize(nugetPath);
      report.size = size;
      report.items.push({
        name: 'NuGet Packages', path: nugetPath, size,
        description: 'NuGet package cache', safeToDelete: true,
      });
      report.recoverable = size;
      report.recommendations.push(`Run 'dotnet nuget locals all --clear' to clear NuGet cache`);
    }

    return report;
  }

  private async scanVisualStudio(localAppData: string): Promise<DevToolReport> {
    const report: DevToolReport = {
      name: 'Visual Studio', icon: '💻', installed: false, size: 0, recoverable: 0,
      items: [], recommendations: [],
    };

    const vsPath = path.join(localAppData, 'Microsoft', 'VisualStudio');
    if (fs.existsSync(vsPath)) {
      report.installed = true;
      const size = await this.getDirSize(vsPath);
      report.size = size;

      const cachePath = path.join(localAppData, 'Microsoft', 'VisualStudio', 'Packages');
      if (fs.existsSync(cachePath)) {
        const cacheSize = await this.getDirSize(cachePath);
        report.items.push({
          name: 'VS Package Cache', path: cachePath, size: cacheSize,
          description: 'Visual Studio installer package cache', safeToDelete: false,
        });
      }
      report.recommendations.push('Use Visual Studio Installer to clean up unused components');
    }

    return report;
  }

  private async getDirSize(dirPath: string): Promise<number> {
    try {
      let size = 0;
      const walk = (dir: string, depth: number) => {
        if (depth > 5) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
              try {
                size += fs.statSync(fullPath).size;
              } catch {
                // Skip
              }
            } else if (entry.isDirectory()) {
              walk(fullPath, depth + 1);
            }
          }
        } catch {
          // Skip
        }
      };
      walk(dirPath, 0);
      return size;
    } catch {
      return 0;
    }
  }

  private async findNodeModules(searchPath: string): Promise<{ path: string; size: number }[]> {
    const results: { path: string; size: number }[] = [];
    try {
      const entries = fs.readdirSync(searchPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(searchPath, entry.name);
          if (entry.name === 'node_modules') {
            const size = await this.getDirSize(fullPath);
            results.push({ path: fullPath, size });
          } else if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const sub = await this.findNodeModules(fullPath);
            results.push(...sub);
          }
        }
      }
    } catch {
      // Skip
    }
    return results;
  }
}
