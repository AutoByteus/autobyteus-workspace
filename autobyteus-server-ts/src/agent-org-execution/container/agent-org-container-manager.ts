import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { TeamRunApplicationBinding } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { AgentOrgContainerStore } from "../../run-history/store/agent-org-container-store.js";
import { validateAgentOrgContainerPayload } from "../../run-history/store/agent-org-container-file-schema.js";
import { getAgentOrgRunExecutionTreePath } from "../../run-history/store/agent-org-run-execution-tree-path.js";
import { readRawTreeFile } from "../../run-history/store/raw-tree-file.js";
import { isAgentOrgContainerPayload, type AgentOrgContainerFile, type AgentOrgUnit } from "../domain/agent-org-container-file.js";
import { AgentOrgContainer } from "./agent-org-container.js";
import type { AgentOrgContainerPlan } from "./agent-org-container-plan.js";
import type { AgentOrgUnitRuns } from "./agent-org-unit-runs.js";
import { planOrgMembershipChange, releaseStoppedUnits, type OrgDefinitionView } from "../membership/org-membership-change.js";

/** A committed Org change (REQ-009): the files before and after, the units that joined and left, and those leaving while they finish. */
export type OrgFollowResult = Readonly<{
  before: AgentOrgContainerFile;
  file: AgentOrgContainerFile;
  joined: readonly AgentOrgUnit[];
  left: readonly AgentOrgUnit[];
  /** Run IDs of the units that left while running: each finishes, then stops (`releaseStopped` clears its marker). */
  leaving: ReadonlySet<string>;
}>;

const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);

export type CreateAgentOrgContainerInput = Readonly<{
  orgRunId: string;
  orgDefinitionId: string;
  orgDefinitionName: string;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  applicationBinding: TeamRunApplicationBinding | null;
  plan: AgentOrgContainerPlan;
  createdAt?: string;
}>;

/**
 * The lifecycle of Org containers (DS-001, DS-003): create (each unit run first, then the container file, once), Stop
 * (every unit run stopped) and reopen (the container file read; each unit is restored when first needed). One transition
 * at a time per Org run.
 */
export class AgentOrgContainerManager {
  private readonly live = new Map<string, AgentOrgContainer>();
  private readonly transitions = new Map<string, Promise<void>>();
  private readonly layout: AgentMemoryLayout;
  private readonly store: AgentOrgContainerStore;

  constructor(private readonly dependencies: Readonly<{ memoryDir: string; units: AgentOrgUnitRuns; store?: AgentOrgContainerStore }>) {
    this.layout = new AgentMemoryLayout(dependencies.memoryDir);
    this.store = dependencies.store ?? new AgentOrgContainerStore();
  }

