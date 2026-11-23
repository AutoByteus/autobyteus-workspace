import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamCommunicationStore } from "./team-communication-store.js";
import type { TeamCommunicationMessagesSnapshot } from "./team-communication-messages-file.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { validateTeamRunStatePackage } from "../../run-history/services/team-run-state-package-validator.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export type TeamCollaborationRecordsSnapshot = Readonly<{
  executionTree: TeamRunExecutionTreeSnapshot;
  messages: TeamCommunicationMessagesSnapshot;
}>;

/** A Team run's message records: the live run's, or the stored log validated with its tree. */
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

  /**
   * The run's messages with the tree they were validated against (autobyteus-358: the one log reader): the
   * live run's, else the stored log composed with its task agents' logs for the stored tree (D-4) and validated
   * with it. A damaged log fails this read with the reason; the run's view does not read it (DESIGN.md rule 7).
   */
  async getCollaborationRecordsSnapshot(teamRunId: string): Promise<TeamCollaborationRecordsSnapshot> {
    const rootTeamRunId = required(teamRunId, "teamRunId");
    const managed = this.manager.getManagedTeamRun(rootTeamRunId);
    if (managed) return Object.freeze({ executionTree: managed.getExecutionTreeSnapshot(), messages: managed.getCommunicationSnapshot() });
    const dir = this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    const tree = await this.treeStore.read(dir, rootTeamRunId);
    if (!tree) throw new Error(`Team collaboration records for '${rootTeamRunId}' were not found.`);
    const messages = await this.store.readLog(dir, rootTeamRunId);
    if (!messages) throw new Error(`TeamRun '${rootTeamRunId}' has no communication messages.`);
    const state = validateTeamRunStatePackage({ executionTree: tree, communicationMessages: messages });
    return Object.freeze({ executionTree: state.executionTree, messages: state.communicationMessages });
  }
}

let cachedProjectionService: TeamCommunicationProjectionService | null = null;
export const getTeamCommunicationProjectionService = (): TeamCommunicationProjectionService =>
  cachedProjectionService ??= new TeamCommunicationProjectionService();
