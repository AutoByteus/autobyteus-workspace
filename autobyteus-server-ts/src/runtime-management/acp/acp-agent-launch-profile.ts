/** A run's access to its agent's model provider through a provider relay: the relay's address and the run's pass. */
export type AcpRelayAccess = Readonly<{ baseUrl: string; apiKey: string }>;

/** The facts of one run's agent process launch (create, restore and reopen alike). */
export type AcpRunLaunchRequest = Readonly<{
  runId: string;
  workingDirectory: string;
  /** The run's composed instructions; an agent that keeps them in its session ignores them. */
  instructions: string;
  model: string | null;
  reasoningEffort: string | null;
  /** `null` when the launch profile names no provider relay. */
  relayAccess: AcpRelayAccess | null;
}>;

/** A short catalog-discovery process: the relay's address without a pass, when the profile names a relay. */
export type AcpDiscoveryLaunchRequest = Readonly<{ relayBaseUrl: string | null }>;

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
  /** The provider relay the agent's model calls go through (`null`: the agent reaches its provider itself). */
  readonly providerRelayId: string | null;
  command(): string;
  runLaunch(request: AcpRunLaunchRequest): Promise<AcpLaunch>;
  discoveryLaunch(request: AcpDiscoveryLaunchRequest): Promise<AcpLaunch>;
}

/** The release of a launch that prepared nothing. */
export const releaseNothing = async (): Promise<void> => undefined;
