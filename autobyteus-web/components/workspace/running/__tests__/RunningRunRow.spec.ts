import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RunningRunRow from '../RunningRunRow.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

describe('RunningRunRow', () => {
  const mockRun = {
    state: {
      runId: 'agent-123',
      currentStatus: AgentStatus.Idle,
    },
    config: {
      agentDefinitionName: 'TestAgent',
    },
  };

  it('renders run label with name and suffix', () => {
    const wrapper = mount(RunningRunRow, {
      props: {
        run: mockRun as any,
        isSelected: false,
      },
    });

    expect(wrapper.text()).toContain('TestAgent - -123');
  });

  it('emits select event on click', async () => {
    const wrapper = mount(RunningRunRow, {
      props: {
        run: mockRun as any,
        isSelected: false,
      },
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
    expect(wrapper.emitted('select')?.[0]).toEqual(['agent-123']);
  });

  it('emits delete event on button click', async () => {
    const wrapper = mount(RunningRunRow, {
      props: {
        run: mockRun as any,
        isSelected: false,
      },
    });

    // Find delete button/icon (assuming class or data attribute)
    const deleteBtn = wrapper.find('button.delete-btn');
    await deleteBtn.trigger('click');
    
    expect(wrapper.emitted('delete')).toHaveLength(1);
    expect(wrapper.emitted('delete')?.[0]).toEqual(['agent-123']);
    
    // Should NOT emit select when deleting
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('applies selected styles', () => {
    const wrapper = mount(RunningRunRow, {
      props: {
        run: mockRun as any,
        isSelected: true,
      },
    });

    expect(wrapper.classes()).toContain('bg-indigo-50');
  });

  it('shows status indicator', () => {
    const wrapper = mount(RunningRunRow, {
      props: {
        run: { ...mockRun, state: { ...mockRun.state, currentStatus: AgentStatus.Error } } as any,
        isSelected: false,
      },
    });

    const indicator = wrapper.find('.status-indicator');
    expect(indicator.classes()).toContain('bg-red-500'); // Assuming error maps to red
  });
});
