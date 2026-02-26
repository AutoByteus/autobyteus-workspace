import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkspaceCreateInlineForm from '../WorkspaceCreateInlineForm.vue';

describe('WorkspaceCreateInlineForm', () => {
  it('emits model updates and confirm/cancel actions', async () => {
    const wrapper = mount(WorkspaceCreateInlineForm, {
      props: {
        modelValue: '',
        errorMessage: '',
        creatingWorkspace: false,
      },
    });

    await wrapper.find('[data-test="workspace-path-input"]').setValue('/ws/new');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['/ws/new']);

    await wrapper.find('[data-test="create-workspace-form"]').trigger('submit');
    expect(wrapper.emitted('confirm')).toBeTruthy();

    await wrapper.find('[data-test="cancel-create-workspace"]').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('renders error and loading states', () => {
    const wrapper = mount(WorkspaceCreateInlineForm, {
      props: {
        modelValue: '/ws/new',
        errorMessage: 'Workspace path is required.',
        creatingWorkspace: true,
      },
    });

    expect(wrapper.text()).toContain('Workspace path is required.');
    expect(wrapper.text()).toContain('Adding...');
    expect(wrapper.find('[data-test="workspace-path-input"]').attributes('disabled')).toBeDefined();
  });
});
