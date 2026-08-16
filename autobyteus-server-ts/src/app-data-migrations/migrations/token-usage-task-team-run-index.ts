import fs from "node:fs/promises";
import path from "node:path";
import {
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamExecutionAddress } from "../legacy/team-execution-address.js";
import { normalizePredecessorTaskDelegationRecordsFile } from "../predecessor-task-delegation-records.js";
import {
  TeamRunMigrationStateClassifier,
  type TeamRunMigrationState,
} from "./team-run-migration-state-classifier.js";
import type { TeamRunPredecessorSourceResolver } from "./team-run-execution-tree-v1/team-run-predecessor-source-resolver.js";

export type TokenUsageTaskTeamRunIndexEntry = Readonly<{
  rootTeamRunId: string;
  taskTeamRunIds: readonly string[];
  teamAddress: AgentTeamAddress;
  sourceFilePath: string;
  taskId: string;
}>;

export type TokenUsageTaskTeamRunIndexIssue = Readonly<{
  itemId: string;
  filePath: string;
  message: string;
}>;

export type TokenUsageTaskTeamRunIndex = Readonly<{
  entries: ReadonlyMap<string, TokenUsageTaskTeamRunIndexEntry>;
  issues: readonly TokenUsageTaskTeamRunIndexIssue[];
}>;

const missing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const sameMapping = (
  left: TokenUsageTaskTeamRunIndexEntry,
  right: TokenUsageTaskTeamRunIndexEntry,
): boolean => left.rootTeamRunId === right.rootTeamRunId
  && left.teamAddress === right.teamAddress
  && JSON.stringify(left.taskTeamRunIds) === JSON.stringify(right.taskTeamRunIds);

const predecessorTaskTeamEntry = (input: {
  rootTeamRunId: string;
  filePath: string;
  taskId: string;
  address: TeamExecutionAddress;
}): TokenUsageTaskTeamRunIndexEntry => {
  const { address } = input;
  if (address.rootTeamRunId !== input.rootTeamRunId) {
    throw new Error(
      `taskRun.address root '${address.rootTeamRunId}' does not match records root '${input.rootTeamRunId}'.`,
    );
  }
  if (address.taskAgentRunId !== null) {
    throw new Error("taskRun.address for an AgentTeam target contains a task Agent run ID.");
  }
  if (address.taskTeamRunIds.length === 0) {
    throw new Error("taskRun.address for an AgentTeam target has no task TeamRun chain.");
  }
  if (new Set(address.taskTeamRunIds).size !== address.taskTeamRunIds.length) {
    throw new Error("taskRun.address contains a repeated task TeamRun ID.");
  }
  return Object.freeze({
    rootTeamRunId: address.rootTeamRunId,
    taskTeamRunIds: Object.freeze([...address.taskTeamRunIds]),
    teamAddress: address.memberAddress,
    sourceFilePath: input.filePath,
    taskId: input.taskId,
  });
};

const addEntry = (
  next: TokenUsageTaskTeamRunIndexEntry,
  entries: Map<string, TokenUsageTaskTeamRunIndexEntry>,
  seen: Map<string, TokenUsageTaskTeamRunIndexEntry>,
  issues: TokenUsageTaskTeamRunIndexIssue[],
): void => {
  const taskTeamRunId = next.taskTeamRunIds.at(-1)!;
  const previous = seen.get(taskTeamRunId);
  if (previous) {
    entries.delete(taskTeamRunId);
    issues.push({
      itemId: `task-team-run:${taskTeamRunId}`,
      filePath: next.sourceFilePath,
      message: sameMapping(previous, next)
        ? `Duplicate task TeamRun mapping '${taskTeamRunId}' appears in tasks '${previous.taskId}' and '${next.taskId}'.`
        : `Conflicting task TeamRun mapping '${taskTeamRunId}' appears in tasks '${previous.taskId}' and '${next.taskId}'.`,
    });
    return;
  }
  seen.set(taskTeamRunId, next);
  entries.set(taskTeamRunId, next);
};

