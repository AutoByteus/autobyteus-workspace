import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TokenUsageThroughputCard from '../TokenUsageThroughputCard.vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { TokenUsageThroughputState } from '~/types/tokenUsageMeter';

const sample: TokenUsageThroughputState = {
  status: 'ready', tokensPerSecond: 20, outputTokens: 200, elapsedSeconds: 10,
  observedAt: '2026-10-13T10:00:10.000Z', identity: {
    runId: 'run', turnId: 'turn', runtimeKind: 'codex_app_server', modelIdentifier: 'reported-model', modelValue: null, modelProvider: 'OPENAI',
  },
};
beforeEach(async () => { await localizationRuntime.setPreference('en'); });

describe('TokenUsageThroughputCard', () => {
  it('labels an estimate, exact agent, last report, identity/time and counted interval', () => {
    const wrapper = mount(TokenUsageThroughputCard, { props: { state: sample } });
    expect(wrapper.get('[data-test="throughput-value"]').text()).toBe('20.0 tokens/s');
    expect(wrapper.text()).toContain('Selected agent only');
    expect(wrapper.text()).toContain('Estimated · Last reported');
    expect(wrapper.get('[data-test="throughput-identity"]').text()).toBe('codex_app_server · reported-model');
    expect(wrapper.get('time').attributes()).toMatchObject({ datetime: sample.observedAt, title: sample.observedAt });
    expect(wrapper.get('[data-test="throughput-interval"]').text()).toBe('200 output tokens / 10.0 s');
    expect(wrapper.get('summary').text()).toBe('How output TPS is estimated');
    expect(wrapper.get('details').text()).toContain('not model-inference speed');
    expect(wrapper.get('details').text()).toContain('not restored after reload');
    expect(wrapper.get('details').text()).toContain('main-loop calls only');
  });

  it.each([
    { status: 'collecting', reason: 'waitingForReports' },
    { status: 'collecting', reason: 'matchingReport' },
    { status: 'unavailable', reason: 'noReports' },
    { status: 'unavailable', reason: 'invalidInterval' },
    { status: 'unavailable', reason: 'selectAgent' },
  ] as const)('renders nonnumeric %j', (state) => {
    const wrapper = mount(TokenUsageThroughputCard, { props: { state } });
    expect(wrapper.find('[data-test="throughput-value"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="throughput-state"]').text()).toBe(state.status === 'collecting' ? 'Collecting' : '— Unavailable');
    expect(wrapper.get('[data-test="throughput-reason"]').text()).not.toContain('shell.');
  });

  it('renders true zero, changes on new props only, and localizes all help', async () => {
    const wrapper = mount(TokenUsageThroughputCard, { props: { state: { ...sample, tokensPerSecond: 0, outputTokens: 0 } } });
    expect(wrapper.get('[data-test="throughput-value"]').text()).toBe('0.0 tokens/s');
    await localizationRuntime.setPreference('zh-CN');
    await wrapper.setProps({ state: { ...sample, tokensPerSecond: 30, elapsedSeconds: 5, outputTokens: 150 } });
    expect(wrapper.get('[data-test="throughput-value"]').text()).toBe('30.0 词元/秒');
    expect(wrapper.text()).toContain('估算 · 最近上报');
    expect(wrapper.text()).toContain('150 个输出词元 / 5.0 秒');
    expect(wrapper.get('summary').text()).toBe('输出 TPS 如何估算');
    expect(wrapper.text()).not.toContain('shell.');
  });
});
