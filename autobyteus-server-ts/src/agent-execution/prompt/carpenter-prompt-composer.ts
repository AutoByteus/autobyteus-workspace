import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";
import { renderTeamCollaborationInstruction } from "../../agent-team-execution/services/team-collaboration-instruction-renderer.js";
import {
  BASH_OPERATING_PRACTICE_SECTION,
  FILE_AND_DIRECTORY_PRACTICE_SECTION,
  renderAgentIdentitySection,
  renderTeamInstructionSection,
  renderWorkingEnvironmentSection,
} from "./carpenter-prompt-sections.js";

export type SharedCarpenterPromptComposerInput = {
  agentDefinition: AgentDefinition;
  memberTeamContext?: MemberTeamContext | null;
};

export type NativeCarpenterPromptComposerInput = SharedCarpenterPromptComposerInput & {
  workspaceRootPath: string;
};

const assertNoUnresolvedPlaceholders = (prompt: string): void => {
  if (/\{\{[^}]+\}\}/.test(prompt)) {
    throw new Error("Carpenter prompt contains an unresolved documentation placeholder.");
  }
};

const buildSharedCarpenterPromptSections = (
  input: SharedCarpenterPromptComposerInput,
): string[] => {
  if (!input.agentDefinition) {
    throw new Error("Agent definition is required to compose the carpenter prompt.");
  }

  const sections: string[] = [renderAgentIdentitySection(input.agentDefinition)];
  if (input.memberTeamContext) {
    const teamInstruction = renderTeamInstructionSection(input.memberTeamContext.teamInstruction);
    if (teamInstruction) {
      sections.push(teamInstruction);
    }
    sections.push(renderTeamCollaborationInstruction(input.memberTeamContext));
  }
  return sections;
};

const finalizeCarpenterPrompt = (sections: string[]): string => {
  const prompt = sections.join("\n\n");
  assertNoUnresolvedPlaceholders(prompt);
  return prompt;
};

export const composeSharedCarpenterPrompt = (
  input: SharedCarpenterPromptComposerInput,
): string => finalizeCarpenterPrompt(buildSharedCarpenterPromptSections(input));

export const composeNativeAutoByteusPrompt = (
  input: NativeCarpenterPromptComposerInput,
): string => {
  const workspaceRootPath = input.workspaceRootPath?.trim() ?? "";
  if (!workspaceRootPath || !path.isAbsolute(workspaceRootPath)) {
    throw new Error("Agent workspace must be a non-blank absolute path.");
  }

  return finalizeCarpenterPrompt([
    ...buildSharedCarpenterPromptSections(input),
    renderWorkingEnvironmentSection(workspaceRootPath),
    BASH_OPERATING_PRACTICE_SECTION,
    FILE_AND_DIRECTORY_PRACTICE_SECTION,
  ]);
};
