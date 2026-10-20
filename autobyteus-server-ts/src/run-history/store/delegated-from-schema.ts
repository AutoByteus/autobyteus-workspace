import type { DelegatedFrom } from "./agent-run-metadata-types.js";
import { objectRecord, requiredString, requireKeys } from "./run-execution-tree-shared-record-schemas.js";
import { parseTaskAgentCoordinatingRun } from "./task-agent-own-file-schema.js";

/**
 * The `delegatedFrom` back-link of a standalone run started by a peer node (DEC-112), read with the exact
 * keys and written back exactly. A malformed section makes the run's file unreadable, so the run is left out
 * with a warning naming it and its file is never rewritten (DESIGN.md rule 7).
 */
export const parseDelegatedFrom = (value: unknown, label = "delegatedFrom"): DelegatedFrom => {
  const section = objectRecord(value, label);
  requireKeys(section, ["nodeId", "coordinatingRun", "delegatorAgentRunId"], label);
  return {
    nodeId: requiredString(section.nodeId, `${label}.nodeId`),
    coordinatingRun: parseTaskAgentCoordinatingRun(section.coordinatingRun, `${label}.coordinatingRun`),
    delegatorAgentRunId: requiredString(section.delegatorAgentRunId, `${label}.delegatorAgentRunId`),
  };
};
