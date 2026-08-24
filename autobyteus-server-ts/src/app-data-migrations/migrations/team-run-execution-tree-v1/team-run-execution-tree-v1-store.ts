import fs from "node:fs/promises";
import type { TeamRunExecutionTreeFileV1 } from "./team-run-execution-tree-v1-types.js";
import {
  getTeamRunFileCommitWriter,
  type TeamRunFileCommitWriter,
  type TeamRunFileWriteResult,
} from "../../../run-history/store/team-run-file-commit-writer.js";
import { getTeamRunExecutionTreePath } from "../../../run-history/store/team-run-execution-tree-path.js";
import { validateTeamRunExecutionTreePayload } from "./team-run-execution-tree-v1-schema.js";

const isMissingFile = (error: unknown): boolean =>
  !!error && typeof error === "object" && "code" in error &&
  (error as { code?: unknown }).code === "ENOENT";

export class TeamRunExecutionTreeV1Store {
  constructor(
    private readonly writer: TeamRunFileCommitWriter = getTeamRunFileCommitWriter(),
  ) {}

  async read(
    teamMemoryDir: string,
    rootTeamRunId: string,
  ): Promise<TeamRunExecutionTreeFileV1 | null> {
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
    tree: TeamRunExecutionTreeFileV1,
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
