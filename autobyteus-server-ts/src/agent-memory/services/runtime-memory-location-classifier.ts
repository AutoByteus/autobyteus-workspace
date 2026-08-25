import fs from "node:fs/promises";
import path from "node:path";
import { WORKING_CONTEXT_SNAPSHOT_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { getTeamRunExecutionTreePath } from "../../run-history/store/team-run-execution-tree-path.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import {
  runtimeKindFromString,
  type RuntimeKind,
} from "../../runtime-management/runtime-kind-enum.js";
import { AgentMemoryLayout } from "../store/agent-memory-layout.js";
import { AgentMemoryLocationService } from "./agent-memory-location-service.js";

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

export class RuntimeMemoryLocationClassifier {
  private readonly layout: AgentMemoryLayout;
  private readonly runMetadataStore: AgentRunMetadataStore;
  private readonly locationService: AgentMemoryLocationService;

  constructor(private readonly memoryDir: string) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.runMetadataStore = new AgentRunMetadataStore(memoryDir);
    this.locationService = new AgentMemoryLocationService({
      memoryDir,
      locationService: createStoredTeamRunExecutionTreeLocationService(memoryDir),
    });
  }

  async classify(): Promise<RuntimeMemoryLocationClassification> {
    const diagnostics: RuntimeMemoryLocationDiagnostic[] = [];
    const locations = new Map<string, RuntimeMemoryLocation>();
    const blockedPaths = new Set<string>();
    await this.classifyStandalone(locations, blockedPaths, diagnostics);
    await this.classifyTeamMembers(locations, blockedPaths, diagnostics);
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
        const exact = this.locationService.getStandaloneLocation({
          agentRunId: runId,
        });
        this.registerLocation(locations, blockedPaths, diagnostics, {
          itemId: `agents/${runId}`,
          memoryDir: path.resolve(exact.memoryDir),
          workingContextSnapshotPath: path.resolve(
            exact.memoryDir,
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

  private async classifyTeamMembers(
    locations: Map<string, RuntimeMemoryLocation>,
    blockedPaths: Set<string>,
    diagnostics: RuntimeMemoryLocationDiagnostic[],
  ): Promise<void> {
    const rootDir = this.layout.getTeamRootDirPath();
    const teamRunIds = await this.listDirectories(rootDir, diagnostics);
    for (const teamRunId of teamRunIds) {
      const metadataPath = getTeamRunExecutionTreePath(
        this.layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }),
      );
      try {
        const exactLocations = await this.locationService.listTeamMemberLocations({ teamRunId });
        if (exactLocations.length === 0) {
          diagnostics.push({
            itemId: `agent_teams/${teamRunId}:metadata`,
            filePath: metadataPath,
            status: "SKIPPED",
            reasonCode: "metadata_missing",
            message: "Team run has no current execution tree or Agent executions and was not classified.",
          });
          continue;
        }
        for (const exact of exactLocations) {
          this.registerLocation(locations, blockedPaths, diagnostics, {
            itemId: itemIdFor(this.memoryDir, exact.memoryDir),
            memoryDir: path.resolve(exact.memoryDir),
            workingContextSnapshotPath: path.resolve(
              exact.memoryDir,
              WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
            ),
            runtimeKind: exact.configuredPlacement
              ? exact.configuredPlacement.launchConfiguration.runtimeKind
              : null,
            snapshotAgentId: exact.agentRunId,
            subject: {
              kind: "team_member",
              rootTeamRunId: exact.rootTeamRunId,
              memberAddress: exact.memberAddress,
              agentRunId: exact.agentRunId,
            },
          });
        }
      } catch (error) {
        diagnostics.push({
          itemId: `agent_teams/${teamRunId}:metadata`,
          filePath: metadataPath,
          status: "FAILED",
          reasonCode: "metadata_invalid",
          message: `Could not classify TeamRun execution tree: ${messageFromError(error)}`,
        });
      }
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
