# Collaborator mentions and agent prompt: source investigation

Package: collaborator-prompt-explanation-2026-10-02
Outcome: informational investigation complete; no requirements/design/implementation requested.
Original request: inspect what collaborator mention prompts look like and the parts of the whole agent prompt; no worktree needed.
Constraints: no worktree created, no repository files changed; report outside checkout.
Approval: N/A, current-behavior explanation only. SR: N/A. Requirements/design/review artifacts: N/A — not applicable.
Workspace: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo
Base: existing checkout, no base refresh, branching or finalization requested.
Revision: e04cfef23550c3b78286a53befc6bd5d71fb1061
Next expected action: return explanation to user. No specialist work requested.
Evidence: source inspection, not a live model request capture; exact authored identity/team instructions and provider-added context depend on selected definition and runtime.

## Findings
1. Frontend sends chosen mentions as kind + definition_id alongside user content (max 8 unique). Server admits/reuses entries and appends a canonical mention note to the focused agent's user message, not to its system prompt. Raw @ text alone is not the structured admission signal.
2. Note contains name, Agent/Agent Team kind, logical address and fixed send_message_to/delegate_task guidance. It does not inline the collaborator's instructions, skills, full team definition or conversation.
3. Mention admission registers new collaborators Offline; it does not send them the original request. The focused agent must brief them via send_message_to (existing/address instance) or delegate_task (new copy). A team address reaches its coordinator.
4. Shared authored prompt order: Agent Identity (name, optional description, optional Responsibilities and Boundaries from agent definition); then either standalone Collaboration guidance and own address, or optional Team Instruction plus AgentTeam Addressing and AgentTeam Collaboration. With no member context only identity is composed.
5. Native AutoByteus additionally appends Working Environment, Bash Operating Practice, File And Directory Practice, then configured Skills catalog/rules at bootstrap. Catalog provides name/description/SKILL.md path, not whole skill file.
6. Codex receives shared composition as baseInstructions (developerInstructions null in bootstrap); Claude receives it as systemPrompt. Skills are discovered/materialized in runtime workspace directories. Runtime tool schemas, environment/repo guidance and history are distinct parts of model context, not all serialized by this composer. Provider additions are not established by this inspection.
7. Collaboration tools are automatically send_message_to and delegate_task for member contexts; get_handoff_rules only team-scoped. list_available_agents is opt-in. Rules are fetched with tool, not embedded as a full routing table in this composition.
8. User-selected skills can prefix the user message with 'Use the <name> skill for this request.' Codex maps attachments to reference paths and image inputs; native context processor can inline readable text file content in [Context]/[Message] sections. These are separate from mention wording.
9. Receiver message wrapper: 'You received a message from sender name: <name>, sender id: <run id>\nmessage:\n<content>' plus optional Reference files list. Delegated copy gets delegator address/run ID, Description and optional Reference files. No automatic whole-host-history copy is present in these message builders.

## Evidence limitations
No particular agent definition/run was requested, so this establishes source templates and composition, not one exact complete provider wire prompt. No tests run: read-only code explanation.

## Source snapshots

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts

