import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationItemStatus,
} from "../domain/app-data-migration-types.js";
import type {
  ConfiguredAgentExecutionNode,
  TaskExecution,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import { getTeamRunExecutionTreePath } from "../../run-history/store/team-run-execution-tree-path.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
} from "../../run-history/store/atomic-run-package-file-commit-writer.js";
import { TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID } from "./team-agent-memory-layout-app-data-migration.js";
import { validateTeamRunExecutionTreePayload as validateV1 } from "./team-run-execution-tree-v1/team-run-execution-tree-v1-schema.js";
import type {
  ConfiguredAgentExecution as ConfiguredAgentExecutionV1,
  ConfiguredMemberExecution as ConfiguredMemberExecutionV1,
  ConfiguredTeamExecution as ConfiguredTeamExecutionV1,
  RootConfiguredTeamExecution as RootConfiguredTeamExecutionV1,
  TeamRunExecutionTreeFileV1,
  AgentLaunchConfiguration as AgentLaunchConfigurationV1,
} from "./team-run-execution-tree-v1/team-run-execution-tree-v1-types.js";

export const TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID =
  "20260824_team_run_execution_tree_v2";

type Disposition =
  | "MIGRATED"
  | "MIGRATED_WITH_FINALIZATION_WARNING"
  | "SKIPPED_MISSING"
  | "SKIPPED_ALREADY_CURRENT"
  | "FAILED_UNSUPPORTED_ENTRY"
  | "FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD"
  | "FAILED_TRANSFORMATION"
  | "FAILED_CURRENT_VALIDATION";

type DispositionRecord = { count: number; examples: string[] };

const FAILED = new Set<Disposition>([
  "FAILED_UNSUPPORTED_ENTRY",
  "FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD",
  "FAILED_TRANSFORMATION",
  "FAILED_CURRENT_VALIDATION",
]);
const WARNINGS = new Set<Disposition>(["MIGRATED_WITH_FINALIZATION_WARNING"]);

const statusFor = (disposition: Disposition): AppDataMigrationItemStatus => {
  if (disposition === "MIGRATED" || disposition === "MIGRATED_WITH_FINALIZATION_WARNING") return "MIGRATED";
  return FAILED.has(disposition) ? "FAILED" : "SKIPPED";
};

const messageFor = (disposition: Disposition): string => {
  switch (disposition) {
    case "MIGRATED": return "Transformed one exact TeamRun execution tree from V1 to V2.";
    case "MIGRATED_WITH_FINALIZATION_WARNING": return "The canonical file is exact V2 after a post-rename finalization warning.";
    case "SKIPPED_MISSING": return "No TeamRun execution tree file exists.";
    case "SKIPPED_ALREADY_CURRENT": return "The TeamRun execution tree was already exact V2.";
    case "FAILED_UNSUPPORTED_ENTRY": return "The TeamRun root or execution-tree authority is not a regular supported entry.";
    case "FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD": return "The execution tree is neither exact V1 nor exact V2.";
    case "FAILED_TRANSFORMATION": return "The exact V1 tree could not be transformed deterministically.";
    case "FAILED_CURRENT_VALIDATION": return "The canonical execution tree is not exact V2 after the write attempt.";
  }
};

const runtimeKind = (value: AgentLaunchConfigurationV1["runtimeKind"]): RuntimeKind => {
  switch (value) {
    case "AUTOBYTEUS": return RuntimeKind.AUTOBYTEUS;
    case "CLAUDE": return RuntimeKind.CLAUDE_AGENT_SDK;
    case "CODEX": return RuntimeKind.CODEX_APP_SERVER;
  }
};

const launchConfiguration = (value: AgentLaunchConfigurationV1): AgentLaunchConfiguration => ({
  runtimeKind: runtimeKind(value.runtimeKind),
  llmModelIdentifier: value.llmModelIdentifier,
  llmConfig: value.llmConfig ? structuredClone(value.llmConfig) : null,
  autoExecuteTools: value.autoExecuteTools,
  skillAccessMode: value.skillAccessMode,
  workspaceRootPath: value.workspaceRootPath,
});

