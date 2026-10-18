// Released execution trees before `20261017_task_agent_own_run_v1`: the shape in which a coordinating
// run's tree embeds every task agent's facts (`taskExecutions`). Frozen verbatim copies live in
// `./released-trees-before-task-agent-own-run/` (import paths remapped only). Owned by the released
// app-data migrations that still run on that shape and by `20261017_task_agent_own_run_v1`;
// current runtime code must never import this module.

export type {
  ConfiguredAgentExecutionNode,
  ConfiguredTeamExecutionNode,
  TaskAgentExecution,
  TaskAgentExecutionSource,
  TaskExecution,
  TaskExecutionSource,
  TaskTeamAgentExecution,
  TaskTeamExecution,
  TaskTeamExecutionSource,
  TaskTeamExecutionSourceMember,
  UserLaunchSelection,
} from "./released-trees-before-task-agent-own-run/run-execution-tree-shared-records.js";
export {
  effectiveMemberLaunchConfiguration,
  isTaskAgentExecution,
  isTaskTeamExecution,
} from "./released-trees-before-task-agent-own-run/run-execution-tree-shared-records.js";
export type {
  RootConfiguredTeamExecutionNode,
  TeamRunExecutionTreeFile,
} from "./released-trees-before-task-agent-own-run/team-run-execution-tree.js";
export type {
  AgentOrgRunExecutionTreeFile,
  RootConfiguredAgentOrgExecutionNode,
} from "./released-trees-before-task-agent-own-run/agent-org-run-execution-tree.js";
export type {
  StandaloneRootHost,
  StandaloneRootMessagesFile,
  StandaloneRootTreeFile,
} from "./released-trees-before-task-agent-own-run/standalone-root-tree.js";
export { validateTeamRunExecutionTreePayload } from "./released-trees-before-task-agent-own-run/team-run-execution-tree-schema.js";
export { validateAgentOrgRunExecutionTreePayload } from "./released-trees-before-task-agent-own-run/agent-org-run-execution-tree-schema.js";
export {
  validateStandaloneRootMessages,
  validateStandaloneRootTreePayload,
} from "./released-trees-before-task-agent-own-run/standalone-root-tree-schema.js";
export {
  canonicalNonRootAddress,
  isoTimestamp,
  nullableString,
  objectRecord,
  parseLaunchConfiguration,
  parseTaskExecutions,
  requireKeys,
  requiredArray,
  requiredString,
} from "./released-trees-before-task-agent-own-run/run-execution-tree-shared-record-schemas.js";
export {
  parseOptionalLaunchFields,
  parseOptionalUserLaunchSelection,
} from "./released-trees-before-task-agent-own-run/launch-configuration-source-schema.js";
export {
  ReleasedAgentOrgCommunicationMessagesReader,
  ReleasedAgentOrgRunExecutionTreeReader,
  ReleasedStandaloneRootTreeReader,
  ReleasedTeamCommunicationMessagesReader,
  ReleasedTeamRunExecutionTreeReader,
} from "./released-trees-before-task-agent-own-run/released-run-package-file-readers.js";