```ts
import { z } from "zod";
import { agentAddressSchema, nonEmptyStringSchema } from "./schema-helpers.js";

/**
 * One user mention of a shared definition, sent with a live-run message.
 * The server re-validates every mention; the client never decides eligibility.
 */
export const collaboratorMentionKindSchema = z.enum(["agent", "agent_team"]);
export type CollaboratorMentionKind = z.infer<typeof collaboratorMentionKindSchema>;

export const COLLABORATOR_MENTIONS_MAX = 8;

export const collaboratorMentionDtoSchema = z.object({
  kind: collaboratorMentionKindSchema,
  definition_id: nonEmptyStringSchema,
}).strict();
export type CollaboratorMentionDto = Readonly<z.infer<typeof collaboratorMentionDtoSchema>>;

/** Optional `mentions` field of every live SEND_MESSAGE payload: at most 8, unique by (kind, definition_id). */
export const collaboratorMentionsDtoSchema = z.array(collaboratorMentionDtoSchema)
  .max(COLLABORATOR_MENTIONS_MAX)
  .superRefine((mentions, context) => {
    const seen = new Set<string>();
    for (const mention of mentions) {
      const key = `${mention.kind}\0${mention.definition_id}`;
      if (seen.has(key)) {
        context.addIssue({ code: "custom", message: `Mention '${mention.definition_id}' is repeated.` });
      }
      seen.add(key);
    }
  });

export type MentionedCollaborator = Readonly<{
  name: string;
  kind: CollaboratorMentionKind;
  address: string;
}>;

export type ParsedCollaboratorMentionNote = Readonly<{
  /** The user's own text before the note; empty for a mention-only message. */
  text: string;
  collaborators: readonly MentionedCollaborator[];
}>;

const NOTE_HEADING = "[Mentioned collaborators]";
const NOTE_GUIDANCE =
  "Message a collaborator with send_message_to and its address; it starts on its first message. delegate_task to its address spawns a new copy instead, which you follow up by run ID.";
/** The guidance line of notes written before REQ-009; still recognized so saved history reads unchanged. */
const RELEASED_NOTE_GUIDANCE =
  "Message a collaborator with send_message_to and its address; it starts on its first message.";
const KIND_LABELS: Readonly<Record<CollaboratorMentionKind, string>> = Object.freeze({
  agent: "Agent",
  agent_team: "Agent Team",
});
const ENTRY_PATTERN = /^- (.+) \((Agent|Agent Team)\) at (\/\S+)$/;

const singleLine = (value: string, label: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const entryLine = (collaborator: MentionedCollaborator): string => {
  const address = agentAddressSchema.parse(collaborator.address);
  if (address === "/") throw new Error("A mentioned collaborator needs a non-root address.");
  return `- ${singleLine(collaborator.name, "Collaborator name")} (${KIND_LABELS[collaborator.kind]}) at ${address}`;
};

/**
 * The one owner of the mention-note wording (server compose, web parse):
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team" }])
 *   === "Please ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nMessage a collaborator with send_message_to …"
 */
export const composeCollaboratorMentionNote = (
  text: string,
  collaborators: readonly MentionedCollaborator[],
): string => {
  if (collaborators.length === 0) return text;
  const note = [NOTE_HEADING, ...collaborators.map(entryLine), NOTE_GUIDANCE].join("\n");
  return text.trim() ? `${text}\n\n${note}` : note;
};

/** Recognizes only a note at the very end of the content, in exactly the composed form. */
export const parseCollaboratorMentionNote = (content: string): ParsedCollaboratorMentionNote | null => {
  if (![NOTE_GUIDANCE, RELEASED_NOTE_GUIDANCE].some((guidance) => content.endsWith(`\n${guidance}`))) return null;
  const headingAt = content.startsWith(`${NOTE_HEADING}\n`)
    ? 0
    : content.lastIndexOf(`\n\n${NOTE_HEADING}\n`);
  if (headingAt < 0) return null;
  const noteStart = headingAt === 0 && content.startsWith(NOTE_HEADING) ? 0 : headingAt + 2;
  const lines = content.slice(noteStart).split("\n");
  const entries = lines.slice(1, -1);
  if (entries.length === 0) return null;
  const collaborators: MentionedCollaborator[] = [];
  for (const line of entries) {
    const match = ENTRY_PATTERN.exec(line);
    if (!match) return null;
    collaborators.push(Object.freeze({
      name: match[1]!,
      kind: match[2] === "Agent" ? "agent" : "agent_team",
      address: match[3]!,
    }));
  }
  return Object.freeze({
    text: noteStart === 0 ? "" : content.slice(0, headingAt),
    collaborators: Object.freeze(collaborators),
  });
};

/**
 * The code every transport uses when a mentioned collaborator cannot be added on send: nothing
 * is added and the message is not posted. Transports carry the collaborator's name with it.
 */
export const COLLABORATOR_ADD_FAILED = "COLLABORATOR_ADD_FAILED";

export const collaboratorMentionNote = Object.freeze({
  compose: composeCollaboratorMentionNote,
  parse: parseCollaboratorMentionNote,
});

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts

```ts
import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { renderTeamCollaborationInstruction } from "../../agent-team-execution/services/team-collaboration-instruction-renderer.js";
import { renderStandaloneCollaborationInstruction } from "../../agent-run-collaboration/prompt/standalone-collaboration-instruction.js";
import {
  BASH_OPERATING_PRACTICE_SECTION,
  FILE_AND_DIRECTORY_PRACTICE_SECTION,
  renderAgentIdentitySection,
  renderTeamInstructionSection,
  renderWorkingEnvironmentSection,
} from "./carpenter-prompt-sections.js";

