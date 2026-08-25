import fs from "node:fs/promises";
import type { TeamRunExecutionTreeFileV2 } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import {
  getTeamRunFileCommitWriter,
  type TeamRunFileCommitWriter,
  type TeamRunFileWriteResult,
} from "./team-run-file-commit-writer.js";
import { getTeamRunExecutionTreePath } from "./team-run-execution-tree-path.js";
import { validateTeamRunExecutionTreePayload } from "./team-run-execution-tree-schema.js";

const isMissingFile = (error: unknown): boolean =>
  !!error && typeof error === "object" && "code" in error &&
  (error as { code?: unknown }).code === "ENOENT";

export class TeamRunExecutionTreeStore {
  constructor(
    private readonly writer: TeamRunFileCommitWriter = getTeamRunFileCommitWriter(),
  ) {}

  async read(
    teamMemoryDir: string,
    rootTeamRunId: string,
  ): Promise<TeamRunExecutionTreeFileV2 | null> {
    try {
      const value = JSON.parse(
        await fs.readFile(getTeamRunExecutionTreePath(teamMemoryDir), "utf-8"),
      ) as unknown;
      return validateTeamRunExecutionTreePayload(value, rootTeamRunId);
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async write(
    teamMemoryDir: string,
    tree: TeamRunExecutionTreeFileV2,
  ): Promise<TeamRunFileWriteResult> {
    const normalized = validateTeamRunExecutionTreePayload(
      tree,
      tree.rootTeam.teamRunId,
    );
    return this.writer.write({
      file: "execution_tree",
      filePath: getTeamRunExecutionTreePath(teamMemoryDir),
      payload: normalized,
    });
  }
}
