import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamRunManager as DefaultManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";
import type { ConfiguredAgentExecution, TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getTeamRunExecutionTreePath } from "../store/team-run-execution-tree-path.js";
import { validateTeamRunExecutionTreePayload } from "../store/team-run-execution-tree-schema.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { TeamRunV1PackageCatalog } from "./team-run-v1-package-catalog.js";

export type LocatedTeamAgentExecution = Readonly<{
  rootTeamRunId: string;
  containingTeamRunId: string;
  ancestorTeamRunIds: readonly string[];
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  configuredPlacement: ConfiguredAgentExecution | null;
  memoryDir: string;
  tree: TeamRunExecutionTreeSnapshot;
  isActive: boolean;
}>;

type Manager = Pick<AgentTeamRunManager, "getTeamRun" | "listActiveRuns">;

/** Derives physical/history context from the exact V1 tree without another identity model. */
export class TeamRunExecutionTreeLocationService {
  private readonly memoryDir: string;
  private readonly layout: AgentMemoryLayout;
  private readonly manager: Manager;
  private readonly store: TeamRunExecutionTreeStore;
  private readonly packageCatalog: TeamRunV1PackageCatalog;

  constructor(input: {
    memoryDir?: string;
    manager?: Manager;
    store?: TeamRunExecutionTreeStore;
  } = {}) {
    this.memoryDir = input.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.layout = new AgentMemoryLayout(this.memoryDir);
    this.manager = input.manager ?? DefaultManager.getInstance();
    this.store = input.store ?? new TeamRunExecutionTreeStore();
    this.packageCatalog = new TeamRunV1PackageCatalog(this.memoryDir);
  }

  async findAgent(input: {
    agentRunId?: string | null;
    memberAddress?: string | null;
    containingTeamRunId?: string | null;
  }): Promise<LocatedTeamAgentExecution | null> {
    const active = this.findInActive(input);
    if (active) return active;
    for (const rootTeamRunId of await this.listStoredRootIds()) {
      const tree = await this.readStoredTree(rootTeamRunId);
      const located = tree ? this.findInTree(tree, input, false) : null;
      if (located) return located;
    }
    return null;
  }

  async listAgents(input: {
    rootTeamRunId?: string | null;
    containingTeamRunId?: string | null;
    configuredOnly?: boolean;
  } = {}): Promise<LocatedTeamAgentExecution[]> {
    const requestedRootId = input.rootTeamRunId?.trim() || null;
    const rootIds = requestedRootId ? [requestedRootId] : await this.listRootTeamRunIds();
    const output: LocatedTeamAgentExecution[] = [];
    for (const rootTeamRunId of rootIds) {
      const activeRoot = this.manager.getTeamRun(rootTeamRunId);
      const tree = activeRoot?.getExecutionTreeSnapshot() ?? await this.readStoredTree(rootTeamRunId);
      if (!tree) continue;
      output.push(...this.listInTree(tree, Boolean(activeRoot)).filter((item) =>
        (!input.containingTeamRunId || item.containingTeamRunId === input.containingTeamRunId) &&
        (!input.configuredOnly || item.configuredPlacement !== null)));
    }
    return output;
  }

  async containsRunId(runId: string): Promise<boolean> {
    const normalized = runId.trim();
    if (!normalized) throw new Error("runId is required.");
    for (const rootTeamRunId of await this.listRootTeamRunIds()) {
      const activeRoot = this.manager.getTeamRun(rootTeamRunId);
      const tree = activeRoot?.getExecutionTreeSnapshot() ?? await this.readStoredTree(rootTeamRunId);
      if (!tree) continue;
      const index = new TeamExecutionIndex(tree);
      if (index.getTeam(normalized) || index.getAgent(normalized)) return true;
    }
    return false;
  }

  async listRootTeamRunIds(): Promise<string[]> {
    return [...new Set([...this.manager.listActiveRuns(), ...await this.listStoredRootIds()])].sort();
  }

  findAgentSync(input: {
    agentRunId?: string | null;
    memberAddress?: string | null;
    containingTeamRunId?: string | null;
  }): LocatedTeamAgentExecution | null {
    const active = this.findInActive(input);
    if (active) return active;
    for (const rootTeamRunId of this.listStoredRootIdsSync()) {
      const tree = this.readStoredTreeSync(rootTeamRunId);
      const located = tree ? this.findInTree(tree, input, false) : null;
      if (located) return located;
    }
    return null;
  }

