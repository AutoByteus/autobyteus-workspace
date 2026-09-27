import type { InitializeResponse } from "@agentclientprotocol/sdk";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";

/** Model and effort chosen for one agent process; both are absent for catalog discovery. */
export type AcpLaunchSelection = Readonly<{
  model: string | null;
  reasoningEffort: string | null;
}>;

/**
 * Per-agent process concerns for one ACP agent executable. The shared ACP layer spawns,
 * connects and discovers through this contract and never assumes a particular agent.
 */
export interface AcpAgentLaunchProfile {
  /** Human-readable agent name used in errors and diagnostics. */
  readonly agentLabel: string;
  command(): string;
  args(selection: AcpLaunchSelection): string[];
  /** Child environment derived from the server environment; must not mutate `base`. */
  env(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
  /** Offered models from the agent's `initialize` result, without inference. */
  normalizeModels(initialize: InitializeResponse): ModelInfo[];
}
