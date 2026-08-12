import type { MemberTeamContext } from "../domain/member-team-context.js";
import { renderMemberCollaborationInstruction } from "./member-collaboration-instruction-renderer.js";

export const renderTeamRuntimeInstruction = (
  context: MemberTeamContext,
): string => {
  if (!context.collaboration.deliverInterAgentMessage) {
    throw new Error("Team member context requires an active message-delivery binding.");
  }
  return [
    renderMemberCollaborationInstruction({
      addressing: context.collaboration.addressing,
    }),
    "",
    "`delegate_task.recipient_address` uses the same logical-address grammar. A task target must be a direct Agent or AgentTeam child of your immediate AgentTeam; deeper and cross-branch addresses remain valid for message delivery but are not task-eligible.",
  ].join("\n");
};
