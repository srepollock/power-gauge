param(
    [Parameter(Mandatory = $false)]
    [switch]$BundleInstallers,

    [Parameter(Mandatory = $false)]
    [switch]$Offline
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

try {
    # Ensure Cargo bin directory is in PATH
    $cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
    if ((Test-Path $cargoBin) -and ($env:Path -notlike "*$cargoBin*")) {
        $env:Path = "$cargoBin;$env:Path"
    }

    # 1. Verify version parity across package.json, tauri.conf.json, and Cargo.toml
    $pkgJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $tauriJson = Get-Content "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
    $cargoToml = Get-Content "src-tauri\Cargo.toml" -Raw

    $pkgVer = [string]$pkgJson.version
    $tauriVer = [string]$tauriJson.version
    $cargoMatch = [regex]::Match($cargoToml, '(?m)^version\s*=\s*"([^"]+)"')
    $cargoVer = if ($cargoMatch.Success) { $cargoMatch.Groups[1].Value } else { "unknown" }

    if (($pkgVer -ne $tauriVer) -or ($pkgVer -ne $cargoVer)) {
        throw "Version mismatch detected! package.json=$pkgVer, tauri.conf.json=$tauriVer, Cargo.toml=$cargoVer. Run 'npm run release:bump' first."
    }

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " Building PowerGauge HUD Release v$pkgVer" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    # 2. Ensure node_modules (including devDependencies like typescript & vite) are installed
    $tscBin = Join-Path $RepoRoot "node_modules\.bin\tsc.cmd"
    if (-not (Test-Path $tscBin)) {
        Write-Host "[0/3] Installing npm dependencies (including devDependencies)..." -ForegroundColor Yellow
        npm install --include=dev
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
    }

    # 3. Build & Typecheck Frontend (dist/)
    Write-Host "[1/3] Building TypeScript + Vite production frontend bundle..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed with exit code $LASTEXITCODE"
    }

    # 3. Build Optimized Rust Release Executable (& Optional Installer Bundles)
    if ($BundleInstallers) {
        Write-Host "[2/3] Building Tauri release executable & Windows installers (.exe / .msi)..." -ForegroundColor Yellow
        npx tauri build
        if ($LASTEXITCODE -ne 0) {
            throw "Tauri installer build failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Host "[2/3] Compiling optimized Rust release binary (LTO + strip)..." -ForegroundColor Yellow
        $cargoArgs = @("build", "--release", "--manifest-path", "src-tauri/Cargo.toml")
        if ($Offline) {
            $cargoArgs += "--offline"
        }
        & cargo.exe @cargoArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Cargo release build failed with exit code $LASTEXITCODE"
        }
    }

    # 4. Stage Artifacts & Generate SHA256SUMS.txt
    Write-Host "[3/3] Staging release artifacts & generating SHA-256 checksums..." -ForegroundColor Yellow
    $releaseDir = Join-Path $RepoRoot "release\v$pkgVer"
    if (Test-Path $releaseDir) {
        Remove-Item $releaseDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

    $builtExe = Join-Path $RepoRoot "src-tauri\target\release\power-gauge-hud.exe"
    if (-not (Test-Path $builtExe)) {
        throw "Expected release binary not found at $builtExe"
    }

    $portableName = "PowerGauge-HUD-v$pkgVer-win64-portable.exe"
    $portableDest = Join-Path $releaseDir $portableName
    Copy-Item -Path $builtExe -Destination $portableDest -Force

    # Copy any NSIS (.exe) or WiX (.msi) installers if present
    $bundleRoot = Join-Path $RepoRoot "src-tauri\target\release\bundle"
    if (Test-Path $bundleRoot) {
        Get-ChildItem -Path $bundleRoot -Recurse -Include "*.exe", "*.msi" | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination (Join-Path $releaseDir $_.Name) -Force
        }
    }

    # Compute SHA256SUMS.txt using .NET SHA256 (works even when PSModulePath is overridden across pwsh/powershell)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $checksumLines = @()
    Get-ChildItem -Path $releaseDir -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" } | ForEach-Object {
        $stream = [System.IO.File]::OpenRead($_.FullName)
        try {
            $hashBytes = $sha256.ComputeHash($stream)
        } finally {
            $stream.Dispose()
        }
        $hashHex = [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLowerInvariant()
        $sizeMb = [math]::Round($_.Length / 1MB, 2)
        $checksumLines += "$hashHex  $($_.Name)  # $sizeMb MB"
    }
    $sha256.Dispose()
    $checksumPath = Join-Path $releaseDir "SHA256SUMS.txt"
    Set-Content -Path $checksumPath -Value ($checksumLines -join "`r`n")

    Write-Host ""
    Write-Host "Release v$pkgVer staged successfully in: $releaseDir" -ForegroundColor Green
    Get-Content $checksumPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} finally {
    Pop-Location
}
