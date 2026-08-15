import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import {
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import {
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../legacy/team-execution-address.js";
import {
  TASK_DELEGATION_RECORDS_FILE_NAME,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import { normalizePredecessorTaskDelegationRecordsFile } from "../predecessor-task-delegation-records.js";

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

const listRecordFiles = async (memoryDir: string): Promise<Array<{
  rootTeamRunId: string;
  filePath: string;
}>> => {
  const teamsRoot = path.join(memoryDir, "agent_teams");
  let directories: Dirent[];
  try {
    directories = await fs.readdir(teamsRoot, { withFileTypes: true });
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
  return directories
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      rootTeamRunId: entry.name,
      filePath: path.join(teamsRoot, entry.name, TASK_DELEGATION_RECORDS_FILE_NAME),
    }))
    .sort((left, right) => left.rootTeamRunId.localeCompare(right.rootTeamRunId));
};

const sameMapping = (
  left: TokenUsageTaskTeamRunIndexEntry,
  right: TokenUsageTaskTeamRunIndexEntry,
): boolean => left.rootTeamRunId === right.rootTeamRunId
  && left.teamAddress === right.teamAddress
  && JSON.stringify(left.taskTeamRunIds) === JSON.stringify(right.taskTeamRunIds);

const taskTeamEntry = (input: {
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

export const buildTokenUsageTaskTeamRunIndex = async (
  memoryDir: string,
): Promise<TokenUsageTaskTeamRunIndex> => {
  const entries = new Map<string, TokenUsageTaskTeamRunIndexEntry>();
  const seen = new Map<string, TokenUsageTaskTeamRunIndexEntry>();
  const issues: TokenUsageTaskTeamRunIndexIssue[] = [];

  for (const candidate of await listRecordFiles(memoryDir)) {
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(candidate.filePath, "utf8")) as unknown;
    } catch (error) {
      if (missing(error)) continue;
      issues.push({
        itemId: `task-records:${candidate.rootTeamRunId}`,
        filePath: candidate.filePath,
        message: `Cannot read strict current task records: ${errorMessage(error)}`,
      });
      continue;
    }

    try {
      const recordsFile = normalizePredecessorTaskDelegationRecordsFile(raw, {
        teamRunId: candidate.rootTeamRunId,
      });
      for (const record of recordsFile.records) {
        if (record.receiverTargetKind !== "agent_team") continue;
        if (!record.taskRun) {
          issues.push({
            itemId: `task-record:${recordsFile.teamRunId}:${record.taskId}`,
            filePath: candidate.filePath,
            message: `AgentTeam task '${record.taskId}' has no taskRun address, so its task TeamRun mapping is missing.`,
          });
          continue;
        }
        let next: TokenUsageTaskTeamRunIndexEntry;
        try {
          next = taskTeamEntry({
            rootTeamRunId: recordsFile.teamRunId,
            filePath: candidate.filePath,
            taskId: record.taskId,
            address: record.taskRun.address,
          });
        } catch (error) {
          issues.push({
            itemId: `task-record:${recordsFile.teamRunId}:${record.taskId}`,
            filePath: candidate.filePath,
            message: `Invalid task TeamRun mapping for task '${record.taskId}': ${errorMessage(error)}`,
          });
          continue;
        }
        const taskTeamRunId = next.taskTeamRunIds.at(-1)!;
        const previous = seen.get(taskTeamRunId);
        if (previous) {
          entries.delete(taskTeamRunId);
          issues.push({
            itemId: `task-team-run:${taskTeamRunId}`,
            filePath: candidate.filePath,
            message: sameMapping(previous, next)
              ? `Duplicate task TeamRun mapping '${taskTeamRunId}' appears in tasks '${previous.taskId}' and '${next.taskId}'.`
              : `Conflicting task TeamRun mapping '${taskTeamRunId}' appears in tasks '${previous.taskId}' and '${next.taskId}' (${serializeTeamExecutionAddress(record.taskRun.address)}).`,
          });
          continue;
        }
        seen.set(taskTeamRunId, next);
        entries.set(taskTeamRunId, next);
      }
    } catch (error) {
      issues.push({
        itemId: `task-records:${candidate.rootTeamRunId}`,
        filePath: candidate.filePath,
        message: `Strict current task records are invalid: ${errorMessage(error)}`,
      });
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
