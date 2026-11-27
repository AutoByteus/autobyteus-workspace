import { randomBytes } from "node:crypto";
import type { IntegrationGrant } from "./integration-access-rule.js";
import type { RelayCredentialKind } from "./provider-relays/provider-relay-settings.js";

type RunIdentity = Readonly<{ runId: string; agentDefinitionId: string }>;

/** The provider relays a pass may call, each with the relay credential kind its calls declare. */
export type GrantedProviderRelays = ReadonlyMap<string, RelayCredentialKind>;

/** The run a pass belongs to, the integrations it was granted when it was prepared, and its provider relays. */
export type RunPassHolder = Readonly<{
  kind: "run";
  runId: string;
  agentDefinitionId: string;
  /** Per integration ID: the skill and source that granted it (DS-004), checked again on every call. */
  grants: ReadonlyMap<string, IntegrationGrant>;
  /** The provider relays the run's runtime calls its model through. */
  providerRelays: GrantedProviderRelays;
}>;

/**
 * The relayed node's own pass (C1 set): its shared processes (Codex app-servers, model discovery) call the relays
 * with it. It belongs to no run and holds no integration.
 */
export type NodePassHolder = Readonly<{ kind: "node"; providerRelays: GrantedProviderRelays }>;

export type PassHolder = RunPassHolder | NodePassHolder;

const newPass = (): string => `rp_${randomBytes(32).toString("base64url")}`;

/**
 * Run passes: random, in-memory values that identify one active run (or, on a relayed node, the node's shared
 * processes) to server-owned local endpoints. A pass is in the run's addresses and its runtime's credential header
 * (not a secret); it is worth only what its holder may do and dies with the run. Lost on restart (runs prepared again
 * get new passes; the node pass is issued again when first needed).
 */
export class RunPassRegistry {
  private readonly holders = new Map<string, PassHolder>();
  private readonly passByRunId = new Map<string, string>();
  private nodePass: string | null = null;

  /**
   * The run's pass with its current integration grants: the active pass if it has one (a restored or reopened process
   * reuses it, with the grants of this preparation and its provider relays), else a new one.
   */
  issue(run: RunIdentity, grants: readonly IntegrationGrant[]): string {
    return this.update(run, (holder) => ({
      ...holder, grants: new Map(grants.map((grant) => [grant.integrationId, grant])),
    }));
  }

  /** The run's pass with this provider relay granted for this kind (its other grants unchanged). */
  grantProviderRelay(run: RunIdentity, relayId: string, kind: RelayCredentialKind): string {
    return this.update(run, (holder) => ({ ...holder, providerRelays: new Map([...holder.providerRelays, [relayId, kind]]) }));
  }

  /** The node pass with this provider relay granted for this kind; one pass for the node's lifetime. */
  grantNodeProviderRelay(relayId: string, kind: RelayCredentialKind): string {
    const pass = this.nodePass ?? newPass();
    const current = this.nodePass ? this.holders.get(pass) : undefined;
    const relays = new Map(current?.providerRelays ?? []);
    relays.set(relayId, kind);
    this.holders.set(pass, Object.freeze({ kind: "node", providerRelays: relays }));
    this.nodePass = pass;
    return pass;
  }

  /**
   * A preparation that grants no integration: an active pass keeps only its provider relays (its old shell's
   * integration calls are refused).
   */
  clearGrants(runId: string): void {
    const pass = this.passByRunId.get(runId);
    const holder = pass ? this.holders.get(pass) : undefined;
    if (pass && holder?.kind === "run") this.holders.set(pass, Object.freeze({ ...holder, grants: new Map() }));
  }

  /** The integrations the run's pass holds now (none without a pass). */
  grantedIntegrationIds(runId: string): ReadonlySet<string> {
    const pass = this.passByRunId.get(runId);
    const holder = pass ? this.holders.get(pass) : undefined;
    return new Set(holder?.kind === "run" ? holder.grants.keys() : []);
  }

  lookup(pass: string): PassHolder | null {
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
    const pass = existing ?? newPass();
    const stored = existing ? this.holders.get(existing) : undefined;
    const current: RunPassHolder = stored?.kind === "run" ? stored : {
      kind: "run", runId: run.runId, agentDefinitionId: run.agentDefinitionId, grants: new Map(), providerRelays: new Map(),
    };
    this.holders.set(pass, Object.freeze(change({ ...current, agentDefinitionId: run.agentDefinitionId })));
    this.passByRunId.set(run.runId, pass);
    return pass;
  }
}
