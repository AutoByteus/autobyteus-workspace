// Node credentials for browser probes (autobyteus-437; node access model NA-1, NA-5, NA-9; TESTING.md § Browser probes).
// Every request to a node needs a credential. A probe starts its nodes as the desktop app starts its own node: with a
// launch owner credential in the node's environment, and it attaches that credential to its own requests itself.
//
// - `probeNodeEnvironment()`: the node's launch credential, for the environment of each `dist/app.js` the probe starts.
//   Every node of one probe gets the same credential, so one browser context can carry it to all of them.
//   `withNodeCredential(env)` is that environment merged into `env`.
// - `attachToProbeProcess()`: the probe process's own `fetch` and `http.request` (which the `ws` client uses) carry the
//   credential to loopback nodes, unless the request already carries one (test-support/node-access, as server suites do).
//   Node's built-in `WebSocket` is not covered: use `ownerSocketUrl`.
// - `ownerHeaders()`: the `authorization` header of the probe's own HTTP calls (GraphQL, REST, health).
// - `ownerSocketUrl(url)`: a WebSocket URL with the browser WebSocket credential (`access_token`), for the probe's own
//   sockets (Node's built-in `WebSocket` cannot set a header).
// - `attachToBrowserContext(context)`: the desktop window's browser context sends the credential on every request it
//   makes to the probe's nodes (HTTP and WebSocket upgrades), standing in for the desktop's main process, which
//   attaches each node's credential (`electron/nodeAccess/nodeCredentialAttacher.ts`). Never on a phone context: a
//   phone carries its own credential.
// - `pairNodes(...)`: pairs two nodes by invite, as the Nodes page does (design DS-004).
//
// Test code only. The credential is never written to evidence: `redactCredentials` removes it from text.
import { randomBytes } from 'node:crypto';
import { attachOwnerCredentialToLoopback } from '../../../../test-support/node-access/owner-credential-attachment.mjs';

const credential = `own_${randomBytes(32).toString('base64url')}`;

export const probeNodeEnvironment = () => ({ AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: credential });

export const withNodeCredential = (env) => ({ ...env, ...probeNodeEnvironment() });

export const attachToProbeProcess = () => attachOwnerCredentialToLoopback(credential);

export const ownerHeaders = (headers = {}) => ({ ...headers, authorization: `Bearer ${credential}` });

export const ownerSocketUrl = (url) => {
  const target = new URL(url);
  target.searchParams.set('access_token', credential);
  return target.toString();
};

const LOOPBACK = /^(?:https?|wss?):\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//;

export const attachToBrowserContext = async (context) => {
  await context.setExtraHTTPHeaders({ authorization: `Bearer ${credential}` });
  // The credential never leaves this computer: requests to other hosts (icon CDNs) go without it.
  await context.route((url) => !LOOPBACK.test(url.href), (route) => {
    const headers = { ...route.request().headers() };
    delete headers.authorization;
    return route.fallback({ headers });
  });
};

/** Replaces every node credential, peer secret, peer invite and phone credential in `text`. */
export const redactCredentials = (text) => String(text)
  .split(credential).join('own_…')
  .replace(/\b(own|mra|mhub|mcpg)_[A-Za-z0-9_-]{20,}/g, '$1_…')
  .replace(/access_token=[^&\s"']+/g, 'access_token=…')
  .replace(/("grant"\s*:\s*")[^"]*"/g, '$1…"');

/**
 * Pairs two nodes the probe controls in one click (autobyteus-661 contract §3): the granting node makes a grant for an
 * `own` node it names `askerName`; the asking node pairs with it at `granter.address` and names it `granterName`; the
 * granting node keeps the first of the asking node's addresses that answers as it. `granter.gql` and `asker.gql` are
 * owner GraphQL calls returning `data`. Returns the asking node's new peer row.
 */
export const pairNodes = async ({ granter, asker, granterName, askerName }) => {
  const granted = await granter.gql('mutation($n: String) { createPairingGrant(relation: "own", nameForAsker: $n) { grant } }', { n: askerName });
  const paired = await asker.gql(
    'mutation($address: String!, $grant: String, $name: String) { pairWithNode(address: $address, grant: $grant, name: $name) { state peer { nodeId name address paired } } }',
    { address: granter.address, grant: granted.createPairingGrant.grant, name: granterName },
  );
  if (paired.pairWithNode?.state !== 'paired') throw new Error(`pairing ${granterName} and ${askerName} did not pair`);
  return paired.pairWithNode.peer;
};
