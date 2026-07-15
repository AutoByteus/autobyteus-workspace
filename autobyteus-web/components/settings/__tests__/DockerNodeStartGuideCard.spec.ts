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
    expect(wrapper.text()).not.toContain('--profile');
    expect(wrapper.text()).toContain('autobyteus-docker upgrade --all');
    expect(wrapper.text()).toContain('autobyteus-docker destroy --all');
    expect(wrapper.text()).toContain('autobyteus-docker destroy --name <node-name>');
    expect(wrapper.text()).toContain('settings.components.settings.DockerNodeStartGuideCard.commands.destroyNode.description');
    expect(wrapper.text()).toContain('autobyteus-docker reset');
    expect(wrapper.text()).toContain('autobyteus-docker workspace paths');
    expect(wrapper.text()).toContain('autobyteus-docker workspace apply --all');
    expect(wrapper.text()).toContain('autobyteus-docker storage');
    expect(wrapper.text()).toContain('settings.components.settings.DockerNodeStartGuideCard.workspaceModel');
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

  it('copies the targeted destroy placeholder without live lookup or command execution', async () => {
    const wrapper = mount(DockerNodeStartGuideCard);
    const statusSpy = vi.spyOn(window, 'fetch');

    await wrapper.get('[data-testid="copy-docker-launcher-command-direct-destroy-node"]').trigger('click');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('autobyteus-docker destroy --name <node-name>');
    expect(wrapper.get('[data-testid="copy-docker-launcher-command-direct-destroy-node"]').text()).toBe(
      '__settings.components.settings.DockerNodeStartGuideCard.copied__',
    );
    expect(wrapper.get('[data-testid="copy-docker-launcher-command-direct-destroy-node"]').attributes('aria-label')).toBe(
      'copy __settings.components.settings.DockerNodeStartGuideCard.commands.destroyNode.title__',
    );
    expect(statusSpy).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="docker-launcher-command-direct-destroy-node"] button').exists()).toBe(true);
    expect(wrapper.find('[data-testid="docker-launcher-command-direct-destroy-node"] pre').text()).toBe(
      'autobyteus-docker destroy --name <node-name>',
    );
    expect(wrapper.get('[data-testid="docker-launcher-command-direct-destroy-node"]').text()).not.toContain('autobyteus-server-');
    statusSpy.mockRestore();
  });
});
