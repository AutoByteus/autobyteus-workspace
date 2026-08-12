import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import { containAuthoredMarkdownHeadings } from "./markdown-heading-containment.js";

const normalizeScalar = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().replace(/\r?\n|\r/g, " ").trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const normalizeBody = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const requirePromptScalar = (value: string | null | undefined, label: string): string => {
  const normalized = normalizeScalar(value);
  if (!normalized) {
    throw new Error(`${label} must be non-blank.`);
  }
  return normalized;
};

export const renderAgentIdentitySection = (agentDefinition: AgentDefinition): string => {
  const lines = ["## Agent Identity", "", `- Name: ${requirePromptScalar(agentDefinition.name, "Agent definition name")}`];
  const description = normalizeScalar(agentDefinition.description);
  if (description) {
    lines.push(`- Description: ${description}`);
  }
  const instructions = normalizeBody(agentDefinition.instructions);
  if (instructions) {
    lines.push("", "### Responsibilities and Boundaries", "", containAuthoredMarkdownHeadings(instructions, 3));
  }
  return lines.join("\n");
};

export const renderTeamInstructionSection = (teamInstruction: string | null): string | null => {
  const body = normalizeBody(teamInstruction);
  return body ? `## Team Instruction\n\n${containAuthoredMarkdownHeadings(body, 2)}` : null;
};

export const renderWorkingEnvironmentSection = (workspaceRootPath: string): string => `## Working Environment

- Agent workspace: \`${workspaceRootPath}\`
- Use skills from their skill package directories to work on tasks in the agent workspace.
- A skill package directory contains the skill's instructions and bundled assets. It is not the agent workspace, and reading the skill does not change the agent workspace.
- Resolve skill-package references from the skill package directory. Resolve task and project locations from the agent workspace unless an explicit target says otherwise.
- Do not modify a skill package unless the task explicitly targets that skill package.
- With no working-directory override, \`pwd\` returns the agent workspace. An explicit working directory changes only that command's location; it does not redefine the workspace.`;

export const BASH_OPERATING_PRACTICE_SECTION = `## Bash Operating Practice

- Use Bash as the primary interface for performing work in the agent workspace. Use it for workspace navigation, search, file reading, writing and editing, repository operations, processes, network operations, and project commands.
- Prefer deterministic, non-interactive, small, composable commands.
- Prefer project-native commands and format-aware tools such as \`git\`, \`npm\`, \`pnpm\`, \`pytest\`, \`jq\`, and project scripts when applicable.
- Use another provided tool when Bash cannot achieve the purpose.`;

export const FILE_AND_DIRECTORY_PRACTICE_SECTION = `## File And Directory Practice

- Locate files and directories by intent instead of broadly listing them. For content, use targeted searches such as \`rg -n "term" path\`. For file names, use \`rg --files path | rg "pattern"\`. Use constrained \`find\` commands only when filesystem traversal or metadata is the better fit.
- Read only the relevant content. Use \`cat\` for a complete small file, \`wc -l\` before a potentially broad read, \`sed -n '40,120p' file\` for an exact window, and \`nl -ba file | sed -n '40,120p'\` when line numbers matter. Prefer format-aware readers such as \`jq\` for structured data.
- Choose the narrowest deterministic edit that matches the file format and change shape. Prefer exact anchors for text, parser-aware tools for structured files, and quoted heredocs for new content. Replace important files through a temporary file when a direct in-place edit is not safely verifiable.
- Use explicit quoted paths and preserve unrelated content and existing changes. Before copying, moving, or deleting, verify the source and destination. Delete only when the task requires it and the target has been verified.
- Keep inspection, modification, and verification as separate commands when a failure would need diagnosis. Verify changes with a fitting check such as \`git diff -- path\`, targeted \`rg\`, a format parser, or a project-native test or validator.`;
