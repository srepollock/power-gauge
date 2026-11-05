param(
    [Parameter(Mandatory = $false)]
    [string]$Version = "",

    [Parameter(Mandatory = $false)]
    [ValidateSet("patch", "minor", "major", "")]
    [string]$Bump = "",

    [Parameter(Mandatory = $false)]
    [switch]$GitTag
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

$PkgPath = Join-Path $RepoRoot "package.json"
$TauriConfPath = Join-Path $RepoRoot "src-tauri\tauri.conf.json"
$CargoTomlPath = Join-Path $RepoRoot "src-tauri\Cargo.toml"
$CargoLockPath = Join-Path $RepoRoot "src-tauri\Cargo.lock"
$PkgLockPath = Join-Path $RepoRoot "package-lock.json"
$RpManifestPath = Join-Path $RepoRoot ".release-please-manifest.json"
$ChangelogPath = Join-Path $RepoRoot "CHANGELOG.md"

$pkgJson = Get-Content $PkgPath -Raw | ConvertFrom-Json
$currentVersion = [string]$pkgJson.version

if ([string]::IsNullOrWhiteSpace($Version)) {
    if ([string]::IsNullOrWhiteSpace($Bump)) {
        Write-Host "Current version: $currentVersion" -ForegroundColor Cyan
        Write-Host "Usage: npm run release:bump -- -Version 0.2.0  OR  npm run release:bump -- -Bump minor" -ForegroundColor Yellow
        exit 0
    }
    $parts = $currentVersion.Split("-")[0].Split(".")
    $maj = [int]$parts[0]
    $min = [int]$parts[1]
    $pat = [int]$parts[2]

    switch ($Bump) {
        "major" { $maj++; $min = 0; $pat = 0 }
        "minor" { $min++; $pat = 0 }
        "patch" { $pat++ }
    }
    $Version = "$maj.$min.$pat"
}

if ($Version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') {
    throw "Invalid Semantic Version '$Version'. Expected format: X.Y.Z or X.Y.Z-rc.1"
}

Write-Host "Bumping PowerGauge HUD version: $currentVersion -> $Version" -ForegroundColor Cyan

# Validate the Cargo.lock entry before writing anything, so a miss can't leave a partial bump.
$lockRaw = Get-Content $CargoLockPath -Raw
$lockPattern = '(?m)(^name = "power-gauge-hud"\r?\nversion = )"[^"]+"'
if (-not [regex]::IsMatch($lockRaw, $lockPattern)) { throw "power-gauge-hud entry not found in $CargoLockPath" }

# 1. Update package.json and package-lock.json (npm owns both root version fields)
Push-Location $RepoRoot
try {
    npm version $Version --no-git-tag-version --allow-same-version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm version $Version failed ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

# 2. Update src-tauri/tauri.conf.json
$tauriRaw = Get-Content $TauriConfPath -Raw
$tauriRaw = [regex]::Replace($tauriRaw, '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`"", 1)
Set-Content -Path $TauriConfPath -Value $tauriRaw -NoNewline

# 3. Update src-tauri/Cargo.toml
$cargoRaw = Get-Content $CargoTomlPath -Raw
$cargoRaw = [regex]::Replace($cargoRaw, '(?m)^version\s*=\s*"[^"]+"', "version = `"$Version`"", 1)
Set-Content -Path $CargoTomlPath -Value $cargoRaw -NoNewline

# 3a. Update the root package's entry in src-tauri/Cargo.lock, or `cargo test --locked` fails
$lockRaw = [regex]::Replace($lockRaw, $lockPattern, "`${1}`"$Version`"", 1)
Set-Content -Path $CargoLockPath -Value $lockRaw -NoNewline

# 3b. Update .release-please-manifest.json
if (Test-Path $RpManifestPath) {
    $rpContent = "{`r`n  `".`": `"$Version`"`r`n}`r`n"
    Set-Content -Path $RpManifestPath -Value $rpContent -NoNewline
}

# 4. Update CHANGELOG.md if section doesn't exist yet
if (Test-Path $ChangelogPath) {
    $clRaw = Get-Content $ChangelogPath -Raw
    $today = (Get-Date).ToString("yyyy-MM-dd")
    $header = "## [$Version] - $today"
    if ($clRaw -notmatch [regex]::Escape("## [$Version]")) {
        $clRaw = $clRaw -replace '(?m)^## \[Unreleased\]\r?\n', "## [Unreleased]`r`n`r`n$header`r`n`r`n### Changed`r`n- Release version $Version.`r`n"
        Set-Content -Path $ChangelogPath -Value $clRaw -NoNewline
        Write-Host "Updated CHANGELOG.md with section '$header'" -ForegroundColor Green
    }
}

Write-Host "Successfully synchronized version $Version across:" -ForegroundColor Green
Write-Host "  - package.json, package-lock.json"
Write-Host "  - src-tauri/tauri.conf.json"
Write-Host "  - src-tauri/Cargo.toml, src-tauri/Cargo.lock"
Write-Host "  - .release-please-manifest.json"

if ($GitTag) {
    git add $PkgPath $PkgLockPath $TauriConfPath $CargoTomlPath $CargoLockPath $RpManifestPath $ChangelogPath
    git commit -m "chore(release): v$Version"
    git tag -a "v$Version" -m "Release v$Version"
    Write-Host "Created git commit and tag v$Version" -ForegroundColor Green
}
