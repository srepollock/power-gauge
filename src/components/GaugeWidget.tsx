import React from "react";
import {
  AppSettings,
  DiskDisplayMode,
  GaugeItemConfig,
  GaugeScale,
  GaugeStyle,
  NormalizedGaugeData,
} from "../types";
import { THEME_ACCENTS } from "../utils/telemetryAdapter";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gauge,
  Layers,
  RotateCcw,
} from "lucide-react";

interface GaugeWidgetProps {
  data: NormalizedGaugeData;
  config: GaugeItemConfig;
  settings: AppSettings;
  isDetachedWindow?: boolean;
  onUpdateConfig: (id: string, patch: Partial<GaugeItemConfig>) => void;
  onDetach?: (id: string, title: string) => void;
  onDock?: (id: string) => void;
  onResetPeak?: (id: string) => void;
}

const STYLE_ORDER: GaugeStyle[] = ["radial", "tachometer", "ring", "led-bar"];
const STYLE_LABELS: Record<GaugeStyle, string> = {
  radial: "Radial Arc",
  tachometer: "Tachometer",
  ring: "Minimal Ring",
  "led-bar": "Sci-Fi LED",
};

export const GaugeWidget: React.FC<GaugeWidgetProps> = ({
  data,
  config,
  settings,
  isDetachedWindow = false,
  onUpdateConfig,
  onDetach,
  onDock,
  onResetPeak,
}) => {
  const effectiveStyle: GaugeStyle =
    config.styleOverride === "global"
      ? settings.globalStyle
      : config.styleOverride;

  const effectiveScale: GaugeScale =
    config.scaleOverride === "global"
      ? settings.gaugeScale
      : config.scaleOverride;

  const palette =
    THEME_ACCENTS[settings.themePreset] || THEME_ACCENTS["cyber-cyan"];

  const getDynamicColor = (pct: number, baseColor: string): string => {
    if (pct >= settings.criticalThreshold) return palette.critical;
    if (pct >= settings.warningThreshold) return palette.warning;
    return baseColor;
  };

  const activeColor = getDynamicColor(data.primaryPercent, data.defaultAccent);

  const cycleStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = STYLE_ORDER.indexOf(effectiveStyle);
    const nextStyle = STYLE_ORDER[(currentIdx + 1) % STYLE_ORDER.length];
    onUpdateConfig(data.id, { styleOverride: nextStyle });
  };

  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.category === "disk") {
      const modes: DiskDisplayMode[] = ["active-time", "used-space", "split"];
      const curr = config.diskMode || "active-time";
      const next = modes[(modes.indexOf(curr) + 1) % modes.length];
      onUpdateConfig(data.id, { diskMode: next });
    } else if (data.category === "network") {
      const modes: ("auto-scale" | "link-speed" | "dual-needle")[] = [
        "auto-scale",
        "link-speed",
        "dual-needle",
      ];
      const curr = config.netScaleMode || "auto-scale";
      const next = modes[(modes.indexOf(curr) + 1) % modes.length];
      onUpdateConfig(data.id, { netScaleMode: next });
    }
  };

  return (
    <div
      className={`gauge-card scale-${effectiveScale} style-${effectiveStyle} ${
        data.primaryPercent >= settings.criticalThreshold ? "is-redline" : ""
      } ${isDetachedWindow ? "is-detached-card" : ""}`}
      style={
        {
          "--gauge-accent": activeColor,
          "--gauge-base-accent": data.defaultAccent,
          "--hud-bg-alpha": settings.backgroundOpacity,
        } as React.CSSProperties
      }
    >
      {/* Top Header */}
      <div className="gauge-card-header">
        <div className="gauge-title-group">
          <div className="gauge-title-row">
            <span
              className="gauge-status-dot"
              style={{ backgroundColor: activeColor }}
            />
            <span className="gauge-title">{data.title}</span>
          </div>
          <span className="gauge-subtitle" title={data.subtitle}>
            {data.subtitle}
          </span>
        </div>

        {!settings.ghostMode && (
          <div className="gauge-actions">
            {(data.category === "disk" || data.category === "network") && (
              <button
                type="button"
                className="gauge-icon-btn"
                onClick={cycleMode}
                title={
                  data.category === "disk"
                    ? `Disk Mode: ${config.diskMode || "active-time"} (click to switch Active I/O % vs Used Space %)`
                    : `Network Scale: ${config.netScaleMode || "auto-scale"} (click to switch Auto / Link % / Dual-Needle)`
                }
              >
                <Layers size={12} />
              </button>
            )}
            <button
              type="button"
              className="gauge-icon-btn"
              onClick={cycleStyle}
              title={`Style: ${STYLE_LABELS[effectiveStyle]} (click to switch)`}
            >
              <Gauge size={12} />
            </button>
            {settings.showPeakHold && onResetPeak && (
              <button
                type="button"
                className="gauge-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetPeak(data.id);
                }}
                title={`Peak: ${Math.round(data.peakPercent)}% (click to reset)`}
              >
                <RotateCcw size={12} />
              </button>
            )}
            {!isDetachedWindow && onDetach && (
              <button
                type="button"
                className="gauge-icon-btn detach-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDetach(data.id, data.title);
                }}
                title="Tear off gauge into its own floating window"
              >
                <ArrowUpRight size={13} />
              </button>
            )}
            {isDetachedWindow && onDock && (
              <button
                type="button"
                className="gauge-icon-btn dock-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDock(data.id);
                }}
                title="Dock gauge back into main HUD"
              >
                <ArrowDownLeft size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Dial / Bar Renderer */}
      <div className="gauge-visual-stage">
        {effectiveStyle === "radial" && (
          <RadialArcGauge
            data={data}
            activeColor={activeColor}
            settings={settings}
            palette={palette}
          />
        )}
        {effectiveStyle === "tachometer" && (
          <TachometerGauge
            data={data}
            activeColor={activeColor}
            settings={settings}
            palette={palette}
          />
        )}
        {effectiveStyle === "ring" && (
          <MinimalRingGauge
            data={data}
            activeColor={activeColor}
            settings={settings}
          />
        )}
        {effectiveStyle === "led-bar" && (
          <LedBarGauge
            data={data}
            activeColor={activeColor}
            settings={settings}
            palette={palette}
          />
        )}
      </div>

      {/* Optional Rolling Sparkline */}
      {settings.showSparkline && (
        <div className="gauge-sparkline-wrap">
          <SparklineStrip
            history={data.history}
            color={activeColor}
            peak={settings.showPeakHold ? data.peakPercent : undefined}
          />
        </div>
      )}

      {/* Telemetry Sub-Metric Badges */}
      {settings.showSubMetrics && (
        <div className="gauge-badges-grid">
          {data.badges.slice(0, 3).map((b, idx) => (
            <div
              key={`${b.label}-${idx}`}
              className={`gauge-badge ${b.highlight ? "is-highlight" : ""}`}
            >
              <span className="badge-label">{b.label}</span>
              <span className="badge-value">{b.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 1. MODERN RADIAL ARC GAUGE (270° Sweep)
 * ============================================================================ */
const RadialArcGauge: React.FC<{
  data: NormalizedGaugeData;
  activeColor: string;
  settings: AppSettings;
  palette: Record<string, string>;
}> = ({ data, activeColor, settings, palette }) => {
  const cx = 80;
  const cy = 80;
  const rOuter = 62;
  const rInner = 50;
  const startAngle = 135;
  const sweepAngle = 270;

  const pct = clamp(data.primaryPercent);
  const secPct =
    data.secondaryPercent !== undefined ? clamp(data.secondaryPercent) : null;
  const peakPct = clamp(data.peakPercent);

  const trackPath = describeArc(cx, cy, rOuter, startAngle, startAngle + sweepAngle);
  const valEndAngle = startAngle + (sweepAngle * pct) / 100;
  const valuePath =
    pct > 0.3 ? describeArc(cx, cy, rOuter, startAngle, valEndAngle) : "";

  const secTrackPath =
    secPct !== null
      ? describeArc(cx, cy, rInner, startAngle, startAngle + sweepAngle)
      : "";
  const secValuePath =
    secPct !== null && secPct > 0.3
      ? describeArc(
          cx,
          cy,
          rInner,
          startAngle,
          startAngle + (sweepAngle * secPct) / 100
        )
      : "";

  const peakAngle = startAngle + (sweepAngle * peakPct) / 100;
  const peakInner = polarToCartesian(cx, cy, rOuter - 6, peakAngle);
  const peakOuter = polarToCartesian(cx, cy, rOuter + 6, peakAngle);

  // Generate 28 minor ticks along the 270 deg sweep
  const ticks = [];
  for (let i = 0; i <= 27; i++) {
    const tPct = (i / 27) * 100;
    const angle = startAngle + (i / 27) * sweepAngle;
    const isMajor = i % 3 === 0;
    const p1 = polarToCartesian(cx, cy, rOuter + (isMajor ? 10 : 8), angle);
    const p2 = polarToCartesian(cx, cy, rOuter + 5, angle);
    let tickColor = "rgba(255,255,255,0.18)";
    if (tPct >= settings.criticalThreshold) tickColor = "rgba(239,68,68,0.55)";
    else if (tPct >= settings.warningThreshold)
      tickColor = "rgba(245,158,11,0.45)";
    ticks.push(
      <line
        key={i}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={tickColor}
        strokeWidth={isMajor ? 1.8 : 1}
        strokeLinecap="round"
      />
    );
  }

  return (
    <div className="gauge-svg-container">
      <svg viewBox="0 0 160 148" className="gauge-svg">
        <defs>
          <filter id={`glow-${data.id}`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {ticks}

        {/* Outer Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={8.5}
          strokeLinecap="round"
        />

        {/* Secondary Inner Ring (VRAM / Swap / Disk Space / Upload) */}
        {secPct !== null && (
          <>
            <path
              d={secTrackPath}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            {secValuePath && (
              <path
                d={secValuePath}
                fill="none"
                stroke={data.defaultAccent}
                strokeOpacity={0.55}
                strokeWidth={4}
                strokeLinecap="round"
              />
            )}
          </>
        )}

        {/* Primary Value Arc */}
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={activeColor}
            strokeWidth={8.5}
            strokeLinecap="round"
            filter={`url(#glow-${data.id})`}
            className="gauge-arc-animated"
          />
        )}

        {/* Peak-Hold Marker */}
        {settings.showPeakHold && peakPct > 1 && (
          <line
            x1={peakInner.x}
            y1={peakInner.y}
            x2={peakOuter.x}
            y2={peakOuter.y}
            stroke={
              peakPct >= settings.criticalThreshold
                ? palette.critical
                : "#ffffff"
            }
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        )}
      </svg>

      <div className="gauge-center-readout">
        <div className="readout-primary">
          <span className="readout-number">{data.primaryText}</span>
          <span className="readout-unit">{data.primaryUnit}</span>
        </div>
        {data.secondaryLabel && (
          <div className="readout-secondary">
            <span>{data.secondaryLabel}</span>
            <strong>{data.secondaryValue}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. AUTOMOTIVE / ANALOG TACHOMETER GAUGE
 * ============================================================================ */
const TachometerGauge: React.FC<{
  data: NormalizedGaugeData;
  activeColor: string;
  settings: AppSettings;
  palette: Record<string, string>;
}> = ({ data, activeColor, settings, palette }) => {
  const cx = 80;
  const cy = 82;
  const r = 62;
  const startAngle = 135;
  const sweepAngle = 270;

  const pct = clamp(data.primaryPercent);
  const secPct =
    data.secondaryPercent !== undefined ? clamp(data.secondaryPercent) : null;
  const peakPct = clamp(data.peakPercent);

  // Redline zone arc
  const redStart = startAngle + (sweepAngle * settings.criticalThreshold) / 100;
  const redEnd = startAngle + sweepAngle;
  const redlineArc = describeArc(cx, cy, r - 3, redStart, redEnd);
  const dialArc = describeArc(cx, cy, r, startAngle, redStart);

  // Needle angles
  const needleAngle = startAngle + (sweepAngle * pct) / 100;
  const needleTip = polarToCartesian(cx, cy, r - 8, needleAngle);
  const needleTail = polarToCartesian(cx, cy, 12, needleAngle + 180);

  const secNeedleAngle =
    secPct !== null ? startAngle + (sweepAngle * secPct) / 100 : null;
  const secNeedleTip =
    secNeedleAngle !== null
      ? polarToCartesian(cx, cy, r - 18, secNeedleAngle)
      : null;

  const peakAngle = startAngle + (sweepAngle * peakPct) / 100;
  const peakTip = polarToCartesian(cx, cy, r - 10, peakAngle);

  const ticks = [];
  for (let i = 0; i <= 50; i++) {
    const stepPct = i * 2;
    const angle = startAngle + (sweepAngle * stepPct) / 100;
    const isMajor = i % 5 === 0;
    const pOuter = polarToCartesian(cx, cy, r - 1, angle);
    const pInner = polarToCartesian(cx, cy, r - (isMajor ? 10 : 5), angle);
    const isRed = stepPct >= settings.criticalThreshold;

    ticks.push(
      <line
        key={`t-${i}`}
        x1={pOuter.x}
        y1={pOuter.y}
        x2={pInner.x}
        y2={pInner.y}
        stroke={isRed ? palette.critical : isMajor ? "#e2e8f0" : "rgba(255,255,255,0.28)"}
        strokeWidth={isMajor ? 2 : 1}
      />
    );

    if (isMajor) {
      const pLabel = polarToCartesian(cx, cy, r - 19, angle);
      ticks.push(
        <text
          key={`lbl-${i}`}
          x={pLabel.x}
          y={pLabel.y + 3}
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="700"
          fill={isRed ? palette.critical : "rgba(226,232,240,0.82)"}
          fontFamily="monospace"
        >
          {i / 5}
        </text>
      );
    }
  }

  return (
    <div className="gauge-svg-container tachometer-stage">
      <svg viewBox="0 0 160 148" className="gauge-svg">
        {/* Outer Bezel */}
        <circle
          cx={cx}
          cy={cy}
          r={r + 4}
          fill="rgba(10, 14, 24, 0.55)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1.5}
        />

        {/* Dial Scale Arc & Redline Arc */}
        <path
          d={dialArc}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={2.5}
        />
        <path
          d={redlineArc}
          fill="none"
          stroke={palette.critical}
          strokeWidth={4.5}
          strokeOpacity={0.75}
        />

        {ticks}

        {/* Peak-Hold Ghost Needle */}
        {settings.showPeakHold && peakPct > 1 && (
          <line
            x1={cx}
            y1={cy}
            x2={peakTip.x}
            y2={peakTip.y}
            stroke={palette.warning}
            strokeWidth={1.5}
            strokeDasharray="3 2"
            strokeOpacity={0.65}
          />
        )}

        {/* Secondary Needle (for Dual Mode / Secondary Metric) */}
        {data.isDualMode && secNeedleTip && (
          <line
            x1={cx}
            y1={cy}
            x2={secNeedleTip.x}
            y2={secNeedleTip.y}
            stroke="#38bdf8"
            strokeWidth={2}
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
        )}

        {/* Primary Sweeping Needle */}
        <line
          x1={needleTail.x}
          y1={needleTail.y}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={activeColor}
          strokeWidth={3}
          strokeLinecap="round"
          className="tach-needle"
        />

        {/* Center Pivot Cap */}
        <circle
          cx={cx}
          cy={cy}
          r={7.5}
          fill="#0f172a"
          stroke={activeColor}
          strokeWidth={2.2}
        />
        <circle cx={cx} cy={cy} r={2.8} fill={activeColor} />
      </svg>

      {/* Odometer Digital Box */}
      <div className="tach-odometer-box">
        <span className="tach-odo-val">
          {data.primaryText}
          <small>{data.primaryUnit}</small>
        </span>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. MINIMALIST CIRCULAR RING GAUGE
 * ============================================================================ */
const MinimalRingGauge: React.FC<{
  data: NormalizedGaugeData;
  activeColor: string;
  settings: AppSettings;
}> = ({ data, activeColor, settings }) => {
  const cx = 80;
  const cy = 74;
  const rOuter = 56;
  const rInner = 45;
  const circumOuter = 2 * Math.PI * rOuter;
  const circumInner = 2 * Math.PI * rInner;

  const pct = clamp(data.primaryPercent);
  const secPct =
    data.secondaryPercent !== undefined ? clamp(data.secondaryPercent) : null;
  const peakPct = clamp(data.peakPercent);

  const offsetOuter = circumOuter - (pct / 100) * circumOuter;
  const offsetInner =
    secPct !== null ? circumInner - (secPct / 100) * circumInner : circumInner;

  const peakAngle = -90 + (360 * peakPct) / 100;
  const peakPos = polarToCartesian(cx, cy, rOuter, peakAngle);

  return (
    <div className="gauge-svg-container ring-stage">
      <svg viewBox="0 0 160 148" className="gauge-svg">
        {/* Outer Ring Track */}
        <circle
          cx={cx}
          cy={cy}
          r={rOuter}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={9}
        />

        {/* Secondary Concentric Inner Ring */}
        {secPct !== null && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={rInner}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={4.5}
            />
            <circle
              cx={cx}
              cy={cy}
              r={rInner}
              fill="none"
              stroke={data.defaultAccent}
              strokeOpacity={0.5}
              strokeWidth={4.5}
              strokeDasharray={circumInner}
              strokeDashoffset={offsetInner}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="ring-stroke-animated"
            />
          </>
        )}

        {/* Primary Progress Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={rOuter}
          fill="none"
          stroke={activeColor}
          strokeWidth={9}
          strokeDasharray={circumOuter}
          strokeDashoffset={offsetOuter}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          className="ring-stroke-animated"
        />

        {/* Peak Dot on Ring */}
        {settings.showPeakHold && peakPct > 1 && (
          <circle
            cx={peakPos.x}
            cy={peakPos.y}
            r={3.8}
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth={1.2}
          />
        )}
      </svg>

      <div className="gauge-center-readout ring-readout">
        <div className="readout-primary">
          <span className="readout-number">{data.primaryText}</span>
          <span className="readout-unit">{data.primaryUnit}</span>
        </div>
        {data.secondaryLabel && (
          <div className="readout-secondary">
            <span>{data.secondaryLabel}</span>
            <strong>{data.secondaryValue}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. SEGMENTED LED / SCI-FI POWER BAR GAUGE
 * ============================================================================ */
const LedBarGauge: React.FC<{
  data: NormalizedGaugeData;
  activeColor: string;
  settings: AppSettings;
  palette: Record<string, string>;
}> = ({ data, activeColor, settings, palette }) => {
  const segments = 20;
  const pct = clamp(data.primaryPercent);
  const secPct =
    data.secondaryPercent !== undefined ? clamp(data.secondaryPercent) : null;
  const peakPct = clamp(data.peakPercent);

  const activeCount = Math.round((pct / 100) * segments);
  const secActiveCount =
    secPct !== null ? Math.round((secPct / 100) * segments) : 0;
  const peakSegment =
    settings.showPeakHold && peakPct > 1
      ? Math.min(segments - 1, Math.floor((peakPct / 100) * segments))
      : -1;

  const getSegmentColor = (idx: number) => {
    const segPct = ((idx + 1) / segments) * 100;
    if (segPct >= settings.criticalThreshold) return palette.critical;
    if (segPct >= settings.warningThreshold) return palette.warning;
    return activeColor;
  };

  return (
    <div className="led-bar-stage">
      <div className="led-header-readout">
        <div className="led-primary-val">
          <span className="led-big-num" style={{ color: activeColor }}>
            {data.primaryText}
          </span>
          <span className="led-unit">{data.primaryUnit}</span>
        </div>
        {data.secondaryLabel && (
          <div className="led-sec-pill">
            <span>{data.secondaryLabel}</span>
            <strong>{data.secondaryValue}</strong>
          </div>
        )}
      </div>

      {/* Horizontal Segmented Power Rack */}
      <div className="led-rack-group">
        <div className="led-row-label">
          <span>LOAD</span>
          <span>Peak {Math.round(peakPct)}%</span>
        </div>
        <div className="led-segments-row">
          {Array.from({ length: segments }).map((_, i) => {
            const isLit = i < activeCount;
            const isPeak = i === peakSegment;
            const segColor = getSegmentColor(i);
            return (
              <div
                key={i}
                className={`led-cell ${isLit ? "is-lit" : ""} ${
                  isPeak ? "is-peak" : ""
                }`}
                style={
                  isLit
                    ? {
                        backgroundColor: segColor,
                        boxShadow: `0 0 8px ${segColor}`,
                      }
                    : isPeak
                    ? {
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 6px #ffffff",
                      }
                    : undefined
                }
              />
            );
          })}
        </div>

        {secPct !== null && (
          <>
            <div className="led-row-label secondary">
              <span>{data.secondaryLabel || "AUX"}</span>
              <span>{data.secondaryValue}</span>
            </div>
            <div className="led-segments-row secondary">
              {Array.from({ length: segments }).map((_, i) => {
                const isLit = i < secActiveCount;
                return (
                  <div
                    key={i}
                    className={`led-cell mini ${isLit ? "is-lit" : ""}`}
                    style={
                      isLit
                        ? {
                            backgroundColor: data.defaultAccent,
                             opacity: 0.85,
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * SPARKLINE STRIP
 * ============================================================================ */
const SparklineStrip: React.FC<{
  history: number[];
  color: string;
  peak?: number;
}> = ({ history, color }) => {
  const width = 148;
  const height = 22;
  const pts = history.length > 1 ? history : [0, history[0] || 0];
  const maxSamples = 40;
  const slice = pts.slice(-maxSamples);

  const coords = slice.map((val, idx) => {
    const x =
      slice.length <= 1
        ? width
        : (idx / (Math.max(2, slice.length) - 1)) * width;
    const y = height - 2 - (clamp(val) / 100) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylinePoints = coords.join(" ");
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline-svg"
      preserveAspectRatio="none"
    >
      <polygon points={areaPoints} fill={color} fillOpacity={0.14} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={polylinePoints}
      />
    </svg>
  );
};

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x.toFixed(2),
    start.y.toFixed(2),
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x.toFixed(2),
    end.y.toFixed(2),
  ].join(" ");
}
