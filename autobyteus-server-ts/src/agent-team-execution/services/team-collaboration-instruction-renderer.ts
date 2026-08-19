import type { MemberTeamContext } from "../domain/member-team-context.js";
import { renderMemberCollaborationInstruction } from "./member-collaboration-instruction-renderer.js";

export const renderTeamCollaborationInstruction = (
  context: MemberTeamContext,
): string => {
  if (!context.collaboration.deliverInterAgentMessage) {
    throw new Error("Team member context requires an active message-delivery binding.");
  }
  return renderMemberCollaborationInstruction({
    memberAddress: context.identity.memberAddress,
  });
};
