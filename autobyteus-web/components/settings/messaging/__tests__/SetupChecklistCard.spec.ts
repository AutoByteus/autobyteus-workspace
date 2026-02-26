import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SetupChecklistCard from '../SetupChecklistCard.vue';

describe('SetupChecklistCard', () => {
  it('emits select-step when a step is clicked', async () => {
    const wrapper = mount(SetupChecklistCard, {
      props: {
        steps: [
          { key: 'gateway', status: 'READY' },
          { key: 'personal_session', status: 'PENDING' },
          { key: 'binding', status: 'PENDING' },
          { key: 'verification', status: 'PENDING' },
        ],
        activeStep: 'personal_session',
      },
    });

    await wrapper.get('[data-testid="setup-step-binding"]').trigger('click');

    expect(wrapper.emitted('select-step')).toEqual([['binding']]);
  });

  it('marks active step with aria-current', () => {
    const wrapper = mount(SetupChecklistCard, {
      props: {
        steps: [
          { key: 'gateway', status: 'READY' },
          { key: 'binding', status: 'PENDING' },
          { key: 'verification', status: 'PENDING' },
        ],
        activeStep: 'binding',
      },
    });

    expect(wrapper.get('[data-testid="setup-step-binding"]').attributes('aria-current')).toBe('step');
    expect(wrapper.get('[data-testid="setup-step-gateway"]').attributes('aria-current')).toBeUndefined();
  });
});
