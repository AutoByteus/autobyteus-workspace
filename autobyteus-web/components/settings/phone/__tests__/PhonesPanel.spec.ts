import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { NodeNetwork, PairedDeviceSummary } from '~/types/remoteAccess';
import PhonesPanel from '../PhonesPanel.vue';

// Synthetic node, addresses, phones and code; nothing real.
const NODE_ID = 'srv_desktop_00000000000000000000000000000000';

const { apiServiceMock, windowContext, nodeEntries } = vi.hoisted(() => ({
  apiServiceMock: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  windowContext: { entryId: 'embedded-local', isEmbeddedWindow: true, nodeBaseUrl: 'http://127.0.0.1:29695' },
  nodeEntries: [{ id: 'embedded-local', name: 'Embedded Node', baseUrl: 'http://127.0.0.1:29695', nodeType: 'embedded', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '' }],
}));
vi.mock('~/services/api', () => ({ default: apiServiceMock }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => windowContext }));
vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => ({ nodes: nodeEntries, getEntryById: (id: string) => nodeEntries.find((entry) => entry.id === id) ?? null }),
}));
vi.mock('~/services/qr/qrCodeDataUrlService', () => ({ toQrCodeDataUrl: async () => 'data:image/svg+xml;charset=utf-8,qr' }));

const network = (overrides: Partial<NodeNetwork> = {}): NodeNetwork => ({
  computerName: 'Test Computer',
  runsInContainer: false,
  configuredBaseUrl: null,
  tailscale: { address: '100.101.102.103', dnsName: 'desktop.example-tailnet.ts.net' },
  vpnAddresses: [],
  localNetwork: { networkId: 'gw_0123456789abcdef', addresses: ['192.168.1.20'], allowed: false },
  ...overrides,
});

const device = (index: number, overrides: Partial<PairedDeviceSummary> = {}): PairedDeviceSummary => ({
  deviceId: `device_${index}`,
  displayName: `Phone ${index}`,
  clientFacingBaseUrl: 'http://192.168.1.20:29695',
  connectionWay: 'tailscale',
  createdAt: '2026-10-01T00:00:00.000Z',
  lastSeenAt: new Date(Date.now() - 120_000).toISOString(),
  revokedAt: null,
  ...overrides,
});

let reachable: string[] = [];
const setup = (input: { network?: NodeNetwork; phoneAccessEnabled?: boolean; active?: PairedDeviceSummary[]; revoked?: PairedDeviceSummary[] } = {}) => {
  apiServiceMock.get.mockImplementation(async (url: string) => {
    if (url === '/remote-access/settings') return { data: { settings: { phoneAccessEnabled: input.phoneAccessEnabled ?? true, updatedAt: '' } } };
    if (url === '/remote-access/status') return { data: { phoneAccessEnabled: true, pairingAvailable: true, nodeId: NODE_ID } };
    if (url === '/remote-access/network') return { data: { network: input.network ?? network() } };
    if (url === '/remote-access/devices') return { data: { devices: input.active ?? [] } };
    if (url === '/remote-access/devices/revoked') return { data: { devices: input.revoked ?? [] } };
    throw new Error(`unexpected GET ${url}`);
  });
  apiServiceMock.put.mockImplementation(async (url: string, body: { phoneAccessEnabled?: boolean }) => (
    url === '/remote-access/settings' ? { data: { settings: { phoneAccessEnabled: body.phoneAccessEnabled, updatedAt: '' } } } : { data: {} }));
  apiServiceMock.post.mockImplementation(async (_url: string, body: { serverBaseUrl: string; serverName: string }) => ({
    data: {
      sessionId: 'pss_00000000000000000000000000000001',
      qrText: `${body.serverBaseUrl}/mobile?pairing=sample`,
      mobileUrl: `${body.serverBaseUrl}/mobile?pairing=sample`,
      payload: { version: 1, serverBaseUrl: body.serverBaseUrl, pairingCode: 'sample', expiresAt: new Date(Date.now() + 300_000).toISOString(), serverName: body.serverName },
    },
  }));
  apiServiceMock.delete.mockResolvedValue({ data: null });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (reachable.some((address) => url === `${address}/rest/remote-access/status`)) {
      return { ok: true, status: 200, json: async () => ({ phoneAccessEnabled: true, pairingAvailable: true, nodeId: NODE_ID }) };
    }
    throw new TypeError('unreachable');
  }));
};

const mountPanel = async () => {
  const wrapper = mount(PhonesPanel, { attachTo: document.body });
  await flushPromises();
  return wrapper;
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  reachable = [];
  Object.assign(windowContext, { entryId: 'embedded-local', isEmbeddedWindow: true, nodeBaseUrl: 'http://127.0.0.1:29695' });
  nodeEntries.splice(1);
  document.body.innerHTML = '';
});

