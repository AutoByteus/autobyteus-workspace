function Assert-Docker {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCommand) { Fail-Launcher 'Docker CLI was not found. Install Docker Desktop/Engine, then rerun this command.' }
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) { Fail-Launcher 'Docker is not reachable. Start Docker Desktop/Engine, then rerun this command.' }
}

function Test-ContainerExists([string]$ContainerName) {
  & docker container inspect $ContainerName *> $null
  $LASTEXITCODE -eq 0
}

function Test-ManagedContainer([string]$ContainerName) {
  $value = & docker inspect --format "{{ index .Config.Labels `"$Script:LauncherLabelKey`" }}" $ContainerName 2>$null
  $LASTEXITCODE -eq 0 -and $value -eq $Script:LauncherLabelValue
}

function Get-ImageId([string]$ImageRef) { $value = & docker image inspect --format '{{.Id}}' $ImageRef 2>$null; if ($LASTEXITCODE -ne 0) { return '' }; [string]$value }
function Get-ContainerImageId([string]$ContainerName) { $value = & docker inspect --format '{{.Image}}' $ContainerName 2>$null; if ($LASTEXITCODE -ne 0) { return '' }; [string]$value }
function Get-ContainerConfigHash([string]$ContainerName) { $value = & docker inspect --format "{{ index .Config.Labels `"$Script:ConfigLabelKey`" }}" $ContainerName 2>$null; if ($LASTEXITCODE -ne 0 -or $value -eq '<no value>') { return '' }; [string]$value }
function Test-ContainerRunning([string]$ContainerName) { $value = & docker inspect --format '{{.State.Running}}' $ContainerName 2>$null; $LASTEXITCODE -eq 0 -and $value -eq 'true' }

function Get-ContainerForNode([string]$NodeName) {
  $containers = & docker ps -a --filter "label=$Script:LauncherLabelKey=$Script:LauncherLabelValue" --filter "label=$Script:NodeLabelKey=$NodeName" --format '{{.Names}}' 2>$null
  if ($containers) { return @($containers)[0] }
  $null
}

function Add-UniqueString($List, $Seen, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  if ($Seen.Add($Value)) { [void]$List.Add($Value) }
}

