import React, { useState } from "react";
import {
  AppSettings,
  GaugeItemConfig,
  GaugeStyle,
  NormalizedGaugeData,
  SystemTelemetry,
} from "../types";
import {
  formatBytesPerSec,
  formatNetworkSpeed,
  getOrCreateGaugeConfig,
  THEME_ACCENTS,
} from "../utils/telemetryAdapter";
import { toggleFloatingHudDock } from "../utils/tauriBridge";
import { GaugeWidget } from "./GaugeWidget";
import { SettingsModal } from "./SettingsModal";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Cpu,
  Gauge,
  HardDrive,
  Layers,
  LayoutDashboard,
  Lock,
  MemoryStick,
  Monitor,
  Network,
  RotateCcw,
  Settings,
  Sliders,
  Unlock,
} from "lucide-react";

interface DesktopAppViewProps {
  telemetry: SystemTelemetry | null;
  settings: AppSettings;
  gauges: NormalizedGaugeData[];
  histories: Record<string, number[]>;
  initialTab?: "dashboard" | "sensors" | "settings";
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateGaugeConfig: (id: string, patch: Partial<GaugeItemConfig>) => void;
  onDetachGauge: (id: string, title: string) => void;
  onDockGauge: (id: string) => void;
  onDockAll: () => void;
  onResetPeak: (id: string) => void;
  onResetAllPeaks: () => void;
}

