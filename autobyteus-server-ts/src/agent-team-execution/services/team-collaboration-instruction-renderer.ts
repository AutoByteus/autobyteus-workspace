import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { renderMemberCollaborationInstruction } from "./member-collaboration-instruction-renderer.js";

export const renderTeamCollaborationInstruction = (
  context: MemberExecutionContext,
): string => {
  if (typeof context.collaboration.deliverLogicalMessage !== "function") {
    throw new Error("Team member context requires an active message-delivery binding.");
  }
  return renderMemberCollaborationInstruction({
    memberAddress: context.identity.memberAddress,
  });
};
