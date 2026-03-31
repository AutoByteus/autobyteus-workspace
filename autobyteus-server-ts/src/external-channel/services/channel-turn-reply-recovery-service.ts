import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryService } from "../../agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";

export type ResolveChannelTurnReplyInput = {
  agentRunId: string;
  turnId: string;
  teamRunId?: string | null;
};

export class ChannelTurnReplyRecoveryService {
  private readonly memoryDir: string;
  private readonly teamMemberLayout: TeamMemberMemoryLayout;

  constructor(memoryDir: string = appConfigProvider.config.getMemoryDir()) {
    this.memoryDir = memoryDir;
    this.teamMemberLayout = new TeamMemberMemoryLayout(memoryDir);
  }

  async resolveReplyText(
    input: ResolveChannelTurnReplyInput,
  ): Promise<string | null> {
    const agentRunId = normalizeRequiredString(input.agentRunId, "agentRunId");
    const turnId = normalizeRequiredString(input.turnId, "turnId");
    const teamRunId = normalizeOptionalString(input.teamRunId ?? null);
    const traces = this.readRawTraces(agentRunId, teamRunId);
    return mergeAssistantTraceText(
      traces.filter(
        (trace) =>
          trace.traceType === "assistant" &&
          trace.turnId === turnId &&
          typeof trace.content === "string" &&
          trace.content.trim().length > 0,
      ),
    );
  }

  private readRawTraces(
    agentRunId: string,
    teamRunId: string | null,
  ): MemoryTraceEvent[] {
    const store = teamRunId
      ? new MemoryFileStore(this.teamMemberLayout.getTeamDirPath(teamRunId), {
          runRootSubdir: "",
          warnOnMissingFiles: false,
        })
      : new MemoryFileStore(this.memoryDir, {
          warnOnMissingFiles: false,
        });
    const memoryService = new AgentMemoryService(store);
    return (
      memoryService.getRunMemoryView(agentRunId, {
        includeWorkingContext: false,
        includeEpisodic: false,
        includeSemantic: false,
        includeConversation: false,
        includeRawTraces: true,
        includeArchive: true,
      }).rawTraces ?? []
    );
  }
}

let cachedChannelTurnReplyRecoveryService: ChannelTurnReplyRecoveryService | null = null;

export const getChannelTurnReplyRecoveryService =
  (): ChannelTurnReplyRecoveryService => {
    if (!cachedChannelTurnReplyRecoveryService) {
      cachedChannelTurnReplyRecoveryService = new ChannelTurnReplyRecoveryService();
    }
    return cachedChannelTurnReplyRecoveryService;
  };

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const mergeAssistantTraceText = (traces: MemoryTraceEvent[]): string | null => {
  let merged = "";
  for (const trace of traces) {
    const content = normalizeOptionalString(trace.content ?? null);
    if (!content) {
      continue;
    }
    if (!merged) {
      merged = content;
      continue;
    }
    if (content === merged) {
      continue;
    }
    if (content.startsWith(merged)) {
      merged = content;
      continue;
    }
    if (merged.startsWith(content)) {
      continue;
    }
    merged = `${merged}${content}`;
  }

  return normalizeOptionalString(merged);
};