function Get-ManagedNodeNames {
  $names = [System.Collections.Generic.List[string]]::new()
  $seen = [System.Collections.Generic.HashSet[string]]::new()

  if (Test-Path (Get-StateDir)) {
    Get-ChildItem -Path (Get-StateDir) -Filter '*.json' | ForEach-Object {
      try {
        $state = Get-Content -Raw -Path $_.FullName | ConvertFrom-Json
        $name = if ($state.nodeName) { $state.nodeName } else { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) }
        Add-UniqueString $names $seen $name
      } catch { }
    }
  }

  $containers = & docker ps -a --filter "label=$Script:LauncherLabelKey=$Script:LauncherLabelValue" --format '{{.Names}}' 2>$null
  foreach ($container in @($containers)) {
    if (-not $container) { continue }
    $nodeName = & docker inspect --format "{{ index .Config.Labels `"$Script:NodeLabelKey`" }}" $container 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $nodeName -or $nodeName -eq '<no value>') { $nodeName = $container }
    Add-UniqueString $names $seen ([string]$nodeName)
  }

  $names.ToArray()
}

function Get-ManagedContainerNames {
  $names = [System.Collections.Generic.List[string]]::new()
  $seen = [System.Collections.Generic.HashSet[string]]::new()

  if (Test-Path (Get-StateDir)) {
    Get-ChildItem -Path (Get-StateDir) -Filter '*.json' | ForEach-Object {
      try {
        $state = Get-Content -Raw -Path $_.FullName | ConvertFrom-Json
        $name = if ($state.containerName) { $state.containerName } elseif ($state.nodeName) { $state.nodeName } else { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) }
        Add-UniqueString $names $seen $name
      } catch { }
    }
  }

  $containers = & docker ps -a --filter "label=$Script:LauncherLabelKey=$Script:LauncherLabelValue" --format '{{.Names}}' 2>$null
  foreach ($container in @($containers)) { Add-UniqueString $names $seen ([string]$container) }

  $names.ToArray()
}

function Test-PortAvailable([int]$Port) {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) { $listener.Stop() }
  }
}

function Get-RandomOpenPort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  try {
    $listener.Start()
    return $listener.LocalEndpoint.Port
  } finally {
    $listener.Stop()
  }
}

function Get-UsedPorts {
  $ports = [System.Collections.Generic.HashSet[int]]::new()
  if (Test-Path (Get-StateDir)) {
    Get-ChildItem -Path (Get-StateDir) -Filter '*.json' | ForEach-Object {
      try {
        $state = Get-Content -Raw -Path $_.FullName | ConvertFrom-Json
        foreach ($port in @($state.backendPort, $state.vncPort, $state.noVncPort, $state.debugPort)) {
          if ($port) { [void]$ports.Add([int]$port) }
        }
      } catch { }
    }
  }
  $ports
}

function Pick-Port($UsedPorts, [Nullable[int]]$Preferred) {
  if ($Preferred.HasValue -and -not $UsedPorts.Contains($Preferred.Value) -and (Test-PortAvailable $Preferred.Value)) {
    [void]$UsedPorts.Add($Preferred.Value)
    return $Preferred.Value
  }
  while ($true) {
    $candidate = Get-RandomOpenPort
    if (-not $UsedPorts.Contains($candidate) -and (Test-PortAvailable $candidate)) {
      [void]$UsedPorts.Add($candidate)
      return $candidate
    }
  }
}

function Select-Ports([bool]$PreferDefaults) {
  $used = Get-UsedPorts
  if ($PreferDefaults) {
    return [ordered]@{
      backend = Pick-Port $used 8001
      vnc = Pick-Port $used 5908
      noVnc = Pick-Port $used 6080
      debug = Pick-Port $used 9228
    }
  }
  [ordered]@{
    backend = Pick-Port $used $null
    vnc = Pick-Port $used $null
    noVnc = Pick-Port $used $null
    debug = Pick-Port $used $null
  }
}

function Test-NodeNameAvailable([string]$NodeName) {
  if (Test-Path (Get-StatePath $NodeName)) { return $false }
  if (Get-ContainerForNode $NodeName) { return $false }
  if (Test-ContainerExists $NodeName) { return $false }
  $true
}

function Get-NextNodeName {
  $index = 0
  while ($true) {
    $candidate = "$Script:NodeNamePrefix-$index"
    if (Test-NodeNameAvailable $candidate) { return $candidate }
    $index += 1
  }
}

function Print-Urls($State) {
  $nodeName = [string]$State.nodeName
@"
AutoByteus Docker node: $nodeName
Container: $($State.containerName)
Image: $($State.imageRef)
Backend: http://localhost:$($State.backendPort)
GraphQL: http://localhost:$($State.backendPort)/graphql
noVNC: http://localhost:$($State.noVncPort)
VNC: localhost:$($State.vncPort)
Chrome debug: localhost:$($State.debugPort)
Workspace: $Script:WorkspaceContainerPath -> $(Get-NodeWorkspaceHostPath $nodeName)
Shared folder: $Script:SharedContainerPath -> $(Get-SharedWorkspaceHostPath)
Private app data: /home/autobyteus/data -> $(Normalize-NodeName $nodeName)-data (Docker named volume)
Next step: paste Backend into Add Remote Node in AutoByteus. Then open that node over your trusted private network.
"@ | Write-Host
}

function Write-WorkspacePathsForNode([string]$NodeName) {
@"
AutoByteus Docker workspace paths: $NodeName
Shared workspace host root: $(Get-SharedWorkspaceRoot)
Node workspace host path: $(Get-NodeWorkspaceHostPath $NodeName)
Node workspace container path: $Script:WorkspaceContainerPath
Shared folder host path: $(Get-SharedWorkspaceHostPath)
Shared folder container path: $Script:SharedContainerPath
Default temp workspace env: AUTOBYTEUS_TEMP_WORKSPACE_DIR=$Script:TempWorkspaceEnvValue
"@ | Write-Host
}

function Write-StorageForNode([string]$NodeName) {
  $volumePrefix = Normalize-NodeName $NodeName
@"
AutoByteus Docker storage: $NodeName
Private Docker named volumes (kept during recreate/destroy/reset):
  $volumePrefix-data -> /home/autobyteus/data (private server app state: DB, logs, memory, media, agents, skills)
  $volumePrefix-root-home -> /root (Codex/Claude auth and root home settings)
  $volumePrefix-chromium-profile -> $Script:ChromiumProfileContainerPath (private Chromium browser profile state: cookies, local storage, preferences)
  $volumePrefix-workspace -> /app/autobyteus-server-ts/workspace (existing build/runtime workspace volume)
Host bind mounts (host-visible user files):
  $(Get-NodeWorkspaceHostPath $NodeName) -> $Script:WorkspaceContainerPath (this node's user workspace and default temp workspace)
  $(Get-SharedWorkspaceHostPath) -> $Script:SharedContainerPath (shared across launcher-managed Docker nodes)
Launcher state directory: $(Get-StateRoot)
Note: adding these bind mounts to an existing container requires recreation; workspace apply keeps the named volumes above.
Note: existing /home/autobyteus/data/temp_workspace files remain in the data volume, but the default temp workspace becomes $Script:WorkspaceContainerPath after apply.
"@ | Write-Host
}

function Set-StateProperty($State, [string]$Name, $Value) {
  if ($State.PSObject.Properties[$Name]) { $State.$Name = $Value; return }
  $State | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
}

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

function Test-StateHasPorts($State) { $State -and $State.backendPort -and $State.vncPort -and $State.noVncPort -and $State.debugPort }

function New-NodeState([string]$NodeName, [string]$ContainerName, [string]$ImageRef, $Ports, [string]$CreatedAt) {
  $state = [pscustomobject]@{ nodeName = $NodeName; containerName = $ContainerName; backendPort = [int]$Ports.backend; vncPort = [int]$Ports.vnc; noVncPort = [int]$Ports.noVnc; debugPort = [int]$Ports.debug; imageRef = $ImageRef; configHash = ''; createdAt = $CreatedAt; updatedAt = Get-NowUtc }
  $state
}

function Test-BindFailure([string]$Output) {
  $Output -match 'port is already allocated|bind: address already in use|Ports are not available|address already in use|Bind for'
}

function Get-ContainerStartFailure([string]$ContainerName) {
  $state = $null
  for ($attempt = 1; $attempt -le 5; $attempt += 1) {
    $inspectOutput = & docker inspect --format '{{json .State}}' $ContainerName 2>&1
    if ($LASTEXITCODE -ne 0) {
      return "docker inspect failed for $ContainerName`: $inspectOutput"
    }

    try {
      $state = $inspectOutput | ConvertFrom-Json
    } catch {
      return "docker inspect returned invalid state for $ContainerName`: $inspectOutput"
    }

    if ($state.Running -eq $true) {
      return ''
    }

    if ($state.Error -or $state.Status -in @('exited', 'dead')) {
      break
    }

    Start-Sleep -Seconds 1
  }

  if (-not $state) {
    return "container $ContainerName did not return Docker state"
  }

  "container $ContainerName did not reach running state (status=$($state.Status) running=$($state.Running) exitCode=$($state.ExitCode) error=$($state.Error))"
}

