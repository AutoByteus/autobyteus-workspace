import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { RAW_TRACES_MANIFEST_FILE_NAME } from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { TaskTeamRootMemorySource } from "../../agent-memory/services/task-team-root-memory-source.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import {
  createStoredTeamRunExecutionTreeLocationService,
  type TeamRunExecutionTreeLocationService,
} from "../../run-history/services/team-run-execution-tree-location-service.js";
import { openRawTraceRuntimeKind } from "../../run-history/store/agent-run-pending-runtime-switch.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { MemoryRun } from "../domain/memory-search-models.js";

type TeamLocations = Pick<TeamRunExecutionTreeLocationService, "listAgents">;
type OrgLocations = Pick<AgentOrgExecutionTreeLocationService, "listAgents">;
type TaskTeams = Pick<TaskTeamRootMemorySource, "listTaskTeams">;
type AgentCatalog = Pick<AgentRunHistoryCatalogService, "listCatalogRows">;
type AgentMetadata = Pick<AgentRunMetadataStore, "readMetadata" | "readTaskAgentMetadata">;

export type MemoryRunDiscoveryDependencies = Readonly<{
  teamLocations?: TeamLocations;
  orgLocations?: OrgLocations;
  taskTeams?: TaskTeams;
  agentCatalog?: AgentCatalog;
  agentMetadata?: AgentMetadata;
}>;

/** A folder's own name as a readable name: `solution_designer_8a1f…` → `solution designer`. */
export const nameFromFolder = (folderName: string): string =>
  folderName.replace(/_[0-9a-f]{8,}$/i, "").replace(/_/g, " ").trim() || folderName;

const addressName = (address: string): string => getAgentTeamAddressBasename(address as AgentTeamAddress) ?? address;
const optional = (value: string | null | undefined): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Folders never walked into: a run's own journal and the memory search of another node's imports. */
const SKIPPED_FOLDERS = new Set(["work_journal", "imports"]);

/**
 * The "Find runs" step (DS-001, § Run Kinds): every run folder in this node's memory layout — standalone and
 * task agents, team and org members, task-team members, agent-root collaboration members, and folders no
 * record attributes — with its names, workspace and runtime as recorded. Attribution reuses the owners of
 * each record (location services, metadata, catalogs, the task-team source); this never parses a tree.
 * A run folder is a folder with raw traces. Imported memory (`memory/imports/`) is not part of the layout.
 */
export class MemoryRunDiscovery {
  private readonly memoryDir: string;
  private readonly layout: AgentMemoryLayout;
  private readonly deps: Required<MemoryRunDiscoveryDependencies>;

  constructor(memoryDir: string, deps: MemoryRunDiscoveryDependencies = {}) {
    this.memoryDir = path.resolve(memoryDir);
    this.layout = new AgentMemoryLayout(this.memoryDir);
    this.deps = {
      teamLocations: deps.teamLocations ?? createStoredTeamRunExecutionTreeLocationService(this.memoryDir),
      orgLocations: deps.orgLocations ?? new AgentOrgExecutionTreeLocationService({ memoryDir: this.memoryDir }),
      taskTeams: deps.taskTeams ?? new TaskTeamRootMemorySource(this.memoryDir),
      agentCatalog: deps.agentCatalog ?? new AgentRunHistoryCatalogService(this.memoryDir),
      agentMetadata: deps.agentMetadata ?? new AgentRunMetadataStore(this.memoryDir),
    };
  }

  async findRuns(): Promise<MemoryRun[]> {
    const runFolders = await this.runFolders();
    const runs = new Map<string, MemoryRun>();
    const add = (run: MemoryRun): void => {
      if (runFolders.has(run.memoryDir) && !runs.has(run.memoryDir)) runs.set(run.memoryDir, run);
    };
    await this.guarded("team runs", async () => (await this.teamMembers()).forEach(add));
    await this.guarded("agent org runs", async () => (await this.orgMembers()).forEach(add));
    await this.guarded("task teams", async () => (await this.taskTeamMembers()).forEach(add));
    await this.guarded("agent runs", async () => (await this.agentRuns(runFolders)).forEach(add));
    for (const memoryDir of runFolders) if (!runs.has(memoryDir)) runs.set(memoryDir, this.folderRun(memoryDir));
    return [...runs.values()].sort((a, b) => a.runKey.localeCompare(b.runKey));
  }

  /** A run as the folder says it: no record attributes it (§ Run Kinds, last rows). */
  folderRun(memoryDir: string): MemoryRun {
    const runId = path.basename(memoryDir);
    return {
      ...this.place(memoryDir), runId, agentName: nameFromFolder(runId), teamName: null, memberName: null, orgName: null,
      workspace: null, runtimeKind: null, subject: { kind: "RUN_FOLDER", runKey: this.runKeyOf(memoryDir) },
    };
  }

  runKeyOf(memoryDir: string): string {
    return path.relative(this.memoryDir, path.resolve(memoryDir)).split(path.sep).join("/");
  }

