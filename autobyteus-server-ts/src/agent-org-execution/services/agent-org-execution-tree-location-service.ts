import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  LocatedExecutionGroup,
} from "../../agent-collaboration/execution/domain/located-execution-structure.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgRunExecutionTreeStore } from "../../run-history/store/agent-org-run-execution-tree-store.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunManager } from "./agent-org-run-manager.js";
import { AgentOrgExecutionIndex, type AgentOrgExecutionKind } from "./agent-org-execution-index.js";
import type { ConfiguredAgentExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { AgentOrgRunPackageCatalog } from "../../run-history/services/agent-org-run-package-catalog.js";
import { AgentOrgContainerStore } from "../../run-history/store/agent-org-container-store.js";
import { getAgentOrgRunExecutionTreePath } from "../../run-history/store/agent-org-run-execution-tree-path.js";
import { readRawTreeFileSync } from "../../run-history/store/raw-tree-file.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { isAgentOrgContainerPayload } from "../domain/agent-org-container-file.js";
import { composeOrgExecutionTree, type OrgUnitFile } from "../container/org-execution-tree-composition.js";
import { readStoredUnitFiles } from "../container/stored-org-tree.js";
import { LiveAgentOrgContainer } from "../container/live-agent-org-container.js";
import { validateAgentOrgContainerPayload } from "../../run-history/store/agent-org-container-file-schema.js";

export type LocatedAgentOrgAgentExecution = Readonly<{
  rootSubjectKind: "agent_org";
  rootRunId: string;
  containingTeamRunId: string | null;
  ancestorTeamRunIds: readonly string[];
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  platformAgentRunId: string | null;
  configuredPlacement: ConfiguredAgentExecutionNode | null;
  executionKind: AgentOrgExecutionKind;
  /** Task agents only. */
  startedAt: string | null;
  /** Teams from the org root (exclusive) down to the hosting team, outermost first. */
  groupPath: readonly LocatedExecutionGroup[];
  memoryDir: string;
  tree: AgentOrgRunExecutionTreeSnapshot;
  isActive: boolean;
}>;

type Manager = Pick<AgentOrgRunManager, "getActive" | "listActiveOrgRunIds">;
type AgentLookup = { rootRunId?: string | null; agentRunId?: string | null; memberAddress?: string | null; containingTeamRunId?: string | null };
const STORED_ONLY: Manager = Object.freeze({ getActive: () => null, listActiveOrgRunIds: () => [] });

/** Current AgentOrg V1 physical location projection; no Team root is synthesized. */
export class AgentOrgExecutionTreeLocationService {
  private readonly layout: AgentMemoryLayout;
  private readonly manager: Manager;
  private readonly store: AgentOrgRunExecutionTreeStore;
  private readonly packageCatalog: AgentOrgRunPackageCatalog;
  /** Org runs read as containers (org-teams-follow-definition): their agents' memory is in their unit runs. */
  private readonly containers = new Set<string>();
  private readonly memoryDir: string;
  constructor(input: { memoryDir: string; manager?: Manager; store?: AgentOrgRunExecutionTreeStore }) {
    this.memoryDir = input.memoryDir;
    this.layout = new AgentMemoryLayout(input.memoryDir);
    this.manager = input.manager ?? STORED_ONLY;
    this.store = input.store ?? new AgentOrgRunExecutionTreeStore();
    this.packageCatalog = new AgentOrgRunPackageCatalog(input.memoryDir);
  }
  async findAgent(input: AgentLookup): Promise<LocatedAgentOrgAgentExecution | null> {
    await this.packageCatalog.awaitReady();
    const active = this.findInActive(input);
    if (active) return active;
    for (const id of await this.lookupRootIds(input, false)) {
      const tree = await this.readStoredTree(id);
      const result = tree ? this.findInTree(tree, input, false) : null;
      if (result) return result;
    }
    return null;
  }
  findAgentSync(input: AgentLookup): LocatedAgentOrgAgentExecution | null {
    const active = this.findInActive(input);
    if (active) return active;
    for (const id of this.lookupRootIdsSync(input, false)) {
      const tree = this.readStoredTreeSync(id);
      const result = tree ? this.findInTree(tree, input, false) : null;
      if (result) return result;
    }
    return null;
  }
  /** Lists every Agent execution of all Org roots, or of one admitted root (one tree read) when `rootRunId` is given. */
  async listAgents(input: { rootRunId?: string | null } = {}): Promise<LocatedAgentOrgAgentExecution[]> {
    await this.packageCatalog.awaitReady();
    const output: LocatedAgentOrgAgentExecution[] = [];
    const requested = input.rootRunId?.trim() || null;
    const rootIds = !requested
      ? await this.listRootRunIds()
      : this.manager.getActive(requested) ? [requested] : await this.lookupRootIds({ rootRunId: requested }, false);
    for (const id of rootIds) {
      if (!this.packageCatalog.isAdmitted(id)) continue;
      const active = this.manager.getActive(id);
      const tree = active?.getExecutionTreeSnapshot() ?? await this.readStoredTree(id);
      if (!tree) continue;
      const index = new AgentOrgExecutionIndex(tree);
      output.push(...index.listAgents().map((agent) => this.toLocation(tree, index, agent.agentRunId, Boolean(active))));
    }
    return output;
  }

  /** One admitted Org root's tree: the active root's, else the stored one (autobyteus-278: its remote children). */
  async readTree(orgRunId: string): Promise<AgentOrgRunExecutionTreeSnapshot | null> {
    await this.packageCatalog.awaitReady();
    if (!this.packageCatalog.isAdmitted(orgRunId)) return null;
    return this.manager.getActive(orgRunId)?.getExecutionTreeSnapshot() ?? this.readStoredTree(orgRunId);
  }

  /** Active and admitted stored Org root run IDs, sorted. */
  async listRootRunIds(): Promise<string[]> {
    await this.packageCatalog.awaitReady();
    return this.packageCatalog.listAdmitted();
  }
  private findInActive(input: AgentLookup): LocatedAgentOrgAgentExecution | null {
    for (const id of this.lookupRootIdsSync(input, true)) {
      if (!this.packageCatalog.isAdmitted(id)) continue;
      const tree = this.manager.getActive(id)?.getExecutionTreeSnapshot();
      const result = tree ? this.findInTree(tree, input, true) : null;
      if (result) return result;
    }
    return null;
  }
  private findInTree(tree: AgentOrgRunExecutionTreeSnapshot, input: AgentLookup, isActive: boolean): LocatedAgentOrgAgentExecution | null {
    const index = new AgentOrgExecutionIndex(tree);
    const agentRunId = input.agentRunId?.trim() || null;
    const memberAddress = input.memberAddress?.trim() || null;
    const containingTeamRunId = input.containingTeamRunId?.trim() || null;
    const matches = index.listAgents().filter((agent) =>
      (!agentRunId || agent.agentRunId === agentRunId)
      && (!memberAddress || agent.address === memberAddress)
      && (!containingTeamRunId || (agent.host.hostKind === "team" ? agent.host.hostRunId : tree.rootOrg.orgRunId) === containingTeamRunId));
    return matches.length === 1 ? this.toLocation(tree, index, matches[0]!.agentRunId, isActive) : null;
  }
  private toLocation(tree: AgentOrgRunExecutionTreeSnapshot, index: AgentOrgExecutionIndex, agentRunId: string, isActive: boolean): LocatedAgentOrgAgentExecution {
    const agent = index.requireAgent(agentRunId);
    const scope = index.getPhysicalScopeForAgent(agentRunId);
    const configured = index.getConfiguredPlacement(agent.address);
    const groupPath = agent.host.hostKind === "team"
      ? [...index.listTeamAncestorsDeepestFirst(agent.host.hostRunId)].reverse().map((team): LocatedExecutionGroup => Object.freeze({
        teamRunId: team.teamRunId,
        address: team.address,
        executionKind: team.executionKind,
        startedAt: null,
      }))
      : [];
    return Object.freeze({
      rootSubjectKind: "agent_org",
      rootRunId: tree.rootOrg.orgRunId,
      containingTeamRunId: agent.host.hostKind === "team" ? agent.host.hostRunId : null,
      ancestorTeamRunIds: scope.ancestorTeamRunIds,
      agentRunId,
      memberAddress: agent.address,
      platformAgentRunId: agent.source.platformAgentRunId,
      configuredPlacement: configured && "agentRunId" in configured ? configured : null,
      executionKind: agent.executionKind,
      startedAt: null,
      groupPath: Object.freeze(groupPath),
      memoryDir: this.isContainer(tree.rootOrg.orgRunId)
        // A unit's agent lives in its unit run: a Team unit's member in its Team run, a direct agent in its own run.
        ? agent.host.hostKind === "team"
          ? this.layout.getTeamAgentRunDirPath({ rootTeamRunId: agent.host.hostRunId, ancestorTeamRunIds: [] }, agentRunId)
          : this.layout.getStandaloneRunDirPath(agentRunId)
        : this.layout.getAgentRunMemoryDirPath(index.getMemoryPlacementForAgent(agentRunId), agentRunId),
      tree,
      // A shut-down child of an active root stays addressable: input wakes it.
      isActive,
    });
  }
  private async lookupRootIds(input: AgentLookup, activeOnly: boolean): Promise<string[]> {
    const requested = input.rootRunId?.trim() || null;
    if (requested) {
      if (activeOnly) return this.manager.getActive(requested) ? [requested] : [];
      return !this.packageCatalog.isAdmitted(requested) ? [] : [requested];
    }
    return activeOnly ? [...this.manager.listActiveOrgRunIds()].sort() : this.listStoredRootIds();
  }
  private lookupRootIdsSync(input: AgentLookup, activeOnly: boolean): string[] {
    const requested = input.rootRunId?.trim() || null;
    if (requested) {
      if (activeOnly) return this.manager.getActive(requested) ? [requested] : [];
      return !this.packageCatalog.isAdmitted(requested) ? [] : [requested];
    }
    return activeOnly ? [...this.manager.listActiveOrgRunIds()].sort() : this.listStoredRootIdsSync();
  }
  private async listStoredRootIds(): Promise<string[]> {
    await this.packageCatalog.awaitReady();
    return this.packageCatalog.listAdmitted();
  }
  private listStoredRootIdsSync(): string[] {
    return this.packageCatalog.listAdmitted();
  }
  /** A stored Org's tree: a container's composed from its units' files, a released Org tree as stored. */
  private async readStoredTree(id: string): Promise<AgentOrgRunExecutionTreeSnapshot | null> {
    // A file that cannot be read as a container is read (and refused) as a released Org tree, with that reader's error.
    const container = await new AgentOrgContainerStore().readIfContainer(this.layout.getOrgDirPath(id), id).catch(() => null);
    if (!container) return this.store.read(this.layout.getOrgDirPath(id), id);
    this.containers.add(id);
    return composeOrgExecutionTree(container, await readStoredUnitFiles(this.memoryDir, container));
  }
  /** The synchronous read: a container's Team units from their trees, its direct agents from the container (their launch). */
  private readStoredTreeSync(id: string): AgentOrgRunExecutionTreeSnapshot | null {
    let raw: unknown = null;
    try { raw = readRawTreeFileSync(getAgentOrgRunExecutionTreePath(this.layout.getOrgDirPath(id))); } catch { raw = null; }
    if (!isAgentOrgContainerPayload(raw)) return this.store.readSync(this.layout.getOrgDirPath(id), id);
    this.containers.add(id);
    const container = validateAgentOrgContainerPayload(raw, id);
    const teams = new TeamRunExecutionTreeStore();
    const files = new Map<string, OrgUnitFile>(container.rootOrg.units.map((unit) => [unit.runId, unit.kind === "agent_team"
      ? { kind: "agent_team", tree: teams.readSync(this.layout.getTeamDirPath({ rootTeamRunId: unit.runId, ancestorTeamRunIds: [] }), unit.runId) }
      : { kind: "agent", metadata: { runId: unit.runId, agentDefinitionId: unit.definitionId, platformAgentRunId: null,
        ...container.rootOrg.defaultLaunchConfiguration, llmConfig: container.rootOrg.defaultLaunchConfiguration.llmConfig as Record<string, unknown> | null,
        workspaceRootPath: container.rootOrg.defaultLaunchConfiguration.workspaceRootPath ?? "", memoryDir: this.layout.getStandaloneRunDirPath(unit.runId) } }]));
    return composeOrgExecutionTree(container, files);
  }
  private isContainer(orgRunId: string): boolean {
    return this.containers.has(orgRunId) || this.manager.getActive(orgRunId) instanceof LiveAgentOrgContainer;
  }
}
