import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryService } from "../../agent-memory/services/agent-memory-service.js";
import { AgentMemoryLocationService } from "../../agent-memory/services/agent-memory-location-service.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import {
  TeamRunMetadataService,
} from "../../run-history/services/team-run-metadata-service.js";
import type { TeamMemberAgentMemoryLocation } from "../../agent-memory/domain/agent-memory-location.js";

export type ResolveChannelTurnReplyInput = {
  agentRunId: string;
  turnId: string;
  teamRunId?: string | null;
};

export class ChannelTurnReplyRecoveryService {
  private readonly memoryDir: string;
  private readonly teamMetadataService: TeamRunMetadataService;
  private readonly memoryLocationService: AgentMemoryLocationService;

  constructor(memoryDir: string = appConfigProvider.config.getMemoryDir()) {
    this.memoryDir = memoryDir;
    this.teamMetadataService = new TeamRunMetadataService(memoryDir);
    this.memoryLocationService = new AgentMemoryLocationService({ memoryDir });
  }

  async resolveReplyText(
    input: ResolveChannelTurnReplyInput,
  ): Promise<string | null> {
    const agentRunId = normalizeRequiredString(input.agentRunId, "agentRunId");
    const turnId = normalizeRequiredString(input.turnId, "turnId");
    const teamRunId = normalizeOptionalString(input.teamRunId ?? null);
    const traces = await this.readRawTraces(agentRunId, teamRunId);
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

  private async readRawTraces(
    agentRunId: string,
    teamRunId: string | null,
  ): Promise<MemoryTraceEvent[]> {
    const teamTarget = teamRunId
      ? await this.resolveTeamMemberMemoryTarget(teamRunId, agentRunId)
      : null;
    if (teamRunId && !teamTarget) {
      return [];
    }
    const store = teamTarget
      ? new MemoryFileStore(path.dirname(teamTarget.memoryDir), {
          runRootSubdir: "",
          warnOnMissingFiles: false,
        })
      : new MemoryFileStore(this.memoryDir, {
          warnOnMissingFiles: false,
        });
    const runId = teamTarget ? path.basename(teamTarget.memoryDir) : agentRunId;
    const memoryService = new AgentMemoryService(store);
    return (
      memoryService.getRunMemoryView(runId, {
        includeWorkingContext: false,
        includeEpisodic: false,
        includeSemantic: false,
        includeRawTraces: true,
        includeArchive: true,
      }).rawTraces ?? []
    );
  }

  private async resolveTeamMemberMemoryTarget(
    teamRunId: string,
    agentRunId: string,
  ): Promise<TeamMemberAgentMemoryLocation | null> {
    const directMetadata = await this.teamMetadataService.readMetadata(teamRunId);
    const directTarget = directMetadata
      ? this.memoryLocationService.resolveTeamMemberLocationFromMetadata(
          directMetadata,
          { memberRunId: agentRunId },
          teamRunId,
        )
      : null;
    if (directTarget) {
      return directTarget;
    }

    for (const storedTeamRunId of await this.teamMetadataService.listTeamRunIds()) {
      if (storedTeamRunId === teamRunId) {
        continue;
      }
      const metadata = await this.teamMetadataService.readMetadata(storedTeamRunId);
      const target = metadata
        ? this.memoryLocationService.resolveTeamMemberLocationFromMetadata(
            metadata,
            { memberRunId: agentRunId },
            teamRunId,
          )
        : null;
      if (target) {
        return target;
      }
    }
    return null;
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
