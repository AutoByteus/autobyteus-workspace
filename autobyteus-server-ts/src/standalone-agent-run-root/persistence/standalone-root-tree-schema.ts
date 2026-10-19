import { getParentAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { StandaloneRootTreeFile } from "../domain/standalone-root-tree.js";
import {
  canonicalNonRootAddress,
  deepFreeze,
  isoTimestamp,
  objectRecord,
  parseTaskExecutions,
  requiredString,
  requireKeys,
  validateCatalogCopyLayouts,
  validateTaskExecutionDelegators,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";

const validateInvariants = (tree: StandaloneRootTreeFile): void => {
  if (getParentAgentTeamAddress(tree.host.address) !== "/") {
    throw new Error("host.address must be a root-level address.");
  }
  for (const task of tree.taskExecutions) {
    // An Agent root has no configured placement besides its host: every copy carries its catalog source.
    if (!task.source) throw new Error(`Task execution at '${task.address}' has no catalog source.`);
  }
  validateCatalogCopyLayouts([tree]);
  validateTaskExecutionDelegators(
    [tree.host.agentRunId],
    [{ members: [], taskExecutions: tree.taskExecutions }],
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
    taskExecutions: parseTaskExecutions(payload.taskExecutions, "taskExecutions"),
  };
  if (expectedHostRunId && tree.host.agentRunId !== expectedHostRunId) {
    throw new Error(`Collaboration tree host '${tree.host.agentRunId}' does not match '${expectedHostRunId}'.`);
  }
  validateInvariants(tree);
  return deepFreeze(tree);
};
