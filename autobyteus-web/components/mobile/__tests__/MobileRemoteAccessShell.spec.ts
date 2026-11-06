import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const load = vi.hoisted(() => ({
  options: null as null | { window: () => number | null; polling: () => boolean },
  initialLoad: Promise.resolve({ ok: true }) as Promise<unknown>,
  load: vi.fn(async () => ({ ok: true })),
}));
vi.mock('~/composables/runHistory/useRunHistorySectionLoad', () => ({
  useRunHistorySectionLoad: (options: { window: () => number | null; polling: () => boolean }) => {
    load.options = options;
    return { initialLoad: load.initialLoad, load: load.load };
  },
}));

import MobileRemoteAccessShell from '../MobileRemoteAccessShell.vue';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';

const pairedSession = {
  entryId: 'mobile-paired-node', serverBaseUrl: 'http://desktop-private.local:29695', credential: 'credential-1', pairedAt: '2026-05-18T12:00:00.000Z',
  device: { deviceId: 'device-1', displayName: 'Phone', clientFacingBaseUrl: 'http://desktop-private.local:29695', createdAt: '2026-05-18T12:00:00.000Z', lastSeenAt: null, revokedAt: null },
};
const initialState = (session: unknown = pairedSession) => ({
  mobileNodeSession: {
    session, initialized: true, isPairing: false, isCheckingStatus: false, lastDiagnostic: null, authorizedApiReachable: true,
    lastStatus: { phoneAccessEnabled: true, pairingAvailable: true, serverName: 'AutoByteus Desktop' },
  },
});

const mountShell = async (query: Record<string, string> = {}, session: unknown = pairedSession) => {
  const router = await createMobileTestRouter(query);
  // Real stores; only the phone session's boundary to the node (status read, local storage) is doubled.
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false, initialState: initialState(session) });
  const sessionStore = useMobileNodeSessionStore(pinia);
  vi.mocked(sessionStore.initializeFromStorage).mockImplementation(() => undefined);
  vi.mocked(sessionStore.fetchStatus).mockImplementation(async () => sessionStore.lastStatus);
  vi.mocked(sessionStore.deleteLocalSession).mockImplementation(() => undefined);
  const wrapper = mount(MobileRemoteAccessShell, {
    attachTo: document.body,
    global: {
      plugins: [router, pinia],
      stubs: { NuxtLink: { template: '<a><slot /></a>' } },
    },
  });
  await flushPromises();
  return { router, wrapper };
};

const toBase64Url = (value: object): string => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

