import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "../../run-history/services/team-run-metadata-service.js";
import {
  normalizeMessageFileReferenceProjection,
} from "./message-file-reference-normalizer.js";
import {
  MessageFileReferenceProjectionStore,
  getMessageFileReferenceProjectionStore,
} from "./message-file-reference-projection-store.js";
import {
  MessageFileReferenceService,
  getMessageFileReferenceService,
} from "./message-file-reference-service.js";
import type { MessageFileReferenceEntry } from "./message-file-reference-types.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export class MessageFileReferenceProjectionService {
  private readonly teamRunManager: AgentTeamRunManager;
  private readonly metadataService: TeamRunMetadataService;
  private readonly projectionStore: MessageFileReferenceProjectionStore;
  private readonly activeReferenceService: MessageFileReferenceService;
  private readonly teamLayout: TeamMemberMemoryLayout;

  constructor(options: {
    teamRunManager?: AgentTeamRunManager;
    metadataService?: TeamRunMetadataService;
    projectionStore?: MessageFileReferenceProjectionStore;
    activeReferenceService?: MessageFileReferenceService;
    memoryDir?: string;
  } = {}) {
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.metadataService = options.metadataService ?? getTeamRunMetadataService();
    this.projectionStore = options.projectionStore ?? getMessageFileReferenceProjectionStore();
    this.activeReferenceService = options.activeReferenceService ?? getMessageFileReferenceService();
    this.teamLayout = new TeamMemberMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  async getMessageFileReferences(teamRunId: string): Promise<MessageFileReferenceEntry[]> {
    const projection = await this.readProjection(teamRunId);
    return projection.entries;
  }

  async resolveReference(input: {
    teamRunId: string;
    referenceId: string;
  }): Promise<MessageFileReferenceEntry | null> {
    const referenceId = normalizeRequiredString(input.referenceId, "referenceId");
    const projection = await this.readProjection(input.teamRunId);
    return projection.entries.find((entry) => entry.referenceId === referenceId) ?? null;
  }

  private async readProjection(teamRunId: string) {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");

    const activeRun = this.teamRunManager.getTeamRun(normalizedTeamRunId);
    if (activeRun) {
      return this.activeReferenceService.getProjectionForTeamRun(activeRun);
    }

    const metadata = await this.metadataService.readMetadata(normalizedTeamRunId);
    if (!metadata) {
      return { version: 1 as const, entries: [] };
    }

    return normalizeMessageFileReferenceProjection(
      await this.projectionStore.readProjection(
        this.teamLayout.getTeamDirPath(normalizedTeamRunId),
      ),
      { teamRunId: normalizedTeamRunId },
    );
  }
}

let cachedProjectionService: MessageFileReferenceProjectionService | null = null;

export const getMessageFileReferenceProjectionService = (): MessageFileReferenceProjectionService => {
  if (!cachedProjectionService) {
    cachedProjectionService = new MessageFileReferenceProjectionService();
  }
  return cachedProjectionService;
};
