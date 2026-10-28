# Architecture Decision Records (ADRs)

This directory contains the Architecture Decision Records (ADRs) for **PowerGauge HUD**. Each ADR documents a key architectural decision, its context, alternatives considered, and consequences so that developers and AI coding agents have complete historical context in future sessions.

---

## ADR Index

| ID | Title | Status | Summary |
| :--- | :--- | :--- | :--- |
| **[ADR-0001](./0001-tauri-v2-rust-react-svg-stack.md)** | Tauri v2 (Rust + React/TypeScript/SVG) Stack | **Accepted** | Selects Tauri v2 with Rust and React/SVG over Electron, WPF, and PyQt6, and enables `custom-protocol` by default for standalone execution. |
| **[ADR-0002](./0002-hybrid-dock-and-tear-off-multi-window-architecture.md)** | Hybrid Dock and Tear-Off Multi-Window Architecture | **Accepted** | Uses a single React SPA routed by URL query parameters (`?window=dock`, `detached`, `settings`) synchronized via Tauri broadcast events. |
| **[ADR-0003](./0003-multi-source-windows-hardware-telemetry-pipeline.md)** | Multi-Source Windows Hardware Telemetry Pipeline | **Accepted** | Combines `sysinfo` (CPU/RAM/Net/Logical Disks), `nvml-wrapper` (NVIDIA GPUs), and an async Windows CIM/PDH background worker (`DISK N` Active Time % + DXGI GPUs). |
| **[ADR-0004](./0004-four-style-svg-gauge-rendering-and-metric-scaling.md)** | Four-Style SVG Gauge Rendering and Metric Scaling | **Accepted** | Implements `radial`, `tachometer`, `ring`, and `led-bar` SVG renderers and normalizes throughput metrics into 0–100% dial scales. |
| **[ADR-0005](./0005-desktop-layering-ghost-mode-and-tray-integration.md)** | Desktop Layering, Ghost Mode, and Tray Integration | **Accepted** | Implements Click-Through Ghost Mode (`set_ignore_cursor_events`), multi-path unlock (`Ctrl+Alt+G`, Tray, Control Center), Z-order modes, and Windows Registry autostart. |
| **[ADR-0006](./0006-full-desktop-application-suite-mode.md)** | Full Desktop Application Suite Mode Alongside Floating HUD | **Accepted** | Adds a full maximizable Desktop Application window (`?window=app`, `DesktopAppView.tsx`) with sidebar navigation, multi-sensor timeline chart, per-core CPU grid, and hardware inspector alongside the floating HUD. |
| **[ADR-0007](./0007-release-engineering-and-packaging-pipeline.md)** | Release Engineering, Version Parity, and Packaging Pipeline | **Accepted** | Establishes automated version synchronization (`scripts/bump-version.ps1`), LTO release staging + `SHA256SUMS.txt` (`scripts/build-release.ps1`), and GitHub Actions CI/CD workflows. |

---

## How to Use & Maintain ADRs

1. **Before Modifying Core Systems**: Read the relevant ADR(s) above and [`docs/DECISIONS.md`](../DECISIONS.md) to ensure changes preserve existing user-aligned invariants.
2. **When Making a Significant Architectural Change**: Create a new numbered file `000N-<slug>.md` in this directory using the standard template (`Status`, `Date`, `Context`, `Decision`, `Alternatives Considered`, `Consequences`, `Key Files`) and add it to the index table above and [`AGENTS.md`](../../AGENTS.md).
