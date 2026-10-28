import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppSettings,
  DockLayout,
  GaugeItemConfig,
  GaugeStyle,
  SystemTelemetry,
} from "./types";
import {
  buildNormalizedGauges,
  DEFAULT_SETTINGS,
  getOrCreateGaugeConfig,
} from "./utils/telemetryAdapter";
import {
  detachGaugeWindow,
  dockAllGaugeWindows,
  dockGaugeWindow,
  fetchSystemTelemetry,
  isTauriEnv,
  loadSettingsFromBackend,
  openFullDesktopApp,
  openSettingsHub,
  saveSettingsToBackend,
  setGhostModeBackend,
  startWindowDrag,
  subscribePeakReset,
  subscribeSettingsChanged,
  subscribeTelemetry,
  triggerPeakResetGlobal,
} from "./utils/tauriBridge";
import { GaugeWidget } from "./components/GaugeWidget";
import { SettingsModal } from "./components/SettingsModal";
import { DesktopAppView } from "./components/DesktopAppView";
import {
  ArrowDownLeft,
  Columns,
  Gauge,
  GripHorizontal,
  LayoutGrid,
  Lock,
  Maximize2,
  Pin,
  RotateCcw,
  Rows,
  Settings,
  Unlock,
} from "lucide-react";

const STYLE_CYCLE: GaugeStyle[] = ["radial", "tachometer", "ring", "led-bar"];
const LAYOUT_CYCLE: DockLayout[] = ["horizontal", "vertical", "grid"];

