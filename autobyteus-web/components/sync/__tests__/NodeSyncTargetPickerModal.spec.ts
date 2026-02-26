import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import NodeSyncTargetPickerModal from '../NodeSyncTargetPickerModal.vue';

describe('NodeSyncTargetPickerModal', () => {
  const targets = [
    { id: 'remote-1', name: 'Remote One', baseUrl: 'http://localhost:8001' },
    { id: 'remote-2', name: 'Remote Two', baseUrl: 'http://localhost:8002' },
  ];

  it('emits confirm with selected target ids', async () => {
    const wrapper = mount(NodeSyncTargetPickerModal, {
      props: {
        modelValue: true,
        title: 'Sync Agent',
        targets,
      },
    });

    await wrapper.get('[data-testid="node-sync-picker-confirm"]').trigger('click');
    const confirmEvents = wrapper.emitted('confirm');
    expect(confirmEvents).toBeTruthy();
    expect(confirmEvents?.[0]?.[0]).toEqual(['remote-1', 'remote-2']);
  });

  it('blocks submit when no targets are selected', async () => {
    const wrapper = mount(NodeSyncTargetPickerModal, {
      props: {
        modelValue: true,
        title: 'Sync Agent',
        targets,
      },
    });

    await wrapper.get('[data-testid="node-sync-picker-clear-all"]').trigger('click');
    await wrapper.get('[data-testid="node-sync-picker-confirm"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('confirm')).toBeFalsy();
  });
});
