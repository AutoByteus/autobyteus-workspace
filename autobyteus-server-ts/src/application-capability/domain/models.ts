export const APPLICATIONS_CAPABILITY_SETTING_KEY = "ENABLE_APPLICATIONS";

export type ApplicationsCapabilityScope = "BOUND_NODE";

export type ApplicationsCapabilitySource =
  | "SERVER_SETTING"
  | "INITIALIZED_FROM_DISCOVERED_APPLICATIONS"
  | "INITIALIZED_EMPTY_CATALOG";

export interface ApplicationsCapability {
  enabled: boolean;
  scope: ApplicationsCapabilityScope;
  settingKey: typeof APPLICATIONS_CAPABILITY_SETTING_KEY;
  source: ApplicationsCapabilitySource;
}

export function buildApplicationsCapability(
  enabled: boolean,
  source: ApplicationsCapabilitySource,
): ApplicationsCapability {
  return {
    enabled,
    scope: "BOUND_NODE",
    settingKey: APPLICATIONS_CAPABILITY_SETTING_KEY,
    source,
  };
}
