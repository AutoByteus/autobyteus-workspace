import { getParentAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { StandaloneRootTreeFile } from "../domain/standalone-root-tree.js";
import {
  canonicalNonRootAddress,
  deepFreeze,
  isoTimestamp,
  collectTaskExecutionRunIds,
  objectRecord,
  parseRemoteTaskAgentExecutions,
  parseTaskExecutions,
  requiredString,
  requireKeys,
  validateCopyLayouts,
  validateRemoteTaskAgentExecutions,
  validateTaskExecutionDelegators,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";

const validateInvariants = (tree: StandaloneRootTreeFile): void => {
  if (getParentAgentTeamAddress(tree.host.address) !== "/") {
    throw new Error("host.address must be a root-level address.");
  }
  validateCopyLayouts([tree]);
  validateTaskExecutionDelegators(
    [tree.host.agentRunId],
    [{ members: [], taskExecutions: tree.taskExecutions }],
  );
  validateRemoteTaskAgentExecutions(
    new Set([tree.host.agentRunId, ...collectTaskExecutionRunIds(tree.taskExecutions)]), tree.remoteTaskExecutions);
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
    taskExecutions: parseTaskExecutions(payload.taskExecutions, "taskExecutions"),
    remoteTaskExecutions: parseRemoteTaskAgentExecutions(payload.remoteTaskExecutions, "remoteTaskExecutions"),
  };
  if (expectedHostRunId && tree.host.agentRunId !== expectedHostRunId) {
    throw new Error(`Collaboration tree host '${tree.host.agentRunId}' does not match '${expectedHostRunId}'.`);
  }
  validateInvariants(tree);
  return deepFreeze(tree);
};
