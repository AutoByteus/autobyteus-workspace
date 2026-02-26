import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GroupableTagInput from '../GroupableTagInput.vue';

describe('GroupableTagInput', () => {
  const mockSource = {
    type: 'flat',
    tags: ['Tag1', 'Tag2']
  };

  it('renders "Clear All" button when there are removable tags', () => {
    const wrapper = mount(GroupableTagInput, {
      props: {
        modelValue: ['Tag1', 'Tag2'],
        source: mockSource
      }
    });

    // Find the button with text "Clear All"
    const clearAllBtn = wrapper.findAll('button').find(b => b.text() === 'Clear All');
    expect(clearAllBtn?.exists()).toBe(true);
  });

  it('emits update:modelValue with only mandatory tags when "Clear All" is clicked', async () => {
    const wrapper = mount(GroupableTagInput, {
      props: {
        modelValue: ['Tag1', 'Tag2'],
        source: mockSource
      }
    });

    const clearAllBtn = wrapper.findAll('button').find(b => b.text() === 'Clear All');
    await clearAllBtn?.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    // Should remove all since none are mandatory
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([[]]);
  });
  
  it('renders "Clear All" button inside the input container', () => {
     const wrapper = mount(GroupableTagInput, {
      props: {
        modelValue: ['Tag1'],
        source: mockSource
      }
    });
    
    // Check structure: The button should be a sibling of the input
    const input = wrapper.find('input[type="text"]');
    const clearAllBtn = wrapper.findAll('button').find(b => b.text() === 'Clear All');
    
    expect(input.exists()).toBe(true);
    expect(clearAllBtn?.exists()).toBe(true);
    
    // Verify they share the same parent
    expect(input.element.parentElement).toBe(clearAllBtn?.element.parentElement);
  });
});
