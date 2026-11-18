// Loaded into a probe's own backend with `node --import <this file> dist/app.js` (projects-feature-probe.mjs).
// Keeps the node offline: every fetch to a host other than 127.0.0.1 or localhost fails as a network error, as with no
// network, so nothing the node does depends on an outside service (meaning search cannot download its model and
// reports itself unavailable). Each refused host is appended to $OUTSIDE_NETWORK_LOG, one line per request.
import fs from 'node:fs';

const log = process.env.OUTSIDE_NETWORK_LOG;
const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const host = new URL(url).hostname;
  if (host === '127.0.0.1' || host === 'localhost') return realFetch(input, init);
  if (log) fs.appendFileSync(log, `${host}\n`);
  throw new TypeError(`fetch failed: the probe node has no outside network (${host})`);
};
