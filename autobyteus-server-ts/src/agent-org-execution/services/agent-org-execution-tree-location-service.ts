import fs from "node:fs";
import fsPromises from "node:fs/promises";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgRunExecutionTreeStore } from "../../run-history/store/agent-org-run-execution-tree-store.js";
import { getAgentOrgRunExecutionTreePath } from "../../run-history/store/agent-org-run-execution-tree-path.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../run-history/store/agent-org-run-execution-tree-schema.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunManager } from "./agent-org-run-manager.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import type { ConfiguredAgentExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { AgentOrgRunPackageCatalog } from "../../run-history/services/agent-org-run-package-catalog.js";

export type LocatedAgentOrgAgentExecution = Readonly<{
  rootSubjectKind: "agent_org";
  rootRunId: string;
  containingTeamRunId: string | null;
  ancestorTeamRunIds: readonly string[];
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  platformAgentRunId: string | null;
  configuredPlacement: ConfiguredAgentExecutionNode | null;
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
  constructor(input: { memoryDir: string; manager?: Manager; store?: AgentOrgRunExecutionTreeStore }) {
    this.layout = new AgentMemoryLayout(input.memoryDir);
    this.manager = input.manager ?? STORED_ONLY;
    this.store = input.store ?? new AgentOrgRunExecutionTreeStore();
    this.packageCatalog = new AgentOrgRunPackageCatalog(input.memoryDir);
  }
  async findAgent(input: AgentLookup): Promise<LocatedAgentOrgAgentExecution | null> {
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
  async listAgents(): Promise<LocatedAgentOrgAgentExecution[]> {
    const output: LocatedAgentOrgAgentExecution[] = [];
    for (const id of await this.listRootIds()) {
      const active = this.manager.getActive(id);
      const tree = active?.getExecutionTreeSnapshot() ?? await this.readStoredTree(id);
      if (!tree) continue;
      const index = new AgentOrgExecutionIndex(tree);
      output.push(...index.listAgents().map((agent) => this.toLocation(tree, index, agent.agentRunId, Boolean(active))));
    }
    return output;
  }
  async containsRunId(runIdInput: string): Promise<boolean> {
    const runId = required(runIdInput, "runId");
    for (const id of await this.listRootIds()) {
      if (id === runId) return true;
      const active = this.manager.getActive(id);
      const tree = active?.getExecutionTreeSnapshot() ?? await this.readStoredTree(id);
      if (!tree) continue;
      const index = new AgentOrgExecutionIndex(tree);
      if (index.getAgent(runId) || index.getTeam(runId)) return true;
    }
    return false;
  }
  private findInActive(input: AgentLookup): LocatedAgentOrgAgentExecution | null {
    for (const id of this.lookupRootIdsSync(input, true)) {
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
    return Object.freeze({
      rootSubjectKind: "agent_org",
      rootRunId: tree.rootOrg.orgRunId,
      containingTeamRunId: agent.host.hostKind === "team" ? agent.host.hostRunId : null,
      ancestorTeamRunIds: scope.ancestorTeamRunIds,
      agentRunId,
      memberAddress: agent.address,
      platformAgentRunId: agent.source.platformAgentRunId,
      configuredPlacement: configured && "agentRunId" in configured ? configured : null,
      memoryDir: this.layout.getRootedAgentRunDirPath(scope, agentRunId),
      tree,
      isActive: isActive && index.isLiveAgent(agentRunId),
    });
  }
  private async listRootIds(): Promise<string[]> {
    return [...new Set([...this.manager.listActiveOrgRunIds(), ...await this.listStoredRootIds()])].sort();
  }
  private async lookupRootIds(input: AgentLookup, activeOnly: boolean): Promise<string[]> {
    const requested = input.rootRunId?.trim() || null;
    if (requested) {
      if (activeOnly) return this.manager.getActive(requested) ? [requested] : [];
      return this.packageCatalog.isInitialized() && !this.packageCatalog.isAdmitted(requested) ? [] : [requested];
    }
    return activeOnly ? [...this.manager.listActiveOrgRunIds()].sort() : this.listStoredRootIds();
  }
  private lookupRootIdsSync(input: AgentLookup, activeOnly: boolean): string[] {
    const requested = input.rootRunId?.trim() || null;
    if (requested) {
      if (activeOnly) return this.manager.getActive(requested) ? [requested] : [];
      return this.packageCatalog.isInitialized() && !this.packageCatalog.isAdmitted(requested) ? [] : [requested];
    }
    return activeOnly ? [...this.manager.listActiveOrgRunIds()].sort() : this.listStoredRootIdsSync();
  }
  private async listStoredRootIds(): Promise<string[]> {
    const discovered = (await fsPromises.readdir(this.layout.getOrgRootDirPath(), { withFileTypes: true }).catch(() => []))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    return this.packageCatalog.isInitialized()
      ? discovered.filter((id) => this.packageCatalog.isAdmitted(id))
      : discovered;
  }
  private listStoredRootIdsSync(): string[] {
    try {
      const discovered = fs.readdirSync(this.layout.getOrgRootDirPath(), { withFileTypes: true })
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
      return this.packageCatalog.isInitialized()
        ? discovered.filter((id) => this.packageCatalog.isAdmitted(id))
        : discovered;
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }
  private readStoredTree(id: string): Promise<AgentOrgRunExecutionTreeSnapshot | null> {
    return this.store.read(this.layout.getOrgDirPath(id), id);
  }
  private readStoredTreeSync(id: string): AgentOrgRunExecutionTreeSnapshot | null {
    try { return validateAgentOrgRunExecutionTreePayload(JSON.parse(fs.readFileSync(getAgentOrgRunExecutionTreePath(this.layout.getOrgDirPath(id)), "utf8")), id); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
}

const required = (value: string, label: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