function Start-Node([string]$NodeName, [string]$ImageRef, [bool]$PreferDefaults) {
  $existingState = Read-NodeState $NodeName
  $containerName = if ($existingState) { $existingState.containerName } else { $NodeName }
  $createdAt = if ($existingState) { $existingState.createdAt } else { Get-NowUtc }

  if ((Test-ContainerExists $containerName) -and -not (Test-ManagedContainer $containerName)) {
    Fail-Launcher "Container $containerName already exists and is not managed by this launcher. Use --name with another friendly name."
  }

  Write-LauncherInfo "Checking image $ImageRef"
  & docker pull $ImageRef
  if ($LASTEXITCODE -ne 0) { Fail-Launcher "docker pull failed for $ImageRef" }
  $desiredImageId = Get-ImageId $ImageRef
  if (-not $desiredImageId) { Fail-Launcher "Could not inspect image $ImageRef after pull." }

  $state = $existingState
  if ($state) {
    $state.imageRef = $ImageRef
    Set-StateProperty $state 'configHash' (Get-StateConfigHash $state)
  }

  if ((Test-ContainerExists $containerName) -and (Test-StateHasPorts $state)) {
    $currentImageId = Get-ContainerImageId $containerName
    $currentConfigHash = Get-ContainerConfigHash $containerName

    if ($currentImageId -eq $desiredImageId -and $currentConfigHash -eq $state.configHash) {
      if (Test-ContainerRunning $containerName) {
        Save-NodeState $state
        Write-LauncherInfo "$NodeName is already running with the current image and launcher config."
        Print-Urls $state
        return
      }

      $startOutput = & docker start $containerName 2>&1
      if ($LASTEXITCODE -eq 0) {
        $startFailure = Get-ContainerStartFailure $containerName
        if (-not $startFailure) {
          Save-NodeState $state
          Write-LauncherInfo "Started $NodeName."
          Print-Urls $state
          return
        }
        $startOutput = "$startOutput`n$startFailure"
      }

      if (Test-BindFailure ([string]$startOutput)) {
        Write-LauncherInfo "Saved ports are unavailable; recreating $NodeName with fresh ports."
        & docker rm -f $containerName *> $null
        $state = $null
      } else {
        Fail-Launcher "docker start failed: $startOutput"
      }
    } elseif ($currentImageId -ne $desiredImageId) {
      Write-LauncherInfo "Image changed for $NodeName; recreating the managed container while keeping named volumes."
    } elseif (-not $currentConfigHash) {
      Write-LauncherInfo "Refreshing $NodeName; existing container predates launcher config tracking."
    } else {
      Write-LauncherInfo "Launcher config changed for $NodeName; recreating the managed container while keeping named volumes."
    }
  }

  for ($attempt = 1; $attempt -le $Script:MaxRunAttempts; $attempt += 1) {
    if ($attempt -gt 1 -or -not $state) {
      $ports = Select-Ports $PreferDefaults
      $PreferDefaults = $false
      $state = New-NodeState $NodeName $containerName $ImageRef $ports $createdAt
    } else {
      $state.imageRef = $ImageRef
    }
    Set-StateProperty $state 'configHash' (Get-StateConfigHash $state)

    if (Test-ContainerExists $containerName) { & docker rm -f $containerName *> $null }
    $stateNodeName = [string]$state.nodeName
    Ensure-SharedWorkspaceDirs $stateNodeName
    $nodeWorkspaceHost = Get-NodeWorkspaceHostPath $stateNodeName
    $sharedWorkspaceHost = Get-SharedWorkspaceHostPath
    $outputFile = [System.IO.Path]::GetTempFileName()
    try {
      $runArgs = @(
        'run', '-d',
        '--name', $state.containerName,
        '--restart', 'unless-stopped',
        '--label', "$Script:LauncherLabelKey=$Script:LauncherLabelValue",
        '--label', "$Script:NodeLabelKey=$($state.nodeName)",
        '--label', "$Script:ConfigLabelKey=$($state.configHash)",
        '-e', 'AUTOBYTEUS_WORKSPACE_ROOT=/app',
        '-e', 'AUTOBYTEUS_DATA_DIR=/home/autobyteus/data',
        '-e', 'AUTOBYTEUS_BIND_HOST=0.0.0.0',
        '-e', 'AUTOBYTEUS_SERVER_PORT=8000',
        '-e', "AUTOBYTEUS_SERVER_HOST=http://localhost:$($state.backendPort)",
        '-e', "AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:$($state.noVncPort)",
        '-e', 'APP_ENV=production',
        '-e', 'DB_TYPE=sqlite',
        '-e', 'LOG_LEVEL=INFO',
        '-e', 'AUTOBYTEUS_SKIP_SYNC=1',
        '-e', "AUTOBYTEUS_TEMP_WORKSPACE_DIR=$Script:TempWorkspaceEnvValue",
        '-v', "$(Normalize-NodeName $stateNodeName)-workspace:/app/autobyteus-server-ts/workspace",
        '-v', "$(Normalize-NodeName $stateNodeName)-data:/home/autobyteus/data",
        '-v', "$(Normalize-NodeName $stateNodeName)-root-home:/root",
        '-v', "$(Normalize-NodeName $stateNodeName)-chromium-profile:$Script:ChromiumProfileContainerPath",
        '--cap-add', 'SYS_ADMIN',
        '--security-opt', 'seccomp=unconfined',
        '-p', "$($state.backendPort):8000",
        '-p', "$($state.vncPort):5900",
        '-p', "$($state.noVncPort):6080",
        '-p', "$($state.debugPort):9223",
        '--mount', "type=bind,source=$nodeWorkspaceHost,target=$Script:WorkspaceContainerPath",
        '--mount', "type=bind,source=$sharedWorkspaceHost,target=$Script:SharedContainerPath"
      )
      $runArgs += $state.imageRef
      & docker @runArgs *> $outputFile
      $exitCode = $LASTEXITCODE
      $output = Get-Content -Raw -Path $outputFile
    } finally {
      Remove-Item -Force -ErrorAction SilentlyContinue $outputFile
    }

    if ($exitCode -eq 0) {
      $startFailure = Get-ContainerStartFailure $containerName
      if (-not $startFailure) {
        Save-NodeState $state
        Write-LauncherInfo "Started $NodeName."
        Print-Urls $state
        return
      }
      $output = "$output`n$startFailure"
    }

    if (Test-ContainerExists $containerName) { & docker rm -f $containerName *> $null }
    if ((Test-BindFailure $output) -and $attempt -lt $Script:MaxRunAttempts) {
      Write-LauncherInfo "Port bind failed; retrying with fresh ports (attempt $($attempt + 1)/$Script:MaxRunAttempts)."
      $state = $null
      continue
    }
    Fail-Launcher "docker run failed: $output"
  }
}

