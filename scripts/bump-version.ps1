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

# 1. Update package.json
$pkgRaw = Get-Content $PkgPath -Raw
$pkgRaw = [regex]::Replace($pkgRaw, '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`"", 1)
Set-Content -Path $PkgPath -Value $pkgRaw -NoNewline

# 2. Update src-tauri/tauri.conf.json
$tauriRaw = Get-Content $TauriConfPath -Raw
$tauriRaw = [regex]::Replace($tauriRaw, '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`"", 1)
Set-Content -Path $TauriConfPath -Value $tauriRaw -NoNewline

# 3. Update src-tauri/Cargo.toml
$cargoRaw = Get-Content $CargoTomlPath -Raw
$cargoRaw = [regex]::Replace($cargoRaw, '(?m)^version\s*=\s*"[^"]+"', "version = `"$Version`"", 1)
Set-Content -Path $CargoTomlPath -Value $cargoRaw -NoNewline

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
Write-Host "  - package.json"
Write-Host "  - src-tauri/tauri.conf.json"
Write-Host "  - src-tauri/Cargo.toml"

if ($GitTag) {
    git add $PkgPath $TauriConfPath $CargoTomlPath $ChangelogPath
    git commit -m "chore(release): v$Version"
    git tag -a "v$Version" -m "Release v$Version"
    Write-Host "Created git commit and tag v$Version" -ForegroundColor Green
}
