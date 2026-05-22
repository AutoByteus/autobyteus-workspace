import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneSetupGuideCard from '../PhoneSetupGuideCard.vue';

const { translateMock } = vi.hoisted(() => ({
  translateMock: vi.fn((key: string, params?: Record<string, string | number>) => {
    if (params?.command) {
      return `copy ${params.command}`;
    }
    if (params?.error) {
      return `copy failed ${params.error}`;
    }
    return `__${key}__`;
  }),
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: translateMock,
  }),
}));

describe('PhoneSetupGuideCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders macOS-only setup, mobile URL shape, and app-direct Serve commands', () => {
    const wrapper = mount(PhoneSetupGuideCard);

    expect(wrapper.text()).toContain('https://<machine>.<tailnet>.ts.net/mobile');
    expect(wrapper.get('[data-testid="phone-setup-magicdns-note"]').text()).toContain('magicDnsGuidance');
    expect(wrapper.get('[data-testid="phone-setup-macos-cli-note"]').text()).toContain('macosCliNote');
    expect(wrapper.find('[data-testid="phone-setup-install-link-macos"]').attributes('href')).toContain('/1065/macos');
    expect(wrapper.find('[data-testid="phone-setup-install-link-windows"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="phone-setup-install-link-linux"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="phone-setup-install-link-android"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('/Applications/Tailscale.app/Contents/MacOS/Tailscale serve 29695');
    expect(wrapper.text()).toContain('/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695');
    expect(wrapper.text()).toContain('/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status');
    expect(wrapper.text()).toContain('/Applications/Tailscale.app/Contents/MacOS/Tailscale serve reset');
    expect(wrapper.text()).not.toContain('tailscale up');
    expect(wrapper.text()).not.toContain('/usr/local/bin/tailscale');
    expect(wrapper.text()).not.toContain('InstallTailscaleCLI.scpt');
  });

  it('copies the app-direct macOS Serve command and shows copied feedback', async () => {
    const wrapper = mount(PhoneSetupGuideCard);

    await wrapper.get('[data-testid="copy-phone-setup-command-macos-direct-serve-background"]').trigger('click');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695',
    );
    expect(wrapper.get('[data-testid="copy-phone-setup-command-macos-direct-serve-background"]').text()).toBe(
      '__settings.components.settings.PhoneSetupGuideCard.copied__',
    );
  });
});
