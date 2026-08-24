import { getParentAgentTeamAddress, isAgentTeamAddressAncestor, type AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type {
  ConfiguredTeamExecution,
  TaskExecution,
  TaskTeamMemberExecution,
  TeamRunExecutionTreeSnapshot,
} from "./team-run-execution-tree-v1-types.js";
import { TeamExecutionIndex } from "./team-execution-v1-index.js";
import { addTaskExecutionToTree } from "./team-run-execution-tree-v1-mutator.js";
import type { TaskDelegationRecordV1, TaskDelegationRecordsSnapshot, TaskUpdate } from "../../../agent-team-execution/task-delegation/task-delegation-record-v1.js";
import { validateTaskDelegationRecordsV1Payload } from "../../../agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import type { TeamCommunicationMessagesSnapshot } from "../../../services/team-communication/team-communication-v1-types.js";
import { validateTeamRunStatePackage } from "./team-run-state-package-v1-validator.js";
import {
  addressKey, array, object, parseAddress, referencePaths, text,
  type JsonRecord, type TokenExecutionEvidence,
} from "./predecessor-team-run-evidence.js";
import type { PredecessorPhysicalRunIndex } from "./predecessor-physical-run-index.js";
import { convertPredecessorTeamCommunication } from "./predecessor-team-communication-converter.js";

type ConversionState = {
  tree: TeamRunExecutionTreeSnapshot;
  tasks: TaskDelegationRecordV1[];
};

const status = (value: unknown): TaskDelegationRecordV1["status"] => {
  if (value === "active" || value === "awaiting_review" || value === "accepted") return value;
  throw new Error(`Unsupported predecessor task status '${String(value)}'.`);
};

const updateTimestamp = (updates: readonly TaskUpdate[], fallback: string): string =>
  updates.at(-1)?.createdAt ?? fallback;

const convertUpdates = (value: unknown, taskId: string): readonly TaskUpdate[] => Object.freeze(
  array(value, `task '${taskId}'.updates`).map((raw, index): TaskUpdate => {
    const update = object(raw, `task '${taskId}'.updates[${index}]`);
    const createdAt = text(update.createdAt, `task '${taskId}'.updates[${index}].createdAt`);
    if (update.kind === "submission") {
      return Object.freeze({
        submissionId: text(update.submissionId, `task '${taskId}'.updates[${index}].submissionId`),
        message: typeof update.content === "string" ? update.content : text(update.message, `task '${taskId}'.updates[${index}].message`),
        referenceFiles: referencePaths(update.referenceFiles),
        createdAt,
      });
    }
    if (update.kind === "review") {
      if (update.decision !== "accept" && update.decision !== "request_revision") {
        throw new Error(`task '${taskId}'.updates[${index}].decision is unsupported.`);
      }
      return Object.freeze({
        reviewId: text(update.reviewId, `task '${taskId}'.updates[${index}].reviewId`),
        reviewedSubmissionId: text(update.reviewedSubmissionId, `task '${taskId}'.updates[${index}].reviewedSubmissionId`),
        decision: update.decision,
        comment: typeof update.content === "string" ? update.content : typeof update.comment === "string" ? update.comment : null,
        referenceFiles: referencePaths(update.referenceFiles),
        createdAt,
      });
    }
    throw new Error(`task '${taskId}'.updates[${index}] has unsupported kind '${String(update.kind)}'.`);
  }),
);

const resolveAgentRunId = (
  address: ReturnType<typeof parseAddress>,
  index: TeamExecutionIndex,
  evidence: ReadonlyMap<string, TokenExecutionEvidence>,
): string => {
  if (address.rootTeamRunId !== index.rootTeamRunId) throw new Error("Predecessor address root does not match its package.");
  if (address.taskAgentRunId) return address.taskAgentRunId;
  if (!address.taskTeamRunIds.length) {
    const configured = index.getConfiguredPlacement(address.memberAddress);
    if (!configured || !("agentRunId" in configured)) {
      throw new Error(`Configured Agent '${address.memberAddress}' was not found.`);
    }
    return configured.agentRunId;
  }
  const found = evidence.get(addressKey(address));
  if (!found) {
    throw new Error(`Task-Team Agent '${address.memberAddress}' lacks exact token/run evidence.`);
  }
  return found.runId;
};

const configuredRelativeTeams = (
  index: TeamExecutionIndex,
  taskTeamAddress: AgentTeamAddress,
  memberAddress: AgentTeamAddress,
): readonly AgentTeamAddress[] => {
  if (!isAgentTeamAddressAncestor(taskTeamAddress, memberAddress) || taskTeamAddress === memberAddress) {
    throw new Error(`'${memberAddress}' is not inside task Team '${taskTeamAddress}'.`);
  }
  const configured = index.getConfiguredPlacement(memberAddress);
  if (!configured || !("agentRunId" in configured)) throw new Error(`'${memberAddress}' is not a configured Agent placement.`);
  const addresses: AgentTeamAddress[] = [];
  let parent = getParentAgentTeamAddress(memberAddress);
  while (parent !== taskTeamAddress) {
    if (parent === null || !isAgentTeamAddressAncestor(taskTeamAddress, parent)) {
      throw new Error(`Configured ancestry for '${memberAddress}' escapes '${taskTeamAddress}'.`);
    }
    addresses.unshift(parent);
    parent = getParentAgentTeamAddress(parent);
  }
  return Object.freeze(addresses);
};

const buildTaskTeamMembers = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  address: AgentTeamAddress;
  taskTeamRunIds: readonly string[];
  physical: PredecessorPhysicalRunIndex;
  evidence: ReadonlyMap<string, TokenExecutionEvidence>;
  live: boolean;
}): readonly TaskTeamMemberExecution[] => {
  const index = new TeamExecutionIndex(input.tree);
  const configured = index.getConfiguredPlacement(input.address);
  if (!configured || !("teamRunId" in configured)) throw new Error(`Task Team '${input.address}' is not configured.`);
  const currentTaskTeamRunId = input.taskTeamRunIds.at(-1)!;
  const runByAddress = new Map<AgentTeamAddress, string>();
  const physicalTeamByAddress = new Map<AgentTeamAddress, string>();
  for (const value of input.evidence.values()) {
    const address = value.address;
    if (address.rootTeamRunId !== index.rootTeamRunId || address.taskAgentRunId !== null ||
        JSON.stringify(address.taskTeamRunIds) !== JSON.stringify(input.taskTeamRunIds) ||
        !isAgentTeamAddressAncestor(input.address, address.memberAddress)) continue;
    const relative = input.physical.getRelativeSegments(value.runId);
    const taskRootIndex = relative?.lastIndexOf(currentTaskTeamRunId) ?? -1;
    if (!relative || taskRootIndex < 0 || relative.at(-1) !== value.runId) {
      throw new Error(`Task-Team AgentRun '${value.runId}' lacks matching physical task-root ancestry.`);
    }
    const physicalTeams = relative.slice(taskRootIndex + 1, -1);
    const logicalTeams = configuredRelativeTeams(index, input.address, address.memberAddress);
    if (physicalTeams.length !== logicalTeams.length) {
      throw new Error(`Physical and logical Team ancestry disagree for AgentRun '${value.runId}'.`);
    }
    logicalTeams.forEach((logical, position) => {
      const physical = physicalTeams[position]!;
      const prior = physicalTeamByAddress.get(logical);
      if (prior && prior !== physical) throw new Error(`Configured Team '${logical}' maps to two fresh TeamRun IDs.`);
      physicalTeamByAddress.set(logical, physical);
    });
    const priorRun = runByAddress.get(address.memberAddress);
    if (priorRun && priorRun !== value.runId) throw new Error(`Task-Team member '${address.memberAddress}' maps to two AgentRuns.`);
    runByAddress.set(address.memberAddress, value.runId);
  }

  const build = (source: ConfiguredTeamExecution): readonly TaskTeamMemberExecution[] => Object.freeze(
    source.members.flatMap((member): TaskTeamMemberExecution[] => {
      if ("agentRunId" in member) {
        const runId = runByAddress.get(member.address);
        return runId ? [{ address: member.address, agentRunId: runId, platformAgentRunId: null }] : [];
      }
      const runId = physicalTeamByAddress.get(member.address);
      return runId ? [{
        address: member.address,
        teamRunId: runId,
        members: build(member),
        taskExecutions: [],
      }] : [];
    }),
  );
  const members = build(configured);
  if (input.live && !members.some((member) =>
    "agentRunId" in member && member.address === configured.coordinatorAddress)) {
    throw new Error(`Live task Team '${currentTaskTeamRunId}' lacks exact coordinator AgentRun evidence.`);
  }
  return members;
};

