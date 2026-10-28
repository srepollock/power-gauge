# Operations, Build & Troubleshooting Guide

This guide covers building, running, packaging, and troubleshooting **PowerGauge HUD** on Windows.

---

## 1. Environment & Toolchain Details

- **Node.js & npm**: `node v24+`, `npm v11+`
- **Rust & Cargo**: Installed via `rustup` (`x86_64-pc-windows-msvc` target) at:
  - `%USERPROFILE%\.cargo\bin\rustc.exe`
  - `%USERPROFILE%\.cargo\bin\cargo.exe`
- **MSVC Build Tools**: Visual Studio 2022 (`VC.Tools.x86.x64`)

---

## 2. Common Development & Build Workflows

### 2.1 Rebuild Frontend + Standalone Executable (Recommended Quick Build)
Because `src-tauri/Cargo.toml` sets `default = ["custom-protocol"]` (see [ADR-0001](./adr/0001-tauri-v2-rust-react-svg-stack.md)), the compiled Rust binary embeds the files inside `dist/`. Whenever you modify TypeScript/React/CSS files in `src/`, run:

```powershell
# Step 1: Compile TypeScript & bundle frontend into dist/
npm run build

# Step 2: Compile the standalone Tauri executable
& "$env:USERPROFILE\.cargo\bin\cargo.exe" build --manifest-path src-tauri/Cargo.toml
```

Then launch the standalone executable directly:
```powershell
.\src-tauri\target\debug\power-gauge-hud.exe
```

### 2.2 Live Hot-Reload Development Mode
To run with Vite hot-module replacement (`http://localhost:1420`):
```powershell
$env:Path += ";$env:USERPROFILE\.cargo\bin"
npm run tauri dev
```

### 2.3 Optimized Production Release & Windows Installer (`.msi` / `.exe`)
```powershell
$env:Path += ";$env:USERPROFILE\.cargo\bin"
npm run tauri build
```
Output binaries and installers are generated under:
- `src-tauri/target/release/power-gauge-hud.exe`
- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

---

## 3. Configuration Reset & File Locations

- **Persisted Settings JSON**:
  `%APPDATA%\com.powergauge.hud\power_gauge_settings.json`
  *(Full path: `C:\Users\<Username>\AppData\Roaming\com.powergauge.hud\power_gauge_settings.json`)*
- **Resetting to Factory Defaults**:
  If you ever want to reset all gauge overrides, window states, and themes to factory defaults, delete `power_gauge_settings.json` while the app is closed (or clear `localStorage` if previewing in a browser).
- **Windows Startup Registry Entry**:
  `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run` &rarr; Value Name: `PowerGaugeHUD`

---

## 4. Troubleshooting

### Gauges Do Not Respond to Mouse Clicks
- **Cause**: **Click-Through (Ghost) Mode** is enabled (`GHOST (Ctrl+Alt+G)` pill is visible in the HUD bar).
- **Solution**:
  1. Press **`Ctrl + Alt + G`** on your keyboard, **OR**
  2. Right-click the **PowerGauge HUD** icon in the Windows System Tray (bottom-right notification area) and click **"Toggle Click-Through Ghost Mode (Ctrl+Alt+G)"**, **OR**
  3. Left-click the System Tray icon to open the Control Center and click the **"Ghost Mode ON (Locked)"** button in the top-right corner.

### A Gauge Is Missing from the Main Dock
- **Cause**: Either the gauge was **torn off** into a separate window (`detached: true`) or **hidden** (`enabled: false`).
- **Solution**:
  - Click **Dock All** in the main HUD toolbar (or right-click the System Tray icon &rarr; **"Dock All Torn-Off Gauges"**).
  - Open **Control Center &rarr; Gauges & Tear-Off Windows** and verify the **Eye** visibility button next to the gauge is enabled (blue).

### `DISK N` Shows `0%` Active Time for the First 1–2 Seconds on Launch
- **Cause**: Windows CIM / Performance Counters (`Win32_PerfFormattedData_PerfDisk_PhysicalDisk`) are polled asynchronously by a background worker thread every `1500ms` so the UI opens instantaneously without waiting on WMI initialization (see [ADR-0003](./adr/0003-multi-source-windows-hardware-telemetry-pipeline.md)).
- **Solution**: Normal behavior; live `PercentDiskTime` and Read/Write speeds populate automatically within `1.5` seconds of launch.

### Regenerating Application & System Tray Icons
If you want to customize the procedural gauge icons in `src-tauri/icons/` (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png`, `icon.ico`), ensure `icon.ico` and the PNGs remain valid RGBA images so `tauri-build` compiles the Windows resource table cleanly.
