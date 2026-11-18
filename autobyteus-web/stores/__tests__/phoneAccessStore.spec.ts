import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { NodeNetwork } from '~/types/remoteAccess';
import { usePhoneAccessStore } from '../phoneAccessStore';

// Synthetic nodes, addresses and IDs; none belongs to a real machine.
const DESKTOP_NODE_ID = 'srv_desktop_00000000000000000000000000000000';
const DOCKER_NODE_ID = 'srv_docker_000000000000000000000000000000000';

const { apiServiceMock, windowContext, nodeEntries } = vi.hoisted(() => ({
  apiServiceMock: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  windowContext: { entryId: 'embedded-local', isEmbeddedWindow: true, nodeBaseUrl: 'http://127.0.0.1:29695' },
  nodeEntries: [] as Array<{ id: string; name: string; baseUrl: string; nodeType: 'embedded' | 'remote'; createdAt: string; updatedAt: string }>,
}));

vi.mock('~/services/api', () => ({ default: apiServiceMock }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => windowContext }));
vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => ({
    nodes: nodeEntries,
    getEntryById: (id: string) => nodeEntries.find((entry) => entry.id === id) ?? null,
  }),
}));

const desktopNetwork = (overrides: Partial<NodeNetwork> = {}): NodeNetwork => ({
  computerName: 'Test Computer',
  runsInContainer: false,
  configuredBaseUrl: null,
  tailscale: { address: '100.101.102.103', dnsName: 'desktop.example-tailnet.ts.net' },
  vpnAddresses: [],
  localNetwork: { networkId: 'gw_0123456789abcdef', addresses: ['192.168.1.20'], allowed: false },
  ...overrides,
});

const dockerNetwork: NodeNetwork = {
  computerName: 'container',
  runsInContainer: true,
  configuredBaseUrl: null,
  tailscale: null,
  vpnAddresses: [],
  localNetwork: { networkId: 'this-computer', addresses: [], allowed: false },
};

type FetchAnswer = { status?: number; body: unknown };
let fetchAnswers: Record<string, FetchAnswer> = {};
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const answer = fetchAnswers[`${init?.method ?? 'GET'} ${url}`] ?? fetchAnswers[url];
  if (!answer) throw new TypeError(`unreachable ${url}`);
  return { ok: (answer.status ?? 200) < 400, status: answer.status ?? 200, json: async () => answer.body };
});

const statusAt = (baseUrl: string, nodeId: string): void => {
  fetchAnswers[`${baseUrl}/rest/remote-access/status`] = { body: { phoneAccessEnabled: true, pairingAvailable: true, nodeId } };
};

const SESSION_ID = 'pss_00000000000000000000000000000001';

const mockWindowNode = (input: { network: NodeNetwork; nodeId: string; phoneAccessEnabled?: boolean }) => {
  apiServiceMock.get.mockImplementation(async (url: string) => {
    if (url === '/remote-access/settings') return { data: { settings: { phoneAccessEnabled: input.phoneAccessEnabled ?? true, updatedAt: '' } } };
    if (url === '/remote-access/status') return { data: { phoneAccessEnabled: true, pairingAvailable: true, nodeId: input.nodeId } };
    if (url === '/remote-access/network') return { data: { network: input.network } };
    if (url === '/remote-access/devices' || url === '/remote-access/devices/revoked') return { data: { devices: [] } };
    throw new Error(`unexpected GET ${url}`);
  });
  apiServiceMock.put.mockImplementation(async (url: string, body: { phoneAccessEnabled?: boolean }) => (
    url === '/remote-access/settings'
      ? { data: { settings: { phoneAccessEnabled: body.phoneAccessEnabled, updatedAt: '' } } }
      : { data: {} }
  ));
  apiServiceMock.post.mockImplementation(async (_url: string, body: { serverBaseUrl: string; serverName: string }) => ({
    data: {
      sessionId: SESSION_ID,
      qrText: `${body.serverBaseUrl}/mobile?pairing=sample`,
      mobileUrl: `${body.serverBaseUrl}/mobile?pairing=sample`,
      payload: {
        version: 1,
        serverBaseUrl: body.serverBaseUrl,
        pairingCode: 'sample',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        serverName: body.serverName,
      },
    },
  }));
  apiServiceMock.delete.mockResolvedValue({ data: null });
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  fetchAnswers = {};
  vi.stubGlobal('fetch', fetchMock);
  Object.assign(windowContext, { entryId: 'embedded-local', isEmbeddedWindow: true, nodeBaseUrl: 'http://127.0.0.1:29695' });
  nodeEntries.splice(0, nodeEntries.length,
    { id: 'embedded-local', name: 'Embedded Node', baseUrl: 'http://127.0.0.1:29695', nodeType: 'embedded', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '' },
    { id: 'docker-1', name: 'Docker node 1', baseUrl: 'http://localhost:8001', nodeType: 'remote', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '' },
  );
});

