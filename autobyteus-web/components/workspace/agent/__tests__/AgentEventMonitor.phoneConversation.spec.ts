// autobyteus-506 REQ-001: on the phone runtime the conversation gets the phone layout; the desktop never does. Its size
// follows the root font size the phone's Text size sets (autobyteus-525), so the monitor carries no size of its own.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';

const runtime = vi.hoisted(() => ({ phone: false }));
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => runtime.phone }));
vi.mock('~/composables/mobile/useMobileNavigation', () => ({ useMobileNavigation: () => ({}) }));
vi.mock('~/stores/agentActivityStore', () => ({ useAgentActivityStore: () => ({ getCompactionActivities: () => [] }) }));

enableAutoUnmount(afterEach);

const mountMonitor = async () => {
  const { default: AgentEventMonitor } = await import('../AgentEventMonitor.vue');
  return mount(AgentEventMonitor, {
    props: { conversation: { id: 'run-1', messages: [] } as never, browseSubject: { kind: 'run', runId: 'run-1' } as never, readOnly: true },
    global: { plugins: [createPinia()], stubs: { AgentConversationFeed: true, AgentUserInputForm: true, CollaboratorAddFailureNotice: true } },
  });
};

describe('AgentEventMonitor: the phone conversation (autobyteus-506)', () => {
  it('on the phone: the phone layout, no size of its own (the feed is 1.0625rem of the root)', async () => {
    runtime.phone = true;
    vi.resetModules();
    const root = (await mountMonitor()).get('[data-testid="agent-event-monitor"]');
    expect(root.classes()).toContain('phone-conversation');
    expect(root.attributes('style')).toBeUndefined();
    expect(root.attributes('data-text-size')).toBeUndefined();
  });

  it('on the desktop: no phone layout', async () => {
    runtime.phone = false;
    vi.resetModules();
    const root = (await mountMonitor()).get('[data-testid="agent-event-monitor"]');
    expect(root.classes()).not.toContain('phone-conversation');
    expect(root.attributes('style')).toBeUndefined();
    expect(root.attributes('data-text-size')).toBeUndefined();
  });
});
