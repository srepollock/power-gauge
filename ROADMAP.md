# Roadmap

PowerGauge HUD releases from `trunk` through release-please. A `fix:` commit ships as a patch and a `feat:` commit as a minor; before 1.0, breaking changes also bump the minor. Versions below are the planned home for each item, not dates. Items marked *unfiled* don't have an issue yet.

The product rule from [`docs/DECISIONS.md`](./docs/DECISIONS.md) applies to everything here: never remove an existing gauge style, sensor mode or windowing option, and keep every option configurable globally and per gauge.

## Shipped

### v0.2.0 (published 2026-11-03): first public release
- Floating dock with tear-off gauges, the full desktop suite window, four SVG gauge styles, and tray, taskbar and Ghost Mode integration
- Telemetry for CPU, memory, disks, network and GPUs (sysinfo, NVML, and Windows performance counters off the sampling thread)
- Windows installers (NSIS and MSI), a portable exe and `SHA256SUMS.txt` on every release
- Toolchain: React 19, Vite 8, TypeScript 7, sysinfo 0.40
- Licensed Apache-2.0

### v0.2.1 (published 2026-11-05; the CHANGELOG entry is dated 2026-11-03, when the Release PR was cut)
- Release pipeline: the frontend is built before Rust tests, assets attach reliably, and a dispatch can rebuild an existing tag (#44)

## Next: v0.2.2
- Manual version bumps keep both lockfiles in sync, and CI checks all six version files (#49)

## v0.3.0: telemetry resilience
- Retry optional sensors (disks, networks, components) that failed at startup, without blocking the sampling thread (#28)
- Make sensor failures visible: a release build runs as a GUI app, so today's `eprintln!` output never reaches the user. Options are a log file or a status in the Control Center (*unfiled*).

## Before 1.0
- Code-sign the installers and portable exe so Windows SmartScreen stops warning. Needs a code-signing certificate (*unfiled*).
- Broaden tests. Today there are 5 frontend tests (the telemetry adapter) and 1 Rust test (live sampling bounds and schema). Window management, IPC commands and settings persistence are untested (*unfiled*).

## Housekeeping
- `CHANGELOG.md` and the v0.2.0 release notes repeat three entries, the v0.2.0 compare link points at a `v0.1.0` tag that doesn't exist, and a leftover `## [Unreleased]` header sits between 0.2.0 and 0.1.0. Cosmetic.
