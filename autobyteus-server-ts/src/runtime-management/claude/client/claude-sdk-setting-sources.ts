export const CLAUDE_RUNTIME_SETTING_SOURCES = [
  "user",
  "project",
  "local",
] as const;

export const CLAUDE_CATALOG_SETTING_SOURCES = ["user"] as const;

export type ClaudeSdkSettingSource =
  (typeof CLAUDE_RUNTIME_SETTING_SOURCES)[number];

export const getClaudeRuntimeSettingSources = (): ClaudeSdkSettingSource[] => [
  ...CLAUDE_RUNTIME_SETTING_SOURCES,
];

export const getClaudeCatalogSettingSources = (): ClaudeSdkSettingSource[] => [
  ...CLAUDE_CATALOG_SETTING_SOURCES,
];
