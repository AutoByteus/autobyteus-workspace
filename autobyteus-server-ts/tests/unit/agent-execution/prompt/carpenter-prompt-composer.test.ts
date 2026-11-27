import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { containAuthoredMarkdownHeadings } from "../../../../src/agent-execution/prompt/markdown-heading-containment.js";
import {
  FILE_AND_DIRECTORY_PRACTICE_SECTION,
  renderGlobalSemanticMemorySection,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-sections.js";
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
    // autobyteus-649 AC-001: the native prompt ends with File And Directory Practice, as before autobyteus-483.
    expect(prompt.endsWith(`\n\n${FILE_AND_DIRECTORY_PRACTICE_SECTION}`)).toBe(true);
    expect(prompt).not.toContain("Long-Running Commands");
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
    });

    expect(prompt).toContain("## Agent Identity");
    expect(prompt).not.toContain("## Working Environment");
  });

  it("preserves placeholder validation without a native workspace", () => {
    expect(() => composeSharedCarpenterPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition({ instructions: "Use {{missing}}." }),
    })).toThrow(/unresolved documentation placeholder/);
  });
});

// autobyteus-649 (REQ-001, AC-001): no runtime's prompt has a "Long-Running Commands" section; the shared prompt ends
// with the semantic memory sections, as before autobyteus-483.
describe("no Long-Running Commands section (autobyteus-649)", () => {
  it("ends the shared prompt with the global semantic memory section", () => {
    const prompt = composeSharedCarpenterPrompt({
      semanticMemoryPath: "/memory/semantic/agent", globalSemanticMemoryPath: "/memory/semantic-global",
      agentDefinition: definition(), memberExecutionContext: teamContext(),
    });
    expect(prompt.endsWith(`\n\n${renderGlobalSemanticMemorySection("/memory/semantic-global")}`)).toBe(true);
    expect(prompt).not.toContain("Long-Running Commands");
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

describe("semantic memory folders a run could not prepare (autobyteus-554 DEC-015, AC-014)", () => {
  const compose = (semanticMemoryPath: string | null, globalSemanticMemoryPath: string | null) => composeSharedCarpenterPrompt({
    semanticMemoryPath, globalSemanticMemoryPath, agentDefinition: definition(),
  });

  it("leaves out only the section of a folder that is null, and keeps the rest of the prompt", () => {
    const both = compose("/memory/semantic/agent", "/memory/semantic-global");
    const withoutAgent = compose(null, "/memory/semantic-global");
    const withoutGlobal = compose("/memory/semantic/agent", null);
    const neither = compose(null, null);
    expect(withoutAgent).not.toContain("## Semantic Memory\n");
    expect(withoutAgent).toContain("## Global Semantic Memory\n\nThe global semantic memory of this node is the folder `/memory/semantic-global`.");
    expect(withoutGlobal).toContain("## Semantic Memory\n\nYour semantic memory is the folder `/memory/semantic/agent`.");
    expect(withoutGlobal).not.toContain("## Global Semantic Memory");
    expect(neither).not.toMatch(/Semantic Memory/);
    expect(neither.endsWith("**Deep**")).toBe(true); // the agent's own instructions are its last section
    expect(both.replace(/\n\n## Semantic Memory\n\n[^\n]+/, "").replace(/\n\n## Global Semantic Memory\n\n[^\n]+/, "")).toBe(neither);
  });

  it("still refuses a relative folder", () => {
    expect(() => compose("memory/semantic/agent", null)).toThrow("Semantic memory folder must be an absolute path.");
    expect(() => compose(null, "memory/semantic-global")).toThrow("Semantic memory folder must be an absolute path.");
  });
});
