import type { MemberExecutionContext } from "../../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  cloneCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../../../agent-collaboration/execution/domain/root-execution-identity.js";

export type AutoByteusManagedCollaborationContext = CollaborationMemberExecutionIdentity;

export const buildAutoByteusManagedCollaborationContext = (
  context: MemberExecutionContext,
): AutoByteusManagedCollaborationContext => cloneCollaborationMemberExecutionIdentity(context.identity);
