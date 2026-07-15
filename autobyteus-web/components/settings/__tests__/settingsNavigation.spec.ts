import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsNavigation from '../SettingsNavigation.vue';
import { resolveSettingsNavigation } from '../settingsNavigation';

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => ({
      'settings.page.backAriaLabel': 'Back to workspace',
      'settings.page.backLabel': 'Back to Workspace',
      'settings.page.navigationAriaLabel': 'Settings navigation',
      'settings.page.closeMenuLabel': 'Close Settings menu',
      'settings.page.sections.apiKeys': 'API Keys',
      'settings.page.sections.tokenUsage': 'Token Statistics',
      'settings.page.sections.messaging': 'Messaging',
      'settings.page.sections.display': 'Display',
      'settings.page.sections.language': 'Language',
      'settings.page.sections.localTools': 'Local Tools',
      'settings.page.sections.mcpServers': 'MCP Servers',
      'settings.page.sections.applicationPackages': 'Application Packages',
      'settings.page.sections.agentPackages': 'Agent Packages',
      'settings.page.sections.serverSettings': 'Server Settings',
      'settings.page.sections.extensions': 'Extensions',
      'settings.page.sections.updates': 'Updates',
      'settings.page.serverSettings.quick': 'Basics',
      'settings.page.serverSettings.advanced': 'Advanced',
      'settings.page.serverSettings.migrations': 'Migrations',
    } as Record<string, string>)[key] ?? key,
  }),
}));

describe('SettingsNavigation', () => {
  it('renders the stable region, complete destinations, and separate Back-row toggle', () => {
    const wrapper = mount(SettingsNavigation, {
      props: {
        model: resolveSettingsNavigation('api-keys', 'quick'),
        isDesktopCollapsed: false,
      },
    });

    expect(wrapper.attributes('id')).toBe('settings-navigation-region');
    expect(wrapper.attributes('aria-label')).toBe('Settings navigation');
    expect(wrapper.findAll('[data-testid^="settings-nav-"]')).toHaveLength(13);
    const backRow = wrapper.get('[data-testid="settings-nav-back"]').element.parentElement;
    expect(backRow?.querySelector('[data-testid="settings-navigation-collapse"]')).not.toBeNull();
    expect(wrapper.text()).not.toContain('Settings\n');

    const toggle = wrapper.get('[data-testid="settings-navigation-collapse"]');
    expect(toggle.attributes('aria-label')).toBe('Close Settings menu');
    expect(toggle.attributes('aria-controls')).toBe('settings-navigation-region');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(toggle.find('[data-testid="left-panel-toggle-icon"]').exists()).toBe(true);
  });

  it('emits typed navigation intents and renders active Server Settings modes', async () => {
    const wrapper = mount(SettingsNavigation, {
      props: {
        model: resolveSettingsNavigation('server-settings', 'advanced'),
        isDesktopCollapsed: false,
      },
    });

    expect(wrapper.get('[data-testid="settings-nav-server-settings-advanced"]').attributes('aria-current')).toBe('page');
    await wrapper.get('[data-testid="settings-nav-token-usage"]').trigger('click');
    await wrapper.get('[data-testid="settings-nav-server-settings-migrations"]').trigger('click');
    await wrapper.get('[data-testid="settings-nav-back"]').trigger('click');
    await wrapper.get('[data-testid="settings-navigation-collapse"]').trigger('click');

    expect(wrapper.emitted('select-section')).toEqual([['token-usage']]);
    expect(wrapper.emitted('select-server-mode')).toEqual([['migrations']]);
    expect(wrapper.emitted('back')).toHaveLength(1);
    expect(wrapper.emitted('collapse')).toHaveLength(1);
  });

  it('focuses only a rendered and CSS-visible toggle', async () => {
    const wrapper = mount(SettingsNavigation, {
      props: {
        model: resolveSettingsNavigation('api-keys', 'quick'),
        isDesktopCollapsed: false,
      },
      attachTo: document.body,
    });
    const button = wrapper.get('[data-testid="settings-navigation-collapse"]').element as HTMLButtonElement;

    button.getClientRects = () => [] as unknown as DOMRectList;
    expect((wrapper.vm as unknown as { focusToggle: () => boolean }).focusToggle()).toBe(false);

    button.getClientRects = () => [{ width: 18, height: 18 }] as unknown as DOMRectList;
    expect((wrapper.vm as unknown as { focusToggle: () => boolean }).focusToggle()).toBe(true);
    expect(document.activeElement).toBe(button);

    await wrapper.setProps({ isDesktopCollapsed: true });
    expect(wrapper.classes()).toContain('md:hidden');
    expect(wrapper.find('[data-testid="settings-navigation-collapse"]').exists()).toBe(false);
    expect((wrapper.vm as unknown as { focusToggle: () => boolean }).focusToggle()).toBe(false);
    wrapper.unmount();
  });
});
