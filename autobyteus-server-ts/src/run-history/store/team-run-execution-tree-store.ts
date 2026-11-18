import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";
import { readRawTreeFile, readRawTreeFileSync } from "./raw-tree-file.js";
import { getTeamRunExecutionTreePath } from "./team-run-execution-tree-path.js";
import { validateTeamRunExecutionTreePayload } from "./team-run-execution-tree-schema.js";

/**
 * Reader and writer of a team run's tree: its own parts only. A run it delegated to is its own run with its own file;
 * the Task entries say who delegated to whom (autobyteus-461, contract §4).
 */
export class TeamRunExecutionTreeStore {
  constructor(private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter()) {}

  async read(teamMemoryDir: string, rootTeamRunId: string): Promise<TeamRunExecutionTreeFile | null> {
    const raw = await readRawTreeFile(getTeamRunExecutionTreePath(teamMemoryDir));
    return raw ? validateTeamRunExecutionTreePayload(raw, rootTeamRunId) : null;
  }

  readSync(teamMemoryDir: string, rootTeamRunId: string): TeamRunExecutionTreeFile | null {
    const raw = readRawTreeFileSync(getTeamRunExecutionTreePath(teamMemoryDir));
    return raw ? validateTeamRunExecutionTreePayload(raw, rootTeamRunId) : null;
  }

  write(teamMemoryDir: string, tree: TeamRunExecutionTreeFile): Promise<RunPackageFileWriteResult<"execution_tree">> {
    const payload = validateTeamRunExecutionTreePayload(tree, tree.rootTeam.teamRunId);
    return this.writer.write({ file: "execution_tree", filePath: getTeamRunExecutionTreePath(teamMemoryDir), payload });
  }
}
