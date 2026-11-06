import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NodeEndpoints } from '~/types/node';
import { deriveNodeEndpoints } from '~/utils/nodeEndpoints';
import { fetchNodeDesktop, nodeDesktopStreamUrl } from '~/utils/nodeDesktopClient';

const fetchSpy = vi.hoisted(() => vi.fn());
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ authorizedFetch: fetchSpy }));

const endpoints = (base: string): NodeEndpoints => deriveNodeEndpoints(base);

describe('nodeDesktopClient', () => {
  afterEach(() => fetchSpy.mockReset());

  it('derives the stream endpoint from the node base URL (ws and wss)', () => {
    expect(endpoints('http://192.168.1.20:8001').nodeDesktopWs).toBe('ws://192.168.1.20:8001/ws/node-desktop');
    expect(endpoints('https://node.tailnet.ts.net').nodeDesktopWs).toBe('wss://node.tailnet.ts.net/ws/node-desktop');
  });

  it('builds the stream URL with the mode, and the access token only when there is a credential', () => {
    const node = endpoints('http://node-a.example:8001');
    expect(nodeDesktopStreamUrl(node, 'view', null)).toBe('ws://node-a.example:8001/ws/node-desktop?mode=view');
    expect(nodeDesktopStreamUrl(node, 'control', 'mra_phone'))
      .toBe('ws://node-a.example:8001/ws/node-desktop?mode=control&access_token=mra_phone');
  });

  it('asks the node whether it has a node desktop', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }));
    await expect(fetchNodeDesktop(endpoints('http://node-a.example:8001'))).resolves.toEqual({ available: true });
    expect(fetchSpy).toHaveBeenCalledWith('http://node-a.example:8001/rest/node-desktop');

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ available: false }), { status: 200 }));
    await expect(fetchNodeDesktop(endpoints('http://node-a.example:8001'))).resolves.toEqual({ available: false });
  });

  it('fails when the node does not answer 200', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('missing', { status: 404 }));
    await expect(fetchNodeDesktop(endpoints('http://node-a.example:8001'))).rejects.toThrow('404');
  });
});
