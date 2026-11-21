<#
.SYNOPSIS
    Upgrades GitHub Actions workflows in any repository from Node 20 to Node 24.
.DESCRIPTION
    Scans .github/workflows/*.{yml,yaml} and replaces legacy action versions
    (actions/checkout@v4, docker/build-push-action@v6, docker/login-action@v3, etc.)
    with their Node 24 native versions (actions/checkout@v7, docker/build-push-action@v7, etc.).
.EXAMPLE
    .\upgrade-workflows-node24.ps1
    .\upgrade-workflows-node24.ps1 D:\rukous
    .\upgrade-workflows-node24.ps1 D:\tunnus -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$TargetDir = ".",

    [switch]$DryRun
)

$scriptPath = Join-Path $PSScriptRoot "upgrade-workflows-node24.js"

$nodeArgs = @($scriptPath, $TargetDir)
if ($DryRun) {
    $nodeArgs += "--dry-run"
}

node @nodeArgs
