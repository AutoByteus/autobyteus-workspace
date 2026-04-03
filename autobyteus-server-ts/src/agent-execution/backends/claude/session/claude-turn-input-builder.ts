import {
  composeMemberRunInstructions,
} from "../../../../agent-team-execution/services/member-run-instruction-composer.js";
import {
  getRuntimeMemberContexts,
  resolveRuntimeMemberContext,
} from "../../../../agent-team-execution/domain/team-run-context.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";

export const buildClaudeTurnInput = (options: {
  runContext: ClaudeRunContext;
  content: string;
  sendMessageToEnabled: boolean;
}): string => {
  const currentMemberContext = resolveRuntimeMemberContext(
    options.runContext.runtimeContext.teamContext,
    options.runContext.runId,
  );
  const teammates = getRuntimeMemberContexts(
    options.runContext.runtimeContext.teamContext?.runtimeContext ?? null,
  ).map((memberContext) => ({
    memberName: memberContext.memberName,
    role: null,
    description: null,
  }));
  const instructionComposition = composeMemberRunInstructions({
    teamInstruction: null,
    agentInstruction: options.runContext.runtimeContext.agentInstruction,
    currentMemberName: currentMemberContext?.memberName ?? null,
    sendMessageToEnabled: options.sendMessageToEnabled,
    teammates,
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