export type SharedCarpenterPromptComposerInput = {
  agentDefinition: AgentDefinition;
  memberExecutionContext?: MemberExecutionContext | null;
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
  if (member && !member.teamScoped) {
    // The standalone Agent-root host, or a task Agent directly under it: no Team, no handoffs.
    sections.push(renderStandaloneCollaborationInstruction({ memberAddress: member.identity.memberAddress }));
  } else if (member) {
    const teamInstruction = renderTeamInstructionSection(member.authoredEnclosingScopeInstruction);
    if (teamInstruction) {
      sections.push(teamInstruction);
    }
    sections.push(renderTeamCollaborationInstruction(member));
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

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts

```ts
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

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-run-collaboration/prompt/standalone-collaboration-instruction.ts

```ts
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

/**
 * Collaboration guidance for a member that belongs to no Team: the host of a standalone Agent
 * run, or a collaborator Agent (or copy) directly under it. It has `send_message_to` and
 * `delegate_task` but no handoff rules (REQ-009 wording). Kept short: every eligible
 * standalone agent gets it.
 */
export const renderStandaloneCollaborationInstruction = (input: {
  memberAddress: AgentTeamAddress;
}): string => [
  "## Collaboration",
  "",
  "You can work with other agents and agent teams: the ones the user brings into this run, and any available agent or team.",
  "",
  "- A user message may end with a `[Mentioned collaborators]` note that lists each mentioned Agent or Agent Team with its address. Each one is already in the run.",
  "- `send_message_to` with an exact address as `recipient_address` reaches the one instance at that address; an available agent or team that is not yet in the run is brought in on first use and keeps its conversation. A message to an Agent Team goes to its coordinator.",
  "- `delegate_task` with an address always spawns a new, separate copy with your work description as its first message; copies can work in parallel. Follow up on a copy with `send_message_to` and its `target_agent_run_id`.",
  "- If you have `list_available_agents`, it lists the available agents and teams with their addresses.",
  "- Do not claim that a message or delegation succeeded unless the tool confirms it.",
  "",
  `Your address in this run is \`${input.memberAddress}\`.`,
].join("\n");

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-team-execution/services/member-collaboration-instruction-renderer.ts

```ts
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION } from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

const MEMBER_ADDRESS_PLACEHOLDER = "{{member_address}}";

const AGENT_TEAM_ADDRESSING_INSTRUCTION_TEMPLATE = [
  "## AgentTeam Addressing",
  "",
  "AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.",
  "",
  "The root AgentTeam is represented by `/`. Its display or metadata name is not included in any address.",
  "",
  "The following example illustrates the address structure:",
  "",
  "/",
  "├── /A              (Agent)",
  "├── /B              (Agent)",
  "└── /C              (nested AgentTeam)",
  "    ├── /C/D         (Agent)",
  "    └── /C/E         (Agent)",
  "",
  "In this example:",
  "",
  "- `/A` and `/B` are Agents directly under the root AgentTeam.",
  "- `/C` is an AgentTeam directly under the root AgentTeam.",
  "- `/C/D` and `/C/E` are Agents directly inside AgentTeam `/C`.",
  "- Each `/` separates one parent-to-child level.",
  "",
  "The letters in this example are placeholders only. They do not identify available recipients. Use only an exact canonical address made available in your current AgentTeam context.",
  "",
  "Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/` at the root AgentTeam. Copy that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.",
  "",
  "Your Agent address is:",
  "",
  MEMBER_ADDRESS_PLACEHOLDER,
  "",
  "Sending a message to an AgentTeam address delivers it through that AgentTeam's configured coordinator.",
].join("\n");

export const renderMemberCollaborationInstruction = (input: {
  memberAddress: AgentTeamAddress;
}): string => [
  AGENT_TEAM_ADDRESSING_INSTRUCTION_TEMPLATE.replace(
    MEMBER_ADDRESS_PLACEHOLDER,
    () => input.memberAddress,
  ),
  AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION,
].join("\n\n");

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts

```ts
const lines = (...values: string[]): string => values.join("\n");

const RULE_BASED_HANDOFF_LLM_INSTRUCTION = [
  "When you finish your own work or are blocked, call `get_handoff_rules`.",
  "Evaluate the returned rules against your outcome. Select the single rule whose",
  "`when` condition most specifically applies, and notify only its `recipient_address`",
  "using `send_message_to`. Do not notify additional recipients for the same outcome.",
  "If no rule applies, finish normally.",
].join(" ");

export const SEND_MESSAGE_TO_LLM_DESCRIPTION = lines(
  "Send one self-contained ordinary message to the one Agent or AgentTeam instance",
  "at an address, or to one exact AgentRun. Use exactly one selector:",
  "recipient_address for one canonical absolute non-root Agent-or-AgentTeam",
  "address, or target_agent_run_id for one exact AgentRun. An Agent address",
  "reaches that Agent's instance; an AgentTeam address reaches that Team",
  "instance's coordinator; inside your own team instance, a teammate's address",
  "reaches the member of that same instance. An available agent or team that is",
  "not yet in the run is brought in on first use, and later messages reach that",
  "same instance. A run ID reaches an existing AgentRun only, including a",
  "shut-down delegated agent (restored with its conversation), and never brings",
  "anything in. On success, it returns the exact AgentRun that accepted the",
  "message as flat target_agent_run_id; on rejection, target_agent_run_id is null.",
);

export const SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION =
  "Canonical absolute non-root Agent-or-AgentTeam address beginning with '/'. It reaches the one instance at that address: an Agent's instance, or an AgentTeam instance's coordinator; inside your own team instance, a teammate's address reaches the member of that same instance. An available agent or team that is not yet in the run is brought in on first use. Provide either recipient_address or target_agent_run_id, never both.";

export const SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION =
  "Exact AgentRun.runId to receive an ordinary message: any AgentRun in the same root, including a shut-down delegated agent (restored with its conversation before delivery), or a currently active AgentRun elsewhere. Unknown run IDs are rejected; a run ID never brings anything in. Provide either target_agent_run_id or recipient_address, never both.";

export const DELEGATE_TASK_LLM_DESCRIPTION = lines(
  "Spawn one new copy of an Agent or AgentTeam and give it this work as its",
  "first message. recipient_address identifies what to copy: a mounted Agent or",
  "AgentTeam, a collaborator, or an available agent or team that is not yet in",
  "the run. Every call spawns another copy, so copies can work in parallel; an",
  "AgentTeam copy's coordinator receives the work. The first message includes",
  "your address and AgentRun ID so the copy can reply. On success it returns the",
  "copy's target_agent_run_id; if nothing was started,",
  "target_agent_run_id is null and message explains why. Follow up on the copy",
  "only by its run ID through send_message_to.",
);

export const DELEGATE_TASK_RECIPIENT_ADDRESS_DESCRIPTION =
  "Exact canonical absolute non-root address beginning with '/' of the Agent or AgentTeam to copy: a mounted one, a collaborator, or an available agent or team. Every call spawns a new copy; an AgentTeam copy's coordinator receives the work.";

export const DELEGATE_TASK_DESCRIPTION_FIELD_DESCRIPTION =
  "Complete ready-to-run work description: objective, context, scope, constraints, done conditions, expected output, and reference guidance. delegate_task itself delivers this as the new instance's first message; do not resend it with send_message_to.";

export const DELEGATE_TASK_REFERENCE_FILES_DESCRIPTION =
  "Optional absolute local file paths the new instance should inspect. Use full filesystem paths; relative paths and URLs are rejected.";

export const AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION = lines(
  "## AgentTeam Collaboration",
  "",
  "Choose the collaboration mode based on your primary intent.",
  "`send_message_to` reaches the one instance at an address, brought in on first use.",
  "`delegate_task` always spawns a new copy of an Agent or AgentTeam for new work.",
  "Never use both to deliver the same work.",
  "",
  "### Ordinary Communication",
  "",
  "Use `send_message_to` to communicate with the one Agent or AgentTeam instance",
  "at an address.",
  "",
  "- When `recipient_address` identifies an Agent, the message is delivered to",
  "  that Agent's instance.",
  "- When `recipient_address` identifies an AgentTeam, the message is delivered",
  "  to that Team instance's coordinator.",
  "- Inside your own team instance, a teammate's address reaches the member of",
  "  that same instance.",
  "- An available agent or team that is not yet in the run is brought in on",
  "  first use; later messages to its address reach the same instance.",
  "- When an exact AgentRun ID is known, `target_agent_run_id` may instead",
  "  select that specific execution: any AgentRun in the same root, including a",
  "  shut-down delegated agent, or a currently active AgentRun elsewhere. A run ID",
  "  never brings anything in.",
  "",
  "A successful call returns the exact AgentRun that accepted the message as",
  "`target_agent_run_id`. For an AgentTeam recipient, this is its coordinator",
  "AgentRun.",
  "",
  "### Delegated Agents",
  "",
  "Use `delegate_task` to spawn a new copy of an Agent or AgentTeam for new work.",
  "The `recipient_address` identifies what to copy (a mounted Agent or AgentTeam,",
  "a collaborator, or an available agent or team); it is not an alias for the new",
  "copy. Every call spawns another copy, so copies can work in parallel.",
  "",
  "- The work description and reference files become the copy's first message,",
  "  together with your address and AgentRun ID.",
  "- On success, `target_agent_run_id` is the new copy (for an AgentTeam, its",
  "  coordinator). If `target_agent_run_id` is null, nothing was started and",
  "  `message` explains why; correct the problem and delegate again, or report",
  "  the failure.",
  "",
  "Follow up on a copy only through `send_message_to` with its",
  "`target_agent_run_id`, in both directions. A copy that stays quiet is shut",
  "down after a while; a message to its run ID restores it with its",
  "conversation, so follow-ups remain possible at any time.",
  "",
  "### Rule-Based Handoffs",
  "",
  RULE_BASED_HANDOFF_LLM_INSTRUCTION,
  "",
  "Do not claim that a message, delegation, or handoff succeeded unless the",
  "corresponding tool confirms success.",
);

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts

```ts
import path from 'path';
import { SkillRegistry } from '../../skills/registry.js';
import type { AgentContextLike } from '../context/agent-context-like.js';

export const appendConfiguredSkillsCatalog = (
  systemPrompt: string,
  context: AgentContextLike
): string => {
  const agentId = context.agentId;
  const registry = new SkillRegistry();
  const configuredSkills = context.config?.skills ?? [];
  if (configuredSkills.length === 0) {
    console.info(`Agent '${agentId}': No configured skills. Skipping skill catalog.`);
    return systemPrompt;
  }

  const catalogSkills = configuredSkills
    .map((skillName) => registry.getSkill(skillName))
    .filter((skill): skill is NonNullable<typeof skill> => {
      if (!skill) {
        return false;
      }
      const name = skill.name?.trim() ?? '';
      const description = skill.description?.trim() ?? '';
      const rootPath = skill.rootPath?.trim() ?? '';
      if (!name || !description || !rootPath) {
        console.warn(`Agent '${agentId}': Omitting invalid configured skill catalog entry.`);
        return false;
      }
      return path.isAbsolute(path.resolve(rootPath, 'SKILL.md'));
    });

  if (!catalogSkills.length) {
    console.info(
      `Agent '${agentId}': Configured skills produced no catalog entries. Skipping skill catalog.`
    );
    return systemPrompt;
  }

  const catalogEntries = catalogSkills.map(
    (skill) =>
      `- **${skill.name.trim()}**: ${skill.description.trim()}\n` +
      `  - **SKILL.md:** \`${path.resolve(skill.rootPath, 'SKILL.md')}\``
  );

  const skillsBlock = `\n\n## Skills

### Skill Catalog

${catalogEntries.join('\n')}

### Rules for Using Skills

- Use a configured skill whenever it applies to the task.
- When no configured skill applies, use the best available general approach.
- When an applicable configured skill covers only part of the task, follow it for the covered part and use another available technique for the uncovered part.
- Before beginning work governed by a skill, read its \`SKILL.md\` from the exact path listed above.
- Resolve every relative path mentioned by a skill from the directory containing that skill's \`SKILL.md\`.
`;

  console.info(
    `Agent '${agentId}': Added ${catalogEntries.length} configured skill catalog entries with paths.`
  );
  return systemPrompt + skillsBlock;
};

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts

```ts
import { BROWSER_TOOL_NAMES } from "../../agent-tools/browser/browser-tool-contract.js";
import { MEDIA_TOOL_NAMES } from "../../agent-tools/media/media-tool-contract.js";
import {
  DELEGATE_TASK_TOOL_NAME,
  TASK_DELEGATION_TOOL_NAMES,
} from "../../agent-tools/task-delegation/task-delegation-tool-contract.js";
import { PUBLISH_ARTIFACTS_TOOL_NAME } from "../../services/published-artifacts/published-artifact-tool-contract.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../agent-communication/services/send-message-to-tool-contract.js";
import { GET_HANDOFF_RULES_TOOL_NAME } from "../../agent-communication/services/get-handoff-rules-tool-contract.js";
import { LIST_AVAILABLE_AGENTS_TOOL_NAME } from "../../agent-tools/agent-discovery/list-available-agents-contract.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";

/**
 * Collaboration tools every member context always gets: `send_message_to` and `delegate_task`
 * for every member, plus `get_handoff_rules` only for Team-scoped members (REQ-012).
 */
export const automaticCollaborationToolNames = (
  context: MemberExecutionContext | null | undefined,
): readonly string[] => {
  if (!context) return [];
  return context.teamScoped
    ? [GET_HANDOFF_RULES_TOOL_NAME, SEND_MESSAGE_TO_TOOL_NAME, DELEGATE_TASK_TOOL_NAME]
    : [SEND_MESSAGE_TO_TOOL_NAME, DELEGATE_TASK_TOOL_NAME];
};

const asTrimmedToolName = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export type RuntimeAgentToolExposure = {
  requestedToolNames: string[];
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  enabledTaskDelegationToolNames: string[];
  sendMessageToEnabled: boolean;
  getHandoffRulesEnabled: boolean;
  publishArtifactsEnabled: boolean;
  /** Opt-in only: selected by the agent definition (REQ-001), never added automatically. */
  listAvailableAgentsEnabled: boolean;
};

export const resolveRuntimeAgentToolExposure = (agentDefinition: {
  toolNames?: string[] | null;
} | null, memberExecutionContext?: MemberExecutionContext | null): RuntimeAgentToolExposure =>
  buildRuntimeAgentToolExposure(agentDefinition?.toolNames ?? null, memberExecutionContext);

export const buildRuntimeAgentToolExposure = (
  toolNames: Iterable<unknown> | null | undefined,
  memberExecutionContext?: MemberExecutionContext | null,
): RuntimeAgentToolExposure => {
  const normalizedConfiguredNames = Array.from(toolNames ?? [])
    .map((value) => asTrimmedToolName(value))
    .filter((value): value is string => Boolean(value));
  const requestedToolNames = Array.from(new Set([
    ...normalizedConfiguredNames,
    ...automaticCollaborationToolNames(memberExecutionContext),
  ]));
  const requestedToolNameSet = new Set(requestedToolNames);

  return {
    requestedToolNames,
    enabledBrowserToolNames: requestedToolNames.filter((toolName) =>
      BROWSER_TOOL_NAMES.has(toolName),
    ),
    enabledMediaToolNames: requestedToolNames.filter((toolName) =>
      MEDIA_TOOL_NAMES.has(toolName),
    ),
    enabledTaskDelegationToolNames: requestedToolNames.filter((toolName) =>
      TASK_DELEGATION_TOOL_NAMES.has(toolName),
    ),
    sendMessageToEnabled: requestedToolNameSet.has(SEND_MESSAGE_TO_TOOL_NAME),
    getHandoffRulesEnabled: requestedToolNameSet.has(GET_HANDOFF_RULES_TOOL_NAME),
    publishArtifactsEnabled: requestedToolNameSet.has(PUBLISH_ARTIFACTS_TOOL_NAME),
    listAvailableAgentsEnabled: requestedToolNameSet.has(LIST_AVAILABLE_AGENTS_TOOL_NAME),
  };
};

export const toRuntimeAgentToolNameSet = (
  exposure: RuntimeAgentToolExposure,
): Set<string> => new Set(exposure.requestedToolNames);

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-runtime-builder.ts

```ts
import { createHash } from "node:crypto";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { rootExecutionIdentityKey } from "../domain/root-execution-identity.js";
import type { RootCommunicationDeliveryInput } from "./root-communication-adapter.js";
import type { CollaborationCommunicationMessageV1 } from "./collaboration-communication-message-v1.js";

const references = (values: readonly string[] | null | undefined): readonly string[] => Object.freeze([
  ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
]);
const hash = (values: readonly string[]): string => createHash("sha256")
  .update(values.join("\0")).digest("base64url").slice(0, 32);

export const buildRootCommunicationInputMessage = (input: {
  delivery: RootCommunicationDeliveryInput;
  message: CollaborationCommunicationMessageV1;
}): AgentInputUserMessage => {
  const files = references(input.message.referenceFiles);
  const fileBlock = files.length ? `\n\nReference files:\n${files.map((file) => `- ${file}`).join("\n")}` : "";
  const content = `You received a message from sender name: ${input.delivery.senderDisplayName}, sender id: ${input.delivery.senderIdentity.agentRunId}\nmessage:\n${input.message.content}${fileBlock}`;
  const rootKey = rootExecutionIdentityKey(input.delivery.senderIdentity.root);
  const messageId = `memberinput_${hash([rootKey, input.delivery.receiverIdentity.agentRunId, input.message.messageId, content])}`;
  return new AgentInputUserMessage(content, SenderType.AGENT, null, {
    message_id: messageId,
    recipient_input_message_id: messageId,
    dedupe_key: `member_input:${rootKey}:${input.delivery.receiverIdentity.agentRunId}:${messageId}`,
    input_origin: "inter_agent_delivery",
    sender_agent_id: input.delivery.senderIdentity.agentRunId,
    sender_agent_name: input.delivery.senderDisplayName,
    sender_member_address: input.delivery.senderIdentity.memberAddress,
    receiver_member_address: input.delivery.receiverIdentity.memberAddress,
    original_message_type: input.message.messageType,
    root_subject_kind: input.delivery.senderIdentity.root.rootSubjectKind,
    root_run_id: input.delivery.senderIdentity.root.rootRunId,
    parent_communication_message_id: input.message.messageId,
    reference_files: files,
  });
};

```

### /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-input.ts

```ts
import { markTaskDelegationSystemTaskNotificationMetadata } from "../events/task-system-input-presentation.js";
import fs from "node:fs/promises";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import { TaskDelegationError } from "./task-delegation-command.js";

export const requireTaskString = (value: string, field: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new TaskDelegationError("VALIDATION_ERROR", `${field} is required.`);
  return normalized;
};

export const validateTaskReferenceFiles = async (values: readonly string[]): Promise<readonly string[]> => {
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!path.isAbsolute(normalized) || path.normalize(normalized) !== normalized) {
      throw new TaskDelegationError("INVALID_REFERENCE_FILE", `Reference file '${value}' must be a normalized absolute path.`);
    }
    const stat = await fs.stat(normalized);
    if (!stat.isFile()) throw new TaskDelegationError("INVALID_REFERENCE_FILE", `Reference '${normalized}' is not a file.`);
    result.push(normalized);
  }
  return Object.freeze(result);
};

