import type { MemoryConversationEntry } from "../../agent-memory-view/domain/models.js";

export interface RunProjection {
  runId: string;
  conversation: MemoryConversationEntry[];
  summary: string | null;
  lastActivityAt: string | null;
}
