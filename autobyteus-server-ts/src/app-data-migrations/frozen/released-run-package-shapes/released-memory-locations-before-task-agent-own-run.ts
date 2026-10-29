// Frozen copy of `src/agent-memory/services/runtime-memory-location-classifier.ts` and of the stored
// location derivation it calls (`createStoredCollaborationExecutionLocationService().listAgents()`:
// the team, org and standalone location services), as of origin/personal@66429d6f31. A task agent's
// memory sits nested inside its coordinating run (by physical scope), as it did before
// `20261017_task_agent_own_run_v1`. Trees are read with the released tree parser; root admission uses
// the released package validator; the execution indexes and the layout's path methods are current
// (their results are unchanged by task-agent-own-run). Owned by the `20260731` snapshot migrations;
// current runtime must not import it.

import fs from "node:fs/promises";
import path from "node:path";
import { WORKING_CONTEXT_SNAPSHOT_FILE_NAME } from "../autobyteus-ts/memory/store/memory-file-names.js";
import type { AgentTeamAddress } from "../server/agent-collaboration/domain/agent-team-address.js";
import { AgentMemoryLayout } from "../server/agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionIndex } from "../server/agent-org-execution/services/agent-org-execution-index.js";
import type { AgentLaunchConfiguration } from "../server/agent-team-execution/domain/team-run-config.js";
import { TeamExecutionIndex } from "../server/agent-team-execution/services/team-execution-index.js";
import { AgentRunMetadataStore } from "../server/run-history/store/agent-run-metadata-store.js";
import {
  runtimeKindFromString,
  type RuntimeKind,
} from "../server/runtime-management/runtime-kind-enum.js";
import { getStandaloneRootTreePath } from "../server/standalone-agent-run-root/persistence/standalone-root-tree-path.js";
import { StandaloneRootExecutionIndex } from "../server/standalone-agent-run-root/services/standalone-root-execution-index.js";
import { ReleasedRootRunPackageValidator } from "./released-root-packages-before-task-agent-own-run.js";
import {
  ReleasedAgentOrgRunExecutionTreeReader,
  ReleasedStandaloneRootTreeReader,
  ReleasedTeamRunExecutionTreeReader,
  effectiveMemberLaunchConfiguration,
  type StandaloneRootTreeFile,
  type TaskExecution,
} from "./released-trees-before-task-agent-own-run.js";

export type RuntimeMemoryLocation = {
  itemId: string;
  memoryDir: string;
  workingContextSnapshotPath: string;
  runtimeKind: RuntimeKind | null;
  snapshotAgentId: string;
  subject:
    | { kind: "standalone"; runId: string }
    | {
        kind: "team_member";
        rootTeamRunId: string;
        memberAddress: string;
        agentRunId: string;
      }
    | {
        kind: "org_member";
        orgRunId: string;
        memberAddress: string;
        agentRunId: string;
      }
    | {
        /** A child of an Agent root: stored under `agents/<hostRunId>/collaboration/`. */
        kind: "agent_collaboration_member";
        hostRunId: string;
        memberAddress: string;
        agentRunId: string;
      };
};

export type RuntimeMemoryLocationDiagnostic = {
  itemId: string;
  filePath: string;
  status: "SKIPPED" | "FAILED";
  message: string;
  reasonCode:
    | "directory_not_traversed"
    | "directory_inspection_failed"
    | "metadata_missing"
    | "metadata_invalid"
    | "location_conflict";
  workingContextSnapshotPath?: string;
};

export type RuntimeMemoryLocationClassification = {
  locations: RuntimeMemoryLocation[];
  diagnostics: RuntimeMemoryLocationDiagnostic[];
};

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const messageFromError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const itemIdFor = (memoryDir: string, filePath: string): string =>
  path.relative(memoryDir, filePath).split(path.sep).join("/") || ".";

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
};

const memberSubject = (exact: ReleasedAgentLocation): RuntimeMemoryLocation["subject"] => {
  switch (exact.rootSubjectKind) {
    case "agent_org":
      return { kind: "org_member", orgRunId: exact.rootRunId, memberAddress: exact.memberAddress, agentRunId: exact.agentRunId };
    case "agent_team":
      return { kind: "team_member", rootTeamRunId: exact.rootRunId, memberAddress: exact.memberAddress, agentRunId: exact.agentRunId };
    case "agent":
      return { kind: "agent_collaboration_member", hostRunId: exact.rootRunId, memberAddress: exact.memberAddress, agentRunId: exact.agentRunId };
  }
};

