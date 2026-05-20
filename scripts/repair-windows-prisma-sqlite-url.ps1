# Repairs affected Windows desktop installs that generated invalid Prisma SQLite URLs.
[CmdletBinding()]
param(
  [string]$InstallDir = "",
  [string]$ServerDataDir = (Join-Path $env:USERPROFILE ".autobyteus\server-data")
)

$ErrorActionPreference = "Stop"

function Resolve-AutoByteusInstallDir {
  param([string]$ExplicitInstallDir)

  if (-not [string]::IsNullOrWhiteSpace($ExplicitInstallDir)) {
    $resolved = [System.IO.Path]::GetFullPath($ExplicitInstallDir)
    $explicitAsar = Join-Path $resolved "resources\app.asar"
    if (Test-Path -LiteralPath $explicitAsar) {
      return $resolved
    }
    throw "AutoByteus app.asar was not found under -InstallDir '$resolved'. Expected resources\app.asar."
  }

  $programFilesX86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
  $candidates = @()
  if ($env:ProgramFiles) {
    $candidates += Join-Path $env:ProgramFiles "AutoByteus"
  }
  if ($programFilesX86) {
    $candidates += Join-Path $programFilesX86 "AutoByteus"
  }
  $candidates += "D:\Program Files\AutoByteus"
  $candidates += "C:\Program Files\AutoByteus"

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath (Join-Path $candidate "resources\app.asar")) {
      return $candidate
    }
  }

  throw "AutoByteus install directory was not found. Re-run with -InstallDir 'C:\Path\To\AutoByteus'. Checked: $($candidates -join ', ')"
}

function New-BackupFile {
  param(
    [string]$Path,
    [string]$Timestamp
  )

  $candidate = "$Path.bak-$Timestamp"
  $index = 1
  while (Test-Path -LiteralPath $candidate) {
    $candidate = "$Path.bak-$Timestamp-$index"
    $index += 1
  }

  Copy-Item -LiteralPath $Path -Destination $candidate
  return $candidate
}

function Ensure-BinaryPatchType {
  if (([System.Management.Automation.PSTypeName]"AutoByteusBinaryPatch").Type) {
    return
  }

  Add-Type -TypeDefinition @"
using System;

public static class AutoByteusBinaryPatch
{
    public static int Count(byte[] data, byte[] pattern)
    {
        if (pattern == null || pattern.Length == 0)
        {
            throw new ArgumentException("Pattern must not be empty.", "pattern");
        }

        int count = 0;
        for (int i = 0; i <= data.Length - pattern.Length; i++)
        {
            if (Matches(data, pattern, i))
            {
                count++;
                i += pattern.Length - 1;
            }
        }
        return count;
    }

    public static int ReplaceAll(byte[] data, byte[] pattern, byte[] replacement)
    {
        if (pattern == null || pattern.Length == 0)
        {
            throw new ArgumentException("Pattern must not be empty.", "pattern");
        }
        if (replacement == null || replacement.Length != pattern.Length)
        {
            throw new ArgumentException("Replacement must be the same byte length as pattern.", "replacement");
        }

        int count = 0;
        for (int i = 0; i <= data.Length - pattern.Length; i++)
        {
            if (Matches(data, pattern, i))
            {
                Buffer.BlockCopy(replacement, 0, data, i, replacement.Length);
                count++;
                i += pattern.Length - 1;
            }
        }
        return count;
    }

    private static bool Matches(byte[] data, byte[] pattern, int offset)
    {
        for (int j = 0; j < pattern.Length; j++)
        {
            if (data[offset + j] != pattern[j])
            {
                return false;
            }
        }
        return true;
    }
}
"@
}

$installRoot = Resolve-AutoByteusInstallDir -ExplicitInstallDir $InstallDir
$appAsar = Join-Path $installRoot "resources\app.asar"
$envFile = Join-Path $ServerDataDir ".env"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backups = @()

Write-Output "Using AutoByteus install: $installRoot"
Write-Output "Using server data: $ServerDataDir"

$runningProcesses = @(Get-Process -Name AutoByteus -ErrorAction SilentlyContinue)
if ($runningProcesses.Count -gt 0) {
  $runningProcesses | Stop-Process -Force
  Start-Sleep -Seconds 1
  Write-Output "Stopped running AutoByteus processes."
}

Ensure-BinaryPatchType

$oldText = 'return normalizedPath.startsWith(''/'') ? `file:${normalizedPath}` : `file:/${normalizedPath}`;'
$newText = 'return `file:${normalizedPath}`;'
if ($newText.Length -gt $oldText.Length) {
  throw "Internal repair script error: replacement text is longer than the original text."
}

$encoding = [System.Text.Encoding]::UTF8
$oldBytes = $encoding.GetBytes($oldText)
$replacementBytes = $encoding.GetBytes($newText + (" " * ($oldText.Length - $newText.Length)))
if ($oldBytes.Length -ne $replacementBytes.Length) {
  throw "Internal repair script error: replacement byte length mismatch."
}

$asarBytes = [System.IO.File]::ReadAllBytes($appAsar)
$oldFormatterCount = [AutoByteusBinaryPatch]::Count($asarBytes, $oldBytes)
if ($oldFormatterCount -gt 0) {
  $asarBackup = New-BackupFile -Path $appAsar -Timestamp $timestamp
  $backups += $asarBackup
  $patchedCount = [AutoByteusBinaryPatch]::ReplaceAll($asarBytes, $oldBytes, $replacementBytes)
  [System.IO.File]::WriteAllBytes($appAsar, $asarBytes)

  $remainingCount = [AutoByteusBinaryPatch]::Count([System.IO.File]::ReadAllBytes($appAsar), $oldBytes)
  if ($remainingCount -ne 0) {
    throw "Failed to replace all packaged Electron SQLite URL formatters. Backups remain at $($backups -join ', ')"
  }

  Write-Output "Patched $patchedCount packaged Electron SQLite URL formatter(s)."
} else {
  Write-Output "Packaged Electron SQLite URL formatter is already repaired or this build is not affected."
}

if (Test-Path -LiteralPath $envFile) {
  $envContent = [System.IO.File]::ReadAllText($envFile)
  $fixedEnvContent = [System.Text.RegularExpressions.Regex]::Replace(
    $envContent,
    '(?m)^DATABASE_URL=file:/([A-Za-z]:/)',
    'DATABASE_URL=file:$1'
  )

  if ($fixedEnvContent -ne $envContent) {
    $envBackup = New-BackupFile -Path $envFile -Timestamp $timestamp
    $backups += $envBackup
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envFile, $fixedEnvContent, $utf8NoBom)
    Write-Output "Repaired DATABASE_URL in server-data .env."
  } else {
    Write-Output "server-data .env is already repaired or does not contain the affected URL shape."
  }
} else {
  Write-Output "No server-data .env found at $envFile. The packaged generator repair will apply on the next first run."
}

if ($backups.Count -gt 0) {
  Write-Output "Backups created:"
  foreach ($backup in $backups) {
    Write-Output "  $backup"
  }
} else {
  Write-Output "No files needed modification."
}

Write-Output "Repair completed. Restart AutoByteus and check $env:USERPROFILE\.autobyteus\logs\app.log if startup still fails."
