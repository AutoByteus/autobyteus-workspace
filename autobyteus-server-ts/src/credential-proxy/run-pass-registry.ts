import { randomBytes } from "node:crypto";

/** The run a pass belongs to. */
export type RunPassHolder = Readonly<{ runId: string; agentDefinitionId: string }>;

/**
 * Run passes: random, in-memory values that identify one active run to server-owned local endpoints. A pass is in
 * the run's addresses (not a secret); it is worth only what its run may do and dies with the run. Lost on restart
 * (runs prepared again get new passes).
 */
export class RunPassRegistry {
  private readonly holders = new Map<string, RunPassHolder>();
  private readonly passByRunId = new Map<string, string>();

  /** The run's pass: the active one if it has one (a restored or reopened process reuses it), else a new one. */
  issue(holder: RunPassHolder): string {
    const existing = this.passByRunId.get(holder.runId);
    if (existing) return existing;
    const pass = `rp_${randomBytes(32).toString("base64url")}`;
    this.holders.set(pass, Object.freeze({ runId: holder.runId, agentDefinitionId: holder.agentDefinitionId }));
    this.passByRunId.set(holder.runId, pass);
    return pass;
  }

  lookup(pass: string): RunPassHolder | null {
    return this.holders.get(pass) ?? null;
  }

  /** Ends the run's pass. Idempotent. */
  revoke(runId: string): void {
    const pass = this.passByRunId.get(runId);
    if (!pass) return;
    this.passByRunId.delete(runId);
    this.holders.delete(pass);
  }
}
