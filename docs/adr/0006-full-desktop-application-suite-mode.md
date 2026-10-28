# ADR-0006: Full Desktop Application Suite Mode Alongside Floating HUD

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: User & Agent

---

## Context

In addition to the floating desktop HUD dock (`?window=dock`) and torn-off individual floating gauge windows (`?window=detached&gaugeId=<id>`), the user requested making **PowerGauge** a **full desktop application**.

A full desktop application experience requires:
1. A standard, resizable, maximizable, minimizable desktop window (`PowerGauge Desktop Telemetry Suite`, `1200x780` default) with a sidebar navigation structure.
2. Rich full-screen telemetry views that go beyond compact floating widgets:
   - **Live Command Center (`dashboard`)**: Top KPI summary strip, full Power Gauges instrument deck, a 45-sample multi-sensor comparison history line chart, and a Per-Core CPU load grid showing every logical processor thread (`CPU #0`..`CPU #N`).
   - **Hardware Inspector (`sensors`)**: Detailed horizontal progress-bar and metric tables for all Physical Disks (`DISK N`) and Logical Volumes (`DRIVE C:`), Graphics Adapters (`GPU N`), and Network Interfaces (`ETHERNET`, `WI-FI`), with one-click buttons to float any sensor onto the desktop.
   - **Styles, HUD & Settings (`settings`)**: Integrated configuration center for all styles, themes, thresholds, and window behaviors.
3. Seamless two-way integration between the Full Desktop App and the Floating Desktop Overlay HUD (ability to show/hide the floating HUD from the sidebar, or open the Full Desktop App from the floating HUD toolbar and System Tray).

---

## Decision

1. **Fourth Window Route (`?window=app` / `label: "app"`)**:
   - Added [`src/components/DesktopAppView.tsx`](../../src/components/DesktopAppView.tsx) and routed both `?window=app` (`initialTab="dashboard"`) and `?window=settings` (`initialTab="settings"`) to `DesktopAppView` in [`src/App.tsx`](../../src/App.tsx).
2. **Rust Window & Tray Commands (`src-tauri/src/main.rs`)**:
   - Added `open_full_app_window` (`WebviewWindowBuilder` with `label: "app"`, `1200x780`, `decorations: true`, `resizable: true`, `transparent: false`).
   - Added `toggle_floating_dock` to show/hide the `"main"` floating HUD dock window directly from the Full Desktop Application sidebar.
   - Added `"Open Full Desktop Application..."` to the top of the Windows System Tray menu, bound left-click on the System Tray icon to `open_full_app_window`, and added a `"Full App"` button (`Maximize2` icon) to the floating HUD toolbar.
   - Spawned `open_full_app_window` during `tauri::Builder::setup` so launching the executable opens both the Full Desktop Application Suite and the Floating Desktop HUD.

---

## Consequences

- **Positive**:
  - Users get the best of both worlds: a full-featured desktop hardware monitoring suite (similar to Task Manager / HWInfo / NZXT CAM) **and** a customizable floating desktop power-gauge HUD with tear-off widgets.
  - Because `DesktopAppView` subscribes to the exact same `telemetry-tick` and `settings-updated` Rust broadcast events, running both the Full Desktop App and the Floating HUD adds zero extra hardware polling overhead.
  - Ghost Mode (`set_ignore_cursor_events(true)`) remains scoped strictly to `"main"` and `"detached-*"` windows so the `"app"` window is always interactive.

---

## Key Files
- [`src/components/DesktopAppView.tsx`](../../src/components/DesktopAppView.tsx)
- [`src/App.tsx`](../../src/App.tsx)
- [`src-tauri/src/main.rs`](../../src-tauri/src/main.rs) (`open_full_app_window`, `toggle_floating_dock`)
