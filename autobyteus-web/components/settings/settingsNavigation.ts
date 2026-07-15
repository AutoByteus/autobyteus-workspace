export const SETTINGS_NAVIGATION_REGION_ID = 'settings-navigation-region' as const;

export const SETTINGS_DESTINATIONS = [
  {
    section: 'api-keys',
    labelKey: 'settings.page.sections.apiKeys',
    iconClass: 'i-heroicons-key-20-solid',
    testId: 'settings-nav-api-keys',
    availability: 'always',
  },
  {
    section: 'token-usage',
    labelKey: 'settings.page.sections.tokenUsage',
    iconClass: 'i-heroicons-chart-bar-20-solid',
    testId: 'settings-nav-token-usage',
    availability: 'always',
  },
  {
    section: 'messaging',
    labelKey: 'settings.page.sections.messaging',
    iconClass: 'i-heroicons-chat-bubble-left-right-20-solid',
    testId: 'settings-nav-messaging',
    availability: 'always',
  },
  {
    section: 'display',
    labelKey: 'settings.page.sections.display',
    iconClass: 'i-heroicons-computer-desktop-20-solid',
    testId: 'settings-nav-display',
    availability: 'always',
  },
  {
    section: 'language',
    labelKey: 'settings.page.sections.language',
    iconClass: 'i-heroicons-language-20-solid',
    testId: 'settings-nav-language',
    availability: 'always',
  },
  {
    section: 'local-tools',
    labelKey: 'settings.page.sections.localTools',
    iconClass: 'i-heroicons-wrench-screwdriver-20-solid',
    testId: 'settings-nav-local-tools',
    availability: 'always',
  },
  {
    section: 'mcp-servers',
    labelKey: 'settings.page.sections.mcpServers',
    iconClass: 'i-heroicons-puzzle-piece-20-solid',
    testId: 'settings-nav-mcp-servers',
    availability: 'always',
  },
  {
    section: 'application-packages',
    labelKey: 'settings.page.sections.applicationPackages',
    iconClass: 'i-heroicons-squares-plus-20-solid',
    testId: 'settings-nav-application-packages',
    availability: 'always',
  },
  {
    section: 'agent-packages',
    labelKey: 'settings.page.sections.agentPackages',
    iconClass: 'i-heroicons-folder-open-20-solid',
    testId: 'settings-nav-agent-packages',
    availability: 'always',
  },
  {
    section: 'server-settings',
    labelKey: 'settings.page.sections.serverSettings',
    iconClass: 'i-heroicons-server-20-solid',
    testId: 'settings-nav-server-settings',
    availability: 'always',
  },
  {
    section: 'extensions',
    labelKey: 'settings.page.sections.extensions',
    iconClass: 'i-heroicons-squares-2x2-20-solid',
    testId: 'settings-nav-extensions',
    availability: 'always',
  },
  {
    section: 'updates',
    labelKey: 'settings.page.sections.updates',
    iconClass: 'i-heroicons-arrow-path-20-solid',
    testId: 'settings-nav-updates',
    availability: 'always',
  },
] as const;

export const SERVER_SETTINGS_MODES = [
  {
    mode: 'quick',
    labelKey: 'settings.page.serverSettings.quick',
    testId: 'settings-nav-server-settings-quick',
  },
  {
    mode: 'advanced',
    labelKey: 'settings.page.serverSettings.advanced',
    testId: 'settings-nav-server-settings-advanced',
  },
  {
    mode: 'migrations',
    labelKey: 'settings.page.serverSettings.migrations',
    testId: 'settings-nav-server-settings-migrations',
  },
] as const;

export const SETTINGS_BACK_ACTION = {
  action: 'back-to-workspace',
  labelKey: 'settings.page.backLabel',
  ariaLabelKey: 'settings.page.backAriaLabel',
  icon: 'heroicons:arrow-left-20-solid',
  testId: 'settings-nav-back',
} as const;

export const SETTINGS_NAVIGATION_REGION = {
  id: SETTINGS_NAVIGATION_REGION_ID,
  ariaLabelKey: 'settings.page.navigationAriaLabel',
} as const;

