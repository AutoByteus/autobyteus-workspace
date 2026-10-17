import type { TeamCommunicationStore } from "../../services/team-communication/team-communication-store.js";
import type { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import {
  validateTeamRunStatePackage,
  type ValidatedTeamRunStatePackage,
} from "./team-run-state-package-validator.js";

export type TeamRunStatePackageLoadResult =
  | Readonly<{ loaded: true; state: ValidatedTeamRunStatePackage }>
  | Readonly<{ loaded: false; code: string; message: string }>;

/**
 * Reopen reads the current tree and messages only. No repair is needed: every
 * delegated child starts shut down (no runtime handle) and wakes on a message.
 */
export class TeamRunStatePackageLoader {
  constructor(private readonly options: {
    executionTreeStore: TeamRunExecutionTreeStore;
    communicationStore: TeamCommunicationStore;
  }) {}

  async load(input: { teamMemoryDir: string; rootTeamRunId: string }): Promise<TeamRunStatePackageLoadResult> {
    const executionTree = await this.options.executionTreeStore.read(input.teamMemoryDir, input.rootTeamRunId);
    const communicationMessages = executionTree
      ? await this.options.communicationStore.read(input.teamMemoryDir, executionTree)
      : null;
    if (!executionTree || !communicationMessages) {
      return {
        loaded: false,
        code: "TEAM_RUN_STATE_PACKAGE_INCOMPLETE",
        message: `TeamRun '${input.rootTeamRunId}' does not have its current execution tree and communication messages.`,
      };
    }
    return { loaded: true, state: validateTeamRunStatePackage({ executionTree, communicationMessages }) };
  }
}
