import type { NodeEntry } from '~/types/node';

const MACOS_TAILSCALE_EXECUTABLE = '/Applications/Tailscale.app/Contents/MacOS/Tailscale';
/** The first HTTPS port given to a node on this computer other than the desktop's own (which uses 443). */
export const FIRST_EXTRA_SERVE_HTTPS_PORT = 8443;
/** Room for 100 nodes on one computer: 8443…8542. */
const EXTRA_SERVE_HTTPS_PORT_COUNT = 100;

const isLoopbackBaseUrl = (baseUrl: string): boolean => {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === 'localhost' || host === '[::1]' || host.startsWith('127.');
  } catch {
    return false;
  }
};

/**
 * The HTTPS port Tailscale Serve gives a node on this computer that is not the desktop's own: `8443 + k`, where `k` is
 * the node's position among this desktop's non-embedded entries on this computer ordered by when they were added, so
 * adding a node never changes another node's command. `null` when the node is not one of them.
 */
export const tailscaleServeHttpsPortFor = (entryId: string, entries: readonly NodeEntry[]): number | null => {
  const onThisComputer = entries
    .filter((entry) => entry.nodeType !== 'embedded' && isLoopbackBaseUrl(entry.baseUrl))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  const position = onThisComputer.findIndex((entry) => entry.id === entryId);
  if (position < 0 || position >= EXTRA_SERVE_HTTPS_PORT_COUNT) return null;
  return FIRST_EXTRA_SERVE_HTTPS_PORT + position;
};

/** The `tailscale` program on this computer: the app's binary on macOS, the command elsewhere. */
export const tailscaleExecutable = (platform: string): string =>
  /mac/i.test(platform) ? MACOS_TAILSCALE_EXECUTABLE : 'tailscale';

/**
 * The one optional command that gives a node an `https://` name on the user's Tailscale network (REQ-008).
 * AutoByteus shows it and never runs it. No `serve reset`: it would remove the user's other Serve mappings.
 */
export const buildTailscaleServeCommand = (input: {
  platform: string;
  nodePort: number;
  /** `null` for the desktop's own node (HTTPS 443). */
  httpsPort: number | null;
}): string => {
  const executable = tailscaleExecutable(input.platform);
  const quoted = executable.includes(' ') ? `"${executable}"` : executable;
  return input.httpsPort === null
    ? `${quoted} serve --bg ${input.nodePort}`
    : `${quoted} serve --bg --https=${input.httpsPort} ${input.nodePort}`;
};
