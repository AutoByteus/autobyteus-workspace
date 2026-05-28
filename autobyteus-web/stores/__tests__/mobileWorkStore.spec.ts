import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import type { MobileWorkContext } from '~/types/mobileWork';

const agentRunContext: MobileWorkContext = {
  kind: 'agent-run',
  runId: 'run-1',
  agentDefinitionId: 'agent-1',
  title: 'Builder Agent',
  summary: 'Existing run',
  workspaceRootPath: '/Users/normy/project',
  isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z',
  statusLabel: 'Running',
};

describe('mobileWorkStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('preserves the Artifacts tab through store tab normalization', () => {
    const store = useMobileWorkStore();

    store.setActiveTab('artifacts');

    expect(store.activeTab).toBe('artifacts');
  });

  it('preserves an explicit Artifacts tab when selecting a mobile work context', () => {
    const store = useMobileWorkStore();

    store.selectContext(agentRunContext, 'artifacts');

    expect(store.currentContext).toEqual(agentRunContext);
    expect(store.activeTab).toBe('artifacts');
  });

  it('still falls back unknown tab ids to Chat', () => {
    const store = useMobileWorkStore();

    store.setActiveTab('not-a-mobile-tab');

    expect(store.activeTab).toBe('chat');
  });
});
