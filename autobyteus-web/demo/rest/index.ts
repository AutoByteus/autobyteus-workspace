/** The demo node's REST answers (autobyteus-279), by method and path, as the node's own routes answer them. */
import type { RemoteAccessStatus } from '~/types/remoteAccess';
import { DEMO_NODE_ID } from '../demoIdentity';
import type { DemoWorld } from '../world/DemoWorld';
import { contentRoutes } from './content';
import { contextFileRoutes } from './contextFiles';

export type DemoRestRoute = {
  method: 'GET' | 'POST' | 'DELETE';
  match(url: URL): boolean;
  answer(url: URL, request: Request, world: DemoWorld): Response | Promise<Response>;
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const path = (pathname: string) => (url: URL) => url.pathname === pathname;

export const demoRestRoutes: DemoRestRoute[] = [
  // autobyteus-server-ts/src/api/rest/health.ts
  { method: 'GET', match: path('/rest/health'), answer: () => json({ status: 'ok', message: 'Server is running' }) },
  // autobyteus-server-ts/src/api/rest/remote-access.ts: the demo node, with phone access on.
  {
    method: 'GET', match: path('/rest/remote-access/status'),
    answer: () => json({ phoneAccessEnabled: true, pairingAvailable: true, nodeId: DEMO_NODE_ID } satisfies RemoteAccessStatus),
  },
  // autobyteus-server-ts/src/api/rest/node-desktop.ts: the demo node has a node desktop (its RFB is the demo's own).
  { method: 'GET', match: path('/rest/node-desktop'), answer: () => json({ available: true }) },
  ...contentRoutes,
  ...contextFileRoutes,
];
