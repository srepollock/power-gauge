# API, IPC Commands, Events & Data Models Reference

This document provides the complete schema and contract reference for all data structures, Tauri IPC commands, broadcast events, and persisted settings in **PowerGauge HUD**.

---

## 1. Hardware Telemetry Data Models

Defined in [`src-tauri/src/telemetry.rs`](../src-tauri/src/telemetry.rs) (Rust, serialized with `#[serde(rename_all = "camelCase")]`) and [`src/types.ts`](../src/types.ts) (TypeScript).

### 1.1 `SystemTelemetry` (Root Snapshot)
```typescript
interface SystemTelemetry {
  timestampMs: number;          // Unix epoch timestamp in milliseconds
  cpu: CpuTelemetry;            // Global & per-core processor metrics
  memory: MemoryTelemetry;      // Physical RAM & Swap/Pagefile metrics
  disks: DiskTelemetry[];       // Physical Drives (DISK 0..N) + Logical Volumes (DRIVE C:..Z:)
  networks: NetworkTelemetry[]; // Active network interfaces (Ethernet prioritized first)
  gpus: GpuTelemetry[];         // All discovered GPUs (GPU 0..N via NVML & DXGI)
}
```

### 1.2 `CpuTelemetry`
| Field | Type | Unit / Range | Description |
| :--- | :--- | :--- | :--- |
| `usagePercent` | `number` | `0.0` – `100.0` `%` | Global aggregate CPU utilization across all logical processors. |
| `perCorePercent` | `number[]` | `0.0` – `100.0` `%` | Utilization percentage for each individual logical core. |
| `frequencyMhz` | `number` | `MHz` | Current clock speed of core 0 (converted to `GHz` in UI). |
| `temperatureC` | `number \| null` | `°C` | CPU package/die temperature if exposed by `sysinfo::Components`. |
| `powerWatts` | `number \| null` | `W` | Processor package power draw if available. |
| `brand` | `string` | Text | Processor model string (e.g., `"AMD Ryzen 9..."`, shortened in UI). |
| `physicalCores` | `number` | Count | Number of physical CPU cores. |
| `logicalCores` | `number` | Count | Number of logical CPU threads. |
| `processCount` | `number` | Count | Total active OS processes (shown when `temperatureC` is `null`). |

### 1.3 `MemoryTelemetry`
| Field | Type | Unit / Range | Description |
| :--- | :--- | :--- | :--- |
| `usagePercent` | `number` | `0.0` – `100.0` `%` | Physical RAM utilization percentage (`used / total * 100`). |
| `usedGb` | `number` | `GiB` | Used physical memory in gigabytes (`bytes / 1024^3`). |
| `totalGb` | `number` | `GiB` | Total installed physical memory in gigabytes. |
| `availableGb` | `number` | `GiB` | Available physical memory in gigabytes. |
| `swapUsedGb` | `number` | `GiB` | Used Windows pagefile / swap space in gigabytes. |
| `swapTotalGb` | `number` | `GiB` | Total configured pagefile / swap space in gigabytes. |
| `swapPercent` | `number` | `0.0` – `100.0` `%` | Pagefile / swap utilization percentage (drives secondary ring/bar). |

