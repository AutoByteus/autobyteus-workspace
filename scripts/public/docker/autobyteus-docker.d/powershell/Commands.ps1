function Get-ImageRefForNodeOrDefault([string]$NodeName, [string]$FallbackImageRef) {
  $state = Read-NodeState $NodeName
  if ($state -and $state.imageRef) { return $state.imageRef }
  $FallbackImageRef
}

function Test-NodeKnownForApply([string]$NodeName) {
  if (Test-Path (Get-StatePath $NodeName)) { return $true }
  if (Get-ContainerForNode $NodeName) { return $true }
  if ((Test-ContainerExists $NodeName) -and (Test-ManagedContainer $NodeName)) { return $true }
  $false
}

function Show-WorkspacePaths([string]$FilterName, [bool]$ShowAll) {
  if ($ShowAll) {
    $nodes = @(Get-ManagedNodeNames)
    if ($nodes.Count -eq 0) { Write-LauncherInfo 'No managed Docker nodes found.'; return }
    $first = $true
    foreach ($node in $nodes) {
      if (-not $first) { Write-Host '' }
      Write-WorkspacePathsForNode $node
      $first = $false
    }
    return
  }
  Write-WorkspacePathsForNode $FilterName
}

function Show-Storage([string]$FilterName, [bool]$ShowAll) {
  if ($ShowAll) {
    $nodes = @(Get-ManagedNodeNames)
    if ($nodes.Count -eq 0) { Write-LauncherInfo 'No managed Docker nodes found.'; return }
    $first = $true
    foreach ($node in $nodes) {
      if (-not $first) { Write-Host '' }
      Write-StorageForNode $node
      $first = $false
    }
    return
  }
  Write-StorageForNode $FilterName
}

function Apply-WorkspaceToNode([string]$NodeName, [string]$FallbackImageRef) {
  if (-not (Test-NodeKnownForApply $NodeName)) {
    Fail-Launcher "No managed Docker node found for $NodeName. Run new-container first, or use workspace apply --all for existing managed nodes."
  }
  $nodeImageRef = Get-ImageRefForNodeOrDefault $NodeName $FallbackImageRef
  $preferDefaults = $NodeName -eq $Script:DefaultNodeName
  Write-LauncherInfo "Applying shared workspace bind mounts to $NodeName. Named volumes will be kept."
  Start-Node $NodeName $nodeImageRef $preferDefaults
}

function Apply-Workspace([string]$FilterName, [bool]$ShowAll, [string]$FallbackImageRef) {
  if ($ShowAll) {
    $nodes = @(Get-ManagedNodeNames)
    if ($nodes.Count -eq 0) { Write-LauncherInfo 'No managed Docker nodes found.'; return }
    foreach ($node in $nodes) { Apply-WorkspaceToNode $node $FallbackImageRef }
    return
  }
  Apply-WorkspaceToNode $FilterName $FallbackImageRef
}