const ownerFor = (
  index: TeamExecutionIndex,
  taskAddress: ReturnType<typeof parseAddress>,
  targetKind: "agent" | "agent_team",
): string => {
  if (targetKind === "agent" && taskAddress.taskTeamRunIds.length) return taskAddress.taskTeamRunIds.at(-1)!;
  if (targetKind === "agent_team" && taskAddress.taskTeamRunIds.length > 1) return taskAddress.taskTeamRunIds.at(-2)!;
  const configured = index.getConfiguredPlacement(taskAddress.memberAddress);
  if (!configured) throw new Error(`Task target '${taskAddress.memberAddress}' is not configured.`);
  const team = "agentRunId" in configured
    ? index.listContainingTeamAncestorsForAgent(configured.agentRunId)[0]
    : index.requireTeam(configured.teamRunId).parentTeamRunId
      ? index.requireTeam(index.requireTeam(configured.teamRunId).parentTeamRunId!)
      : null;
  if (!team) throw new Error(`Task target '${taskAddress.memberAddress}' has no containing TeamRun.`);
  return team.teamRunId;
};

const convertTask = (input: {
  raw: JsonRecord;
  state: ConversionState;
  evidence: ReadonlyMap<string, TokenExecutionEvidence>;
  physical: PredecessorPhysicalRunIndex;
}): ConversionState => {
  const taskId = text(input.raw.taskId, "task.taskId");
  const targetKind = input.raw.receiverTargetKind === "agent_team" ? "agent_team" : input.raw.receiverTargetKind === "agent" ? "agent" : null;
  if (!targetKind) throw new Error(`Task '${taskId}' has unsupported target kind.`);
  const taskRun = object(input.raw.taskRun, `task '${taskId}'.taskRun`);
  const taskAddress = parseAddress(taskRun.address, `task '${taskId}'.taskRun.address`);
  const senderAddress = parseAddress(input.raw.senderAddress, `task '${taskId}'.senderAddress`);
  const currentIndex = new TeamExecutionIndex(input.state.tree);
  const currentStatus = status(input.raw.status);
  const updates = convertUpdates(input.raw.updates, taskId);
  const settledAt = currentStatus === "accepted" ? updateTimestamp(updates, text(input.raw.createdAt, `task '${taskId}'.createdAt`)) : null;
  let execution: TaskExecution;
  let reference: TaskDelegationRecordV1["taskExecution"];
  if (targetKind === "agent") {
    if (!taskAddress.taskAgentRunId) throw new Error(`Agent task '${taskId}' lacks taskAgentRunId.`);
    execution = {
      address: taskAddress.memberAddress,
      agentRunId: taskAddress.taskAgentRunId,
      platformAgentRunId: null,
      startedAt: text(taskRun.startedAt, `task '${taskId}'.taskRun.startedAt`),
      settledAt,
    };
    reference = { agentRunId: taskAddress.taskAgentRunId };
  } else {
    const taskTeamRunId = taskAddress.taskTeamRunIds.at(-1);
    if (!taskTeamRunId || taskAddress.taskAgentRunId) throw new Error(`Team task '${taskId}' lacks an exact task TeamRun root.`);
    execution = {
      address: taskAddress.memberAddress,
      teamRunId: taskTeamRunId,
      members: buildTaskTeamMembers({
        tree: input.state.tree,
        address: taskAddress.memberAddress,
        taskTeamRunIds: taskAddress.taskTeamRunIds,
        physical: input.physical,
        evidence: input.evidence,
        live: currentStatus === "active" || currentStatus === "awaiting_review",
      }),
      taskExecutions: [],
      startedAt: text(taskRun.startedAt, `task '${taskId}'.taskRun.startedAt`),
      settledAt,
    };
    reference = { teamRunId: taskTeamRunId };
  }
  const nextTree = addTaskExecutionToTree({
    tree: input.state.tree,
    ownerTeamRunId: ownerFor(currentIndex, taskAddress, targetKind),
    execution,
  });
  const record: TaskDelegationRecordV1 = Object.freeze({
    taskId,
    delegatorAgentRunId: resolveAgentRunId(senderAddress, new TeamExecutionIndex(nextTree), input.evidence),
    recipientAddress: taskAddress.memberAddress,
    taskExecution: reference,
    description: typeof input.raw.content === "string" ? input.raw.content : text(input.raw.description, `task '${taskId}'.description`),
    referenceFiles: referencePaths(input.raw.referenceFiles),
    status: currentStatus,
    updates,
    createdAt: text(input.raw.createdAt, `task '${taskId}'.createdAt`),
  });
  return { tree: nextTree, tasks: [...input.state.tasks, record] };
};