const indexPredecessorState = async (
  state: Extract<TeamRunMigrationState, { kind: "PREDECESSOR" }>,
  sourceResolver: TeamRunPredecessorSourceResolver,
  entries: Map<string, TokenUsageTaskTeamRunIndexEntry>,
  seen: Map<string, TokenUsageTaskTeamRunIndexEntry>,
  issues: TokenUsageTaskTeamRunIndexIssue[],
): Promise<void> => {
  let filePath = path.join(state.rootDir, "task_delegation_records.json");
  let raw: unknown;
  try {
    const sources = await sourceResolver.resolve(state.rootTeamRunId, state.rootDir);
    filePath = sources.taskRecordsPath;
    raw = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  } catch (error) {
    if (missing(error)) return;
    issues.push({
      itemId: `task-records:${state.rootTeamRunId}`,
      filePath,
      message: `Cannot read predecessor task records: ${errorMessage(error)}`,
    });
    return;
  }

  try {
    const recordsFile = normalizePredecessorTaskDelegationRecordsFile(raw, {
      teamRunId: state.rootTeamRunId,
    });
    for (const record of recordsFile.records) {
      if (record.receiverTargetKind !== "agent_team") continue;
      if (!record.taskRun) {
        issues.push({
          itemId: `task-record:${recordsFile.teamRunId}:${record.taskId}`,
          filePath,
          message: `AgentTeam task '${record.taskId}' has no taskRun address, so its task TeamRun mapping is missing.`,
        });
        continue;
      }
      try {
        addEntry(predecessorTaskTeamEntry({
          rootTeamRunId: recordsFile.teamRunId,
          filePath,
          taskId: record.taskId,
          address: record.taskRun.address,
        }), entries, seen, issues);
      } catch (error) {
        issues.push({
          itemId: `task-record:${recordsFile.teamRunId}:${record.taskId}`,
          filePath,
          message: `Invalid task TeamRun mapping for task '${record.taskId}': ${errorMessage(error)}`,
        });
      }
    }
  } catch (error) {
    issues.push({
      itemId: `task-records:${state.rootTeamRunId}`,
      filePath,
      message: `Predecessor task records are invalid: ${errorMessage(error)}`,
    });
  }
};

const indexCurrentState = (
  state: Extract<TeamRunMigrationState, { kind: "CURRENT_V1" }>,
  entries: Map<string, TokenUsageTaskTeamRunIndexEntry>,
  seen: Map<string, TokenUsageTaskTeamRunIndexEntry>,
  issues: TokenUsageTaskTeamRunIndexIssue[],
): void => {
  const sourceFilePath = path.join(state.rootDir, "task_delegation_records.json");
  for (const record of state.package.taskRecords.records) {
    const execution = state.package.index.getTaskExecution(record.taskExecution);
    if (execution?.kind !== "team") continue;
    const indexedTeam = state.package.index.requireTeam(execution.teamRunId);
    const taskTeamRunIds = [...state.package.index.listTeamAncestorsDeepestFirst(
      execution.teamRunId,
    )]
      .reverse()
      .filter((team) => team.executionKind === "task")
      .map((team) => team.teamRunId);
    addEntry(Object.freeze({
      rootTeamRunId: state.package.index.rootTeamRunId,
      taskTeamRunIds: Object.freeze(taskTeamRunIds),
      teamAddress: indexedTeam.address,
      sourceFilePath,
      taskId: record.taskId,
    }), entries, seen, issues);
  }
};

export const buildTokenUsageTaskTeamRunIndex = async (
  memoryDir: string,
  sourceResolver: TeamRunPredecessorSourceResolver,
  classifier: TeamRunMigrationStateClassifier = new TeamRunMigrationStateClassifier(memoryDir),
): Promise<TokenUsageTaskTeamRunIndex> => {
  const entries = new Map<string, TokenUsageTaskTeamRunIndexEntry>();
  const seen = new Map<string, TokenUsageTaskTeamRunIndexEntry>();
  const issues: TokenUsageTaskTeamRunIndexIssue[] = [];

  for (const state of await classifier.listAndClassifyRoots()) {
    if (state.kind === "HISTORICAL_RESIDUE") continue;
    if (state.kind === "INVALID") {
      issues.push({
        itemId: `team-root:${state.rootTeamRunId}`,
        filePath: state.evidencePath,
        message: `TeamRun root classification failed: ${state.reason}`,
      });
      continue;
    }
    if (state.kind === "PREDECESSOR") {
      await indexPredecessorState(state, sourceResolver, entries, seen, issues);
    } else {
      indexCurrentState(state, entries, seen, issues);
    }
  }

  for (const [taskTeamRunId, entry] of entries) {
    for (let index = 0; index < entry.taskTeamRunIds.length - 1; index += 1) {
      const ancestorId = entry.taskTeamRunIds[index]!;
      const ancestor = entries.get(ancestorId);
      const expectedChain = entry.taskTeamRunIds.slice(0, index + 1);
      if (!ancestor) {
        issues.push({
          itemId: `task-team-run:${taskTeamRunId}`,
          filePath: entry.sourceFilePath,
          message: `Task TeamRun '${taskTeamRunId}' is missing the required ancestor mapping '${ancestorId}'.`,
        });
        continue;
      }
      if (
        ancestor.rootTeamRunId !== entry.rootTeamRunId
        || JSON.stringify(ancestor.taskTeamRunIds) !== JSON.stringify(expectedChain)
        || !isAgentTeamAddressAncestor(ancestor.teamAddress, entry.teamAddress)
      ) {
        issues.push({
          itemId: `task-team-run:${taskTeamRunId}`,
          filePath: entry.sourceFilePath,
          message: `Task TeamRun '${taskTeamRunId}' conflicts with ancestor mapping '${ancestorId}' in its ordered chain.`,
        });
      }
    }
  }

  return Object.freeze({ entries, issues: Object.freeze(issues) });
};