function Test-ImageIdInUse([string]$ImageId) {
  if ([string]::IsNullOrWhiteSpace($ImageId)) { return $false }
  $containers = & docker ps -a --format '{{.Names}}' 2>$null
  foreach ($container in @($containers)) {
    if (-not $container) { continue }
    if ((Get-ContainerImageId $container) -eq $ImageId) { return $true }
  }
  $false
}

function Remove-UnusedImageIds([string[]]$ImageIds) {
  $seen = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($imageId in @($ImageIds)) {
    if ([string]::IsNullOrWhiteSpace($imageId)) { continue }
    if (-not $seen.Add($imageId)) { continue }
    if (Test-ImageIdInUse $imageId) {
      Write-LauncherInfo "Keeping image $imageId; it is still used by a Docker container."
      continue
    }
    & docker image inspect $imageId *> $null
    if ($LASTEXITCODE -ne 0) { continue }
    & docker image rm $imageId *> $null
    if ($LASTEXITCODE -eq 0) { Write-LauncherInfo "Removed unused AutoByteus server image $imageId." }
  }
}

function Get-ManagedContainerImageIds {
  $ids = [System.Collections.Generic.List[string]]::new()
  foreach ($container in @(Get-ManagedContainerNames)) {
    if (-not $container) { continue }
    if (-not (Test-ContainerExists $container)) { continue }
    $imageId = Get-ContainerImageId $container
    if ($imageId) { [void]$ids.Add($imageId) }
  }
  $ids.ToArray()
}

