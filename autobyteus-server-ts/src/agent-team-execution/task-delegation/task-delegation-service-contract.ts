import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import type { TeamMemberExecutionIdentity } from "../domain/team-member-execution-identity.js";
import type { PreparedTaskExecution } from "../domain/prepared-task-execution.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import type { TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import type { TeamRun } from "../domain/team-run.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import type {
  PreparedTaskMutationCommit,
  PreparedTaskSettlementCommit,
  TaskMutationCommitResult,
  TaskSettlementCommitResult,
} from "../services/team-run-persistence-contract.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import type {
  TeamRunRegistrationReservation,
  TeamRunResolver,
} from "../services/team-run-resolver.js";
import type { TaskDelegationContext } from "./task-delegation-record.js";
import type { TaskDelegationRecordsSnapshot } from "./task-delegation-record-v1.js";
import type { TaskExecutionIdentityCapabilities } from "./task-execution-identity-capabilities.js";

export type TaskDelegationServiceState = Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
  tasks: TaskDelegationRecordsSnapshot;
}>;

export type TaskDelegationActivationInput = Readonly<{
  context: TaskDelegationContext;
  placement: ResolvedTeamRecipient;
  taskId: string;
  description: string;
  referenceFiles: readonly string[];
  startedAt: string;
  hostTeamRunId: string;
  prepared: PreparedTaskExecution;
  reservation: TeamRunRegistrationReservation | null;
}>;

/** Host capabilities required by the root-scoped task command owner. */
export type TaskDelegationServiceOptions = Readonly<{
  rootTeamRunId: string;
  config: TeamRunConfig;
  initialTasks: TaskDelegationRecordsSnapshot;
  getTree(): TeamRunExecutionTreeSnapshot;
  getIndex(): TeamExecutionIndex;
  isRootOpen(): boolean;
  authorize(identity: TeamMemberExecutionIdentity): void;
  requireTeamRun(teamRunId: string): Promise<TeamRun>;
  teamRunResolver: TeamRunResolver;
  commitTaskMutation(command: PreparedTaskMutationCommit): Promise<TaskMutationCommitResult>;
  commitTaskSettlement(command: PreparedTaskSettlementCommit): Promise<TaskSettlementCommitResult>;
  enterLifecycleFailStop(): void;
  replaceState(state: TaskDelegationServiceState): void;
  publish(event: TeamRunEvent): void;
  deliverSystemMessage(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult>;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  tokenUsageMigrationReadiness?: Pick<TokenUsageMigrationReadiness, "assertCurrentSchemaReady">;
}>;