function Show-Urls([string]$NodeName) {
  $state = Read-NodeState $NodeName
  if (-not $state) { Fail-Launcher "No launcher state found for $NodeName. Run new-container first." }
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
      Write-StarterLine $state.containerName ([string]$status)
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

# The node's local control socket answers "setup-code" with a fresh one-time code (node access model NA-5). The
# client runs inside the container (docker exec); the code is printed here only, never written to a file or a log.
$Script:SetupCodeSocket = '/home/autobyteus/data/node-access/local-control.sock'
# Single quotes only: Windows PowerShell drops double quotes inside native command arguments.
$Script:SetupCodeClientJs = 'const s=require(''net'').createConnection(process.argv[1],()=>s.write(''setup-code\n''));s.setTimeout(5000,()=>{console.error(''the node did not answer within 5 seconds'');process.exit(1)});let d='''';s.setEncoding(''utf8'');s.on(''data'',(c)=>{d+=c});s.on(''end'',()=>{let r={};try{r=JSON.parse(d)}catch{}if(!r.setupCode){console.error(r.error||''no setup code'');process.exit(1)}console.log(r.setupCode+'' ''+r.expiresAt)});s.on(''error'',(e)=>{console.error(e.message);process.exit(1)})'
$Script:SetupCodeWaitSeconds = 90

# One attempt is bound by the client's own 5 s socket timeout; the wait itself is bound by wall-clock time, not
# attempt count (one attempt in progress may finish past the deadline). A waiting message prints as soon as the
# first attempt fails, then at least every 10 s with the elapsed time; nothing prints when the first attempt answers.
function Show-SetupCodeOfRunningNode([string]$NodeName) {
  $state = Read-NodeState $NodeName
  $container = if ($state -and $state.containerName) { $state.containerName } else { $NodeName }
  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $lastMessageAt = -1
  while ($true) {
    # Windows PowerShell 5.1 wraps a native command's `2>&1` stderr lines as ErrorRecords, and this launcher's
    # $ErrorActionPreference = 'Stop' then turns a failed attempt's own stderr (the client's or docker exec's)
    # into a terminating error instead of the failure this loop is meant to handle. Turn Stop off only around
    # the call, so a failed attempt's text still reaches $line (the record's [string] is its message) without
    # aborting the wait. PowerShell 7 already tolerates this; the guard is harmless there.
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $answer = & docker exec $container node -e $Script:SetupCodeClientJs $Script:SetupCodeSocket 2>&1
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    $line = ([string](@($answer)[0])).Trim()
    if ($LASTEXITCODE -eq 0 -and $line) {
      $parts = $line.Split(' ', 2)
      $expiresAt = if ($parts.Count -gt 1) { $parts[1] } else { '' }
      Write-Host ''
      Write-Host "Setup code for ${NodeName}: $($parts[0])"
      Write-Host "Valid once, until $expiresAt. In the AutoByteus desktop app, open Nodes, and enter it at $NodeName (http://localhost:$($state.backendPort))."
      return
    }
    $elapsed = [int]$stopwatch.Elapsed.TotalSeconds
    if ($lastMessageAt -eq -1) {
      Write-LauncherInfo "Waiting for $NodeName to start (up to $Script:SetupCodeWaitSeconds seconds)..."
      $lastMessageAt = $elapsed
    } elseif (($elapsed - $lastMessageAt) -ge 10) {
      Write-LauncherInfo "Still waiting for $NodeName to start ($elapsed s)..."
      $lastMessageAt = $elapsed
    }
    if ($stopwatch.Elapsed.TotalSeconds -ge $Script:SetupCodeWaitSeconds) {
      Fail-Launcher "$NodeName did not answer with a setup code within $Script:SetupCodeWaitSeconds seconds (last attempt: $line). Check: autobyteus-docker logs --name $NodeName"
    }
    Start-Sleep -Seconds 1
  }
}

# setup-code: applies the current launcher configuration first (a node created by an older launcher is recreated
# once with its named volumes and port, design M-8a), then asks the running node for a code. Start-Node's own
# progress (image check/pull, recreate/start) goes to host output here, and its URL block is skipped (the setup
# code message below already names the node's backend URL); setup-code's own output holds only the code.
function Show-SetupCode([string]$NodeName) {
  $state = Read-NodeState $NodeName
  if (-not $state) { Fail-Launcher "No launcher state found for $NodeName. Run new-container first." }
  $imageRef = if ($state.imageRef) { $state.imageRef } else { Get-ImageRef $Script:DefaultImage $Script:DefaultTag }
  Start-Node $NodeName $imageRef ($NodeName -eq $Script:DefaultNodeName) -NoUrls
  Show-SetupCodeOfRunningNode $NodeName
}

function Show-Logs([string]$NodeName, [string[]]$ExtraArgs) {
  $state = Read-NodeState $NodeName
  if (-not $state) { Fail-Launcher "No launcher state found for $NodeName." }
  if (-not (Test-ContainerExists $state.containerName)) { Fail-Launcher "Container $($state.containerName) was not found." }
  if ($ExtraArgs.Count -eq 0) { & docker logs --tail 100 $state.containerName; return }
  & docker logs @ExtraArgs $state.containerName
}

function Resolve-TargetName([string]$ExplicitName) {
  if ($ExplicitName) { return Normalize-NodeName $ExplicitName }
  $Script:DefaultNodeName
}

function Get-StrictDestroyNodeName([string]$Raw) {
  if ([string]::IsNullOrWhiteSpace($Raw)) { return $null }
  $normalized = $Raw.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
  $normalized = $normalized.Trim('-')
  if ([string]::IsNullOrWhiteSpace($normalized)) { return $null }
  $normalized
}

function Invoke-AutoByteusDocker {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CommandArgs)
  $cmd = if ($CommandArgs.Count -gt 0) { $CommandArgs[0] } else { 'help' }
  if ($cmd -in @('help', '-h', '--help')) { Show-AutoByteusDockerHelp; return }

  $stopAll = $false; $nameArg = ''; $nameSeen = $false; $nameOptionCount = 0; $tag = $Script:DefaultTag; $image = $Script:DefaultImage; $imageRefOverrideExplicit = $false; $extra = @(); $destroyNodeName = ''; $version = ''; $allowLocalNetwork = $false
  for ($i = 1; $i -lt $CommandArgs.Count; $i += 1) {
    switch ($CommandArgs[$i]) {
      '--all' { $stopAll = $true }
      '--name' { $i += 1; if ($i -ge $CommandArgs.Count -or $CommandArgs[$i].StartsWith('-')) { Fail-Launcher '--name requires a value' }; $nameArg = $CommandArgs[$i]; $nameSeen = $true; $nameOptionCount += 1 }
      '--tag' { $i += 1; if ($i -ge $CommandArgs.Count) { Fail-Launcher '--tag requires a value' }; $tag = $CommandArgs[$i]; $imageRefOverrideExplicit = $true }
      '--image' { $i += 1; if ($i -ge $CommandArgs.Count) { Fail-Launcher '--image requires a value' }; $image = $CommandArgs[$i]; $imageRefOverrideExplicit = $true }
      '--version' { $i += 1; if ($i -ge $CommandArgs.Count -or $CommandArgs[$i].StartsWith('-')) { Fail-Launcher '--version requires a value' }; $version = $CommandArgs[$i] }
      '--allow-local-network' { $allowLocalNetwork = $true }
      { $_ -in @('-h', '--help') } { Show-AutoByteusDockerHelp; return }
      default {
        if (-not $nameArg -and $cmd -in @('urls', 'ports', 'status', 'ps', 'stop', 'logs', 'setup-code')) { $nameArg = $CommandArgs[$i] }
        else { $extra += $CommandArgs[$i] }
      }
    }
  }

  if ($cmd -notin @('new-container', 'upgrade', 'destroy', 'reset', 'workspace', 'storage', 'urls', 'ports', 'status', 'ps', 'stop', 'logs', 'update', 'setup-code')) {
    Show-AutoByteusDockerHelp
    exit 1
  }
  if ($version -and $cmd -ne 'update') { Fail-Launcher '--version applies only to update.' }
  if ($allowLocalNetwork -and $cmd -ne 'new-container') { Fail-Launcher '--allow-local-network applies only to new-container.' }

  if ($cmd -in @('new-container', 'upgrade', 'destroy', 'reset', 'storage') -and $extra.Count -gt 0) {
    Fail-Launcher "Unknown $cmd option(s): $($extra -join ' ')"
  }

  if ($cmd -eq 'destroy') {
    if ($stopAll -and $nameSeen) { Fail-Launcher 'destroy requires exactly one of --all or --name <node>; do not combine them.' }
    if (-not $stopAll -and -not $nameSeen) { Fail-Launcher 'destroy requires exactly one of --all or --name <node>.' }
    if ($nameOptionCount -gt 1) { Fail-Launcher 'destroy accepts only one --name selector.' }
    if ($nameSeen) {
      $destroyNodeName = Get-StrictDestroyNodeName $nameArg
      if (-not $destroyNodeName) { Fail-Launcher 'destroy --name requires a non-empty managed node name.' }
    }
  }

  Ensure-StateDir
  Assert-Docker
  $nodeName = if ($cmd -eq 'destroy' -and -not $stopAll) { $destroyNodeName } else { Resolve-TargetName $nameArg }
  $imageRef = Get-ImageRef $image $tag

  switch ($cmd) {
    'new-container' {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown new-container option(s): $($extra -join ' ')" }
      if ($stopAll) { Fail-Launcher 'new-container creates one node and does not accept --all.' }
      if ($nameArg) { Fail-Launcher 'new-container always chooses the next indexed name; do not pass --name.' }
      $Script:RequestedAllowLocalNetwork = $allowLocalNetwork
      New-Container $imageRef
    }
    'upgrade' {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown upgrade option(s): $($extra -join ' ')" }
      if (-not $stopAll) { Fail-Launcher 'upgrade affects every managed node; rerun with --all.' }
      if ($nameArg) { Fail-Launcher 'upgrade --all does not accept --name.' }
      Upgrade-AllNodes $imageRef $imageRefOverrideExplicit
    }
    'destroy' {
      if ($stopAll) { Destroy-AllNodes } else { Destroy-Node $nodeName }
    }
    'reset' {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown reset option(s): $($extra -join ' ')" }
      if ($stopAll) { Fail-Launcher 'reset already applies to all managed nodes and does not accept --all.' }
      if ($nameArg) { Fail-Launcher "reset always recreates $Script:DefaultNodeName; do not pass --name." }
      Reset-Nodes $imageRef
    }
    'workspace' {
      $workspaceAction = if ($extra.Count -gt 0) { $extra[0] } else { 'paths' }
      if ($workspaceAction -notin @('paths', 'apply')) {
        Fail-Launcher "Unknown workspace subcommand: $workspaceAction. Use 'workspace paths' or 'workspace apply'."
      }
      if ($extra.Count -gt 1) { Fail-Launcher "Unknown workspace option(s): $($extra[1..($extra.Count - 1)] -join ' ')" }
      if ($workspaceAction -eq 'paths') {
        Show-WorkspacePaths $nodeName $stopAll
      } else {
        Apply-Workspace $nodeName $stopAll $imageRef
      }
    }
    'storage' {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown storage option(s): $($extra -join ' ')" }
      Show-Storage $nodeName $stopAll
    }
    { $_ -in @('urls', 'ports') } { Show-Urls $nodeName }
    { $_ -in @('status', 'ps') } { Show-Status $(if ($nameArg) { $nodeName } else { '' }) }
    'stop' { Stop-Nodes $nodeName $stopAll }
    'update' {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown update option(s): $($extra -join ' ')" }
      if ($stopAll -and $nameArg) { Fail-Launcher 'update accepts --all or --name <node>, not both.' }
      if ($imageRefOverrideExplicit) { Fail-Launcher 'update keeps each node''s image; use --version to choose the server version.' }
      Update-Nodes $nodeName $stopAll $version
    }
    'logs' { Show-Logs $nodeName $extra }
    'setup-code' {
      if ($extra.Count -gt 0) { Fail-Launcher "Unknown setup-code option(s): $($extra -join ' ')" }
      if ($stopAll) { Fail-Launcher 'setup-code is for one node; use --name <node>.' }
      Show-SetupCode $nodeName
    }
    default { Show-AutoByteusDockerHelp; exit 1 }
  }
}
