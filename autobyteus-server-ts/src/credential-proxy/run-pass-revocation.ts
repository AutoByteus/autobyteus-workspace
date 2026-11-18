import type { RunPassRegistry } from "./run-pass-registry.js";

/** The one way a run pass ends: at run release and when a run's activation fails. */
export interface RunPassRevocation {
  /** Ends the run's pass with all its grants, integrations and provider relay (idempotent): its next call is refused. */
  revokeForRun(runId: string): void;
}

export class RegistryRunPassRevocation implements RunPassRevocation {
  constructor(private readonly passes: Pick<RunPassRegistry, "revoke">) {}

  revokeForRun(runId: string): void {
    this.passes.revoke(runId);
  }
}
