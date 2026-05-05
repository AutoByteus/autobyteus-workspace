import type { AgentRunMessageFileReferencePayload } from "../../agent-execution/domain/agent-run-message-file-reference.js";

export type {
  AgentRunMessageFileReferenceArtifactType as MessageFileReferenceArtifactType,
} from "../../agent-execution/domain/agent-run-message-file-reference.js";

export interface MessageFileReferenceEntry extends AgentRunMessageFileReferencePayload {}

export interface MessageFileReferenceProjection {
  version: 1;
  entries: MessageFileReferenceEntry[];
}

export const EMPTY_MESSAGE_FILE_REFERENCE_PROJECTION: MessageFileReferenceProjection = {
  version: 1,
  entries: [],
};
