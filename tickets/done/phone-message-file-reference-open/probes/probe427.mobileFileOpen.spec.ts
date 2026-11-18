// Probe for autobyteus-427 (temporary; the reproduction is handed over from the ticket folder).
// The real useEventMonitorFilePreview and the real useMobileNavigation (vue-router useRoute/useRouter) are used,
// called the way AgentEventMonitor.handleFilePathAction calls them: from a click handler, after an await.
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, getCurrentInstance, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';

vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => true }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));
const io = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
const phone = vi.hoisted(() => ({ target: null as unknown }));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return phone.target; } }) }));

const action = { id: 'a', rawCandidate: '/owned/B/draft-v3.txt', normalizedCandidate: '/owned/B/draft-v3.txt',
  sourceKind: 'markdown-link' as const, displayLabel: 'draft-v3.txt', previewType: 'Text' as const };

describe('probe 427: tapping a file in a phone message', () => {
  it('opens the Files screen with the file (handler calls the opener after an await, as AgentEventMonitor does)', async () => {
    const pinia = createPinia(); setActivePinia(pinia);
    phone.target = { context: { state: { runId: 'member-B' }, config: {} }, workspaceRootPath: '/owned/B' };
    io.query.mockResolvedValue({ data: { workspaceMetadata: { workspaceId: 'B', workspaceRootPath: '/owned/B', displayName: 'B', kind: 'filesystem' } } });
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/mobile', component: { render: () => null } }] });
    await router.push('/mobile?screen=run'); await router.isReady();
    let result: unknown = null;
    const warn = vi.spyOn(console, 'warn');
    const Monitor = defineComponent({
      setup() {
        const onClick = async () => {
          const { useEventMonitorFilePreview } = await import('~/composables/useEventMonitorFilePreview');
          result = await useEventMonitorFilePreview({ revealTool: null, isOriginCurrent: () => true }).openPath(action);
        };
        return () => h('button', { onClick }, 'draft-v3.txt');
      },
    });
    const wrapper = mount(Monitor, { global: { plugins: [router, pinia] } });
    await wrapper.find('button').trigger('click');
    await vi.waitFor(() => { if (result === null) throw new Error('pending'); }, { timeout: 10000 });
    console.log('PROBE result =', JSON.stringify(result));
    console.log('PROBE route  =', router.currentRoute.value.fullPath);
    console.log('PROBE warns  =', warn.mock.calls.map((c) => String(c[0]).slice(0, 160)).join(' | '));
    expect(result).toEqual({ status: 'opened', path: 'draft-v3.txt' });
    expect(router.currentRoute.value.query).toMatchObject({ screen: 'files', workspace: 'B', file: 'draft-v3.txt' });
  });

  it('CONTROL: the same tap opens the Files screen when the opener is created in the app injection context', async () => {
    const pinia = createPinia(); setActivePinia(pinia);
    phone.target = { context: { state: { runId: 'member-B' }, config: {} }, workspaceRootPath: '/owned/B' };
    io.query.mockResolvedValue({ data: { workspaceMetadata: { workspaceId: 'B', workspaceRootPath: '/owned/B', displayName: 'B', kind: 'filesystem' } } });
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/mobile', component: { render: () => null } }] });
    await router.push('/mobile?screen=run'); await router.isReady();
    let result: unknown = null;
    const Monitor = defineComponent({
      setup(_p, ctx) {
        const app = (getCurrentInstance() as any).appContext.app;
        const onClick = async () => {
          const { useEventMonitorFilePreview } = await import('~/composables/useEventMonitorFilePreview');
          const opener = app.runWithContext(() => useEventMonitorFilePreview({ revealTool: null, isOriginCurrent: () => true }));
          result = await opener.openPath(action);
        };
        return () => h('button', { onClick }, 'draft-v3.txt');
      },
    });
    const wrapper = mount(Monitor, { global: { plugins: [router, pinia] } });
    await wrapper.find('button').trigger('click');
    await vi.waitFor(() => { if (result === null) throw new Error('pending'); }, { timeout: 10000 });
    await flushPromises();
    console.log('CONTROL result =', JSON.stringify(result), 'route =', router.currentRoute.value.fullPath);
    expect(result).toEqual({ status: 'opened', path: 'draft-v3.txt' });
    expect(router.currentRoute.value.query).toMatchObject({ screen: 'files', workspace: 'B', file: 'draft-v3.txt' });
  });
});
