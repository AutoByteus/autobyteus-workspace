export type PhoneSetupInstallLinkId = 'macos';

export type PhoneSetupCommandId =
  | 'macos-direct-serve-foreground'
  | 'macos-direct-serve-background'
  | 'macos-direct-serve-status'
  | 'macos-direct-serve-reset';

export type PhoneSetupCommandPhase = 'macos';

export type PhoneSetupInstallLink = {
  id: PhoneSetupInstallLinkId;
  platformLabelKey: string;
  descriptionKey: string;
  href: string;
};

export type PhoneSetupGuideCommand = {
  id: PhoneSetupCommandId;
  phase: PhoneSetupCommandPhase;
  titleKey: string;
  descriptionKey: string;
  command: string;
  isPrimary: boolean;
};

const TAILSCALE_DOCS_BASE_URL = 'https://tailscale.com/kb';
const MACOS_TAILSCALE_EXECUTABLE = '/Applications/Tailscale.app/Contents/MacOS/Tailscale';

export const phoneSetupInstallLinks: PhoneSetupInstallLink[] = [
  {
    id: 'macos',
    platformLabelKey: 'settings.components.settings.PhoneSetupGuideCard.platform.macos',
    descriptionKey: 'settings.components.settings.PhoneSetupGuideCard.platformDescription.macos',
    href: `${TAILSCALE_DOCS_BASE_URL}/1065/macos`,
  },
];

export function buildPhoneSetupGuideCommands(): PhoneSetupGuideCommand[] {
  return [
    {
      id: 'macos-direct-serve-foreground',
      phase: 'macos',
      titleKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeForeground.title',
      descriptionKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeForeground.description',
      command: `${MACOS_TAILSCALE_EXECUTABLE} serve 29695`,
      isPrimary: true,
    },
    {
      id: 'macos-direct-serve-background',
      phase: 'macos',
      titleKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeBackground.title',
      descriptionKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeBackground.description',
      command: `${MACOS_TAILSCALE_EXECUTABLE} serve --bg 29695`,
      isPrimary: true,
    },
    {
      id: 'macos-direct-serve-status',
      phase: 'macos',
      titleKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeStatus.title',
      descriptionKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeStatus.description',
      command: `${MACOS_TAILSCALE_EXECUTABLE} serve status`,
      isPrimary: true,
    },
    {
      id: 'macos-direct-serve-reset',
      phase: 'macos',
      titleKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeReset.title',
      descriptionKey: 'settings.components.settings.PhoneSetupGuideCard.commands.macosDirectServeReset.description',
      command: `${MACOS_TAILSCALE_EXECUTABLE} serve reset`,
      isPrimary: true,
    },
  ];
}
