import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import WorkspacePrimarySurfaceControls from '../WorkspacePrimarySurfaceControls.vue';

describe('WorkspacePrimarySurfaceControls.vue', () => {
  const mountSubject = (props: Record<string, boolean>) => mount(WorkspacePrimarySurfaceControls, {
    props,
    global: {
      mocks: {
        $t: (key: string) => ({
          'shell.workspaceSurfaces.semanticTriggersAriaLabel': 'Workspace navigation',
          'shell.workspaceSurfaces.openNavigation': 'Agents & teams',
          'shell.workspaceSurfaces.openTools': 'Tools',
        }[key] ?? key),
      },
    },
  });

  it('renders semantic triggers without the generic surface catalog', () => {
    const wrapper = mountSubject({
      showNavigationTrigger: true,
      showToolsTrigger: true,
    });

    expect(wrapper.get('[data-test="workspace-navigation-trigger"]').text()).toBe('Agents & teams');
    expect(wrapper.get('[data-test="workspace-tools-trigger"]').text()).toBe('Tools');
    expect(wrapper.text()).not.toContain('Work');
    expect(wrapper.text()).not.toContain('Runs');
    expect(wrapper.text()).not.toContain('Files');
  });

  it('emits the owning surface actions', async () => {
    const wrapper = mountSubject({
      showNavigationTrigger: true,
      showToolsTrigger: true,
    });

    await wrapper.get('[data-test="workspace-navigation-trigger"]').trigger('click');
    await wrapper.get('[data-test="workspace-tools-trigger"]').trigger('click');

    expect(wrapper.emitted('open-navigation')).toHaveLength(1);
    expect(wrapper.emitted('open-tools')).toHaveLength(1);
  });
});
