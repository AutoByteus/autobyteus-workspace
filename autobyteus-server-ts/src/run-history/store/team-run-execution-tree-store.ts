import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { memoryRootOfCoordinatingDir } from "../../agent-memory/store/agent-memory-layout.js";
import {
  getAtomicRunPackageFileCommitWriter,
  type AtomicRunPackageFileCommitWriter,
  type RunPackageFileWriteResult,
} from "./atomic-run-package-file-commit-writer.js";
import { TEAM_RUN_TREE_SHAPE } from "./coordinating-tree-shapes.js";
import { TaskAgentOwnFiles } from "./task-agent-own-files.js";
import { hasTaskAgentSection } from "./task-agent-own-file-schema.js";
import {
  commitSplitTree,
  composeTreeFile,
  composeTreeFileSync,
  readRawTreeFile,
  readRawTreeFileSync,
  splitTaskExecutions,
} from "./task-execution-tree-split.js";
import { getTeamRunExecutionTreePath } from "./team-run-execution-tree-path.js";
import { validateTeamRunExecutionTreePayload } from "./team-run-execution-tree-schema.js";

/**
 * Reader and writer of team runs' trees. On disk a team run's tree links its task agents; their facts are
 * in their own files (D-1). A tree with a `taskAgent` section is a task agent team's own tree, never a
 * team run (G2): `read` treats it as absent.
 */
export class TeamRunExecutionTreeStore {
  constructor(
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) {}

  async read(teamMemoryDir: string, rootTeamRunId: string): Promise<TeamRunExecutionTreeFile | null> {
    const raw = await readRawTreeFile(getTeamRunExecutionTreePath(teamMemoryDir));
    if (!raw || hasTaskAgentSection(raw)) return null;
    return validateTeamRunExecutionTreePayload(
      await composeTreeFile(TEAM_RUN_TREE_SHAPE, raw, this.ownFiles(teamMemoryDir)), rootTeamRunId);
  }

  readSync(teamMemoryDir: string, rootTeamRunId: string): TeamRunExecutionTreeFile | null {
    const raw = readRawTreeFileSync(getTeamRunExecutionTreePath(teamMemoryDir));
    if (!raw || hasTaskAgentSection(raw)) return null;
    return validateTeamRunExecutionTreePayload(
      composeTreeFileSync(TEAM_RUN_TREE_SHAPE, raw, this.ownFiles(teamMemoryDir)), rootTeamRunId);
  }

  async write(
    teamMemoryDir: string,
    tree: TeamRunExecutionTreeFile,
  ): Promise<RunPackageFileWriteResult<"execution_tree">> {
    const normalized = validateTeamRunExecutionTreePayload(tree, tree.rootTeam.teamRunId);
    const filePath = getTeamRunExecutionTreePath(teamMemoryDir);
    const rawOnDisk = await readRawTreeFile(filePath);
    if (rawOnDisk && hasTaskAgentSection(rawOnDisk)) {
      throw new Error(`'${filePath}' is a task agent team's own tree, not a team run's.`);
    }
    const split = await splitTaskExecutions({
      shape: TEAM_RUN_TREE_SHAPE, tree: normalized, treeFile: normalized, rawOnDisk, files: this.ownFiles(teamMemoryDir),
    });
    return commitSplitTree(split, "execution_tree", (payload) => this.writer.write({ file: "execution_tree", filePath, payload }));
  }

  /** Whether the folder holds a task agent team's own tree: never a team run (G2), never a root candidate. */
  async isTaskAgentTeamDir(teamMemoryDir: string): Promise<boolean> {
    const raw = await readRawTreeFile(getTeamRunExecutionTreePath(teamMemoryDir));
    return !!raw && hasTaskAgentSection(raw);
  }

  private ownFiles(teamMemoryDir: string): () => TaskAgentOwnFiles {
    return () => new TaskAgentOwnFiles(memoryRootOfCoordinatingDir("agent_team", teamMemoryDir), this.writer);
  }
}
