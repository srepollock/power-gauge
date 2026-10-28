import React, { useState } from "react";
import {
  AppSettings,
  DiskDisplayMode,
  DockLayout,
  GaugeItemConfig,
  GaugeScale,
  GaugeStyle,
  NetworkScaleMode,
  NormalizedGaugeData,
  ZOrderMode,
} from "../types";
import { getOrCreateGaugeConfig } from "../utils/telemetryAdapter";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  LayoutGrid,
  Lock,
  Monitor,
  Palette,
  RotateCcw,
  Sliders,
  Sparkles,
  Unlock,
  X,
} from "lucide-react";

interface SettingsModalProps {
  settings: AppSettings;
  gauges: NormalizedGaugeData[];
  isStandaloneWindow?: boolean;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateGaugeConfig: (id: string, patch: Partial<GaugeItemConfig>) => void;
  onDetachGauge: (id: string, title: string) => void;
  onDockGauge: (id: string) => void;
  onDockAll: () => void;
  onResetAllPeaks: () => void;
  onClose?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  gauges,
  isStandaloneWindow = false,
  onUpdateSettings,
  onUpdateGaugeConfig,
  onDetachGauge,
  onDockGauge,
  onDockAll,
  onResetAllPeaks,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    "style" | "window" | "hardware"
  >("style");

  const detachedCount = Object.values(settings.gauges).filter(
    (g) => g.detached
  ).length;

