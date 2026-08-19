import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentMemoryService } from "../../agent-memory/services/agent-memory-service.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import {
  getTeamRunService,
  type TeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";

export type ResolveChannelTurnReplyInput = {
  agentRunId: string;
  rootTeamRunId?: string | null;
  turnId: string;
};

/**
 * Recovers one accepted external-channel turn from the exact AgentRun memory.
 * Team placement is derived from the current root execution tree; no composite
 * execution identity or predecessor metadata participates in this boundary.
 */
export class ChannelTurnReplyRecoveryService {
  private readonly memoryDir: string;
  private readonly memoryLayout: AgentMemoryLayout;
  private readonly teamRuns: Pick<TeamRunService, "resolveManagedTeamRun">;

  constructor(
    memoryDir: string = appConfigProvider.config.getMemoryDir(),
    teamRuns: Pick<TeamRunService, "resolveManagedTeamRun"> = getTeamRunService(),
  ) {
    this.memoryDir = memoryDir;
    this.memoryLayout = new AgentMemoryLayout(memoryDir);
    this.teamRuns = teamRuns;
  }

  async resolveReplyText(input: ResolveChannelTurnReplyInput): Promise<string | null> {
    const agentRunId = normalizeRequiredString(input.agentRunId, "agentRunId");
    const turnId = normalizeRequiredString(input.turnId, "turnId");
    const rootTeamRunId = normalizeOptionalString(input.rootTeamRunId ?? null);
    const memoryDir = rootTeamRunId
      ? await this.resolveTeamAgentMemoryDir(rootTeamRunId, agentRunId)
      : this.memoryLayout.getStandaloneRunDirPath(agentRunId);
    if (!memoryDir) return null;
    const traces = this.readRawTraces(memoryDir, agentRunId);
    return mergeAssistantTraceText(
      traces.filter(
        (trace) => trace.traceType === "assistant" && trace.turnId === turnId &&
          typeof trace.content === "string" && trace.content.length > 0,
      ),
    );
  }

  private async resolveTeamAgentMemoryDir(
    rootTeamRunId: string,
    agentRunId: string,
  ): Promise<string | null> {
    const root = await this.teamRuns.resolveManagedTeamRun(rootTeamRunId);
    const execution = root?.getAgentExecution(agentRunId) ?? null;
    if (!execution) return null;
    return this.memoryLayout.getTeamAgentRunDirPath({
      rootTeamRunId,
      ancestorTeamRunIds: [...execution.ancestorTeamRunIds],
    }, agentRunId);
  }

  private readRawTraces(memoryDir: string, agentRunId: string): MemoryTraceEvent[] {
    const store = new MemoryFileStore(path.dirname(memoryDir), {
      runRootSubdir: "",
      warnOnMissingFiles: false,
    });
    const memoryService = new AgentMemoryService(store);
    return memoryService.getRunMemoryView(path.basename(memoryDir) || agentRunId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeRawTraces: true,
      includeArchive: true,
    }).rawTraces ?? [];
  }
}

let cachedChannelTurnReplyRecoveryService: ChannelTurnReplyRecoveryService | null = null;

export const getChannelTurnReplyRecoveryService = (): ChannelTurnReplyRecoveryService => {
  if (!cachedChannelTurnReplyRecoveryService) {
    cachedChannelTurnReplyRecoveryService = new ChannelTurnReplyRecoveryService();
  }
  return cachedChannelTurnReplyRecoveryService;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must be a non-empty string.`);
  return normalized;
};

const normalizeOptionalString = (value: string | null): string | null => {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const mergeAssistantTraceText = (traces: MemoryTraceEvent[]): string | null => {
  let merged = "";
  for (const trace of traces) {
    const content = trace.content ?? "";
    if (content.length === 0) continue;
    merged += content;
  }
  return merged.length > 0 ? merged : null;
};