/** The fields of a located collaboration agent execution that the classifier reads. */
type ReleasedAgentLocation = Readonly<{
  rootSubjectKind: "agent_team" | "agent_org" | "agent";
  rootRunId: string;
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  memoryDir: string;
  /** Configured placement's launch (team, org), else the catalog copy's recorded launch (agent root). */
  launchConfiguration: AgentLaunchConfiguration | null;
}>;

/** Root ids admitted per family by one scan of the released package validator (none when discovery fails). */
const admittedRootIds = async (memoryDir: string): Promise<Readonly<{ teams: string[]; orgs: string[] }>> => {
  try {
    const snapshot = await new ReleasedRootRunPackageValidator(memoryDir).scan();
    const ids = (family: string) => snapshot.groups.filter((group) => group.family === family).map((group) => group.id).sort();
    return { teams: ids("agent_team"), orgs: ids("agent_org") };
  } catch (error) {
    console.warn(`History discovery unavailable: ${messageFromError(error)}`);
    return { teams: [], orgs: [] };
  }
};

/** Frozen `catalogCopyExecutionSource(taskExecutionListsOf(tree), agentRunId)?.launchConfiguration`. */
const catalogCopyLaunchConfiguration = (tree: StandaloneRootTreeFile, agentRunId: string): AgentLaunchConfiguration | null => {
  const visit = (tasks: readonly TaskExecution[]): AgentLaunchConfiguration | null => {
    for (const task of tasks) {
      if ("agentRunId" in task) {
        if (task.agentRunId === agentRunId && task.source) return task.source.launchConfiguration;
        continue;
      }
      const member = task.source ? task.members.find((candidate) => "agentRunId" in candidate && candidate.agentRunId === agentRunId) : null;
      const definition = member && task.source?.members.find((candidate) => candidate.address === member.address);
      if (definition && task.source) return effectiveMemberLaunchConfiguration(task.source, definition);
      const nested = visit(task.taskExecutions);
      if (nested) return nested;
    }
    return null;
  };
  return visit(tree.taskExecutions);
};

const listTeamAgents = async (layout: AgentMemoryLayout, rootIds: readonly string[]): Promise<ReleasedAgentLocation[]> => {
  const output: ReleasedAgentLocation[] = [];
  for (const rootTeamRunId of rootIds) {
    const tree = await new ReleasedTeamRunExecutionTreeReader().read(layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] }), rootTeamRunId);
    if (!tree) continue;
    const index = new TeamExecutionIndex(tree);
    for (const agent of index.listAgentExecutions()) {
      const scope = index.getTeamRunPhysicalScope(agent.containingTeamRunId);
      const configured = index.getConfiguredPlacement(agent.address);
      output.push(Object.freeze({
        rootSubjectKind: "agent_team", rootRunId: scope.root.rootRunId, agentRunId: agent.agentRunId, memberAddress: agent.address,
        memoryDir: layout.getRootedAgentRunDirPath(scope, agent.agentRunId),
        launchConfiguration: configured && "agentRunId" in configured ? configured.launchConfiguration ?? null : null,
      }));
    }
  }
  return output;
};

const listOrgAgents = async (layout: AgentMemoryLayout, rootIds: readonly string[]): Promise<ReleasedAgentLocation[]> => {
  const output: ReleasedAgentLocation[] = [];
  for (const orgRunId of rootIds) {
    const tree = await new ReleasedAgentOrgRunExecutionTreeReader().read(layout.getOrgDirPath(orgRunId), orgRunId);
    if (!tree) continue;
    const index = new AgentOrgExecutionIndex(tree);
    for (const listed of index.listAgents()) {
      const agent = index.requireAgent(listed.agentRunId);
      const configured = index.getConfiguredPlacement(agent.address);
      output.push(Object.freeze({
        rootSubjectKind: "agent_org", rootRunId: tree.rootOrg.orgRunId, agentRunId: listed.agentRunId, memberAddress: agent.address,
        memoryDir: layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent(listed.agentRunId), listed.agentRunId),
        launchConfiguration: configured && "agentRunId" in configured ? configured.launchConfiguration ?? null : null,
      }));
    }
  }
  return output;
};