describe('phoneAccessStore — desktop node', () => {
  it('checks every address by node ID, pre-selects the best ready way and names the node after this computer', async () => {
    mockWindowNode({ network: desktopNetwork(), nodeId: DESKTOP_NODE_ID });
    statusAt('http://100.101.102.103:29695', DESKTOP_NODE_ID);
    statusAt('http://192.168.1.20:29695', DESKTOP_NODE_ID);
    // The https name answers for another node: it is not this node's address.
    statusAt('https://desktop.example-tailnet.ts.net', 'srv_other_0000000000000000000000000000000000');

    const store = usePhoneAccessStore();
    await store.load();

    expect(store.readiness.tailscale).toEqual({ ready: true, address: 'http://100.101.102.103:29695' });
    expect(store.readiness.local_network).toEqual({ ready: true, address: 'http://192.168.1.20:29695' });
    expect(store.readiness.vpn.ready).toBe(false);
    expect(store.recommendedWay).toBe('tailscale');
    expect(store.selectedWay).toBe('tailscale');
    expect(store.tailscaleHttpsReady).toBe(false);
    expect(store.nodeName).toBe('Test Computer');
    expect(store.blockedReason).toBeNull();
  });

  it('turns phone access on, then makes a code for the way with its checked address and the acknowledgement', async () => {
    mockWindowNode({ network: desktopNetwork(), nodeId: DESKTOP_NODE_ID, phoneAccessEnabled: false });
    statusAt('https://desktop.example-tailnet.ts.net', DESKTOP_NODE_ID);
    const store = usePhoneAccessStore();
    await store.load();
    expect(store.tailscaleHttpsReady).toBe(true);

    await store.showCode();

    expect(apiServiceMock.put).toHaveBeenCalledWith('/remote-access/settings', { phoneAccessEnabled: true });
    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', {
      serverBaseUrl: 'https://desktop.example-tailnet.ts.net',
      serverName: 'Test Computer',
      connectionWay: 'tailscale',
      trustedPrivateHttpAcknowledged: true,
    });
    expect(store.phoneAccessEnabled).toBe(true);
    expect(store.codePhase).toBe('shown');
    expect(store.code).toMatchObject({ way: 'tailscale', sessionId: SESSION_ID });
  });

  it('records the local-network answer on the first press, then sends the acknowledgement; forgetting asks again', async () => {
    mockWindowNode({ network: desktopNetwork({ tailscale: null }), nodeId: DESKTOP_NODE_ID });
    statusAt('http://192.168.1.20:29695', DESKTOP_NODE_ID);
    const store = usePhoneAccessStore();
    await store.load();
    expect(store.selectedWay).toBe('local_network');
    expect(store.localNetworkAllowed).toBe(false);

    await store.showCode();

    expect(apiServiceMock.put).toHaveBeenCalledWith('/remote-access/network/local-networks/gw_0123456789abcdef', { allowed: true });
    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', expect.objectContaining({
      serverBaseUrl: 'http://192.168.1.20:29695',
      connectionWay: 'local_network',
      trustedPrivateHttpAcknowledged: true,
    }));
    expect(store.localNetworkAllowed).toBe(true);

    await store.forgetLocalNetwork();
    expect(apiServiceMock.delete).toHaveBeenCalledWith(`/remote-access/pairing-sessions/${SESSION_ID}`);
    expect(apiServiceMock.put).toHaveBeenCalledWith('/remote-access/network/local-networks/gw_0123456789abcdef', { allowed: false });
    expect(store.localNetworkAllowed).toBe(false);
    expect(store.codePhase).toBe('none');
  });

  it('discards the shown code on the node when the tab changes, and forgets it locally when phone access turns off', async () => {
    mockWindowNode({ network: desktopNetwork(), nodeId: DESKTOP_NODE_ID });
    statusAt('http://100.101.102.103:29695', DESKTOP_NODE_ID);
    const store = usePhoneAccessStore();
    await store.load();
    await store.showCode();

    store.selectWay('vpn');
    await vi.waitFor(() => expect(apiServiceMock.delete).toHaveBeenCalledWith(`/remote-access/pairing-sessions/${SESSION_ID}`));
    expect(store.code).toBeNull();

    store.selectWay('tailscale');
    await store.showCode();
    await store.setPhoneAccessEnabled(false);
    expect(store.code).toBeNull();
    expect(store.codePhase).toBe('none');
  });

  it('marks a shown code expired, and "New code" makes another for the same way', async () => {
    mockWindowNode({ network: desktopNetwork(), nodeId: DESKTOP_NODE_ID });
    statusAt('http://100.101.102.103:29695', DESKTOP_NODE_ID);
    const store = usePhoneAccessStore();
    await store.load();
    await store.showCode();
    store.markCodeExpired();
    expect(store.codePhase).toBe('expired');

    await store.newCode();
    expect(apiServiceMock.post).toHaveBeenCalledTimes(2);
    expect(store.codePhase).toBe('shown');
  });

  it('says so when this computer has no network a phone could use', async () => {
    mockWindowNode({ network: desktopNetwork({ tailscale: null, localNetwork: null }), nodeId: DESKTOP_NODE_ID });
    const store = usePhoneAccessStore();
    await store.load();
    expect(store.recommendedWay).toBeNull();
    expect(store.blockedReason).toBe('no_network');
    expect(store.selectedWay).toBe('tailscale');
  });

  it('refuses a typed address that does not reach this node, and uses one that does', async () => {
    mockWindowNode({ network: desktopNetwork(), nodeId: DESKTOP_NODE_ID });
    statusAt('https://elsewhere.example.com', 'srv_other_0000000000000000000000000000000000');
    statusAt('https://node.example.com', DESKTOP_NODE_ID);
    const store = usePhoneAccessStore();
    await store.load();
    store.selectWay('company_address');

    await store.useTypedAddress('https://elsewhere.example.com');
    expect(store.typedAddressError).toEqual({ kind: 'not_this_node' });
    expect(apiServiceMock.post).not.toHaveBeenCalled();

    await store.useTypedAddress('https://node.example.com/');
    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', expect.objectContaining({
      serverBaseUrl: 'https://node.example.com',
      connectionWay: 'company_address',
      trustedPrivateHttpAcknowledged: true,
    }));
    expect(store.code).toMatchObject({ typed: true, address: 'https://node.example.com' });
  });
});

