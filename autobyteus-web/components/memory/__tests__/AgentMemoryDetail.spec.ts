import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AgentMemoryDetail from '../AgentMemoryDetail.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';

describe('AgentMemoryDetail', () => {
  it('renders concise selected agent runs and emits inspectRun', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.selectedAgent = { attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 1, memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } };
    store.agentRuns.total = 1;
    store.agentRuns.entries = [{
      runId: 'run-1',
      summary: 'Useful run',
      workspaceRootPath: '/tmp/project',
      lastUpdatedAt: '2026-06-19T10:06:04.000Z',
      memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false },
    }];
    const wrapper = mount(AgentMemoryDetail, { props: { selector: { attribution: 'DEFINITION', agentDefinitionId: 'codex' } }, global: { plugins: [pinia] } });

    expect(wrapper.text()).toContain('Codex');
    expect(wrapper.text()).not.toContain('Codex Memory');
    expect(wrapper.text()).not.toMatch(/agent memory detail/i);
    expect(wrapper.text()).toMatch(/\bruns\b/i);
    expect(wrapper.find('input').attributes('placeholder')).toMatch(/search runs/i);
    expect(wrapper.text()).toContain('/tmp/project');
    expect(wrapper.text()).not.toContain('Workspace:');
    expect(wrapper.text()).not.toContain('Updated:');
    await wrapper.findAll('button').find((button) => button.text().includes('Useful run'))!.trigger('click');
    expect(wrapper.emitted('inspectRun')?.[0]?.[0]).toMatchObject({ runId: 'run-1' });
  });
});
