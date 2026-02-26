import type { MemoryConversationEntry } from "../../agent-memory-view/domain/models.js";
import { AgentMemoryViewService } from "../../agent-memory-view/services/agent-memory-view-service.js";
import { MemoryFileStore } from "../../agent-memory-view/store/memory-file-store.js";
import { appConfigProvider } from "../../config/app-config-provider.js";

export interface RunProjection {
  runId: string;
  conversation: MemoryConversationEntry[];
  summary: string | null;
  lastActivityAt: string | null;
}

const toIsoString = (ts?: number | null): string | null => {
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) {
    return null;
  }
  return new Date(ts * 1000).toISOString();
};

const compactSummary = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= 100) {
    return trimmed;
  }
  return `${trimmed.slice(0, 97)}...`;
};

export class RunProjectionService {
  private memoryViewService: AgentMemoryViewService;

  constructor(memoryDir: string) {
    const store = new MemoryFileStore(memoryDir);
    this.memoryViewService = new AgentMemoryViewService(store);
  }

  getProjection(runId: string): RunProjection {
    const view = this.memoryViewService.getRunMemoryView(runId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeConversation: true,
      includeRawTraces: false,
      includeArchive: true,
    });
    const conversation = view.conversation ?? [];
    const firstUser = conversation.find((entry) => entry.role === "user" && entry.content);
    const lastEntry = conversation.length > 0 ? conversation[conversation.length - 1] : null;

    return {
      runId,
      conversation,
      summary: compactSummary(firstUser?.content ?? null),
      lastActivityAt: toIsoString(lastEntry?.ts ?? null),
    };
  }
}

let cachedRunProjectionService: RunProjectionService | null = null;

export const getRunProjectionService = (): RunProjectionService => {
  if (!cachedRunProjectionService) {
    cachedRunProjectionService = new RunProjectionService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedRunProjectionService;
};
