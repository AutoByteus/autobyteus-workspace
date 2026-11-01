import { randomBytes } from "node:crypto";
import type { IntegrationGrant } from "./integration-access-rule.js";

/** The run a pass belongs to, and the integrations it was granted when it was prepared. */
export type RunPassHolder = Readonly<{
  runId: string;
  agentDefinitionId: string;
  /** Per integration ID: the skill and source that granted it (DS-004), checked again on every call. */
  grants: ReadonlyMap<string, IntegrationGrant>;
}>;

/**
 * Run passes: random, in-memory values that identify one active run to server-owned local endpoints. A pass is in
 * the run's addresses (not a secret); it is worth only what its run may do and dies with the run. Lost on restart
 * (runs prepared again get new passes).
 */
export class RunPassRegistry {
  private readonly holders = new Map<string, RunPassHolder>();
  private readonly passByRunId = new Map<string, string>();

  /**
   * The run's pass with its current grants: the active pass if it has one (a restored or reopened process reuses it,
   * with the grants of this preparation), else a new one.
   */
  issue(run: Readonly<{ runId: string; agentDefinitionId: string }>, grants: readonly IntegrationGrant[]): string {
    const pass = this.passByRunId.get(run.runId) ?? `rp_${randomBytes(32).toString("base64url")}`;
    this.holders.set(pass, Object.freeze({
      runId: run.runId,
      agentDefinitionId: run.agentDefinitionId,
      grants: new Map(grants.map((grant) => [grant.integrationId, grant])),
    }));
    this.passByRunId.set(run.runId, pass);
    return pass;
  }

  /** A preparation that grants nothing: an active pass keeps working for nothing (its old shell's calls are refused). */
  clearGrants(runId: string): void {
    const pass = this.passByRunId.get(runId);
    const holder = pass ? this.holders.get(pass) : undefined;
    if (pass && holder) this.holders.set(pass, Object.freeze({ ...holder, grants: new Map() }));
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
