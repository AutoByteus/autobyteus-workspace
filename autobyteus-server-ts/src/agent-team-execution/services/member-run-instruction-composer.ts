import type { MemberTeamContext } from "../domain/member-team-context.js";
import { renderMemberCollaborationInstruction } from "./member-collaboration-instruction-renderer.js";

type Input = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  memberTeamContext: MemberTeamContext | null;
  sendMessageToEnabled: boolean;
  recipientAddressDeliveryEnabled?: boolean;
  taskDelegationEnabled?: boolean;
  getHandoffRulesEnabled?: boolean;
};
export type MemberRunInstructionComposition = { teamInstruction: string | null; agentInstruction: string | null; runtimeInstruction: string | null };

export const composeMemberRunInstructions = (input: Input): MemberRunInstructionComposition => {
  const lines: string[] = [];
  if (input.memberTeamContext) {
    lines.push(renderMemberCollaborationInstruction({
      addressing: input.memberTeamContext.collaboration.addressing,
      taskDelegationEnabled: Boolean(input.taskDelegationEnabled),
    }));
  } else if (input.sendMessageToEnabled) {
    lines.push("If you use `send_message_to`, use `target_agent_run_id` for one exact currently active AgentRun. Do not claim delivery unless the tool result is accepted.");
  }
  return {
    teamInstruction: input.teamInstruction,
    agentInstruction: input.agentInstruction,
    runtimeInstruction: lines.length ? lines.join("\n") : null,
  };
};