/** The child's first message: the delegated work plus who delegated it (address and run ID). */
export const buildTaskAssigneeWorkPacket = (input: {
  delegator: CollaborationMemberExecutionIdentity;
  description: string;
  referenceFiles: readonly string[];
}): AgentInputUserMessage => new AgentInputUserMessage([
  `Task delegator address: ${input.delegator.memberAddress}`,
  `Task delegator AgentRun ID: ${input.delegator.agentRunId}`,
  "", "Description:", input.description,
  ...(input.referenceFiles.length ? ["", "Reference files:", ...input.referenceFiles.map((file) => `- ${file}`)] : []),
].join("\n"), SenderType.SYSTEM, null, markTaskDelegationSystemTaskNotificationMetadata({}));

```

## Routing
get_handoff_rules returned architecture-complete review/implementation and delivery-evidence-gap routes. None applies to an informational source investigation. Returning directly to user; no handoff sent.

## Follow-up: Carpenter communication section
User recalls a Communication section and asks to inspect Carpenter composition. Re-read current composer, member renderer, canonical collaboration contract, prompt-engineering documentation and standalone composer tests. Confirmed exact subsection `### Ordinary Communication` inside `## AgentTeam Collaboration`. Previous response selected standalone branch, which instead emits short `## Collaboration`; team branch is distinct. Shared team output is identity, optional team instruction, addressing, collaboration (ordinary communication, delegated agents, rule-based handoffs). Composer is deterministic TypeScript composition, not a generative model. Agent-authored instructions come from definition; fixed collaboration text comes from platform renderer. Mention note remains user-message composition outside Carpenter. No code changes, no requirement/architecture changes, no tests executed. Next action: show corrected complete illustrative team-scoped shared prompt with simple authored identity/team text, and distinguish it from native suffixes/provider context.

