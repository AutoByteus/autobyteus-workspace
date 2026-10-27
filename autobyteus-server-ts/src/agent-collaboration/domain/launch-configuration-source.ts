/** A configured launch layer an agent can take its runtime, model and model settings from. */
export type ConfiguredLaunchLayer = "agent_default" | "team_default";

/**
 * A layer that can be skipped before an agent's launch: a configured layer, or the node's Model Router when it was
 * needed but not active or could not choose (autobyteus-32).
 */
export type SkippableLaunchLayer = ConfiguredLaunchLayer | "model_router";

/**
 * Where an agent's (or a Team's) launch values came from: a configured layer, the node's Model Router, the run root,
 * or (for a delegated copy) the configured placement of the coordinating run it was started from (`configured`).
 */
export type LaunchConfigurationOrigin = ConfiguredLaunchLayer | "model_router" | "inherited" | "configured";

export type LaunchConfigurationFallbackReason =
  | "incomplete"
  | "runtime_unavailable"
  | "signed_out"
  | "model_unavailable"
  | "blocked"
  | "model_settings_invalid"
  | "router_not_active"
  | "router_failed";

/**
 * A layer that was skipped, with what it named and why it could not be used. For the Model Router layer the runtime
 * and model are null (it named none) and the reason is `router_not_active` or `router_failed`.
 */
export type LaunchConfigurationFallback = Readonly<{
  layer: SkippableLaunchLayer;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  reason: LaunchConfigurationFallbackReason;
  detail: string;
}>;

/**
 * The recorded origin of launch values plus the layers skipped before it (REQ-005). A Model Router choice also
 * carries the router's one-sentence reason (`choiceReason`; `reason` already names a fallback's reason) and its task
 * kind. Rendered note text is derived from these; it is never stored.
 */
export type LaunchConfigurationSource =
  | Readonly<{
      origin: Exclude<LaunchConfigurationOrigin, "model_router">;
      fallbacks: readonly LaunchConfigurationFallback[];
    }>
  | Readonly<{
      origin: "model_router";
      fallbacks: readonly LaunchConfigurationFallback[];
      choiceReason: string;
      taskKind: string;
    }>;

export const LAUNCH_CONFIGURATION_ORIGINS: readonly LaunchConfigurationOrigin[] = [
  "agent_default", "team_default", "model_router", "inherited", "configured",
];
export const CONFIGURED_LAUNCH_LAYERS: readonly ConfiguredLaunchLayer[] = ["agent_default", "team_default"];
export const SKIPPABLE_LAUNCH_LAYERS: readonly SkippableLaunchLayer[] = ["agent_default", "team_default", "model_router"];
export const LAUNCH_CONFIGURATION_FALLBACK_REASONS: readonly LaunchConfigurationFallbackReason[] = [
  "incomplete", "runtime_unavailable", "signed_out", "model_unavailable", "blocked", "model_settings_invalid",
  "router_not_active", "router_failed",
];
