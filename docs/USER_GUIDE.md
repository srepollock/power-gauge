# PowerGauge HUD — User Guide

Welcome to **PowerGauge HUD**. This guide covers how to arrange, customize, tear off, lock, and configure your floating system performance power gauges.

---

## 1. The Floating HUD Dock & Controls

When you launch **PowerGauge HUD**, the **Main Floating Dock** appears on your desktop displaying your active hardware gauges (`CPU`, `MEMORY`, `DISK 0..N`, `ETHERNET`, `GPU 0..N`).

### Top HUD Control Bar
At the top of the main dock is a compact control strip:
- **Drag Handle (`POWERGAUGE HUD`)**: Click and drag anywhere on the control bar (or on the background of any gauge card) to move the HUD around your screen. When **Magnetic Screen-Edge Snapping** is enabled, the window automatically snaps when dragged within `18px` of any monitor edge.
- **Style Button**: Cycles the global visual style across all 4 power gauge designs (`radial` &rarr; `tachometer` &rarr; `ring` &rarr; `led-bar`).
- **Layout Button**: Switches the main dock arrangement between:
  - **Horizontal Bar**: Single horizontal row of gauges.
  - **Vertical Tower**: Single vertical column of gauges (ideal for ultrawide or secondary monitor sidebars).
  - **Responsive Grid**: Multi-column grid (`2` to `6` columns configurable in Settings).
- **Pin / Layer Button**: Toggles between **Always on Top** (floats over games and applications) and **Desktop Widget Mode** (sits on your desktop wallpaper behind standard application windows).
- **Reset Peaks (`↺`)**: Resets the high-water peak markers across all gauges to `0%`.
- **Dock All (`↙`)**: Appears whenever one or more gauges have been torn off into separate windows; click it to snap all detached gauges back into the main dock at once.
- **Ghost Lock Button**: Enables **Click-Through (Ghost) Mode** so mouse clicks pass right through the HUD.
- **Settings Gear (`⚙`)**: Opens the **PowerGauge HUD Control Center**.

---

## 2. Per-Gauge Hover Controls & Tearing Off Windows

Hovering over any individual gauge reveals quick action buttons in the top-right corner of that gauge card:

