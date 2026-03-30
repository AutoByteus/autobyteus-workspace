import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { MemoryConversationEntry } from "../../agent-memory/domain/models.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

export interface RunProjectionProviderInput {
  runId: string;
  runtimeKind: RuntimeKind;
  metadata: AgentRunMetadata | null;
}

export interface RunProjectionProvider {
  readonly runtimeKind?: RuntimeKind;
  buildProjection(input: RunProjectionProviderInput): Promise<RunProjection | null>;
}

export interface RunProjection {
  runId: string;
  conversation: MemoryConversationEntry[];
  summary: string | null;
  lastActivityAt: string | null;
}