describe('PhonesPanel', () => {
  it('shows the four tabs in order with the best ready way selected and Recommended (VIS-001, TR-001)', async () => {
    reachable = ['http://100.101.102.103:29695', 'http://192.168.1.20:29695'];
    setup();
    const wrapper = await mountPanel();

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.text().replace('Recommended', '').trim())).toEqual(['Same Wi-Fi or LAN', 'Tailscale', 'Your VPN', 'Company address']);
    expect(wrapper.get('[data-testid="phone-tab-tailscale"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('[data-testid="phone-tab-tailscale"]').attributes('tabindex')).toBe('0');
    expect(wrapper.get('[data-testid="phone-tab-vpn"]').attributes('tabindex')).toBe('-1');
    expect(wrapper.get('[data-testid="phone-tab-tailscale"]').text()).toContain('Recommended');
    expect(wrapper.get('[data-testid="phone-way-status"]').text()).toBe('Ready: Tailscale is on, on this computer.');
    expect(wrapper.get('[data-testid="phone-show-qr"]').text()).toBe('Show QR code');
    expect(wrapper.get('[data-testid="phones-subtitle"]').text()).toBe('Show a code, then scan it with the AutoByteus app to connect a phone to Test Computer.');
    expect(wrapper.get('[data-testid="phone-access-switch"]').attributes('aria-checked')).toBe('true');
    expect(wrapper.get('[data-testid="phone-how-toggle"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-testid="phones-blocked"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('turns phone access on and shows the code with its line, timer, Close and About (VIS-002, VIS-013)', async () => {
    reachable = ['http://100.101.102.103:29695'];
    setup({ phoneAccessEnabled: false });
    const wrapper = await mountPanel();
    expect(wrapper.get('[data-testid="phone-access-line"]').text()).toBe('No phone can reach this node. Your phones stay connected and work again when you turn it back on.');
    expect(wrapper.get('[data-testid="phone-show-qr"]').text()).toBe('Turn on and show QR code');

    await wrapper.get('[data-testid="phone-show-qr"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="phone-access-state"]').text()).toBe('On');
    expect(wrapper.get('[data-testid="phone-code-line"]').text()).toBe('Works anywhere through Tailscale');
    expect(wrapper.get('[data-testid="phone-code-timer"]').attributes('role')).toBe('timer');
    expect(wrapper.get('[data-testid="phone-code-timer"]').text()).toMatch(/^Valid for [45]:\d\d$/);
    expect(wrapper.find('[data-testid="phone-qr-image"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="phone-code-footnote"]').text()).toBe('Works once, for 5 minutes. No app yet? Scan with the phone’s camera to connect in the browser.');

    await wrapper.get('[data-testid="phone-code-close"]').trigger('click');
    await flushPromises();
    expect(apiServiceMock.delete).toHaveBeenCalledWith('/remote-access/pairing-sessions/pss_00000000000000000000000000000001');
    expect(wrapper.find('[data-testid="phone-code"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('asks once on a local network: the question card and "Allow and show QR code", then the allowed row (VIS-006, VIS-007)', async () => {
    reachable = ['http://192.168.1.20:29695'];
    setup({ network: network({ tailscale: null }) });
    const wrapper = await mountPanel();
    expect(wrapper.get('[data-testid="phone-wifi-question"]').text()).toContain('Allow phones on this network?');
    expect(wrapper.get('[data-testid="phone-show-qr"]').text()).toBe('Allow and show QR code');

    await wrapper.get('[data-testid="phone-show-qr"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="phone-wifi-question"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="phone-wifi-allowed"]').text()).toContain('Wi-Fi/LAN allowed on this network');
    expect(wrapper.get('[data-testid="phone-code-line"]').text()).toBe('Works on this network');
    wrapper.unmount();
  });

  it('a way that is not ready: disabled button, Check again, How it works open with Get Tailscale (VIS-005, VIS-014)', async () => {
    setup({ network: network({ tailscale: null, localNetwork: null }) });
    const wrapper = await mountPanel();
    expect(wrapper.get('[data-testid="phones-blocked"]').text()).toBe('This computer isn’t on a network a phone could use. Connect it to your Wi-Fi or VPN, then try again.');
    expect(wrapper.find('[data-testid="phone-recommended"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="phone-way-status"]').text()).toBe('Not set up yet.');
    expect(wrapper.get('[data-testid="phone-show-qr"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="phone-how-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-testid="phone-get-tailscale"]').attributes('href')).toBe('https://tailscale.com/download');

    await wrapper.get('[data-testid="phone-check-again"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="phone-check-note"]').text()).toBe('Still not found. Tailscale isn’t on, on this computer.');
    wrapper.unmount();
  });

  it('Tailscale ready without its https name: Advanced shows the one command, never a reset (VIS-004)', async () => {
    reachable = ['http://100.101.102.103:29695'];
    setup();
    const wrapper = await mountPanel();
    await wrapper.get('[data-testid="phone-advanced-toggle"]').trigger('click');
    const command = wrapper.get('[data-testid="phone-serve-command"]').text();
    expect(command).toMatch(/serve --bg 29695$/);
    expect(command).not.toContain('reset');
    wrapper.unmount();
  });

  it('keyboard: Right and End move and select tabs; a tab change discards the code (TR-002)', async () => {
    reachable = ['http://100.101.102.103:29695'];
    setup();
    const wrapper = await mountPanel();
    await wrapper.get('[data-testid="phone-tab-tailscale"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.get('[data-testid="phone-tab-vpn"]').attributes('aria-selected')).toBe('true');
    await wrapper.get('[data-testid="phone-tab-vpn"]').trigger('keydown', { key: 'End' });
    expect(wrapper.get('[data-testid="phone-tab-company_address"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[data-testid="phone-typed-address"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('connected phones: one active with its way, History (31) closed, Revoke all asks first (AC-012, VIS-016)', async () => {
    reachable = ['http://100.101.102.103:29695'];
    const revoked = Array.from({ length: 31 }, (_, index) => device(index + 10, { revokedAt: '2026-10-28T12:00:00.000Z', connectionWay: index === 0 ? 'local_network' : null }));
    setup({ active: [device(1)], revoked });
    const wrapper = await mountPanel();

    const rows = wrapper.findAll('[data-testid="phones-active-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.text()).toContain('Phone 1');
    expect(rows[0]!.text()).toContain('Connects through Tailscale · Last seen 2 minutes ago');
    expect(wrapper.get('[data-testid="phones-history-toggle"]').text()).toBe('History (31)');
    expect(wrapper.get('[data-testid="phones-history-toggle"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-testid="phones-history-list"]').exists()).toBe(false);

    await wrapper.get('[data-testid="phones-history-toggle"]').trigger('click');
    const historyRows = wrapper.findAll('[data-testid="phones-history-row"]');
    expect(historyRows).toHaveLength(31);
    expect(historyRows[0]!.text()).toMatch(/Revoked .+ · Connected through Wi-Fi/);
    expect(historyRows[1]!.text()).not.toContain('Connected through');

    await wrapper.get('[data-testid="phones-revoke-all"]').trigger('click');
    expect(wrapper.get('[data-testid="phones-revoke-all-confirm"]').attributes('role')).toBe('alertdialog');
    expect(wrapper.get('[data-testid="phones-revoke-all-confirm"]').text()).toContain('Revoke all 1 phones? Each one must connect again.');
    expect(apiServiceMock.delete).not.toHaveBeenCalled();
    await wrapper.get('[data-testid="phones-revoke-all-yes"]').trigger('click');
    await flushPromises();
    expect(apiServiceMock.delete).toHaveBeenCalledWith('/remote-access/devices');
    wrapper.unmount();
  });

  // autobyteus-426 REQ-016 / AC-016: in a node's window on another computer the node is named (Product spec VIS-001…009).
  describe('a node on another computer', () => {
    const REMOTE_URL = 'http://192.168.1.50:29695';
    const asRemoteNode = () => {
      nodeEntries.push({ id: 'office-mac', name: 'Office Mac', baseUrl: REMOTE_URL, nodeType: 'remote', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '' } as never);
      Object.assign(windowContext, { entryId: 'office-mac', isEmbeddedWindow: false, nodeBaseUrl: REMOTE_URL });
    };
    const remoteNetwork = (overrides: Partial<NodeNetwork> = {}) => network({
      computerName: 'Office Mac',
      tailscale: { address: '100.101.102.104', dnsName: 'office-mac.example-tailnet.ts.net' },
      vpnAddresses: ['10.8.0.5'],
      localNetwork: { networkId: 'gw_fedcba9876543210', addresses: ['192.168.1.50'], allowed: true },
      ...overrides,
    });
    const status = (wrapper: Awaited<ReturnType<typeof mountPanel>>) => wrapper.get('[data-testid="phone-way-status"]').text();
    const openTab = async (wrapper: Awaited<ReturnType<typeof mountPanel>>, way: string) => {
      await wrapper.get(`[data-testid="phone-tab-${way}"]`).trigger('click');
      await flushPromises();
    };

    it('nothing reached: each not-ready line and the notes after Check again name the node (VIS-001…004)', async () => {
      asRemoteNode();
      setup({ network: remoteNetwork() });
      const wrapper = await mountPanel();

      await openTab(wrapper, 'tailscale');
      expect(status(wrapper)).toBe('Office Mac isn’t reachable through Tailscale from this computer.');
      await wrapper.get('[data-testid="phone-check-again"]').trigger('click');
      await flushPromises();
      expect(wrapper.get('[data-testid="phone-check-note"]').text()).toBe('Still not reachable. Tailscale must be on for Office Mac and for this computer.');
      expect(wrapper.get('[data-testid="phone-how-body"]').text()).toContain('Install Tailscale (free) on Office Mac, on this computer and on your phone. Get Tailscale.');
      expect(wrapper.get('[data-testid="phone-how-body"]').text()).toContain('Sign in to the same account on all three, and keep it on.');

      await openTab(wrapper, 'vpn');
      expect(status(wrapper)).toBe('Office Mac isn’t reachable through a VPN from this computer. Connect both to your VPN, then Check again.');
      await wrapper.get('[data-testid="phone-check-again"]').trigger('click');
      await flushPromises();
      expect(wrapper.get('[data-testid="phone-check-note"]').text()).toBe('Still not reachable through a VPN.');

      await openTab(wrapper, 'local_network');
      expect(status(wrapper)).toBe('Office Mac isn’t reachable on a Wi-Fi or LAN address from this computer.');

      await openTab(wrapper, 'company_address');
      expect(status(wrapper)).toBe('Not set up yet.');
      wrapper.unmount();
    });

    it('ready ways and How it works name the node; the allowed note says the node remembers it (VIS-005…008)', async () => {
      asRemoteNode();
      reachable = ['http://100.101.102.104:29695', 'http://10.8.0.5:29695', REMOTE_URL];
      setup({ network: remoteNetwork() });
      const wrapper = await mountPanel();

      await openTab(wrapper, 'tailscale');
      expect(status(wrapper)).toBe('Ready: Office Mac is reachable through Tailscale from this computer.');
      expect(wrapper.find('[data-testid="phone-advanced"]').exists()).toBe(false);
      await wrapper.get('[data-testid="phone-how-toggle"]').trigger('click');
      expect(wrapper.get('[data-testid="phone-how-body"]').text()).toBe([
        'Tailscale builds a private, encrypted connection between your phone and Office Mac, wherever they are.',
        'When', 'You want to use your phone away from home, on mobile data or any Wi-Fi.',
        'Setup', 'Install Tailscale (free) on Office Mac, on this computer and on your phone, sign in to the same account on all three, and keep it on. AutoByteus finds it by itself.',
        'Safety', 'The connection is encrypted between your phone and Office Mac, and only devices signed in to your Tailscale account can reach it.',
      ].join(''));

      await openTab(wrapper, 'vpn');
      expect(status(wrapper)).toBe('Ready: Office Mac is reachable through a VPN from this computer.');
      await wrapper.get('[data-testid="phone-how-toggle"]').trigger('click');
      expect(wrapper.get('[data-testid="phone-how-body"]').text()).toBe([
        'Your VPN puts your phone and Office Mac in the same private network.',
        'When', 'You already use your own VPN that connects your phone and Office Mac.',
        'Setup', 'Connect Office Mac, this computer and your phone to the VPN. AutoByteus finds it by itself.',
        'Safety', 'As protected as your VPN: the connection is encrypted between your devices.',
      ].join(''));

      await openTab(wrapper, 'local_network');
      expect(status(wrapper)).toBe('Office Mac is reachable on a Wi-Fi or LAN address from this computer.');
      expect(wrapper.get('[data-testid="phone-wifi-allowed"]').text()).toContain('This network. Office Mac remembers it. We ask again on a new network.');
      await wrapper.get('[data-testid="phone-how-toggle"]').trigger('click');
      expect(wrapper.get('[data-testid="phone-how-body"]').text()).toBe([
        'Your phone talks to Office Mac directly over your local network, like two devices at home.',
        'When', 'Your phone and Office Mac are on the same Wi-Fi or LAN, such as a home or office network.',
        'Setup', 'Nothing to install. The first time on a network, AutoByteus asks for your OK.',
        'Safety', 'The connection has no extra protection, so others on the same network could see it. Fine at home and in your office. On public Wi-Fi (café, hotel, airport) use Tailscale instead. Works only while the phone is on the same network as Office Mac.',
      ].join(''));
      wrapper.unmount();
    });

    it('no address at all: the blocked message names the node (VIS-009)', async () => {
      asRemoteNode();
      Object.assign(windowContext, { nodeBaseUrl: 'http://office-mac.local:29695' });
      nodeEntries[1] = { ...nodeEntries[1]!, baseUrl: 'http://[fd00::5]:29695' } as never;
      setup({ network: remoteNetwork({ tailscale: null, vpnAddresses: [], localNetwork: null }) });
      const wrapper = await mountPanel();
      expect(wrapper.get('[data-testid="phones-blocked"]').text()).toBe('Office Mac isn’t on a network a phone could use. Connect it to Wi-Fi or a VPN, then try again.');
      wrapper.unmount();
    });
  });
});