### 1.4 `DiskTelemetry` (`DISK N` & Logical Volumes)
| Field | Type | Unit / Range | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Identifier | `"disk-0"`, `"disk-1"` for Physical Drives; `"vol-c"`, `"vol-d"` for Logical Volumes. |
| `index` | `number` | `0..N` | Disk number matching Windows Task Manager (`0`, `1`, ...). |
| `label` | `string` | Text | Display title: `"DISK 0"`, `"DISK 1"`, or `"DRIVE C:"`. |
| `subLabel` | `string` | Text | Associated drive letters (`"C:"`, `"D:, E:"`). |
| `model` | `string` | Text | Descriptive drive label (`"Disk 0 (C:)"` or volume name). |
| `mountPoints` | `string[]` | Paths | Mounted root paths (e.g., `["C:\\"]`). |
| `isPhysical` | `boolean` | Flag | `true` for Task Manager Physical Drives (`DISK N`), `false` for Logical Volumes. |
| `activeTimePercent` | `number` | `0.0` – `100.0` `%` | Windows `PercentDiskTime` (`% Disk Time`) active I/O busy percentage. |
| `usedSpacePercent` | `number` | `0.0` – `100.0` `%` | Used storage capacity percentage across mounted partitions. |
| `readBytesPerSec` | `number` | `Bytes/s` | Live disk read throughput (`DiskReadBytesPersec`). |
| `writeBytesPerSec` | `number` | `Bytes/s` | Live disk write throughput (`DiskWriteBytesPersec`). |
| `usedGb` | `number` | `GiB` | Used storage space in gigabytes. |
| `totalGb` | `number` | `GiB` | Total storage capacity in gigabytes. |

### 1.5 `NetworkTelemetry` (`ETHERNET` & Adapters)
| Field | Type | Unit / Range | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Identifier | Primary adapter is normalized to `"ethernet"`; additional adapters use `"net-<slug>"`. |
| `label` | `string` | Text | `"ETHERNET"` for wired/primary adapter, `"WI-FI"` for wireless adapters. |
| `interfaceName` | `string` | Text | OS network interface name. |
| `isEthernet` | `boolean` | Flag | `true` if wired Ethernet / LAN interface. |
| `downloadBytesPerSec` | `number` | `Bytes/s` | Live receive throughput (`rx_bytes / dt`). |
| `uploadBytesPerSec` | `number` | `Bytes/s` | Live transmit throughput (`tx_bytes / dt`). |
| `linkSpeedMbps` | `number` | `Mbps` | Nominal link speed in Mbps (default `1000`). |
| `utilizationPercent` | `number` | `0.0` – `100.0` `%` | Combined throughput as a percentage of `linkSpeedMbps`. |
| `autoScalePercent` | `number` | `0.0` – `100.0` `%` | Combined throughput scaled against rolling exponential-decay peak (`>= 5 MB/s`). |
| `downloadPercent` | `number` | `0.0` – `100.0` `%` | Download throughput scaled against rolling peak (used in `dual-needle` mode). |
| `uploadPercent` | `number` | `0.0` – `100.0` `%` | Upload throughput scaled against rolling peak (used in `dual-needle` mode). |

### 1.6 `GpuTelemetry` (`GPU N`)
| Field | Type | Unit / Range | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Identifier | `"gpu-0"`, `"gpu-1"`, etc. |
| `index` | `number` | `0..N` | Zero-based GPU index. |
| `label` | `string` | Text | Display title (`"GPU 0"`, `"GPU 1"`). |
| `name` | `string` | Text | Adapter model name (e.g., `"NVIDIA GeForce RTX..."`). |
| `vendor` | `string` | Text | `"NVIDIA"`, `"Windows DXGI"`, or `"Generic"`. |
| `coreUsagePercent` | `number` | `0.0` – `100.0` `%` | 3D / Compute GPU engine utilization percentage (drives primary dial). |
| `vramUsedGb` | `number` | `GiB` | Dedicated video memory currently in use (`GB`). |
| `vramTotalGb` | `number` | `GiB` | Total dedicated video memory (`GB`). |
| `vramPercent` | `number` | `0.0` – `100.0` `%` | Dedicated VRAM utilization percentage (drives secondary ring/bar). |
| `temperatureC` | `number \| null` | `°C` | GPU core temperature (populated via NVML). |
| `fanSpeedPercent` | `number \| null` | `0.0` – `100.0` `%` | GPU cooling fan speed percentage (populated via NVML). |
| `powerWatts` | `number \| null` | `W` | GPU board power draw in Watts (populated via NVML). |
| `clockMhz` | `number \| null` | `MHz` | Graphics core shader clock frequency in MHz (populated via NVML). |

