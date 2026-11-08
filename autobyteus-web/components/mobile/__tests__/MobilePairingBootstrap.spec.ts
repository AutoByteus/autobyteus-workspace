import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MobilePairingBootstrap from '../MobilePairingBootstrap.vue';

// Synthetic node and code; nothing real.
const payload = {
  version: 1,
  serverBaseUrl: 'http://192.168.1.20:29695',
  pairingCode: 'SAMPLE-CODE',
  expiresAt: '2026-11-07T08:05:00.000Z',
  serverName: 'Docker node 1',
};
const pairingParam = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const bindNodeContext = vi.fn();
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ bindNodeContext }) }));

const exchangeAnswer = (status: number, body: unknown) => vi.fn(async () => ({ ok: status < 400, status, json: async () => body }));
const pairedBody = {
  credential: 'mra_sample',
  serverBaseUrl: payload.serverBaseUrl,
  device: { deviceId: 'device_1', displayName: 'Test Phone', clientFacingBaseUrl: payload.serverBaseUrl, connectionWay: 'local_network', createdAt: '', lastSeenAt: null, revokedAt: null },
};

const installShell = () => {
  const listeners = new Set<(event: { data: string }) => void>();
  const posted: Array<Record<string, unknown>> = [];
  (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell = {
    postMessage: (message: string) => {
      const parsed = JSON.parse(message) as { type: string };
      posted.push(parsed);
      if (parsed.type === 'hello') {
        queueMicrotask(() => listeners.forEach((listener) => listener({ data: JSON.stringify({ type: 'shell', nodeCount: 2, deviceName: 'Test Phone' }) })));
      }
    },
    addEventListener: (_type: string, listener: (event: { data: string }) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: { data: string }) => void) => listeners.delete(listener),
  };
  return posted;
};

const openWith = (query: string) => window.history.replaceState(null, '', `/mobile${query}`);

describe('MobilePairingBootstrap', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    bindNodeContext.mockClear();
  });
  afterEach(() => {
    delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell;
    vi.unstubAllGlobals();
    openWith('');
  });

  it('in a browser, a pairing link shows the node and pairs with one tap (REQ-018)', async () => {
    openWith(`?pairing=${pairingParam}`);
    const fetchMock = exchangeAnswer(201, pairedBody);
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(MobilePairingBootstrap);
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-pairing-node-name"]').text()).toBe('Docker node 1');
    expect(wrapper.get('[data-testid="mobile-pair-button"]').text()).toBe('Connect to Docker node 1');
    expect(wrapper.find('[data-testid="mobile-get-app"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('device name');
    expect(fetchMock).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="mobile-pair-button"]').trigger('click');
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith('http://192.168.1.20:29695/rest/remote-access/pairing-exchanges', expect.objectContaining({ method: 'POST' }));
    expect(wrapper.emitted('paired')).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem('autobyteus.remote_access.mobile_session')!)).toMatchObject({ nodeName: 'Docker node 1' });
  });

  it('in the app, a pairing link pairs at once with the phone\'s name and tells the app it paired (REQ-010)', async () => {
    openWith(`?pairing=${pairingParam}`);
    const posted = installShell();
    const fetchMock = exchangeAnswer(201, pairedBody);
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(MobilePairingBootstrap);
    await flushPromises();
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ pairingCode: 'SAMPLE-CODE', serverBaseUrl: 'http://192.168.1.20:29695', deviceName: 'Test Phone' });
    expect(posted).toEqual([{ type: 'hello' }, { type: 'paired', nodeName: 'Docker node 1' }]);
    expect(wrapper.emitted('paired')).toHaveLength(1);
  });

  it.each([
    [401, 'REMOTE_ACCESS_PAIRING_CONSUMED', 'This code was already used. Make a new one on your computer.'],
    [401, 'REMOTE_ACCESS_PAIRING_EXPIRED', 'This code has expired. Make a new one on your computer.'],
    [401, 'REMOTE_ACCESS_PAIRING_INVALID', 'This code has expired. Make a new one on your computer.'],
  ])('in the app, a refused code (%s %s) shows the reason, Scan again and the way back; nothing is reported paired', async (status, code, reason) => {
    openWith(`?pairing=${pairingParam}`);
    const posted = installShell();
    vi.stubGlobal('fetch', exchangeAnswer(status, { code }));
    const wrapper = mount(MobilePairingBootstrap);
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-pairing-failed"]').text()).toContain('Can’t reach Docker node 1');
    expect(wrapper.get('[data-testid="mobile-pairing-reason"]').text()).toBe(reason);
    await wrapper.get('[data-testid="mobile-pairing-scan-again"]').trigger('click');
    await wrapper.get('[data-testid="mobile-pairing-back"]').trigger('click');
    expect(posted.map((message) => message.type)).toEqual(['hello', 'startScan', 'showNodeList']);
    expect(window.localStorage.getItem('autobyteus.remote_access.mobile_session')).toBeNull();
  });

  it('without a link: instructions, the app download and a closed paste field', async () => {
    openWith('');
    const wrapper = mount(MobilePairingBootstrap);
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-pairing-instructions"]').text()).toBe('Scan the QR code on your computer with this phone’s camera.');
    expect(wrapper.get('[data-testid="mobile-other-ways"]').attributes('open')).toBeUndefined();
    await wrapper.get('[data-testid="mobile-pairing-text"]').setValue('not a link');
    await wrapper.get('[data-testid="mobile-paste-connect"]').trigger('click');
    expect(wrapper.get('[data-testid="mobile-pairing-error"]').text()).toBe('That isn’t an AutoByteus pairing link.');
  });
});
