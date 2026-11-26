import type { ProviderRelayRunAccess, RelayedRuntimeKind } from "../../credential-proxy/provider-relays/provider-relay-access.js";

/**
 * A run's access to its agent's model provider through a provider relay: the relay's address, the pass for the
 * agent's credential variable, and the relay credential kind the agent's request shape must match.
 */
export type AcpRelayAccess = ProviderRelayRunAccess;

/**
 * The provider relay an agent's model calls go through: `always` (the agent never holds a key: DeepSeek Harness), or
 * `whenRelayed` (only on a relayed node; elsewhere the agent reaches its provider itself).
 */
export type AcpProviderRelay = Readonly<{ relayId: string; runtimeKind: RelayedRuntimeKind; use: "always" | "whenRelayed" }>;

/** The facts of one run's agent process launch (create, restore and reopen alike). */
export type AcpRunLaunchRequest = Readonly<{
  runId: string;
  workingDirectory: string;
  /** The run's composed instructions; an agent that keeps them in its session ignores them. */
  instructions: string;
  model: string | null;
  reasoningEffort: string | null;
  /** `null` when the run does not go through a provider relay. */
  relayAccess: AcpRelayAccess | null;
}>;

/**
 * A short catalog-discovery process: `relayBaseUrl`, the relay's address without a pass (DeepSeek Harness, whose
 * discovery makes no model call); `nodeRelayAccess`, on a relayed node, the node pass for an agent whose discovery asks
 * its provider (to list its models).
 */
export type AcpDiscoveryLaunchRequest = Readonly<{ relayBaseUrl: string | null; nodeRelayAccess: AcpRelayAccess | null }>;

/** One process launch: its arguments, its whole environment, and what the launch prepared on disk to release. */
export type AcpLaunch = Readonly<{
  args: readonly string[];
  env: NodeJS.ProcessEnv;
  /** Removes what this launch prepared; called once its process has stopped. */
  release(): Promise<void>;
}>;

/**
 * Per-agent process concerns for one ACP agent executable. The shared ACP layer spawns,
 * connects and discovers through this contract and never assumes a particular agent.
 */
export interface AcpAgentLaunchProfile {
  /** Human-readable agent name used in errors and diagnostics. */
  readonly agentLabel: string;
  /** The provider relay the agent's model calls go through (`null`: the agent always reaches its provider itself). */
  readonly relay: AcpProviderRelay | null;
  command(): string;
  runLaunch(request: AcpRunLaunchRequest): Promise<AcpLaunch>;
  discoveryLaunch(request: AcpDiscoveryLaunchRequest): Promise<AcpLaunch>;
}

/** The release of a launch that prepared nothing. */
export const releaseNothing = async (): Promise<void> => undefined;
