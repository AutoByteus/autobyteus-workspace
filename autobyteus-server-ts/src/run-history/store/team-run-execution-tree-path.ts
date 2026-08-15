import path from "node:path";

export const TEAM_RUN_EXECUTION_TREE_FILE_NAME = "team_run_execution_tree.json";

export const getTeamRunExecutionTreePath = (teamMemoryDir: string): string =>
  path.join(path.resolve(teamMemoryDir), TEAM_RUN_EXECUTION_TREE_FILE_NAME);
