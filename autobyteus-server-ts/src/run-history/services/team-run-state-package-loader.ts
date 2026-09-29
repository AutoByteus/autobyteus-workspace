import type { TeamCommunicationV1Store } from "../../services/team-communication/team-communication-v1-store.js";
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
    communicationStore: TeamCommunicationV1Store;
  }) {}

  async load(input: { teamMemoryDir: string; rootTeamRunId: string }): Promise<TeamRunStatePackageLoadResult> {
    const [executionTree, communicationMessages] = await Promise.all([
      this.options.executionTreeStore.read(input.teamMemoryDir, input.rootTeamRunId),
      this.options.communicationStore.read(input.teamMemoryDir, input.rootTeamRunId),
    ]);
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
