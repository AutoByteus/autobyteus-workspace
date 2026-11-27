import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RawTracesTab from '../RawTracesTab.vue';
import type { RawTraceFileSummary } from '~/types/memory';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

const active: RawTraceFileSummary = { fileName: 'raw_traces_active.jsonl', kind: 'active', recordCount: 59 };
const segment: RawTraceFileSummary = { fileName: 'raw_traces_000003.jsonl', kind: 'segment', recordCount: 767, segmentIndex: 3 };

const mountTab = (props: Partial<InstanceType<typeof RawTracesTab>['$props']> = {}) => mount(RawTracesTab, {
  props: { traces: [], limit: 10, loading: false, ...props },
});

/** Raw Traces (autobyteus-608 DC-009, TR-006, TR-007; VIS-014, VIS-016, VIS-017). */
describe('RawTracesTab', () => {
  it('applies "Show" on Enter or when the field is left, only when the value changed; no Apply button, no spinner (TR-007)', async () => {
    const wrapper = mountTab();
    expect(wrapper.find('button').exists()).toBe(false);
    const limit = wrapper.get('[data-test="raw-trace-limit"]');
    expect(limit.classes()).toContain('no-spinner');
    expect(limit.attributes('aria-label')).toBe('Raw trace limit');
    expect(limit.element.closest('label')?.textContent).toContain('Show');

    // The shown limit again does nothing.
    await limit.trigger('keyup.enter');
    await limit.trigger('change');
    expect(wrapper.emitted('updateLimit')).toBeUndefined();

    await limit.setValue('500');
    await limit.trigger('keyup.enter');
    expect(wrapper.emitted('updateLimit')).toEqual([[500], [500]]);

    // Empty or < 1 is ignored.
    const ignored = mountTab();
    await ignored.get('[data-test="raw-trace-limit"]').setValue('0');
    expect(ignored.emitted('updateLimit')).toBeUndefined();
  });

  it('names one file as text, with "1 record", and shows no picker (VIS-017)', () => {
    const wrapper = mountTab({ rawTraceFiles: [{ ...active, recordCount: 1 }], selectedRawTraceFileName: active.fileName });
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.get('[data-test="raw-trace-file-name"]').text()).toBe('raw_traces_active.jsonl (active) · 1 record');
  });

  it('offers 2+ files in the picker, "N records" each, its label for screen readers only, and emits the chosen file (TR-006)', async () => {
    const wrapper = mountTab({ rawTraceFiles: [active, segment], selectedRawTraceFileName: active.fileName });

    const select = wrapper.get('select');
    expect(select.findAll('option').map((option) => option.text())).toEqual([
      'raw_traces_active.jsonl (active) · 59 records',
      'raw_traces_000003.jsonl · 767 records',
    ]);
    const label = wrapper.get('label[for="raw-trace-file-selector"]');
    expect(label.text()).toBe('Raw trace file');
    expect(label.classes()).toContain('sr-only');
    expect(wrapper.find('[data-icon="heroicons:chevron-down-20-solid"]').exists()).toBe(true);

    await select.setValue('raw_traces_000003.jsonl');
    expect(wrapper.emitted('selectFile')).toEqual([['raw_traces_000003.jsonl']]);
  });
});