Follow-up routing: rules rechecked; no rule applies to evidence-only explanation. Return to user, no handoff.

## Follow-up: work handoff versus conversational acknowledgement

### Request and authority
User reports Product coordinator sometimes immediately replies instead of starting its skill-defined work after Solution Designer sends a mention-derived request or explicit handoff. Requested analysis only; no implementation authorized. User's intended behavior: recipient executes its own role and applicable skills to a real workflow outcome, then routes that outcome with send_message_to. Preserve skill-defined intermediate outcomes, blockers and user approval gates. No worktree or repository changes. Stable package unchanged, no implementation-ready requirements/design claim.

### Findings supported by inspected source
- agent-team-collaboration-llm-contract.ts:11-24 calls send_message_to an 'ordinary message'; :53-108 frames the distinction as Ordinary Communication versus Delegated Agents, and says delegate_task is for 'new work'. No corresponding recipient-side work intake/execution section. Existing result rule (:3-9) does say finish own work or blocked before get_handoff_rules, so the gap is not a total absence of completion guidance.
- send-message-to-tool-contract.ts:14-18 asks for an email-like self-contained body and paths. Contrast delegate_task description requirement (:47-48 in shared contract): objective, context, scope, constraints, done conditions, expected output. This is asymmetrical sender guidance.
- root-communication-runtime-builder.ts:18-36 emits 'You received a message from sender name ... message: ...' plus reference paths. original_message_type is metadata, not included in its rendered text. global-agent-run-message-runtime-builders.ts duplicates this generic visible wrapper for direct run-ID delivery. Codex user input mapper uses content and contextFiles rather than rendering message-type metadata.
- standalone-collaboration-instruction.ts:9-23 likewise focuses on reachability, instances, copies and tools, not receiving assigned work.
- get-handoff-rules-service.ts returns rule conditions and recipient addresses. root communication engine and dispatcher validate/deliver messages; these inspected paths do not verify that a skill ran or artifacts were completed. Tool success proves delivery/acceptance, not task completion.
- Product experience skill explicitly requires work, artifacts, user review/confirmation and status-specific outcomes (Handoff Rules :489-522), not a bare acknowledgement. It also allows Baseline Needed, Requirement Impact, Not Recommended and Blocked, so 'no handoff until final prototype' would be incorrect.
- Separate consistency defect: Product skill says every matching rule; canonical platform prompt says single most-specific rule. This can affect routing, but does not establish the reported immediate-reply cause.

