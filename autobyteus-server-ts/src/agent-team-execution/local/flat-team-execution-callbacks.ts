import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import type { ConfiguredAgentExecutionSpec } from "../../agent-collaboration/execution/domain/configured-agent-execution.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { CollaborationAgentExecutionEvent } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type {
  CollaborationMemberExecutionIdentity,
  RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/** Root-owned callback ports supplied to a local Team plane. */
export type FlatTeamExecutionCallbacks = Readonly<{
  buildMemberExecutionContext(input: Readonly<{
    identity: CollaborationMemberExecutionIdentity;
    physicalScope: RootExecutionPhysicalScope;
    execution: ConfiguredAgentExecutionSpec;
    sourceNode: import("../domain/team-run-config.js").TeamRunAgentNode;
  }>): Promise<MemberExecutionContext>;
  publishAgentEvent(identity: CollaborationMemberExecutionIdentity, event: CollaborationAgentExecutionEvent): void;
  commitPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void>;
  applicationExecutionContext?(identity: CollaborationMemberExecutionIdentity): ApplicationExecutionContext | null;
}>;
