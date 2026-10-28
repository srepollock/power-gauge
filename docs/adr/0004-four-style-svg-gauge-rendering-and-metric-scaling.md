# ADR-0004: Four-Style SVG Gauge Rendering and Metric Scaling

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: User & Agent (`/grill-me` Architecture Alignment)

---

## Context

1. The user wanted all 4 power gauge visual styles (`Modern Radial Arc`, `Automotive Tachometer`, `Minimalist Circular Ring`, and `Segmented Sci-Fi LED Bar`) available and switchable both globally and per individual gauge.
2. Metrics like `CPU` and `MEMORY` naturally have a `0–100%` range, whereas `DISK N` has two competing `0–100%` concepts (`Active I/O Time %` vs. `Used Capacity %`) and `ETHERNET` / network traffic is an unbounded throughput rate (`Bytes/sec`) that needs intelligent `0–100%` dial scaling plus support for dual Download/Upload needles.

---

## Decision

### 1. Unified `NormalizedGaugeData` Adapter Layer (`src/utils/telemetryAdapter.ts`)
Rather than coupling each of the 4 visual gauge renderers to hardware-specific types (`CpuTelemetry`, `DiskTelemetry`, `NetworkTelemetry`, `GpuTelemetry`), `buildNormalizedGauges()` converts every hardware sensor into a uniform `NormalizedGaugeData` contract:
- `primaryPercent` (`0–100`): Drives the primary arc, ring, needle, or LED bar.
- `secondaryPercent` (`0–100`, optional): Drives the inner concentric arc/ring, secondary tachometer needle (`isDualMode: true`), or auxiliary LED bar (e.g., Swap %, Disk Used Space %, Network Upload %, or GPU VRAM %).
- `primaryText` + `primaryUnit`: The central digital readout (e.g., `42` + `%` for CPU, or `148.5` + `Mbps` for Ethernet).
- `secondaryLabel` + `secondaryValue`: Pill displayed beneath the primary readout (`CLOCK 4.65 GHz`, `AVAIL 14.2 GB`, `SPACE 64%`, `UP 18.4 Mbps`, `VRAM 5.8 GB`).
- `peakPercent`: High-water mark tracked in `App.tsx` (`peaks` state map) for the peak-hold tick/needle/LED segment.
- `history`: Rolling 45-sample array for the bottom `SparklineStrip`.
- `badges`: Up to 3 structured sub-metric pills (`{ label, value, highlight }`).

### 2. Configurable `DISK N` Modes (`DiskDisplayMode`)
Each disk gauge supports three user-selectable modes (`config.diskMode`):
- `'active-time'` (Default): `primaryPercent = activeTimePercent`, `secondaryPercent = usedSpacePercent`.
- `'used-space'`: `primaryPercent = usedSpacePercent`, `secondaryPercent = activeTimePercent`.
- `'split'`: Sets `isDualMode = true`, rendering both metrics simultaneously (including dual needles on the Tachometer dial).

### 3. Configurable `ETHERNET` / Network Scaling (`NetworkScaleMode`)
Each network gauge supports three user-selectable dial scaling modes (`config.netScaleMode`):
- `'auto-scale'` (Default): Rust maintains a per-interface rolling peak bandwidth ceiling (`net_peak_bps = (prev_peak * 0.985).max(total_bps * 1.15).max(5 MB/s)`) so `autoScalePercent` adapts smoothly to the user's real connection speed without pegging `100%` on tiny background packets.
- `'link-speed'`: Scales `0–100%` against `netCustomMaxMbps || linkSpeedMbps` (e.g. `1000 Mbps`).
- `'dual-needle'`: Sets `isDualMode = true`, with `primaryPercent = downloadPercent` (and `primaryText` showing Download speed) and `secondaryPercent = uploadPercent`.

### 4. Four Pure SVG + CSS Renderers (`src/components/GaugeWidget.tsx`)
- **`RadialArcGauge` (`radial`)**: `viewBox="0 0 160 148"`, `270°` sweep from `135°` to `405°`, outer radius `62`, inner secondary radius `50`, 28 outer tick marks colored by warning/critical thresholds, SVG `<feGaussianBlur>` glow filter, and outer peak-hold line tick.
- **`TachometerGauge` (`tachometer`)**: `270°` sweep, 50 subdivisions (`0`–`10` major numbered ticks), redline zone arc (`criticalThreshold` to `100%`), dashed amber peak-hold ghost needle, optional cyan secondary needle (`isDualMode`), primary sweeping needle with pivot cap, and bottom LCD odometer box.
- **`MinimalRingGauge` (`ring`)**: Full `360°` concentric `<circle>` rings (`rOuter = 56`, `rInner = 45`) animated via `stroke-dasharray` / `stroke-dashoffset` from `-90°` (12 o'clock), with a white peak dot on the outer circumference.
- **`LedBarGauge` (`led-bar`)**: 20-cell CSS Grid segmented power rack (`led-segments-row`) where each segment's threshold zone (`normal` &rarr; `warning` &rarr; `critical`) illuminates dynamically, plus a white peak-hold LED cell and an optional 20-cell mini secondary bar.

---

## Consequences

- **Positive**:
  - Adding a new hardware sensor automatically works with all 4 gauge styles, peak-hold markers, sparklines, and color themes without touching `GaugeWidget.tsx`.
  - Adding a 5th gauge style only requires rendering from `NormalizedGaugeData` in `GaugeWidget.tsx`.

---

## Key Files
- [`src/components/GaugeWidget.tsx`](../../src/components/GaugeWidget.tsx)
- [`src/utils/telemetryAdapter.ts`](../../src/utils/telemetryAdapter.ts)
- [`src/types.ts`](../../src/types.ts)
