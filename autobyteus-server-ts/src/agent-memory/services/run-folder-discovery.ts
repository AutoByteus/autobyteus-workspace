import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { RAW_TRACES_MANIFEST_FILE_NAME } from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createAgentOrgRootExecutionIdentity,
  createAgentRootExecutionIdentity,
  createRootExecutionIdentity,
  createTeamRootExecutionIdentity,
  type RootExecutionIdentity,
  type RootSubjectKind,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import {
  createStoredTeamRunExecutionTreeLocationService,
  type TeamRunExecutionTreeLocationService,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import { openRawTraceRuntimeKind } from "../../run-history/store/agent-run-pending-runtime-switch.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { DiscoveredRun } from "../domain/discovered-run.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";

type TeamLocations = Pick<TeamRunExecutionTreeLocationService, "listAgents">;
type OrgLocations = Pick<AgentOrgExecutionTreeLocationService, "listAgents">;
type AgentCatalog = Pick<AgentRunHistoryCatalogService, "listCatalogRows">;
type AgentMetadata = Pick<AgentRunMetadataStore, "readMetadata">;

export type RunFolderDiscoveryDependencies = Readonly<{
  teamLocations?: TeamLocations;
  orgLocations?: OrgLocations;
  agentCatalog?: AgentCatalog;
  agentMetadata?: AgentMetadata;
}>;

/** A folder's own name as a readable name: `solution_designer_8a1f…` → `solution designer`. */
const nameFromFolder = (folderName: string): string =>
  folderName.replace(/_[0-9a-f]{8,}$/i, "").replace(/_/g, " ").trim() || folderName;

const addressName = (address: string): string => getAgentTeamAddressBasename(address as AgentTeamAddress) ?? address;
const optional = (value: string | null | undefined): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Folders never walked into: a run's own journal and the memory of another node's imports. */
const SKIPPED_FOLDERS = new Set(["work_journal", "imports"]);

/** The root kind of each run family folder of the memory layout. */
const FAMILY_ROOT_KINDS: Readonly<Record<string, RootSubjectKind>> = Object.freeze({
  agents: "agent",
  agent_teams: "agent_team",
  agent_orgs: "agent_org",
});

/**
 * Every run folder in this node's memory layout — agent runs (delegated or not: autobyteus-461), team and org members,
 * and folders no record attributes — with its names, workspace, runtime, agent definition and start as recorded, and
 * the root it belongs to. Attribution reuses the owners of each record (location services, metadata, catalogs); this
 * never parses a tree. Memory search and the episodic catalog both read runs from here, so they attribute alike.
 * A run folder is a folder with raw traces. Imported memory (`memory/imports/`) is not part of the layout. Read-only.
 */
export class RunFolderDiscovery {
  private readonly memoryDir: string;
  private readonly layout: AgentMemoryLayout;
  private readonly deps: Required<RunFolderDiscoveryDependencies>;

  constructor(memoryDir: string, deps: RunFolderDiscoveryDependencies = {}) {
    this.memoryDir = path.resolve(memoryDir);
    this.layout = new AgentMemoryLayout(this.memoryDir);
    this.deps = {
      teamLocations: deps.teamLocations ?? createStoredTeamRunExecutionTreeLocationService(this.memoryDir),
      orgLocations: deps.orgLocations ?? new AgentOrgExecutionTreeLocationService({ memoryDir: this.memoryDir }),
      agentCatalog: deps.agentCatalog ?? new AgentRunHistoryCatalogService(this.memoryDir),
      agentMetadata: deps.agentMetadata ?? new AgentRunMetadataStore(this.memoryDir),
    };
  }

  /** Every run folder of the node, sorted by run key. */
  findRuns(): Promise<DiscoveredRun[]> {
    return this.discover(null);
  }

  /** The run folders of one root (its own folder and everything under it), sorted by run key. */
  findRunsOfRoot(root: RootExecutionIdentity): Promise<DiscoveredRun[]> {
    return this.discover(root);
  }

  /** The root a run folder belongs to: its family and first segment; null for a folder outside the three families. */
  rootOf(memoryDir: string): RootExecutionIdentity | null {
    const [family, rootRunId] = path.relative(this.memoryDir, path.resolve(memoryDir)).split(path.sep);
    const kind = family ? FAMILY_ROOT_KINDS[family] : undefined;
    return kind && rootRunId ? createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId }) : null;
  }

  private async discover(scope: RootExecutionIdentity | null): Promise<DiscoveredRun[]> {
    const runFolders = await this.runFolders(scope);
    const runs = new Map<string, DiscoveredRun>();
    const add = (run: DiscoveredRun): void => {
      if (runFolders.has(run.memoryDir) && !runs.has(run.memoryDir)) runs.set(run.memoryDir, run);
    };
    const kind = scope?.rootSubjectKind ?? null;
    if (!kind || kind === "agent_team") await this.guarded("team runs", async () => (await this.teamMembers(scope)).forEach(add));
    if (!kind || kind === "agent_org") await this.guarded("agent org runs", async () => (await this.orgMembers(scope)).forEach(add));
    if (!kind || kind === "agent") await this.guarded("agent runs", async () => (await this.agentRuns(runFolders, scope)).forEach(add));
    for (const memoryDir of runFolders) if (!runs.has(memoryDir)) runs.set(memoryDir, this.folderRun(memoryDir));
    return [...runs.values()].sort((a, b) => a.runKey.localeCompare(b.runKey));
  }

  /** A run as the folder says it: no record attributes it. Every walked folder lies in a family, so it has a root. */
  private folderRun(memoryDir: string): DiscoveredRun {
    const runId = path.basename(memoryDir);
    const runKey = this.runKeyOf(memoryDir);
    return {
      runKey, memoryDir, runId, agentName: nameFromFolder(runId), teamName: null, memberName: null, orgName: null,
      workspace: null, runtimeKind: null, subject: { kind: "RUN_FOLDER", runKey },
      root: this.rootOf(memoryDir)!, agentDefinitionId: null, recordedStartAt: null,
    };
  }

  private runKeyOf(memoryDir: string): string {
    return path.relative(this.memoryDir, memoryDir).split(path.sep).join("/");
  }

  private async teamMembers(scope: RootExecutionIdentity | null): Promise<DiscoveredRun[]> {
    const located = await this.deps.teamLocations.listAgents(scope ? { rootTeamRunId: scope.rootRunId } : {});
    return located.map((member): DiscoveredRun => {
      const placement = member.configuredPlacement;
      const launch = placement?.launchConfiguration ?? null;
      const runtimeKind = launch ? openRawTraceRuntimeKind({ runtimeKind: launch.runtimeKind, pendingRuntimeSwitch: placement?.pendingRuntimeSwitch }) : null;
      const memoryDir = path.resolve(member.memoryDir);
      return {
        runKey: this.runKeyOf(memoryDir), memoryDir, runId: member.agentRunId, agentName: addressName(member.memberAddress),
        teamName: member.tree.rootTeam.teamDefinitionName,
        memberName: addressName(member.memberAddress), orgName: null,
        workspace: launch?.workspaceRootPath ?? null, runtimeKind,
        subject: { kind: "TEAM_MEMBER", teamRunId: member.rootTeamRunId, agentRunId: member.agentRunId },
        root: createTeamRootExecutionIdentity(member.rootTeamRunId),
        agentDefinitionId: optional(placement?.agentDefinitionId),
        recordedStartAt: optional(member.startedAt) ?? optional(member.tree.createdAt),
      };
    });
  }

  private async orgMembers(scope: RootExecutionIdentity | null): Promise<DiscoveredRun[]> {
    const located = await this.deps.orgLocations.listAgents(scope ? { rootRunId: scope.rootRunId } : {});
    return located.map((member): DiscoveredRun => {
      const placement = member.configuredPlacement;
      const launch = placement?.launchConfiguration ?? null;
      const runtimeKind = launch ? openRawTraceRuntimeKind({ runtimeKind: launch.runtimeKind, pendingRuntimeSwitch: placement?.pendingRuntimeSwitch }) : null;
      const memberName = member.memberAddress.replace(/^\/+/, "") || member.memberAddress;
      const memoryDir = path.resolve(member.memoryDir);
      return {
        runKey: this.runKeyOf(memoryDir), memoryDir, runId: member.agentRunId, agentName: addressName(member.memberAddress),
        teamName: null, memberName, orgName: member.tree.rootOrg.orgDefinitionName,
        workspace: launch?.workspaceRootPath ?? null, runtimeKind,
        subject: { kind: "ORG_MEMBER", orgRunId: member.rootRunId, agentRunId: member.agentRunId },
        root: createAgentOrgRootExecutionIdentity(member.rootRunId),
        agentDefinitionId: optional(placement?.agentDefinitionId),
        recordedStartAt: optional(member.startedAt) ?? optional(member.tree.createdAt),
      };
    });
  }

  /** `agents/<runId>` folders: agent runs, delegated or not, named by the run history catalog as recorded. */
  private async agentRuns(runFolders: ReadonlySet<string>, scope: RootExecutionIdentity | null): Promise<DiscoveredRun[]> {
    const rows = new Map((await this.deps.agentCatalog.listCatalogRows()).map((row) => [row.runId, row]));
    const runs: DiscoveredRun[] = [];
    const entries = scope ? [scope.rootRunId] : await this.subfolders(this.layout.getStandaloneRootDirPath());
    for (const entry of entries) {
      const memoryDir = path.join(this.layout.getStandaloneRootDirPath(), entry);
      if (!runFolders.has(memoryDir)) continue;
      const metadata = await this.deps.agentMetadata.readMetadata(entry).catch(() => null);
      const row = rows.get(entry) ?? null;
      // One value for the run and its AGENT subject (the Memory page opens the run by it).
      const definitionId = optional(metadata?.agentDefinitionId) ?? optional(row?.agentDefinitionId);
      // The journal target: the agent runtime that wrote the open raw-trace file (the previous one while a switch is pending).
      const runtimeKind: RuntimeKind | null = metadata ? openRawTraceRuntimeKind(metadata) ?? null : null;
      runs.push({
        runKey: this.runKeyOf(memoryDir), memoryDir, runId: entry,
        agentName: optional(row?.agentName) ?? definitionId ?? nameFromFolder(entry),
        teamName: null, memberName: null, orgName: null,
        workspace: optional(metadata?.workspaceRootPath) ?? optional(row?.workspaceRootPath),
        runtimeKind,
        subject: { kind: "AGENT", runId: entry, agentDefinitionId: definitionId },
        root: createAgentRootExecutionIdentity(entry),
        agentDefinitionId: definitionId,
        recordedStartAt: optional(metadata?.startedAt) ?? optional(row?.createdAt),
      });
    }
    return runs;
  }

  /** Every folder with raw traces under the three family roots, or under one root's folder (absolute, resolved). */
  private async runFolders(scope: RootExecutionIdentity | null): Promise<Set<string>> {
    const found = new Set<string>();
    const walk = async (dir: string, depth: number): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      if (entries.some((entry) => entry.isFile() && (entry.name === RAW_TRACES_ACTIVE_MEMORY_FILE_NAME || entry.name === RAW_TRACES_MANIFEST_FILE_NAME))) {
        found.add(path.resolve(dir));
      }
      if (depth >= 8) return;
      for (const entry of entries) {
        if (entry.isDirectory() && !SKIPPED_FOLDERS.has(entry.name)) await walk(path.join(dir, entry.name), depth + 1);
      }
    };
    if (scope) {
      await walk(this.rootFolder(scope), 1);
      return found;
    }
    for (const root of [this.layout.getStandaloneRootDirPath(), this.layout.getTeamRootDirPath(), this.layout.getOrgRootDirPath()]) {
      for (const entry of await this.subfolders(root)) await walk(path.join(root, entry), 1);
    }
    return found;
  }

  private rootFolder(root: RootExecutionIdentity): string {
    switch (root.rootSubjectKind) {
      case "agent": return this.layout.getStandaloneRunDirPath(root.rootRunId);
      case "agent_team": return this.layout.getTeamDirPath({ rootTeamRunId: root.rootRunId, ancestorTeamRunIds: [] });
      case "agent_org": return this.layout.getOrgDirPath(root.rootRunId);
    }
  }

  private async subfolders(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  }

  /** One record family that cannot be read leaves its runs to the folder rule; discovery still finds them. */
  private async guarded(label: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      console.warn("RUN_FOLDER_DISCOVERY_SOURCE_FAILED", { source: label, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
