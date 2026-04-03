import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import ExpandableInstructionCard from '../ExpandableInstructionCard.vue';

const flushMeasurement = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const setViewportMetrics = async (
  wrapper: ReturnType<typeof mount>,
  scrollHeight: number,
  width = 1024,
): Promise<void> => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  });

  const viewport = wrapper.get('[data-test="instruction-viewport"]').element as HTMLElement;
  Object.defineProperty(viewport, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });

  window.dispatchEvent(new Event('resize'));
  await flushMeasurement();
};

describe('ExpandableInstructionCard', () => {
  afterEach(() => {
    window.dispatchEvent(new Event('resize'));
  });

  it('does not show a toggle for short content', async () => {
    const wrapper = mount(ExpandableInstructionCard, {
      props: {
        content: 'Short instruction text.',
        variant: 'gray',
      },
    });

    await setViewportMetrics(wrapper, 120);

    expect(wrapper.find('[data-test="instruction-toggle"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="instruction-fade"]').exists()).toBe(false);
  });

  it('shows fade and chevron toggle for overflowing content and toggles expanded state', async () => {
    const wrapper = mount(ExpandableInstructionCard, {
      props: {
        content: 'Long instruction text\n'.repeat(40),
        variant: 'slate',
      },
    });

    await setViewportMetrics(wrapper, 540);

    const toggle = wrapper.get('[data-test="instruction-toggle"]');
    const viewport = wrapper.get('[data-test="instruction-viewport"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(toggle.classes()).toContain('absolute');
    expect(toggle.classes()).toContain('rounded-full');
    expect(wrapper.find('[data-test="instruction-fade"]').exists()).toBe(true);
    expect(viewport.classes()).toContain('overflow-hidden');

    await toggle.trigger('click');
    await flushMeasurement();

    const expandedToggle = wrapper.get('[data-test="instruction-toggle"]');
    expect(expandedToggle.attributes('aria-expanded')).toBe('true');
    expect(expandedToggle.classes()).not.toContain('absolute');
    expect(expandedToggle.classes()).toContain('rounded-full');
    expect(wrapper.find('[data-test="instruction-fade"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="instruction-viewport"]').classes()).not.toContain('overflow-hidden');
  });

  it('uses the compact mobile threshold for overflow detection', async () => {
    const wrapper = mount(ExpandableInstructionCard, {
      props: {
        content: 'Long instruction text\n'.repeat(20),
      },
    });

    await setViewportMetrics(wrapper, 250, 500);

    expect(wrapper.find('[data-test="instruction-toggle"]').exists()).toBe(true);
  });
});
