import { randomBytes } from "node:crypto";
import type { IntegrationGrant } from "./integration-access-rule.js";

type RunIdentity = Readonly<{ runId: string; agentDefinitionId: string }>;

/** The run a pass belongs to, the integrations it was granted when it was prepared, and its provider relay. */
export type RunPassHolder = Readonly<{
  runId: string;
  agentDefinitionId: string;
  /** Per integration ID: the skill and source that granted it (DS-004), checked again on every call. */
  grants: ReadonlyMap<string, IntegrationGrant>;
  /** The provider relay the run's runtime calls its model through (`null`: none). */
  providerRelayId: string | null;
}>;

/**
 * Run passes: random, in-memory values that identify one active run to server-owned local endpoints. A pass is in
 * the run's addresses and its runtime's API-key header (not a secret); it is worth only what its run may do and dies
 * with the run. Lost on restart (runs prepared again get new passes).
 */
export class RunPassRegistry {
  private readonly holders = new Map<string, RunPassHolder>();
  private readonly passByRunId = new Map<string, string>();

  /**
   * The run's pass with its current integration grants: the active pass if it has one (a restored or reopened process
   * reuses it, with the grants of this preparation and its provider relay), else a new one.
   */
  issue(run: RunIdentity, grants: readonly IntegrationGrant[]): string {
    return this.update(run, (holder) => ({
      ...holder, grants: new Map(grants.map((grant) => [grant.integrationId, grant])),
    }));
  }

  /** The run's pass with this provider relay granted (its integration grants unchanged). */
  grantProviderRelay(run: RunIdentity, providerRelayId: string): string {
    return this.update(run, (holder) => ({ ...holder, providerRelayId }));
  }

  /**
   * A preparation that grants no integration: an active pass keeps only its provider relay (its old shell's
   * integration calls are refused).
   */
  clearGrants(runId: string): void {
    const pass = this.passByRunId.get(runId);
    const holder = pass ? this.holders.get(pass) : undefined;
    if (pass && holder) this.holders.set(pass, Object.freeze({ ...holder, grants: new Map() }));
  }

  lookup(pass: string): RunPassHolder | null {
    return this.holders.get(pass) ?? null;
  }

  /** Ends the run's pass with every grant it holds. Idempotent. */
  revoke(runId: string): void {
    const pass = this.passByRunId.get(runId);
    if (!pass) return;
    this.passByRunId.delete(runId);
    this.holders.delete(pass);
  }

  private update(run: RunIdentity, change: (holder: RunPassHolder) => RunPassHolder): string {
    const existing = this.passByRunId.get(run.runId);
    const pass = existing ?? `rp_${randomBytes(32).toString("base64url")}`;
    const current = (existing ? this.holders.get(existing) : undefined) ?? {
      runId: run.runId, agentDefinitionId: run.agentDefinitionId, grants: new Map(), providerRelayId: null,
    };
    this.holders.set(pass, Object.freeze(change({ ...current, agentDefinitionId: run.agentDefinitionId })));
    this.passByRunId.set(run.runId, pass);
    return pass;
  }
}
