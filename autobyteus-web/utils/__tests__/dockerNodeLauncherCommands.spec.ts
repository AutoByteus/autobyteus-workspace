import { describe, expect, it } from 'vitest';
import {
  DOCKER_NODE_LAUNCHER_GITHUB_REF,
  buildDockerNodeLauncherCommands,
  dockerNodeLauncherScriptUrls,
} from '../dockerNodeLauncherCommands';
import enSettingsMessages from '~/localization/messages/en/settings';
import zhCNSettingsMessages from '~/localization/messages/zh-CN/settings';

describe('dockerNodeLauncherCommands', () => {
  it('centralizes the raw GitHub launcher URLs on the public branch ref', () => {
    expect(DOCKER_NODE_LAUNCHER_GITHUB_REF).toBe('personal');
    expect(dockerNodeLauncherScriptUrls.bash).toBe(
      'https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.sh',
    );
    expect(dockerNodeLauncherScriptUrls.powershell).toBe(
      'https://raw.githubusercontent.com/AutoByteus/autobyteus-workspace/personal/scripts/public/docker/autobyteus-docker.ps1',
    );
  });

  it('builds install-once commands and direct local lifecycle commands', () => {
    const commands = buildDockerNodeLauncherCommands();

    expect(commands.map((command) => command.id)).toEqual([
      'macos-linux-install',
      'windows-powershell-install',
      'direct-new-container',
      'direct-upgrade-all',
      'direct-destroy-all',
      'direct-destroy-node',
      'direct-reset',
      'direct-workspace-paths',
      'direct-workspace-apply-all',
      'direct-storage',
      'direct-urls',
      'direct-status',
      'direct-logs',
      'direct-stop',
    ]);
    expect(commands.find((command) => command.id === 'macos-linux-install')?.command).toBe(
      `curl -fsSL ${dockerNodeLauncherScriptUrls.bash} | bash -s -- install`,
    );
    expect(commands.find((command) => command.id === 'windows-powershell-install')?.command).toBe(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm ${dockerNodeLauncherScriptUrls.powershell} | iex; autobyteus-docker install"`,
    );
    expect(commands.filter((command) => command.phase === 'direct').map((command) => command.command)).toEqual([
      'autobyteus-docker new-container',
      'autobyteus-docker upgrade --all',
      'autobyteus-docker destroy --all',
      'autobyteus-docker destroy --name <node-name>',
      'autobyteus-docker reset',
      'autobyteus-docker workspace paths',
      'autobyteus-docker workspace apply --all',
      'autobyteus-docker storage',
      'autobyteus-docker urls',
      'autobyteus-docker status',
      'autobyteus-docker logs',
      'autobyteus-docker stop',
    ]);
    expect(commands.map((command) => command.command).join('\n')).not.toContain('--profile');
    expect(commands.map((command) => command.command).join('\n')).not.toContain('bash -s -- start');
    expect(commands.map((command) => command.command).join('\n')).not.toContain('autobyteus-docker start');
  });

  it('keeps targeted destroy as a placeholder-only static command', () => {
    const command = buildDockerNodeLauncherCommands().find((entry) => entry.id === 'direct-destroy-node');

    expect(command).toMatchObject({
      command: 'autobyteus-docker destroy --name <node-name>',
      phase: 'direct',
      platform: 'installed-cli',
    });
    expect(command?.command).not.toMatch(/autobyteus-server-\d/);
  });

  it('keeps targeted destroy guidance equivalent in English and Simplified Chinese', () => {
    const enDescription = enSettingsMessages['settings.components.settings.DockerNodeStartGuideCard.commands.destroyNode.description'];
    const zhDescription = zhCNSettingsMessages['settings.components.settings.DockerNodeStartGuideCard.commands.destroyNode.description'];

    expect(enSettingsMessages['settings.components.settings.DockerNodeStartGuideCard.commands.destroyNode.title']).toBe('Destroy one Docker node');
    expect(zhCNSettingsMessages['settings.components.settings.DockerNodeStartGuideCard.commands.destroyNode.title']).toBe('销毁一个 Docker 节点');
    for (const guidance of [enDescription, zhDescription]) {
      expect(guidance).toContain('<node-name>');
      expect(guidance).toContain('status');
      expect(guidance).toContain('new-container');
    }
    expect(enDescription).toContain('named volumes');
    expect(enDescription).toContain('host workspaces');
    expect(zhDescription).toContain('命名卷');
    expect(zhDescription).toContain('主机工作区');
    expect(enDescription).not.toMatch(/autobyteus-server-\d/);
    expect(zhDescription).not.toMatch(/autobyteus-server-\d/);
  });
});