  private place(memoryDir: string): Pick<MemoryRun, "runKey" | "memoryDir"> {
    const resolved = path.resolve(memoryDir);
    return { runKey: this.runKeyOf(resolved), memoryDir: resolved };
  }

  private async teamMembers(): Promise<MemoryRun[]> {
    return (await this.deps.teamLocations.listAgents()).map((located): MemoryRun => {
      const taskTeam = located.groupPath.at(-1);
      const launch = located.configuredPlacement?.launchConfiguration ?? null;
      const teamRunId = located.executionKind === "task_team_member" && taskTeam ? taskTeam.teamRunId : located.rootTeamRunId;
      return {
        ...this.place(located.memoryDir), runId: located.agentRunId, agentName: addressName(located.memberAddress),
        teamName: located.executionKind === "task_team_member" && taskTeam ? addressName(taskTeam.address) : located.tree.rootTeam.teamDefinitionName,
        memberName: addressName(located.memberAddress), orgName: null,
        workspace: launch?.workspaceRootPath ?? null, runtimeKind: launch?.runtimeKind ?? null,
        subject: { kind: "TEAM_MEMBER", teamRunId, agentRunId: located.agentRunId },
      };
    });
  }

  private async orgMembers(): Promise<MemoryRun[]> {
    return (await this.deps.orgLocations.listAgents()).map((located): MemoryRun => {
      const launch = located.configuredPlacement?.launchConfiguration ?? null;
      const memberName = located.memberAddress.replace(/^\/+/, "") || located.memberAddress;
      return {
        ...this.place(located.memoryDir), runId: located.agentRunId, agentName: addressName(located.memberAddress),
        teamName: null, memberName, orgName: located.tree.rootOrg.orgDefinitionName,
        workspace: launch?.workspaceRootPath ?? null, runtimeKind: launch?.runtimeKind ?? null,
        subject: { kind: "ORG_MEMBER", orgRunId: located.rootRunId, agentRunId: located.agentRunId },
      };
    });
  }

  private async taskTeamMembers(): Promise<MemoryRun[]> {
    return (await this.deps.taskTeams.listTaskTeams()).flatMap((team) => team.members.map((member): MemoryRun => ({
      ...this.place(member.memoryDir), runId: member.agentRunId, agentName: member.displayName,
      teamName: team.displayName, memberName: member.displayName, orgName: null,
      workspace: member.launchConfiguration.workspaceRootPath, runtimeKind: member.launchConfiguration.runtimeKind,
      subject: { kind: "TEAM_MEMBER", teamRunId: team.teamRunId, agentRunId: member.agentRunId },
    })));
  }

  /** `agents/<runId>` folders: standalone and task agents, named by the run history catalog as recorded. */
  private async agentRuns(runFolders: ReadonlySet<string>): Promise<MemoryRun[]> {
    const rows = new Map((await this.deps.agentCatalog.listCatalogRows()).map((row) => [row.runId, row]));
    const runs: MemoryRun[] = [];
    for (const entry of await this.subfolders(this.layout.getStandaloneRootDirPath())) {
      const memoryDir = path.join(this.layout.getStandaloneRootDirPath(), entry);
      if (!runFolders.has(memoryDir)) continue;
      const metadata = await this.deps.agentMetadata.readMetadata(entry).catch(() => null);
      const taskAgent = metadata ? null : await this.deps.agentMetadata.readTaskAgentMetadata(entry).catch(() => null);
      const row = rows.get(entry) ?? null;
      const definitionId = optional(metadata?.agentDefinitionId) ?? optional(taskAgent?.agentDefinitionId) ?? optional(row?.agentDefinitionId);
      // The journal target: the agent runtime that wrote the open raw-trace file (the previous one while a switch is pending).
      const runtimeKind: RuntimeKind | null = metadata ? openRawTraceRuntimeKind(metadata) : taskAgent?.runtimeKind ?? null;
      runs.push({
        ...this.place(memoryDir), runId: entry,
        agentName: optional(row?.agentName) ?? definitionId ?? nameFromFolder(entry),
        teamName: null, memberName: null, orgName: null,
        workspace: optional(metadata?.workspaceRootPath) ?? optional(taskAgent?.workspaceRootPath) ?? optional(row?.workspaceRootPath),
        runtimeKind,
        subject: { kind: "AGENT", runId: entry, agentDefinitionId: definitionId },
      });
    }
    return runs;
  }

  /** Every folder with raw traces under the three family roots (absolute, resolved). */
  private async runFolders(): Promise<Set<string>> {
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
    for (const root of [this.layout.getStandaloneRootDirPath(), this.layout.getTeamRootDirPath(), this.layout.getOrgRootDirPath()]) {
      for (const entry of await this.subfolders(root)) await walk(path.join(root, entry), 1);
    }
    return found;
  }

  private async subfolders(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  }

  /** One record family that cannot be read leaves its runs to the folder rule; the step still finds them. */
  private async guarded(label: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      console.warn("MEMORY_SEARCH_DISCOVERY_SOURCE_FAILED", { source: label, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
