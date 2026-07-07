import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RawTracesTab from '../RawTracesTab.vue';

describe('RawTracesTab', () => {
  it('emits updateLimit when apply is clicked', async () => {
    const wrapper = mount(RawTracesTab, {
      props: {
        traces: [],
        limit: 10,
        loading: false,
      },
    });

    const applyButton = wrapper.find('button');
    await applyButton.trigger('click');

    expect(wrapper.emitted('updateLimit')).toBeTruthy();
    expect(wrapper.emitted('updateLimit')![0]).toEqual([10]);
  });

  it('renders raw trace file options and emits selected filename', async () => {
    const wrapper = mount(RawTracesTab, {
      props: {
        traces: [],
        rawTraceFiles: [
          { fileName: 'raw_traces_active.jsonl', kind: 'active', recordCount: 59 },
          { fileName: 'raw_traces_000003.jsonl', kind: 'segment', recordCount: 767, segmentIndex: 3 },
        ],
        selectedRawTraceFileName: 'raw_traces_active.jsonl',
        limit: 10,
        loading: false,
      },
    });

    const select = wrapper.get('select');
    expect(select.text()).toContain('raw_traces_active.jsonl');
    expect(select.text()).toContain('59');
    expect(select.text()).toContain('raw_traces_000003.jsonl');

    await select.setValue('raw_traces_000003.jsonl');

    expect(wrapper.emitted('selectFile')).toBeTruthy();
    expect(wrapper.emitted('selectFile')![0]).toEqual(['raw_traces_000003.jsonl']);
  });
});