/** Children of Agent roots; a run whose collaboration tree cannot be read is skipped with a warning. */
const listStandaloneChildAgents = async (layout: AgentMemoryLayout): Promise<ReleasedAgentLocation[]> => {
  const entries = await fs.readdir(layout.getStandaloneRootDirPath(), { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const candidates = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
  const hostRunIds = (await Promise.all(candidates.map(async (id) =>
    fs.access(getStandaloneRootTreePath(layout.getAgentRunCollaborationDirPath(id))).then(() => id, () => null))))
    .filter((id): id is string => id !== null).sort();
  const output: ReleasedAgentLocation[] = [];
  for (const hostRunId of hostRunIds) {
    let tree: StandaloneRootTreeFile | null;
    try {
      tree = await new ReleasedStandaloneRootTreeReader().readTree(layout.getAgentRunCollaborationDirPath(hostRunId), hostRunId);
    } catch (error) {
      console.warn(`Skipping standalone run '${hostRunId}': its collaboration tree cannot be read: ${messageFromError(error)}`);
      continue;
    }
    if (!tree) continue;
    const index = new StandaloneRootExecutionIndex(tree);
    for (const listed of index.listChildAgents()) {
      const agent = index.requireAgent(listed.agentRunId);
      if (agent.executionKind === "host") throw new Error("The Agent-root host is located as a standalone run.");
      output.push(Object.freeze({
        rootSubjectKind: "agent", rootRunId: tree.host.agentRunId, agentRunId: listed.agentRunId, memberAddress: agent.address,
        memoryDir: layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent(listed.agentRunId), listed.agentRunId),
        launchConfiguration: catalogCopyLaunchConfiguration(tree, listed.agentRunId),
      }));
    }
  }
  return output;
};

/** Frozen `CollaborationExecutionLocationService#listAgents` over stored roots only. */
const listReleasedCollaborationAgentLocations = async (memoryDir: string): Promise<ReleasedAgentLocation[]> => {
  const layout = new AgentMemoryLayout(memoryDir);
  const admitted = await admittedRootIds(memoryDir);
  const [teams, orgs, agents] = await Promise.all([
    listTeamAgents(layout, admitted.teams), listOrgAgents(layout, admitted.orgs), listStandaloneChildAgents(layout),
  ]);
  const output = [...teams, ...orgs, ...agents];
  const seen = new Set<string>();
  for (const item of output) {
    if (seen.has(item.agentRunId)) throw new Error(`AgentRun '${item.agentRunId}' is present in more than one collaboration root.`);
    seen.add(item.agentRunId);
  }
  return output;
};

export class ReleasedRuntimeMemoryLocationClassifier {
  private readonly layout: AgentMemoryLayout;
  private readonly runMetadataStore: AgentRunMetadataStore;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.runMetadataStore = new AgentRunMetadataStore(memoryDir);
  }

  async classify(): Promise<RuntimeMemoryLocationClassification> {
    const diagnostics: RuntimeMemoryLocationDiagnostic[] = [];
    const locations = new Map<string, RuntimeMemoryLocation>();
    const blockedPaths = new Set<string>();
    await this.classifyStandalone(locations, blockedPaths, diagnostics);
    await this.classifyCollaborationMembers(locations, blockedPaths, diagnostics);
    return {
      locations: [...locations.values()].sort((left, right) => left.itemId.localeCompare(right.itemId)),
      diagnostics,
    };
  }

  private async classifyStandalone(
    locations: Map<string, RuntimeMemoryLocation>,
    blockedPaths: Set<string>,
    diagnostics: RuntimeMemoryLocationDiagnostic[],
  ): Promise<void> {
    const rootDir = this.layout.getStandaloneRootDirPath();
    const runIds = await this.listDirectories(rootDir, diagnostics);
    for (const runId of runIds) {
      const metadataPath = this.runMetadataStore.getMetadataPath(runId);
      try {
        const metadata = await this.runMetadataStore.readMetadata(runId);
        if (!metadata) {
          const present = await pathExists(metadataPath);
          diagnostics.push({
            itemId: `agents/${runId}:metadata`,
            filePath: metadataPath,
            status: present ? "FAILED" : "SKIPPED",
            reasonCode: present ? "metadata_invalid" : "metadata_missing",
            message: present
              ? "Standalone metadata exists but is not valid current run metadata."
              : "Standalone run has no current metadata and was not classified.",
          });
          continue;
        }
        if (metadata.runId !== runId) {
          throw new Error(`Metadata runId '${metadata.runId}' does not match directory '${runId}'.`);
        }
        const exactMemoryDir = this.layout.getStandaloneRunDirPath(runId);
        this.registerLocation(locations, blockedPaths, diagnostics, {
          itemId: `agents/${runId}`,
          memoryDir: path.resolve(exactMemoryDir),
          workingContextSnapshotPath: path.resolve(
            exactMemoryDir,
            WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
          ),
          runtimeKind: runtimeKindFromString(metadata.runtimeKind),
          snapshotAgentId: runId,
          subject: { kind: "standalone", runId },
        });
      } catch (error) {
        diagnostics.push({
          itemId: `agents/${runId}:metadata`,
          filePath: metadataPath,
          status: "FAILED",
          reasonCode: "metadata_invalid",
          message: `Could not classify standalone run metadata: ${messageFromError(error)}`,
        });
      }
    }
  }

  private async classifyCollaborationMembers(
    locations: Map<string, RuntimeMemoryLocation>,
    blockedPaths: Set<string>,
    diagnostics: RuntimeMemoryLocationDiagnostic[],
  ): Promise<void> {
    const exactLocations = await listReleasedCollaborationAgentLocations(this.memoryDir);
    for (const exact of exactLocations) {
      this.registerLocation(locations, blockedPaths, diagnostics, {
        itemId: itemIdFor(this.memoryDir, exact.memoryDir),
        memoryDir: path.resolve(exact.memoryDir),
        workingContextSnapshotPath: path.resolve(exact.memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME),
        runtimeKind: exact.launchConfiguration?.runtimeKind ?? null,
        snapshotAgentId: exact.agentRunId,
        subject: memberSubject(exact),
      });
    }
  }

  private async listDirectories(
    rootDir: string,
    diagnostics: RuntimeMemoryLocationDiagnostic[],
  ): Promise<string[]> {
    try {
      const rootStat = await fs.lstat(rootDir);
      if (rootStat.isSymbolicLink()) {
        diagnostics.push({
          itemId: itemIdFor(this.memoryDir, rootDir),
          filePath: rootDir,
          status: "SKIPPED",
          reasonCode: "directory_not_traversed",
          message: "Symbolic-link directory was not traversed.",
        });
        return [];
      }
      const entries = await fs.readdir(rootDir, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch (error) {
      if (isNotFound(error)) return [];
      diagnostics.push({
        itemId: itemIdFor(this.memoryDir, rootDir),
        filePath: rootDir,
        status: "FAILED",
        reasonCode: "directory_inspection_failed",
        message: `Could not inspect memory root: ${messageFromError(error)}`,
      });
      return [];
    }
  }

  private registerLocation(
    locations: Map<string, RuntimeMemoryLocation>,
    blockedPaths: Set<string>,
    diagnostics: RuntimeMemoryLocationDiagnostic[],
    location: RuntimeMemoryLocation,
  ): void {
    const key = location.workingContextSnapshotPath;
    if (blockedPaths.has(key)) return;
    const existing = locations.get(key);
    if (!existing) {
      locations.set(key, location);
      return;
    }
    if (
      existing.itemId === location.itemId
      && existing.snapshotAgentId === location.snapshotAgentId
      && existing.runtimeKind === location.runtimeKind
    ) return;

    locations.delete(key);
    blockedPaths.add(key);
    diagnostics.push({
      itemId: location.itemId,
      filePath: key,
      workingContextSnapshotPath: key,
      status: "FAILED",
      reasonCode: "location_conflict",
      message:
        `Multiple metadata identities resolve to this memory location ('${existing.itemId}' and '${location.itemId}'); snapshot was preserved.`,
    });
  }
}
