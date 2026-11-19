/** The demo node's WebSocket streams (autobyteus-279), one session per route. */
import type { DemoStreamSession } from '../demoTransport';
import { openAgentCollaborationStream } from './agentCollaborationStream';
import { openAgentStream } from './agentStream';
import { openOrgStream } from './orgStream';
import { openRunStatusStream } from './runStatusStream';
import { openTeamStream } from './teamStream';
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

/** A run the world does not have: the node closes the socket, as for a run it does not know. */
const unknownRun = (context: DemoStreamContext, runId: string): DemoStreamSession => {
  console.error(`[demo] no run ${runId} for ${context.url.pathname}`);
  setTimeout(() => context.close(4004, 'run not found'), 0);
  return { received: () => undefined };
};

const routes: DemoStreamRoute[] = [
  route(/^\/ws\/agent-package-definitions$/, changeFeedThatNeverChanges),
  route(/^\/ws\/projects$/, changeFeedThatNeverChanges),
  route(/^\/ws\/run-status$/, openRunStatusStream),
  route(/^\/ws\/agent\/([^/]+)$/, (context, match) => {
    const agent = context.world.agent(decodeURIComponent(match[1]!));
    if (!agent || agent.run.kind !== 'agent') return unknownRun(context, match[1]!);
    return openAgentStream(context, agent);
  }),
  route(/^\/ws\/agent-team\/([^/]+)$/, (context, match) => {
    const run = context.world.run(decodeURIComponent(match[1]!));
    if (!run || run.kind !== 'team') return unknownRun(context, match[1]!);
    return openTeamStream(context, run);
  }),
  route(/^\/ws\/agent-org\/([^/]+)$/, (context, match) => {
    const run = context.world.run(decodeURIComponent(match[1]!));
    if (!run || run.kind !== 'org') return unknownRun(context, match[1]!);
    return openOrgStream(context, run);
  }),
  route(/^\/ws\/agent-collaboration\/([^/]+)$/, (context, match) => {
    const run = context.world.run(decodeURIComponent(match[1]!));
    if (!run || run.kind !== 'agent') return unknownRun(context, match[1]!);
    return openAgentCollaborationStream(context, run);
  }),
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
