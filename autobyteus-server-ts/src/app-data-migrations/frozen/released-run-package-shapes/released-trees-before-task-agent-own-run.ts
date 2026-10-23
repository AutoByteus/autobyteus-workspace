// Released execution trees before `20261017_task_agent_own_run_v1`: the shape in which a coordinating
// run's tree embeds every task agent's facts (`taskExecutions`). Frozen verbatim copies live in
// `./released-trees-before-task-agent-own-run/` (import paths remapped only). Owned by the released
// app-data migrations that still run on that shape and by `20261017_task_agent_own_run_v1`;
// current runtime code must never import this module.

import type { TeamRunExecutionTreeSnapshot } from "../server/agent-team-execution/domain/team-run-execution-tree.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../server/agent-org-execution/domain/agent-org-run-execution-tree.js";
import type { StandaloneRootTreeSnapshot } from "../server/standalone-agent-run-root/domain/standalone-root-tree.js";
import type { TeamRunExecutionTreeFile as ReleasedTeamTree } from "./released-trees-before-task-agent-own-run/team-run-execution-tree.js";
import type { AgentOrgRunExecutionTreeFile as ReleasedAgentOrgTree } from "./released-trees-before-task-agent-own-run/agent-org-run-execution-tree.js";
import type { StandaloneRootTreeFile as ReleasedStandaloneTree } from "./released-trees-before-task-agent-own-run/standalone-root-tree.js";

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
  StandaloneRootTreeFile,
} from "./released-trees-before-task-agent-own-run/standalone-root-tree.js";
export { validateTeamRunExecutionTreePayload } from "./released-trees-before-task-agent-own-run/team-run-execution-tree-schema.js";
export { validateAgentOrgRunExecutionTreePayload } from "./released-trees-before-task-agent-own-run/agent-org-run-execution-tree-schema.js";
export { validateStandaloneRootTreePayload } from "./released-trees-before-task-agent-own-run/standalone-root-tree-schema.js";
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
  ReleasedStandaloneRootMessagesReader,
  ReleasedStandaloneRootTreeReader,
  ReleasedTeamCommunicationMessagesReader,
  ReleasedTeamRunExecutionTreeReader,
} from "./released-trees-before-task-agent-own-run/released-run-package-file-readers.js";

/**
 * The bridge from a released tree to the current execution indexes and state-package validators (design
 * D-8): the released migrations that keep their documented dependency on those current modules (both
 * `20260731` working-context snapshot migrations, `20260926_team_context_file_execution_locators_v1` and
 * `20260905_agent_org_history_first_message_summary_v1`) pass their tree through here, and only here.
 *
 * 1. The released tree may hold delegated copies without `source` (a copy of a configured place), which the
 *    current record type requires; the value is passed unchanged, only its type is the current one.
 * 2. Only these may be called with the result, none of which reads a copy's `source`: the constructors of
 *    `TeamExecutionIndex`, `AgentOrgExecutionIndex` and `StandaloneRootExecutionIndex`; their
 *    `listAgentExecutions`, `listTeamExecutions`, `getTeamRunPhysicalScope`, `getConfiguredPlacement`,
 *    `listAgents`, `listChildAgents`, `listTeams`, `requireAgent`, `getPhysicalScopeForAgent` and
 *    `getPhysicalScopeForTeam`; `validateTeamRunStatePackage` and `validateAgentOrgStatePackage` (which call
 *    only `requireAgent`); and `projectAgentOrgRunHistoryRow`.
 * 3. Whoever makes one of those read a copy's `source` must first freeze it for these migrations.
 */
export function asSourceIndependentIndexInput(tree: ReleasedTeamTree): TeamRunExecutionTreeSnapshot;
export function asSourceIndependentIndexInput(tree: ReleasedAgentOrgTree): AgentOrgRunExecutionTreeSnapshot;
export function asSourceIndependentIndexInput(tree: ReleasedStandaloneTree): StandaloneRootTreeSnapshot;
export function asSourceIndependentIndexInput(
  tree: ReleasedTeamTree | ReleasedAgentOrgTree | ReleasedStandaloneTree,
): TeamRunExecutionTreeSnapshot | AgentOrgRunExecutionTreeSnapshot | StandaloneRootTreeSnapshot {
  return tree as unknown as TeamRunExecutionTreeSnapshot | AgentOrgRunExecutionTreeSnapshot | StandaloneRootTreeSnapshot;
}
