import { randomBytes } from 'node:crypto';
import http from 'node:http';

/**
 * Test-owned nodes need a credential on every request (node access model NA-1). A test acts as the desktop app
 * does for its own node: it creates a launch credential, hands it to the node it starts, and attaches it to its
 * requests to that node. This module attaches it the way the desktop's main process does, below the code under
 * test: `fetch` and Node's `http.request` (which the `ws` client uses for its upgrades) get
 * `Authorization: Bearer <credential>` for the node's loopback port, unless the request already carries a credential
 * (an `Authorization` header, or the browser WebSocket credential `access_token` in its query, as a phone sends it).
 * Test code only; never a production path.
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const credentialsByPort = new Map();
let installed = false;

/** A fresh owner credential in the node's format (`own_` + 32 random bytes). */
export const createTestOwnerCredential = () => `own_${randomBytes(32).toString('base64url')}`;

const carriesQueryCredential = (pathOrUrl) => /[?&]access_token=/.test(String(pathOrUrl ?? ''));

const credentialForUrl = (url) => {
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (carriesQueryCredential(url.search)) return null;
  const port = url.port || (url.protocol === 'https:' || url.protocol === 'wss:' ? '443' : '80');
  return credentialsByPort.get(port) ?? null;
};

const install = () => {
  if (installed) return;
  installed = true;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const target = input instanceof Request ? input.url : String(input);
    let credential = null;
    try { credential = credentialForUrl(new URL(target)); } catch { credential = null; }
    if (!credential) return originalFetch(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('authorization')) headers.set('authorization', `Bearer ${credential}`);
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
      ? credentialsByPort.get(port)
      : null;
    if (credential) {
      if (options) {
        const headers = { ...(options.headers ?? {}) };
        if (!Object.keys(headers).some((name) => name.toLowerCase() === 'authorization')) {
          headers.authorization = `Bearer ${credential}`;
        }
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
  install();
  const url = new URL(baseUrl);
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  credentialsByPort.set(port, credential);
  return () => {
    if (credentialsByPort.get(port) === credential) credentialsByPort.delete(port);
  };
};
