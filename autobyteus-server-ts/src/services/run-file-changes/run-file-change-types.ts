import type { AgentRunFileChangePayload } from "../../agent-execution/domain/agent-run-file-change.js";

export type {
  AgentRunFileChangeStatus as RunFileChangeStatus,
  AgentRunFileChangeSourceTool as RunFileChangeSourceTool,
  AgentRunFileChangeArtifactType as RunFileChangeArtifactType,
} from "../../agent-execution/domain/agent-run-file-change.js";

export {
  normalizeAgentRunFileChangePath as normalizeRunFileChangePath,
  buildAgentRunFileChangeId as buildRunFileChangeId,
  buildInvocationAliases,
  invocationIdsMatch,
} from "../../agent-execution/domain/agent-run-file-change.js";

export interface RunFileChangeEntry extends AgentRunFileChangePayload {}

export interface RunFileChangeProjection {
  version: 2;
  entries: RunFileChangeEntry[];
}

export interface RunFileChangeLivePayload extends RunFileChangeEntry {}

export const EMPTY_RUN_FILE_CHANGE_PROJECTION: RunFileChangeProjection = {
  version: 2,
  entries: [],
};