1. **Sensor Mode Switch (`Layers` icon — on `DISK N` and `ETHERNET` gauges)**:
   - On **`DISK N`** gauges: Cycles the primary 0–100% dial between:
     - **Active Time % (`active-time`)**: Shows real-time disk I/O busy percentage (matching Windows Task Manager), with Used Capacity % on the inner ring.
     - **Used Capacity % (`used-space`)**: Shows disk space full percentage on the main dial, with Active Time % as the secondary readout.
     - **Dual Split (`split`)**: Displays both Active I/O % and Used Capacity % simultaneously (including dual needles in Tachometer mode).
   - On **`ETHERNET` / Network** gauges: Cycles the dial scaling between:
     - **Auto-Scaling Peak (`auto-scale`)**: Dynamically scales the 0–100% dial relative to your recent peak bandwidth (with a minimum `5 MB/s` floor so idle background traffic won't peg the needle).
     - **Link Speed % (`link-speed`)**: Scales 0–100% against your physical link speed (e.g. `1000 Mbps` Gigabit Ethernet) or custom max ceiling.
     - **Dual-Needle Split (`dual-needle`)**: Shows **Download** on the primary needle/arc and **Upload** on the secondary needle/arc simultaneously.
2. **Individual Style Override (`Gauge` icon)**:
   - Cycles the visual style for **only that specific gauge** (`Radial Arc` &rarr; `Tachometer` &rarr; `Minimal Ring` &rarr; `Sci-Fi LED Bar`), allowing you to mix styles (for example, `CPU` and `GPU 0` as Automotive Tachometers while `MEMORY` and `DISK 0` use Segmented LED Bars).
3. **Peak Reset (`RotateCcw` icon)**:
   - Clears the peak-hold marker for that specific gauge.
4. **Tear Off (`↗`) / Dock Back (`↙`)**:
   - Clicking **Tear Off (`↗`)** detaches that gauge from the main dock into its own independent, frameless floating window that can be dragged anywhere on any monitor.
   - Inside a torn-off gauge window, click **Dock Back (`↙`)** to return it to the main dock.

---

## 3. The 4 Power Gauge Styles

| Style | Best For | Visual Elements |
| :--- | :--- | :--- |
| **Modern Radial Arc** | All-around HUD monitoring | 270° neon arc, 28 outer tick marks with amber/redline zones, concentric inner arc for secondary metric (VRAM, Swap, Disk Space, Upload), white peak-hold tick, and digital center readout. |
| **Automotive Tachometer** | CPU, GPU & Dual-Needle Network | Classic analog dial (`0`–`10` x10%), redline zone arc, smooth sweeping needle, dashed amber peak-hold ghost needle, optional secondary needle, and bottom digital odometer box. |
| **Minimalist Circular Ring** | Compact / Clean Desktops | Full 360° high-contrast progress ring, inner concentric secondary ring, white peak dot on the track, and large center typography. |
| **Segmented Sci-Fi LED Bar** | Retro / Cyberpunk HUDs | 20-segment horizontal LED power rack with automatic Green &rarr; Amber &rarr; Redline segment illumination, white peak-hold LED cell, and secondary auxiliary LED strip. |

Every gauge also includes two optional overlays (toggleable in Settings):
- **Mini Rolling Sparkline**: A 45-sample live area graph directly beneath the dial.
- **Telemetry Sub-Metric Badges**: Three data pills at the bottom of the card showing secondary sensors (`CLK`, `CORES`, `TEMP`, `READ`, `WRITE`, `DOWN`, `UP`, `VRAM`, `PWR`, etc.).

---

## 4. Click-Through (Ghost) Mode & How to Unlock

When **Click-Through / Ghost Mode** is active:
- All floating gauge windows (`Main Dock` and any `Torn-Off Gauges`) become completely transparent to mouse clicks—you can click, drag, and type in any application or game directly behind the gauges.
- Action buttons on the HUD hide automatically to keep the view clean, and a small `GHOST (Ctrl+Alt+G)` badge indicates the locked state.

### How to Unlock Ghost Mode
You have **three ways** to exit Ghost Mode at any time:
1. **Global Hotkey**: Press **`Ctrl + Alt + G`** anywhere in Windows.
2. **System Tray Right-Click Menu**: Right-click the **PowerGauge HUD** icon in the Windows notification area (bottom-right near the clock) and click **"Toggle Click-Through Ghost Mode (Ctrl+Alt+G)"**.
3. **Control Center Window**: Left-click the System Tray icon to open the Control Center, then click the **"Ghost Mode ON (Locked)"** button in the top-right header.

---

## 5. System Tray & Taskbar Integration

- **System Tray Icon (Notification Area)**:
  - **Left-Click**: Opens and focuses the **PowerGauge HUD Control Center** window.
  - **Right-Click**: Opens the native tray menu:
    - *Open Control Center & Settings...*
    - *Show / Hide All Gauges (`Ctrl+Alt+M`)*
    - *Toggle Click-Through Ghost Mode (`Ctrl+Alt+G`)*
    - *Cycle Gauge Style (Radial / Tach / Ring / LED)*
    - *Dock All Torn-Off Gauges*
    - *Reset Peak-Hold Markers*
    - *Quit PowerGauge HUD*
- **Windows Taskbar Icon**:
  - By default, PowerGauge HUD also shows in your main Windows Taskbar so you can switch to it with `Alt+Tab`.
  - If you prefer a pure background tray utility, open **Settings &rarr; Dock, Tray & Desktop Behavior** and uncheck **"Show in Windows Taskbar (Alt+Tab)"**.

---

## 6. Control Center & Settings Tabs

Open the Control Center via the System Tray icon or the HUD gear button (`⚙`) to access three configuration tabs:

1. **Visual Styles & Themes**:
   - Select the **Global Power Gauge Style**.
   - Pick from 5 color themes (**Cyber Cyan**, **Tachometer Redline**, **Emerald Matrix**, **Solar Amber**, **Violet Plasma**).
   - Adjust **Warning Load Threshold %** (default `72%`) and **Redline / Critical Threshold %** (default `88%`).
   - Adjust **HUD Background Opacity** (`0%` pure floating gauges to `100%` dark carbon card) and **Global Gauge Scale** (`Mini`, `Standard`, `Large`).
   - Toggle **Peak-Hold Marker**, **Rolling Sparkline**, and **Sub-Metric Badges**.
2. **Dock, Tray & Desktop Behavior**:
   - Switch dock layout (**Horizontal Bar**, **Vertical Tower**, **Responsive Grid** + column count).
   - Choose desktop layering (**Always on Top**, **Desktop Widget Behind Apps**, **Standard Window Layer**).
   - Toggle **Click-Through Ghost Mode**, **Show in Windows Taskbar**, **Magnetic Screen-Edge Snapping**, and **Launch at Windows Startup**.
   - Set **Refresh Interval** (`250ms Ultra`, `500ms Fast`, `1000ms Normal`, `2000ms Eco`) and **Network Unit** (`Mbps` vs. `MB/s`).
3. **Gauges & Tear-Off Windows**:
   - Enable **"Include Separate Logical Volume Gauges (C:, D:...)"** if you want partition gauges alongside Physical Drive gauges (`DISK 0`, `DISK 1`...).
   - Enable **"Show All Active Network Interfaces"** to display separate gauges for Ethernet, Wi-Fi, and virtual adapters.
   - Customize every discovered hardware gauge individually: show/hide (`Eye` icon), override **Style**, override **Scale**, pick **Dial Metric/Scale**, choose a **Custom Accent Color**, or **Tear Off / Dock** its window.

<!-- ai-review smoke test; this PR will be closed unmerged -->
