import fs from "node:fs/promises";
import { TeamBackendKind } from "../../../agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../agent-team-execution/domain/team-run-config.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../agent-team-execution/domain/team-run-execution-tree.js";
import { buildInitialTeamRunExecutionTree } from "../../../agent-team-execution/services/team-run-execution-tree-builder.js";
import { validateTeamRunExecutionTreePayload } from "../../../run-history/store/team-run-execution-tree-schema.js";
import { validateTeamRunMetadataPayload } from "../../legacy/team-run-metadata-schema.js";
import type { TokenUsageExecutionIdentityEvidenceRow } from "../../../token-usage/repositories/sql/token-usage-execution-identity-migration-repository.js";
import { buildTokenExecutionEvidence, object, text } from "./predecessor-team-run-evidence.js";
import { PredecessorPhysicalRunIndex } from "./predecessor-physical-run-index.js";
import { convertPredecessorTeamPackageSubjects } from "./predecessor-task-package-converter.js";

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const readJson = async (filePath: string, optional = false): Promise<unknown | null> => {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown; }
  catch (error) {
    if (optional && missing(error)) return null;
    throw error;
  }
};

const applicationBindingFromMetadata = (
  rawMetadata: unknown,
): { applicationId: string; bindingId: string } | null => {
  const pairs = new Map<string, { applicationId: string; bindingId: string }>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const record = value as Record<string, unknown>;
    if (record.applicationExecutionContext && typeof record.applicationExecutionContext === "object") {
      const context = object(record.applicationExecutionContext, "applicationExecutionContext");
      const applicationId = text(context.applicationId, "applicationExecutionContext.applicationId");
      const bindingId = text(context.bindingId, "applicationExecutionContext.bindingId");
      pairs.set(`${applicationId}\0${bindingId}`, { applicationId, bindingId });
    }
    for (const child of Object.values(record)) visit(child);
  };
  visit(rawMetadata);
  if (pairs.size > 1) throw new Error("Predecessor TeamRun contains contradictory application bindings.");
  return pairs.values().next().value ?? null;
};

export type PlannedTeamRunV1Package = Readonly<{
  executionTree: import("../../../agent-team-execution/domain/team-run-execution-tree.js").TeamRunExecutionTreeSnapshot;
  taskRecords: import("../../../agent-team-execution/task-delegation/task-delegation-record-v1.js").TaskDelegationRecordsSnapshot;
  communicationMessages: import("../../../services/team-communication/team-communication-v1-types.js").TeamCommunicationMessagesSnapshot;
}>;

export const planPredecessorTeamRunV1Package = async (input: {
  rootTeamRunId: string;
  rootDir: string;
  metadataPath: string;
  taskRecordsPath: string;
  communicationPath: string;
  tokenRows: readonly TokenUsageExecutionIdentityEvidenceRow[];
}): Promise<PlannedTeamRunV1Package> => {
  const rawMetadata = await readJson(input.metadataPath);
  const metadata = validateTeamRunMetadataPayload(rawMetadata, input.rootTeamRunId);
  const config = new TeamRunConfig({
    teamBackendKind: TeamBackendKind.MIXED,
    rootTeam: metadata.rootTeam,
    handoffs: metadata.handoffs,
    applicationBinding: applicationBindingFromMetadata(rawMetadata),
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
  const converted = convertPredecessorTeamPackageSubjects({
    rootTeamRunId: input.rootTeamRunId,
    initialTree,
    taskFile: await readJson(input.taskRecordsPath, true),
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
