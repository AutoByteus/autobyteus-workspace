import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import MemoryIndexPanel from '../MemoryIndexPanel.vue';
import { useAgentMemoryIndexStore } from '~/stores/agentMemoryIndexStore';
import { useAgentMemoryViewStore } from '~/stores/agentMemoryViewStore';
import { useMemoryScopeStore } from '~/stores/memoryScopeStore';
import { useTeamMemoryIndexStore } from '~/stores/teamMemoryIndexStore';

describe('MemoryIndexPanel', () => {
  const setupStores = () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    setActivePinia(pinia);
    const indexStore = useAgentMemoryIndexStore();
    const viewStore = useAgentMemoryViewStore();
    const scopeStore = useMemoryScopeStore();
    const teamIndexStore = useTeamMemoryIndexStore();
    return { pinia, indexStore, viewStore, scopeStore, teamIndexStore };
  };

  it('renders empty state when no entries', () => {
    const { pinia, indexStore } = setupStores();
    indexStore.entries = [];
    indexStore.loading = false;
    indexStore.error = null;

    const wrapper = mount(MemoryIndexPanel, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain('No memories found');
  });

  it('shows manual selection when selected id is not in list', async () => {
    const { pinia, indexStore, viewStore } = setupStores();
    indexStore.entries = [
      {
        runId: 'agent-1',
        lastUpdatedAt: null,
        hasWorkingContext: false,
        hasEpisodic: false,
        hasSemantic: false,
        hasRawTraces: false,
        hasRawArchive: false,
      },
    ];
    viewStore.selectedRunId = 'agent-manual';

    const wrapper = mount(MemoryIndexPanel, {
      global: {
        plugins: [pinia],
      },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Manual selection');
    expect(wrapper.text()).toContain('agent-manual');
  });

  it('switches to team scope and triggers team fetch', async () => {
    const { pinia, teamIndexStore } = setupStores();
    teamIndexStore.entries = [];
    teamIndexStore.loading = false;
    teamIndexStore.error = null;

    const wrapper = mount(MemoryIndexPanel, {
      global: {
        plugins: [pinia],
      },
    });

    const teamButton = wrapper.findAll('button').find((btn) => btn.text().includes('Team Runs'));
    expect(teamButton).toBeTruthy();
    await teamButton!.trigger('click');

    expect(teamIndexStore.fetchIndex).toHaveBeenCalled();
  });
});