describe('phoneAccessStore — local Docker node', () => {
  beforeEach(() => {
    Object.assign(windowContext, { entryId: 'docker-1', isEmbeddedWindow: false, nodeBaseUrl: 'http://localhost:8001' });
    fetchAnswers['http://127.0.0.1:29695/rest/remote-access/network'] = { body: { network: desktopNetwork() } };
  });

  it("composes this computer's addresses with the node's published port and checks them against the Docker node", async () => {
    mockWindowNode({ network: dockerNetwork, nodeId: DOCKER_NODE_ID });
    statusAt('http://100.101.102.103:8001', DOCKER_NODE_ID);
    statusAt('http://192.168.1.20:8001', DOCKER_NODE_ID);
    const store = usePhoneAccessStore();
    await store.load();

    expect(store.kind).toBe('local_container');
    expect(store.readiness.tailscale.address).toBe('http://100.101.102.103:8001');
    expect(store.readiness.local_network.address).toBe('http://192.168.1.20:8001');
    expect(fetchMock).toHaveBeenCalledWith('https://desktop.example-tailnet.ts.net:8443/rest/remote-access/status', expect.anything());
    expect(store.tailscaleServeHttpsPort).toBe(8443);
    expect(store.nodeName).toBe('Docker node 1');
  });

  it("keeps the local-network answer on this computer's embedded node", async () => {
    mockWindowNode({ network: dockerNetwork, nodeId: DOCKER_NODE_ID });
    statusAt('http://192.168.1.20:8001', DOCKER_NODE_ID);
    fetchAnswers['PUT http://127.0.0.1:29695/rest/remote-access/network/local-networks/gw_0123456789abcdef'] = { body: { allowed: true } };
    const store = usePhoneAccessStore();
    await store.load();
    store.selectWay('local_network');

    await store.showCode();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:29695/rest/remote-access/network/local-networks/gw_0123456789abcdef',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ allowed: true }) }),
    );
    expect(apiServiceMock.put).not.toHaveBeenCalledWith(expect.stringContaining('local-networks'), expect.anything());
    expect(store.codePhase).toBe('shown');
  });

  it("says the node isn't reachable from other devices when no host address reaches it", async () => {
    mockWindowNode({ network: dockerNetwork, nodeId: DOCKER_NODE_ID });
    const store = usePhoneAccessStore();
    await store.load();
    expect(store.blockedReason).toBe('docker_unpublished');
  });
});
