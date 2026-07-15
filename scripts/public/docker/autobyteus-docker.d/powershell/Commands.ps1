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

  $stopAll = $false; $nameArg = ''; $nameSeen = $false; $nameOptionCount = 0; $tag = $Script:DefaultTag; $image = $Script:DefaultImage; $imageRefOverrideExplicit = $false; $extra = @(); $destroyNodeName = ''
  for ($i = 1; $i -lt $CommandArgs.Count; $i += 1) {
    switch ($CommandArgs[$i]) {
      '--all' { $stopAll = $true }
      '--name' { $i += 1; if ($i -ge $CommandArgs.Count -or $CommandArgs[$i].StartsWith('-')) { Fail-Launcher '--name requires a value' }; $nameArg = $CommandArgs[$i]; $nameSeen = $true; $nameOptionCount += 1 }
      '--tag' { $i += 1; if ($i -ge $CommandArgs.Count) { Fail-Launcher '--tag requires a value' }; $tag = $CommandArgs[$i]; $imageRefOverrideExplicit = $true }
      '--image' { $i += 1; if ($i -ge $CommandArgs.Count) { Fail-Launcher '--image requires a value' }; $image = $CommandArgs[$i]; $imageRefOverrideExplicit = $true }
      { $_ -in @('-h', '--help') } { Show-AutoByteusDockerHelp; return }
      default {
        if (-not $nameArg -and $cmd -in @('urls', 'ports', 'status', 'ps', 'stop', 'logs')) { $nameArg = $CommandArgs[$i] }
        else { $extra += $CommandArgs[$i] }
      }
    }
  }

  if ($cmd -notin @('new-container', 'upgrade', 'destroy', 'reset', 'workspace', 'storage', 'urls', 'ports', 'status', 'ps', 'stop', 'logs')) {
    Show-AutoByteusDockerHelp
    exit 1
  }

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
    'logs' { Show-Logs $nodeName $extra }
    default { Show-AutoByteusDockerHelp; exit 1 }
  }
}
