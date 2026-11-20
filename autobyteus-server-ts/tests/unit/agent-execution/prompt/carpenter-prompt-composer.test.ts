import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { containAuthoredMarkdownHeadings } from "../../../../src/agent-execution/prompt/markdown-heading-containment.js";
import {
  ANTIGRAVITY_LONG_RUNNING_COMMAND_SECTION,
  CLAUDE_LONG_RUNNING_COMMAND_SECTION,
  CODEX_LONG_RUNNING_COMMAND_SECTION,
  GENERIC_LONG_RUNNING_COMMAND_SECTION,
  GROK_LONG_RUNNING_COMMAND_SECTION,
  NATIVE_LONG_RUNNING_COMMAND_SECTION,
} from "../../../../src/agent-execution/prompt/long-running-command-sections.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

const definition = (input: Partial<ConstructorParameters<typeof AgentDefinition>[0]> = {}) =>
  new AgentDefinition({
    name: " Builder\nAgent ",
    description: " Builds\nthings ",
    instructions: "## Scope\n\nDo work.\n\n```md\n# keep\n```\n\n###### Deep",
    ...input,
  });

const teamContext = (teamInstruction: string | null = "## Coordination\n\nShare results.") =>
  testMemberExecutionContext({
    teamRunId: "team-run",
    rootTeamRunId: "team-run",
    teamDefinitionId: "team-def",
    memberAddress: "/worker",
    coordinatorAddress: "/worker",
    agentRunId: "run-worker",
    teamInstruction,
    deliverInterAgentMessage: vi.fn(async () => undefined) as any,
  });

describe("composeNativeAutoByteusPrompt", () => {
  it("renders the exact ordered standalone foundation without role or fallbacks", () => {
    const prompt = composeNativeAutoByteusPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition({ role: "Ignored role" }),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberExecutionContext: null,
    });

    expect(prompt.indexOf("## Agent Identity")).toBeLessThan(prompt.indexOf("## Working Environment"));
    expect(prompt.indexOf("## Working Environment")).toBeLessThan(prompt.indexOf("## Bash Operating Practice"));
    expect(prompt.indexOf("## Bash Operating Practice")).toBeLessThan(prompt.indexOf("## File And Directory Practice"));
    expect(prompt.endsWith(`\n\n${NATIVE_LONG_RUNNING_COMMAND_SECTION}`)).toBe(true);
    expect(prompt).toContain("- Name: Builder Agent");
    expect(prompt).toContain("- Description: Builds things");
    expect(prompt).toContain("#### Scope");
    expect(prompt).toContain("```md\n# keep\n```");
    expect(prompt).toContain("**Deep**");
    expect(prompt).toContain("- Agent workspace: `/tmp/carpenter-workspace`");
    expect(prompt).toContain(
      "Use Bash for workspace navigation, targeted search, repository and project commands, processes, network operations, and verification.",
    );
    expect(prompt).toContain('For content searches, use `rg -n "term" path`;');
    expect(prompt).toContain("use `rg --files path | rg \"pattern\"`");
    expect(prompt).toContain("use constrained `find path -maxdepth N ...`");
    expect(prompt).toContain(
      "Before every targeted `edit_file` change, use `read_file` to read the relevant current content",
    );
    expect(prompt).toContain(
      "If the edit context fails or the file changed, use `read_file` again",
    );
    expect(prompt).toContain(
      "Use Bash for file inspection or modification when those tools are unavailable",
    );
    expect(prompt).not.toContain(
      "Use Bash as the primary interface for performing work in the agent workspace. Use it for workspace navigation, search, file reading, writing and editing",
    );
    expect(prompt).not.toContain("Ignored role");
    expect(prompt).not.toContain("## Team Instruction");
    expect(prompt).not.toContain("## AgentTeam Addressing");
    expect(prompt).not.toContain("## Working With Other Agents");
    expect(prompt).not.toContain("## Skills");
  });

  it("renders the authored Team instruction before the exact sibling AgentTeam sections", () => {
    const prompt = composeNativeAutoByteusPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition(),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberExecutionContext: teamContext(),
    });

    expect(prompt).toContain("## Team Instruction\n\n### Coordination");
    expect(prompt).toContain("## AgentTeam Addressing\n\nAgents and agent teams use filesystem-like logical addresses.");
    expect(prompt).not.toContain("Your Agent address is");
    expect(prompt).not.toContain("/worker");
    expect(prompt).toContain("Relative addresses, bare names, `../`, backslashes");
    expect(prompt).toContain("The top level is represented by `/`");
    expect(prompt).toContain("├── /A              (Agent)");
    expect(prompt).toContain("└── /C              (AgentTeam)");
    expect(prompt).not.toContain("nested");
    expect(prompt).toContain("The letters in this example are placeholders only.");
    expect(prompt).not.toContain("requirements_engineering");
    expect(prompt).toContain("## Working With Other Agents\n\nOn receiving a request");
    expect(prompt.indexOf("## Team Instruction")).toBeLessThan(prompt.indexOf("## AgentTeam Addressing"));
    expect(prompt.indexOf("## AgentTeam Addressing")).toBeLessThan(prompt.indexOf("## Working With Other Agents"));
    expect(prompt.indexOf("## Working With Other Agents")).toBeLessThan(prompt.indexOf("## Working Environment"));
    expect(prompt.match(/^## AgentTeam Addressing$/gm)).toHaveLength(1);
    expect(prompt.match(/^## Working With Other Agents$/gm)).toHaveLength(1);
    expect(prompt).not.toContain("## Team Runtime");
    expect(prompt).not.toContain("recipient_name");
    expect(prompt).not.toContain("You can message:");
    expect(prompt).toContain("delegate_task");
    expect(prompt).not.toContain("submit_task_result");
    expect(prompt).not.toContain("review_task_result");
  });

  it("omits blank optional identity and team bodies", () => {
    const prompt = composeNativeAutoByteusPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition({ description: " ", instructions: "\n" }),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberExecutionContext: teamContext("  "),
    });
    expect(prompt).not.toContain("- Description:");
    expect(prompt).not.toContain("### Responsibilities and Boundaries");
    expect(prompt).not.toContain("## Team Instruction");
    expect(prompt).toContain("## AgentTeam Addressing");
    expect(prompt).toContain("## Working With Other Agents");
    expect(prompt).not.toContain("## Team Runtime");
  });

  it("fails required scalars and unresolved placeholders before provider projection", () => {
    expect(() => composeNativeAutoByteusPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition({ name: " " }),
      workspaceRootPath: "/tmp/workspace",
    })).toThrow(/name must be non-blank/);
    expect(() => composeNativeAutoByteusPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition(),
      workspaceRootPath: "relative/path",
    })).toThrow(/absolute path/);
    expect(() => composeNativeAutoByteusPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition({ instructions: "Use {{missing}}." }),
      workspaceRootPath: "/tmp/workspace",
    })).toThrow(/unresolved documentation placeholder/);
  });
});

