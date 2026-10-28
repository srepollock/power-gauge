# ADR-0001: Tauri v2 (Rust + React/TypeScript/SVG) Stack

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: User & Agent (`/grill-me` Architecture Alignment)

---

## Context

We needed to build a custom Windows desktop application that renders real-time system performance metrics (`CPU`, `MEMORY`, `DISK N`, `ETHERNET`, `GPU N`) in floating desktop power gauges with support for:
1. Low CPU and RAM overhead (critical for an always-running system monitor).
2. Rich, hardware-accelerated custom gauge graphics (glowing radial arcs, analog tachometer dials with sweeping needles, concentric rings, and segmented sci-fi LED bars).
3. Frameless, per-pixel transparent floating windows with backdrop blur and click-through (Ghost) mode.
4. Native Windows System Tray icon, context menu, global keyboard shortcuts, and direct hardware telemetry access.

---

## Decision

1. **Application Framework**: Use **Tauri v2** (`tauri = "2.2"` with `tray-icon` feature and `tauri-plugin-global-shortcut = "2.2"`).
2. **Backend Language**: **Rust** (`2021` edition, compiled with `x86_64-pc-windows-msvc` toolchain installed at `%USERPROFILE%\.cargo\bin`).
3. **Frontend UI**: **React 18 + TypeScript + Vite 6** using declarative **SVG + CSS** for crisp, resolution-independent gauge rendering.
4. **Standalone Binary Embedding (`custom-protocol`)**: Enable `default = ["custom-protocol"]` (`tauri/custom-protocol`) in `src-tauri/Cargo.toml` so that compiling with `cargo build` embeds the `../dist` frontend bundle directly into `power-gauge-hud.exe`, allowing the executable to run standalone without requiring a running Vite dev server (`http://localhost:1420`).
5. **Browser Preview Fallback**: Isolate all `@tauri-apps/api` calls behind `src/utils/tauriBridge.ts` with `isTauriEnv()` checks and a realistic simulated telemetry fallback (`generateMockTelemetry()`) so the UI can also be developed or previewed in a standard browser.

---

## Alternatives Considered

| Alternative | Pros | Cons / Why Rejected |
| :--- | :--- | :--- |
| **Electron (Node.js + Chromium)** | Immediate Node.js ecosystem access; familiar multi-window APIs. | Bundles a full Chromium + Node runtime (~150–250 MB RAM baseline), which is heavy for an always-on performance monitor. |
| **C# / .NET 9 (WPF or WinUI 3)** | Direct access to `System.Diagnostics.PerformanceCounter` and native Windows APIs. | Custom multi-style neon glow gauges, CSS glassmorphism (`backdrop-filter`), and rapid visual theming require significantly more boilerplate in XAML/DrawingContext than SVG/CSS. |
| **Python (PyQt6 / PySide6)** | Fast initial scripting with `psutil`. | High packaging overhead (`PyInstaller`), GIL contention during high-frequency UI animation + WMI polling, and less ergonomic custom shader/blur effects. |

---

## Consequences

- **Positive**:
  - Small binary footprint and minimal background CPU/RAM usage via Windows native WebView2.
  - Full Rust safety and concurrency for hardware telemetry polling (`std::sync::Mutex`, background threads).
  - Declarative SVG components (`GaugeWidget.tsx`) scale cleanly across `Mini`, `Standard`, and `Large` sizes and DPI settings without pixelation.
- **Important Build Note for Future Sessions**:
  - Whenever `src/` frontend files are modified, run `npm run build` **before** running `cargo build` (or use `npm run tauri build` / `npm run tauri dev`) because `custom-protocol` embeds the static files from `dist/` at Rust compile time.

---

## Key Files
- [`package.json`](../../package.json)
- [`vite.config.ts`](../../vite.config.ts)
- [`src-tauri/Cargo.toml`](../../src-tauri/Cargo.toml)
- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)
- [`src/utils/tauriBridge.ts`](../../src/utils/tauriBridge.ts)