  return (
    <div
      className={`settings-hub-container ${
        isStandaloneWindow ? "is-standalone" : "is-modal-overlay"
      }`}
    >
      <div className="settings-panel">
        {/* Header */}
        <div
          className="settings-header"
          data-tauri-drag-region={isStandaloneWindow ? true : undefined}
        >
          <div className="settings-brand">
            <div className="brand-badge">
              <Gauge size={18} />
            </div>
            <div>
              <h2>PowerGauge HUD Control Center</h2>
              <p>
                System Tray &amp; Floating Desktop Telemetry Configuration
              </p>
            </div>
          </div>

          <div className="settings-header-actions">
            <button
              type="button"
              className={`ghost-quick-pill ${
                settings.ghostMode ? "is-active" : ""
              }`}
              onClick={() =>
                onUpdateSettings({ ghostMode: !settings.ghostMode })
              }
              title="Toggle Click-Through (Ghost) Mode — Shortcut: Ctrl+Alt+G"
            >
              {settings.ghostMode ? <Lock size={13} /> : <Unlock size={13} />}
              <span>
                {settings.ghostMode
                  ? "Ghost Mode ON (Locked)"
                  : "Interactive Mode"}
              </span>
            </button>
            {onClose && (
              <button
                type="button"
                className="settings-close-btn"
                onClick={onClose}
                title="Close Settings"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab ${activeTab === "style" ? "active" : ""}`}
            onClick={() => setActiveTab("style")}
          >
            <Palette size={15} />
            <span>Visual Styles &amp; Themes</span>
          </button>
          <button
            type="button"
            className={`settings-tab ${activeTab === "window" ? "active" : ""}`}
            onClick={() => setActiveTab("window")}
          >
            <Monitor size={15} />
            <span>Dock, Tray &amp; Desktop Behavior</span>
          </button>
          <button
            type="button"
            className={`settings-tab ${
              activeTab === "hardware" ? "active" : ""
            }`}
            onClick={() => setActiveTab("hardware")}
          >
            <Cpu size={15} />
            <span>Gauges &amp; Tear-Off Windows ({gauges.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="settings-body">
          {activeTab === "style" && (
            <div className="settings-section-stack">
              {/* 4 Gauge Visual Styles */}
              <div className="settings-card">
                <div className="card-head">
                  <h3>Global Power Gauge Style</h3>
                  <span>
                    Applies to all gauges set to &ldquo;Global&rdquo; (or override
                    per gauge in the Gauges tab)
                  </span>
                </div>
                <div className="style-selector-grid">
                  {(
                    [
                      {
                        id: "radial",
                        name: "Modern Radial Arc",
                        desc: "270° neon sweep with tick marks, dual inner arc & digital readout",
                      },
                      {
                        id: "tachometer",
                        name: "Automotive Tachometer",
                        desc: "Analog numbered scale, redline zone, sweeping needle & LCD odometer",
                      },
                      {
                        id: "ring",
                        name: "Minimalist Circular Ring",
                        desc: "Clean 360° concentric progress rings with bold center typography",
                      },
                      {
                        id: "led-bar",
                        name: "Segmented Sci-Fi LED",
                        desc: "20-segment illuminated power rack with green/amber/red zones",
                      },
                    ] as { id: GaugeStyle; name: string; desc: string }[]
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`style-option-card ${
                        settings.globalStyle === st.id ? "selected" : ""
                      }`}
                      onClick={() => onUpdateSettings({ globalStyle: st.id })}
                    >
                      <div className="style-option-title">
                        <Gauge size={15} />
                        <strong>{st.name}</strong>
                      </div>
                      <p>{st.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Presets */}
              <div className="settings-card">
                <div className="card-head">
                  <h3>Color Theme &amp; Dynamic Redline Thresholds</h3>
                  <span>
                    Gauges automatically shift to Warning &amp; Critical redline
                    colors under heavy load
                  </span>
                </div>
                <div className="theme-pills-row">
                  {(
                    [
                      {
                        id: "cyber-cyan",
                        label: "Cyber Cyan",
                        color: "#00f0ff",
                      },
                      {
                        id: "tach-redline",
                        label: "Tachometer Redline",
                        color: "#f97316",
                      },
                      {
                        id: "emerald-matrix",
                        label: "Emerald Matrix",
                        color: "#10b981",
                      },
                      {
                        id: "solar-amber",
                        label: "Solar Amber",
                        color: "#f59e0b",
                      },
                      {
                        id: "violet-plasma",
                        label: "Violet Plasma",
                        color: "#c084fc",
                      },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`theme-pill ${
                        settings.themePreset === t.id ? "selected" : ""
                      }`}
                      onClick={() => onUpdateSettings({ themePreset: t.id })}
                    >
                      <span
                        className="theme-dot"
                        style={{ backgroundColor: t.color }}
                      />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="sliders-two-col">
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Warning Load Threshold</span>
                      <strong>{settings.warningThreshold}%</strong>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={90}
                      value={settings.warningThreshold}
                      onChange={(e) =>
                        onUpdateSettings({
                          warningThreshold: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Redline / Critical Threshold</span>
                      <strong>{settings.criticalThreshold}%</strong>
                    </div>
                    <input
                      type="range"
                      min={65}
                      max={98}
                      value={settings.criticalThreshold}
                      onChange={(e) =>
                        onUpdateSettings({
                          criticalThreshold: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Glassmorphism, Sparklines & Peak Hold */}
              <div className="settings-card">
                <div className="card-head">
                  <h3>HUD Glassmorphism &amp; Telemetry Overlays</h3>
                  <span>
                    Adjust floating window transparency and extra gauge
                    indicators
                  </span>
                </div>

                <div className="sliders-two-col">
                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>HUD Background Opacity</span>
                      <strong>
                        {Math.round(settings.backgroundOpacity * 100)}%
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(settings.backgroundOpacity * 100)}
                      onChange={(e) =>
                        onUpdateSettings({
                          backgroundOpacity: Number(e.target.value) / 100,
                        })
                      }
                    />
                  </div>

                  <div className="slider-control">
                    <div className="slider-label-row">
                      <span>Global Gauge Scale</span>
                      <strong>{settings.gaugeScale.toUpperCase()}</strong>
                    </div>
                    <div className="segmented-btn-group">
                      {(["mini", "standard", "large"] as GaugeScale[]).map(
                        (sc) => (
                          <button
                            key={sc}
                            type="button"
                            className={
                              settings.gaugeScale === sc ? "active" : ""
                            }
                            onClick={() =>
                              onUpdateSettings({ gaugeScale: sc })
                            }
                          >
                            {sc.charAt(0).toUpperCase() + sc.slice(1)}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="toggle-checks-grid">
                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.showPeakHold}
                      onChange={(e) =>
                        onUpdateSettings({ showPeakHold: e.target.checked })
                      }
                    />
                    <div>
                      <strong>Peak-Hold High-Water Marker</strong>
                      <small>
                        Shows recent maximum load tick/needle on each gauge
                      </small>
                    </div>
                  </label>

                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.showSparkline}
                      onChange={(e) =>
                        onUpdateSettings({ showSparkline: e.target.checked })
                      }
                    />
                    <div>
                      <strong>Mini Rolling History Sparkline</strong>
                      <small>
                        Renders a live 40-sample history graph below each dial
                      </small>
                    </div>
                  </label>

                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.showSubMetrics}
                      onChange={(e) =>
                        onUpdateSettings({ showSubMetrics: e.target.checked })
                      }
                    />
                    <div>
                      <strong>Sub-Metric Telemetry Badges</strong>
                      <small>
                        Shows clock, temp, R/W speed, VRAM &amp; power readouts
                      </small>
                    </div>
                  </label>

                  <div className="check-tile action-tile">
                    <div>
                      <strong>Reset All Peak Markers</strong>
                      <small>Clear high-water marks across all gauges</small>
                    </div>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={onResetAllPeaks}
                    >
                      <RotateCcw size={13} />
                      <span>Reset Peaks</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "window" && (
            <div className="settings-section-stack">
              {/* Dock Layout */}
              <div className="settings-card">
                <div className="card-head">
                  <h3>Main Floating Dock Arrangement</h3>
                  <span>
                    Choose how docked gauges arrange inside the primary floating
                    HUD
                  </span>
                </div>
                <div className="segmented-btn-group three-col">
                  {(
                    [
                      { id: "horizontal", label: "Horizontal Bar" },
                      { id: "vertical", label: "Vertical Tower" },
                      { id: "grid", label: "Responsive Grid" },
                    ] as { id: DockLayout; label: string }[]
                  ).map((ly) => (
                    <button
                      key={ly.id}
                      type="button"
                      className={settings.dockLayout === ly.id ? "active" : ""}
                      onClick={() => onUpdateSettings({ dockLayout: ly.id })}
                    >
                      <LayoutGrid size={14} />
                      <span>{ly.label}</span>
                    </button>
                  ))}
                </div>

                {settings.dockLayout === "grid" && (
                  <div className="slider-control" style={{ marginTop: 12 }}>
                    <div className="slider-label-row">
                      <span>Grid Columns</span>
                      <strong>{settings.gridColumns} Columns</strong>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={6}
                      value={settings.gridColumns}
                      onChange={(e) =>
                        onUpdateSettings({
                          gridColumns: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Desktop Z-Order & Click-Through */}
              <div className="settings-card">
                <div className="card-head">
                  <h3>Desktop Layering, System Tray &amp; Taskbar</h3>
                  <span>
                    Configure Always-on-Top, Desktop Widget pinning, Ghost
                    click-through, and Taskbar presence
                  </span>
                </div>

                <div className="segmented-btn-group three-col">
                  {(
                    [
                      {
                        id: "always-on-top",
                        label: "Always on Top (Overlay)",
                      },
                      {
                        id: "desktop-widget",
                        label: "Desktop Widget (Behind Apps)",
                      },
                      { id: "normal", label: "Standard Window Layer" },
                    ] as { id: ZOrderMode; label: string }[]
                  ).map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      className={settings.zOrderMode === z.id ? "active" : ""}
                      onClick={() => onUpdateSettings({ zOrderMode: z.id })}
                    >
                      <span>{z.label}</span>
                    </button>
                  ))}
                </div>

                <div className="toggle-checks-grid" style={{ marginTop: 14 }}>
                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.ghostMode}
                      onChange={(e) =>
                        onUpdateSettings({ ghostMode: e.target.checked })
                      }
                    />
                    <div>
                      <strong>Click-Through / Ghost Mode (Ctrl+Alt+G)</strong>
                      <small>
                        Mouse clicks pass straight through all gauges. Unlock
                        anytime via Tray icon or Ctrl+Alt+G.
                      </small>
                    </div>
                  </label>

                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.showInTaskbar}
                      onChange={(e) =>
                        onUpdateSettings({ showInTaskbar: e.target.checked })
                      }
                    />
                    <div>
                      <strong>Show in Windows Taskbar (Alt+Tab)</strong>
                      <small>
                        Keep icon in main Taskbar in addition to the System Tray
                        notification icon
                      </small>
                    </div>
                  </label>

                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.snapToEdges}
                      onChange={(e) =>
                        onUpdateSettings({ snapToEdges: e.target.checked })
                      }
                    />
                    <div>
                      <strong>Magnetic Screen-Edge Snapping</strong>
                      <small>
                        Automatically snap floating dock and detached gauges to
                        monitor edges
                      </small>
                    </div>
                  </label>

                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.launchAtStartup}
                      onChange={(e) =>
                        onUpdateSettings({
                          launchAtStartup: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <strong>Launch at Windows Startup</strong>
                      <small>
                        Automatically start PowerGauge HUD when signing into
                        Windows
                      </small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Polling Speed & Units */}
              <div className="settings-card">
                <div className="card-head">
                  <h3>Telemetry Sampling Rate &amp; Units</h3>
                  <span>
                    Control how frequently hardware sensors are polled
                  </span>
                </div>
                <div className="sliders-two-col">
                  <div>
                    <div className="slider-label-row">
                      <span>Refresh Interval</span>
                      <strong>{settings.pollingIntervalMs} ms</strong>
                    </div>
                    <div className="segmented-btn-group">
                      {[
                        { ms: 250, label: "250ms (Ultra)" },
                        { ms: 500, label: "500ms (Fast)" },
                        { ms: 1000, label: "1000ms (Normal)" },
                        { ms: 2000, label: "2000ms (Eco)" },
                      ].map((p) => (
                        <button
                          key={p.ms}
                          type="button"
                          className={
                            settings.pollingIntervalMs === p.ms ? "active" : ""
                          }
                          onClick={() =>
                            onUpdateSettings({ pollingIntervalMs: p.ms })
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="slider-label-row">
                      <span>Network Throughput Unit</span>
                      <strong>{settings.networkUnit}</strong>
                    </div>
                    <div className="segmented-btn-group">
                      {(["Mbps", "MB/s"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          className={
                            settings.networkUnit === u ? "active" : ""
                          }
                          onClick={() => onUpdateSettings({ networkUnit: u })}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "hardware" && (
            <div className="settings-section-stack">
              {/* Hardware Discovery Options */}
              <div className="settings-card">
                <div className="card-head-inline">
                  <div>
                    <h3>Hardware Discovery &amp; Detached Windows</h3>
                    <span>
                      Tear off individual gauges into standalone floating windows
                      or customize each gauge&apos;s style and sensor mode
                    </span>
                  </div>
                  {detachedCount > 0 && (
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={onDockAll}
                    >
                      <ArrowDownLeft size={14} />
                      <span>Dock All ({detachedCount})</span>
                    </button>
                  )}
                </div>

                <div className="toggle-checks-grid" style={{ marginTop: 10 }}>
                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.showLogicalVolumes}
                      onChange={(e) =>
                        onUpdateSettings({
                          showLogicalVolumes: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <strong>
                        Include Separate Logical Volume Gauges (C:, D:...)
                      </strong>
                      <small>
                        In addition to Task Manager Physical Drives (DISK 0,
                        DISK 1...)
                      </small>
                    </div>
                  </label>

                  <label className="check-tile">
                    <input
                      type="checkbox"
                      checked={settings.showAllNetworkAdapters}
                      onChange={(e) =>
                        onUpdateSettings({
                          showAllNetworkAdapters: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <strong>Show All Active Network Interfaces</strong>
                      <small>
                        Display separate gauges for Ethernet, Wi-Fi, and virtual
                        adapters
                      </small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Per-Gauge Configuration Table */}
              <div className="settings-card">
                <div className="gauge-config-list">
                  {gauges.map((g) => {
                    const cfg = getOrCreateGaugeConfig(settings, g.id);
                    return (
                      <div
                        key={g.id}
                        className={`gauge-config-row ${
                          !cfg.enabled ? "is-disabled" : ""
                        }`}
                      >
                        <div className="gc-left">
                          <button
                            type="button"
                            className={`gc-vis-btn ${
                              cfg.enabled ? "on" : "off"
                            }`}
                            onClick={() =>
                              onUpdateGaugeConfig(g.id, {
                                enabled: !cfg.enabled,
                              })
                            }
                            title={
                              cfg.enabled ? "Hide this gauge" : "Show this gauge"
                            }
                          >
                            {cfg.enabled ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}
                          </button>
                          <div className="gc-info">
                            <strong>{g.title}</strong>
                            <span>{g.subtitle}</span>
                          </div>
                        </div>

                        <div className="gc-controls">
                          {/* Style Override */}
                          <label className="gc-field">
                            <span>Style</span>
                            <select
                              value={cfg.styleOverride}
                              onChange={(e) =>
                                onUpdateGaugeConfig(g.id, {
                                  styleOverride: e.target.value as
                                    | GaugeStyle
                                    | "global",
                                })
                              }
                            >
                              <option value="global">Global Default</option>
                              <option value="radial">Radial Arc</option>
                              <option value="tachometer">Tachometer</option>
                              <option value="ring">Minimal Ring</option>
                              <option value="led-bar">Sci-Fi LED Bar</option>
                            </select>
                          </label>

                          {/* Size Override */}
                          <label className="gc-field">
                            <span>Scale</span>
                            <select
                              value={cfg.scaleOverride}
                              onChange={(e) =>
                                onUpdateGaugeConfig(g.id, {
                                  scaleOverride: e.target.value as
                                    | GaugeScale
                                    | "global",
                                })
                              }
                            >
                              <option value="global">Global</option>
                              <option value="mini">Mini</option>
                              <option value="standard">Standard</option>
                              <option value="large">Large</option>
                            </select>
                          </label>

                          {/* Disk-Specific Mode */}
                          {g.category === "disk" && (
                            <label className="gc-field">
                              <span>Dial Metric</span>
                              <select
                                value={cfg.diskMode || "active-time"}
                                onChange={(e) =>
                                  onUpdateGaugeConfig(g.id, {
                                    diskMode: e.target.value as DiskDisplayMode,
                                  })
                                }
                              >
                                <option value="active-time">
                                  Active Time % (I/O)
                                </option>
                                <option value="used-space">
                                  Used Capacity %
                                </option>
                                <option value="split">
                                  Dual (Active + Space)
                                </option>
                              </select>
                            </label>
                          )}

                          {/* Network-Specific Scale Mode */}
                          {g.category === "network" && (
                            <label className="gc-field">
                              <span>Dial Scale</span>
                              <select
                                value={cfg.netScaleMode || "auto-scale"}
                                onChange={(e) =>
                                  onUpdateGaugeConfig(g.id, {
                                    netScaleMode: e.target
                                      .value as NetworkScaleMode,
                                  })
                                }
                              >
                                <option value="auto-scale">
                                  Auto-Scaling Peak
                                </option>
                                <option value="link-speed">
                                  Link Speed %
                                </option>
                                <option value="dual-needle">
                                  Dual Needle (Down/Up)
                                </option>
                              </select>
                            </label>
                          )}

                          {/* Custom Color */}
                          <label className="gc-field color-field">
                            <span>Color</span>
                            <input
                              type="color"
                              value={cfg.accentColor || g.defaultAccent}
                              onChange={(e) =>
                                onUpdateGaugeConfig(g.id, {
                                  accentColor: e.target.value,
                                })
                              }
                            />
                          </label>

                          {/* Tear-off / Dock Toggle */}
                          {cfg.detached ? (
                            <button
                              type="button"
                              className="gc-action-btn dock"
                              onClick={() => onDockGauge(g.id)}
                              title="Dock back into main HUD"
                            >
                              <ArrowDownLeft size={13} />
                              <span>Dock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="gc-action-btn detach"
                              onClick={() => onDetachGauge(g.id, g.title)}
                              title="Tear off into standalone floating window"
                            >
                              <ArrowUpRight size={13} />
                              <span>Tear Off</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Hotkey Legend */}
        <div className="settings-footer">
          <span>
            <strong>Hotkeys:</strong> <kbd>Ctrl+Alt+G</kbd> Toggle Ghost
            Click-Through &bull; <kbd>Ctrl+Alt+M</kbd> Show/Hide Gauges &bull;
            System Tray Icon: Left-Click Settings, Right-Click Quick Menu
          </span>
        </div>
      </div>
    </div>
  );
};
