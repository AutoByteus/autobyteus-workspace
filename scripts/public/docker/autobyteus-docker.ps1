param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$LauncherArgs
)

$ErrorActionPreference = 'Stop'
$Script:LauncherLabelKey = 'com.autobyteus.launcher'
$Script:LauncherLabelValue = 'server-docker'
$Script:NodeLabelKey = 'com.autobyteus.nodeName'
$Script:ConfigLabelKey = 'com.autobyteus.configHash'
$Script:ConfigHashVersion = 'v1'
$Script:DefaultNodeName = 'autobyteus-server'
$Script:DefaultImage = 'autobyteus/autobyteus-server'
$Script:DefaultTag = 'latest'
$Script:MaxRunAttempts = 5
$Script:PublicPowerShellScriptUrl = 'https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.ps1'

function Show-AutoByteusDockerHelp {
@"
AutoByteus Docker node launcher

Usage:
  autobyteus-docker <command> [options]
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker install"

Commands:
  install            Install or update the local autobyteus-docker CLI
  update             Alias for install
  start              Check image updates and start the default Docker node
  start --new        Start a new Docker node with automatic name and ports
  urls | ports       Show Backend, GraphQL, noVNC, VNC, and debug URLs
  status | ps        Show managed Docker nodes
  logs               Show Docker logs for a managed node
  stop [--all]       Stop one or all managed Docker nodes
  help               Show this help

Advanced temporary use: powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker <command> [options]"

Options:
  --name <name>      Friendly node name (default: $Script:DefaultNodeName)
  --tag <tag>        Docker image tag (default: $Script:DefaultTag)
  --image <image>    Docker image repository or full image ref (default: $Script:DefaultImage)
  --new              Create the next available friendly node name
  --all              Apply stop/status to all managed nodes
  -h, --help         Show this help

State:
  AUTOBYTEUS_DOCKER_INSTALL_DIR overrides the install directory.
  Default install directory: %LOCALAPPDATA%\AutoByteus\bin
  AUTOBYTEUS_DOCKER_STATE_DIR overrides the state directory.
  Default state directory: %LOCALAPPDATA%\AutoByteus\docker-server
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

function Get-InstallDir {
  if ($env:AUTOBYTEUS_DOCKER_INSTALL_DIR) { return $env:AUTOBYTEUS_DOCKER_INSTALL_DIR }
  $localAppData = $env:LOCALAPPDATA
  if (-not $localAppData) { $localAppData = Join-Path $HOME 'AppData\Local' }
  Join-Path $localAppData 'AutoByteus\bin'
}

function Get-InstallSourceUrl {
  if ($env:AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL) { return $env:AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL }
  $Script:PublicPowerShellScriptUrl
}

function Test-DirectoryOnPath([string]$Directory) {
  $separator = [System.IO.Path]::PathSeparator
  $entries = @($env:PATH -split [regex]::Escape([string]$separator)) | Where-Object { $_ }
  $entries | Where-Object { $_.TrimEnd('\') -ieq $Directory.TrimEnd('\') } | Select-Object -First 1
}

function Install-Launcher {
  $installDir = Get-InstallDir
  $ps1Path = Join-Path $installDir 'autobyteus-docker.ps1'
  $cmdPath = Join-Path $installDir 'autobyteus-docker.cmd'
  $sourceUrl = Get-InstallSourceUrl

  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  Invoke-WebRequest -UseBasicParsing -Uri $sourceUrl -OutFile $ps1Path
  $shim = "@echo off`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0autobyteus-docker.ps1`" %*`r`n"
  Set-Content -Encoding ASCII -Path $cmdPath -Value $shim

  Write-LauncherInfo "Installed AutoByteus Docker launcher: $ps1Path"
  Write-Host "Command shim: $cmdPath"
  Write-Host "Next commands:`n  autobyteus-docker start`n  autobyteus-docker start --new`n  autobyteus-docker urls"
  if (Test-DirectoryOnPath $installDir) { Write-LauncherInfo 'Install directory is already on PATH.'; return }
  Write-Host "PATH guidance:`n  This shell cannot find 'autobyteus-docker' until $installDir is on User PATH.`n  Use direct path now:`n    powershell -NoProfile -ExecutionPolicy Bypass -File `"$ps1Path`" start`n  To add this directory to your User PATH without admin rights, run:`n    [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';$installDir', 'User')`n  Then open a new PowerShell window."
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
  $State | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -Path $path
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
  if (Test-NodeNameAvailable $Script:DefaultNodeName) { return $Script:DefaultNodeName }
  $index = 2
  while ($true) {
    $candidate = "$Script:DefaultNodeName-$index"
    if (Test-NodeNameAvailable $candidate) { return $candidate }
    $index += 1
  }
}

function Print-Urls($State) {
@"
AutoByteus Docker node: $($State.nodeName)
Container: $($State.containerName)
Image: $($State.imageRef)
Backend: http://localhost:$($State.backendPort)
GraphQL: http://localhost:$($State.backendPort)/graphql
noVNC: http://localhost:$($State.noVncPort)
VNC: localhost:$($State.vncPort)
Chrome debug: localhost:$($State.debugPort)
Next step: paste Backend into Add Remote Node in AutoByteus.
"@ | Write-Host
}

function Set-StateProperty($State, [string]$Name, $Value) {
  if ($State.PSObject.Properties[$Name]) { $State.$Name = $Value; return }
  $State | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
}

function Get-StateConfigHash($State) {
  $volumePrefix = Normalize-NodeName $State.nodeName
  $text = @("version=$Script:ConfigHashVersion", "node=$($State.nodeName)", "image=$($State.imageRef)", "backend=$($State.backendPort)", "vnc=$($State.vncPort)", "novnc=$($State.noVncPort)", "debug=$($State.debugPort)", "workspace_volume=$volumePrefix-workspace", "data_volume=$volumePrefix-data", "root_volume=$volumePrefix-root-home", "server_host=http://localhost:$($State.backendPort)", "vnc_hosts=localhost:$($State.noVncPort)") -join "`n"
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { ($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($text)) | ForEach-Object { $_.ToString('x2') }) -join '' } finally { $sha.Dispose() }
}

function Test-StateHasPorts($State) { $State -and $State.backendPort -and $State.vncPort -and $State.noVncPort -and $State.debugPort }

function New-NodeState([string]$NodeName, [string]$ContainerName, [string]$ImageRef, $Ports, [string]$CreatedAt) {
  [pscustomobject]@{ nodeName = $NodeName; containerName = $ContainerName; backendPort = [int]$Ports.backend; vncPort = [int]$Ports.vnc; noVncPort = [int]$Ports.noVnc; debugPort = [int]$Ports.debug; imageRef = $ImageRef; configHash = ''; createdAt = $CreatedAt; updatedAt = Get-NowUtc }
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
    $outputFile = [System.IO.Path]::GetTempFileName()
    try {
      & docker run -d `
        --name $state.containerName `
        --restart unless-stopped `
        --cap-add SYS_ADMIN `
        --security-opt seccomp=unconfined `
        --label "$Script:LauncherLabelKey=$Script:LauncherLabelValue" `
        --label "$Script:NodeLabelKey=$($state.nodeName)" `
        --label "$Script:ConfigLabelKey=$($state.configHash)" `
        -p "$($state.backendPort):8000" `
        -p "$($state.vncPort):5900" `
        -p "$($state.noVncPort):6080" `
        -p "$($state.debugPort):9223" `
        -e AUTOBYTEUS_WORKSPACE_ROOT=/app `
        -e AUTOBYTEUS_DATA_DIR=/home/autobyteus/data `
        -e AUTOBYTEUS_BIND_HOST=0.0.0.0 `
        -e AUTOBYTEUS_SERVER_PORT=8000 `
        -e "AUTOBYTEUS_SERVER_HOST=http://localhost:$($state.backendPort)" `
        -e "AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:$($state.noVncPort)" `
        -e APP_ENV=production `
        -e DB_TYPE=sqlite `
        -e LOG_LEVEL=INFO `
        -e AUTOBYTEUS_SKIP_SYNC=1 `
        -v "$(Normalize-NodeName $state.nodeName)-workspace:/app/autobyteus-server-ts/workspace" `
        -v "$(Normalize-NodeName $state.nodeName)-data:/home/autobyteus/data" `
        -v "$(Normalize-NodeName $state.nodeName)-root-home:/root" `
        $state.imageRef *> $outputFile
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

function Show-Urls([string]$NodeName) {
  $state = Read-NodeState $NodeName
  if (-not $state) { Fail-Launcher "No launcher state found for $NodeName. Run start first." }
  Print-Urls $state
}

function Show-Status([string]$FilterName) {
  '{0,-24} {1,-24} {2,-14} {3}' -f 'NODE', 'CONTAINER', 'STATUS', 'BACKEND' | Write-Host
  $any = $false
  if (Test-Path (Get-StateDir)) {
    Get-ChildItem -Path (Get-StateDir) -Filter '*.json' | ForEach-Object {
      $state = Get-Content -Raw -Path $_.FullName | ConvertFrom-Json
      if ($FilterName -and $state.nodeName -ne $FilterName) { return }
      $status = 'missing'
      if (Test-ContainerExists $state.containerName) {
        $status = & docker inspect --format '{{.State.Status}}' $state.containerName 2>$null
      }
      '{0,-24} {1,-24} {2,-14} http://localhost:{3} ({4})' -f $state.nodeName, $state.containerName, $status, $state.backendPort, $state.imageRef | Write-Host
      $any = $true
    }
  }
  if (-not $any) { Write-LauncherInfo 'No managed Docker nodes found.' }
}

function Stop-Nodes([string]$FilterName, [bool]$StopAll) {
  $any = $false
  if (Test-Path (Get-StateDir)) {
    Get-ChildItem -Path (Get-StateDir) -Filter '*.json' | ForEach-Object {
      $state = Get-Content -Raw -Path $_.FullName | ConvertFrom-Json
      if (-not $StopAll -and $state.nodeName -ne $FilterName) { return }
      if (Test-ContainerExists $state.containerName) {
        & docker stop $state.containerName | Out-Null
        Write-LauncherInfo "Stopped $($state.nodeName). Named volumes were kept."
        $any = $true
      }
    }
  }
  if (-not $any) { Fail-Launcher 'No matching managed Docker node was found.' }
}

function Show-Logs([string]$NodeName, [string[]]$ExtraArgs) {
  $state = Read-NodeState $NodeName
  if (-not $state) { Fail-Launcher "No launcher state found for $NodeName." }
  if (-not (Test-ContainerExists $state.containerName)) { Fail-Launcher "Container $($state.containerName) was not found." }
  if ($ExtraArgs.Count -eq 0) { & docker logs --tail 100 $state.containerName; return }
  & docker logs @ExtraArgs $state.containerName
}

function Resolve-TargetName([string]$ExplicitName, [bool]$CreateNew) {
  if ($ExplicitName) { return Normalize-NodeName $ExplicitName }
  if ($CreateNew) { return Get-NextNodeName }
  $Script:DefaultNodeName
}

function Invoke-AutoByteusDocker {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CommandArgs)
  $cmd = if ($CommandArgs.Count -gt 0) { $CommandArgs[0] } else { 'help' }
  if ($cmd -in @('help', '-h', '--help')) { Show-AutoByteusDockerHelp; return }

  $createNew = $false; $stopAll = $false; $nameArg = ''; $tag = $Script:DefaultTag; $image = $Script:DefaultImage; $extra = @()
  for ($i = 1; $i -lt $CommandArgs.Count; $i += 1) {
    switch ($CommandArgs[$i]) {
      '--new' { $createNew = $true }
      '--all' { $stopAll = $true }
      '--name' { $i += 1; if ($i -ge $CommandArgs.Count) { Fail-Launcher '--name requires a value' }; $nameArg = $CommandArgs[$i] }
      '--tag' { $i += 1; if ($i -ge $CommandArgs.Count) { Fail-Launcher '--tag requires a value' }; $tag = $CommandArgs[$i] }
      '--image' { $i += 1; if ($i -ge $CommandArgs.Count) { Fail-Launcher '--image requires a value' }; $image = $CommandArgs[$i] }
      { $_ -in @('-h', '--help') } { Show-AutoByteusDockerHelp; return }
      default {
        if (-not $nameArg -and $cmd -in @('urls', 'ports', 'status', 'ps', 'stop', 'logs')) { $nameArg = $CommandArgs[$i] }
        else { $extra += $CommandArgs[$i] }
      }
    }
  }

  switch ($cmd) {
    { $_ -in @('install', 'update') } {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown $cmd option(s): $($extra -join ' ')" }
      Install-Launcher
      return
    }
  }

  Ensure-StateDir
  Assert-Docker
  $nodeName = Resolve-TargetName $nameArg $createNew
  $imageRef = Get-ImageRef $image $tag

  switch ($cmd) {
    'start' {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown start option(s): $($extra -join ' ')" }
      $preferDefaults = $nodeName -eq $Script:DefaultNodeName -and -not $createNew -and -not $nameArg
      Start-Node $nodeName $imageRef $preferDefaults
    }
    { $_ -in @('urls', 'ports') } { Show-Urls $nodeName }
    { $_ -in @('status', 'ps') } { Show-Status $(if ($nameArg) { $nodeName } else { '' }) }
    'stop' { Stop-Nodes $nodeName $stopAll }
    'logs' { Show-Logs $nodeName $extra }
    default { Show-AutoByteusDockerHelp; exit 1 }
  }
}

function autobyteus-docker {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CommandArgs)
  Invoke-AutoByteusDocker @CommandArgs
}

if ($PSCommandPath) {
  Invoke-AutoByteusDocker @LauncherArgs
}
