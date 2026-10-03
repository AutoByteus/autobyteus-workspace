import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ErrorSegment from '../ErrorSegment.vue';

describe('ErrorSegment runtime message', () => {
  it.each([
    'Individual quota reached for this model. Resets in 3h28m50s.',
    'Workspace service temporarily unavailable. Try again later.',
    'Rate limit reached.\nTry again later. token=<redacted>',
    'Antigravity could not complete this turn.',
  ])('renders the supplied cause under the existing heading: %s', (message) => {
    const wrapper = mount(ErrorSegment, { props: { segment: { type: 'error', message } } });
    expect(wrapper.get('p.mt-1').text()).toBe(message);
    expect(wrapper.find('details').exists()).toBe(false);
  });

  it('renders markup and details as inert text, with the existing detail disclosure', async () => {
    const message = '<script>alert("runtime")</script> Workspace unavailable.';
    const details = '<img src=x onerror=alert("details")> Provider note.';
    const wrapper = mount(ErrorSegment, { props: { segment: { type: 'error', message, details } } });
    expect(wrapper.get('p.mt-1').text()).toBe(message);
    expect(wrapper.get('code').text()).toBe(details);
    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(false);
    await wrapper.get('summary').trigger('click');
    expect(wrapper.get('code').text()).toBe(details);
  });
});
