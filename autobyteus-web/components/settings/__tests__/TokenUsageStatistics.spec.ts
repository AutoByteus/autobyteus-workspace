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
    const tabs = wrapper.findAll('[role="tab"]');
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Token statistics view');
    expect(tabs[0]?.attributes('aria-selected')).toBe('true');
    expect(tabs[0]?.classes()).toEqual(expect.arrayContaining([
      'bg-transparent', 'border-b-2', 'border-blue-600', 'text-blue-700', 'focus-visible:ring-2',
    ]));
    expect(tabs[0]?.classes()).not.toContain('bg-slate-900');
    expect(tabs[1]?.classes()).toEqual(expect.arrayContaining([
      'bg-transparent', 'border-transparent', 'text-slate-600', 'focus-visible:ring-2',
    ]));
    expect(wrapper.find('[data-test="analytics-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="run-details-view"]').exists()).toBe(false);
    await tabs[1]!.trigger('click');
    expect(tabs[0]?.attributes('aria-selected')).toBe('false');
    expect(tabs[0]?.classes()).toContain('border-transparent');
    expect(tabs[1]?.attributes('aria-selected')).toBe('true');
    expect(tabs[1]?.classes()).toEqual(expect.arrayContaining([
      'bg-transparent', 'border-b-2', 'border-blue-600', 'text-blue-700', 'focus-visible:ring-2',
    ]));
    expect(tabs[1]?.classes()).not.toContain('bg-slate-900');
    expect(wrapper.find('[data-test="analytics-view"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="run-details-view"]').exists()).toBe(true);
  });
});
