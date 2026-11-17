// autobyteus-506 REQ-001, REQ-002: on the phone runtime the conversation gets the phone layout and the chosen Text size;
// the desktop never does.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';

const runtime = vi.hoisted(() => ({ phone: false }));
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => runtime.phone }));
vi.mock('~/composables/mobile/useMobileNavigation', () => ({ useMobileNavigation: () => ({}) }));
vi.mock('~/stores/agentActivityStore', () => ({ useAgentActivityStore: () => ({ getCompactionActivities: () => [] }) }));

enableAutoUnmount(afterEach);
afterEach(() => { window.localStorage.removeItem('autobyteus.phone.textSize'); });

const mountMonitor = async () => {
  const { default: AgentEventMonitor } = await import('../AgentEventMonitor.vue');
  return mount(AgentEventMonitor, {
    props: { conversation: { id: 'run-1', messages: [] } as never, browseSubject: { kind: 'run', runId: 'run-1' } as never, readOnly: true },
    global: { plugins: [createPinia()], stubs: { AgentConversationFeed: true, AgentUserInputForm: true, CollaboratorAddFailureNotice: true } },
  });
};

describe('AgentEventMonitor: the phone conversation (autobyteus-506)', () => {
  it('on the phone: the phone layout at the chosen size (Standard 17 px by default)', async () => {
    runtime.phone = true;
    vi.resetModules();
    const root = (await mountMonitor()).get('[data-testid="agent-event-monitor"]');
    expect(root.classes()).toContain('phone-conversation');
    expect(root.attributes('style')).toContain('--pc-size: 17px');
    expect(root.attributes('data-text-size')).toBe('standard');
  });

  it('on the desktop: no phone layout, no size', async () => {
    runtime.phone = false;
    vi.resetModules();
    const root = (await mountMonitor()).get('[data-testid="agent-event-monitor"]');
    expect(root.classes()).not.toContain('phone-conversation');
    expect(root.attributes('style')).toBeUndefined();
    expect(root.attributes('data-text-size')).toBeUndefined();
  });
});