---

## 2. Frontend Normalized Gauge Model (`NormalizedGaugeData`)

Produced by `buildNormalizedGauges()` in [`src/utils/telemetryAdapter.ts`](../src/utils/telemetryAdapter.ts) and consumed by [`src/components/GaugeWidget.tsx`](../src/components/GaugeWidget.tsx):

```typescript
interface NormalizedGaugeData {
  id: string;                                                // "cpu", "memory", "disk-0", "ethernet", "gpu-0", etc.
  category: "cpu" | "memory" | "disk" | "network" | "gpu";
  title: string;                                             // Header title ("CPU", "DISK 0", "ETHERNET", "GPU 0")
  subtitle: string;                                          // Model / capacity / interface subtitle
  primaryPercent: number;                                    // 0–100% driving primary arc/needle/ring/bar
  secondaryPercent?: number;                                 // 0–100% driving inner arc/ring, 2nd needle, or aux bar
  primaryText: string;                                       // Center large numeric readout ("42", "125.4")
  primaryUnit: string;                                       // Center unit ("%", "Mbps", "MB/s")
  secondaryLabel?: string;                                   // Pill label ("CLOCK", "AVAIL", "SPACE", "UP", "VRAM")
  secondaryValue?: string;                                   // Pill value ("4.65 GHz", "14.2 GB", "64%", "5.8 GB")
  peakPercent: number;                                       // Session high-water mark (0–100%)
  history: number[];                                         // Rolling 45-sample array for sparkline
  badges: { label: string; value: string; highlight?: boolean }[]; // 3 bottom sub-metric pills
  defaultAccent: string;                                     // Hex color from theme preset or per-gauge override
  isDualMode?: boolean;                                      // Enables dual needles on Tachometer when true
}
```

---

## 3. Configuration & Settings Schema (`AppSettings`)

Persisted in `%APPDATA%\com.powergauge.hud\power_gauge_settings.json` (and mirrored to `localStorage["power_gauge_hud_settings"]`):

```typescript
interface AppSettings {
  globalStyle: "radial" | "tachometer" | "ring" | "led-bar"; // Default: "radial"
  dockLayout: "horizontal" | "vertical" | "grid";            // Default: "horizontal"
  gridColumns: number;                                       // 2..6 (Default: 3)
  gaugeScale: "mini" | "standard" | "large";                 // Default: "standard"
  zOrderMode: "always-on-top" | "desktop-widget" | "normal"; // Default: "always-on-top"
  ghostMode: boolean;                                        // Click-through lock (Default: false)
  showInTaskbar: boolean;                                    // Windows Taskbar icon (Default: true)
  launchAtStartup: boolean;                                  // HKCU Run registry key (Default: false)
  snapToEdges: boolean;                                      // Magnetic edge snapping (Default: true)
  pollingIntervalMs: number;                                 // 250, 500, 1000, or 2000 (Default: 1000)
  backgroundOpacity: number;                                 // 0.0 to 1.0 (Default: 0.82)
  backdropBlur: boolean;                                     // CSS backdrop-filter blur (Default: true)
  showSparkline: boolean;                                    // 45-sample area chart (Default: true)
  showPeakHold: boolean;                                     // High-water mark tick/needle (Default: true)
  showSubMetrics: boolean;                                   // Bottom 3 telemetry badges (Default: true)
  warningThreshold: number;                                  // Amber warning % (Default: 72)
  criticalThreshold: number;                                 // Redline critical % (Default: 88)
  networkUnit: "Mbps" | "MB/s";                              // Throughput display unit (Default: "Mbps")
  showLogicalVolumes: boolean;                               // Show DRIVE C:.. alongside DISK 0.. (Default: false)
  showAllNetworkAdapters: boolean;                           // Show all NICs vs primary Ethernet (Default: false)
  themePreset: "cyber-cyan" | "tach-redline" | "emerald-matrix" | "solar-amber" | "violet-plasma";
  gauges: Record<string, GaugeItemConfig>;                   // Per-gauge overrides keyed by gauge id
}

interface GaugeItemConfig {
  id: string;
  enabled: boolean;                                          // Show or hide this gauge (Default: true)
  detached: boolean;                                         // Torn off into standalone window (Default: false)
  styleOverride: GaugeStyle | "global";                      // Per-gauge visual style (Default: "global")
  scaleOverride: GaugeScale | "global";                      // Per-gauge size scale (Default: "global")
  accentColor: string | null;                                // Custom hex color override (Default: null)
  diskMode?: "active-time" | "used-space" | "split";         // Disk dial mode (Default: "active-time")
  netScaleMode?: "auto-scale" | "link-speed" | "dual-needle";// Network dial mode (Default: "auto-scale")
  netCustomMaxMbps?: number;                                 // Ceiling for link-speed mode (Default: 1000)
  detachedX?: number | null;
  detachedY?: number | null;
}
```

