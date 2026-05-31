param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$LauncherArgs
)

$ErrorActionPreference = 'Stop'
$Script:AutoByteusDockerPowerShellModules = @('Core.ps1', 'DockerRuntime.ps1', 'Commands.ps1')
$Script:AutoByteusDockerPublicSourceBaseDefault = 'https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker'
$Script:AutoByteusDockerPowerShellEntryName = 'autobyteus-docker.ps1'

function Fail-AutoByteusDockerEntry([string]$Message) { throw "error: $Message" }
function Write-AutoByteusDockerEntryInfo([string]$Message) { Write-Host "[AutoByteus Docker] $Message" }

function Get-AutoByteusDockerEntrySourceBase {
  if ($env:AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE) { return $env:AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE.TrimEnd('/') }
  $Script:AutoByteusDockerPublicSourceBaseDefault
}

function Get-AutoByteusDockerEntrySourceUrl {
  if ($env:AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL) { return $env:AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL }
  "$(Get-AutoByteusDockerEntrySourceBase)/$Script:AutoByteusDockerPowerShellEntryName"
}

function Get-AutoByteusDockerModuleSourceBase {
  if ($env:AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE) { return $env:AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE.TrimEnd('/') }
  $sourceUrl = Get-AutoByteusDockerEntrySourceUrl
  $sourceUrl.Substring(0, $sourceUrl.LastIndexOf('/')) + '/autobyteus-docker.d/powershell'
}

function Get-AutoByteusDockerInstallDir {
  if ($env:AUTOBYTEUS_DOCKER_INSTALL_DIR) { return $env:AUTOBYTEUS_DOCKER_INSTALL_DIR }
  $localAppData = $env:LOCALAPPDATA
  if (-not $localAppData) { $localAppData = Join-Path $HOME 'AppData\Local' }
  Join-Path $localAppData 'AutoByteus\bin'
}

function Test-AutoByteusDockerDirectoryOnPath([string]$Directory) {
  $separator = [System.IO.Path]::PathSeparator
  $entries = @($env:PATH -split [regex]::Escape([string]$separator)) | Where-Object { $_ }
  $entries | Where-Object { $_.TrimEnd('\') -ieq $Directory.TrimEnd('\') } | Select-Object -First 1
}

function Save-AutoByteusDockerUrl([string]$Url, [string]$Path) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path
  } catch {
    Fail-AutoByteusDockerEntry "failed to download $Url. Check AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL or AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE. $($_.Exception.Message)"
  }
}

function Install-AutoByteusDockerLauncher {
  $installDir = Get-AutoByteusDockerInstallDir
  $ps1Path = Join-Path $installDir 'autobyteus-docker.ps1'
  $cmdPath = Join-Path $installDir 'autobyteus-docker.cmd'
  $moduleDir = Join-Path $installDir 'autobyteus-docker.d\powershell'
  $sourceUrl = Get-AutoByteusDockerEntrySourceUrl
  $moduleBase = Get-AutoByteusDockerModuleSourceBase

  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  New-Item -ItemType Directory -Force -Path $moduleDir | Out-Null
  Save-AutoByteusDockerUrl $sourceUrl $ps1Path
  foreach ($module in $Script:AutoByteusDockerPowerShellModules) {
    Save-AutoByteusDockerUrl "$moduleBase/$module" (Join-Path $moduleDir $module)
  }

  $shim = "@echo off`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0autobyteus-docker.ps1`" %*`r`n"
  Set-Content -Encoding ASCII -Path $cmdPath -Value $shim

  Write-AutoByteusDockerEntryInfo "Installed AutoByteus Docker launcher: $ps1Path"
  Write-Host "Command shim: $cmdPath"
  Write-Host "Next commands:`n  autobyteus-docker new-container`n  autobyteus-docker workspace paths`n  autobyteus-docker storage`n  autobyteus-docker urls"
  if (Test-AutoByteusDockerDirectoryOnPath $installDir) { Write-AutoByteusDockerEntryInfo 'Install directory is already on PATH.'; return }
  Write-Host "PATH guidance:`n  This shell cannot find 'autobyteus-docker' until $installDir is on User PATH.`n  Use direct path now:`n    powershell -NoProfile -ExecutionPolicy Bypass -File `"$ps1Path`" new-container`n  To add this directory to your User PATH without admin rights, run:`n    [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';$installDir', 'User')`n  Then open a new PowerShell window."
}

function Get-AutoByteusDockerLocalModuleDir {
  if (-not $PSCommandPath) { return $null }
  Join-Path (Split-Path -Parent $PSCommandPath) 'autobyteus-docker.d\powershell'
}

function Assert-AutoByteusDockerLocalModules([string]$ModuleDir) {
  foreach ($module in $Script:AutoByteusDockerPowerShellModules) {
    $path = Join-Path $ModuleDir $module
    if (-not (Test-Path $path)) {
      Fail-AutoByteusDockerEntry "launcher module missing: $path. Rerun 'autobyteus-docker install' or set AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE for temporary execution."
    }
  }
}

function autobyteus-docker {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CommandArgs)
  $cmd = if ($CommandArgs.Count -gt 0) { $CommandArgs[0] } else { 'help' }
  if ($cmd -eq 'install') {
    if ($CommandArgs.Count -gt 1) { Fail-AutoByteusDockerEntry "Unknown install option(s): $($CommandArgs[1..($CommandArgs.Count - 1)] -join ' ')" }
    Install-AutoByteusDockerLauncher
    return
  }
  $localModuleDir = Get-AutoByteusDockerLocalModuleDir
  if ($localModuleDir) {
    Assert-AutoByteusDockerLocalModules $localModuleDir
    foreach ($module in $Script:AutoByteusDockerPowerShellModules) { . (Join-Path $localModuleDir $module) }
  } else {
    $moduleBase = Get-AutoByteusDockerModuleSourceBase
    foreach ($module in $Script:AutoByteusDockerPowerShellModules) {
      $url = "$moduleBase/$module"
      try {
        $moduleText = Invoke-RestMethod -UseBasicParsing -Uri $url
      } catch {
        Fail-AutoByteusDockerEntry "failed to load launcher module $url. Check AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE. $($_.Exception.Message)"
      }
      . ([scriptblock]::Create([string]$moduleText))
    }
  }
  Invoke-AutoByteusDocker @CommandArgs
}

if ($PSCommandPath) {
  autobyteus-docker @LauncherArgs
}
