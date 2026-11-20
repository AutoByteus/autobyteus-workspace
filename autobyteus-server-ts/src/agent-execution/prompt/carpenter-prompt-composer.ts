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
import { NATIVE_LONG_RUNNING_COMMAND_SECTION } from "./long-running-command-sections.js";

type CarpenterPromptComposerInput = {
  agentDefinition: AgentDefinition;
  memberExecutionContext?: MemberExecutionContext | null;
  /** The Project the run was started under; its section is omitted when there is none. */
  project?: RunProjectContext | null;
  /** The agent's semantic memory folder (absolute); its section follows the Project's. Every agent has one. */
  semanticMemoryPath: string;
  /** The node's global semantic memory folder (absolute); its section follows the agent's own. */
  globalSemanticMemoryPath: string;
};

export type SharedCarpenterPromptComposerInput = CarpenterPromptComposerInput & {
  /** The runtime's "Long-Running Commands" section (`long-running-command-sections.ts`); placed last. */
  longRunningCommandSection: string;
};

export type NativeCarpenterPromptComposerInput = CarpenterPromptComposerInput & {
  workspaceRootPath: string;
};

const assertNoUnresolvedPlaceholders = (prompt: string): void => {
  if (/\{\{[^}]+\}\}/.test(prompt)) {
    throw new Error("Carpenter prompt contains an unresolved documentation placeholder.");
  }
};

const buildSharedCarpenterPromptSections = (
  input: CarpenterPromptComposerInput,
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
  if (!path.isAbsolute(input.semanticMemoryPath) || !path.isAbsolute(input.globalSemanticMemoryPath)) {
    throw new Error("Semantic memory folder must be an absolute path.");
  }
  sections.push(renderSemanticMemorySection(input.semanticMemoryPath), renderGlobalSemanticMemorySection(input.globalSemanticMemoryPath));
  return sections;
};

const finalizeCarpenterPrompt = (sections: string[]): string => {
  const prompt = sections.join("\n\n");
  assertNoUnresolvedPlaceholders(prompt);
  return prompt;
};

export const composeSharedCarpenterPrompt = (
  input: SharedCarpenterPromptComposerInput,
): string => {
  const longRunningCommandSection = input.longRunningCommandSection?.trim() ?? "";
  if (!longRunningCommandSection) {
    throw new Error("The runtime's long-running command section is required to compose the carpenter prompt.");
  }
  return finalizeCarpenterPrompt([...buildSharedCarpenterPromptSections(input), longRunningCommandSection]);
};

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
    NATIVE_LONG_RUNNING_COMMAND_SECTION,
  ]);
};
