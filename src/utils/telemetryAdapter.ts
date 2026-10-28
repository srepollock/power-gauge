import type {
  AppSettings,
  DiskTelemetry,
  GaugeItemConfig,
  NetworkTelemetry,
  NormalizedGaugeData,
  SystemTelemetry,
} from "../types.ts";

export const THEME_ACCENTS: Record<
  AppSettings["themePreset"],
  {
    cpu: string;
    memory: string;
    disk: string;
    network: string;
    gpu: string;
    warning: string;
    critical: string;
  }
> = {
  "cyber-cyan": {
    cpu: "#00f0ff",
    memory: "#a855f7",
    disk: "#3b82f6",
    network: "#10b981",
    gpu: "#f43f5e",
    warning: "#f59e0b",
    critical: "#ef4444",
  },
  "tach-redline": {
    cpu: "#f97316",
    memory: "#eab308",
    disk: "#38bdf8",
    network: "#22c55e",
    gpu: "#ef4444",
    warning: "#fb923c",
    critical: "#dc2626",
  },
  "emerald-matrix": {
    cpu: "#10b981",
    memory: "#34d399",
    disk: "#06b6d4",
    network: "#84cc16",
    gpu: "#22d3ee",
    warning: "#facc15",
    critical: "#f43f5e",
  },
  "solar-amber": {
    cpu: "#f59e0b",
    memory: "#fbbf24",
    disk: "#fb923c",
    network: "#38bdf8",
    gpu: "#f43f5e",
    warning: "#f97316",
    critical: "#ef4444",
  },
  "violet-plasma": {
    cpu: "#c084fc",
    memory: "#818cf8",
    disk: "#38bdf8",
    network: "#2dd4bf",
    gpu: "#f472b6",
    warning: "#fbbf24",
    critical: "#fb7185",
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  globalStyle: "radial",
  dockLayout: "horizontal",
  gridColumns: 3,
  gaugeScale: "standard",
  zOrderMode: "always-on-top",
  ghostMode: false,
  showInTaskbar: true,
  launchAtStartup: false,
  snapToEdges: true,
  pollingIntervalMs: 1000,
  backgroundOpacity: 0.82,
  backdropBlur: true,
  showSparkline: true,
  showPeakHold: true,
  showSubMetrics: true,
  warningThreshold: 72,
  criticalThreshold: 88,
  networkUnit: "Mbps",
  showLogicalVolumes: false,
  showAllNetworkAdapters: false,
  themePreset: "cyber-cyan",
  gauges: {},
};

export function getOrCreateGaugeConfig(
  settings: AppSettings,
  id: string
): GaugeItemConfig {
  const existing = settings.gauges[id];
  if (existing) {
    return existing;
  }
  return {
    id,
    enabled: true,
    detached: false,
    styleOverride: "global",
    scaleOverride: "global",
    accentColor: null,
    diskMode: "active-time",
    netScaleMode: "auto-scale",
    netCustomMaxMbps: 1000,
    detachedX: null,
    detachedY: null,
  };
}

export function formatBytesPerSec(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "0 KB/s";
  const kb = bytesPerSec / 1024;
  if (kb < 1000) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB/s`;
  }
  const mb = kb / 1024;
  if (mb < 1000) {
    return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB/s`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB/s`;
}

export function formatNetworkSpeed(
  bytesPerSec: number,
  unit: "Mbps" | "MB/s"
): { value: string; unitLabel: string; full: string } {
  if (unit === "MB/s") {
    const full = formatBytesPerSec(bytesPerSec);
    const [val, u] = full.split(" ");
    return { value: val, unitLabel: u || "MB/s", full };
  }
  const bitsPerSec = Math.max(0, bytesPerSec * 8);
  const kbps = bitsPerSec / 1000;
  if (kbps < 1000) {
    const v = kbps < 10 ? kbps.toFixed(1) : Math.round(kbps).toString();
    return { value: v, unitLabel: "Kbps", full: `${v} Kbps` };
  }
  const mbps = kbps / 1000;
  if (mbps < 1000) {
    const v = mbps < 10 ? mbps.toFixed(2) : mbps.toFixed(1);
    return { value: v, unitLabel: "Mbps", full: `${v} Mbps` };
  }
  const gbps = mbps / 1000;
  const v = gbps.toFixed(2);
  return { value: v, unitLabel: "Gbps", full: `${v} Gbps` };
}

export function buildNormalizedGauges(
  telemetry: SystemTelemetry,
  settings: AppSettings,
  peaks: Record<string, number>,
  histories: Record<string, number[]>
): NormalizedGaugeData[] {
  const palette = THEME_ACCENTS[settings.themePreset] || THEME_ACCENTS["cyber-cyan"];
  const list: NormalizedGaugeData[] = [];

  // 1. CPU
  const cpuId = "cpu";
  const cpuCfg = getOrCreateGaugeConfig(settings, cpuId);
  const cpuPct = clampPct(telemetry.cpu.usagePercent);
  const cpuGhz = (telemetry.cpu.frequencyMhz / 1000).toFixed(2);
  const cpuBadges: NormalizedGaugeData["badges"] = [
    { label: "CLK", value: `${cpuGhz} GHz` },
    {
      label: "CORES",
      value: `${telemetry.cpu.physicalCores}C/${telemetry.cpu.logicalCores}T`,
    },
  ];
  if (telemetry.cpu.temperatureC !== null && telemetry.cpu.temperatureC > 0) {
    cpuBadges.push({
      label: "TEMP",
      value: `${Math.round(telemetry.cpu.temperatureC)}°C`,
      highlight: telemetry.cpu.temperatureC >= 80,
    });
  } else {
    cpuBadges.push({
      label: "PROCS",
      value: `${telemetry.cpu.processCount}`,
    });
  }

  list.push({
    id: cpuId,
    category: "cpu",
    title: "CPU",
    subtitle: shortenBrand(telemetry.cpu.brand),
    primaryPercent: cpuPct,
    primaryText: `${Math.round(cpuPct)}`,
    primaryUnit: "%",
    secondaryLabel: "CLOCK",
    secondaryValue: `${cpuGhz} GHz`,
    peakPercent: peaks[cpuId] ?? cpuPct,
    history: histories[cpuId] ?? [cpuPct],
    badges: cpuBadges,
    defaultAccent: cpuCfg.accentColor || palette.cpu,
  });

  // 2. MEMORY
  const memId = "memory";
  const memCfg = getOrCreateGaugeConfig(settings, memId);
  const memPct = clampPct(telemetry.memory.usagePercent);
  const memBadges: NormalizedGaugeData["badges"] = [
    {
      label: "USED",
      value: `${telemetry.memory.usedGb.toFixed(1)}/${telemetry.memory.totalGb.toFixed(0)} GB`,
    },
    {
      label: "FREE",
      value: `${telemetry.memory.availableGb.toFixed(1)} GB`,
    },
  ];
  if (telemetry.memory.swapTotalGb > 0) {
    memBadges.push({
      label: "SWAP",
      value: `${Math.round(telemetry.memory.swapPercent)}%`,
    });
  }

  list.push({
    id: memId,
    category: "memory",
    title: "MEMORY",
    subtitle: `${telemetry.memory.usedGb.toFixed(1)} / ${telemetry.memory.totalGb.toFixed(1)} GB`,
    primaryPercent: memPct,
    secondaryPercent: clampPct(telemetry.memory.swapPercent),
    primaryText: `${Math.round(memPct)}`,
    primaryUnit: "%",
    secondaryLabel: "AVAIL",
    secondaryValue: `${telemetry.memory.availableGb.toFixed(1)} GB`,
    peakPercent: peaks[memId] ?? memPct,
    history: histories[memId] ?? [memPct],
    badges: memBadges,
    defaultAccent: memCfg.accentColor || palette.memory,
  });

  // 3. DISK N
  const disksToShow = telemetry.disks.filter((d) =>
    settings.showLogicalVolumes ? true : d.isPhysical
  );
  for (const disk of disksToShow) {
    const dCfg = getOrCreateGaugeConfig(settings, disk.id);
    const mode = dCfg.diskMode || "active-time";
    const activePct = clampPct(disk.activeTimePercent);
    const spacePct = clampPct(disk.usedSpacePercent);

    let primaryPct = activePct;
    let secondaryPct = spacePct;
    let modeSubtitle = disk.subLabel || disk.model;

    if (mode === "used-space") {
      primaryPct = spacePct;
      secondaryPct = activePct;
      modeSubtitle = `${disk.usedGb.toFixed(0)}/${disk.totalGb.toFixed(0)} GB (${disk.subLabel})`;
    } else if (mode === "split") {
      primaryPct = activePct;
      secondaryPct = spacePct;
    }

    const readStr = formatBytesPerSec(disk.readBytesPerSec);
    const writeStr = formatBytesPerSec(disk.writeBytesPerSec);

    list.push({
      id: disk.id,
      category: "disk",
      title: disk.label,
      subtitle: modeSubtitle,
      primaryPercent: primaryPct,
      secondaryPercent: secondaryPct,
      primaryText: `${Math.round(primaryPct)}`,
      primaryUnit: "%",
      secondaryLabel: mode === "used-space" ? "ACTIVE" : "SPACE",
      secondaryValue:
        mode === "used-space"
          ? `${Math.round(activePct)}%`
          : `${Math.round(spacePct)}%`,
      peakPercent: peaks[disk.id] ?? primaryPct,
      history: histories[disk.id] ?? [primaryPct],
      badges: [
        { label: "READ", value: readStr },
        { label: "WRITE", value: writeStr },
        {
          label: "CAP",
          value:
            disk.totalGb >= 1000
              ? `${(disk.usedGb / 1024).toFixed(1)}/${(disk.totalGb / 1024).toFixed(1)} TB`
              : `${disk.usedGb.toFixed(0)}/${disk.totalGb.toFixed(0)} GB`,
        },
      ],
      defaultAccent: dCfg.accentColor || palette.disk,
      isDualMode: mode === "split",
    });
  }

  // 4. ETHERNET / NETWORK
  const netsToShow = selectNetworks(
    telemetry.networks,
    settings.showAllNetworkAdapters
  );
  for (const net of netsToShow) {
    const nCfg = getOrCreateGaugeConfig(settings, net.id);
    const scaleMode = nCfg.netScaleMode || "auto-scale";
    const downFmt = formatNetworkSpeed(
      net.downloadBytesPerSec,
      settings.networkUnit
    );
    const upFmt = formatNetworkSpeed(
      net.uploadBytesPerSec,
      settings.networkUnit
    );
    const totalFmt = formatNetworkSpeed(
      net.downloadBytesPerSec + net.uploadBytesPerSec,
      settings.networkUnit
    );

    let primaryPct = clampPct(net.autoScalePercent);
    let secondaryPct = clampPct(net.uploadPercent);
    let isDual = false;

    if (scaleMode === "link-speed") {
      const customMaxMbps = nCfg.netCustomMaxMbps || net.linkSpeedMbps || 1000;
      const totalMbps =
        ((net.downloadBytesPerSec + net.uploadBytesPerSec) * 8) / 1_000_000;
      primaryPct = clampPct((totalMbps / Math.max(1, customMaxMbps)) * 100);
      secondaryPct = clampPct(
        ((net.uploadBytesPerSec * 8) / 1_000_000 / Math.max(1, customMaxMbps)) *
          100
      );
    } else if (scaleMode === "dual-needle") {
      primaryPct = clampPct(net.downloadPercent);
      secondaryPct = clampPct(net.uploadPercent);
      isDual = true;
    }

    list.push({
      id: net.id,
      category: "network",
      title: net.label,
      subtitle: `${net.interfaceName} (${net.linkSpeedMbps} Mbps)`,
      primaryPercent: primaryPct,
      secondaryPercent: secondaryPct,
      primaryText: scaleMode === "dual-needle" ? downFmt.value : totalFmt.value,
      primaryUnit:
        scaleMode === "dual-needle" ? downFmt.unitLabel : totalFmt.unitLabel,
      secondaryLabel: "UP",
      secondaryValue: upFmt.full,
      peakPercent: peaks[net.id] ?? primaryPct,
      history: histories[net.id] ?? [primaryPct],
      badges: [
        { label: "DOWN", value: downFmt.full, highlight: net.downloadBytesPerSec > 1024 * 1024 },
        { label: "UP", value: upFmt.full },
        { label: "LINK", value: `${net.linkSpeedMbps >= 1000 ? `${net.linkSpeedMbps / 1000}G` : `${net.linkSpeedMbps}M`}` },
      ],
      defaultAccent: nCfg.accentColor || palette.network,
      isDualMode: isDual,
    });
  }

  // 5. GPU N
  for (const gpu of telemetry.gpus) {
    const gCfg = getOrCreateGaugeConfig(settings, gpu.id);
    const corePct = clampPct(gpu.coreUsagePercent);
    const vramPct = clampPct(gpu.vramPercent);

    const gpuBadges: NormalizedGaugeData["badges"] = [
      {
        label: "VRAM",
        value:
          gpu.vramTotalGb > 0
            ? `${gpu.vramUsedGb.toFixed(1)}/${gpu.vramTotalGb.toFixed(0)} GB`
            : `${Math.round(vramPct)}%`,
      },
    ];

    if (gpu.temperatureC !== null && gpu.temperatureC > 0) {
      gpuBadges.push({
        label: "TEMP",
        value: `${Math.round(gpu.temperatureC)}°C`,
        highlight: gpu.temperatureC >= 80,
      });
    }
    if (gpu.powerWatts !== null && gpu.powerWatts > 0) {
      gpuBadges.push({
        label: "PWR",
        value: `${Math.round(gpu.powerWatts)} W`,
      });
    } else if (gpu.clockMhz !== null && gpu.clockMhz > 0) {
      gpuBadges.push({
        label: "CLK",
        value: `${Math.round(gpu.clockMhz)} MHz`,
      });
    } else {
      gpuBadges.push({
        label: "VRAM%",
        value: `${Math.round(vramPct)}%`,
      });
    }

    list.push({
      id: gpu.id,
      category: "gpu",
      title: gpu.label,
      subtitle: shortenGpuName(gpu.name),
      primaryPercent: corePct,
      secondaryPercent: vramPct,
      primaryText: `${Math.round(corePct)}`,
      primaryUnit: "%",
      secondaryLabel: "VRAM",
      secondaryValue:
        gpu.vramTotalGb > 0
          ? `${gpu.vramUsedGb.toFixed(1)} GB`
          : `${Math.round(vramPct)}%`,
      peakPercent: peaks[gpu.id] ?? corePct,
      history: histories[gpu.id] ?? [corePct],
      badges: gpuBadges,
      defaultAccent: gCfg.accentColor || palette.gpu,
    });
  }

  return list;
}

function selectNetworks(
  networks: NetworkTelemetry[],
  showAll: boolean
): NetworkTelemetry[] {
  if (networks.length === 0) {
    return [
      {
        id: "ethernet",
        label: "ETHERNET",
        interfaceName: "Ethernet",
        isEthernet: true,
        downloadBytesPerSec: 0,
        uploadBytesPerSec: 0,
        linkSpeedMbps: 1000,
        utilizationPercent: 0,
        autoScalePercent: 0,
        downloadPercent: 0,
        uploadPercent: 0,
      },
    ];
  }
  if (showAll) {
    return networks;
  }
  const primary = networks[0];
  return [primary];
}

function clampPct(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(100, val));
}

function shortenBrand(brand: string): string {
  if (!brand) return "System Processor";
  return brand
    .replace(/\(R\)/gi, "")
    .replace(/\(TM\)/gi, "")
    .replace(/CPU/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenGpuName(name: string): string {
  if (!name) return "Graphics Adapter";
  return name
    .replace(/NVIDIA\s+/i, "")
    .replace(/AMD\s+/i, "")
    .replace(/Intel\(R\)\s+/i, "Intel ")
    .replace(/\s+/g, " ")
    .trim();
}
