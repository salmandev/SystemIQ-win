import si from 'systeminformation';
import type { SystemInfo, ProcessInfo } from '../../shared/types';

export class SystemService {
  async getSystemInfo(): Promise<SystemInfo> {
    const [osInfo, cpuInfo, memInfo, diskInfo, gpuInfo, netInfo, batteryInfo] =
      await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.graphics(),
        si.networkStats(),
        si.battery(),
      ]);

    const cpuLoad = await si.currentLoad();
    const uptime = si.time().uptime;

    return {
      hostname: osInfo.hostname,
      platform: osInfo.platform,
      arch: osInfo.arch,
      os: `${osInfo.distro} ${osInfo.release}`,
      osVersion: osInfo.release,
      uptime,
      cpu: {
        manufacturer: cpuInfo.manufacturer,
        brand: cpuInfo.brand,
        cores: cpuInfo.cores,
        physicalCores: cpuInfo.physicalCores,
        speed: cpuInfo.speed,
        currentLoad: cpuLoad.currentLoad,
        loads: cpuLoad.cpus?.map(c => c.load) || [],
        temperature: undefined,
      },
      memory: {
        total: memInfo.total,
        used: memInfo.used,
        free: memInfo.free,
        usedPercent: (memInfo.used / memInfo.total) * 100,
        swapTotal: memInfo.swaptotal,
        swapUsed: memInfo.swapused,
        swapFree: memInfo.swapfree,
      },
      disks: diskInfo.map((d: any) => ({
        drive: d.mount?.charAt(0) || '',
        label: d.label || '',
        fsType: d.type || '',
        total: d.size,
        used: d.used,
        free: d.available,
        usedPercent: d.use,
        mount: d.mount,
        type: d.type || '',
      })),
      gpus: gpuInfo.controllers.map((g: any) => ({
        name: g.model || 'Unknown GPU',
        vendor: g.vendor || 'Unknown',
        memoryTotal: (g.vram || 0) * 1024 * 1024,
        memoryUsed: (g.vramUsed || 0) * 1024 * 1024,
        utilization: 0,
        temperature: g.temperatureGpu || g.temperature || 0,
      })),
      network: {
        interfaces: netInfo.map((n: any) => ({
          name: n.iface || '',
          type: n.type || '',
          ip4: '',
          mac: n.mac || '',
          speed: n.speed || 0,
          rxBytes: n.rx_bytes || 0,
          txBytes: n.tx_bytes || 0,
        })),
        downloadSpeed: 0,
        uploadSpeed: 0,
      },
      battery: batteryInfo.hasBattery
        ? {
            hasBattery: true,
            percent: batteryInfo.percent || 0,
            isCharging: batteryInfo.isCharging || false,
            acConnected: batteryInfo.acConnected || false,
            healthPercent: 100,
            timeRemaining: batteryInfo.timeRemaining || 0,
            cycleCount: batteryInfo.cycleCount || 0,
          }
        : undefined,
    };
  }

  async getProcesses(): Promise<ProcessInfo[]> {
    const procs = await si.processes();
    return procs.list.map((p: any) => ({
      pid: p.pid,
      name: p.name,
      command: p.command,
      cpu: p.cpu,
      memory: p.mem,
      memoryPercent: (p.mem / (p.memRss || 1)) * 100,
      diskRead: 0,
      diskWrite: 0,
      networkRx: 0,
      networkTx: 0,
      gpu: 0,
      status: p.state || p.status || 'running',
      started: p.started,
      user: p.user,
      priority: p.priority || 0,
    }));
  }

  async getRealtimeStats() {
    const [cpuLoad, mem, fsSize, netStats, processes] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
    ]);

    const topCpu = processes.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 10)
      .map(p => ({ name: p.name, pid: p.pid, cpu: p.cpu, mem: p.mem }));

    const topMem = processes.list
      .sort((a, b) => b.mem - a.mem)
      .slice(0, 10)
      .map(p => ({ name: p.name, pid: p.pid, cpu: p.cpu, mem: p.mem }));

    return {
      cpu: {
        load: cpuLoad.currentLoad,
        loads: cpuLoad.cpus?.map(c => c.load) || [],
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usedPercent: (mem.used / mem.total) * 100,
      },
      disks: fsSize.map((d: any) => ({
        drive: d.mount?.charAt(0) || d.mount,
        used: d.used,
        total: d.size,
        usedPercent: d.use,
      })),
      network: {
        downloadSpeed: netStats[0]?.rx_sec || 0,
        uploadSpeed: netStats[0]?.tx_sec || 0,
        totalDownload: netStats[0]?.rx_bytes || 0,
        totalUpload: netStats[0]?.tx_bytes || 0,
      },
      topCpu,
      topMem,
    };
  }

  async generateReport(config: { type: string }) {
    const sysInfo = await this.getSystemInfo();
    const healthData = {
      generated: new Date().toISOString(),
      system: sysInfo,
      type: config.type,
    };
    return JSON.stringify(healthData, null, 2);
  }
}
