# Product & Design Decision Log

This document records the product, UX, and technical alignment reached with the user during initial discovery (`/grill-me` interview) and implementation of **PowerGauge HUD**. Future sessions should treat these decisions as foundational product requirements.

---

## Summary of Core Alignment Principle

Across all design questions, the user established a clear guiding philosophy:
> **"Provide all options and make them dynamically switchable/configurable by the user, both globally and per gauge."**

Rather than locking the application into a single fixed layout, gauge aesthetic, or sensor interpretation, **PowerGauge HUD** must expose rich, non-destructive toggles in both the **HUD quick-action bars** and the **Control Center (`SettingsModal`)**.

---

## Decision Matrix (Discovery Interview Log)

### 1. Technology Stack & Toolchain
- **Decision**: **Tauri v2 (Rust Backend + React 18 / TypeScript / HTML5 SVG Frontend)**.
- **Context**: The user chose Tauri for its low memory/CPU footprint and crisp custom vector rendering, and explicitly requested installing **Rust (`rustup` + `cargo` `x86_64-pc-windows-msvc`)** on the machine rather than falling back to Electron or WPF.
- **Related ADR**: [ADR-0001: Tauri v2 (Rust + React/TypeScript/SVG) Stack](./adr/0001-tauri-v2-rust-react-svg-stack.md)

### 2. Window Arrangement & Floating Topology
- **Decision**: **Hybrid Dock + Tear-Off Floating Windows**.
- **Requirements**:
  - A **Main Floating Dock** window by default that supports **Horizontal Bar**, **Vertical Tower**, and **Responsive Grid** (`2–6` columns) layouts.
  - Every individual gauge (`CPU`, `MEMORY`, `DISK 0..N`, `ETHERNET`, `GPU 0..N`) can be **torn off (`↗`)** into its own standalone, frameless, transparent floating window and **docked back (`↙`)** individually or via **Dock All**.
  - Magnetic screen-edge snapping (`18px` threshold) and persistent detached states across app restarts.
- **Related ADR**: [ADR-0002: Hybrid Dock and Tear-Off Multi-Window Architecture](./adr/0002-hybrid-dock-and-tear-off-multi-window-architecture.md)

### 3. Power Gauge Visual Styles
- **Decision**: **All 4 Visual Styles Included & Switchable (Global + Per-Gauge Override)**:
  1. **Modern Radial Arc (`radial`)**: 270° glowing sweep with tick marks, dual concentric inner arc, peak-hold tick, and digital center readout.
  2. **Automotive Tachometer (`tachometer`)**: Numbered analog scale (`0–10` x10%), redline zone arc, smooth sweeping needle, peak-hold ghost needle, secondary needle support, and bottom digital odometer box.
  3. **Minimalist Circular Ring (`ring`)**: Clean 360° concentric progress rings with bold centered typography and peak dot indicator.
  4. **Segmented Sci-Fi LED Bar (`led-bar`)**: 20-segment horizontal illuminated power rack with green/amber/red threshold zones and auxiliary secondary bar.
- **Related ADR**: [ADR-0004: Four-Style SVG Gauge Rendering and Metric Scaling](./adr/0004-four-style-svg-gauge-rendering-and-metric-scaling.md)

### 4. Desktop Layering, System Tray, Taskbar & Ghost Mode
- **Decision**: **Support All Desktop Integration & Locking Modes**:
  - **System Tray Icon**: Always present in the Windows notification area. Left-click opens the **Control Center & Settings** window; right-click opens a quick native context menu.
  - **Taskbar Icon**: Toggleable (`showInTaskbar`) so the user can choose whether the HUD appears in the main Windows Taskbar / `Alt+Tab` or lives purely in the System Tray.
  - **Z-Order Layering (`zOrderMode`)**: Switchable between **Always on Top** (overlay above all apps), **Desktop Widget Mode** (pinned to the bottom z-order above the wallpaper), and **Standard Window Layer**.
  - **Click-Through / Ghost Mode (`ghostMode`)**: Passes all mouse clicks transparently through floating gauges (`set_ignore_cursor_events(true)`).
  - **Unlocking Ghost Mode**: Unlockable via global hotkey (`Ctrl+Alt+G`), System Tray right-click menu, or the Control Center window header.
  - **Visibility Toggle**: Global hotkey (`Ctrl+Alt+M`) and System Tray menu item to show/hide all floating gauges simultaneously.
