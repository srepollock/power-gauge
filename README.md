# PowerGauge HUD

**PowerGauge HUD** is a lightweight, high-precision Windows desktop performance monitor built with **Tauri v2 (Rust + React/TypeScript/SVG)**. It displays real-time system telemetry (`CPU`, `MEMORY`, `DISK N`, `ETHERNET`, `GPU N`) in customizable floating power gauges on your desktop, allows tearing off individual gauges into standalone floating windows, and integrates with both the Windows System Tray and Taskbar.

---

## Documentation & ADR Index

- **[Agent Context & Rules (`AGENTS.md`)](./AGENTS.md)** — Automatically loaded in new sessions to provide full architectural context, build rules, and invariants.
- **[Product & Design Decision Log (`docs/DECISIONS.md`)](./docs/DECISIONS.md)** — Complete record of product requirements and alignment decisions from the initial `/grill-me` discovery interview.
- **[Architecture Decision Records (`docs/adr/`)](./docs/adr/README.md)**:
  - **[ADR-0001](./docs/adr/0001-tauri-v2-rust-react-svg-stack.md)** — Tauri v2 (Rust + React/TypeScript/SVG) Stack & `custom-protocol` embedding.
  - **[ADR-0002](./docs/adr/0002-hybrid-dock-and-tear-off-multi-window-architecture.md)** — Hybrid Dock and Tear-Off Multi-Window Architecture.
  - **[ADR-0003](./docs/adr/0003-multi-source-windows-hardware-telemetry-pipeline.md)** — Multi-Source Windows Hardware Telemetry Pipeline (`sysinfo`, `NVML`, async CIM/PDH).
  - **[ADR-0004](./docs/adr/0004-four-style-svg-gauge-rendering-and-metric-scaling.md)** — Four-Style SVG Gauge Rendering and Metric Scaling.
  - **[ADR-0005](./docs/adr/0005-desktop-layering-ghost-mode-and-tray-integration.md)** — Desktop Layering, Ghost Mode, and Tray Integration.
  - **[ADR-0006](./docs/adr/0006-full-desktop-application-suite-mode.md)** — Full Desktop Application Suite Mode Alongside Floating HUD.
  - **[ADR-0007](./docs/adr/0007-release-engineering-and-packaging-pipeline.md)** — Release Engineering, Version Parity, and Packaging Pipeline.
