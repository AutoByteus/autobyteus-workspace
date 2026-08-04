import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "../../run-history/services/team-run-metadata-service.js";
import { normalizeTeamCommunicationProjection } from "./team-communication-normalizer.js";
import {
  TeamCommunicationProjectionStore,
  getTeamCommunicationProjectionStore,
} from "./team-communication-projection-store.js";
import {
  TeamCommunicationService,
  getTeamCommunicationService,
} from "./team-communication-service.js";
import type {
  TeamCommunicationMessage,
  TeamCommunicationProjection,
  TeamCommunicationReferenceFile,
} from "./team-communication-types.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export class TeamCommunicationProjectionService {
  private readonly teamRunManager: AgentTeamRunManager;
  private readonly metadataService: TeamRunMetadataService;
  private readonly projectionStore: TeamCommunicationProjectionStore;
  private readonly activeCommunicationService: TeamCommunicationService;
  private readonly teamLayout: AgentMemoryLayout;

  constructor(options: {
    teamRunManager?: AgentTeamRunManager;
    metadataService?: TeamRunMetadataService;
    projectionStore?: TeamCommunicationProjectionStore;
    activeCommunicationService?: TeamCommunicationService;
    memoryDir?: string;
  } = {}) {
    this.teamRunManager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.metadataService = options.metadataService ?? getTeamRunMetadataService();
    this.projectionStore = options.projectionStore ?? getTeamCommunicationProjectionStore();
    this.activeCommunicationService = options.activeCommunicationService ?? getTeamCommunicationService();
    this.teamLayout = new AgentMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  async getTeamCommunicationMessages(teamRunId: string): Promise<TeamCommunicationMessage[]> {
    const projection = await this.readProjection(teamRunId);
    return projection.messages;
  }

  async resolveReference(input: {
    teamRunId: string;
    messageId: string;
    referenceId: string;
  }): Promise<{ message: TeamCommunicationMessage; reference: TeamCommunicationReferenceFile } | null> {
    const messageId = normalizeRequiredString(input.messageId, "messageId");
    const referenceId = normalizeRequiredString(input.referenceId, "referenceId");
    const projection = await this.readProjection(input.teamRunId);
    const message = projection.messages.find((entry) => entry.messageId === messageId) ?? null;
    if (!message) {
      return null;
    }
    const reference = message.referenceFiles.find((entry) => entry.referenceId === referenceId) ?? null;
    return reference ? { message, reference } : null;
  }

  private async readProjection(teamRunId: string): Promise<TeamCommunicationProjection> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");

    const activeRun = this.teamRunManager.getTeamRun(normalizedTeamRunId);
    if (activeRun) {
      return this.activeCommunicationService.getProjectionForTeamRun(activeRun);
    }

    const metadata = await this.metadataService.readMetadata(normalizedTeamRunId);
    if (!metadata) {
      return { teamRunId: normalizedTeamRunId, messages: [] };
    }

    return normalizeTeamCommunicationProjection(
      await this.projectionStore.readProjection(
        this.teamLayout.getTeamDirPath({ rootTeamRunId: normalizedTeamRunId, ancestorTeamRunIds: [] }),
      ),
      { teamRunId: normalizedTeamRunId },
    );
  }
}

let cachedProjectionService: TeamCommunicationProjectionService | null = null;

export const getTeamCommunicationProjectionService = (): TeamCommunicationProjectionService => {
  if (!cachedProjectionService) {
    cachedProjectionService = new TeamCommunicationProjectionService();
  }
  return cachedProjectionService;
};
