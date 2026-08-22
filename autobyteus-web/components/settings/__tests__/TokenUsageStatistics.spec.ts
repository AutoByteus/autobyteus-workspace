import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import TokenUsageStatistics from '../TokenUsageStatistics.vue';

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'settings.components.settings.TokenUsageAnalytics.viewLabel': 'Token statistics view',
      'settings.components.settings.TokenUsageAnalytics.analytics': 'Analytics',
      'settings.components.settings.TokenUsageAnalytics.runDetails': 'Run details',
    }[key] ?? key),
  }),
}));

describe('TokenUsageStatistics', () => {
  it('opens Analytics by default and keeps Run details separate', async () => {
    const wrapper = mount(TokenUsageStatistics, {
      global: { stubs: {
        TokenUsageAnalyticsView: { template: '<div data-test="analytics-view">analytics</div>' },
        TokenUsageRunDetailsView: { template: '<div data-test="run-details-view">runs</div>' },
      } },
    });
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Token statistics view');
    expect(wrapper.find('[data-test="analytics-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="run-details-view"]').exists()).toBe(false);
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click');
    expect(wrapper.find('[data-test="analytics-view"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="run-details-view"]').exists()).toBe(true);
  });
});
