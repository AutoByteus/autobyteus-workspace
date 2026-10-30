# Launcher desired container configuration: the config hash, the docker run arguments and the
# storage text, which all name the same volumes and mounts.
function Get-StateConfigHash($State) {
  $nodeName = [string]$State.nodeName
  $volumePrefix = Normalize-NodeName $nodeName
  $text = @(
    "version=$Script:ConfigHashVersion",
    "node=$nodeName",
    "image=$($State.imageRef)",
    "backend=$($State.backendPort)",
    "vnc=$($State.vncPort)",
    "novnc=$($State.noVncPort)",
    "debug=$($State.debugPort)",
    "workspace_volume=$volumePrefix-workspace",
    "data_volume=$volumePrefix-data",
    "root_volume=$volumePrefix-root-home",
    "chromium_profile_volume=$volumePrefix-chromium-profile",
    "chromium_profile_target=$Script:ChromiumProfileContainerPath",
    "server_packages_volume=$volumePrefix-server-packages",
    "server_packages_target=$Script:ServerPackagesContainerPath",
    "shared_workspace_root=$(Get-SharedWorkspaceRoot)",
    "node_workspace_host=$(Get-NodeWorkspaceHostPath $nodeName)",
    "node_workspace_target=$Script:WorkspaceContainerPath",
    "shared_workspace_host=$(Get-SharedWorkspaceHostPath)",
    "shared_workspace_target=$Script:SharedContainerPath",
    "temp_workspace_env=AUTOBYTEUS_TEMP_WORKSPACE_DIR=$Script:TempWorkspaceEnvValue",
    "server_host=http://localhost:$($State.backendPort)",
    "vnc_hosts=localhost:$($State.noVncPort)"
  ) -join "`n"
  Get-StringSha256 $text
}

function Get-ContainerRunArgs($State, [string]$NodeWorkspaceHost, [string]$SharedWorkspaceHost) {
  $nodeName = [string]$State.nodeName
  @(
    'run', '-d',
    '--name', $State.containerName,
    '--restart', 'unless-stopped',
    '--label', "$Script:LauncherLabelKey=$Script:LauncherLabelValue",
    '--label', "$Script:NodeLabelKey=$($State.nodeName)",
    '--label', "$Script:ConfigLabelKey=$($State.configHash)",
    '-e', 'AUTOBYTEUS_DATA_DIR=/home/autobyteus/data',
    '-e', 'AUTOBYTEUS_BIND_HOST=0.0.0.0',
    '-e', 'AUTOBYTEUS_SERVER_PORT=8000',
    '-e', "AUTOBYTEUS_SERVER_HOST=http://localhost:$($State.backendPort)",
    '-e', "AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:$($State.noVncPort)",
    '-e', 'APP_ENV=production',
    '-e', 'DB_TYPE=sqlite',
    '-e', 'LOG_LEVEL=INFO',
    '-e', "AUTOBYTEUS_TEMP_WORKSPACE_DIR=$Script:TempWorkspaceEnvValue",
    '-v', "$(Normalize-NodeName $nodeName)-workspace:/app/autobyteus-server-ts/workspace",
    '-v', "$(Normalize-NodeName $nodeName)-data:/home/autobyteus/data",
    '-v', "$(Normalize-NodeName $nodeName)-root-home:/root",
    '-v', "$(Normalize-NodeName $nodeName)-chromium-profile:$Script:ChromiumProfileContainerPath",
    '-v', "$(Normalize-NodeName $nodeName)-server-packages:$Script:ServerPackagesContainerPath",
    '--cap-add', 'SYS_ADMIN',
    '--security-opt', 'seccomp=unconfined',
    '-p', "$($State.backendPort):8000",
    '-p', "$($State.vncPort):5900",
    '-p', "$($State.noVncPort):6080",
    '-p', "$($State.debugPort):9223",
    '--mount', "type=bind,source=$NodeWorkspaceHost,target=$Script:WorkspaceContainerPath",
    '--mount', "type=bind,source=$SharedWorkspaceHost,target=$Script:SharedContainerPath"
  )
}

function Write-StorageForNode([string]$NodeName) {
  $volumePrefix = Normalize-NodeName $NodeName
@"
AutoByteus Docker storage: $NodeName
Private Docker named volumes (kept during recreate/destroy/reset):
  $volumePrefix-data -> /home/autobyteus/data (private server app state: DB, logs, memory, media, agents, skills)
  $volumePrefix-root-home -> /root (Codex/Claude auth and root home settings)
  $volumePrefix-chromium-profile -> $Script:ChromiumProfileContainerPath (private Chromium browser profile state: cookies, local storage, preferences)
  $volumePrefix-server-packages -> $Script:ServerPackagesContainerPath (server packages the node installed in place, and the starter's update state)
  $volumePrefix-workspace -> /app/autobyteus-server-ts/workspace (existing build/runtime workspace volume)
Host bind mounts (host-visible user files):
  $(Get-NodeWorkspaceHostPath $NodeName) -> $Script:WorkspaceContainerPath (this node's user workspace and default temp workspace)
  $(Get-SharedWorkspaceHostPath) -> $Script:SharedContainerPath (shared across launcher-managed Docker nodes)
Launcher state directory: $(Get-StateRoot)
Note: adding these bind mounts to an existing container requires recreation; workspace apply keeps the named volumes above.
Note: existing /home/autobyteus/data/temp_workspace files remain in the data volume, but the default temp workspace becomes $Script:WorkspaceContainerPath after apply.
"@ | Write-Host
}
