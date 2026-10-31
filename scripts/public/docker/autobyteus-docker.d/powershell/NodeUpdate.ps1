# In-place server updates of managed nodes. The launcher talks to each node's starter only through
# its host command (cli.mjs, C2), run inside the node's container.
$Script:StarterCli = '/opt/autobyteus/starter/cli.mjs'
$Script:UpdatePollSeconds = 2
$Script:UpdateWaitSeconds = 3600

# Runs `cli.mjs <args>` in a container: @{ exit = 0 ok/accepted, 2 refused, 1 error or no starter; answer = its JSON or $null }.
function Invoke-StarterCommand([string]$ContainerName, [string[]]$StarterArgs) {
  $output = & docker exec $ContainerName node $Script:StarterCli @StarterArgs 2>$null
  $exitCode = $LASTEXITCODE
  $answer = $null
  try { $answer = ($output | Select-Object -First 1) | ConvertFrom-Json } catch { $answer = $null }
  @{ exit = $exitCode; answer = $answer }
}

# The track an update without --version follows, from the node's saved image ref:
# @{ track = 'stable' | 'beta' } or @{ refusal = <reason> }.
function Get-UpdateTrack([string]$ImageRef) {
  if ($ImageRef -match '^(.+):([^/:]+)$') { $repository = $Matches[1]; $tag = $Matches[2] } else { $repository = $ImageRef; $tag = 'latest' }
  if ($repository.StartsWith('docker.io/')) { $repository = $repository.Substring('docker.io/'.Length) }
  if ($repository -ne $Script:DefaultImage) { return @{ refusal = "This node uses a custom image ($ImageRef); pass --version." } }
  switch ($tag) {
    { $_ -in @('latest', 'latest-zh') } { return @{ track = 'stable' } }
    'beta' { return @{ track = 'beta' } }
    default { return @{ refusal = "This node is pinned to $tag; pass --version." } }
  }
}

# One line under a node in `status`: what its starter runs, or why that is not known.
function Write-StarterLine([string]$ContainerName, [string]$DockerStatus) {
  if ($DockerStatus -ne 'running') { Write-Host "  server: not available (container $DockerStatus)"; return }
  $result = Invoke-StarterCommand $ContainerName @('status')
  $answer = $result.answer
  if ($result.exit -ne 0 -or -not $answer -or -not $answer.state) {
    Write-Host '  server: not available (no starter answer; images before the starter have none)'
  } elseif ($answer.state -eq 'needsNewImage') {
    Write-Host "  server: no server runs: $($answer.message)"
  } else {
    $line = "  server: $($answer.version)"
    if ($answer.update.state -eq 'running') { $line += ", updating to $($answer.update.targetVersion) ($($answer.update.step))" }
    if ($answer.updateBlocker) { $line += ", in-place update unavailable: $($answer.updateBlocker.message)" }
    Write-Host $line
  }
}

# Updates one node in place and follows the update to its result. Returns $true on success.
function Update-Node([string]$NodeName, [string]$Version) {
  $state = Read-NodeState $NodeName
  if (-not $state) { Write-LauncherInfo "${NodeName}: no launcher state found."; return $false }
  if (-not (Test-ContainerRunning $state.containerName)) { Write-LauncherInfo "${NodeName}: the container is not running; start it first."; return $false }
  if ($Version) {
    $starterArgs = @('update', '--version', $Version)
  } else {
    $track = Get-UpdateTrack ([string]$state.imageRef)
    if ($track.refusal) { Write-LauncherInfo "${NodeName}: $($track.refusal)"; return $false }
    $starterArgs = @('update', '--track', $track.track)
  }
  $result = Invoke-StarterCommand $state.containerName $starterArgs
  if ($result.exit -eq 2) { Write-LauncherInfo "${NodeName}: refused ($($result.answer.refused)): $($result.answer.message)"; return $false }
  if ($result.exit -ne 0) {
    Write-LauncherInfo "${NodeName}: the node's starter did not answer. Images before the starter cannot update in place; run: autobyteus-docker upgrade --all"
    return $false
  }
  $target = [string]$result.answer.version
  Write-LauncherInfo "${NodeName}: updating to $target"
  $lastStep = ''
  for ($waited = 0; $waited -lt $Script:UpdateWaitSeconds; $waited += $Script:UpdatePollSeconds) {
    Start-Sleep -Seconds $Script:UpdatePollSeconds
    $answer = (Invoke-StarterCommand $state.containerName @('status')).answer
    if (-not $answer -or $answer.update.targetVersion -ne $target) { continue }
    switch ($answer.update.state) {
      'running' {
        if ($answer.update.step -ne $lastStep) { Write-LauncherInfo "${NodeName}: $($answer.update.step)" }
        $lastStep = $answer.update.step
      }
      'succeeded' { Write-LauncherInfo "${NodeName}: $($answer.update.message)"; return $true }
      default { Write-LauncherInfo "${NodeName}: $($answer.update.state) ($($answer.update.code)): $($answer.update.message)"; return $false }
    }
  }
  Write-LauncherInfo "${NodeName}: no result after $Script:UpdateWaitSeconds s; see: autobyteus-docker status --name $NodeName"
  $false
}

# `update [--name <node> | --all] [--version <version>]`: one node, or every managed node in turn.
function Update-Nodes([string]$NodeName, [bool]$UpdateAll, [string]$Version) {
  if (-not $UpdateAll) {
    if (-not (Update-Node $NodeName $Version)) { exit 1 }
    return
  }
  $names = @(Get-ManagedNodeNames)
  if ($names.Count -eq 0) { Fail-Launcher 'No managed Docker node was found.' }
  $failed = $false
  foreach ($name in $names) { if (-not (Update-Node $name $Version)) { $failed = $true } }
  if ($failed) { exit 1 }
}