### Diagnosis (inference, not confirmed incident cause)
The platform strongly explains addressing/instance mechanics but weakly specifies recipient task execution. Ordinary communication/email/message vocabulary plus a generic receive wrapper can cue a conversational answer, while work language is concentrated around delegate_task. The missing invariant is: work delivered through send_message_to is still work governed by the receiving agent's own role/skills; acknowledgement is not completion. Renaming a heading alone would not establish this contract.

### Recommended intended behavior (proposal, not implemented)
1. Recognize whether input is work, a result for the current workflow, clarification, or informational notification.
2. For assigned work, read referenced handoff materials, apply own agent instructions and applicable skills, and perform/resume the owned stage to its skill-defined completion or legitimate intermediate outcome/blocker/approval boundary.
3. No acknowledgement-only send_message_to followed by ending the turn. Short progress text is permissible when followed by actual work. Do not invent new work for pure notifications or acknowledgements; prevent reply loops.
4. At a qualifying outcome, persist role-required evidence, classify result, evaluate handoff rules when available, and route the result. Do not automatically reply to sender regardless of the configured destination.
5. Apply same work contract to mention-derived requests, rule-based handoffs and delegated work, without changing existing-instance vs new-copy semantics. Treat requests as self-contained briefs, not forced resets: an existing collaborator can retain history.
6. Sender must state concrete requested outcome, scope/constraints, references and expected deliverables, not merely announce that a collaborator was mentioned. Missing essential input calls for focused clarification/blocker, not invented requirements.

