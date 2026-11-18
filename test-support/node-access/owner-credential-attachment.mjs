import { randomBytes } from 'node:crypto';
import http from 'node:http';

/**
 * Test-owned nodes need a credential on every request (node access model NA-1). A test acts as the desktop app
 * does for its own node: it creates a launch credential, hands it to the node it starts, and attaches it to its
 * requests to that node. This module attaches it the way the desktop's main process does, below the code under
 * test: `fetch` and Node's `http.request` (which the `ws` client uses for its upgrades) get
 * `Authorization: Bearer <credential>` for the node's loopback port, unless the request already carries a credential
 * (an `Authorization` header, a peer signature as one node sends another, or the browser WebSocket credential
 * `access_token` in its query, as a phone sends it).
 * The server test setup (`autobyteus-server-ts/tests/setup/test-launch-credential.ts`) installs it before any test
 * code runs, so a `fetch` a test keeps is already the attached one; it attaches nothing until a port or the loopback
 * credential is registered. Test code only; never a production path.
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const credentialsByPort = new Map();
/** The credential for loopback ports without their own (suites that start built servers on ports they learn later). */
let loopbackCredential = null;
let installed = false;

/** A fresh owner credential in the node's format (`own_` + 32 random bytes). */
export const createTestOwnerCredential = () => `own_${randomBytes(32).toString('base64url')}`;

const carriesQueryCredential = (pathOrUrl) => /[?&]access_token=/.test(String(pathOrUrl ?? ''));
const PEER_SIGNATURE_HEADER = 'x-autobyteus-peer-signature';
const AUTHORIZATION_HEADER = 'authorization';
const carriesHeaderCredential = (names) => names.some((name) => {
  const lower = name.toLowerCase();
  return lower === AUTHORIZATION_HEADER || lower === PEER_SIGNATURE_HEADER;
});

const credentialForUrl = (url) => {
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (carriesQueryCredential(url.search)) return null;
  const port = url.port || (url.protocol === 'https:' || url.protocol === 'wss:' ? '443' : '80');
  return credentialsByPort.get(port) ?? loopbackCredential;
};

/**
 * Patches `fetch` and `http.request` so they attach registered credentials. Idempotent; the attach functions call it
 * too, for processes that have no server test setup (web probes).
 */
export const installOwnerCredentialAttachment = () => {
  if (installed) return;
  installed = true;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const target = input instanceof Request ? input.url : String(input);
    let credential = null;
    try { credential = credentialForUrl(new URL(target)); } catch { credential = null; }
    if (!credential) return originalFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (carriesHeaderCredential([...headers.keys()])) return originalFetch(input, init);
    headers.set(AUTHORIZATION_HEADER, `Bearer ${credential}`);
    return originalFetch(input, { ...init, headers });
  };

  const originalRequest = http.request;
  http.request = function requestWithOwnerCredential(...args) {
    const [first, second] = args;
    const options = typeof first === 'string' || first instanceof URL
      ? (second && typeof second === 'object' && !(typeof second === 'function') ? second : null)
      : first;
    const target = typeof first === 'string' || first instanceof URL ? new URL(String(first)) : null;
    const hostname = String(options?.hostname ?? options?.host ?? target?.hostname ?? '').replace(/:\d+$/, '');
    const port = String(options?.port ?? target?.port ?? '80');
    const requestPath = options?.path ?? (target ? `${target.pathname}${target.search}` : '');
    const credential = LOOPBACK_HOSTS.has(hostname.toLowerCase()) && !carriesQueryCredential(requestPath)
      ? credentialsByPort.get(port) ?? loopbackCredential
      : null;
    if (credential) {
      if (options) {
        const headers = { ...(options.headers ?? {}) };
        if (!carriesHeaderCredential(Object.keys(headers))) headers.authorization = `Bearer ${credential}`;
        options.headers = headers;
      } else {
        args.splice(1, 0, { headers: { authorization: `Bearer ${credential}` } });
      }
    }
    return originalRequest.apply(this, args);
  };
};

/**
 * Attaches `credential` to this process's requests to the test-owned node at `baseUrl` (a loopback URL). Returns
 * the function that stops attaching it.
 */
export const attachOwnerCredential = (baseUrl, credential) => {
  installOwnerCredentialAttachment();
  const url = new URL(baseUrl);
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  credentialsByPort.set(port, credential);
  return () => {
    if (credentialsByPort.get(port) === credential) credentialsByPort.delete(port);
  };
};

/**
 * Attaches `credential` to this process's requests to every loopback port that has no credential of its own: for a
 * suite whose built servers all start with this launch credential on ports it learns from their output. Returns the
 * function that stops attaching it.
 */
export const attachOwnerCredentialToLoopback = (credential) => {
  installOwnerCredentialAttachment();
  loopbackCredential = credential;
  return () => {
    if (loopbackCredential === credential) loopbackCredential = null;
  };
};
