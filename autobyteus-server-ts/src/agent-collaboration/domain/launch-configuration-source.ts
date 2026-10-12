/** A configured launch layer an agent can take its runtime, model and model settings from. */
export type ConfiguredLaunchLayer = "agent_default" | "team_default";

/** Where an agent's (or a Team's) launch values came from: a configured layer, or the run root. */
export type LaunchConfigurationOrigin = ConfiguredLaunchLayer | "inherited";

export type LaunchConfigurationFallbackReason =
  | "incomplete"
  | "runtime_unavailable"
  | "model_unavailable"
  | "model_settings_invalid";

/** A configured layer that was skipped, with what it named and why it could not be used. */
export type LaunchConfigurationFallback = Readonly<{
  layer: ConfiguredLaunchLayer;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  reason: LaunchConfigurationFallbackReason;
  detail: string;
}>;

/**
 * The recorded origin of launch values plus the configured layers skipped before it (REQ-005).
 * Rendered note text is derived from `fallbacks`; it is never stored.
 */
export type LaunchConfigurationSource = Readonly<{
  origin: LaunchConfigurationOrigin;
  fallbacks: readonly LaunchConfigurationFallback[];
}>;

export const LAUNCH_CONFIGURATION_ORIGINS: readonly LaunchConfigurationOrigin[] = ["agent_default", "team_default", "inherited"];
export const CONFIGURED_LAUNCH_LAYERS: readonly ConfiguredLaunchLayer[] = ["agent_default", "team_default"];
export const LAUNCH_CONFIGURATION_FALLBACK_REASONS: readonly LaunchConfigurationFallbackReason[] = [
  "incomplete", "runtime_unavailable", "model_unavailable", "model_settings_invalid",
];