### Potential change owners (not authoritative design)
Shared Carpenter collaboration contract and standalone equivalent for receiver behavior; send_message_to tool contract for self-contained work briefs; same-root and direct runtime message wrappers for intent clarity; role skill/routing policy consistency separately. Avoid labeling every inter-agent message a new work request. Structured intent would require an explicit behavior/schema decision rather than assuming existing free-form message_type enforces it.

### Verification needed
No failing run or actual Product coordinator agent.md/agent-config/supplied prompt was provided or identified. Asked user asynchronously for original outgoing content and immediate recipient reply. To confirm incident: inspect sender brief and reference artifacts, receiver's actual supplied role/team prompt and skill exposure, reads/tool actions, exact reply, and resulting outcome. Distinguish genuine blocker/approval/interim-stage stop from acknowledgement-only termination. Static inspection does not prove model causality or runtime skill-loading correctness. No tests run; no reproduction claimed.

### Prospective regression scenarios
Concrete request via mention and via handoff leads to applicable skill work before terminal result; existing collaborator resumes rather than resets; required user approval/intermediate bootstrap preserved; missing input yields precise question/blocker; informational pass/ack causes no new work or echo; routing follows classified outcome rather than reflexive return to sender. Text snapshot tests alone cannot prove runtime execution behavior.

