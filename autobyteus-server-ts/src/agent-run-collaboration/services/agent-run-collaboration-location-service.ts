import fs from "node:fs";
import { catalogCopyExecutionSource, taskExecutionListsOf } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import fsPromises from "node:fs/promises";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  LocatedExecutionGroup,
  LocatedExecutionKind,
} from "../../agent-collaboration/execution/domain/located-execution-structure.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { getAgentRunCollaborationTreePath } from "../../run-history/store/agent-run-collaboration-tree-path.js";
import { AgentRunCollaborationPackageStore } from "../../run-history/store/agent-run-collaboration-tree-store.js";
import type { AgentRunCollaborationTreeSnapshot } from "../domain/agent-run-collaboration-tree.js";
import { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";

/** One child execution (task Agent or task-Team member) of an Agent root. The host is a standalone run. */
export type LocatedAgentRunCollaborationAgentExecution = Readonly<{
  rootSubjectKind: "agent";
  rootRunId: string;
  containingTeamRunId: string | null;
  ancestorTeamRunIds: readonly string[];
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  platformAgentRunId: string | null;
  configuredPlacement: null;
  /** The collaborator's launch snapshot (a Team's members share its default). */
  launchConfiguration: AgentLaunchConfiguration | null;
  executionKind: Exclude<LocatedExecutionKind, "configured">;
  startedAt: string | null;
  groupPath: readonly LocatedExecutionGroup[];
  memoryDir: string;
  tree: AgentRunCollaborationTreeSnapshot;
  isActive: boolean;
}>;

type ActiveRoots = Readonly<{
  getActiveTree(hostRunId: string): AgentRunCollaborationTreeSnapshot | null;
}>;
type AgentLookup = { rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null };
const STORED_ONLY: ActiveRoots = Object.freeze({ getActiveTree: () => null });

export const collaboratorLaunchConfiguration = (entry: CollaboratorEntry | null): AgentLaunchConfiguration | null =>
  !entry ? null : entry.kind === "agent" ? entry.launchConfiguration : entry.defaultLaunchConfiguration;

/**
 * The third location family: children of Agent roots, stored under
 * `memory/agents/<hostRunId>/collaboration/`. A run without a package has no children.
 */
export class AgentRunCollaborationLocationService {
  private readonly layout: AgentMemoryLayout;
  private readonly store: AgentRunCollaborationPackageStore;
  private readonly roots: ActiveRoots;

  constructor(input: { memoryDir: string; roots?: ActiveRoots; store?: AgentRunCollaborationPackageStore }) {
    this.layout = new AgentMemoryLayout(input.memoryDir);
    this.store = input.store ?? new AgentRunCollaborationPackageStore();
    this.roots = input.roots ?? STORED_ONLY;
  }

  async findAgent(input: AgentLookup): Promise<LocatedAgentRunCollaborationAgentExecution | null> {
    for (const hostRunId of await this.lookupHostRunIds(input)) {
      const located = this.findInTree(await this.readTree(hostRunId), input);
      if (located) return located;
    }
    return null;
  }

  findAgentSync(input: AgentLookup): LocatedAgentRunCollaborationAgentExecution | null {
    for (const hostRunId of this.lookupHostRunIdsSync(input)) {
      const located = this.findInTree(this.readTreeSync(hostRunId), input);
      if (located) return located;
    }
    return null;
  }

  async listAgents(input: { rootRunId?: string | null } = {}): Promise<LocatedAgentRunCollaborationAgentExecution[]> {
    const output: LocatedAgentRunCollaborationAgentExecution[] = [];
    for (const hostRunId of await this.lookupHostRunIds(input)) {
      const tree = await this.readTree(hostRunId);
      if (!tree) continue;
      const index = new AgentRunCollaborationExecutionIndex(tree);
      output.push(...index.listChildAgents().map((agent) => this.toLocation(tree, index, agent.agentRunId)));
    }
    return output;
  }

  /** Whether a child AgentRun or TeamRun of any Agent root uses this identity. */
  async containsRunId(runIdInput: string): Promise<boolean> {
    const runId = runIdInput.trim();
    if (!runId) throw new Error("runId is required.");
    for (const hostRunId of await this.listHostRunIds()) {
      const tree = await this.readTree(hostRunId);
      if (!tree) continue;
      const index = new AgentRunCollaborationExecutionIndex(tree);
      if (index.getTeam(runId) || (index.getAgent(runId) && index.hostRunId !== runId)) return true;
    }
    return false;
  }

  /** Host run IDs whose run directory holds a collaboration package, sorted. */
  async listHostRunIds(): Promise<string[]> {
    const root = this.layout.getStandaloneRootDirPath();
    const entries = await fsPromises.readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    const candidates = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
    const present = await Promise.all(candidates.map(async (id) =>
      fsPromises.access(this.treePath(id)).then(() => id, () => null)));
    return present.filter((id): id is string => id !== null).sort();
  }

  private listHostRunIdsSync(): string[] {
    const root = this.layout.getStandaloneRootDirPath();
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && fs.existsSync(this.treePath(entry.name)))
      .map((entry) => entry.name)
      .sort();
  }

  private async lookupHostRunIds(input: { rootRunId?: string | null }): Promise<string[]> {
    const requested = input.rootRunId?.trim() || null;
    return requested ? [requested] : this.listHostRunIds();
  }

  private lookupHostRunIdsSync(input: { rootRunId?: string | null }): string[] {
    const requested = input.rootRunId?.trim() || null;
    return requested ? [requested] : this.listHostRunIdsSync();
  }

  private treePath(hostRunId: string): string {
    return getAgentRunCollaborationTreePath(this.layout.getAgentRunCollaborationDirPath(hostRunId));
  }

  private readTree(hostRunId: string): Promise<AgentRunCollaborationTreeSnapshot | null> {
    const active = this.roots.getActiveTree(hostRunId);
    if (active) return Promise.resolve(active);
    return this.store.readTree(this.layout.getAgentRunCollaborationDirPath(hostRunId), hostRunId);
  }

  private readTreeSync(hostRunId: string): AgentRunCollaborationTreeSnapshot | null {
    return this.roots.getActiveTree(hostRunId)
      ?? this.store.readTreeSync(this.layout.getAgentRunCollaborationDirPath(hostRunId), hostRunId);
  }

  private findInTree(
    tree: AgentRunCollaborationTreeSnapshot | null,
    input: AgentLookup,
  ): LocatedAgentRunCollaborationAgentExecution | null {
    if (!tree) return null;
    const index = new AgentRunCollaborationExecutionIndex(tree);
    const agentRunId = input.agentRunId?.trim() || null;
    const memberAddress = input.memberAddress?.trim() || null;
    const containingTeamRunId = input.containingTeamRunId?.trim() || null;
    const matches = index.listChildAgents().filter((agent) =>
      (!agentRunId || agent.agentRunId === agentRunId)
      && (!memberAddress || agent.address === memberAddress)
      && (!containingTeamRunId || (agent.host.hostKind === "team" ? agent.host.hostRunId : null) === containingTeamRunId));
    return matches.length === 1 ? this.toLocation(tree, index, matches[0]!.agentRunId) : null;
  }

  private toLocation(
    tree: AgentRunCollaborationTreeSnapshot,
    index: AgentRunCollaborationExecutionIndex,
    agentRunId: string,
  ): LocatedAgentRunCollaborationAgentExecution {
    const agent = index.requireAgent(agentRunId);
    if (agent.executionKind === "host") throw new Error("The Agent-root host is located as a standalone run.");
    const scope = index.getPhysicalScopeForAgent(agentRunId);
    const groups = agent.host.hostKind === "team"
      ? [...index.listTeamAncestorsDeepestFirst(agent.host.hostRunId)].reverse()
      : [];
    const outermost = groups[0] ?? null;
    const collaboratorAddress = outermost ? outermost.address : agent.address;
    return Object.freeze({
      rootSubjectKind: "agent",
      rootRunId: tree.host.agentRunId,
      containingTeamRunId: agent.host.hostKind === "team" ? agent.host.hostRunId : null,
      ancestorTeamRunIds: scope.ancestorTeamRunIds,
      agentRunId,
      memberAddress: agent.address,
      platformAgentRunId: agent.platformAgentRunId,
      configuredPlacement: null,
      launchConfiguration: collaboratorLaunchConfiguration(index.getCollaborator(collaboratorAddress))
        ?? catalogCopyExecutionSource(taskExecutionListsOf(tree), agentRunId)?.launchConfiguration ?? null,
      executionKind: agent.executionKind,
      startedAt: agent.startedAt,
      groupPath: Object.freeze(groups.map((team): LocatedExecutionGroup => Object.freeze({
        teamRunId: team.teamRunId,
        address: team.address,
        executionKind: team.executionKind,
        startedAt: team.startedAt,
      }))),
      memoryDir: this.layout.getRootedAgentRunDirPath(scope, agentRunId),
      tree,
      isActive: this.roots.getActiveTree(tree.host.agentRunId) !== null,
    });
  }
}