describe("composeSharedCarpenterPrompt", () => {
  it("renders shared identity and collaboration without native workspace or file-operation guidance", () => {
    const prompt = composeSharedCarpenterPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition(),
      memberExecutionContext: teamContext(),
      longRunningCommandSection: CODEX_LONG_RUNNING_COMMAND_SECTION,
    });

    expect(prompt).toContain("## Agent Identity");
    expect(prompt).toContain("## Team Instruction\n\n### Coordination");
    expect(prompt).toContain("## AgentTeam Addressing");
    expect(prompt).toContain("## Working With Other Agents");
    expect(prompt).not.toContain("## Working Environment");
    expect(prompt).not.toContain("## Bash Operating Practice");
    expect(prompt).not.toContain("## File And Directory Practice");
    expect(prompt).not.toContain("read_file");
    expect(prompt).not.toContain("edit_file");
    expect(prompt).not.toContain("write_file");
  });

  it("does not require a workspace path for standalone external composition", () => {
    const prompt = composeSharedCarpenterPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition(),
      longRunningCommandSection: CODEX_LONG_RUNNING_COMMAND_SECTION,
    });

    expect(prompt).toContain("## Agent Identity");
    expect(prompt).not.toContain("## Working Environment");
  });

  it("preserves placeholder validation without a native workspace", () => {
    expect(() => composeSharedCarpenterPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition({ instructions: "Use {{missing}}." }),
      longRunningCommandSection: CODEX_LONG_RUNNING_COMMAND_SECTION,
    })).toThrow(/unresolved documentation placeholder/);
  });

  it("refuses a blank long-running command section", () => {
    expect(() => composeSharedCarpenterPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition(),
      longRunningCommandSection: " \n",
    })).toThrow(/long-running command section is required/);
  });
});