Next action: return evidence-grounded analysis and candidate wording to user. Approval state: analysis only, no proposed change approved or applied.

Analysis routing: rules checked after persistence. No rule applies to current-behavior analysis and unapproved proposals. Return to user without specialist handoff.

## Follow-up: collaborator result return without a configured handoff
User clarifies no predefined cross-team handoff exists for ad-hoc collaborators; work execution must not depend on having handoff rules. Inspected member-instance-scope.ts, its unit tests, collaborator-entry-builder.ts, runtime-agent-tool-exposure.ts and get-handoff-rules-service.ts. A collaborator Team retains its own rebased Team-local handoffs; scope resolver prioritizes a member's non-root hosting Team. An unconfigured root-level collaborator Agent receives no handoffs/instruction scope. Admission does not synthesize a cross-team return rule to the requester. Thus blanket 'collaborators have no handoff rules' is inaccurate, but user is correct about missing automatic cross-team return rules. Proposed concise contract: execute assigned work under own role/skills to defined outcome/blocker; use applicable configured workflow routing; when no rule applies, return result to requesting agent via send_message_to, rather than acknowledgement-only termination. Internal team handoff must not be bypassed or cause duplicate premature result return. This is proposed behavior, not already implemented enforcement. No repository edits/tests/worktree. User prefers concise, precise wording. Next action return clarification and short proposed text; no implementation approval requested or inferred.

Routing for collaborator-return clarification: no returned rule matches informational analysis. Return directly to user; no handoff.