  async readStoredTree(rootTeamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null> {
    const rootDir = this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    return this.store.read(rootDir, rootTeamRunId);
  }

  async readTree(rootTeamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null> {
    const normalized = rootTeamRunId.trim();
    if (!normalized) throw new Error("rootTeamRunId is required.");
    return this.manager.getTeamRun(normalized)?.getExecutionTreeSnapshot() ?? this.readStoredTree(normalized);
  }

  private findInActive(input: {
    agentRunId?: string | null;
    memberAddress?: string | null;
    containingTeamRunId?: string | null;
  }): LocatedTeamAgentExecution | null {
    for (const rootTeamRunId of this.manager.listActiveRuns()) {
      const root = this.manager.getTeamRun(rootTeamRunId);
      if (!root) continue;
      const located = this.findInTree(root.getExecutionTreeSnapshot(), input, true);
      if (located) return located;
    }
    return null;
  }

  private findInTree(
    tree: TeamRunExecutionTreeSnapshot,
    input: { agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null },
    isActive: boolean,
  ): LocatedTeamAgentExecution | null {
    const index = new TeamExecutionIndex(tree);
    const agentRunId = input.agentRunId?.trim() || null;
    const memberAddress = input.memberAddress?.trim() || null;
    const containing = input.containingTeamRunId?.trim() || null;
    if (containing && !index.getTeam(containing)) return null;
    const candidates = index.listAgentExecutions().filter((agent) =>
      (!agentRunId || agent.agentRunId === agentRunId) &&
      (!memberAddress || agent.address === memberAddress) &&
      (!containing || agent.containingTeamRunId === containing));
    if (candidates.length !== 1) return null;
    return this.toLocation(tree, index, candidates[0]!, isActive);
  }

  private listInTree(
    tree: TeamRunExecutionTreeSnapshot,
    isActive: boolean,
  ): LocatedTeamAgentExecution[] {
    const index = new TeamExecutionIndex(tree);
    return index.listAgentExecutions().map((agent) => this.toLocation(tree, index, agent, isActive));
  }

  private toLocation(
    tree: TeamRunExecutionTreeSnapshot,
    index: TeamExecutionIndex,
    agent: ReturnType<TeamExecutionIndex["listAgentExecutions"]>[number],
    isActive: boolean,
  ): LocatedTeamAgentExecution {
    const ancestors = [...index.listTeamAncestorsDeepestFirst(agent.containingTeamRunId)]
      .reverse().slice(1).map((team) => team.teamRunId);
    const configured = index.getConfiguredPlacement(agent.address);
    const configuredPlacement = configured && "agentRunId" in configured ? configured : null;
    return Object.freeze({
      rootTeamRunId: tree.rootTeam.teamRunId,
      containingTeamRunId: agent.containingTeamRunId,
      ancestorTeamRunIds: Object.freeze(ancestors),
      agentRunId: agent.agentRunId,
      memberAddress: agent.address,
      configuredPlacement,
      memoryDir: this.layout.getTeamAgentRunDirPath({
        rootTeamRunId: tree.rootTeam.teamRunId,
        ancestorTeamRunIds: ancestors,
      }, agent.agentRunId),
      tree,
      isActive,
    });
  }

  private async listStoredRootIds(): Promise<string[]> {
    try {
      const discovered = (await fsPromises.readdir(this.layout.getTeamRootDirPath(), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
      return this.packageCatalog.isInitialized()
        ? discovered.filter((rootTeamRunId) => this.packageCatalog.isAdmitted(rootTeamRunId))
        : discovered;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private listStoredRootIdsSync(): string[] {
    try {
      const discovered = fs.readdirSync(this.layout.getTeamRootDirPath(), { withFileTypes: true })
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
      return this.packageCatalog.isInitialized()
        ? discovered.filter((rootTeamRunId) => this.packageCatalog.isAdmitted(rootTeamRunId))
        : discovered;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private readStoredTreeSync(rootTeamRunId: string): TeamRunExecutionTreeSnapshot | null {
    const rootDir = this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    try {
      const raw = JSON.parse(fs.readFileSync(getTeamRunExecutionTreePath(rootDir), "utf8")) as unknown;
      return validateTeamRunExecutionTreePayload(raw, rootTeamRunId);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}