describe("Long-Running Commands section (autobyteus-483, REQ-007, AC-011)", () => {
  const base = () => ({ semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global", agentDefinition: definition(), memberExecutionContext: teamContext() });

  it.each([
    ["Claude", CLAUDE_LONG_RUNNING_COMMAND_SECTION],
    ["Codex", CODEX_LONG_RUNNING_COMMAND_SECTION],
    ["Antigravity", ANTIGRAVITY_LONG_RUNNING_COMMAND_SECTION],
    ["Grok", GROK_LONG_RUNNING_COMMAND_SECTION],
    ["DeepSeek Harness", GENERIC_LONG_RUNNING_COMMAND_SECTION],
  ])("appends the %s section after every other shared section and changes nothing else", (_runtime, section) => {
    const prompt = composeSharedCarpenterPrompt({ ...base(), longRunningCommandSection: section });
    const other = composeSharedCarpenterPrompt({ ...base(), longRunningCommandSection: "## Long-Running Commands\n\n- other" });

    expect(prompt.endsWith(`\n\n${section}`)).toBe(true);
    expect(prompt.slice(0, -section.length)).toBe(other.slice(0, -"## Long-Running Commands\n\n- other".length));
    expect(prompt.match(/^## Long-Running Commands$/gm)).toHaveLength(1);
  });

  it.each([
    ["Claude", CLAUDE_LONG_RUNNING_COMMAND_SECTION, ["run_in_background", "2 hours"]],
    ["Codex", CODEX_LONG_RUNNING_COMMAND_SECTION, ["exec_command", "write_stdin", "yield_time_ms"]],
    ["Antigravity", ANTIGRAVITY_LONG_RUNNING_COMMAND_SECTION, ["run_command", "WaitMsBeforeAsync"]],
    ["Grok", GROK_LONG_RUNNING_COMMAND_SECTION, ["run_terminal_command", "block_until_ms: 0", "get_command_or_subagent_output"]],
    ["native AutoByteus", NATIVE_LONG_RUNNING_COMMAND_SECTION, ["run_bash", "run_in_background", "timeout_seconds"]],
    ["DeepSeek Harness", GENERIC_LONG_RUNNING_COMMAND_SECTION, ["background"]],
  ] as const)("writes the %s section in that runtime's terms, short, with the shared habit", (_runtime, section, terms) => {
    expect(section.startsWith("## Long-Running Commands\n\n")).toBe(true);
    for (const term of terms) expect(section).toContain(term);
    expect(section).toContain("never start the same command again while it still runs, or a second command that only waits for it.");
    expect(section).toMatch(/loops of `sleep`/);
    expect(section.split("\n").length).toBeLessThanOrEqual(8);
  });

  it("names a time limit only where the runtime has one", () => {
    expect(CLAUDE_LONG_RUNNING_COMMAND_SECTION).toContain("up to 2 hours");
    for (const section of [CODEX_LONG_RUNNING_COMMAND_SECTION, GROK_LONG_RUNNING_COMMAND_SECTION, ANTIGRAVITY_LONG_RUNNING_COMMAND_SECTION, GENERIC_LONG_RUNNING_COMMAND_SECTION]) {
      expect(section).not.toContain("2 hours");
    }
  });
});

describe("containAuthoredMarkdownHeadings", () => {
  it("keeps backtick-fenced headings unchanged after same-marker non-closing content", () => {
    const authored = [
      "```md",
      "```not-a-close",
      "# stays code",
      "```  \t",
      "# shifts outside",
    ].join("\n");

    expect(containAuthoredMarkdownHeadings(authored, 3)).toBe([
      "```md",
      "```not-a-close",
      "# stays code",
      "```  \t",
      "#### shifts outside",
    ].join("\n"));
  });

  it("requires the same marker and sufficient length before closing a tilde fence", () => {
    const authored = [
      "~~~~text",
      "```",
      "~~~",
      "# stays code",
      "~~~~~",
      "## shifts outside",
    ].join("\n");

    expect(containAuthoredMarkdownHeadings(authored, 2)).toBe([
      "~~~~text",
      "```",
      "~~~",
      "# stays code",
      "~~~~~",
      "### shifts outside",
    ].join("\n"));
  });

  it("accepts a longer same-marker close with trailing tabs", () => {
    const authored = "```js\n# stays code\n`````\t\n# shifts outside";

    expect(containAuthoredMarkdownHeadings(authored, 2)).toBe(
      "```js\n# stays code\n`````\t\n### shifts outside",
    );
  });

  it("preserves relative heading hierarchy and converts overflow to bold labels", () => {
    expect(containAuthoredMarkdownHeadings("# A\n### B\n###### C", 3)).toBe(
      "#### A\n###### B\n**C**",
    );
  });
});