export type SettingsSection = (typeof SETTINGS_DESTINATIONS)[number]['section'];
export type SettingsSectionLabelKey = (typeof SETTINGS_DESTINATIONS)[number]['labelKey'];
export type SettingsSectionIconClass = (typeof SETTINGS_DESTINATIONS)[number]['iconClass'];
export type SettingsAvailability = (typeof SETTINGS_DESTINATIONS)[number]['availability'];
export type ServerSettingsMode = (typeof SERVER_SETTINGS_MODES)[number]['mode'];
export type SettingsServerModeLabelKey = (typeof SERVER_SETTINGS_MODES)[number]['labelKey'];

export interface SettingsDestinationDefinition {
  readonly section: SettingsSection;
  readonly labelKey: SettingsSectionLabelKey;
  readonly iconClass: SettingsSectionIconClass;
  readonly testId: `settings-nav-${SettingsSection}`;
  readonly availability: SettingsAvailability;
}

export interface ServerSettingsModeDefinition {
  readonly mode: ServerSettingsMode;
  readonly labelKey: SettingsServerModeLabelKey;
  readonly testId: `settings-nav-server-settings-${ServerSettingsMode}`;
}

export interface SettingsBackActionDefinition {
  readonly action: 'back-to-workspace';
  readonly labelKey: 'settings.page.backLabel';
  readonly ariaLabelKey: 'settings.page.backAriaLabel';
  readonly icon: 'heroicons:arrow-left-20-solid';
  readonly testId: 'settings-nav-back';
}

export interface SettingsNavigationRegionDefinition {
  readonly id: typeof SETTINGS_NAVIGATION_REGION_ID;
  readonly ariaLabelKey: 'settings.page.navigationAriaLabel';
}

export interface SettingsActiveContext {
  readonly section: SettingsSection;
  readonly primaryLabelKey: SettingsSectionLabelKey;
  readonly secondaryLabelKey: SettingsServerModeLabelKey | null;
  readonly iconClass: SettingsSectionIconClass;
}

export interface ResolvedSettingsNavigation {
  readonly region: SettingsNavigationRegionDefinition;
  readonly backAction: SettingsBackActionDefinition;
  readonly destinations: readonly (SettingsDestinationDefinition & { readonly isActive: boolean })[];
  readonly serverSettingsModes: readonly (ServerSettingsModeDefinition & { readonly isActive: boolean })[];
  readonly activeContext: SettingsActiveContext;
}

export interface SettingsToggleFocusHandle {
  focusToggle(): boolean;
}

const validSections = new Set<SettingsSection>(
  SETTINGS_DESTINATIONS.map(({ section }) => section),
);

export function normalizeSettingsSection(raw: unknown): SettingsSection | null {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }

  const normalized = raw === 'about' ? 'updates' : raw;
  return validSections.has(normalized as SettingsSection)
    ? normalized as SettingsSection
    : null;
}

export function normalizeServerSettingsMode(raw: unknown): ServerSettingsMode {
  return raw === 'advanced' || raw === 'migrations' ? raw : 'quick';
}

export function resolveSettingsNavigation(
  activeSection: SettingsSection,
  serverSettingsMode: ServerSettingsMode,
): ResolvedSettingsNavigation {
  const activeDestination = SETTINGS_DESTINATIONS.find(
    ({ section }) => section === activeSection,
  );

  if (!activeDestination) {
    throw new Error(`Unknown Settings section: ${activeSection}`);
  }

  return {
    region: SETTINGS_NAVIGATION_REGION,
    backAction: SETTINGS_BACK_ACTION,
    destinations: SETTINGS_DESTINATIONS
      .filter(({ availability }) => availability === 'always')
      .map((destination) => ({
        ...destination,
        isActive: destination.section === activeSection,
      })),
    serverSettingsModes: SERVER_SETTINGS_MODES.map((definition) => ({
      ...definition,
      isActive: definition.mode === serverSettingsMode,
    })),
    activeContext: {
      section: activeSection,
      primaryLabelKey: activeDestination.labelKey,
      secondaryLabelKey: activeSection === 'server-settings'
        ? SERVER_SETTINGS_MODES.find(({ mode }) => mode === serverSettingsMode)?.labelKey ?? null
        : null,
      iconClass: activeDestination.iconClass,
    },
  };
}