// autobyteus-277: the phone's one main screen is the run list; pairing is unchanged.
describe('MobileRemoteAccessShell', () => {
  beforeEach(() => {
    load.options = null;
    load.initialLoad = Promise.resolve({ ok: true });
    load.load.mockClear();
    document.body.innerHTML = '';
  });

  it('lands a paired phone on the run list with the paired node\'s own name', async () => {
    const { wrapper } = await mountShell();
    expect(wrapper.find('[data-testid="mobile-run-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mobile-node-name"]').text()).toBe('AutoByteus Desktop');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
    expect(wrapper.get('[data-testid="mobile-new-run-button"]').attributes('aria-label')).toBe('New run');
    wrapper.unmount();
  });

  // REQ-009 / AC-009: what is not on the phone is simply absent.
  it('has no Home, Switch work, tabs, view switch, Team or Org start, row actions or explanatory filler', async () => {
    const { wrapper } = await mountShell();
    const text = wrapper.text();
    for (const absent of ['Home', 'Switch work', 'Choose work', 'Troubleshoot', 'Workspaces', 'Projects', 'Start team', 'New team', 'Archive', 'Delete', 'Stop']) {
      expect(text).not.toContain(absent);
    }
    for (const testId of ['mobile-home', 'mobile-work-shell', 'mobile-context-switcher', 'mobile-task-tabs']) {
      expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(false);
    }
    wrapper.unmount();
  });

  it('shows the unsupported-route notice above the run list with the spec\'s text', async () => {
    const { wrapper } = await mountShell({ unsupported: 'desktopWorkspace' });
    expect(wrapper.get('[data-testid="mobile-run-list"]').text()).toContain('The desktop workspace isn’t on the phone. Your runs are here.');
    wrapper.unmount();
  });

  it('reads the complete history (no window) and polls only while the list is on screen and the page in front', async () => {
    const { router, wrapper } = await mountShell();
    expect(load.options!.window()).toBeNull();
    expect(load.options!.polling()).toBe(true);
    await router.push({ path: '/mobile', query: { screen: 'new' } });
    expect(load.options!.polling()).toBe(false);
    router.back(); await flushPromises();
    expect(load.options!.polling()).toBe(true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(load.options!.polling()).toBe(false);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(load.options!.polling()).toBe(true);
    wrapper.unmount();
  });

  // AR-008, E-27: the status check reads the load's own result; a 401 rejects the local session.
  it('rejects the local session when the first history read is refused with 401, without a second read', async () => {
    load.initialLoad = Promise.resolve({ ok: false, cause: Object.assign(new Error('Request failed with status code 401'), { response: { status: 401 } }) });
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.rejectLocalSessionForAuthFailure).toHaveBeenCalledTimes(1);
    expect(session.recordAuthorizedApiReachability).not.toHaveBeenCalled();
    expect(load.load).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('records the node reachable when the first read succeeds; the node name opens the sheet and Check connection reads again', async () => {
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.recordAuthorizedApiReachability).toHaveBeenCalledWith(true);
    await wrapper.get('[data-testid="mobile-node-button"]').trigger('click');
    await flushPromises();
    const sheet = document.body.querySelector('[data-testid="mobile-connection-sheet"]');
    expect(sheet?.textContent).toContain('AutoByteus Desktop');
    expect(sheet?.textContent).toContain('http://desktop-private.local:29695');
    expect(sheet?.textContent).toContain('Unpair this phone');
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(load.load).toHaveBeenCalledTimes(1);
    expect(session.fetchStatus).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('Unpair this phone asks the baseline confirmation, then removes the local session', async () => {
    const { wrapper } = await mountShell();
    await wrapper.get('[data-testid="mobile-node-button"]').trigger('click');
    await flushPromises();
    (document.body.querySelector('[data-testid="mobile-unpair"]') as HTMLButtonElement).click();
    await flushPromises();
    const confirm = wrapper.get('[data-testid="mobile-unpair-confirm"]');
    expect(confirm.text()).toContain('Unpair this phone?');
    await confirm.findAll('button').find((button) => button.text() === 'Unpair')!.trigger('click');
    expect(useMobileNodeSessionStore().deleteLocalSession).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('the paired node not reachable: the bar says so and a banner offers Check (VIS-024)', async () => {
    load.initialLoad = Promise.resolve({ ok: false, cause: new Error('Network Error') });
    const { wrapper } = await mountShell();
    useMobileNodeSessionStore().authorizedApiReachable = false;
    await nextTick();
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Not reachable');
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Can’t reach AutoByteus Desktop.');
    wrapper.unmount();
  });

  it('lets a fresh QR replace an existing session: the pairing screen shows for a pairing link', async () => {
    const pairingParam = toBase64Url({ version: 1, serverBaseUrl: 'https://desktop.tailnet.ts.net', pairingCode: 'PAIR-REPLACE-123', expiresAt: '2026-05-24T00:05:00.000Z', serverName: 'Desktop Node' });
    const { wrapper } = await mountShell({ pairing: pairingParam });
    expect(wrapper.find('[data-testid="mobile-pairing-bootstrap"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-run-list"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('an unpaired phone shows the pairing screen and loads no history', async () => {
    const { wrapper } = await mountShell({}, null);
    expect(wrapper.find('[data-testid="mobile-pairing-bootstrap"]').exists()).toBe(true);
    expect(load.options).toBeNull();
    wrapper.unmount();
  });

  it('keeps the phone shell free from desktop shell components, workspace routing and the old phone model', () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? (name === '__tests__' ? [] : files(path)) : /\.(vue|ts)$/.test(name) ? [path] : [];
    });
    const sources = [...files(resolve(process.cwd(), 'components/mobile')), ...files(resolve(process.cwd(), 'composables/mobile'))]
      .map((path) => readFileSync(path, 'utf-8')).join('\n');
    for (const forbidden of ['AppLeftPanel', 'WorkspaceMobileLayout', 'RightSideTabs', 'ArtifactsTab', 'BrowserPanel', 'TeamCommunicationPanel', 'window.electronAPI', 'to="/workspace"', "path: '/workspace'", 'history.pushState', 'mobileWorkStore', 'MobileWorkContext']) {
      expect(sources).not.toContain(forbidden);
    }
  });
});
