import type { NodeEndpoints } from '~/types/node';
import { authorizedFetch } from '~/utils/remoteAccess/authorizedTransport';
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth';

/**
 * The client contract of a node's node desktop (the agent's virtual desktop inside a Docker node):
 * `GET <rest>/node-desktop` → `{ available }`, and one viewer stream at
 * `<nodeDesktopWs>?mode=view|control[&access_token=]`. Only this file knows the route, its query
 * and its close codes.
 */
export type NodeDesktopMode = 'view' | 'control';

export type NodeDesktopViewerState = 'not-allowed' | 'unavailable' | 'disconnected' | 'unreachable' | 'closed';

/** How a stream ended: the viewer state and the localization key of the text the viewer shows. */
export type NodeDesktopStreamEnd = Readonly<{ state: NodeDesktopViewerState; messageKey: string }>;

const MESSAGE_KEY_PREFIX = 'workspace.components.workspace.tools.NodeDesktopTile';

const ended = (state: NodeDesktopViewerState, message: string): NodeDesktopStreamEnd => ({
  state,
  messageKey: `${MESSAGE_KEY_PREFIX}.${message}`,
});

export async function fetchNodeDesktop(endpoints: NodeEndpoints): Promise<{ available: boolean }> {
  const response = await authorizedFetch(`${endpoints.rest}/node-desktop`);
  if (!response.ok) {
    throw new Error(`The node answered ${response.status} for its node desktop.`);
  }
  const body = (await response.json()) as { available?: unknown };
  return { available: body.available === true };
}

export function nodeDesktopStreamUrl(
  endpoints: NodeEndpoints,
  mode: NodeDesktopMode,
  credential: string | null,
): string {
  const url = new URL(endpoints.nodeDesktopWs);
  url.searchParams.set('mode', mode);
  return credential ? buildAuthenticatedWebSocketUrl(url.toString(), credential) : url.toString();
}

/**
 * Maps the WebSocket close of a stream the viewer did not end itself to what the viewer shows.
 * 1005 (no status code) is a server shutdown (the WebSocket plugin closes its clients without a
 * code), so it reads as a disconnect with Reconnect. A code this table does not list also offers
 * Reconnect.
 */
export function viewerStateForClose(close: Readonly<{ code: number; reason: string }>): NodeDesktopStreamEnd {
  switch (close.code) {
    case 4401:
    case 4403:
      return ended('not-allowed', 'not_allowed');
    case 4404:
      return close.reason === 'NODE_DESKTOP_UNAVAILABLE'
        ? ended('unavailable', 'no_shared_desktop')
        : ended('not-allowed', 'not_allowed');
    case 4400:
      return ended('disconnected', 'connection_refused');
    case 1006:
      return ended('unreachable', 'cannot_reach_node');
    case 1000:
    case 1001:
      return ended('closed', 'disconnected');
    default:
      // 4502 NODE_DESKTOP_DISCONNECTED, 1005 (server shutdown) and any unlisted code.
      return ended('disconnected', 'desktop_disconnected');
  }
}