---

## 4. Tauri IPC Commands & Broadcast Events (`src-tauri/src/main.rs`)

### 4.1 Frontend-to-Rust Commands (`invoke`)
1. **`get_telemetry_snapshot()` &rarr; `Result<SystemTelemetry, String>`**
   - Triggers an immediate sample on `SharedState::collector` and returns the snapshot. Used on initial window mount so gauges render immediately before the next periodic tick.
2. **`get_app_settings()` &rarr; `Result<Option<Value>, String>`**
   - Returns the persisted `AppSettings` JSON from `SharedState::state` (loaded from `%APPDATA%\com.powergauge.hud\power_gauge_settings.json`).
3. **`update_app_settings({ settings: AppSettings })` &rarr; `Result<(), String>`**
   - Updates `SharedState`, writes `power_gauge_settings.json`, applies `ghostMode`, `showInTaskbar`, `zOrderMode`, and `launchAtStartup` at the OS level, and broadcasts `settings-updated` to all windows.
4. **`set_ghost_mode({ enabled: boolean })` &rarr; `Result<(), String>`**
   - Applies `win.set_ignore_cursor_events(enabled)` to `main` and all `detached-*` windows, saves `ghostMode` to disk, and emits `settings-updated`.
5. **`detach_gauge_window({ gaugeId: string, title: string })` &rarr; `Result<(), String>`**
   - Spawns (or focuses if already open) a frameless transparent `WebviewWindow` with label `detached-<gaugeId>` pointing to `index.html?window=detached&gaugeId=<gaugeId>`.
6. **`dock_gauge_window({ gaugeId: string })` &rarr; `Result<(), String>`**
   - Closes the window `detached-<gaugeId>`.
7. **`dock_all_gauges()` &rarr; `Result<(), String>`**
   - Closes all `detached-*` windows, sets `detached: false` across all entries in `settings.gauges`, saves to disk, and emits `settings-updated`.
8. **`open_settings_window()` &rarr; `Result<(), String>`**
   - Spawns or focuses the `settings` Control Center window (`index.html?window=settings`).

### 4.2 Rust-to-Frontend Broadcast Events (`listen`)
| Event Name | Payload Type | Emitter | Listeners |
| :--- | :--- | :--- | :--- |
| **`telemetry-tick`** | `SystemTelemetry` | Background polling thread in `main.rs` | `main`, all `detached-*`, and `settings` windows |
| **`settings-updated`** | `AppSettings` | `update_app_settings`, `set_ghost_mode`, `dock_all_gauges`, Tray actions, Global shortcuts | `main`, all `detached-*`, and `settings` windows |
| **`reset-peaks`** | `{}` | Tray `"Reset Peak-Hold Markers"` or HUD `"Reset Peaks"` button | `main` and all `detached-*` windows |
