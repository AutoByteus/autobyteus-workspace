import fs from "node:fs/promises";
import { TeamBackendKind } from "../../../agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../agent-team-execution/domain/team-run-config.js";
import type {
  AgentLaunchConfiguration,
  TeamRunApplicationBinding,
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
  TeamRunNode,
} from "../../../agent-team-execution/domain/team-run-config.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree-v1-types.js";
import { buildInitialTeamRunExecutionTree } from "./team-run-execution-tree-v1-builder.js";
import { validateTeamRunExecutionTreePayload } from "./team-run-execution-tree-v1-schema.js";
import { buildTokenExecutionEvidence, text } from "./predecessor-team-run-evidence.js";
import { PredecessorPhysicalRunIndex } from "./predecessor-physical-run-index.js";
import { convertPredecessorTeamPackageSubjects } from "./predecessor-task-package-converter.js";
import { convertLegacyTeamRunMetadata } from "./predecessor-team-metadata-converter.js";
import { convertPredecessorTaskDelegationFile } from "./predecessor-task-delegation-converter.js";
import type { TeamRunV1TokenRowDisposition } from "./token-usage-team-run-v1-row-planner.js";
import type {
  TeamRunMemberMetadata,
  TeamRunSubTeamMemberMetadata,
} from "../../legacy/team-run-metadata-types.js";

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const readJson = async (filePath: string, optional = false): Promise<unknown | null> => {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown; }
  catch (error) {
    if (optional && missing(error)) return null;
    throw error;
  }
};

/** Derive one package binding from the validated predecessor Agent hierarchy. */
export const applicationBindingFromMetadata = (
  rootTeam: TeamRunSubTeamMemberMetadata,
): TeamRunApplicationBinding | null => {
  const pairs = new Map<string, TeamRunApplicationBinding>();
  const visit = (member: TeamRunMemberMetadata): void => {
    if (member.kind === "agent_team") {
      member.children.forEach(visit);
      return;
    }
    const context = member.applicationExecutionContext;
    if (context) {
      const applicationId = text(
        context.applicationId,
        `applicationExecutionContext.applicationId at '${member.address}'`,
      );
      const bindingId = text(
        context.bindingId,
        `applicationExecutionContext.bindingId at '${member.address}'`,
      );
      pairs.set(JSON.stringify([applicationId, bindingId]), { applicationId, bindingId });
    }
  };
  rootTeam.children.forEach(visit);
  if (pairs.size > 1) throw new Error("Predecessor TeamRun contains contradictory application bindings.");
  return pairs.values().next().value ?? null;
};

const launchConfigurationFromAgent = (
  agent: TeamRunAgentNode,
): AgentLaunchConfiguration => ({
  runtimeKind: agent.runtimeKind,
  llmModelIdentifier: agent.llmModelIdentifier,
  llmConfig: agent.llmConfig,
  autoExecuteTools: agent.autoExecuteTools,
  skillAccessMode: agent.skillAccessMode,
  workspaceRootPath: agent.workspaceRootPath,
});

const materializeMigrationTeam = (
  team: TeamRunSubTeamMemberMetadata,
): TeamRunAgentTeamNode => {
  const children: TeamRunNode[] = team.children.map((child) => {
    if (child.kind === "agent_team") return materializeMigrationTeam(child);
    const { applicationExecutionContext: _ignored, ...agent } = child;
    return agent;
  });
  const coordinator = children.find((child): child is TeamRunAgentNode =>
    child.kind === "agent" && child.address === team.coordinatorAddress);
  if (!coordinator) throw new Error(`Historical Team '${team.address}' has no direct coordinator.`);
  return {
    ...team,
    defaultLaunchConfiguration: launchConfigurationFromAgent(coordinator),
    children,
  };
};

export type PlannedTeamRunV1Package = Readonly<{
  executionTree: import("./team-run-execution-tree-v1-types.js").TeamRunExecutionTreeSnapshot;
  taskRecords: import("../../../agent-team-execution/task-delegation/task-delegation-record-v1.js").TaskDelegationRecordsSnapshot;
  communicationMessages: import("../../../services/team-communication/team-communication-v1-types.js").TeamCommunicationMessagesSnapshot;
}>;

export const planPredecessorTeamRunV1Package = async (input: {
  rootTeamRunId: string;
  rootDir: string;
  metadataPath: string;
  taskRecordsPath: string;
  communicationPath: string;
  tokenRows: readonly TeamRunV1TokenRowDisposition[];
}): Promise<PlannedTeamRunV1Package> => {
  const rawMetadata = await readJson(input.metadataPath);
  const metadata = convertLegacyTeamRunMetadata(rawMetadata, input.rootTeamRunId);
  const config = new TeamRunConfig({
    teamBackendKind: TeamBackendKind.MIXED,
    rootTeam: materializeMigrationTeam(metadata.rootTeam),
    handoffs: metadata.handoffs,
    applicationBinding: applicationBindingFromMetadata(metadata.rootTeam),
  });
  const initial = buildInitialTeamRunExecutionTree({
    config,
    teamDefinitionName: metadata.teamDefinitionName,
    createdAt: metadata.createdAt,
  });
  const initialTree: TeamRunExecutionTreeSnapshot = validateTeamRunExecutionTreePayload({
    ...initial,
    archivedAt: metadata.archivedAt,
  }, input.rootTeamRunId);
  const evidence = buildTokenExecutionEvidence(input.tokenRows);
  const physical = await PredecessorPhysicalRunIndex.build(
    input.rootDir,
    new Set([...evidence.values()].map((row) => row.runId)),
  );
  const rawTasks = await readJson(input.taskRecordsPath, true);
  const converted = convertPredecessorTeamPackageSubjects({
    rootTeamRunId: input.rootTeamRunId,
    initialTree,
    taskFile: rawTasks === null
      ? null
      : convertPredecessorTaskDelegationFile(rawTasks, input.rootTeamRunId),
    communicationFile: await readJson(input.communicationPath, true),
    evidence,
    physical,
  });
  return Object.freeze({
    executionTree: converted.tree,
    taskRecords: converted.tasks,
    communicationMessages: converted.messages,
  });
};
