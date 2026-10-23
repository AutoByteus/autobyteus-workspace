export type NfsComputer = 'macos' | 'linux';
export type NfsPublishedRelease = Readonly<{
  tag: string;
  installerUrl: string;
  downloadUrl: string;
  installerSha256: string;
  availableComputers: readonly NfsComputer[];
}>;

/** Verified public distribution data, not field qualification or live host readiness. */
export const nfsPublishedRelease: NfsPublishedRelease = {
  tag: 'v0.1.0',
  installerUrl: 'https://github.com/AutoByteus/autobyteus-nfs/releases/download/v0.1.0/autobyteus-nfs-install.sh',
  downloadUrl: 'https://github.com/AutoByteus/autobyteus-nfs/releases/tag/v0.1.0',
  installerSha256: '65769690ada27db304d2e0e4bcd6716e6403f86650ca8f1905e26ebde86d25fa',
  availableComputers: ['macos', 'linux'],
};

const safeHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      /^[A-Za-z0-9:/._~%?=&+-]+$/.test(value);
  } catch { return false; }
};

/** Display/clipboard data only: never fetches, executes, or controls a host. */
export function nfsLauncherCommand(computer: NfsComputer, release: NfsPublishedRelease | null = nfsPublishedRelease): string | null {
  if (!release?.availableComputers.includes(computer) || !/^v\d+\.\d+\.\d+$/.test(release.tag) ||
    !/^[a-f0-9]{64}$/.test(release.installerSha256) ||
    !safeHttpsUrl(release.installerUrl) || !safeHttpsUrl(release.downloadUrl)) return null;
  const checksum = computer === 'macos' ? 'shasum -a 256 -c -' : 'sha256sum -c -';
  return `curl --fail --location --proto '=https' --tlsv1.2 \\\n  '${release.installerUrl}' \\\n  -o autobyteus-nfs-install.sh &&
printf '%s  %s\\n' '${release.installerSha256}' 'autobyteus-nfs-install.sh' | ${checksum} &&
bash autobyteus-nfs-install.sh version`;
}

/** Public installed-tool reference; execution belongs only to the user's terminal. */
export const nfsUsageCommands = [
  { id: 'interactive', command: '~/.local/bin/autobyteus-nfs' },
  { id: 'create', command: '~/.local/bin/autobyteus-nfs create' },
  { id: 'connect', command: '~/.local/bin/autobyteus-nfs connect' },
  { id: 'status', command: '~/.local/bin/autobyteus-nfs status' },
  { id: 'reconnect', command: '~/.local/bin/autobyteus-nfs reconnect' },
  { id: 'detach', command: '~/.local/bin/autobyteus-nfs detach' },
  { id: 'version', command: '~/.local/bin/autobyteus-nfs version' },
] as const;
export type NfsGuideCommandId = `install-${NfsComputer}` | typeof nfsUsageCommands[number]['id'];
