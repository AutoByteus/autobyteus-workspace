import type { DelegatedChild, DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type {
  DelegatedLaunchChange,
  DelegatedLaunchModelOptions,
  DelegatedLaunchUpdateOutcome,
  DelegatedRunReference,
} from "../../agent-collaboration/domain/delegated-launch-selection.js";
import type { StoppedRunSelectionInput } from "../../agent-execution/services/standalone-stopped-run-selection-updater.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { TeamRunSelectionPatch } from "../../agent-team-execution/services/team-run-selection-mutator.js";
import type { RunModelSelectionService } from "../../llm-management/services/run-model-selection-service.js";
import type { RunModelConfigFieldError, RunModelConfigUpdateOutcome } from "../domain/run-model-config.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

/** One run's own Save, built from a delegator's rows. */
export type ChildLaunchSave =
  | Readonly<{ kind: "agent"; name: string; input: StoppedRunSelectionInput }>
  | Readonly<{ kind: "team"; name: string; teamRunId: string; patches: readonly TeamRunSelectionPatch[] }>;

/** What an ordinary stopped-run Save (or its check) answers. */
export type OwnSaveResult = Readonly<{
  success: boolean;
  outcome: RunModelConfigUpdateOutcome;
  message: string;
  fieldErrors: readonly RunModelConfigFieldError[];
}>;

export type ChildLaunchRefusal = Readonly<{
  outcome: DelegatedLaunchUpdateOutcome;
  message: string;
  fieldErrors: readonly RunModelConfigFieldError[];
}>;

export type ChildLaunchPorts = Readonly<{
  tree: Pick<DelegationIndex, "openChildrenOf">;
  agentMetadata(agentRunId: string): Promise<AgentRunMetadata | null>;
  teamTree(teamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null>;
  isRunning(run: DelegatedRunReference): boolean;
  agents: Readonly<{
    check(input: StoppedRunSelectionInput): Promise<OwnSaveResult | null>;
    save(input: StoppedRunSelectionInput): Promise<OwnSaveResult>;
  }>;
  teams: Readonly<{
    check(input: { teamRunId: string; selectionPatches: readonly TeamRunSelectionPatch[] }): Promise<OwnSaveResult | null>;
    save(input: { teamRunId: string; selectionPatches: readonly TeamRunSelectionPatch[] }): Promise<OwnSaveResult>;
  }>;
  modelOptions: Pick<RunModelSelectionService, "listOptionsMany">;
}>;

const refusal = (outcome: DelegatedLaunchUpdateOutcome, message: string, fieldErrors: readonly RunModelConfigFieldError[] = []): ChildLaunchRefusal =>
  Object.freeze({ outcome, message, fieldErrors });

/**
 * A delegator's Settings rows for the runs it delegated to on this node (design DS-8, SR-039): each row's change is that
 * run's own ordinary stopped-run Save, by its identity. An agent child: its own selection; a team child's team row: its
 * team scope; a member row: a member patch at the member's address in its own team. The runs it names are checked first
 * (stopped, every patch valid), then saved one by one in row order; nothing is written for another run.
 */
export class DelegatedChildLaunches {
  constructor(private readonly ports: ChildLaunchPorts) {}

  /** The rows' changes as each child's own Save, in row order, checked; or the refusal of the whole Save. */
  async plan(parent: RootExecutionIdentity, changes: readonly DelegatedLaunchChange[]): Promise<
    Readonly<{ kind: "refused"; refusal: ChildLaunchRefusal }> | Readonly<{ kind: "planned"; saves: readonly ChildLaunchSave[] }>> {
    const children = this.localChildren(parent);
    const saves: ChildLaunchSave[] = [];
    const teams = new Map<string, { name: string; patches: TeamRunSelectionPatch[] }>();
    const seen = new Set<string>();
    for (const [index, change] of changes.entries()) {
      const agentRunId = change.agentRunId?.trim() || null;
      const teamRunId = change.teamRunId?.trim() || null;
      if ((agentRunId === null) === (teamRunId === null)) {
        return refused("VALIDATION_FAILED", "Each change names exactly one of agentRunId or teamRunId.", [{ path: `changes[${index}]`, message: "Name one run." }]);
      }
      const key = agentRunId ? `a:${agentRunId}` : `t:${teamRunId}`;
      if (seen.has(key)) return refused("VALIDATION_FAILED", `The change for '${agentRunId ?? teamRunId}' is repeated.`);
      seen.add(key);
      const agentChild = agentRunId ? children.find((child) => "agentRunId" in child.run && child.run.agentRunId === agentRunId) : undefined;
      if (agentChild) {
        saves.push({ kind: "agent", name: agentChild.recipientAddress, input: { agentRunId: agentRunId!, ...change.selection } });
        continue;
      }
      const located = await this.teamRowOf(children, agentRunId, teamRunId);
      if (!located) return refused("NOT_FOUND", `'${agentRunId ?? teamRunId}' is not a run this run delegated to.`);
      const patch: TeamRunSelectionPatch = { ...change.selection,
        scopeKind: agentRunId ? "CONFIGURED_AGENT" : "CONFIGURED_TEAM", scopeAddress: located.scopeAddress };
      const team = teams.get(located.teamRunId);
      if (team) { team.patches.push(patch); continue; }
      const entry = { name: located.child.recipientAddress, patches: [patch] };
      teams.set(located.teamRunId, entry);
      saves.push({ kind: "team", name: entry.name, teamRunId: located.teamRunId, patches: entry.patches });
    }
    for (const save of saves) {
      const reference = save.kind === "agent" ? { agentRunId: save.input.agentRunId } : { teamRunId: save.teamRunId };
      if (this.ports.isRunning(reference)) return refused("COPY_RUNNING", `${save.name} is running: stop it to change its model.`);
    }
    for (const save of saves) {
      const checked = save.kind === "agent"
        ? await this.ports.agents.check(save.input)
        : await this.ports.teams.check({ teamRunId: save.teamRunId, selectionPatches: save.patches });
      if (checked) return refused(checked.outcome, `${save.name}: ${checked.message}`, checked.fieldErrors);
    }
    return { kind: "planned", saves: Object.freeze(saves) };
  }

  /**
   * Saves each run in order. A failure after others were saved reports `PERSISTENCE_FAILED`, naming the runs saved and
   * the one that failed (ARCH-REV-014): each saved run keeps its save, since its file is that run's truth.
   */
  async apply(saves: readonly ChildLaunchSave[], savedBefore: readonly string[] = []): Promise<
    Readonly<{ ok: true; changed: boolean }> | Readonly<{ ok: false; refusal: ChildLaunchRefusal }>> {
    const saved = [...savedBefore];
    let changed = false;
    for (const save of saves) {
      const result = save.kind === "agent"
        ? await this.ports.agents.save(save.input)
        : await this.ports.teams.save({ teamRunId: save.teamRunId, selectionPatches: save.patches });
      if (!result.success) {
        return { ok: false, refusal: saved.length
          ? refusal("PERSISTENCE_FAILED", `Saved: ${saved.join(", ")}. Not saved: ${save.name} (${result.message})`, result.fieldErrors)
          : refusal(result.outcome, `${save.name}: ${result.message}`, result.fieldErrors) };
      }
      changed ||= result.outcome === "UPDATED";
      saved.push(save.name);
    }
    return { ok: true, changed };
  }

  /** Model options of each editable row: an agent child, a team child's team level and each of its members. */
  async modelOptions(parent: RootExecutionIdentity): Promise<readonly DelegatedLaunchModelOptions[]> {
    const rows: { scope: "agent" | "team"; agentRunId: string | null; teamRunId: string | null;
      context: Parameters<RunModelSelectionService["listOptionsMany"]>[0][number] }[] = [];
    const contextOf = (launch: { runtimeKind: AgentRunMetadata["runtimeKind"]; llmModelIdentifier: string; workspaceRootPath: string | null }) =>
      ({ runtimeKind: launch.runtimeKind, currentModelIdentifier: launch.llmModelIdentifier, workspaceRootPath: launch.workspaceRootPath ?? process.cwd() });
    for (const child of this.localChildren(parent)) {
      if ("agentRunId" in child.run) {
        const metadata = await this.ports.agentMetadata(child.run.agentRunId);
        if (metadata) rows.push({ scope: "agent", agentRunId: metadata.runId, teamRunId: null, context: contextOf(metadata) });
        continue;
      }
      const tree = await this.ports.teamTree(child.run.teamRunId);
      if (!tree) continue;
      rows.push({ scope: "team", agentRunId: null, teamRunId: tree.rootTeam.teamRunId, context: contextOf(tree.rootTeam.defaultLaunchConfiguration) });
      for (const member of tree.rootTeam.members) {
        rows.push({ scope: "agent", agentRunId: member.agentRunId, teamRunId: null, context: contextOf(member.launchConfiguration) });
      }
    }
    const options = await this.ports.modelOptions.listOptionsMany(rows.map((row) => row.context));
    return Object.freeze(rows.map((row, index) => Object.freeze({
      ...options[index]!, scope: row.scope, agentRunId: row.agentRunId, teamRunId: row.teamRunId })));
  }

  /** A run this run delegated to on this node with an open Task (a child row), by its identity. */
  localChild(parent: RootExecutionIdentity, target: DelegatedRunReference): DelegatedChild | null {
    return this.ports.tree.openChildrenOf(parent).find((child) => "agentRunId" in target
      ? "agentRunId" in child.run && child.run.agentRunId === target.agentRunId
      : "teamRunId" in child.run && child.run.teamRunId === target.teamRunId) ?? null;
  }

  private localChildren(parent: RootExecutionIdentity): readonly DelegatedChild[] {
    return this.ports.tree.openChildrenOf(parent).filter((child) => child.nodeId === undefined);
  }

  /** A team child's team row (`teamRunId`), or the team child a member row's agent belongs to, with its scope there. */
  private async teamRowOf(children: readonly DelegatedChild[], agentRunId: string | null, teamRunId: string | null) {
    for (const child of children) {
      if (!("teamRunId" in child.run)) continue;
      if (teamRunId) {
        if (child.run.teamRunId === teamRunId) return { child, teamRunId, scopeAddress: "/" };
        continue;
      }
      const tree = await this.ports.teamTree(child.run.teamRunId);
      const member = tree?.rootTeam.members.find((candidate) => candidate.agentRunId === agentRunId);
      if (member) return { child, teamRunId: child.run.teamRunId, scopeAddress: member.address as string };
    }
    return null;
  }
}

const refused = (outcome: DelegatedLaunchUpdateOutcome, message: string, fieldErrors: readonly RunModelConfigFieldError[] = []) =>
  ({ kind: "refused" as const, refusal: refusal(outcome, message, fieldErrors) });

/** The process wiring: each child's own file, its own run services, and the loaded delegation tree. */
export const createDelegatedChildLaunches = (input: Readonly<{
  memoryDir: string;
  tree: Pick<DelegationIndex, "openChildrenOf">;
  agentRuns: Pick<AgentRunService, "checkStoppedSelection" | "updateStoppedSelection">;
  activeAgentRun(agentRunId: string): unknown | null;
  teamManager: Pick<AgentTeamRunManager, "getManagedTeamRun" | "checkStoppedSelections" | "updateStoppedSelections">;
  modelOptions: Pick<RunModelSelectionService, "listOptionsMany">;
}>): DelegatedChildLaunches => {
  const metadata = new AgentRunMetadataStore(input.memoryDir);
  const layout = new AgentMemoryLayout(input.memoryDir);
  const teams = new TeamRunExecutionTreeStore();
  return new DelegatedChildLaunches({
    tree: input.tree,
    agentMetadata: (agentRunId) => metadata.readMetadata(agentRunId),
    teamTree: (teamRunId) => teams.read(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId),
    isRunning: (run) => "agentRunId" in run ? input.activeAgentRun(run.agentRunId) !== null : input.teamManager.getManagedTeamRun(run.teamRunId) !== null,
    agents: { check: (selection) => input.agentRuns.checkStoppedSelection(selection), save: (selection) => input.agentRuns.updateStoppedSelection(selection) },
    teams: { check: (save) => input.teamManager.checkStoppedSelections(save), save: (save) => input.teamManager.updateStoppedSelections(save) },
    modelOptions: input.modelOptions,
  });
};
