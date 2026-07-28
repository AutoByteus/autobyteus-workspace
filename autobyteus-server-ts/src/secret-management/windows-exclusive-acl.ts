import { execFileSync } from 'node:child_process';

export type WindowsAclCommandRunner = (
  executable: string,
  args: readonly string[],
  options: { windowsHide: boolean; stdio: 'ignore' },
) => unknown;

export const assertWindowsExclusiveAcl = (
  filePath: string,
  runCommand: WindowsAclCommandRunner = execFileSync,
): void => {
  const script = [
    '$ErrorActionPreference = "Stop"',
    '$acl = Get-Acl -LiteralPath $args[0]',
    '$user = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value',
    '$owner = $acl.Owner',
    'try { $owner = (New-Object Security.Principal.NTAccount($owner)).Translate([Security.Principal.SecurityIdentifier]).Value } catch {}',
    '$allowed = @($acl.Access | Where-Object { $_.AccessControlType -eq "Allow" })',
    '$exclusive = $allowed.Count -gt 0',
    'foreach ($rule in $allowed) {',
    '  try { $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value } catch { exit 1 }',
    '  if ($sid -ne $user) { $exclusive = $false }',
    '}',
    'if ($owner -ne $user -or -not $exclusive) { exit 1 }',
  ].join('; ');
  runCommand('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script, filePath,
  ], { windowsHide: true, stdio: 'ignore' });
};
