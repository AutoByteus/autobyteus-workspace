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

- Use Bash for workspace navigation, targeted search, repository and project commands, processes, network operations, and verification. Prefer deterministic, targeted commands over broad directory listings.
- For file content, follow \`File And Directory Practice\` and prefer the exposed dedicated file tools. Use Bash for file inspection or modification when those tools are unavailable or cannot complete the operation after recovery.
- Prefer non-interactive, small, composable, project-native commands.`;

export const FILE_AND_DIRECTORY_PRACTICE_SECTION = `## File And Directory Practice

- Locate files and directories by intent instead of broadly listing them. For content searches, use \`rg -n "term" path\`; for filename discovery, use \`rg --files path | rg "pattern"\`; use constrained \`find path -maxdepth N ...\` only when filesystem traversal or metadata is the goal.
- When exposed, use \`read_file\` for file reading, \`edit_file\` for targeted regional changes to an existing file, and \`write_file\` for new files or deliberate whole-file replacement.
- Before every targeted \`edit_file\` change, use \`read_file\` to read the relevant current content of the original file unless it was read recently and has not changed.
- Build the regional \`edit_file\` patch from that latest content and preserve unrelated content. If the edit context fails or the file changed, use \`read_file\` again for the affected content, construct a new patch, and retry; do not blindly retry an unchanged patch.
- Preserve unrelated content and existing changes. Verify important file changes with an appropriate read, diff, parser, test, or project-native check.`;