function Remove-AllStateFiles {
  if (-not (Test-Path (Get-StateDir))) { return }
  Get-ChildItem -Path (Get-StateDir) -Filter '*.json' | Remove-Item -Force -ErrorAction SilentlyContinue
}

function Destroy-AllNodes {
  $imageIds = @(Get-ManagedContainerImageIds)
  $any = $false
  foreach ($container in @(Get-ManagedContainerNames)) {
    if (-not $container) { continue }
    if (Test-ContainerExists $container) {
      & docker rm -f $container *> $null
      Write-LauncherInfo "Removed managed container $container. Named volumes were kept."
      $any = $true
    }
  }
  Remove-AllStateFiles
  if (-not $any) { Write-LauncherInfo 'No managed Docker containers were found.' }
  Remove-UnusedImageIds $imageIds
}

function Get-UpgradeImageRefForNode([string]$NodeName, [string]$OverrideImageRef, [bool]$HasImageRefOverride) {
  if ($HasImageRefOverride) { return $OverrideImageRef }
  $state = Read-NodeState $NodeName
  if ($state -and $state.imageRef) { return $state.imageRef }
  Get-ImageRef $Script:DefaultImage $Script:DefaultTag
}

function Upgrade-AllNodes([string]$ImageRef, [bool]$HasImageRefOverride) {
  $nodes = @(Get-ManagedNodeNames)
  if ($nodes.Count -eq 0) { Write-LauncherInfo 'No managed Docker nodes found.'; return }
  $imageIds = @(Get-ManagedContainerImageIds)
  foreach ($node in $nodes) {
    $preferDefaults = $node -eq $Script:DefaultNodeName
    $targetImageRef = Get-UpgradeImageRefForNode $node $ImageRef $HasImageRefOverride
    Start-Node $node $targetImageRef $preferDefaults
  }
  Remove-UnusedImageIds $imageIds
}

function New-Container([string]$ImageRef) {
  $nodeName = Get-NextNodeName
  $preferDefaults = $nodeName -eq $Script:DefaultNodeName
  Start-Node $nodeName $ImageRef $preferDefaults
}

function Reset-Nodes([string]$ImageRef) {
  Destroy-AllNodes
  Start-Node $Script:DefaultNodeName $ImageRef $true
}
