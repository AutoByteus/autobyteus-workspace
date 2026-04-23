import {
  composeMemberRunInstructions,
} from "../../../../agent-team-execution/services/member-run-instruction-composer.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";

export const buildClaudeTurnInput = (options: {
  runContext: ClaudeRunContext;
  content: string;
  sendMessageToEnabled: boolean;
}): string => {
  const memberTeamContext = options.runContext.runtimeContext.memberTeamContext;
  const instructionComposition = composeMemberRunInstructions({
    teamInstruction: memberTeamContext?.teamInstruction ?? null,
    agentInstruction: options.runContext.runtimeContext.agentInstruction,
    currentMemberName: memberTeamContext?.memberName ?? null,
    sendMessageToEnabled: options.sendMessageToEnabled,
    teammates: memberTeamContext?.members ?? [],
  });
  if (
    !instructionComposition.teamInstruction &&
    !instructionComposition.agentInstruction &&
    !instructionComposition.runtimeInstruction
  ) {
    return options.content;
  }

  const lines: string[] = [];
  if (instructionComposition.teamInstruction) {
    lines.push("<team_instruction>");
    lines.push(instructionComposition.teamInstruction);
    lines.push("</team_instruction>");
  }
  if (instructionComposition.agentInstruction) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("<agent_instruction>");
    lines.push(instructionComposition.agentInstruction);
    lines.push("</agent_instruction>");
  }
  if (instructionComposition.runtimeInstruction) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("<runtime_instruction>");
    lines.push(instructionComposition.runtimeInstruction);
    lines.push("</runtime_instruction>");
  }
  lines.push("");
  lines.push("<user_message>");
  lines.push(options.content);
  lines.push("</user_message>");
  return lines.join("\n");
};
