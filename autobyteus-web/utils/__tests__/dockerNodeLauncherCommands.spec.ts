import { describe, expect, it } from 'vitest';
import {
  DOCKER_NODE_LAUNCHER_GITHUB_REF,
  buildDockerNodeLauncherCommands,
  dockerNodeLauncherScriptUrls,
} from '../dockerNodeLauncherCommands';

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
      'direct-reset',
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
      'autobyteus-docker reset',
      'autobyteus-docker urls',
      'autobyteus-docker status',
      'autobyteus-docker logs',
      'autobyteus-docker stop',
    ]);
    expect(commands.map((command) => command.command).join('\n')).not.toContain('bash -s -- start');
    expect(commands.map((command) => command.command).join('\n')).not.toContain('autobyteus-docker start');
  });
});
