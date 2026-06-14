/**
 * VMScanner - Virtual Machine Inventory Scanner
 * Detects and inventories VMs from Hyper-V, VirtualBox, and VMware.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuid } from 'uuid';
import type { Database } from './database';
import type { VMInventory, VMType, VMState, VMDisk, VMSnapshot } from '../../shared/types';

const execAsync = promisify(exec);

export class VMScanner {
  constructor(private db: Database | null) {}

  /** Run full VM inventory scan */
  async scan(): Promise<VMInventory[]> {
    const vms: VMInventory[] = [];

    const [hyperv, vbox, vmware, fileDetected] = await Promise.allSettled([
      this.scanHyperV(),
      this.scanVirtualBox(),
      this.scanVMware(),
      this.scanDiskFiles(),
    ]);

    if (hyperv.status === 'fulfilled') vms.push(...hyperv.value);
    if (vbox.status === 'fulfilled') vms.push(...vbox.value);
    if (vmware.status === 'fulfilled') vms.push(...vmware.value);
    if (fileDetected.status === 'fulfilled') {
      // Only add file-detected VMs that aren't already tracked
      const knownPaths = new Set(vms.flatMap(v => v.disks.map(d => d.path)));
      for (const vm of fileDetected.value) {
        const hasNew = vm.disks.some(d => !knownPaths.has(d.path));
        if (hasNew) vms.push(vm);
      }
    }

    // Persist to DB
    if (this.db) {
      for (const vm of vms) {
        try {
          this.db.upsertVM({
            id: vm.id,
            name: vm.name,
            type: vm.type,
            state: vm.state,
            memory: vm.memory,
            cpus: vm.cpus,
            total_size: vm.total_size,
            snapshot_count: vm.snapshots.length,
            disk_path: vm.disks[0]?.path || vm.path,
            last_used: vm.last_used,
            metadata: { disks: vm.disks, snapshots: vm.snapshots },
          });
        } catch { /* skip */ }
      }
    }

    return vms;
  }

  /** Scan Hyper-V VMs via PowerShell */
  private async scanHyperV(): Promise<VMInventory[]> {
    const vms: VMInventory[] = [];
    try {
      const { stdout } = await execAsync(
        'powershell -Command "Get-VM | Select-Object Name, State, MemoryAssigned, ProcessorCount, Path, Status | ConvertTo-Json" 2>nul',
        { maxBuffer: 5 * 1024 * 1024 },
      );
      const raw = JSON.parse(stdout);
      const vmArray = Array.isArray(raw) ? raw : raw ? [raw] : [];

      for (const vm of vmArray) {
        if (!vm.Name) continue;
        const disks = await this.getHyperVDisks(vm.Name);
        const snapshots = await this.getHyperVSnapshots(vm.Name);
        const totalSize = disks.reduce((s, d) => s + d.size, 0);

        vms.push({
          id: `hyperv-${vm.Name.replace(/\s+/g, '-').toLowerCase()}`,
          name: vm.Name,
          type: 'hyperv',
          state: this.mapHyperVState(vm.State),
          memory: vm.MemoryAssigned || 0,
          cpus: vm.ProcessorCount || 0,
          disks,
          snapshots,
          total_size: totalSize,
          last_used: Date.now(),
          path: vm.Path || '',
        });
      }
    } catch { /* Hyper-V not available */ }
    return vms;
  }

  private async getHyperVDisks(vmName: string): Promise<VMDisk[]> {
    const disks: VMDisk[] = [];
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-VMHardDiskDrive -VMName '${vmName}' | Select-Object Path | ConvertTo-Json" 2>nul`,
      );
      const raw = JSON.parse(stdout);
      const diskArray = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const d of diskArray) {
        if (!d.Path) continue;
        let size = 0;
        try { size = fs.statSync(d.Path).size; } catch { /* */ }
        disks.push({
          path: d.Path,
          size,
          type: d.Path.endsWith('.vhdx') ? 'vhdx' : d.Path.endsWith('.vmdk') ? 'vmdk' : 'unknown',
        });
      }
    } catch { /* skip */ }
    return disks;
  }

  private async getHyperVSnapshots(vmName: string): Promise<VMSnapshot[]> {
    const snaps: VMSnapshot[] = [];
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-VMSnapshot -VMName '${vmName}' | Select-Object Name, CreationTime | ConvertTo-Json" 2>nul`,
      );
      const raw = JSON.parse(stdout);
      const snapArray = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const s of snapArray) {
        snaps.push({
          name: s.Name || 'Unknown',
          timestamp: s.CreationTime ? new Date(s.CreationTime).getTime() : Date.now(),
          size: 0,
        });
      }
    } catch { /* skip */ }
    return snaps;
  }

  private mapHyperVState(state: string): VMState {
    const s = (state || '').toLowerCase();
    if (s.includes('running')) return 'running';
    if (s.includes('off')) return 'stopped';
    if (s.includes('paused')) return 'paused';
    if (s.includes('saved')) return 'saved';
    return 'unknown';
  }

  /** Scan VirtualBox VMs */
  private async scanVirtualBox(): Promise<VMInventory[]> {
    const vms: VMInventory[] = [];
    try {
      const { stdout } = await execAsync('VBoxManage list vms 2>nul');
      const lines = stdout.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const match = line.match(/^"(.+?)"\s+\{(.+?)\}/);
        if (!match) continue;
        const [, name, vmUuid] = match;
        const info = await this.getVBoxVMInfo(name, vmUuid);
        if (info) vms.push(info);
      }
    } catch { /* VirtualBox not installed */ }
    return vms;
  }

  private async getVBoxVMInfo(name: string, vmUuid: string): Promise<VMInventory | null> {
    try {
      const { stdout } = await execAsync(`VBoxManage showvminfo "${name}" --machinereadable 2>nul`);
      const props: Record<string, string> = {};
      for (const line of stdout.split('\n')) {
        const eq = line.indexOf('=');
        if (eq > 0) {
          props[line.slice(0, eq)] = line.slice(eq + 1).replace(/^"|"$/g, '');
        }
      }

      const disks: VMDisk[] = [];
      // Find disk paths from storage controllers
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('"') && (value.endsWith('.vdi') || value.endsWith('.vmdk') || value.endsWith('.vhd'))) {
          let size = 0;
          try { size = fs.statSync(value).size; } catch { /* */ }
          disks.push({
            path: value,
            size,
            type: value.endsWith('.vdi') ? 'vdi' : value.endsWith('.vmdk') ? 'vmdk' : 'unknown',
          });
        }
      }

      const memory = parseInt(props['memory'] || '0', 10) * 1024 * 1024;
      const cpus = parseInt(props['cpus'] || '1', 10);
      const state = props['VMState'] || 'unknown';

      return {
        id: `vbox-${vmUuid}`,
        name,
        type: 'virtualbox',
        state: state === 'running' ? 'running' : state === 'poweroff' ? 'stopped' : state === 'paused' ? 'paused' : 'unknown',
        memory,
        cpus,
        disks,
        snapshots: [],
        total_size: disks.reduce((s, d) => s + d.size, 0),
        last_used: Date.now(),
        path: props['CfgFile'] || '',
      };
    } catch {
      return null;
    }
  }

  /** Scan VMware VMs by searching for .vmx files */
  private async scanVMware(): Promise<VMInventory[]> {
    const vms: VMInventory[] = [];
    const searchPaths = [
      path.join(os.homedir(), 'Virtual Machines'),
      path.join(os.homedir(), 'Documents', 'Virtual Machines'),
      'D:\\Virtual Machines',
      'D:\\VMs',
    ];

    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) continue;
      try {
        const entries = fs.readdirSync(searchPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const vmDir = path.join(searchPath, entry.name);
          const vmxFile = this.findFile(vmDir, '.vmx');
          if (!vmxFile) continue;

          const disks: VMDisk[] = [];
          const vmdkFiles = this.findFiles(vmDir, '.vmdk');
          for (const vmdk of vmdkFiles) {
            // Skip descriptor files (small), only count flat/sparse
            try {
              const stat = fs.statSync(vmdk);
              if (stat.size > 1024 * 1024) { // > 1MB = real disk
                disks.push({ path: vmdk, size: stat.size, type: 'vmdk' });
              }
            } catch { /* skip */ }
          }

          vms.push({
            id: `vmware-${entry.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: entry.name,
            type: 'vmware',
            state: 'stopped',
            memory: 0,
            cpus: 0,
            disks,
            snapshots: [],
            total_size: disks.reduce((s, d) => s + d.size, 0),
            last_used: Date.now(),
            path: vmxFile,
          });
        }
      } catch { /* skip */ }
    }
    return vms;
  }

  /** Scan for orphan VM disk files in common locations */
  private async scanDiskFiles(): Promise<VMInventory[]> {
    const vms: VMInventory[] = [];
    const extensions = ['.vhdx', '.vmdk', '.vdi'];
    const searchPaths = [
      path.join(os.homedir(), 'Virtual Machines'),
      path.join(os.homedir(), 'Documents', 'Virtual Machines'),
      'C:\\Users\\Public\\Documents\\Hyper-V',
    ];

    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) continue;
      try {
        this.walkForDiskFiles(searchPath, extensions, vms, 0, 3);
      } catch { /* skip */ }
    }
    return vms;
  }

  private walkForDiskFiles(
    dir: string,
    extensions: string[],
    vms: VMInventory[],
    depth: number,
    maxDepth: number,
  ) {
    if (depth >= maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && extensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size > 10 * 1024 * 1024) { // > 10 MB
              const ext = path.extname(entry.name).toLowerCase();
              const vmType: VMType = ext === '.vhdx' ? 'hyperv' : ext === '.vmdk' ? 'vmware' : ext === '.vdi' ? 'virtualbox' : 'unknown';
              vms.push({
                id: `file-${uuid().slice(0, 8)}`,
                name: path.basename(entry.name, ext),
                type: vmType,
                state: 'unknown',
                memory: 0,
                cpus: 0,
                disks: [{ path: fullPath, size: stat.size, type: ext.slice(1) as any }],
                snapshots: [],
                total_size: stat.size,
                last_used: stat.mtimeMs,
                path: fullPath,
              });
            }
          } catch { /* skip */ }
        } else if (entry.isDirectory()) {
          this.walkForDiskFiles(fullPath, extensions, vms, depth + 1, maxDepth);
        }
      }
    } catch { /* skip */ }
  }

  private findFile(dir: string, ext: string): string | null {
    try {
      const entries = fs.readdirSync(dir);
      for (const e of entries) {
        if (e.toLowerCase().endsWith(ext)) return path.join(dir, e);
      }
    } catch { /* skip */ }
    return null;
  }

  private findFiles(dir: string, ext: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir);
      for (const e of entries) {
        if (e.toLowerCase().endsWith(ext)) results.push(path.join(dir, e));
      }
    } catch { /* skip */ }
    return results;
  }
}
