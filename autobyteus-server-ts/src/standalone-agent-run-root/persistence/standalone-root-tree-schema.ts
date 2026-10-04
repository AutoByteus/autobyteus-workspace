import { getParentAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { validateCollaborationCommunicationMessageArrayV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1-schema.js";
import type {
  StandaloneRootMessagesFileV1,
  StandaloneRootTreeFile,
} from "../domain/standalone-root-tree.js";
import { listCollaboratorAgentRunIds } from "../../run-history/domain/run-execution-tree-shared-records.js";
import {
  canonicalNonRootAddress,
  deepFreeze,
  isoTimestamp,
  objectRecord,
  parseCollaborators,
  parseTaskExecutions,
  requiredString,
  requireKeys,
  validateCollaboratorInvariants,
  validateTaskExecutionDelegators,
  collaboratorTaskOwners,
  collectTaskExecutionRunIds,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";

const validateInvariants = (tree: StandaloneRootTreeFile): void => {
  if (getParentAgentTeamAddress(tree.host.address) !== "/") {
    throw new Error("host.address must be a root-level address.");
  }
  const collaboratorAddresses = new Set(tree.collaborators.map((entry) => entry.address));
  for (const task of tree.taskExecutions) {
    // A catalog copy carries its own source; every other copy is an extra copy of a collaborator.
    if (!task.source && !collaboratorAddresses.has(task.address)) {
      throw new Error(`Task execution at '${task.address}' is not a collaborator or catalog copy of this Agent run.`);
    }
  }
  validateCollaboratorInvariants({
    collaborators: tree.collaborators,
    reservedAddresses: [tree.host.address],
    otherRunIds: [tree.host.agentRunId, ...collectTaskExecutionRunIds(tree.taskExecutions)],
    owners: [tree],
  });
  validateTaskExecutionDelegators(
    [tree.host.agentRunId, ...listCollaboratorAgentRunIds(tree.collaborators)],
    [{ members: [], taskExecutions: tree.taskExecutions }, ...collaboratorTaskOwners(tree.collaborators)],
  );
};

/** Reads an Agent-root collaboration tree tolerantly; the result holds only current fields. */
export const validateStandaloneRootTreePayload = (
  value: unknown,
  expectedHostRunId?: string,
): StandaloneRootTreeFile => {
  const payload = objectRecord(value, "Agent run collaboration tree");
  requireKeys(payload, ["subjectKind", "createdAt", "host", "taskExecutions"], "Agent run collaboration tree");
  if (payload.subjectKind !== "agent") throw new Error("Agent run collaboration tree subjectKind must be 'agent'.");
  const host = objectRecord(payload.host, "host");
  requireKeys(host, ["address", "agentRunId", "agentDefinitionId"], "host");
  const tree: StandaloneRootTreeFile = {
    subjectKind: "agent",
    createdAt: isoTimestamp(payload.createdAt, "createdAt"),
    host: {
      address: canonicalNonRootAddress(host.address, "host.address"),
      agentRunId: requiredString(host.agentRunId, "host.agentRunId"),
      agentDefinitionId: requiredString(host.agentDefinitionId, "host.agentDefinitionId"),
    },
    collaborators: parseCollaborators(payload.collaborators, "collaborators"),
    taskExecutions: parseTaskExecutions(payload.taskExecutions, "taskExecutions"),
  };
  if (expectedHostRunId && tree.host.agentRunId !== expectedHostRunId) {
    throw new Error(`Collaboration tree host '${tree.host.agentRunId}' does not match '${expectedHostRunId}'.`);
  }
  validateInvariants(tree);
  return deepFreeze(tree);
};

export const validateStandaloneRootMessagesV1 = (
  value: unknown,
  expectedHostRunId?: string,
): StandaloneRootMessagesFileV1 => {
  const payload = objectRecord(value, "Agent run collaboration messages");
  const actual = Object.keys(payload).sort();
  const expected = ["hostRunId", "messages", "schemaVersion", "subjectKind"];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error("Agent run collaboration messages has unsupported or missing field(s).");
  }
  if (payload.schemaVersion !== 1 || payload.subjectKind !== "agent") {
    throw new Error("Agent run collaboration messages requires schemaVersion 1 and subjectKind 'agent'.");
  }
  const hostRunId = requiredString(payload.hostRunId, "hostRunId");
  if (expectedHostRunId && hostRunId !== expectedHostRunId) {
    throw new Error(`Collaboration messages host '${hostRunId}' does not match '${expectedHostRunId}'.`);
  }
  return Object.freeze({
    schemaVersion: 1,
    subjectKind: "agent",
    hostRunId,
    messages: validateCollaborationCommunicationMessageArrayV1(payload.messages),
  });
};
