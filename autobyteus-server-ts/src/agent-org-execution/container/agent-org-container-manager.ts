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

  /** DS-003: reopens a stopped Org: its container file is read; no unit is restored until it is needed. */
  restore(orgRunIdInput: string): Promise<AgentOrgContainer> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const existing = this.live.get(orgRunId);
      if (existing?.isLive()) return existing;
      const file = await this.store.read(this.layout.getOrgDirPath(orgRunId), orgRunId);
      if (!file) throw new Error(`AGENT_ORG_STATE_PACKAGE_NOT_FOUND: AgentOrg '${orgRunId}' has no container file.`);
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
      return true;
    });
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
