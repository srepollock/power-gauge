# AGENTS.md — PowerGauge HUD Context & Architectural Rules

This file is automatically loaded in new agent sessions to provide complete project, product, and architectural context for **PowerGauge HUD**.

---

## 1. Project Overview & Core Product Philosophy

**PowerGauge HUD** is a Windows floating desktop system performance monitor built with **Tauri v2 (Rust + React 19 / TypeScript / SVG)**. It displays real-time hardware telemetry (`CPU`, `MEMORY`, `DISK N`, `ETHERNET`, `GPU N`) in customizable power gauges on the desktop, supports tearing off individual gauges into standalone floating windows, and integrates with both the Windows System Tray and Taskbar.

### Guiding User Alignment Principle
During the initial `/grill-me` design interview (documented in [`docs/DECISIONS.md`](./docs/DECISIONS.md)), the user established a core product philosophy:
> **Always support all visual, layout, windowing, and sensor options and make them dynamically configurable both globally and per individual gauge.** Never remove an existing gauge style, sensor mode, or windowing option when adding new features.

---

## 2. Documentation & ADR Index (Read Before Modifying Core Systems)

- **Product & Design Decisions**: [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Complete record of user requirements from the discovery interview.
- **Roadmap**: [`ROADMAP.md`](./ROADMAP.md). Planned work by release; update it when an item ships or is filed.
- **Architecture Decision Records (`docs/adr/`)**:
  - [`docs/adr/README.md`](./docs/adr/README.md) — ADR index and maintenance rules.
  - [`docs/adr/0001-tauri-v2-rust-react-svg-stack.md`](./docs/adr/0001-tauri-v2-rust-react-svg-stack.md) — Tauri v2 + Rust + React/SVG stack and `custom-protocol` standalone binary embedding.
  - [`docs/adr/0002-hybrid-dock-and-tear-off-multi-window-architecture.md`](./docs/adr/0002-hybrid-dock-and-tear-off-multi-window-architecture.md) — Single-SPA query routing (`?window=dock`, `detached`, `settings`) and `O(1)` centralized Rust telemetry broadcast.
  - [`docs/adr/0003-multi-source-windows-hardware-telemetry-pipeline.md`](./docs/adr/0003-multi-source-windows-hardware-telemetry-pipeline.md) — Three-tier telemetry collector (`sysinfo` + `nvml-wrapper` + async Windows CIM/PDH background worker for `DISK N` Active Time % and DXGI GPUs).
  - [`docs/adr/0004-four-style-svg-gauge-rendering-and-metric-scaling.md`](./docs/adr/0004-four-style-svg-gauge-rendering-and-metric-scaling.md) — `NormalizedGaugeData` adapter and the 4 SVG gauge styles (`radial`, `tachometer`, `ring`, `led-bar`).
  - [`docs/adr/0005-desktop-layering-ghost-mode-and-tray-integration.md`](./docs/adr/0005-desktop-layering-ghost-mode-and-tray-integration.md) — Click-Through Ghost Mode (`set_ignore_cursor_events`), multi-path unlock (`Ctrl+Alt+G`, Tray, Control Center), Z-order modes, Taskbar toggle, and `HKCU` Run autostart.
  - [`docs/adr/0006-full-desktop-application-suite-mode.md`](./docs/adr/0006-full-desktop-application-suite-mode.md) — Full Desktop Application Suite window (`?window=app`, `DesktopAppView.tsx`) with sidebar navigation, multi-sensor timeline chart, per-core CPU grid, and hardware inspector alongside the floating HUD.
  - [`docs/adr/0007-release-engineering-and-packaging-pipeline.md`](./docs/adr/0007-release-engineering-and-packaging-pipeline.md) — Release engineering pipeline, 3-manifest version parity, LTO release profile, and CI/CD workflows.
- **Reference Manuals (`docs/`)**:
  - [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System architecture & extension guide.
  - [`docs/API_AND_DATA_MODELS.md`](./docs/API_AND_DATA_MODELS.md) — Complete Rust/TypeScript schemas, IPC commands, events, and JSON settings structure.
  - [`docs/COMPONENTS_AND_STYLING.md`](./docs/COMPONENTS_AND_STYLING.md) — Frontend component hierarchy, SVG math, themes, and CSS variables.
  - [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) — End-user manual for all controls, modes, and hotkeys.
  - [`docs/RELEASE_PROCESS.md`](./docs/RELEASE_PROCESS.md) — Release runbook, version bumping, installer bundling, and CI/CD workflows.
  - [`docs/OPERATIONS_AND_TROUBLESHOOTING.md`](./docs/OPERATIONS_AND_TROUBLESHOOTING.md) — Build workflows, config paths, and troubleshooting.

---

## 3. Critical Architectural Invariants

1. **Standalone Binary Embedding (`custom-protocol`)**:
   - `src-tauri/Cargo.toml` defines `default = ["custom-protocol"]` (`tauri/custom-protocol`) so `power-gauge-hud.exe` embeds `../dist` directly and runs without needing a dev server.
   - **Rule**: Whenever you edit frontend files in `src/`, you **must** run `npm run build` before compiling the Rust binary with `cargo build` so the updated `dist/` bundle is embedded.
2. **Multi-Window Naming Convention**:
   - Main dock window label: `"main"` (`index.html` or `?window=dock`).
   - Detached gauge window labels: `"detached-<gaugeId>"` (`index.html?window=detached&gaugeId=<id>`).
   - Control Center window label: `"settings"` (`index.html?window=settings`).
   - **Rule**: Never apply `set_ignore_cursor_events(true)` (Ghost Mode) to the `"settings"` window; users rely on the Control Center (along with `Ctrl+Alt+G` and the System Tray menu) to unlock Ghost Mode.
3. **Non-Blocking Telemetry Sampling**:
   - `TelemetryCollector::sample()` in `src-tauri/src/telemetry.rs` runs every `250ms`–`2000ms`. Never run synchronous `powershell` / WMI / CIM commands inside `sample()`; keep slow Windows Performance Counter queries inside the asynchronous background thread (`spawn_windows_perf_poller`) that updates `Arc<Mutex<WinPerfSidecarData>>`.
4. **Rust / TypeScript Schema Parity**:
   - All structs in `src-tauri/src/telemetry.rs` use `#[serde(rename_all = "camelCase")]` and must match the TypeScript interfaces in `src/types.ts` exactly.

---

## 4. Toolchain & Build Commands on Windows

Rust/Cargo is installed at `$env:USERPROFILE\.cargo\bin\`. When running Cargo commands in a fresh PowerShell session:

```powershell
# 1. Build frontend bundle (dist/)
npm run build

# 2. Check or build Tauri Rust backend (offline flag works once crates are cached)
& "$env:USERPROFILE\.cargo\bin\cargo.exe" build --manifest-path src-tauri/Cargo.toml --offline

# 3. Run the compiled standalone executable
.\src-tauri\target\debug\power-gauge-hud.exe
```
