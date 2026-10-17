import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamCommunicationStore } from "./team-communication-store.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-messages-file.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type {
  TeamCommunicationMessage,
  TeamCommunicationProjection,
  TeamCommunicationReferenceFile,
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
  private readonly store: TeamCommunicationStore;
  private readonly treeStore: TeamRunExecutionTreeStore;
  private readonly layout: AgentMemoryLayout;

  constructor(options: {
    teamRunManager?: AgentTeamRunManager;
    communicationStore?: TeamCommunicationStore;
    executionTreeStore?: TeamRunExecutionTreeStore;
    memoryDir?: string;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.manager = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.store = options.communicationStore ?? new TeamCommunicationStore();
    this.treeStore = options.executionTreeStore ?? new TeamRunExecutionTreeStore();
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

  /**
   * A stored team run's view: its composed tree decides which task agents' logs it includes (D-4). Without a
   * tree there are no task agents: the run's own log is read as it is (strictly).
   */
  private async readStored(rootTeamRunId: string): Promise<TeamCommunicationMessagesSnapshot | null> {
    const dir = this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    const tree = await this.treeStore.read(dir, rootTeamRunId);
    return tree ? this.store.read(dir, tree) : this.store.readLog(dir, rootTeamRunId);
  }

  private async readProjection(teamRunId: string): Promise<TeamCommunicationProjection> {
    const rootTeamRunId = required(teamRunId, "teamRunId");
    const managed = this.manager.getManagedTeamRun(rootTeamRunId);
    const snapshot = managed?.getCommunicationSnapshot() ?? await this.readStored(rootTeamRunId);
    return {
      teamRunId: rootTeamRunId,
      messages: (snapshot?.messages ?? []).map(projectMessage),
    };
  }
}

const projectMessage = (message: CollaborationCommunicationMessage): TeamCommunicationMessage => ({
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
