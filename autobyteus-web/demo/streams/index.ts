/** The demo node's WebSocket streams (autobyteus-279), one session per route. */
import type { DemoStreamSession } from '../demoTransport';
import { openRunStatusStream } from './runStatusStream';
import type { DemoWorld } from '../world/DemoWorld';

export type DemoStreamContext = {
  url: URL;
  world: DemoWorld;
  send(data: string | Uint8Array): void;
  close(code: number, reason: string): void;
};

type DemoStreamRoute = { match(pathname: string): RegExpExecArray | null; open(context: DemoStreamContext, match: RegExpExecArray): DemoStreamSession };

const route = (pattern: RegExp, open: DemoStreamRoute['open']): DemoStreamRoute => ({ match: (pathname) => pattern.exec(pathname), open });

/**
 * A node change feed the demo's world never changes (the sample world's definitions and projects are fixed): one
 * `connected` frame on open, as the node sends on every connect (`services/nodeChangeFeed`).
 */
const changeFeedThatNeverChanges = (context: DemoStreamContext): DemoStreamSession => ({
  opened: () => context.send(JSON.stringify({ type: 'connected' })),
  received: () => undefined,
});

const routes: DemoStreamRoute[] = [
  route(/^\/ws\/agent-package-definitions$/, changeFeedThatNeverChanges),
  route(/^\/ws\/projects$/, changeFeedThatNeverChanges),
  route(/^\/ws\/run-status$/, openRunStatusStream),
];

export const openDemoStream = (
  url: URL,
  world: DemoWorld,
  send: (data: string | Uint8Array) => void,
  close: (code: number, reason: string) => void,
): DemoStreamSession | null => {
  for (const candidate of routes) {
    const match = candidate.match(url.pathname);
    if (match) return candidate.open({ url, world, send, close }, match);
  }
  return null;
};
