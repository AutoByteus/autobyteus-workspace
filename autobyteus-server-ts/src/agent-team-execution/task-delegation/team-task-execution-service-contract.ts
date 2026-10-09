import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import type {
  ExecutionTreeCommitResult,
  PreparedTaskActivationMutation,
} from "../services/team-run-persistence-contract.js";
import type { TeamRunResolver } from "../services/team-run-resolver.js";
import type { TaskExecutionIdentityCapabilities } from "./task-execution-identity-capabilities.js";

/** Host capabilities required by the Team task-execution adapter and lifecycle. */
export type TeamTaskExecutionServiceOptions = Readonly<{
  rootTeamRunId: string;
  taskExecutionResources?: TaskExecutionResourcePort;
  config: TeamRunConfig;
  getTree(): TeamRunExecutionTreeSnapshot;
  getIndex(): TeamExecutionIndex;
  isRootOpen(): boolean;
  authorize(identity: CollaborationMemberExecutionIdentity): void;
  requireTeamRun(teamRunId: string): Promise<TeamRun>;
  teamRunResolver: TeamRunResolver;
  commitTaskActivation(command: PreparedTaskActivationMutation): Promise<ExecutionTreeCommitResult>;
  enterLifecycleFailStop(): void;
  replaceTree(tree: TeamRunExecutionTreeSnapshot): void;
  publish(event: TeamRunEvent): void;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  memoryLocator?: RootedAgentMemoryLocator;
  activityInspector?: AgentConversationActivityInspector;
  tokenUsageMigrationReadiness?: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
  idleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
}>;
