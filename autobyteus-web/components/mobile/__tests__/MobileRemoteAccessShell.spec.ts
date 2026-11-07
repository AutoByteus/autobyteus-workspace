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

import { ApolloError } from '@apollo/client/core';
import MobileRemoteAccessShell from '../MobileRemoteAccessShell.vue';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';

const pairedSession = {
  entryId: 'mobile-paired-node', serverBaseUrl: 'http://desktop-private.local:29695', nodeName: 'Office Mac', credential: 'credential-1', pairedAt: '2026-05-18T12:00:00.000Z',
  device: { deviceId: 'device-1', displayName: 'Phone', clientFacingBaseUrl: 'http://desktop-private.local:29695', createdAt: '2026-05-18T12:00:00.000Z', lastSeenAt: null, revokedAt: null },
};
const initialState = (session: unknown = pairedSession) => ({
  mobileNodeSession: {
    session, initialized: true, isPairing: false, isCheckingStatus: false, lastDiagnostic: null, authorizedApiReachable: true,
  },
});

const mountShell = async (query: Record<string, string> = {}, session: unknown = pairedSession) => {
  const router = await createMobileTestRouter(query);
  // Real stores; only the phone session's boundary to the node (status read, local storage) is doubled.
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false, initialState: initialState(session) });
  const sessionStore = useMobileNodeSessionStore(pinia);
  vi.mocked(sessionStore.initializeFromStorage).mockImplementation(() => undefined);
  vi.mocked(sessionStore.fetchStatus).mockImplementation(async () => reachableStatus);
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

const reachableStatus = { phoneAccessEnabled: true, pairingAvailable: true, nodeId: 'srv_test_000000000000000000000000000000000000' };

const toBase64Url = (value: object): string => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