- **Related ADR**: [ADR-0005: Desktop Layering, Ghost Mode, and Tray Integration](./adr/0005-desktop-layering-ghost-mode-and-tray-integration.md)

### 5. Hardware Metrics & Sensor Modes (`CPU`, `MEMORY`, `DISK N`, `ETHERNET`, `GPU N`)
- **Decision**: **Comprehensive Multi-Sensor Enumeration & Configurable Dial Modes**:
  - **`CPU`**: Global utilization % (primary dial), per-core array, clock speed (`GHz`), physical/logical core count (`C/T`), package temperature (`°C`), and process count.
  - **`MEMORY`**: Physical RAM utilization % (primary dial), Used/Total `GB`, Available `GB`, and Swap/Pagefile usage (`%` & `GB` on secondary ring/bar).
  - **`DISK N`**:
    - Enumerates both **Windows Task Manager Physical Drives (`DISK 0`, `DISK 1`, ...)** and optional **Logical Volumes (`DRIVE C:`, `DRIVE D:`, ...)**.
    - Per-disk configurable dial mode (`diskMode`):
      1. `active-time`: Primary dial driven by **Active Time % (0–100% I/O busy time)** + secondary ring showing Used Capacity %.
      2. `used-space`: Primary dial driven by **Used Capacity %** + secondary readout showing Active Time %.
      3. `split`: Dual mode showing both simultaneously.
    - Displays live Read speed (`KB/s`, `MB/s`, `GB/s`), Write speed, and Used/Total capacity (`GB`/`TB`).
  - **`ETHERNET` & Network Adapters**:
    - Prioritizes active Ethernet (`ETHERNET`) by default, with a toggle (`showAllNetworkAdapters`) to show separate gauges for Wi-Fi and additional interfaces.
    - Per-network configurable dial scaling (`netScaleMode`):
      1. `auto-scale`: Rolling exponential-decay peak ceiling (minimum `5 MB/s` floor) driving 0–100%.
      2. `link-speed`: Scales 0–100% against physical link speed (`1000 Mbps`, etc.) or custom ceiling.
      3. `dual-needle`: Independent Download (primary needle/arc) and Upload (secondary needle/arc) on the same gauge.
    - Switchable units (`Mbps`/`Gbps` vs. `MB/s`/`KB/s`).
  - **`GPU N`**:
    - Enumerates all GPUs (`GPU 0`, `GPU 1`, ...) combining direct **NVIDIA NVML** telemetry and **Windows DXGI / PDH Performance Counters** for AMD, Intel, and integrated GPUs.
    - Displays Core 3D/Compute utilization % (primary dial), VRAM Used/Total `GB` & `%` (secondary arc/ring), Temperature (`°C`), Fan Speed (`%`), Power Draw (`W`), and Core Clock (`MHz`).
- **Related ADR**: [ADR-0003: Multi-Source Windows Hardware Telemetry Pipeline](./adr/0003-multi-source-windows-hardware-telemetry-pipeline.md)

### 6. Visual Polish, Thresholds & Ergonomics
- **Decision**:
  - **5 Theme Presets**: `cyber-cyan`, `tach-redline`, `emerald-matrix`, `solar-amber`, `violet-plasma` + custom per-gauge color picker.
  - **Dynamic Load Thresholds**: Configurable Warning (`warningThreshold`, default `72%`) and Redline/Critical (`criticalThreshold`, default `88%`) thresholds that automatically shift gauge glow/segment colors.
  - **Peak-Hold High-Water Marker**: Tracks and renders the highest recent percentage on every gauge with per-gauge and global reset buttons.
  - **Mini History Sparkline**: Toggleable 45-sample rolling area chart inside each gauge card.
  - **Configurable Polling Rate**: `250ms` (Ultra), `500ms` (Fast), `1000ms` (Normal), `2000ms` (Eco).
  - **Glassmorphism & Scale**: Adjustable background alpha (`0%`–`100%`), backdrop blur toggle, and `Mini` / `Standard` / `Large` scale presets.
