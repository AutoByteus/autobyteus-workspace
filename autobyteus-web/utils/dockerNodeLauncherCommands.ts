export type DockerLauncherPlatform = 'macos-linux' | 'windows-powershell' | 'installed-cli';

export type DockerLauncherCommandPhase = 'install' | 'direct';

export type DockerLauncherCommandId =
  | 'macos-linux-install'
  | 'windows-powershell-install'
  | 'direct-start'
  | 'direct-start-new'
  | 'direct-urls'
  | 'direct-status'
  | 'direct-logs'
  | 'direct-stop';

export type DockerLauncherCommand = {
  id: DockerLauncherCommandId;
  phase: DockerLauncherCommandPhase;
  platform: DockerLauncherPlatform;
  platformLabelKey: string;
  titleKey: string;
  descriptionKey: string;
  command: string;
  isPrimary: boolean;
};

export const DOCKER_NODE_LAUNCHER_GITHUB_OWNER = 'AutoByteus';
export const DOCKER_NODE_LAUNCHER_GITHUB_REPO = 'autobyteus-workspace';
export const DOCKER_NODE_LAUNCHER_GITHUB_REF = 'personal';

const BASH_SCRIPT_PATH = 'scripts/public/docker/autobyteus-docker.sh';
const POWERSHELL_SCRIPT_PATH = 'scripts/public/docker/autobyteus-docker.ps1';

const RAW_GITHUB_BASE_URL = `https://raw.githubusercontent.com/${DOCKER_NODE_LAUNCHER_GITHUB_OWNER}/${DOCKER_NODE_LAUNCHER_GITHUB_REPO}/${DOCKER_NODE_LAUNCHER_GITHUB_REF}`;

export const dockerNodeLauncherScriptUrls = {
  bash: `${RAW_GITHUB_BASE_URL}/${BASH_SCRIPT_PATH}`,
  powershell: `${RAW_GITHUB_BASE_URL}/${POWERSHELL_SCRIPT_PATH}`,
} as const;

const MACOS_LINUX_PLATFORM_LABEL_KEY = 'settings.components.settings.DockerNodeStartGuideCard.platform.macosLinux';
const WINDOWS_PLATFORM_LABEL_KEY = 'settings.components.settings.DockerNodeStartGuideCard.platform.windowsPowerShell';
const INSTALLED_CLI_PLATFORM_LABEL_KEY = 'settings.components.settings.DockerNodeStartGuideCard.platform.installedCli';

function buildBashInstallCommand(): string {
  return `curl -fsSL ${dockerNodeLauncherScriptUrls.bash} | bash -s -- install`;
}

function buildPowerShellInstallCommand(): string {
  return `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm ${dockerNodeLauncherScriptUrls.powershell} | iex; autobyteus-docker install"`;
}

function buildDirectLauncherCommand(args: string[]): string {
  return `autobyteus-docker ${args.join(' ')}`;
}

export function buildDockerNodeLauncherCommands(): DockerLauncherCommand[] {
  return [
    {
      id: 'macos-linux-install',
      phase: 'install',
      platform: 'macos-linux',
      platformLabelKey: MACOS_LINUX_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.install.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.install.description',
      command: buildBashInstallCommand(),
      isPrimary: true,
    },
    {
      id: 'windows-powershell-install',
      phase: 'install',
      platform: 'windows-powershell',
      platformLabelKey: WINDOWS_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.install.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.install.description',
      command: buildPowerShellInstallCommand(),
      isPrimary: true,
    },
    {
      id: 'direct-start',
      phase: 'direct',
      platform: 'installed-cli',
      platformLabelKey: INSTALLED_CLI_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.start.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.start.description',
      command: buildDirectLauncherCommand(['start']),
      isPrimary: true,
    },
    {
      id: 'direct-start-new',
      phase: 'direct',
      platform: 'installed-cli',
      platformLabelKey: INSTALLED_CLI_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.startNew.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.startNew.description',
      command: buildDirectLauncherCommand(['start', '--new']),
      isPrimary: true,
    },
    {
      id: 'direct-urls',
      phase: 'direct',
      platform: 'installed-cli',
      platformLabelKey: INSTALLED_CLI_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.urls.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.urls.description',
      command: buildDirectLauncherCommand(['urls']),
      isPrimary: true,
    },
    {
      id: 'direct-status',
      phase: 'direct',
      platform: 'installed-cli',
      platformLabelKey: INSTALLED_CLI_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.status.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.status.description',
      command: buildDirectLauncherCommand(['status']),
      isPrimary: true,
    },
    {
      id: 'direct-logs',
      phase: 'direct',
      platform: 'installed-cli',
      platformLabelKey: INSTALLED_CLI_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.logs.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.logs.description',
      command: buildDirectLauncherCommand(['logs']),
      isPrimary: true,
    },
    {
      id: 'direct-stop',
      phase: 'direct',
      platform: 'installed-cli',
      platformLabelKey: INSTALLED_CLI_PLATFORM_LABEL_KEY,
      titleKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.stop.title',
      descriptionKey: 'settings.components.settings.DockerNodeStartGuideCard.commands.stop.description',
      command: buildDirectLauncherCommand(['stop']),
      isPrimary: true,
    },
  ];
}