type ReleasedConfiguredTeamExecutionNodeV2 = Readonly<{
  address: string;
  teamDefinitionId: string;
  role: string | null;
  description: string | null;
  teamRunId: string;
  coordinatorAddress: string;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly ReleasedConfiguredExecutionNodeV2[];
  taskExecutions: readonly TaskExecution[];
}>;
type ReleasedConfiguredExecutionNodeV2 = ConfiguredAgentExecutionNode | ReleasedConfiguredTeamExecutionNodeV2;
type ReleasedTeamRunExecutionTreeFileV2 = Readonly<{
  schemaVersion: 2;
  createdAt: string;
  archivedAt: string | null;
  applicationBinding: unknown;
  handoffs: unknown;
  rootTeam: Readonly<{
    address: "/";
    teamDefinitionId: string;
    teamDefinitionName: string;
    teamRunId: string;
    coordinatorAddress: string;
    defaultLaunchConfiguration: AgentLaunchConfiguration;
    members: readonly ReleasedConfiguredExecutionNodeV2[];
    taskExecutions: readonly TaskExecution[];
  }>;
}>;

const validateReleasedV2 = (value: unknown, expectedRootTeamRunId: string): ReleasedTeamRunExecutionTreeFileV2 => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Released Team V2 must be an object.");
  const tree = value as Record<string, unknown>;
  if (tree.schemaVersion !== 2 || !tree.rootTeam || typeof tree.rootTeam !== "object" || Array.isArray(tree.rootTeam)) {
    throw new Error("Released Team V2 root is invalid.");
  }
  const root = tree.rootTeam as Record<string, unknown>;
  if (root.address !== "/" || root.teamRunId !== expectedRootTeamRunId || !Array.isArray(root.members)) {
    throw new Error("Released Team V2 root identity is invalid.");
  }
  const validateMembers = (members: unknown[]): void => members.forEach((member) => {
    if (!member || typeof member !== "object" || Array.isArray(member)) throw new Error("Released Team V2 member is invalid.");
    const record = member as Record<string, unknown>;
    if ("agentRunId" in record) return;
    if (typeof record.teamRunId !== "string" || !Array.isArray(record.members)) throw new Error("Released Team V2 configured Team is invalid.");
    validateMembers(record.members);
  });
  validateMembers(root.members);
  return structuredClone(value) as ReleasedTeamRunExecutionTreeFileV2;
};

const validateCurrentOrReleasedV2 = (value: unknown, expectedRootTeamRunId: string): void => {
  try {
    validateTeamRunExecutionTreePayload(value, expectedRootTeamRunId);
  } catch {
    validateReleasedV2(value, expectedRootTeamRunId);
  }
};

const agentNode = (node: ConfiguredAgentExecutionV1): ConfiguredAgentExecutionNode => ({
  address: node.address,
  agentDefinitionId: node.agentDefinitionId,
  role: node.role,
  description: node.description,
  agentRunId: node.agentRunId,
  platformAgentRunId: node.platformAgentRunId,
  launchConfiguration: launchConfiguration(node.launchConfiguration),
});

const directCoordinator = (
  team: RootConfiguredTeamExecutionV1 | ConfiguredTeamExecutionV1,
): ConfiguredAgentExecutionV1 => {
  const matches = team.members.filter((member): member is ConfiguredAgentExecutionV1 =>
    "agentRunId" in member && member.address === team.coordinatorAddress);
  if (matches.length !== 1) {
    throw new Error(`TeamRun '${team.teamRunId}' has no unique direct coordinator '${team.coordinatorAddress}'.`);
  }
  return matches[0]!;
};

const teamNode = (node: ConfiguredTeamExecutionV1): ReleasedConfiguredTeamExecutionNodeV2 => ({
  address: node.address,
  teamDefinitionId: node.teamDefinitionId,
  role: node.role,
  description: node.description,
  teamRunId: node.teamRunId,
  coordinatorAddress: node.coordinatorAddress,
  defaultLaunchConfiguration: launchConfiguration(directCoordinator(node).launchConfiguration),
  members: node.members.map(configuredNode),
  taskExecutions: structuredClone(node.taskExecutions),
});

const configuredNode = (node: ConfiguredMemberExecutionV1): ReleasedConfiguredExecutionNodeV2 =>
  "agentRunId" in node ? agentNode(node) : teamNode(node);

export const transformTeamRunExecutionTreeV1ToV2 = (
  tree: TeamRunExecutionTreeFileV1,
): ReleasedTeamRunExecutionTreeFileV2 => {
  const root: ReleasedTeamRunExecutionTreeFileV2["rootTeam"] = {
    address: "/",
    teamDefinitionId: tree.rootTeam.teamDefinitionId,
    teamDefinitionName: tree.rootTeam.teamDefinitionName,
    teamRunId: tree.rootTeam.teamRunId,
    coordinatorAddress: tree.rootTeam.coordinatorAddress,
    defaultLaunchConfiguration: launchConfiguration(directCoordinator(tree.rootTeam).launchConfiguration),
    members: tree.rootTeam.members.map(configuredNode),
    taskExecutions: structuredClone(tree.rootTeam.taskExecutions),
  };
  return validateReleasedV2({
    schemaVersion: 2,
    createdAt: tree.createdAt,
    archivedAt: tree.archivedAt,
    applicationBinding: tree.applicationBinding ? structuredClone(tree.applicationBinding) : null,
    handoffs: structuredClone(tree.handoffs),
    rootTeam: root,
  }, tree.rootTeam.teamRunId);
};