export const convertPredecessorTeamPackageSubjects = (input: {
  rootTeamRunId: string;
  initialTree: TeamRunExecutionTreeSnapshot;
  taskFile: unknown | null;
  communicationFile: unknown | null;
  evidence: ReadonlyMap<string, TokenExecutionEvidence>;
  physical: PredecessorPhysicalRunIndex;
}): Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
  tasks: TaskDelegationRecordsSnapshot;
  messages: TeamCommunicationMessagesSnapshot;
}> => {
  const rawTasks = input.taskFile
    ? array(object(input.taskFile, "Task records").records, "Task records.records")
      .map((value) => object(value, "Task record"))
      .sort((left, right) => {
        const leftAddress = parseAddress(object(left.taskRun, "taskRun").address, "taskRun.address");
        const rightAddress = parseAddress(object(right.taskRun, "taskRun").address, "taskRun.address");
        return leftAddress.taskTeamRunIds.length - rightAddress.taskTeamRunIds.length ||
          text(left.createdAt, "createdAt").localeCompare(text(right.createdAt, "createdAt"));
      })
    : [];
  let state: ConversionState = { tree: input.initialTree, tasks: [] };
  for (const raw of rawTasks) state = convertTask({ raw, state, evidence: input.evidence, physical: input.physical });
  const tasks = validateTaskDelegationRecordsV1Payload({
    schemaVersion: 1,
    rootTeamRunId: input.rootTeamRunId,
    records: state.tasks,
  }, input.rootTeamRunId);
  const communication = convertPredecessorTeamCommunication({
    rootTeamRunId: input.rootTeamRunId,
    tree: state.tree,
    communicationFile: input.communicationFile,
    evidence: input.evidence,
  });
  const validated = validateTeamRunStatePackage({
    executionTree: state.tree,
    taskRecords: tasks,
    communicationMessages: communication,
  });
  return Object.freeze({
    tree: validated.executionTree,
    tasks: validated.taskRecords,
    messages: validated.communicationMessages,
  });
};
