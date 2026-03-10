import type { ClaudeRunSessionState } from "./claude-runtime-shared.js";
import { renderConfiguredSkillInstructionBlock } from "../configured-runtime-skills.js";
import {
  composeMemberRuntimeInstructions,
  resolveMemberRuntimeInstructionSourcesFromMetadata,
} from "../member-runtime/member-runtime-instruction-composer.js";

export const buildClaudeTurnInput = (options: {
  state: ClaudeRunSessionState;
  content: string;
  sendMessageToToolingEnabled: boolean;
}): string => {
  const instructionSources = resolveMemberRuntimeInstructionSourcesFromMetadata(
    options.state.runtimeMetadata,
  );
  const instructionComposition = composeMemberRuntimeInstructions({
    teamInstructions: instructionSources.teamInstructions,
    agentInstructions: instructionSources.agentInstructions,
    currentMemberName: options.state.memberName,
    sendMessageToEnabled: options.sendMessageToToolingEnabled,
    teammates: options.state.teamManifestMembers,
  });
  const configuredSkillBlock = renderConfiguredSkillInstructionBlock({
    configuredSkills: options.state.configuredSkills,
    skillAccessMode: options.state.skillAccessMode,
  });
  if (
    !instructionComposition.teamInstruction &&
    !instructionComposition.agentInstruction &&
    !instructionComposition.runtimeInstruction &&
    !configuredSkillBlock
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
  if (configuredSkillBlock) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("<configured_skills>");
    lines.push(configuredSkillBlock);
    lines.push("</configured_skills>");
  }
  lines.push("");
  lines.push("<user_message>");
  lines.push(options.content);
  lines.push("</user_message>");
  return lines.join("\n");
};