- **Technical & User Reference Manuals (`docs/`)**:
  - **[User Guide (`docs/USER_GUIDE.md`)](./docs/USER_GUIDE.md)** — End-user manual for gauge styles, tear-off windows, sensor modes, Ghost Mode, and System Tray controls.
  - **[Architecture Guide (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)** — High-level system architecture and extension guide.
  - **[API & Data Models (`docs/API_AND_DATA_MODELS.md`)](./docs/API_AND_DATA_MODELS.md)** — Complete Rust/TypeScript schemas, IPC commands, events, and JSON settings structure.
  - **[Components & Styling (`docs/COMPONENTS_AND_STYLING.md`)](./docs/COMPONENTS_AND_STYLING.md)** — Frontend component hierarchy, SVG gauge math, color themes, and CSS variables.
  - **[Release Process (`docs/RELEASE_PROCESS.md`)](./docs/RELEASE_PROCESS.md)** — Version bumping, LTO release builds, installer bundling, `SHA256SUMS.txt`, and GitHub Actions CI/CD.
  - **[Operations & Troubleshooting (`docs/OPERATIONS_AND_TROUBLESHOOTING.md`)](./docs/OPERATIONS_AND_TROUBLESHOOTING.md)** — Build workflows, config reset, and Windows troubleshooting.
  - **[Changelog (`CHANGELOG.md`)](./CHANGELOG.md)** — Version history following Keep a Changelog & Semantic Versioning.

---

## Key Features

### 1. Real-Time Hardware Telemetry
| Gauge | Primary Dial (0–100%) | Secondary & Sub-Metric Readouts |
| :--- | :--- | :--- |
| **`CPU`** | Global CPU Utilization % | Clock Speed (`GHz`), Core/Thread count (`C/T`), Package Temp (`°C`) or Process Count |
| **`MEMORY`** | Physical RAM Utilization % | Used / Total RAM (`GB`), Available RAM (`GB`), Swap/Pagefile Usage (`%` & `GB`) |
| **`DISK N`** (`DISK 0`, `DISK 1`, ... + `C:`, `D:`) | Configurable: **Active Time % (I/O)**, **Used Space %**, or **Dual Split** | Live Read Speed (`MB/s`), Write Speed (`MB/s`), Used / Total Capacity (`GB`/`TB`) |
| **`ETHERNET`** (and Wi-Fi / Active Adapters) | Configurable: **Auto-Scaling Peak**, **Link Speed %**, or **Dual-Needle (Down/Up)** | Live Download & Upload throughput (`Mbps`, `Gbps`, or `MB/s`), Link Speed (`1G`, `2.5G`, etc.) |
| **`GPU N`** (`GPU 0`, `GPU 1`, ...) | 3D / Compute Core Utilization % | VRAM Used / Total (`GB` & `%`), GPU Temp (`°C`), Power Draw (`W`), Clock (`MHz`), Fan (`%`) |

### 2. Four Switchable Power Gauge Styles
Switch all gauges globally or override each gauge individually:
1. **Modern Radial Arc (`radial`)** — 270° glowing neon sweep, tick marks, secondary inner concentric arc, peak-hold marker, and digital center readout.
2. **Automotive Tachometer (`tachometer`)** — Analog dial with numbered major ticks (`0–10` x10%), redline zone arc, damped sweeping needle, peak-hold ghost needle, and LCD odometer readout.
3. **Minimalist Circular Ring (`ring`)** — High-contrast 360° concentric progress rings with bold centered typography and peak dot indicator.
4. **Segmented Sci-Fi LED Bar (`led-bar`)** — 20-segment illuminated power rack with green/amber/red threshold zones and dual-bar auxiliary display.

### 3. Hybrid Floating Dock + Tear-Off Windows
- **Main Floating Dock**: Arrange docked gauges in a **Horizontal Bar**, **Vertical Tower**, or **Responsive Grid** (`2–6` columns).
- **Tear-Off Individual Gauges**: Click the **Tear Off (`↗`)** button on any gauge card (or inside the Control Center) to pop that gauge out into its own independent frameless floating window.
- **Re-Dock Anytime**: Click **Dock (`↙`)** on a detached gauge or **Dock All** in the main HUD bar / System Tray menu.
- **Magnetic Edge Snapping**: Floating windows automatically snap to monitor edges (`18px` threshold).

### 4. System Tray, Taskbar & Click-Through (Ghost) Mode
- **System Tray Icon**:
  - **Left-Click**: Opens the **PowerGauge HUD Control Center & Settings** window.
  - **Right-Click**: Opens the quick native context menu (Show/Hide, Ghost Mode, Cycle Style, Dock All, Reset Peaks, Settings, Quit).
- **Taskbar Presence**: Toggle whether PowerGauge HUD appears in the main Windows Taskbar (`Alt+Tab`) or lives exclusively in the System Tray.
- **Desktop Layering**: Switch between **Always on Top** (floats above all windows), **Desktop Widget Mode** (pinned on the wallpaper behind normal windows), or **Standard Window Layer**.
- **Click-Through / Ghost Mode (`Ctrl+Alt+G`)**: Locks all floating gauges so mouse clicks pass transparently through to applications underneath.

---

## Global Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + Alt + G`** | Toggle **Click-Through (Ghost Mode)** on/off across all floating gauges |
| **`Ctrl + Alt + M`** | **Show / Hide** all floating gauge windows |

---

## Quick Start & Building

### Prerequisites
- **Windows 10 / 11** (64-bit)
- **Node.js** `v20+` and **npm**
- **Rust & Cargo** (`rustup` with `x86_64-pc-windows-msvc` and Visual Studio C++ Build Tools)

### Run the Compiled Standalone Executable
```powershell
.\src-tauri\target\debug\power-gauge-hud.exe
```

### Development Mode (Hot-Reload)
```powershell
npm install
npm run tauri dev
```

### Production Build & Installer Bundle
```powershell
# Build frontend assets
npm run build

# Build optimized release binary & Windows installer (.msi / .exe)
npm run tauri build
```

---

## Project Structure

```text
floating_system_monitor_app/
├── AGENTS.md                  # Auto-loaded agent rules, context & ADR pointers
├── README.md                  # Project overview & documentation entry point
├── docs/
│   ├── adr/                   # Architecture Decision Records (ADR-0001..0005)
│   │   ├── README.md
│   │   ├── 0001-tauri-v2-rust-react-svg-stack.md
│   │   ├── 0002-hybrid-dock-and-tear-off-multi-window-architecture.md
│   │   ├── 0003-multi-source-windows-hardware-telemetry-pipeline.md
│   │   ├── 0004-four-style-svg-gauge-rendering-and-metric-scaling.md
│   │   └── 0005-desktop-layering-ghost-mode-and-tray-integration.md
│   ├── DECISIONS.md           # Product & UX decisions from /grill-me interview
│   ├── USER_GUIDE.md          # End-user manual & configuration reference
│   ├── ARCHITECTURE.md        # System architecture & extension guide
│   ├── API_AND_DATA_MODELS.md # Complete IPC, Event & Rust/TS schema reference
│   ├── COMPONENTS_AND_STYLING.md # SVG gauge geometry, themes & CSS architecture
│   └── OPERATIONS_AND_TROUBLESHOOTING.md # Build, packaging & troubleshooting
├── src/
│   ├── components/
│   │   ├── GaugeWidget.tsx    # 4-style SVG power gauge renderer + sparkline
│   │   └── SettingsModal.tsx  # Control Center & per-gauge configuration UI
│   ├── utils/
│   │   ├── tauriBridge.ts     # Tauri v2 IPC commands, events & browser fallback
│   │   └── telemetryAdapter.ts# Telemetry normalization, formatting & themes
│   ├── App.tsx                # Multi-window router (Dock, Detached, Settings)
│   ├── main.tsx               # React entry point
│   ├── styles.css             # Glassmorphism HUD & Control Center styles
│   └── types.ts               # Shared TypeScript interfaces
├── src-tauri/
│   ├── capabilities/
│   │   └── default.json       # Tauri v2 window, event & shortcut permissions
│   ├── icons/                 # Application & System Tray icon assets
│   ├── src/
│   │   ├── main.rs            # Window manager, Tray menu, hotkeys & state
│   │   └── telemetry.rs       # Hardware collector (sysinfo, NVML, Windows PDH)
│   ├── Cargo.toml             # Rust crate dependencies & features
│   └── tauri.conf.json        # Tauri v2 window & bundle configuration
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```
