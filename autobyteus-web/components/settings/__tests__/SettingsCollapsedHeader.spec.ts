import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsCollapsedHeader from '../SettingsCollapsedHeader.vue';
import { resolveSettingsNavigation } from '../settingsNavigation';

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'settings.page.openMenuLabel': 'Open Settings menu',
      'settings.page.sections.tokenUsage': 'Token Statistics',
      'settings.page.sections.serverSettings': 'Server Settings',
      'settings.page.serverSettings.advanced': 'Advanced',
    } as Record<string, string>)[key] ?? key,
  }),
}));

describe('SettingsCollapsedHeader', () => {
  it('renders localized active context and the closed disclosure state', async () => {
    const context = resolveSettingsNavigation('server-settings', 'advanced').activeContext;
    const wrapper = mount(SettingsCollapsedHeader, { props: { context } });
    const button = wrapper.get('[data-testid="settings-navigation-expand"]');

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['hidden', 'md:flex']));
    expect(wrapper.text()).toContain('Server Settings — Advanced');
    expect(button.attributes('aria-label')).toBe('Open Settings menu');
    expect(button.attributes('aria-controls')).toBe('settings-navigation-region');
    expect(button.attributes('aria-expanded')).toBe('false');
    expect(button.find('[data-testid="left-panel-toggle-icon"]').exists()).toBe(true);

    await button.trigger('click');
    expect(wrapper.emitted('expand')).toHaveLength(1);
  });

  it('focuses only when its private toggle is CSS-visible', () => {
    const context = resolveSettingsNavigation('token-usage', 'quick').activeContext;
    const wrapper = mount(SettingsCollapsedHeader, {
      props: { context },
      attachTo: document.body,
    });
    const button = wrapper.get('[data-testid="settings-navigation-expand"]').element as HTMLButtonElement;
    const focusHandle = wrapper.vm as unknown as { focusToggle: () => boolean };

    button.getClientRects = () => [] as unknown as DOMRectList;
    expect(focusHandle.focusToggle()).toBe(false);

    button.getClientRects = () => [{ width: 18, height: 18 }] as unknown as DOMRectList;
    expect(focusHandle.focusToggle()).toBe(true);
    expect(document.activeElement).toBe(button);
    wrapper.unmount();
  });
});
