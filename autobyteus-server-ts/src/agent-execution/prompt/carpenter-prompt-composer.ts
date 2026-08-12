import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";
import { renderTeamRuntimeInstruction } from "../../agent-team-execution/services/team-runtime-instruction-renderer.js";
import {
  BASH_OPERATING_PRACTICE_SECTION,
  FILE_AND_DIRECTORY_PRACTICE_SECTION,
  renderAgentIdentitySection,
  renderTeamInstructionSection,
  renderWorkingEnvironmentSection,
} from "./carpenter-prompt-sections.js";

export type CarpenterPromptComposerInput = {
  agentDefinition: AgentDefinition;
  workspaceRootPath: string;
  memberTeamContext?: MemberTeamContext | null;
};

const assertNoUnresolvedPlaceholders = (prompt: string): void => {
  if (/\{\{[^}]+\}\}/.test(prompt)) {
    throw new Error("Carpenter prompt contains an unresolved documentation placeholder.");
  }
};

export const composeCarpenterPrompt = (input: CarpenterPromptComposerInput): string => {
  if (!input.agentDefinition) {
    throw new Error("Agent definition is required to compose the carpenter prompt.");
  }
  const workspaceRootPath = input.workspaceRootPath?.trim() ?? "";
  if (!workspaceRootPath || !path.isAbsolute(workspaceRootPath)) {
    throw new Error("Agent workspace must be a non-blank absolute path.");
  }

  const sections: string[] = [renderAgentIdentitySection(input.agentDefinition)];
  if (input.memberTeamContext) {
    const teamInstruction = renderTeamInstructionSection(input.memberTeamContext.teamInstruction);
    if (teamInstruction) {
      sections.push(teamInstruction);
    }
    sections.push(`## Team Runtime\n\n${renderTeamRuntimeInstruction(input.memberTeamContext)}`);
  }
  sections.push(
    renderWorkingEnvironmentSection(workspaceRootPath),
    BASH_OPERATING_PRACTICE_SECTION,
    FILE_AND_DIRECTORY_PRACTICE_SECTION,
  );
  const prompt = sections.join("\n\n");
  assertNoUnresolvedPlaceholders(prompt);
  return prompt;
};
