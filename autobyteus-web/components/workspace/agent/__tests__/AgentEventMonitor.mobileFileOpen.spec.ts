// autobyteus-427 (AC-002): on the phone, a tap on a file link in a conversation opens the file on the Files screen.
// The conversation view, its feed and Markdown renderer, the lazily created opener, the phone navigation and vue-router
// are production implementations, mounted with a real router: the opener runs after an await in a click handler, where
// `inject` no longer works, so a test that doubles `useMobileNavigation` cannot see this failure.
// Doubled: the phone-runtime switch, external Apollo, localization and the open target (as the opener's boundary spec).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import type { Conversation } from '~/types/conversation';

vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => true }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));
const io = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
const phone = vi.hoisted(() => ({ target: null as unknown }));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return phone.target; } }) }));

enableAutoUnmount(afterEach);

const conversationNaming = (path: string): Conversation => ({
  id: 'member-B',
  createdAt: '2026-11-07T00:00:00.000Z',
  updatedAt: '2026-11-07T00:00:02.000Z',
  messages: [
    { type: 'user', text: 'Write the draft.', timestamp: new Date('2026-11-07T00:00:01.000Z') },
    {
      type: 'ai',
      text: `The draft is in [draft-v3.txt](${path}).`,
      timestamp: new Date('2026-11-07T00:00:02.000Z'),
      segments: [{ type: 'text', content: `The draft is in [draft-v3.txt](${path}).` }],
      isComplete: true,
    },
  ],
} as Conversation);

const mountOnPhone = async (path: string) => {
  const pinia = createPinia(); setActivePinia(pinia);
  phone.target = { context: { state: { runId: 'member-B' }, config: {} }, workspaceRootPath: '/owned/B' };
  io.query.mockReset().mockResolvedValue({ data: { workspaceMetadata: {
    workspaceId: 'B', workspaceRootPath: '/owned/B', displayName: 'B', kind: 'filesystem' } } });
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/mobile', component: { render: () => null } }] });
  await router.push('/mobile?screen=run'); await router.isReady();
  const wrapper = mount(AgentEventMonitor, {
    props: { conversation: conversationNaming(path), runId: 'member-B', browseSubject: { kind: 'run', runId: 'member-B' } },
    global: { plugins: [router, pinia], stubs: { AgentUserInputForm: true, CollaboratorAddFailureNotice: true } },
  });
  await flushPromises();
  return { wrapper, router };
};

describe('the phone: a file link in a conversation (autobyteus-427, autobyteus-277 DS-008)', () => {
  it('opens the file on the Files screen as a new entry, through the real router', async () => {
    const warn = vi.spyOn(console, 'warn');
    const { wrapper, router } = await mountOnPhone('/owned/B/draft-v3.txt');
    const link = wrapper.get('[data-event-monitor-file-action-id]');
    await link.trigger('click');
    await vi.waitFor(() => expect(router.currentRoute.value.query.screen).toBe('files'));
    expect(router.currentRoute.value.query).toEqual({ screen: 'files', workspace: 'B', file: 'draft-v3.txt' });
    expect(wrapper.find('[data-testid="event-monitor-file-preview-status"]').exists()).toBe(false);
    expect(warn.mock.calls.map(call => String(call[0])).filter(message => /inject\(\)|File preview failed/.test(message))).toEqual([]);
    warn.mockRestore();
    router.back();
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/mobile?screen=run'));
  });

  it('a path outside the open run\'s folder opens nothing and shows the status line', async () => {
    const { wrapper, router } = await mountOnPhone('/owned/A/private.txt');
    await wrapper.get('[data-event-monitor-file-action-id]').trigger('click');
    await vi.waitFor(() => expect(wrapper.find('[data-testid="event-monitor-file-preview-status"]').exists()).toBe(true));
    expect(wrapper.get('[data-testid="event-monitor-file-preview-status"]').text())
      .toBe('workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
    expect(router.currentRoute.value.fullPath).toBe('/mobile?screen=run');
  });
});
