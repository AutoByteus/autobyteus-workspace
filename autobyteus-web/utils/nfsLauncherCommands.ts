export type NfsComputer = 'macos' | 'linux';
export type NfsPublishedRelease = Readonly<{
  tag: string;
  installerUrl: string;
  downloadUrl: string;
  qualifiedComputers: readonly NfsComputer[];
}>;

/** Publication is a delivery gate. Do not turn a build/test fixture into availability.
 * Update this one descriptor only after the release assets and modes are verified. */
export const nfsPublishedRelease: NfsPublishedRelease | null = null;

const safeHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      /^[A-Za-z0-9:/._~%?=&+-]+$/.test(value);
  } catch { return false; }
};

/** Display/clipboard data only: never fetches, executes, or controls a host. */
export function nfsLauncherCommand(computer: NfsComputer, release: NfsPublishedRelease | null = nfsPublishedRelease): string | null {
  if (!release?.qualifiedComputers.includes(computer) || !release.tag.trim() ||
    !safeHttpsUrl(release.installerUrl) || !safeHttpsUrl(release.downloadUrl)) return null;
  return `curl -fsSL '${release.installerUrl}' | bash`;
}
