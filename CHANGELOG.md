# Changelog

All notable changes to **PowerGauge HUD** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0] - 2026-10-27

### Added
- **Multi-Source Hardware Telemetry Engine (`src-tauri/src/telemetry.rs`)**:
  - `CPU`: Global utilization %, per-core utilization array, clock frequency (`GHz`), physical/logical core count (`C/T`), package temperature (`°C`), and process count.
  - `MEMORY`: Physical RAM utilization %, Used/Total/Available `GB`, and Swap/Pagefile usage (`%` & `GB`).
  - `DISK N`: Enumerates Windows Task Manager Physical Drives (`DISK 0`, `DISK 1`, ...) with real `PercentDiskTime` (Active Time %) and Read/Write speeds (`MB/s`), plus optional Logical Volume gauges (`DRIVE C:`, `DRIVE D:`).
  - `ETHERNET` / Network Adapters: Live Download and Upload speeds (`Mbps`/`Gbps` or `MB/s`/`KB/s`) with Auto-Scaling Peak, Link-Speed %, and Dual-Needle Split modes.
  - `GPU N`: Direct NVIDIA NVML telemetry (`GPU 0..N` core %, VRAM used/total `GB`, temperature `°C`, fan `%`, power `W`, clock `MHz`) plus Windows DXGI/PDH performance counter support for AMD, Intel, and integrated GPUs.
- **4 Switchable Power Gauge Visual Styles (`src/components/GaugeWidget.tsx`)**:
  - Modern Radial Arc (`radial`), Automotive Tachometer (`tachometer`), Minimalist Circular Ring (`ring`), and Segmented Sci-Fi LED Bar (`led-bar`), configurable globally or per individual gauge.
  - Peak-hold high-water markers, 45-sample rolling sparklines, 5 color theme presets, and dynamic Warning/Redline color thresholds.
- **Hybrid Floating HUD + Tear-Off Gauge Windows (`src/App.tsx`, `src-tauri/src/main.rs`)**:
  - Main floating dock supporting Horizontal Bar, Vertical Tower, and Responsive Grid layouts.
  - Tear off (`↗`) any individual gauge into its own frameless transparent floating window and dock back (`↙`) individually or via **Dock All**.
  - Magnetic screen-edge snapping (`18px` threshold).
- **Full Desktop Application Suite (`src/components/DesktopAppView.tsx`)**:
  - Standard resizable/maximizable desktop application window (`?window=app`) featuring a Live Command Center dashboard, Multi-Sensor Telemetry Timeline chart, Per-Core CPU Load Matrix, and Hardware Inspector tables alongside the floating desktop HUD.
- **System Tray, Taskbar, Ghost Mode & Release Pipeline**:
  - Windows System Tray icon & context menu, toggleable Taskbar presence, Always-on-Top vs. Desktop Widget z-order modes, Click-Through Ghost Mode (`Ctrl+Alt+G`), Show/Hide hotkey (`Ctrl+Alt+M`), and Windows Startup (`HKCU\...\Run`) support.
  - Automated release scripts (`scripts/bump-version.ps1`, `scripts/build-release.ps1`) and GitHub Actions CI/CD workflows (`.github/workflows/ci.yml`, `.github/workflows/release.yml`).
