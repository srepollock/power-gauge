export type GaugeStyle = "radial" | "tachometer" | "ring" | "led-bar";

export type DiskDisplayMode = "active-time" | "used-space" | "split";

export type NetworkScaleMode = "auto-scale" | "link-speed" | "dual-needle";

export type NetworkUnit = "Mbps" | "MB/s";

export type DockLayout = "horizontal" | "vertical" | "grid";

export type GaugeScale = "mini" | "standard" | "large";

export type ZOrderMode = "always-on-top" | "desktop-widget" | "normal";

export interface CpuTelemetry {
  usagePercent: number;
  perCorePercent: number[];
  frequencyMhz: number;
  temperatureC: number | null;
  powerWatts: number | null;
  brand: string;
  physicalCores: number;
  logicalCores: number;
  processCount: number;
}

export interface MemoryTelemetry {
  usagePercent: number;
  usedGb: number;
  totalGb: number;
  availableGb: number;
  swapUsedGb: number;
  swapTotalGb: number;
  swapPercent: number;
}

export interface DiskTelemetry {
  id: string;
  index: number;
  label: string;
  subLabel: string;
  model: string;
  mountPoints: string[];
  isPhysical: boolean;
  activeTimePercent: number;
  usedSpacePercent: number;
  readBytesPerSec: number;
  writeBytesPerSec: number;
  usedGb: number;
  totalGb: number;
}

export interface NetworkTelemetry {
  id: string;
  label: string;
  interfaceName: string;
  isEthernet: boolean;
  downloadBytesPerSec: number;
  uploadBytesPerSec: number;
  linkSpeedMbps: number;
  utilizationPercent: number;
  autoScalePercent: number;
  downloadPercent: number;
  uploadPercent: number;
}

export interface GpuTelemetry {
  id: string;
  index: number;
  label: string;
  name: string;
  vendor: string;
  coreUsagePercent: number;
  vramUsedGb: number;
  vramTotalGb: number;
  vramPercent: number;
  temperatureC: number | null;
  fanSpeedPercent: number | null;
  powerWatts: number | null;
  clockMhz: number | null;
}

export interface SystemTelemetry {
  timestampMs: number;
  cpu: CpuTelemetry;
  memory: MemoryTelemetry;
  disks: DiskTelemetry[];
  networks: NetworkTelemetry[];
  gpus: GpuTelemetry[];
}

export interface GaugeItemConfig {
  id: string;
  enabled: boolean;
  detached: boolean;
  styleOverride: GaugeStyle | "global";
  scaleOverride: GaugeScale | "global";
  accentColor: string | null;
  diskMode?: DiskDisplayMode;
  netScaleMode?: NetworkScaleMode;
  netCustomMaxMbps?: number;
  detachedX?: number | null;
  detachedY?: number | null;
}

export interface AppSettings {
  globalStyle: GaugeStyle;
  dockLayout: DockLayout;
  gridColumns: number;
  gaugeScale: GaugeScale;
  zOrderMode: ZOrderMode;
  ghostMode: boolean;
  showInTaskbar: boolean;
  launchAtStartup: boolean;
  snapToEdges: boolean;
  pollingIntervalMs: number;
  backgroundOpacity: number;
  backdropBlur: boolean;
  showSparkline: boolean;
  showPeakHold: boolean;
  showSubMetrics: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  networkUnit: NetworkUnit;
  showLogicalVolumes: boolean;
  showAllNetworkAdapters: boolean;
  themePreset: "cyber-cyan" | "tach-redline" | "emerald-matrix" | "solar-amber" | "violet-plasma";
  gauges: Record<string, GaugeItemConfig>;
}

export interface NormalizedGaugeData {
  id: string;
  category: "cpu" | "memory" | "disk" | "network" | "gpu";
  title: string;
  subtitle: string;
  primaryPercent: number;
  secondaryPercent?: number;
  primaryText: string;
  primaryUnit: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  peakPercent: number;
  history: number[];
  badges: { label: string; value: string; highlight?: boolean }[];
  defaultAccent: string;
  isDualMode?: boolean;
}
