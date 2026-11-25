import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { renderCollaborationSections } from "./collaboration-prompt-sections.js";
import type { RunProjectContext } from "../domain/run-project-context.js";
import {
  BASH_OPERATING_PRACTICE_SECTION,
  FILE_AND_DIRECTORY_PRACTICE_SECTION,
  renderAgentIdentitySection,
  renderProjectSection,
  renderGlobalSemanticMemorySection,
  renderSemanticMemorySection,
  renderTeamInstructionSection,
  renderWorkingEnvironmentSection,
} from "./carpenter-prompt-sections.js";

export type SharedCarpenterPromptComposerInput = {
  agentDefinition: AgentDefinition;
  memberExecutionContext?: MemberExecutionContext | null;
  /** The Project the run was started under; its section is omitted when there is none. */
  project?: RunProjectContext | null;
  /**
   * The agent's semantic memory folder (absolute); its section follows the Project's. Every agent has one; null only
   * when it could not be prepared for this run (logged, DEC-015), and then this run has no section for it.
   */
  semanticMemoryPath: string | null;
  /** The node's global semantic memory folder (absolute); its section follows the agent's own. Null as above. */
  globalSemanticMemoryPath: string | null;
};

const absoluteFolderOrNull = (folder: string | null): string | null => {
  if (folder !== null && !path.isAbsolute(folder)) throw new Error("Semantic memory folder must be an absolute path.");
  return folder;
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
  const member = input.memberExecutionContext;
  if (member) {
    // The agent's role (what it is), not whether it sits in a team run, picks its collaboration text.
    const teamInstruction = renderTeamInstructionSection(member.authoredEnclosingScopeInstruction);
    if (teamInstruction) sections.push(teamInstruction);
    sections.push(renderCollaborationSections(member));
  }
  if (input.project) sections.push(renderProjectSection(input.project));
  const agentFolder = absoluteFolderOrNull(input.semanticMemoryPath);
  const globalFolder = absoluteFolderOrNull(input.globalSemanticMemoryPath);
  if (agentFolder !== null) sections.push(renderSemanticMemorySection(agentFolder));
  if (globalFolder !== null) sections.push(renderGlobalSemanticMemorySection(globalFolder));
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