export class TeamRunExecutionTreeV2AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID;
  readonly displayName = "Upgrade TeamRun execution trees to V2";
  readonly description = "Materializes a complete effective launch default on every configured TeamRun.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "ANYTIME" as const;
  readonly prerequisiteMigrationIds = [TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID] as const;

  private readonly layout: AgentMemoryLayout;
  private readonly dispositions = new Map<Disposition, DispositionRecord>();
  private scannedCount = 0;

  constructor(
    private readonly memoryDir: string,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.dispositions.clear();
    this.scannedCount = 0;
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(this.layout.getTeamRootDirPath(), { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return this.result();
      throw error;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      this.scannedCount += 1;
      const rootPath = path.join(this.layout.getTeamRootDirPath(), entry.name);
      if (!entry.isDirectory()) {
        this.record("FAILED_UNSUPPORTED_ENTRY", rootPath);
        continue;
      }
      await this.migrateRoot(entry.name, rootPath);
    }
    return this.result();
  }

  private async migrateRoot(rootTeamRunId: string, rootPath: string): Promise<void> {
    const filePath = getTeamRunExecutionTreePath(rootPath);
    let raw: unknown;
    try {
      const stat = await fs.lstat(filePath);
      if (!stat.isFile()) {
        this.record("FAILED_UNSUPPORTED_ENTRY", filePath);
        return;
      }
      raw = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.record("SKIPPED_MISSING", filePath);
        return;
      }
      this.record("FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD", filePath);
      return;
    }

    try {
      validateCurrentOrReleasedV2(raw, rootTeamRunId);
      this.record("SKIPPED_ALREADY_CURRENT", filePath);
      return;
    } catch {
      // Exact V1 classification is attempted next inside the migration boundary.
    }

    let target: ReleasedTeamRunExecutionTreeFileV2;
    try {
      target = transformTeamRunExecutionTreeV1ToV2(validateV1(raw, rootTeamRunId));
    } catch (error) {
      const schemaVersion = raw && typeof raw === "object"
        ? (raw as Record<string, unknown>).schemaVersion
        : null;
      this.record(
        schemaVersion === 1 ? "FAILED_TRANSFORMATION" : "FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD",
        filePath,
      );
      return;
    }

    const write = await this.writer.write({ file: "execution_tree", filePath, payload: target });
    if (write.outcome === "not_renamed") {
      this.record("FAILED_CURRENT_VALIDATION", filePath);
      return;
    }
    try {
      const reread = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
      validateCurrentOrReleasedV2(reread, rootTeamRunId);
      this.record(
        write.outcome === "committed" ? "MIGRATED" : "MIGRATED_WITH_FINALIZATION_WARNING",
        filePath,
      );
    } catch {
      this.record("FAILED_CURRENT_VALIDATION", filePath);
    }
  }

  private record(disposition: Disposition, examplePath: string): void {
    const current = this.dispositions.get(disposition) ?? { count: 0, examples: [] };
    current.count += 1;
    current.examples.push(path.relative(this.memoryDir, examplePath).split(path.sep).join("/") || ".");
    current.examples.sort();
    current.examples.splice(5);
    this.dispositions.set(disposition, current);
  }

  private result(): AppDataMigrationExecutionResult {
    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: AppDataMigrationItemDetail[] = [];
    for (const [disposition, value] of [...this.dispositions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))) {
      const status = statusFor(disposition);
      if (status === "MIGRATED") migratedCount += value.count;
      else if (status === "FAILED") failedCount += value.count;
      else skippedCount += value.count;
      details.push({
        itemId: disposition,
        status,
        message: `${messageFor(disposition)} Count: ${value.count}.` +
          (value.examples.length ? ` Examples: ${value.examples.join(", ")}.` : ""),
      });
    }
    const warning = [...this.dispositions.keys()].some((value) => WARNINGS.has(value));
    return {
      status: failedCount > 0 ? "FAILED" : warning ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount: this.scannedCount, migratedCount, skippedCount, failedCount, details },
      errorMessage: failedCount > 0
        ? `${failedCount} TeamRun execution tree${failedCount === 1 ? "" : "s"} could not be upgraded to V2.`
        : null,
    };
  }
}
