# ADR-0002: Hybrid Dock and Tear-Off Multi-Window Architecture

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: User & Agent (`/grill-me` Architecture Alignment)

---

## Context

The user wanted a **hybrid window arrangement**:
1. By default, all active gauges appear together inside a **Main Floating Dock** window (`Horizontal Bar`, `Vertical Tower`, or `Responsive Grid`).
2. At any time, the user can **tear off (`↗`)** any individual gauge (`CPU`, `MEMORY`, `DISK 0`, `ETHERNET`, `GPU 0`, etc.) into its own independent floating window that can be dragged anywhere across monitors, and **dock it back (`↙`)** individually or via **Dock All**.
3. Additionally, clicking the System Tray icon or the HUD gear button opens a **Control Center & Settings** window.

---

## Decision

1. **Single-SPA Query-Parameter Window Routing**:
   All Tauri `WebviewWindow` instances load `index.html` and route inside `src/App.tsx` based on `window.location.search`:
   - `?window=dock` (or default `/`): Renders the **Main Floating Dock** (`label: "main"`), filtering out any gauge where `cfg.detached === true` when running inside Tauri (`isTauriEnv()`).
   - `?window=detached&gaugeId=<id>`: Renders a single frameless transparent `GaugeWidget` (`label: "detached-<id>"`, `skip_taskbar: true`, `210x255` initial size).
   - `?window=settings`: Renders the standalone `SettingsModal` Control Center (`label: "settings"`, `decorations: true`, `880x660`).

2. **Centralized Rust State & Event Broadcast Synchronization**:
   - The Rust backend holds the canonical `SharedState` (`src-tauri/src/main.rs`) and persists `AppSettings` to `%APPDATA%\com.powergauge.hud\power_gauge_settings.json`.
   - A single Rust background thread samples hardware once per interval (`pollingIntervalMs`) and broadcasts `app.emit("telemetry-tick", snap)` to **all** open windows simultaneously. This avoids duplicate hardware polling across torn-off gauge windows.
   - Any setting or per-gauge configuration change calls `invoke("update_app_settings", { settings })`, which saves to disk, updates native window properties, and broadcasts `app.emit("settings-updated", settings)` so the main dock, all detached windows, and the settings window stay in lockstep.

3. **Automatic Re-Hydration of Detached Windows on Startup**:
   - During `tauri::Builder::setup`, `main.rs` inspects the saved `gauges` map in `power_gauge_settings.json` and automatically calls `detach_gauge_window` for every gauge marked `"detached": true`.

4. **Magnetic Screen-Edge Snapping**:
   - Floating windows (`dock` and `detached`) listen to `win.onMoved` in `src/App.tsx` (debounced at `140ms`) and snap within `18px` of the current monitor's left, top, right, or bottom bounds (`6px` margin).

---

## Alternatives Considered

- **Separate HTML Bundles per Window Type**: Would duplicate React/SVG code and increase build complexity without any runtime benefit.
- **Polling Hardware Independently from Each Webview Window**: If 5 gauges were torn off into separate windows, independent polling would multiply CPU/WMI overhead by 6x. Centralizing the poller in Rust (`telemetry-tick` broadcast) keeps sensor overhead constant (`O(1)`) regardless of how many windows are open.

---

## Consequences

- **Positive**:
  - Zero duplicate sensor polling overhead when tearing off multiple gauges.
  - Instantaneous theme, style, and threshold synchronization across all floating windows.
  - Capabilities (`src-tauri/capabilities/default.json`) apply uniformly via `"windows": ["*"]`.
- **Key Invariant**:
  - Window labels for detached gauges **must** follow the naming convention `detached-<gaugeId>` because `apply_window_behaviors`, `set_ghost_mode`, `toggle_all_gauges_visibility`, and `dock_all_gauges` match on `label.starts_with("detached-")`.

---

## Key Files
- [`src-tauri/src/main.rs`](../../src-tauri/src/main.rs) (`detach_gauge_window`, `dock_gauge_window`, `dock_all_gauges`, `open_settings_window`)
- [`src/App.tsx`](../../src/App.tsx)
- [`src-tauri/capabilities/default.json`](../../src-tauri/capabilities/default.json)
