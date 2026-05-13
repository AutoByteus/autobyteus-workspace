import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DockerNodeStartGuideCard from '../DockerNodeStartGuideCard.vue';
import { dockerNodeLauncherScriptUrls } from '~/utils/dockerNodeLauncherCommands';

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

describe('DockerNodeStartGuideCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders install commands and direct local lifecycle commands', () => {
    const wrapper = mount(DockerNodeStartGuideCard);

    expect(wrapper.text()).toContain(dockerNodeLauncherScriptUrls.bash);
    expect(wrapper.text()).toContain(dockerNodeLauncherScriptUrls.powershell);
    expect(wrapper.text()).toContain('bash -s -- install');
    expect(wrapper.text()).not.toContain('bash -s -- start');
    expect(wrapper.text()).toContain('autobyteus-docker new-container');
    expect(wrapper.text()).toContain('autobyteus-docker upgrade --all');
    expect(wrapper.text()).toContain('autobyteus-docker destroy --all');
    expect(wrapper.text()).toContain('autobyteus-docker reset');
    expect(wrapper.text()).not.toContain('autobyteus-docker start');
    expect(wrapper.text()).toContain('autobyteus-docker urls');
    expect(wrapper.text()).toContain('autobyteus-docker status');
    expect(wrapper.text()).toContain('autobyteus-docker logs');
    expect(wrapper.text()).toContain('autobyteus-docker stop');
  });

  it('copies the selected install command and shows copied feedback', async () => {
    const wrapper = mount(DockerNodeStartGuideCard);

    await wrapper.get('[data-testid="copy-docker-launcher-command-macos-linux-install"]').trigger('click');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `curl -fsSL ${dockerNodeLauncherScriptUrls.bash} | bash -s -- install`,
    );
    expect(wrapper.get('[data-testid="copy-docker-launcher-command-macos-linux-install"]').text()).toBe(
      '__settings.components.settings.DockerNodeStartGuideCard.copied__',
    );
  });
});
