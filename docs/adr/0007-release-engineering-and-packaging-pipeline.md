# ADR-0007: Release Engineering, Version Parity, and Packaging Pipeline

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: User & Agent

---

## Context

To distribute and maintain **PowerGauge HUD** as a production Windows desktop application, we needed a repeatable release engineering process that:
1. Prevents version drift between Node (`package.json`), Tauri (`src-tauri/tauri.conf.json`), and Cargo (`src-tauri/Cargo.toml`).
2. Compiles an optimized, stripped production binary (`--release` with LTO) that embeds the latest compiled frontend (`dist/`).
3. Stages portable and installer artifacts (`NSIS .exe` and `WiX .msi`) into a clean `release/v<version>/` folder with cryptographic `SHA256SUMS.txt` checksums.
4. Automates CI verification and GitHub Release publishing via GitHub Actions.

---

## Decision

1. **Automated Version Synchronization (`scripts/bump-version.ps1` / `npm run release:bump`)**:
   - Atomically updates `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `CHANGELOG.md` (with optional `-GitTag` commit and tag creation).
2. **Automated Local & CI Release Builder (`scripts/build-release.ps1` / `npm run release:build` & `npm run release:bundle`)**:
   - Enforces a pre-flight version parity check across all three manifests.
   - Runs `npm run build` (`tsc && vite build`) first so `dist/` is guaranteed fresh before Rust compilation embeds it via `custom-protocol`.
   - Builds the optimized release target (`cargo build --release` or `npx tauri build` when `-BundleInstallers` is specified).
   - Copies deliverables to `release/v<version>/` and writes `SHA256SUMS.txt`.
3. **Cargo Release Profile Optimizations (`src-tauri/Cargo.toml`)**:
   - Configured `[profile.release]` with `lto = true`, `codegen-units = 1`, `opt-level = 3`, `panic = "abort"`, and `strip = true`.
4. **GitHub Actions Workflows & `srepollock/ci-toolkit` Integration (`.github/workflows/`)**:
   - Aligned repository conventions with [`srepollock/ci-toolkit`](https://github.com/srepollock/ci-toolkit):
     - Added [`.nvmrc`](../../.nvmrc) (`22`), [`release-please-config.json`](../../release-please-config.json) (configured with `extra-files` JSONPath/TOML updaters to keep `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` synchronized automatically), [`.release-please-manifest.json`](../../.release-please-manifest.json), and [`.github/dependabot.yml`](../../.github/dependabot.yml).
     - Configured [`ci.yml`](../../.github/workflows/ci.yml) with `workflow_dispatch` (required by `dependabot-triage`), least-privilege `permissions`, Node unit tests ([`src/utils/telemetryAdapter.test.ts`](../../src/utils/telemetryAdapter.test.ts)), and Rust unit tests ([`src-tauri/src/telemetry.rs`](../../src-tauri/src/telemetry.rs)).
     - Configured [`release.yml`](../../.github/workflows/release.yml) to chain `release-please` into the Tauri Windows installer & portable `.exe` build (`build-windows-release`).
     - Added consumer workflows for [`ai-review.yml`](../../.github/workflows/ai-review.yml), [`ai-agent.yml`](../../.github/workflows/ai-agent.yml), [`ai-triage.yml`](../../.github/workflows/ai-triage.yml), and [`dependabot-triage.yml`](../../.github/workflows/dependabot-triage.yml) pinned to `@v0` with explicit secret mappings.

---

## Consequences

- **Positive**:
  - Single-command release staging (`npm run release:build` or `npm run release:bundle`) with guaranteed frontend-to-backend synchronization.
  - Significantly smaller and faster production `.exe` due to LTO and symbol stripping.
  - Verifiable artifact integrity via `SHA256SUMS.txt`.

---

## Key Files
- [`scripts/bump-version.ps1`](../../scripts/bump-version.ps1)
- [`scripts/build-release.ps1`](../../scripts/build-release.ps1)
- [`CHANGELOG.md`](../../CHANGELOG.md)
- [`docs/RELEASE_PROCESS.md`](../RELEASE_PROCESS.md)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml)
