import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamCommunicationV1Store } from "./team-communication-v1-store.js";
import type { TeamCommunicationMessageV1 } from "./team-communication-v1-types.js";
import type {
  TeamCommunicationMessage,
  TeamCommunicationProjection,
  TeamCommunicationReferenceFile,
  TeamCommunicationReferenceFileType,
} from "./team-communication-types.js";
import { projectTeamReferenceFile } from "../../agent-team-execution/services/team-reference-file-projection.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

/** Read-only API projection over the current V1 message authority. */
export class TeamCommunicationProjectionService {
  private readonly manager: AgentTeamRunManager;
  private readonly store: TeamCommunicationV1Store;
  private readonly layout: AgentMemoryLayout;

  constructor(options: {
    teamRunManager?: AgentTeamRunManager;
    communicationStore?: TeamCommunicationV1Store;
    memoryDir?: string;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.manager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.store = options.communicationStore ?? new TeamCommunicationV1Store();
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async getTeamCommunicationMessages(teamRunId: string): Promise<TeamCommunicationMessage[]> {
    return (await this.readProjection(teamRunId)).messages;
  }

  async resolveReference(input: {
    teamRunId: string;
    messageId: string;
    referenceId: string;
  }): Promise<{ message: TeamCommunicationMessage; reference: TeamCommunicationReferenceFile } | null> {
    const message = (await this.readProjection(input.teamRunId)).messages
      .find((entry) => entry.messageId === required(input.messageId, "messageId")) ?? null;
    const reference = message?.referenceFiles
      .find((entry) => entry.referenceId === required(input.referenceId, "referenceId")) ?? null;
    return message && reference ? { message, reference } : null;
  }

  private async readProjection(teamRunId: string): Promise<TeamCommunicationProjection> {
    const rootTeamRunId = required(teamRunId, "teamRunId");
    const active = this.manager.getTeamRun(rootTeamRunId);
    const snapshot = active?.getCommunicationSnapshot() ?? await this.store.read(
      this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] }),
      rootTeamRunId,
    );
    return {
      teamRunId: rootTeamRunId,
      messages: (snapshot?.messages ?? []).map(projectMessage),
    };
  }
}

const projectMessage = (message: TeamCommunicationMessageV1): TeamCommunicationMessage => ({
  messageId: message.messageId,
  senderAgentRunId: message.senderAgentRunId,
  receiverAgentRunId: message.receiverAgentRunId,
  content: message.content,
  messageType: message.messageType,
  createdAt: message.createdAt,
  referenceFiles: message.referenceFiles.map((filePath) =>
    projectTeamReferenceFile(message.messageId, filePath, message.createdAt)),
});

let cachedProjectionService: TeamCommunicationProjectionService | null = null;
export const getTeamCommunicationProjectionService = (): TeamCommunicationProjectionService =>
  cachedProjectionService ??= new TeamCommunicationProjectionService();