export const DesktopAppView: React.FC<DesktopAppViewProps> = ({
  telemetry,
  settings,
  gauges,
  histories,
  initialTab = "dashboard",
  onUpdateSettings,
  onUpdateGaugeConfig,
  onDetachGauge,
  onDockGauge,
  onDockAll,
  onResetPeak,
  onResetAllPeaks,
}) => {
  const [activeNav, setActiveNav] = useState<
    "dashboard" | "sensors" | "settings"
  >(initialTab);
  const [hudVisible, setHudVisible] = useState(true);

  const palette =
    THEME_ACCENTS[settings.themePreset] || THEME_ACCENTS["cyber-cyan"];

  const detachedCount = Object.values(settings.gauges).filter(
    (g) => g.detached
  ).length;

  const handleToggleFloatingHud = async () => {
    const nextVis = await toggleFloatingHudDock();
    setHudVisible(nextVis);
  };

  if (!telemetry) {
    return (
      <div className="desktop-app-shell">
        <div className="desktop-loading">
          Initializing hardware telemetry engine...
        </div>
      </div>
    );
  }

  const primaryDisk =
    telemetry.disks.find((d) => d.isPhysical) || telemetry.disks[0];
  const primaryNet = telemetry.networks[0];
  const primaryGpu = telemetry.gpus[0];

  return (
    <div className="desktop-app-shell">
      {/* Left Navigation Sidebar */}
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Gauge size={22} />
          </div>
          <div>
            <h1>PowerGauge</h1>
            <span>Desktop Telemetry Suite</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item ${
              activeNav === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActiveNav("dashboard")}
          >
            <LayoutDashboard size={17} />
            <span>Live Command Center</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${
              activeNav === "sensors" ? "active" : ""
            }`}
            onClick={() => setActiveNav("sensors")}
          >
            <Activity size={17} />
            <span>Hardware Inspector</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${
              activeNav === "settings" ? "active" : ""
            }`}
            onClick={() => setActiveNav("settings")}
          >
            <Sliders size={17} />
            <span>Styles, HUD &amp; Settings</span>
          </button>
        </nav>

        {/* Sidebar Quick Floating HUD Controls */}
        <div className="sidebar-hud-card">
          <div className="shc-title">
            <Monitor size={14} />
            <span>Floating Desktop Overlay</span>
          </div>
          <p>
            Control the floating desktop HUD dock and torn-off gauge widgets.
          </p>
          <button
            type="button"
            className={`shc-btn ${hudVisible ? "active" : ""}`}
            onClick={handleToggleFloatingHud}
          >
            <Layers size={14} />
            <span>
              {hudVisible ? "Hide Floating HUD" : "Show Floating HUD"}
            </span>
          </button>

          <button
            type="button"
            className={`shc-btn ${settings.ghostMode ? "warn" : ""}`}
            onClick={() =>
              onUpdateSettings({ ghostMode: !settings.ghostMode })
            }
          >
            {settings.ghostMode ? <Lock size={14} /> : <Unlock size={14} />}
            <span>
              {settings.ghostMode
                ? "Ghost Mode ON (Locked)"
                : "Enable Ghost Click-Through"}
            </span>
          </button>

          {detachedCount > 0 && (
            <button type="button" className="shc-btn accent" onClick={onDockAll}>
              <ArrowDownLeft size={14} />
              <span>Dock All Widgets ({detachedCount})</span>
            </button>
          )}
        </div>

        <div className="sidebar-footer">
          <span>Polling: {settings.pollingIntervalMs}ms</span>
          <span>Ctrl+Alt+G / Ctrl+Alt+M</span>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="desktop-main">
        {/* Top Action Bar */}
        <header className="desktop-topbar">
          <div className="topbar-left">
            <h2>
              {activeNav === "dashboard" && "System Performance Command Center"}
              {activeNav === "sensors" &&
                "Detailed Hardware Sensor & Adapter Breakdown"}
              {activeNav === "settings" &&
                "Visual Styles, Floating HUD & Application Settings"}
            </h2>
            <span className="topbar-sub">
              {telemetry.cpu.brand} &bull; {telemetry.memory.totalGb.toFixed(0)}{" "}
              GB RAM &bull; {telemetry.gpus.map((g) => g.name).join(", ")}
            </span>
          </div>

          <div className="topbar-actions">
            {/* Quick Style Switcher */}
            <div className="topbar-style-pills">
              {(
                [
                  { id: "radial", label: "Radial" },
                  { id: "tachometer", label: "Tachometer" },
                  { id: "ring", label: "Ring" },
                  { id: "led-bar", label: "LED Bar" },
                ] as { id: GaugeStyle; label: string }[]
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`tb-pill ${
                    settings.globalStyle === st.id ? "active" : ""
                  }`}
                  onClick={() => onUpdateSettings({ globalStyle: st.id })}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="tb-action-btn"
              onClick={onResetAllPeaks}
              title="Reset Peak-Hold High-Water Marks"
            >
              <RotateCcw size={14} />
              <span>Reset Peaks</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="desktop-content-scroll">
          {activeNav === "dashboard" && (
            <div className="dashboard-stack">
              {/* Top KPI Summary Cards */}
              <div className="kpi-summary-grid">
                <div
                  className="kpi-card"
                  style={{ borderLeftColor: palette.cpu }}
                >
                  <div className="kpi-head">
                    <span>PROCESSOR (CPU)</span>
                    <Cpu size={15} color={palette.cpu} />
                  </div>
                  <div className="kpi-val">
                    {Math.round(telemetry.cpu.usagePercent)}%
                  </div>
                  <div className="kpi-sub">
                    {(telemetry.cpu.frequencyMhz / 1000).toFixed(2)} GHz &bull;{" "}
                    {telemetry.cpu.physicalCores}C/{telemetry.cpu.logicalCores}T
                  </div>
                </div>

                <div
                  className="kpi-card"
                  style={{ borderLeftColor: palette.memory }}
                >
                  <div className="kpi-head">
                    <span>PHYSICAL MEMORY</span>
                    <MemoryStick size={15} color={palette.memory} />
                  </div>
                  <div className="kpi-val">
                    {Math.round(telemetry.memory.usagePercent)}%
                  </div>
                  <div className="kpi-sub">
                    {telemetry.memory.usedGb.toFixed(1)} /{" "}
                    {telemetry.memory.totalGb.toFixed(1)} GB Used
                  </div>
                </div>

                {primaryDisk && (
                  <div
                    className="kpi-card"
                    style={{ borderLeftColor: palette.disk }}
                  >
                    <div className="kpi-head">
                      <span>{primaryDisk.label} ACTIVITY</span>
                      <HardDrive size={15} color={palette.disk} />
                    </div>
                    <div className="kpi-val">
                      {Math.round(primaryDisk.activeTimePercent)}%
                    </div>
                    <div className="kpi-sub">
                      R: {formatBytesPerSec(primaryDisk.readBytesPerSec)} &bull;
                      W: {formatBytesPerSec(primaryDisk.writeBytesPerSec)}
                    </div>
                  </div>
                )}

                {primaryNet && (
                  <div
                    className="kpi-card"
                    style={{ borderLeftColor: palette.network }}
                  >
                    <div className="kpi-head">
                      <span>{primaryNet.label} THROUGHPUT</span>
                      <Network size={15} color={palette.network} />
                    </div>
                    <div className="kpi-val">
                      {
                        formatNetworkSpeed(
                          primaryNet.downloadBytesPerSec +
                            primaryNet.uploadBytesPerSec,
                          settings.networkUnit
                        ).full
                      }
                    </div>
                    <div className="kpi-sub">
                      DL:{" "}
                      {
                        formatNetworkSpeed(
                          primaryNet.downloadBytesPerSec,
                          settings.networkUnit
                        ).full
                      }{" "}
                      &bull; UL:{" "}
                      {
                        formatNetworkSpeed(
                          primaryNet.uploadBytesPerSec,
                          settings.networkUnit
                        ).full
                      }
                    </div>
                  </div>
                )}

                {primaryGpu && (
                  <div
                    className="kpi-card"
                    style={{ borderLeftColor: palette.gpu }}
                  >
                    <div className="kpi-head">
                      <span>{primaryGpu.label} CORE</span>
                      <Monitor size={15} color={palette.gpu} />
                    </div>
                    <div className="kpi-val">
                      {Math.round(primaryGpu.coreUsagePercent)}%
                    </div>
                    <div className="kpi-sub">
                      VRAM: {primaryGpu.vramUsedGb.toFixed(1)}/
                      {primaryGpu.vramTotalGb.toFixed(0)} GB
                      {primaryGpu.temperatureC
                        ? ` • ${Math.round(primaryGpu.temperatureC)}°C`
                        : ""}
                    </div>
                  </div>
                )}
              </div>

              {/* Power Gauges Instrument Deck */}
              <section className="dash-panel">
                <div className="dash-panel-header">
                  <div>
                    <h3>Live Power Gauges Deck</h3>
                    <p>
                      Click any gauge&apos;s top-right buttons to cycle its
                      individual style, switch sensor mode, or tear it off onto
                      your desktop.
                    </p>
                  </div>
                </div>
                <div className="desktop-gauges-grid">
                  {gauges.map((g) => {
                    const cfg = getOrCreateGaugeConfig(settings, g.id);
                    if (!cfg.enabled) return null;
                    return (
                      <GaugeWidget
                        key={g.id}
                        data={g}
                        config={cfg}
                        settings={settings}
                        onUpdateConfig={onUpdateGaugeConfig}
                        onDetach={onDetachGauge}
                        onResetPeak={onResetPeak}
                      />
                    );
                  })}
                </div>
              </section>

              {/* Two-Column Bottom Row: Multi-Sensor Timeline + Per-Core CPU Grid */}
              <div className="dash-two-col">
                <section className="dash-panel">
                  <div className="dash-panel-header">
                    <div>
                      <h3>Multi-Sensor Real-Time Telemetry History</h3>
                      <p>Rolling 45-sample load comparison (0–100%)</p>
                    </div>
                  </div>
                  <MultiSensorHistoryChart
                    gauges={gauges}
                    histories={histories}
                  />
                </section>

                <section className="dash-panel">
                  <div className="dash-panel-header">
                    <div>
                      <h3>
                        Per-Core Processor Load ({telemetry.cpu.logicalCores}{" "}
                        Threads)
                      </h3>
                      <p>
                        {telemetry.cpu.brand} @{" "}
                        {(telemetry.cpu.frequencyMhz / 1000).toFixed(2)} GHz
                      </p>
                    </div>
                  </div>
                  <div className="cpu-cores-grid">
                    {telemetry.cpu.perCorePercent.map((corePct, idx) => {
                      const cColor =
                        corePct >= settings.criticalThreshold
                          ? palette.critical
                          : corePct >= settings.warningThreshold
                          ? palette.warning
                          : palette.cpu;
                      return (
                        <div key={idx} className="cpu-core-cell">
                          <div className="core-cell-top">
                            <span>CPU #{idx}</span>
                            <strong>{Math.round(corePct)}%</strong>
                          </div>
                          <div className="core-bar-track">
                            <div
                              className="core-bar-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, corePct))}%`,
                                backgroundColor: cColor,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeNav === "sensors" && (
            <div className="dashboard-stack">
              {/* Storage Drives Table */}
              <section className="dash-panel">
                <div className="dash-panel-header">
                  <div>
                    <h3>
                      Physical Disks (DISK N) &amp; Logical Volumes (
                      {telemetry.disks.length})
                    </h3>
                    <p>
                      Real-time I/O Active Time %, Read/Write speeds, and
                      storage capacity
                    </p>
                  </div>
                </div>
                <div className="sensor-table-list">
                  {telemetry.disks.map((d) => {
                    const cfg = getOrCreateGaugeConfig(settings, d.id);
                    return (
                      <div key={d.id} className="sensor-detail-row">
                        <div className="sdr-main">
                          <div className="sdr-title">
                            <strong>{d.label}</strong>
                            <span className="sdr-badge">
                              {d.isPhysical
                                ? "Physical Drive"
                                : "Logical Volume"}
                            </span>
                            <span className="sdr-sub">{d.model}</span>
                          </div>
                          <div className="sdr-bars">
                            <div className="sdr-bar-group">
                              <div className="sdr-bar-label">
                                <span>Active I/O Time</span>
                                <strong>
                                  {d.activeTimePercent.toFixed(1)}%
                                </strong>
                              </div>
                              <div className="core-bar-track">
                                <div
                                  className="core-bar-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      d.activeTimePercent
                                    )}%`,
                                    backgroundColor: palette.disk,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="sdr-bar-group">
                              <div className="sdr-bar-label">
                                <span>
                                  Used Space ({d.usedGb.toFixed(1)} /{" "}
                                  {d.totalGb.toFixed(1)} GB)
                                </span>
                                <strong>
                                  {d.usedSpacePercent.toFixed(1)}%
                                </strong>
                              </div>
                              <div className="core-bar-track">
                                <div
                                  className="core-bar-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      d.usedSpacePercent
                                    )}%`,
                                    backgroundColor: palette.memory,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="sdr-metrics">
                          <div className="sdr-stat">
                            <span>READ</span>
                            <strong>
                              {formatBytesPerSec(d.readBytesPerSec)}
                            </strong>
                          </div>
                          <div className="sdr-stat">
                            <span>WRITE</span>
                            <strong>
                              {formatBytesPerSec(d.writeBytesPerSec)}
                            </strong>
                          </div>
                          {cfg.detached ? (
                            <button
                              type="button"
                              className="gc-action-btn dock"
                              onClick={() => onDockGauge(d.id)}
                            >
                              <ArrowDownLeft size={13} />
                              <span>Dock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="gc-action-btn detach"
                              onClick={() => onDetachGauge(d.id, d.label)}
                            >
                              <ArrowUpRight size={13} />
                              <span>Float Window</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* GPUs Breakdown */}
              <section className="dash-panel">
                <div className="dash-panel-header">
                  <div>
                    <h3>Graphics Adapters — GPU N ({telemetry.gpus.length})</h3>
                    <p>
                      Core 3D/Compute utilization, Dedicated VRAM, Temperature,
                      and Power
                    </p>
                  </div>
                </div>
                <div className="sensor-table-list">
                  {telemetry.gpus.map((gpu) => {
                    const cfg = getOrCreateGaugeConfig(settings, gpu.id);
                    return (
                      <div key={gpu.id} className="sensor-detail-row">
                        <div className="sdr-main">
                          <div className="sdr-title">
                            <strong>{gpu.label}</strong>
                            <span className="sdr-badge">{gpu.vendor}</span>
                            <span className="sdr-sub">{gpu.name}</span>
                          </div>
                          <div className="sdr-bars">
                            <div className="sdr-bar-group">
                              <div className="sdr-bar-label">
                                <span>Core Utilization</span>
                                <strong>
                                  {gpu.coreUsagePercent.toFixed(1)}%
                                </strong>
                              </div>
                              <div className="core-bar-track">
                                <div
                                  className="core-bar-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      gpu.coreUsagePercent
                                    )}%`,
                                    backgroundColor: palette.gpu,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="sdr-bar-group">
                              <div className="sdr-bar-label">
                                <span>
                                  VRAM ({gpu.vramUsedGb.toFixed(1)} /{" "}
                                  {gpu.vramTotalGb.toFixed(1)} GB)
                                </span>
                                <strong>{gpu.vramPercent.toFixed(1)}%</strong>
                              </div>
                              <div className="core-bar-track">
                                <div
                                  className="core-bar-fill"
                                  style={{
                                    width: `${Math.min(100, gpu.vramPercent)}%`,
                                    backgroundColor: palette.warning,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="sdr-metrics">
                          <div className="sdr-stat">
                            <span>TEMP</span>
                            <strong>
                              {gpu.temperatureC !== null
                                ? `${Math.round(gpu.temperatureC)}°C`
                                : "N/A"}
                            </strong>
                          </div>
                          <div className="sdr-stat">
                            <span>POWER</span>
                            <strong>
                              {gpu.powerWatts !== null
                                ? `${Math.round(gpu.powerWatts)} W`
                                : "N/A"}
                            </strong>
                          </div>
                          {cfg.detached ? (
                            <button
                              type="button"
                              className="gc-action-btn dock"
                              onClick={() => onDockGauge(gpu.id)}
                            >
                              <ArrowDownLeft size={13} />
                              <span>Dock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="gc-action-btn detach"
                              onClick={() => onDetachGauge(gpu.id, gpu.label)}
                            >
                              <ArrowUpRight size={13} />
                              <span>Float Window</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Network Interfaces Breakdown */}
              <section className="dash-panel">
                <div className="dash-panel-header">
                  <div>
                    <h3>
                      Network Adapters — ETHERNET &amp; WI-FI (
                      {telemetry.networks.length})
                    </h3>
                    <p>
                      Real-time Download and Upload throughput across active
                      interfaces
                    </p>
                  </div>
                </div>
                <div className="sensor-table-list">
                  {telemetry.networks.map((net) => {
                    const dl = formatNetworkSpeed(
                      net.downloadBytesPerSec,
                      settings.networkUnit
                    );
                    const ul = formatNetworkSpeed(
                      net.uploadBytesPerSec,
                      settings.networkUnit
                    );
                    return (
                      <div key={net.id} className="sensor-detail-row">
                        <div className="sdr-main">
                          <div className="sdr-title">
                            <strong>{net.label}</strong>
                            <span className="sdr-badge">
                              {net.linkSpeedMbps} Mbps Link
                            </span>
                            <span className="sdr-sub">{net.interfaceName}</span>
                          </div>
                          <div className="sdr-bars">
                            <div className="sdr-bar-group">
                              <div className="sdr-bar-label">
                                <span>Download Load (Auto-Scaled)</span>
                                <strong>{dl.full}</strong>
                              </div>
                              <div className="core-bar-track">
                                <div
                                  className="core-bar-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      net.downloadPercent
                                    )}%`,
                                    backgroundColor: palette.network,
                                  }}
                                />
                              </div>
                            </div>
                            <div className="sdr-bar-group">
                              <div className="sdr-bar-label">
                                <span>Upload Load (Auto-Scaled)</span>
                                <strong>{ul.full}</strong>
                              </div>
                              <div className="core-bar-track">
                                <div
                                  className="core-bar-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      net.uploadPercent
                                    )}%`,
                                    backgroundColor: palette.cpu,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="sdr-metrics">
                          <div className="sdr-stat">
                            <span>DOWN</span>
                            <strong>{dl.full}</strong>
                          </div>
                          <div className="sdr-stat">
                            <span>UP</span>
                            <strong>{ul.full}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {activeNav === "settings" && (
            <div className="embedded-settings-wrap">
              <SettingsModal
                settings={settings}
                gauges={gauges}
                isStandaloneWindow={true}
                onUpdateSettings={onUpdateSettings}
                onUpdateGaugeConfig={onUpdateGaugeConfig}
                onDetachGauge={onDetachGauge}
                onDockGauge={onDockGauge}
                onDockAll={onDockAll}
                onResetAllPeaks={onResetAllPeaks}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const MultiSensorHistoryChart: React.FC<{
  gauges: NormalizedGaugeData[];
  histories: Record<string, number[]>;
}> = ({ gauges, histories }) => {
  const width = 540;
  const height = 185;
  const maxSamples = 45;
  const featured = gauges.slice(0, 5);

  return (
    <div className="multi-chart-container">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="multi-chart-svg"
        preserveAspectRatio="none"
      >
        {[25, 50, 75].map((lvl) => {
          const y = height - (lvl / 100) * height;
          return (
            <g key={lvl}>
              <line
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              <text
                x={6}
                y={y - 4}
                fontSize="9"
                fill="rgba(148,163,184,0.6)"
                fontFamily="monospace"
              >
                {lvl}%
              </text>
            </g>
          );
        })}

        {featured.map((g) => {
          const pts = histories[g.id] || [g.primaryPercent];
          const slice = pts.slice(-maxSamples);
          const coords = slice.map((val, idx) => {
            const x =
              slice.length <= 1
                ? width
                : (idx / (Math.max(2, slice.length) - 1)) * width;
            const y =
              height -
              4 -
              (Math.max(0, Math.min(100, val)) / 100) * (height - 8);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          });
          return (
            <polyline
              key={g.id}
              fill="none"
              stroke={g.defaultAccent}
              strokeWidth="2.2"
              points={coords.join(" ")}
            />
          );
        })}
      </svg>

      <div className="multi-chart-legend">
        {featured.map((g) => (
          <div key={g.id} className="mc-legend-item">
            <span
              className="mc-dot"
              style={{ backgroundColor: g.defaultAccent }}
            />
            <span>{g.title}</span>
            <strong>{Math.round(g.primaryPercent)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
};