// autobyteus-277: the phone's one main screen is the run list; pairing is unchanged.
describe('MobileRemoteAccessShell', () => {
  beforeEach(() => {
    load.options = null;
    load.initialLoad = Promise.resolve({ ok: true });
    load.load.mockClear();
    document.body.innerHTML = '';
  });

  it('lands a paired phone on the run list with the node\'s name from its QR (REQ-011)', async () => {
    const { wrapper } = await mountShell();
    expect(wrapper.find('[data-testid="mobile-run-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mobile-node-name"]').text()).toBe('Office Mac');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
    expect(wrapper.get('[data-testid="mobile-new-run-button"]').attributes('aria-label')).toBe('New run');
    wrapper.unmount();
  });

  it('a session paired before the name was kept shows the address\'s host', async () => {
    const { nodeName: _name, ...withoutName } = pairedSession;
    const { wrapper } = await mountShell({}, withoutName);
    expect(wrapper.get('[data-testid="mobile-node-name"]').text()).toBe('desktop-private.local:29695');
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
    expect(session.recordCheckOutcome).not.toHaveBeenCalled();
    expect(load.load).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // autobyteus-426 REQ-002: the history read's refusal as Apollo hands it over (IMP-02), not only the axios shape.
  const refusedRead = (code: string) => ({
    ok: false,
    cause: new ApolloError({
      networkError: Object.assign(new Error('Response not successful: Received status code 403'), {
        name: 'ServerError', statusCode: 403, response: {}, result: { error: code, code, message: 'refused' },
      }),
    }),
  });

  it('rejects the session of a revoked phone like a 401: the pairing screen shows (AC-002)', async () => {
    load.initialLoad = Promise.resolve(refusedRead('REMOTE_ACCESS_DEVICE_REVOKED'));
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.rejectLocalSessionForAuthFailure).toHaveBeenCalledTimes(1);
    expect(session.recordCheckOutcome).not.toHaveBeenCalled();
    await flushPromises();
    expect(wrapper.find('[data-testid="mobile-run-list"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps the session when Phone Access is off and says so; Check loads the runs once it is on (AC-003)', async () => {
    load.initialLoad = Promise.resolve(refusedRead('PHONE_ACCESS_DISABLED'));
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.rejectLocalSessionForAuthFailure).not.toHaveBeenCalled();
    expect(session.recordCheckOutcome).toHaveBeenCalledWith('phone_access_off');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Phone access off');
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Office Mac is reachable, but Phone access is off.');

    // Off, then the network is gone: "Can’t reach" (off → unreachable).
    load.load.mockResolvedValueOnce({ ok: false, cause: new Error('Failed to fetch') } as never);
    vi.mocked(session.fetchStatus).mockResolvedValueOnce(null);
    await wrapper.get('[data-testid="mobile-node-offline-check"]').trigger('click');
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(session.recordCheckOutcome).toHaveBeenLastCalledWith('unreachable');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Not reachable');
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Can’t reach Office Mac.');

    // Phone Access on again: the next check reads the runs with no re-pairing (→ reachable).
    load.load.mockResolvedValueOnce({ ok: true });
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(session.recordCheckOutcome).toHaveBeenLastCalledWith('reachable');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
    expect(wrapper.find('[data-testid="mobile-node-offline-banner"]').exists()).toBe(false);
    expect(session.rejectLocalSessionForAuthFailure).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('records the node reachable when the first read succeeds; the node name opens the sheet and Check connection reads again', async () => {
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.recordCheckOutcome).toHaveBeenCalledWith('reachable');
    await wrapper.get('[data-testid="mobile-node-button"]').trigger('click');
    await flushPromises();
    const sheet = document.body.querySelector('[data-testid="mobile-connection-sheet"]');
    expect(sheet?.textContent).toContain('Office Mac');
    expect(sheet?.textContent).toContain('http://desktop-private.local:29695');
    expect(sheet?.textContent).toContain('Unpair from Office Mac');
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(load.load).toHaveBeenCalledTimes(1);
    expect(session.fetchStatus).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('Unpair from <node> asks the baseline confirmation, then removes the local session', async () => {
    const { wrapper } = await mountShell();
    await wrapper.get('[data-testid="mobile-node-button"]').trigger('click');
    await flushPromises();
    (document.body.querySelector('[data-testid="mobile-unpair"]') as HTMLButtonElement).click();
    await flushPromises();
    const confirm = wrapper.get('[data-testid="mobile-unpair-confirm"]');
    expect(confirm.text()).toContain('Unpair this phone?');
    // CRR-003 F-03: the sheet (teleported to the body, so later in the DOM) closes, so nothing covers the confirmation.
    expect(document.body.querySelector('[data-testid="mobile-connection-sheet"]')).toBeNull();
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
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Can’t reach Office Mac.');
    wrapper.unmount();
  });

  // CRR-001 CR-001: Retry is the shell's status check, so the bar and the banner follow the node coming back.
  it('Retry after a failed first check reads again through the status check: the runs list, the bar says Connected, the banner goes', async () => {
    load.initialLoad = Promise.resolve({ ok: false, cause: new Error('Network Error') });
    const { useRunHistoryStore } = await import('~/stores/runHistoryStore');
    const router = await createMobileTestRouter();
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false, initialState: initialState() });
    const session = useMobileNodeSessionStore(pinia);
    vi.mocked(session.initializeFromStorage).mockImplementation(() => undefined);
    vi.mocked(session.fetchStatus).mockResolvedValueOnce(null).mockImplementation(async () => reachableStatus);
    const history = useRunHistoryStore(pinia);
    history.historyFamilyErrors = { workspace: 'Network Error', agentOrg: null };
    load.load.mockImplementation(async () => {
      history.historyFamilyErrors = { workspace: null, agentOrg: null };
      history.workspaceGroups = [{ workspaceRootPath: '/ws', workspaceName: 'ws', teamDefinitions: [],
        agentDefinitions: [{ agentDefinitionId: 'a', agentName: 'Daily Assistant', runs: [{ runId: 'r1', summary: 'Draft the reply', status: 'IDLE', createdAt: '2026-11-06T08:00:00.000Z', lastActivityAt: '2026-11-06T08:00:00.000Z', isActive: false }] }] }] as never;
      return { ok: true };
    });
    const wrapper = mount(MobileRemoteAccessShell, { attachTo: document.body, global: { plugins: [router, pinia], stubs: { NuxtLink: { template: '<a><slot /></a>' } } } });
    await flushPromises();
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Not reachable');
    expect(wrapper.find('[data-testid="mobile-node-offline-banner"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-run-list-error"]').exists()).toBe(true);
    await wrapper.get('[data-testid="mobile-run-list-retry"]').trigger('click');
    await flushPromises();
    expect(load.load).toHaveBeenCalledTimes(1);
    expect(session.fetchStatus).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
    expect(wrapper.find('[data-testid="mobile-node-offline-banner"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-run-list-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-run-tree"]').exists()).toBe(true);
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
