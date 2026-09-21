import path from "node:path";

export const AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME = "agent_org_run_execution_tree.json";

export const getAgentOrgRunExecutionTreePath = (orgMemoryDir: string): string =>
  path.join(path.resolve(orgMemoryDir), AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME);
