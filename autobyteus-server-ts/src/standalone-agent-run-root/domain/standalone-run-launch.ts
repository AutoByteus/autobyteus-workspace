import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";

/** A standalone run's launch from its stored metadata: what its root's delegations inherit (FU-008). */
export const launchConfigurationOf = (metadata: AgentRunMetadata): AgentLaunchConfiguration => Object.freeze({
  runtimeKind: metadata.runtimeKind,
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: metadata.llmConfig === null ? null : structuredClone(metadata.llmConfig),
  autoExecuteTools: metadata.autoExecuteTools,
  workspaceRootPath: metadata.workspaceRootPath,
});
