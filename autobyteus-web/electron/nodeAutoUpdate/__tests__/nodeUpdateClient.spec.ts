import * as http from 'http';
import type { AddressInfo } from 'net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNodeUpdateClient, type NodeUpdateFetch } from '../nodeUpdateClient';

const STATUS = { inPlaceUpdate: 'available', version: '1.5.0', target: { version: '1.6.0', relation: 'newer' } };
const respond = (status: number, body: unknown): ReturnType<NodeUpdateFetch> =>
  Promise.resolve({ status, json: async () => body });
const noCredential = () => null;

describe('nodeUpdateClient (C1)', () => {
  let server: http.Server | null = null;
  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  });

  it('asks GET {baseUrl}/rest/node-update?target=V and returns the C1 status', async () => {
    const fetch = vi.fn<NodeUpdateFetch>(() => respond(200, STATUS));
    const client = createNodeUpdateClient({ fetch, credentialFor: noCredential });
    expect(await client.getStatus('http://node.test:8000/', '1.6.0-beta.1')).toEqual(STATUS);
    expect(fetch.mock.calls[0]![0]).toBe('http://node.test:8000/rest/node-update?target=1.6.0-beta.1');
    expect(fetch.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('NAS-03 C1 is an owner route: both requests carry this desktop\'s owner credential for the node (autobyteus-437)', async () => {
    const fetch = vi.fn<NodeUpdateFetch>(() => respond(202, { accepted: true }));
    const client = createNodeUpdateClient({ fetch, credentialFor: (baseUrl) => (baseUrl === 'http://node.test' ? 'own_node_credential' : null) });
    await client.getStatus('http://node.test', '1.6.0');
    await client.requestUpdate('http://node.test', '1.6.0');
    expect(fetch.mock.calls[0]![1]?.headers).toEqual({ authorization: 'Bearer own_node_credential' });
    expect(fetch.mock.calls[1]![1]?.headers).toEqual({ 'content-type': 'application/json', authorization: 'Bearer own_node_credential' });
  });

  it('returns null for an answer that is not a C1 status, or a network error', async () => {
    expect(await createNodeUpdateClient({ credentialFor: noCredential, fetch: () => respond(404, { error: 'not found' }) }).getStatus('http://n', '1.6.0')).toBeNull();
    expect(await createNodeUpdateClient({ credentialFor: noCredential, fetch: () => Promise.reject(new Error('ECONNREFUSED')) }).getStatus('http://n', '1.6.0')).toBeNull();
  });

  it('POSTs { version }: 202 accepted is the only attempt', async () => {
    const fetch = vi.fn<NodeUpdateFetch>(() => respond(202, { accepted: true }));
    expect(await createNodeUpdateClient({ fetch, credentialFor: noCredential }).requestUpdate('http://node.test', '1.6.0')).toEqual({ kind: 'accepted' });
    expect(fetch.mock.calls[0]![0]).toBe('http://node.test/rest/node-update');
    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: JSON.stringify({ version: '1.6.0' }) });
  });

  it('409 is a refusal with the node code and message; an unknown answer says its HTTP status', async () => {
    expect(await createNodeUpdateClient({ credentialFor: noCredential, fetch: () => respond(409, { refused: 'UPDATE_RUNNING', message: 'An update is running.' }) })
      .requestUpdate('http://n', '1.6.0')).toEqual({ kind: 'refused', code: 'UPDATE_RUNNING', message: 'An update is running.' });
    expect(await createNodeUpdateClient({ credentialFor: noCredential, fetch: () => respond(202, {}) }).requestUpdate('http://n', '1.6.0'))
      .toEqual({ kind: 'refused', code: null, message: 'HTTP 202' });
  });

  it('a network error is not delivered', async () => {
    expect(await createNodeUpdateClient({ credentialFor: noCredential, fetch: () => Promise.reject(new Error('ECONNREFUSED')) }).requestUpdate('http://n', '1.6.0'))
      .toEqual({ kind: 'not-delivered', message: 'ECONNREFUSED' });
  });

  it('gives up on a node that does not answer within the timeout (real fetch)', async () => {
    server = http.createServer(() => { /* never answers */ });
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const client = createNodeUpdateClient({ timeoutMs: 200, credentialFor: noCredential });
    const started = Date.now();
    expect(await client.getStatus(baseUrl, '1.6.0')).toBeNull();
    expect((await client.requestUpdate(baseUrl, '1.6.0')).kind).toBe('not-delivered');
    expect(Date.now() - started).toBeLessThan(5_000);
    server.closeAllConnections();
  });
});
