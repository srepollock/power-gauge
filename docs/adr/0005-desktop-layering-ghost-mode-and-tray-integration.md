# ADR-0005: Desktop Layering, Ghost Mode, and Tray Integration

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: User & Agent (`/grill-me` Architecture Alignment)

---

## Context

A floating desktop HUD must coexist unobtrusively with full-screen productivity apps, browsers, and games:
1. Users need **Click-Through (Ghost) Mode** so mouse clicks pass transparently through the floating gauges to whatever window is underneath.
2. However, once a window ignores mouse events (`set_ignore_cursor_events(true)`), the user can no longer click buttons **inside** that floating window to unlock it. Therefore, reliable out-of-band unlock mechanisms are mandatory.
3. Users also requested full flexibility over whether the app floats **Always on Top** or sits behind windows as a **Desktop Widget**, and whether it appears in the **Windows Taskbar** in addition to the **System Tray**.

---

## Decision

1. **Click-Through (Ghost) Mode & Multi-Path Unlock Architecture**:
   - Calling `set_ghost_mode(enabled)` or updating `settings.ghostMode` invokes `win.set_ignore_cursor_events(enabled)` on `main` and all `detached-*` gauge windows (it **never** sets `ignore_cursor_events` on the `settings` Control Center window).
   - Three independent unlock paths are always active:
     1. **Global Shortcut (`Ctrl+Alt+G`)**: Registered via `tauri-plugin-global-shortcut` in `src-tauri/src/main.rs` (`toggle_ghost_mode_shortcut`), allowing one-keypress lock/unlock from any application.
     2. **System Tray Context Menu**: Right-clicking the tray icon and selecting `"Toggle Click-Through Ghost Mode (Ctrl+Alt+G)"`.
     3. **Control Center Header Pill**: Left-clicking the tray icon opens the `settings` window (which always accepts mouse input) where the user can toggle the `"Ghost Mode ON (Locked)"` pill in the top header.

2. **Three-Mode Desktop Z-Order Layering (`zOrderMode`)**:
   - `'always-on-top'`: Calls `set_always_on_bottom(false)` followed by `set_always_on_top(true)` on `main` and all `detached-*` windows.
   - `'desktop-widget'`: Calls `set_always_on_top(false)` followed by `set_always_on_bottom(true)` so the gauges sit on the desktop wallpaper behind normal application windows.
   - `'normal'`: Clears both flags so gauges behave like standard desktop windows.

3. **System Tray + Configurable Taskbar Presence**:
   - `TrayIconBuilder` creates a persistent Windows notification area icon with left-click bound to `open_settings_window` and right-click bound to the quick action menu (`Show/Hide All`, `Toggle Ghost Mode`, `Cycle Style`, `Dock All`, `Reset Peaks`, `Open Control Center`, `Quit`).
   - `settings.showInTaskbar` dynamically toggles `win.set_skip_taskbar(!show_in_taskbar)` on the `main` window (while `detached-*` windows always set `skip_taskbar(true)` to prevent cluttering `Alt+Tab` with dozens of individual gauge icons).

4. **Windows Startup Registry Integration (`apply_windows_autostart`)**:
   - Uses `winreg` to set or delete `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run\PowerGaugeHUD` pointing to `std::env::current_exe()`.

---

## Consequences

- **Positive**:
  - Users can never accidentally lock themselves out of controlling the HUD when Ghost Mode is enabled.
  - Torn-off gauges never spam the Windows Taskbar with extra taskbar buttons.
  - No Administrator elevation (UAC prompt) is required for Windows Startup registration because it uses `HKCU` rather than `HKLM`.

---

## Key Files
- [`src-tauri/src/main.rs`](../../src-tauri/src/main.rs) (`apply_window_behaviors`, `toggle_ghost_mode_shortcut`, `toggle_all_gauges_visibility`, `apply_windows_autostart`)
- [`src/components/SettingsModal.tsx`](../../src/components/SettingsModal.tsx)
