# ADR-0003: Multi-Source Windows Hardware Telemetry Pipeline

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: User & Agent (`/grill-me` Architecture Alignment)

---

## Context

The user required gauges for **`CPU`**, **`MEMORY`**, **`DISK N`** (where `N` is a number matching Windows Task Manager, plus logical volumes), **`ETHERNET`** (and active network interfaces), and **`GPU N`** (where `N` is a number supporting dedicated NVIDIA/AMD/Intel GPUs and integrated GPUs).

No single Rust crate provides all of these metrics out of the box on Windows:
- `sysinfo` provides fast in-process CPU usage/clocks, physical RAM/Swap, logical disk space (`C:\`, `D:\`), and network interface byte counters, but it does **not** expose Windows Task Manager's **Physical Disk `% Disk Time` (Active Time %)** or **GPU Utilization / VRAM**.
- `nvml-wrapper` provides rich, low-latency NVIDIA GPU metrics (core %, VRAM, temperature, fan %, power Watts, clock MHz), but only works on NVIDIA hardware.
- Windows CIM / Performance Counters (`Win32_PerfFormattedData_PerfDisk_PhysicalDisk`, `Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine`, `Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory`, `Win32_VideoController`) provide vendor-agnostic Physical Disk Active Time % + R/W bytes/sec and DXGI GPU utilization/VRAM across AMD, Intel, and NVIDIA, but querying WMI/CIM synchronously takes ~150–400ms and would stall a `250ms` UI loop if run on the main sampling thread.

---

## Decision

Implement a **three-tier decoupled telemetry pipeline** in `src-tauri/src/telemetry.rs`:

1. **Tier 1 — Fast In-Process Sampling (`sysinfo = "0.33"`)**:
   Runs synchronously on every tick (`250ms`–`2000ms`):
   - `CPU`: Global utilization %, per-core utilization %, clock frequency (`MHz`), brand string, physical/logical core counts, process count, and CPU package temperature via `sysinfo::Components`.
   - `MEMORY`: Physical RAM used/total/available `GB`, usage %, and Swap used/total `GB` & `%`.
   - `Logical Volumes`: Partition mount points (`C:`, `D:`), used/total `GB`, and `usedSpacePercent` (`id: "vol-c"`, `"vol-d"`, `isPhysical: false`).
   - `Networks`: Per-interface byte deltas divided by elapsed `dt` (`downloadBytesPerSec`, `uploadBytesPerSec`), filtering out pseudo/loopback interfaces and sorting Ethernet first (`id: "ethernet"`).

2. **Tier 2 — Direct NVIDIA Driver Sampling (`nvml-wrapper = "0.10"`)**:
   Runs synchronously on every tick when an NVIDIA GPU (`nvml.dll`) is present:
   - Enumerates NVIDIA devices (`gpu-0`, `gpu-1`...) with core %, VRAM used/total `GB`, die temperature (`°C`), fan speed (`%`), board power draw (`W`), and graphics clock (`MHz`).

3. **Tier 3 — Asynchronous Windows CIM/PDH Background Poller (`spawn_windows_perf_poller`)**:
   Runs on a dedicated background thread (`CREATE_NO_WINDOW` hidden PowerShell CIM query every `1500ms`) and writes into an `Arc<Mutex<WinPerfSidecarData>>` shared cache:
   - Queries `Win32_PerfFormattedData_PerfDisk_PhysicalDisk` (excluding `_Total`) to populate `DISK 0`, `DISK 1`, ... (`id: "disk-0"`, `"disk-1"`, `isPhysical: true`) with real `PercentDiskTime` (`activeTimePercent`), `DiskReadBytesPersec`, `DiskWriteBytesPersec`, and correlates partition drive letters (`0 C:`, `1 D:`) against `sysinfo` logical disks to attach total/used capacity (`usedGb`, `totalGb`, `usedSpacePercent`).
   - Queries `Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine`, `GPUAdapterMemory`, and `Win32_VideoController` to populate or supplement non-NVIDIA GPUs (`AMD`, `Intel`, integrated graphics) with `coreUsagePercent` and `vramUsedGb`.
   - If the first telemetry tick occurs before the first CIM sample returns, `collect_disks` gracefully promotes logical volumes to `DISK 0..N` and `collect_gpus` provides a placeholder `GPU 0` so the UI never renders empty or crashes.

---

## Consequences

- **Positive**:
  - High-frequency `250ms` polling remains lock-free and responsive (~1–2ms per `sample()` call) because WMI/CIM queries run asynchronously in the background cache thread.
  - Supports both Windows Task Manager Physical Drives (`DISK 0`, `DISK 1`) **and** Logical Partitions (`DRIVE C:`, `DRIVE D:`), which users can toggle in Settings (`showLogicalVolumes`) or switch per gauge (`active-time` vs `used-space` vs `split`).
  - Works across NVIDIA (with full temp/power/clock/fan telemetry via NVML) as well as AMD/Intel/integrated GPUs (via Windows DXGI counters).

---

## Key Files
- [`src-tauri/src/telemetry.rs`](../../src-tauri/src/telemetry.rs)
- [`src/utils/telemetryAdapter.ts`](../../src/utils/telemetryAdapter.ts)
- [`src/types.ts`](../../src/types.ts)
