// The demo node against the phone's measured network inventory (autobyteus-279, design spec Verification Plan): every
// GraphQL operation, REST route and stream route the phone was measured to use has a demo answer, or is one the demo
// never receives, with its reason. `fixtures/phone-network-inventory.json` is the Solution Designer's measured inventory
// (`evidence/architecture/phone-network-inventory.json`).
import { describe, expect, it } from 'vitest';
import { DEMO_ORIGIN } from '../demoIdentity';
import { demoGraphqlHandlers } from '../graphql';
import { DEMO_WORKSPACE_ID } from '../graphql/definitions';
import { demoRestRoutes } from '../rest';
import { openDemoStream } from '../streams';
import { createDemoWorld, type DemoRun } from '../world/DemoWorld';
import inventory from './fixtures/phone-network-inventory.json';

/** What the phone sends that never reaches the demo node, and why. */
const NOT_THE_DEMO_NODE: Record<string, string> = {
  'GET /mobile': 'the app itself: the iOS shell serves the demo build from autobyteus-demo://app/',
  'GET /mobile/': 'the app itself',
  'GET /mobile/autobyteus-icon.svg': 'the app itself',
  'GET /mobile/workspace': 'the app itself',
  'POST /rest/remote-access/pairing-exchanges': 'pairing: the demo is never paired, its session is saved by the demo boot',
};
const NO_PEERS = /^\/ws\/peer-run\//; // a peer node's run: the demo node has no peers

const world = createDemoWorld(new Date('2026-11-19T12:00:00Z'));
const firstRun = (test: (run: DemoRun) => boolean) => world.allRuns().find(test)!;

describe('the demo node answers the measured inventory', () => {
  it('has a handler for every GraphQL operation the phone sends', () => {
    const missing = Object.keys(inventory.gql).filter((name) => !(name in demoGraphqlHandlers));
    expect(missing).toEqual([]);
  });

  it('has a route for every REST request the phone sends to its node', () => {
    const missing = Object.keys(inventory.rest).filter((key) => !(key in NOT_THE_DEMO_NODE)).filter((key) => {
      const [method, pattern] = key.split(' ') as [string, string];
      const url = new URL(pattern.replace(/:id/g, 'sample'), DEMO_ORIGIN);
      return !demoRestRoutes.some((route) => route.method === method && route.match(url));
    });
    expect(missing).toEqual([]);
  });

  it('opens every stream the phone opens, with its CONNECTED or first frame (run-status: its snapshot once subscribed)', () => {
    const idFor = (pattern: string): string => {
      if (pattern.startsWith('/ws/agent/')) return firstRun((run) => run.kind === 'agent').runId;
      if (pattern.startsWith('/ws/agent-team/')) return firstRun((run) => run.kind === 'team').runId;
      if (pattern.startsWith('/ws/agent-org/')) return firstRun((run) => run.kind === 'org').runId;
      if (pattern.startsWith('/ws/agent-collaboration/')) return firstRun((run) => run.kind === 'agent' && run.coordinator.delegated.length > 0).runId;
      if (pattern.startsWith('/ws/file-explorer/')) return DEMO_WORKSPACE_ID;
      return '';
    };
    const unanswered: string[] = [];
    for (const pattern of Object.keys(inventory.ws).filter((key) => !NO_PEERS.test(key))) {
      const prefix = pattern.replace(/\/[^/]*:id.*$/, '');
      const path = prefix === pattern ? pattern : `${prefix}/${idFor(pattern)}`;
      const sent: string[] = [];
      let closed = false;
      const session = openDemoStream(new URL(path, DEMO_ORIGIN.replace(/^http/, 'ws')), world, (data) => sent.push(String(data)), () => { closed = true; });
      session?.opened?.();
      if (pattern === '/ws/run-status') session?.received(JSON.stringify({ type: 'SUBSCRIBE', payload: { runs: [{ kind: 'agent', runId: firstRun((run) => run.kind === 'agent').runId }] } }));
      if (!session || closed || !sent.length) unanswered.push(pattern);
    }
    expect(unanswered).toEqual([]);
  });
});