export const App: React.FC = () => {
  const queryParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const windowType = queryParams.get("window") || "dock"; // "dock" | "detached" | "settings"
  const targetGaugeId = queryParams.get("gaugeId") || "";

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [peaks, setPeaks] = useState<Record<string, number>>({});
  const [histories, setHistories] = useState<Record<string, number[]>>({});
  const [showBrowserSettingsModal, setShowBrowserSettingsModal] =
    useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const ingestTelemetry = useCallback((snap: SystemTelemetry) => {
    setTelemetry(snap);
    const currentSettings = settingsRef.current;

    // Compute instantaneous primary percentages to update peak & history
    setPeaks((prevPeaks) => {
      const nextPeaks = { ...prevPeaks };
      const tempGauges = buildNormalizedGauges(
        snap,
        currentSettings,
        prevPeaks,
        {}
      );
      for (const g of tempGauges) {
        const curPeak = nextPeaks[g.id] ?? 0;
        if (g.primaryPercent > curPeak) {
          nextPeaks[g.id] = g.primaryPercent;
        }
      }
      return nextPeaks;
    });

    setHistories((prevHist) => {
      const nextHist = { ...prevHist };
      const tempGauges = buildNormalizedGauges(
        snap,
        currentSettings,
        {},
        prevHist
      );
      for (const g of tempGauges) {
        const arr = nextHist[g.id] ? [...nextHist[g.id]] : [];
        arr.push(g.primaryPercent);
        if (arr.length > 45) arr.shift();
        nextHist[g.id] = arr;
      }
      return nextHist;
    });
  }, []);

  // Initial load & subscriptions
  useEffect(() => {
    let mounted = true;
    let unlistenTelemetry: (() => void) | null = null;
    let unlistenSettings: (() => void) | null = null;
    let unlistenPeaks: (() => void) | null = null;

    (async () => {
      const loaded = await loadSettingsFromBackend();
      if (mounted) setSettings(loaded);

      const initialSnap = await fetchSystemTelemetry();
      if (mounted) ingestTelemetry(initialSnap);

      unlistenTelemetry = await subscribeTelemetry((snap) => {
        if (mounted) ingestTelemetry(snap);
      });

      unlistenSettings = await subscribeSettingsChanged((newSettings) => {
        if (mounted) setSettings(newSettings);
      });

      unlistenPeaks = await subscribePeakReset(() => {
        if (mounted) setPeaks({});
      });
    })();

    return () => {
      mounted = false;
      if (unlistenTelemetry) unlistenTelemetry();
      if (unlistenSettings) unlistenSettings();
      if (unlistenPeaks) unlistenPeaks();
    };
  }, [ingestTelemetry]);

  // Magnetic screen-edge snapping for floating Tauri windows
  useEffect(() => {
    if (!isTauriEnv() || windowType === "settings" || windowType === "app") return;
    let unlistenMove: (() => void) | null = null;
    let snapTimeout: number | null = null;

    (async () => {
      try {
        const { getCurrentWindow, currentMonitor, PhysicalPosition } =
          await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlistenMove = await win.onMoved(async ({ payload: pos }) => {
          if (!settingsRef.current.snapToEdges) return;
          if (snapTimeout) window.clearTimeout(snapTimeout);
          snapTimeout = window.setTimeout(async () => {
            try {
              const monitor = await currentMonitor();
              if (!monitor) return;
              const winSize = await win.outerSize();
              const mPos = monitor.position;
              const mSize = monitor.size;
              const threshold = 18;

              let targetX = pos.x;
              let targetY = pos.y;
              let snapped = false;

              if (Math.abs(pos.x - mPos.x) < threshold) {
                targetX = mPos.x + 6;
                snapped = true;
              } else if (
                Math.abs(pos.x + winSize.width - (mPos.x + mSize.width)) <
                threshold
              ) {
                targetX = mPos.x + mSize.width - winSize.width - 6;
                snapped = true;
              }

              if (Math.abs(pos.y - mPos.y) < threshold) {
                targetY = mPos.y + 6;
                snapped = true;
              } else if (
                Math.abs(pos.y + winSize.height - (mPos.y + mSize.height)) <
                threshold
              ) {
                targetY = mPos.y + mSize.height - winSize.height - 6;
                snapped = true;
              }

              if (snapped && (targetX !== pos.x || targetY !== pos.y)) {
                await win.setPosition(new PhysicalPosition(targetX, targetY));
              }
            } catch {
              // ignore snap error
            }
          }, 140);
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      if (unlistenMove) unlistenMove();
      if (snapTimeout) window.clearTimeout(snapTimeout);
    };
  }, [windowType]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next: AppSettings = { ...prev, ...patch };
      saveSettingsToBackend(next);
      if (patch.ghostMode !== undefined) {
        setGhostModeBackend(patch.ghostMode);
      }
      return next;
    });
  }, []);

  const updateGaugeConfig = useCallback(
    (id: string, patch: Partial<GaugeItemConfig>) => {
      setSettings((prev) => {
        const existing = getOrCreateGaugeConfig(prev, id);
        const updated: GaugeItemConfig = { ...existing, ...patch };
        const next: AppSettings = {
          ...prev,
          gauges: {
            ...prev.gauges,
            [id]: updated,
          },
        };
        saveSettingsToBackend(next);
        return next;
      });
    },
    []
  );

  const handleDetachGauge = useCallback(
    async (id: string, title: string) => {
      updateGaugeConfig(id, { detached: true });
      await detachGaugeWindow(id, title);
    },
    [updateGaugeConfig]
  );

  const handleDockGauge = useCallback(
    async (id: string) => {
      updateGaugeConfig(id, { detached: false });
      await dockGaugeWindow(id);
    },
    [updateGaugeConfig]
  );

  const handleDockAll = useCallback(async () => {
    setSettings((prev) => {
      const nextGauges: Record<string, GaugeItemConfig> = {};
      for (const [k, v] of Object.entries(prev.gauges)) {
        nextGauges[k] = { ...v, detached: false };
      }
      const next = { ...prev, gauges: nextGauges };
      saveSettingsToBackend(next);
      return next;
    });
    await dockAllGaugeWindows();
  }, []);

  const handleResetPeak = useCallback((id: string) => {
    setPeaks((prev) => ({ ...prev, [id]: 0 }));
  }, []);

  const handleResetAllPeaks = useCallback(() => {
    setPeaks({});
    triggerPeakResetGlobal();
  }, []);

  const allGauges = useMemo(() => {
    if (!telemetry) return [];
    return buildNormalizedGauges(telemetry, settings, peaks, histories);
  }, [telemetry, settings, peaks, histories]);

  // 1. FULL DESKTOP APPLICATION & SETTINGS CONTROL CENTER WINDOW VIEW
  if (windowType === "app" || windowType === "settings") {
    return (
      <DesktopAppView
        telemetry={telemetry}
        settings={settings}
        gauges={allGauges}
        histories={histories}
        initialTab={windowType === "settings" ? "settings" : "dashboard"}
        onUpdateSettings={updateSettings}
        onUpdateGaugeConfig={updateGaugeConfig}
        onDetachGauge={handleDetachGauge}
        onDockGauge={handleDockGauge}
        onDockAll={handleDockAll}
        onResetPeak={handleResetPeak}
        onResetAllPeaks={handleResetAllPeaks}
      />
    );
  }

  // 2. DETACHED SINGLE-GAUGE FLOATING WINDOW VIEW
  if (windowType === "detached") {
    const gaugeData =
      allGauges.find((g) => g.id === targetGaugeId) || allGauges[0];
    if (!gaugeData) {
      return <div className="hud-loading">Connecting sensor...</div>;
    }
    const cfg = getOrCreateGaugeConfig(settings, gaugeData.id);

    return (
      <div
        className={`detached-window-shell ${
          settings.ghostMode ? "is-ghost" : ""
        } ${settings.backdropBlur ? "has-blur" : ""}`}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("button") && !settings.ghostMode) {
            startWindowDrag();
          }
        }}
      >
        <GaugeWidget
          data={gaugeData}
          config={cfg}
          settings={settings}
          isDetachedWindow={true}
          onUpdateConfig={updateGaugeConfig}
          onDock={handleDockGauge}
          onResetPeak={handleResetPeak}
        />
      </div>
    );
  }

  // 3. MAIN FLOATING DOCK VIEW
  const dockedGauges = allGauges.filter((g) => {
    const cfg = getOrCreateGaugeConfig(settings, g.id);
    if (!cfg.enabled) return false;
    if (isTauriEnv() && cfg.detached) return false;
    return true;
  });

  const detachedCount = allGauges.filter(
    (g) => getOrCreateGaugeConfig(settings, g.id).detached
  ).length;

  const cycleGlobalStyle = () => {
    const idx = STYLE_CYCLE.indexOf(settings.globalStyle);
    const next = STYLE_CYCLE[(idx + 1) % STYLE_CYCLE.length];
    updateSettings({ globalStyle: next });
  };

  const cycleDockLayout = () => {
    const idx = LAYOUT_CYCLE.indexOf(settings.dockLayout);
    const next = LAYOUT_CYCLE[(idx + 1) % LAYOUT_CYCLE.length];
    updateSettings({ dockLayout: next });
  };

  return (
    <div
      className={`hud-dock-root layout-${settings.dockLayout} ${
        settings.ghostMode ? "is-ghost-mode" : ""
      } ${settings.backdropBlur ? "has-blur" : ""}`}
      style={
        {
          "--hud-bg-alpha": settings.backgroundOpacity,
          "--grid-cols": settings.gridColumns,
        } as React.CSSProperties
      }
    >
      {/* Floating HUD Control Bar */}
      <div
        className="hud-control-bar"
        data-tauri-drag-region
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("button") && !settings.ghostMode) {
            startWindowDrag();
          }
        }}
      >
        <div className="hud-drag-handle" data-tauri-drag-region>
          <GripHorizontal size={14} />
          <span className="hud-brand-text">POWERGAUGE HUD</span>
          {settings.ghostMode && (
            <span className="ghost-indicator-pill">
              <Lock size={10} /> GHOST (Ctrl+Alt+G)
            </span>
          )}
        </div>

        {!settings.ghostMode && (
          <div className="hud-toolbar-btns">
            <button
              type="button"
              className="hud-tool-btn"
              onClick={cycleGlobalStyle}
              title={`Switch Global Gauge Style (Current: ${settings.globalStyle})`}
            >
              <Gauge size={13} />
              <span>{settings.globalStyle}</span>
            </button>

            <button
              type="button"
              className="hud-tool-btn"
              onClick={cycleDockLayout}
              title={`Switch Dock Layout (Current: ${settings.dockLayout})`}
            >
              {settings.dockLayout === "horizontal" && <Columns size={13} />}
              {settings.dockLayout === "vertical" && <Rows size={13} />}
              {settings.dockLayout === "grid" && <LayoutGrid size={13} />}
            </button>

            <button
              type="button"
              className={`hud-tool-btn ${
                settings.zOrderMode === "always-on-top" ? "active" : ""
              }`}
              onClick={() =>
                updateSettings({
                  zOrderMode:
                    settings.zOrderMode === "always-on-top"
                      ? "desktop-widget"
                      : "always-on-top",
                })
              }
              title={
                settings.zOrderMode === "always-on-top"
                  ? "Always on Top (click to switch to Desktop Wallpaper Widget mode)"
                  : "Desktop Widget Mode (click to pin Always on Top)"
              }
            >
              <Pin size={13} />
            </button>

            <button
              type="button"
              className="hud-tool-btn"
              onClick={handleResetAllPeaks}
              title="Reset All Peak-Hold Markers"
            >
              <RotateCcw size={13} />
            </button>

            {detachedCount > 0 && (
              <button
                type="button"
                className="hud-tool-btn accent"
                onClick={handleDockAll}
                title={`Dock All ${detachedCount} Torn-Off Gauges Back Into Main HUD`}
              >
                <ArrowDownLeft size={13} />
                <span>Dock All ({detachedCount})</span>
              </button>
            )}

            <button
              type="button"
              className="hud-tool-btn"
              onClick={() => updateSettings({ ghostMode: true })}
              title="Enable Click-Through Ghost Mode (Unlock via System Tray or Ctrl+Alt+G)"
            >
              <Unlock size={13} />
            </button>

            <button
              type="button"
              className="hud-tool-btn active"
              onClick={() => {
                if (isTauriEnv()) {
                  openFullDesktopApp();
                } else {
                  window.location.search = "?window=app";
                }
              }}
              title="Open Full Desktop Application Window (Dashboard, Charts & Per-Core Telemetry)"
            >
              <Maximize2 size={13} />
              <span>Full App</span>
            </button>

            <button
              type="button"
              className="hud-tool-btn settings-trigger"
              onClick={() => {
                if (isTauriEnv()) {
                  openSettingsHub();
                } else {
                  setShowBrowserSettingsModal(true);
                }
              }}
              title="Open PowerGauge HUD Settings & Control Center"
            >
              <Settings size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Main Gauges Deck */}
      <div
        className={`hud-gauges-deck layout-${settings.dockLayout}`}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("button") && !settings.ghostMode) {
            startWindowDrag();
          }
        }}
      >
        {dockedGauges.length === 0 ? (
          <div className="hud-empty-dock">
            <span>All gauges are currently torn off or hidden.</span>
            <button
              type="button"
              className="hud-restore-btn"
              onClick={handleDockAll}
            >
              Dock All Gauges
            </button>
          </div>
        ) : (
          dockedGauges.map((g) => {
            const cfg = getOrCreateGaugeConfig(settings, g.id);
            return (
              <GaugeWidget
                key={g.id}
                data={g}
                config={cfg}
                settings={settings}
                onUpdateConfig={updateGaugeConfig}
                onDetach={handleDetachGauge}
                onResetPeak={handleResetPeak}
              />
            );
          })
        )}
      </div>

      {/* Browser Fallback Modal when testing outside Tauri */}
      {showBrowserSettingsModal && (
        <SettingsModal
          settings={settings}
          gauges={allGauges}
          isStandaloneWindow={false}
          onUpdateSettings={updateSettings}
          onUpdateGaugeConfig={updateGaugeConfig}
          onDetachGauge={handleDetachGauge}
          onDockGauge={handleDockGauge}
          onDockAll={handleDockAll}
          onResetAllPeaks={handleResetAllPeaks}
          onClose={() => setShowBrowserSettingsModal(false)}
        />
      )}
    </div>
  );
};
