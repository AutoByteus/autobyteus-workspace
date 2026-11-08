import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// The credential check's answers, in order (autobyteus-426 D-02, SR-008); the last one repeats.
const credential = vi.hoisted(() => ({ outcomes: ['reachable'] as string[] }));
const nextOutcome = async () => (credential.outcomes.length > 1 ? credential.outcomes.shift()! : credential.outcomes[0]!);
const load = vi.hoisted(() => ({
  options: null as null | { window: () => number | null; polling: () => boolean },
  initialLoad: Promise.resolve() as Promise<void>,
  load: vi.fn(async () => undefined),
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
  vi.mocked(sessionStore.checkCredential).mockImplementation(nextOutcome as never);
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

/** A stand-in for the Android app's web-message object, answering `hello` with the app's name for the open node. */
const installShell = (appNodeName: string) => {
  const listeners = new Set<(event: { data: string }) => void>();
  const posted: string[] = [];
  (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell = {
    postMessage: (message: string) => {
      const type = (JSON.parse(message) as { type: string }).type;
      posted.push(type);
      if (type !== 'hello') return;
      queueMicrotask(() => listeners.forEach((listener) => listener({ data: JSON.stringify({ type: 'shell', nodeCount: 2, deviceName: 'Test Phone', nodeName: appNodeName }) })));
    },
    addEventListener: (_type: string, listener: (event: { data: string }) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: { data: string }) => void) => listeners.delete(listener),
  };
  return posted;
};

/** A session at a Tailscale-style test address; the page must show none of it (autobyteus-433). */
const TAILNET_HOST = 'test-desktop.example-tailnet.ts.net';
const tailnetSession = (nodeName?: string) => {
  const { nodeName: _name, ...rest } = pairedSession;
  const serverBaseUrl = `https://${TAILNET_HOST}`;
  return { ...rest, ...(nodeName ? { nodeName } : {}), serverBaseUrl, device: { ...rest.device, clientFacingBaseUrl: serverBaseUrl } };
};
const expectNoAddress = (text: string | null | undefined): void => {
  for (const part of [TAILNET_HOST, 'test-desktop', 'example-tailnet', 'ts.net', 'https://']) expect(text ?? '').not.toContain(part);
};

const toBase64Url = (value: object): string => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

// autobyteus-277: the phone's one main screen is the run list; pairing is unchanged.
describe('MobileRemoteAccessShell', () => {
  beforeEach(() => {
    load.options = null;
    load.initialLoad = Promise.resolve();
    load.load.mockClear();
    credential.outcomes = ['reachable'];
    document.body.innerHTML = '';
    delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell;
  });

  it('lands a paired phone on the run list with the node\'s name from its QR (REQ-011)', async () => {
    const { wrapper } = await mountShell();
    expect(wrapper.find('[data-testid="mobile-run-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mobile-node-name"]').text()).toBe('Office Mac');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
    expect(wrapper.get('[data-testid="mobile-new-run-button"]').attributes('aria-label')).toBe('New run');
    wrapper.unmount();
  });

  it('a session paired before the name was kept, in a browser, shows "AutoByteus node", never the address (autobyteus-433 AC-003)', async () => {
    const { nodeName: _name, ...withoutName } = pairedSession;
    const { wrapper } = await mountShell({}, withoutName);
    expect(wrapper.get('[data-testid="mobile-node-name"]').text()).toBe('AutoByteus node');
    expect(wrapper.text()).not.toContain('desktop-private');
    wrapper.unmount();
  });

  // autobyteus-433 AC-001, AC-003: the app's name for the node, then the session's QR name, then "AutoByteus node".
  it.each([
    ['the app\'s name over a session without one', 'Test Desktop', undefined, 'Test Desktop'],
    ['the app\'s name over the session\'s QR name', 'Test Desktop', 'Test Node', 'Test Desktop'],
    ['the session\'s QR name when the app has no name for the node', '', 'Test Node', 'Test Node'],
    ['"AutoByteus node" when neither has a name', '', undefined, 'AutoByteus node'],
  ])('in the Android app, names the node by %s, never by its address', async (_case, appNodeName, sessionNodeName, shown) => {
    installShell(appNodeName);
    const { wrapper } = await mountShell({}, tailnetSession(sessionNodeName));
    const button = wrapper.get('[data-testid="mobile-node-button"]');
    expect(wrapper.get('[data-testid="mobile-node-name"]').text()).toBe(shown);
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
    expectNoAddress(wrapper.text());
    expectNoAddress(button.attributes('aria-label'));
    await button.trigger('click');
    await flushPromises();
    const sheet = document.body.querySelector('[data-testid="mobile-connection-sheet"]');
    expect(sheet?.querySelector('[data-testid="mobile-connection-name"]')?.textContent).toBe(shown);
    expectNoAddress(sheet?.textContent);
    wrapper.unmount();
  });

  it('in the Android app, not reachable: the banner names the node by the app\'s name, with no address (AC-001)', async () => {
    credential.outcomes = ['unreachable'];
    installShell('Test Desktop');
    const { wrapper } = await mountShell({}, tailnetSession());
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Not reachable');
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Can’t reach Test Desktop.');
    expectNoAddress(wrapper.text());
    wrapper.unmount();
  });

  it('in a browser, a session at a tailnet address shows its QR name and no part of the address (AC-003)', async () => {
    const { wrapper } = await mountShell({}, tailnetSession('Test Node'));
    expect(wrapper.get('[data-testid="mobile-node-name"]').text()).toBe('Test Node');
    expectNoAddress(wrapper.text());
    expectNoAddress(wrapper.get('[data-testid="mobile-node-button"]').attributes('aria-label'));
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

  // AR-008, E-27: a credential the node no longer accepts (401, auth codes, a revoked device) rejects the local session.
  it('rejects the local session when the first credential check is refused, without a second read', async () => {
    credential.outcomes = ['session_rejected'];
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.checkCredential).toHaveBeenCalledTimes(1);
    expect(session.rejectLocalSessionForAuthFailure).toHaveBeenCalledTimes(1);
    expect(session.recordCheckOutcome).not.toHaveBeenCalled();
    expect(load.load).not.toHaveBeenCalled();
    await flushPromises();
    expect(wrapper.find('[data-testid="mobile-run-list"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps the session when Phone Access is off and says so; Check loads the runs once it is on (AC-003)', async () => {
    credential.outcomes = ['phone_access_off', 'unreachable', 'reachable'];
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.rejectLocalSessionForAuthFailure).not.toHaveBeenCalled();
    expect(session.recordCheckOutcome).toHaveBeenCalledWith('phone_access_off');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Phone access off');
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Office Mac is reachable, but Phone access is off.');

    // Off, then the network is gone: "Can’t reach" (off → unreachable).
    await wrapper.get('[data-testid="mobile-node-offline-check"]').trigger('click');
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(session.recordCheckOutcome).toHaveBeenLastCalledWith('unreachable');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Not reachable');
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Can’t reach Office Mac.');

    // Phone Access on again: the next check reads the runs with no re-pairing (→ reachable).
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(session.recordCheckOutcome).toHaveBeenLastCalledWith('reachable');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
    expect(wrapper.find('[data-testid="mobile-node-offline-banner"]').exists()).toBe(false);
    expect(session.rejectLocalSessionForAuthFailure).not.toHaveBeenCalled();
    expect(session.checkCredential).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  // CRR-003 F-API-001: the history read is content only; a read that lists runs (or a quiet poll that superseded the
  // check's read) does not decide the outcome, and neither does a read that failed.
  it('takes the outcome from the credential check only, whatever the history read during the check answers', async () => {
    credential.outcomes = ['phone_access_off', 'reachable'];
    load.initialLoad = Promise.resolve();
    const { wrapper } = await mountShell();
    const session = useMobileNodeSessionStore();
    expect(session.recordCheckOutcome).toHaveBeenLastCalledWith('phone_access_off');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Phone access off');

    load.load.mockRejectedValueOnce(new Error('Response not successful: Received status code 401'));
    await wrapper.get('[data-testid="mobile-node-offline-check"]').trigger('click');
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(session.rejectLocalSessionForAuthFailure).not.toHaveBeenCalled();
    expect(session.recordCheckOutcome).toHaveBeenLastCalledWith('reachable');
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Connected');
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
    expect(sheet?.textContent).not.toContain('desktop-private');
    expect(sheet?.textContent).toContain('Unpair from Office Mac');
    (document.body.querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    await flushPromises();
    expect(load.load).toHaveBeenCalledTimes(1);
    expect(session.fetchStatus).toHaveBeenCalledTimes(2);
    expect(session.checkCredential).toHaveBeenCalledTimes(2);
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
    credential.outcomes = ['unreachable'];
    load.initialLoad = Promise.resolve();
    const { wrapper } = await mountShell();
    await nextTick();
    expect(wrapper.get('[data-testid="mobile-node-state"]').text()).toBe('Not reachable');
    expect(wrapper.get('[data-testid="mobile-node-offline-banner"]').text()).toContain('Can’t reach Office Mac.');
    wrapper.unmount();
  });

  // CRR-001 CR-001: Retry is the shell's status check, so the bar and the banner follow the node coming back.
  it('Retry after a failed first check reads again through the status check: the runs list, the bar says Connected, the banner goes', async () => {
    load.initialLoad = Promise.resolve();
    const { useRunHistoryStore } = await import('~/stores/runHistoryStore');
    const router = await createMobileTestRouter();
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false, initialState: initialState() });
    const session = useMobileNodeSessionStore(pinia);
    vi.mocked(session.initializeFromStorage).mockImplementation(() => undefined);
    vi.mocked(session.fetchStatus).mockResolvedValueOnce(null).mockImplementation(async () => reachableStatus);
    credential.outcomes = ['unreachable', 'reachable'];
    vi.mocked(session.checkCredential).mockImplementation(nextOutcome as never);
    const history = useRunHistoryStore(pinia);
    history.historyFamilyErrors = { workspace: 'Network Error', agentOrg: null };
    load.load.mockImplementation(async () => {
      history.historyFamilyErrors = { workspace: null, agentOrg: null };
      history.workspaceGroups = [{ workspaceRootPath: '/ws', workspaceName: 'ws', teamDefinitions: [],
        agentDefinitions: [{ agentDefinitionId: 'a', agentName: 'Daily Assistant', runs: [{ runId: 'r1', summary: 'Draft the reply', status: 'IDLE', createdAt: '2026-11-06T08:00:00.000Z', lastActivityAt: '2026-11-06T08:00:00.000Z', isActive: false }] }] }] as never;
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

  // autobyteus-433 DS-006: the app shows the page (or closes its overlay) only when the page says it is mounted.
  it.each([
    ['a paired phone', pairedSession],
    ['an unpaired phone (the pairing page)', null],
  ])('in the Android app, %s tells the app once that the page is ready', async (_case, session) => {
    const posted = installShell('Test Desktop');
    const { router, wrapper } = await mountShell({}, session);
    expect(posted.filter((type) => type === 'pageReady')).toHaveLength(1);
    await router.push({ path: '/mobile', query: { screen: 'new' } });
    router.back(); await flushPromises();
    expect(posted.filter((type) => type === 'pageReady')).toHaveLength(1);
    wrapper.unmount();
  });

  it('in a browser there is no bridge, so nothing is sent and the page still mounts', async () => {
    const { wrapper } = await mountShell();
    expect((window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell).toBeUndefined();
    expect(wrapper.find('[data-testid="mobile-run-list"]').exists()).toBe(true);
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
