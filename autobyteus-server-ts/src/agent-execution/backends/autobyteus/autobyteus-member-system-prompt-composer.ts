import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { composeMemberRunInstructions } from "../../../agent-team-execution/services/member-run-instruction-composer.js";
import { buildConfiguredAgentToolExposure } from "../../shared/configured-agent-tool-exposure.js";

export type AutoByteusMemberSystemPromptInput = {
  baseAgentInstruction: string | null;
  memberTeamContext: MemberTeamContext | null;
  resolvedToolNames: Iterable<string>;
};

const normalizeInstruction = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const renderPromptSection = (heading: string, body: string | null): string | null => {
  const normalizedBody = normalizeInstruction(body);
  if (!normalizedBody) {
    return null;
  }
  return `## ${heading}\n${normalizedBody}`;
};

export const composeAutoByteusMemberSystemPrompt = (
  input: AutoByteusMemberSystemPromptInput,
): string | null => {
  const baseAgentInstruction = normalizeInstruction(input.baseAgentInstruction);
  if (!input.memberTeamContext) {
    return baseAgentInstruction;
  }

  const exposure = buildConfiguredAgentToolExposure(input.resolvedToolNames);
  const composition = composeMemberRunInstructions({
    teamInstruction: normalizeInstruction(input.memberTeamContext.teamInstruction),
    agentInstruction: baseAgentInstruction,
    memberTeamContext: input.memberTeamContext,
    sendMessageToEnabled: true,
    taskDelegationEnabled: exposure.enabledTaskDelegationToolNames.length > 0,
  });

  return [
    renderPromptSection("Team Instruction", composition.teamInstruction),
    renderPromptSection("Agent Instruction", composition.agentInstruction),
    renderPromptSection("Runtime Instruction", composition.runtimeInstruction),
  ]
    .filter((section): section is string => Boolean(section))
    .join("\n\n");
};
