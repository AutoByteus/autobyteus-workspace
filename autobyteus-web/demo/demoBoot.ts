/**
 * The demo build's start (autobyteus-279), run by the first client plugin, before `20.windowNodeBootstrap`,
 * `21.mobileRemoteAccessBootstrap` and `30.apollo`:
 *
 * 1. the demo transport, so plugin 30's `HttpLink` captures the demo `fetch`;
 * 2. a fresh sample world (nothing persists between starts);
 * 3. the phone's session through its owner's storage (`mobileCredentialStorage`). Plugin 21 then loads and binds it as for
 *    any paired phone, and the shell shows the run list. Nothing here binds the window's node context directly.
 *
 * The storage is the web view's non-persistent data store, so the session ends with Leave demo or a cold launch.
 */
import type { MobileNodeSession } from '~/types/remoteAccess';
import { mobileCredentialStorage } from '~/utils/remoteAccess/mobileCredentialStorage';
import { DEMO_ENTRY_ID } from '~/utils/remoteAccess/demoSession';
import { DemoNode } from './DemoNode';
import { DEMO_DEVICE_ID, DEMO_NODE_NAME, DEMO_ORIGIN, DEMO_SESSION_TOKEN } from './demoIdentity';
import { installDemoTransport } from './demoTransport';
import { createDemoWorld } from './world/DemoWorld';

export const demoSession = (now: Date): MobileNodeSession => ({
  entryId: DEMO_ENTRY_ID,
  serverBaseUrl: DEMO_ORIGIN,
  nodeName: DEMO_NODE_NAME,
  credential: DEMO_SESSION_TOKEN,
  device: {
    deviceId: DEMO_DEVICE_ID,
    displayName: 'This phone',
    clientFacingBaseUrl: DEMO_ORIGIN,
    connectionWay: null,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    revokedAt: null,
  },
  pairedAt: now.toISOString(),
});

export const bootDemo = (now = new Date()): DemoNode => {
  const node = new DemoNode();
  installDemoTransport(node);
  node.start(createDemoWorld(now));
  mobileCredentialStorage.save(demoSession(now));
  return node;
};
