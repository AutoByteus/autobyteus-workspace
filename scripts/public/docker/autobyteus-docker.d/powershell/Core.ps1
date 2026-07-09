
$ErrorActionPreference = 'Stop'
$Script:LauncherLabelKey = 'com.autobyteus.launcher'
$Script:LauncherLabelValue = 'server-docker'
$Script:NodeLabelKey = 'com.autobyteus.nodeName'
$Script:ConfigLabelKey = 'com.autobyteus.configHash'
$Script:ConfigHashVersion = 'v6'
$Script:NodeNamePrefix = 'autobyteus-server'
$Script:DefaultNodeName = "$($Script:NodeNamePrefix)-0"
$Script:DefaultImage = 'autobyteus/autobyteus-server'
$Script:DefaultTag = 'latest'
$Script:MaxRunAttempts = 5
$Script:WorkspaceContainerPath = '/home/autobyteus/workspace'
$Script:SharedContainerPath = '/home/autobyteus/shared'
$Script:TempWorkspaceEnvValue = $Script:WorkspaceContainerPath
$Script:ChromiumProfileContainerPath = '/home/vncuser/.config/chromium'

function Show-AutoByteusDockerHelp {
@"
AutoByteus Docker node launcher

Usage:
  autobyteus-docker <command> [options]
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker install"

Commands:
  install            Install or replace the local autobyteus-docker CLI
  new-container      Create a new Docker node with automatic indexed name and ports
  upgrade --all      Upgrade all managed Docker nodes using their saved image refs
  destroy --all      Remove all managed Docker nodes, keeping named volumes
  reset              Destroy all managed Docker nodes, then create autobyteus-server-0
  workspace paths    Show host/container paths for node and shared workspaces
  workspace apply    Recreate node(s) to apply shared workspace bind mounts safely
  storage            Show named volumes and host bind mounts for node(s)
  urls | ports       Show Backend, GraphQL, noVNC, VNC, and debug URLs
  status | ps        Show managed Docker nodes
  logs               Show Docker logs for a managed node
  stop [--all]       Stop one or all managed Docker nodes
  help               Show this help

Advanced temporary use: powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker <command> [options]"

Options:
  --name <name>      Friendly node name for status/logs/urls/stop (default: $Script:DefaultNodeName)
  --tag <tag>        Docker image tag (default: $Script:DefaultTag; explicit upgrade --all retargets all nodes)
  --image <image>    Docker image repository or full image ref (default: $Script:DefaultImage; explicit upgrade --all retargets all nodes)
  --all              Required for upgrade/destroy; also applies stop/status/workspace/storage to all managed nodes
  -h, --help         Show this help

State:
  AUTOBYTEUS_DOCKER_INSTALL_DIR overrides the install directory.
  Default install directory: %LOCALAPPDATA%\AutoByteus\bin
  AUTOBYTEUS_DOCKER_STATE_DIR overrides the state directory.
  Default state directory: %LOCALAPPDATA%\AutoByteus\docker-server
  AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR overrides the shared workspace root.
  Default shared workspace: %LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace
"@
}

function Write-LauncherInfo([string]$Message) { Write-Host "[AutoByteus Docker] $Message" }
function Fail-Launcher([string]$Message) { throw "error: $Message" }
function Get-NowUtc { (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }

function Get-StateRoot {
  if ($env:AUTOBYTEUS_DOCKER_STATE_DIR) { return $env:AUTOBYTEUS_DOCKER_STATE_DIR }
  $localAppData = $env:LOCALAPPDATA
  if (-not $localAppData) { $localAppData = Join-Path $HOME 'AppData\Local' }
  Join-Path $localAppData 'AutoByteus\docker-server'
}

function Get-StateDir { Join-Path (Get-StateRoot) 'nodes' }
function Ensure-StateDir { New-Item -ItemType Directory -Force -Path (Get-StateDir) | Out-Null }

function Get-SharedWorkspaceRoot {
  if ($env:AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR) { return $env:AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR }
  Join-Path (Get-StateRoot) 'shared-workspace'
}

function Get-NodeWorkspaceHostPath([string]$NodeName) {
  Join-Path (Join-Path (Get-SharedWorkspaceRoot) 'nodes') (Normalize-NodeName $NodeName)
}

function Get-SharedWorkspaceHostPath {
  Join-Path (Get-SharedWorkspaceRoot) 'shared'
}

function Ensure-SharedWorkspaceDirs([string]$NodeName) {
  New-Item -ItemType Directory -Force -Path (Get-NodeWorkspaceHostPath $NodeName) | Out-Null
  New-Item -ItemType Directory -Force -Path (Get-SharedWorkspaceHostPath) | Out-Null
}


function Normalize-NodeName([string]$Raw) {
  if ([string]::IsNullOrWhiteSpace($Raw)) { $Raw = $Script:DefaultNodeName }
  $normalized = $Raw.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
  $normalized = $normalized.Trim('-')
  if ([string]::IsNullOrWhiteSpace($normalized)) { return $Script:DefaultNodeName }
  $normalized
}

function Get-StatePath([string]$NodeName) {
  Join-Path (Get-StateDir) "$(Normalize-NodeName $NodeName).json"
}

function Read-NodeState([string]$NodeName) {
  $path = Get-StatePath $NodeName
  if (-not (Test-Path $path)) { return $null }
  Get-Content -Raw -Path $path | ConvertFrom-Json
}

function Save-NodeState($State) {
  $path = Get-StatePath $State.nodeName
  $State.updatedAt = Get-NowUtc
  [pscustomobject][ordered]@{
    nodeName = $State.nodeName
    containerName = $State.containerName
    backendPort = [int]$State.backendPort
    vncPort = [int]$State.vncPort
    noVncPort = [int]$State.noVncPort
    debugPort = [int]$State.debugPort
    imageRef = $State.imageRef
    configHash = $State.configHash
    createdAt = $State.createdAt
    updatedAt = $State.updatedAt
  } | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -Path $path
}

function Assert-Docker {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCommand) { Fail-Launcher 'Docker CLI was not found. Install Docker Desktop/Engine, then rerun this command.' }
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) { Fail-Launcher 'Docker is not reachable. Start Docker Desktop/Engine, then rerun this command.' }
}

function Get-ImageRef([string]$Image, [string]$Tag) {
  $leaf = Split-Path -Leaf $Image
  if ($Image.Contains('@') -or $leaf.Contains(':')) { return $Image }
  "$Image`:$Tag"
}

function Get-StringSha256([string]$Value) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { ($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Value)) | ForEach-Object { $_.ToString('x2') }) -join '' } finally { $sha.Dispose() }
}
