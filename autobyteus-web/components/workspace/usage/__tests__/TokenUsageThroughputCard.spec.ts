import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TokenUsageThroughputCard from '../TokenUsageThroughputCard.vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { TokenUsageTps } from '~/types/tokenUsageMeter';

const generation: TokenUsageTps = { method: 'generation', outputTokens: 1762, durationMs: 16_940, model: 'claude-opus-5-5' };
const endToEnd: TokenUsageTps = { method: 'end_to_end', outputTokens: 300, durationMs: 4_000, model: 'gpt-6-luna' };
const removedWords = ['Output TPS', 'Selected agent only', 'Estimated', 'Last reported', 'claude_agent_sdk', 'output tokens /', 'Collecting'];

beforeEach(async () => { await localizationRuntime.setPreference('en'); });

describe('TokenUsageThroughputCard', () => {
  it('shows only TPS, the value and the model for a generation reading (AC-002, AC-007)', () => {
    const wrapper = mount(TokenUsageThroughputCard, { props: { tps: generation } });
    expect(wrapper.get('h3').text()).toBe('TPS');
    expect(wrapper.get('[data-test="throughput-value"]').text()).toBe('104.0 tokens/s');
    expect(wrapper.get('[data-test="throughput-model"]').text()).toBe('claude-opus-5-5');
    expect(wrapper.find('[data-test="throughput-end-to-end"]').exists()).toBe(false);
    expect(wrapper.find('time').exists()).toBe(false);
    for (const word of removedWords) expect(wrapper.text()).not.toContain(word);
    expect(wrapper.get('details').attributes('open')).toBeUndefined();
    expect(wrapper.get('summary').text()).toBe('How TPS is measured');
  });

  it('explains the method and numbers of the reading in the help (AC-008)', () => {
    const generationHelp = mount(TokenUsageThroughputCard, { props: { tps: generation } }).get('[data-test="throughput-method-help"]').text();
    expect(generationHelp).toContain('first streamed output');
    expect(generationHelp).toContain('1,762 tokens in 16.94 s');
    const wrapper = mount(TokenUsageThroughputCard, { props: { tps: endToEnd } });
    expect(wrapper.get('[data-test="throughput-value"]').text()).toBe('75.0 tokens/s');
    expect(wrapper.get('[data-test="throughput-model"]').text()).toBe('gpt-6-luna · incl. time to first token');
    expect(wrapper.get('[data-test="throughput-method-help"]').text()).toContain('sending the request');
    expect(wrapper.get('[data-test="throughput-method-help"]').text()).toContain('300 tokens in 4.0 s');
    expect(wrapper.get('details').text()).toContain('Not kept after reload');
  });

  it('shows "—" only without a reading', () => {
    const wrapper = mount(TokenUsageThroughputCard, { props: { tps: null } });
    expect(wrapper.get('[data-test="throughput-empty"]').text()).toBe('—');
    expect(wrapper.find('[data-test="throughput-value"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="throughput-model"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="throughput-method-help"]').exists()).toBe(false);
    for (const word of removedWords) expect(wrapper.text()).not.toContain(word);
  });

  it('keeps an end-to-end qualifier without a model, and localizes zh-CN', async () => {
    const wrapper = mount(TokenUsageThroughputCard, { props: { tps: { ...endToEnd, model: null } } });
    expect(wrapper.get('[data-test="throughput-model"]').text()).toBe('incl. time to first token');
    await localizationRuntime.setPreference('zh-CN');
    await wrapper.setProps({ tps: generation });
    expect(wrapper.get('[data-test="throughput-value"]').text()).toBe('104.0 词元/秒');
    expect(wrapper.get('summary').text()).toBe('TPS 如何计算');
    expect(wrapper.get('[data-test="throughput-method-help"]').text()).toContain('16.94 秒内 1,762 个词元');
    await wrapper.setProps({ tps: endToEnd });
    expect(wrapper.get('[data-test="throughput-model"]').text()).toContain('含首词元等待时间');
    expect(wrapper.text()).not.toContain('shell.');
  });
});
