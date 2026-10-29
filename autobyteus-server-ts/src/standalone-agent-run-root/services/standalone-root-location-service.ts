import fs from "node:fs";
import { copyExecutionSource, taskExecutionListsOf } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import fsPromises from "node:fs/promises";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  LocatedExecutionGroup,
  LocatedExecutionKind,
} from "../../agent-collaboration/execution/domain/located-execution-structure.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { getStandaloneRootTreePath } from "../persistence/standalone-root-tree-path.js";
import { StandaloneRootPackageStore } from "../persistence/standalone-root-package-store.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";
import { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";

/** One child execution (task Agent or task-Team member) of an Agent root. The host is a standalone run. */
export type LocatedStandaloneRootAgentExecution = Readonly<{
  rootSubjectKind: "agent";
  rootRunId: string;
  containingTeamRunId: string | null;
  ancestorTeamRunIds: readonly string[];
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  platformAgentRunId: string | null;
  configuredPlacement: null;
  /** The copy's recorded launch snapshot (its catalog source). */
  launchConfiguration: AgentLaunchConfiguration | null;
  executionKind: Exclude<LocatedExecutionKind, "configured">;
  startedAt: string | null;
  groupPath: readonly LocatedExecutionGroup[];
  memoryDir: string;
  tree: StandaloneRootTreeSnapshot;
  isActive: boolean;
}>;

type ActiveRoots = Readonly<{
  getActiveTree(hostRunId: string): StandaloneRootTreeSnapshot | null;
}>;
type AgentLookup = { rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null };
const STORED_ONLY: ActiveRoots = Object.freeze({ getActiveTree: () => null });
const warnToConsole = (message: string): void => console.warn(message);

/** One standalone run's tree and its index, or `null` for a run without children. */
type ReadRoot = Readonly<{ tree: StandaloneRootTreeSnapshot; index: StandaloneRootExecutionIndex }> | null;

/**
 * The third location family: children of Agent roots, stored under
 * `memory/agents/<hostRunId>/collaboration/`. A run without a package has no children.
 *
 * Containment (DESIGN.md rule 7): a lookup without a root ID scans every standalone run; a run whose
 * collaboration tree cannot be read is skipped with a warning naming it, so one bad run never breaks
 * lookups for the others. A lookup with an explicit root ID still throws, so opening that run reports
 * its error.
 */
export class StandaloneRootLocationService {
  private readonly layout: AgentMemoryLayout;
  private readonly store: StandaloneRootPackageStore;
  private readonly roots: ActiveRoots;
  private readonly warn: (message: string) => void;

  constructor(input: { memoryDir: string; roots?: ActiveRoots; store?: StandaloneRootPackageStore; warn?: (message: string) => void }) {
    this.layout = new AgentMemoryLayout(input.memoryDir);
    this.store = input.store ?? new StandaloneRootPackageStore();
    this.roots = input.roots ?? STORED_ONLY;
    this.warn = input.warn ?? warnToConsole;
  }

  async findAgent(input: AgentLookup): Promise<LocatedStandaloneRootAgentExecution | null> {
    const scan = !this.requestedRootRunId(input);
    for (const hostRunId of await this.lookupHostRunIds(input)) {
      const located = this.findInRoot(await this.readRoot(hostRunId, scan), input);
      if (located) return located;
    }
    return null;
  }

  findAgentSync(input: AgentLookup): LocatedStandaloneRootAgentExecution | null {
    const scan = !this.requestedRootRunId(input);
    for (const hostRunId of this.lookupHostRunIdsSync(input)) {
      const located = this.findInRoot(this.readRootSync(hostRunId, scan), input);
      if (located) return located;
    }
    return null;
  }

  async listAgents(input: { rootRunId?: string | null } = {}): Promise<LocatedStandaloneRootAgentExecution[]> {
    const scan = !this.requestedRootRunId(input);
    const output: LocatedStandaloneRootAgentExecution[] = [];
    for (const hostRunId of await this.lookupHostRunIds(input)) {
      const root = await this.readRoot(hostRunId, scan);
      if (!root) continue;
      output.push(...root.index.listChildAgents().map((agent) => this.toLocation(root.tree, root.index, agent.agentRunId)));
    }
    return output;
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

  private requestedRootRunId(input: { rootRunId?: string | null }): string | null {
    return input.rootRunId?.trim() || null;
  }

  private async lookupHostRunIds(input: { rootRunId?: string | null }): Promise<string[]> {
    const requested = this.requestedRootRunId(input);
    return requested ? [requested] : this.listHostRunIds();
  }

  private lookupHostRunIdsSync(input: { rootRunId?: string | null }): string[] {
    const requested = this.requestedRootRunId(input);
    return requested ? [requested] : this.listHostRunIdsSync();
  }

  /** Reads one run's tree and builds its index; in a scan, a tree that cannot be read is skipped with a warning. */
  private async readRoot(hostRunId: string, scan: boolean): Promise<ReadRoot> {
    try {
      return this.indexed(await this.readTree(hostRunId));
    } catch (error) {
      if (!scan) throw error;
      this.warnSkipped(hostRunId, error);
      return null;
    }
  }

  private readRootSync(hostRunId: string, scan: boolean): ReadRoot {
    try {
      return this.indexed(this.readTreeSync(hostRunId));
    } catch (error) {
      if (!scan) throw error;
      this.warnSkipped(hostRunId, error);
      return null;
    }
  }

  private indexed(tree: StandaloneRootTreeSnapshot | null): ReadRoot {
    return tree ? Object.freeze({ tree, index: new StandaloneRootExecutionIndex(tree) }) : null;
  }

  private warnSkipped(hostRunId: string, error: unknown): void {
    const reason = error instanceof Error ? error.message : String(error);
    this.warn(`Skipping standalone run '${hostRunId}': its collaboration tree cannot be read: ${reason}`);
  }

  private treePath(hostRunId: string): string {
    return getStandaloneRootTreePath(this.layout.getAgentRunCollaborationDirPath(hostRunId));
  }

  /** The root's tree: the active root's, else the stored one; `null` without a package. */
  readTree(hostRunId: string): Promise<StandaloneRootTreeSnapshot | null> {
    const active = this.roots.getActiveTree(hostRunId);
    if (active) return Promise.resolve(active);
    return this.store.readTree(this.layout.getAgentRunCollaborationDirPath(hostRunId), hostRunId);
  }

  private readTreeSync(hostRunId: string): StandaloneRootTreeSnapshot | null {
    return this.roots.getActiveTree(hostRunId)
      ?? this.store.readTreeSync(this.layout.getAgentRunCollaborationDirPath(hostRunId), hostRunId);
  }

  private findInRoot(root: ReadRoot, input: AgentLookup): LocatedStandaloneRootAgentExecution | null {
    if (!root) return null;
    const { tree, index } = root;
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
    tree: StandaloneRootTreeSnapshot,
    index: StandaloneRootExecutionIndex,
    agentRunId: string,
  ): LocatedStandaloneRootAgentExecution {
    const agent = index.requireAgent(agentRunId);
    if (agent.executionKind === "host") throw new Error("The Agent-root host is located as a standalone run.");
    const scope = index.getPhysicalScopeForAgent(agentRunId);
    const groups = agent.host.hostKind === "team"
      ? [...index.listTeamAncestorsDeepestFirst(agent.host.hostRunId)].reverse()
      : [];
    return Object.freeze({
      rootSubjectKind: "agent",
      rootRunId: tree.host.agentRunId,
      containingTeamRunId: agent.host.hostKind === "team" ? agent.host.hostRunId : null,
      ancestorTeamRunIds: scope.ancestorTeamRunIds,
      agentRunId,
      memberAddress: agent.address,
      platformAgentRunId: agent.platformAgentRunId,
      configuredPlacement: null,
      launchConfiguration: copyExecutionSource(taskExecutionListsOf(tree), agentRunId)?.launchConfiguration ?? null,
      executionKind: agent.executionKind,
      startedAt: agent.startedAt,
      groupPath: Object.freeze(groups.map((team): LocatedExecutionGroup => Object.freeze({
        teamRunId: team.teamRunId,
        address: team.address,
        executionKind: team.executionKind,
        startedAt: team.startedAt,
      }))),
      memoryDir: this.layout.getAgentRunMemoryDirPath(index.getMemoryPlacementForAgent(agentRunId), agentRunId),
      tree,
      isActive: this.roots.getActiveTree(tree.host.agentRunId) !== null,
    });
  }
}