  /**
   * DS-001: every unit becomes its own run (members Offline until first work), then the container file lists them. A unit
   * that cannot be created, or a container file that cannot be written, discards the units made so far and fails.
   */
  create(input: CreateAgentOrgContainerInput): Promise<AgentOrgContainer> {
    const orgRunId = required(input.orgRunId, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      if (this.live.has(orgRunId) || await this.isStored(orgRunId)) throw new Error(`AgentOrg '${orgRunId}' already exists.`);
      const units: AgentOrgUnit[] = [];
      try {
        for (const planned of input.plan.units) {
          const context = Object.freeze({ containedIn: Object.freeze({ orgRunId, address: planned.address }), applicationBinding: input.applicationBinding });
          const runId = planned.kind === "agent_team"
            ? await this.dependencies.units.createTeamUnit(planned, context)
            : await this.dependencies.units.createAgentUnit(planned, context);
          units.push(Object.freeze({ address: planned.address, kind: planned.kind, runId,
            definitionId: planned.kind === "agent_team" ? planned.teamDefinitionId : planned.agentDefinitionId }));
        }
        const file = validateAgentOrgContainerPayload({
          subjectKind: "agent_org", createdAt: input.createdAt ?? new Date().toISOString(), archivedAt: null,
          applicationBinding: input.applicationBinding, handoffs: input.plan.orgRules,
          rootOrg: { address: "/", orgDefinitionId: input.orgDefinitionId, orgDefinitionName: input.orgDefinitionName, orgRunId,
            defaultLaunchConfiguration: input.defaultLaunchConfiguration, units, formerUnits: [] },
        }, orgRunId);
        const written = await this.store.write(this.layout.getOrgDirPath(orgRunId), file);
        if (written.outcome !== "committed") throw new Error(`AgentOrg '${orgRunId}' container file was not saved (${written.outcome}).`);
        const container = new AgentOrgContainer(file, this.dependencies.units);
        this.live.set(orgRunId, container);
        return container;
      } catch (error) {
        await Promise.allSettled(units.map((unit) => this.dependencies.units.discardUnit(unit)));
        throw error;
      }
    });
  }

  /**
   * DS-003: reopens a stopped Org: its container file is read; no unit is restored until it is needed. Nothing ran while it
   * was stopped, so a unit still marked leaving is released first (as a Team run's restore clears its markers).
   */
  restore(orgRunIdInput: string): Promise<AgentOrgContainer> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const existing = this.live.get(orgRunId);
      if (existing?.isLive()) return existing;
      const stored = await this.store.read(this.layout.getOrgDirPath(orgRunId), orgRunId);
      if (!stored) throw new Error(`AGENT_ORG_STATE_PACKAGE_NOT_FOUND: AgentOrg '${orgRunId}' has no container file.`);
      const file = await this.writeRelease(stored, () => false) ?? stored;
      const container = new AgentOrgContainer(file, this.dependencies.units);
      this.live.set(orgRunId, container);
      return container;
    });
  }

  /** DS-003: Stop stops every unit run; `false` when one did not stop (the Org stays live; a retry stops the rest). */
  stop(orgRunIdInput: string): Promise<boolean> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const container = this.live.get(orgRunId);
      if (!container) return false;
      if (!await container.stop()) return false;
      this.live.delete(orgRunId);
      // Every unit stopped: no unit is leaving any more (best effort; the next restore releases what this did not).
      await this.writeRelease(container.getFile(), () => false).catch(() => null);
      return true;
    });
  }

  /**
   * DS-006: a live container follows its definition view, planned against its current file under its transition: each
   * new unit becomes its own run first (Offline; one that cannot be created is not added, with a warning, and the next
   * change tries again), then the file is written once; a file that is not written discards the new units and changes
   * nothing. `isRunning`: whether a unit's run is live now (a unit that leaves while live is marked leaving).
   */
  follow(orgRunIdInput: string, view: OrgDefinitionView, isRunning: (unit: AgentOrgUnit) => boolean): Promise<OrgFollowResult | null> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const container = this.live.get(orgRunId);
      if (!container?.isLive()) return null;
      const before = container.getFile();
      const plan = planOrgMembershipChange(before, view);
      if (!plan) return null;
      const created = new Map<string, string>();
      const made: AgentOrgUnit[] = [];
      for (const planned of plan.toCreate) {
        const context = Object.freeze({ containedIn: Object.freeze({ orgRunId, address: planned.address }), applicationBinding: before.applicationBinding });
        try {
          const runId = planned.kind === "agent_team"
            ? await this.dependencies.units.createTeamUnit(planned, context)
            : await this.dependencies.units.createAgentUnit(planned, context);
          created.set(planned.address, runId);
          made.push(Object.freeze({ address: planned.address, kind: planned.kind, runId,
            definitionId: planned.kind === "agent_team" ? planned.teamDefinitionId : planned.agentDefinitionId }));
        } catch (error) {
          console.warn(`AGENT_ORG_UNIT_NOT_ADDED: AgentOrg '${orgRunId}' cannot add ${planned.address} yet: ${errorText(error)}`);
        }
      }
      const leaving = new Set(plan.left.filter(isRunning).map((unit) => unit.runId));
      try {
        const file = plan.next(created, leaving);
        const written = await this.store.write(this.layout.getOrgDirPath(orgRunId), file);
        if (written.outcome !== "committed") throw new Error(`its container file was not saved (${written.outcome})`);
        container.replaceFile(file);
        const known = new Set(before.rootOrg.units.map((unit) => unit.runId));
        return Object.freeze({ before, file, joined: Object.freeze(file.rootOrg.units.filter((unit) => !known.has(unit.runId))),
          left: plan.left, leaving });
      } catch (error) {
        await Promise.allSettled(made.map((unit) => this.dependencies.units.discardUnit(unit)));
        console.warn(`AGENT_ORG_DEFINITION_NOT_FOLLOWED: AgentOrg '${orgRunId}' keeps its units: ${errorText(error)}.`);
        return null;
      }
    });
  }

  /** A unit leaving the Org stopped: its marker (and any other stale one) is cleared under the transition; the file now. */
  releaseStopped(orgRunIdInput: string, isRunning: (unit: AgentOrgUnit) => boolean): Promise<AgentOrgContainerFile | null> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const container = this.live.get(orgRunId);
      if (!container?.isLive()) return null;
      const file = await this.writeRelease(container.getFile(), isRunning);
      if (file) container.replaceFile(file);
      return file;
    });
  }

  /** Stops one unit's run (a unit leaving the Org once it finished). */
  stopUnit(unit: AgentOrgUnit): Promise<boolean> { return this.dependencies.units.stopUnit(unit); }

  /** The file with stale leaving markers cleared, written; `null` when none was stale. */
  private async writeRelease(file: AgentOrgContainerFile, isRunning: (unit: AgentOrgUnit) => boolean): Promise<AgentOrgContainerFile | null> {
    const next = releaseStoppedUnits(file, isRunning);
    if (!next) return null;
    const written = await this.store.write(this.layout.getOrgDirPath(file.rootOrg.orgRunId), next);
    if (written.outcome !== "committed") {
      console.warn(`AGENT_ORG_UNIT_RELEASE_NOT_SAVED: AgentOrg '${file.rootOrg.orgRunId}': a unit stays marked leaving until the next change (${written.outcome}).`);
      return null;
    }
    return next;
  }

  getLive(orgRunIdInput: string): AgentOrgContainer | null {
    const container = this.live.get(required(orgRunIdInput, "orgRunId")) ?? null;
    return container?.isLive() ? container : null;
  }
  listLive(): readonly AgentOrgContainer[] { return Object.freeze([...this.live.values()].filter((container) => container.isLive())); }

  /** The stored container file, or null when the Org is absent or stored as a released Org tree v1. */
  readStored(orgRunId: string): Promise<AgentOrgContainerFile | null> {
    return this.store.readIfContainer(this.layout.getOrgDirPath(orgRunId), orgRunId);
  }

  /** Whether the Org run's file is a container (not a released Org tree v1). */
  async isStored(orgRunId: string): Promise<boolean> {
    return isAgentOrgContainerPayload(await readRawTreeFile(getAgentOrgRunExecutionTreePath(this.layout.getOrgDirPath(orgRunId))));
  }

  private async withTransition<T>(orgRunId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.transitions.get(orgRunId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.transitions.set(orgRunId, tail);
    await previous;
    try { return await operation(); }
    finally {
      release();
      if (this.transitions.get(orgRunId) === tail) this.transitions.delete(orgRunId);
    }
  }
}

const required = (value: string, label: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
