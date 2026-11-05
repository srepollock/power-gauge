# Changelog

All notable changes to **PowerGauge HUD** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.2](https://github.com/srepollock/power-gauge/compare/v0.2.1...v0.2.2) (2026-11-05)


### Bug Fixes

* **release:** bump lockfiles in bump-version.ps1 and check them in CI ([#49](https://github.com/srepollock/power-gauge/issues/49)) ([#50](https://github.com/srepollock/power-gauge/issues/50)) ([7a9358c](https://github.com/srepollock/power-gauge/commit/7a9358c3763e2a5f67991e38d9424207fbc5caca))

## [0.2.1](https://github.com/srepollock/power-gauge/compare/v0.2.0...v0.2.1) (2026-11-03)


### Bug Fixes

* **release:** build dist before cargo test and attach assets reliably ([#44](https://github.com/srepollock/power-gauge/issues/44)) ([#45](https://github.com/srepollock/power-gauge/issues/45)) ([74d9747](https://github.com/srepollock/power-gauge/commit/74d97475061466230a9d34389dbc0c7bc8291f4b))

## [0.2.0](https://github.com/srepollock/power-gauge/compare/v0.1.0...v0.2.0) (2026-11-03)


### Features

* implement PowerGauge HUD desktop suite, ADRs, and ci-toolkit workflows ([6a9a8b7](https://github.com/srepollock/power-gauge/commit/6a9a8b73a5aeef5e1e1446fbf5e6bd2b126b2dbd))
* implement PowerGauge HUD desktop suite, ADRs, and ci-toolkit workflows ([91c65c6](https://github.com/srepollock/power-gauge/commit/91c65c68fb7508697fa849a6d7417571655d17f3))


### Bug Fixes

* **build:** exclude node:test files from browser tsconfig and auto-install devDeps ([8d5fe7a](https://github.com/srepollock/power-gauge/commit/8d5fe7a03855c51280e8aa025b4b9d9bd619be4e))
* **ci:** drop redundant npm ci from ai-agent allowlist ([#22](https://github.com/srepollock/power-gauge/issues/22)) ([cba047d](https://github.com/srepollock/power-gauge/commit/cba047dcb78008fc0cd4aadab8fc921fa6d87c17))
* **ci:** let ai-agent run npm checks via allowed_tools ([19faca2](https://github.com/srepollock/power-gauge/commit/19faca236d4cbc464229478c57e12505516ccaae))
* **ci:** let ai-agent run npm checks via allowed_tools ([#22](https://github.com/srepollock/power-gauge/issues/22)) ([45e5efc](https://github.com/srepollock/power-gauge/commit/45e5efc537f560be343b3cd6489ce62efe5a27d8))
* **ci:** move ci-toolkit callers to [@v1](https://github.com/v1) contracts ([b66e37a](https://github.com/srepollock/power-gauge/commit/b66e37ae57eb695d56b17aa90b85b9249b267c62))
* **ci:** move ci-toolkit callers to [@v1](https://github.com/v1) contracts ([88ba2a8](https://github.com/srepollock/power-gauge/commit/88ba2a8184bdc34e5d46bb8172428563cd5d9538))
* **release:** bump Cargo.lock root package with release-please ([#32](https://github.com/srepollock/power-gauge/issues/32)) ([679ca75](https://github.com/srepollock/power-gauge/commit/679ca754d3ad8c8c3b218f8f6561be5965ce10f8))
* **release:** exclude node:test files from browser tsconfig and use .NET SHA256 in release script ([e5abe4e](https://github.com/srepollock/power-gauge/commit/e5abe4ef592cc73db7b3c3a84670bfc6dbcab1d1))
* **release:** match Cargo.lock package name via tagged TOML value ([#31](https://github.com/srepollock/power-gauge/issues/31)) ([#39](https://github.com/srepollock/power-gauge/issues/39)) ([4a97969](https://github.com/srepollock/power-gauge/commit/4a979694e99d760a08acecc3876257cece194f53))
* **release:** use .NET SHA256 directly instead of Get-FileHash for cross-shell compatibility ([ef22467](https://github.com/srepollock/power-gauge/commit/ef2246750709bae2fe5e95112a81df978622ccc1))

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
