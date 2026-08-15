import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { containAuthoredMarkdownHeadings } from "../../../../src/agent-execution/prompt/markdown-heading-containment.js";
import { testMemberTeamContext } from "../../../fixtures/current-team-run-fixtures.js";

const definition = (input: Partial<ConstructorParameters<typeof AgentDefinition>[0]> = {}) =>
  new AgentDefinition({
    name: " Builder\nAgent ",
    description: " Builds\nthings ",
    instructions: "## Scope\n\nDo work.\n\n```md\n# keep\n```\n\n###### Deep",
    ...input,
  });

const teamContext = (teamInstruction: string | null = "## Coordination\n\nShare results.") =>
  testMemberTeamContext({
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
      agentDefinition: definition({ role: "Ignored role" }),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberTeamContext: null,
    });

    expect(prompt.indexOf("## Agent Identity")).toBeLessThan(prompt.indexOf("## Working Environment"));
    expect(prompt.indexOf("## Working Environment")).toBeLessThan(prompt.indexOf("## Bash Operating Practice"));
    expect(prompt.indexOf("## Bash Operating Practice")).toBeLessThan(prompt.indexOf("## File And Directory Practice"));
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
    expect(prompt).not.toContain("## AgentTeam Collaboration");
    expect(prompt).not.toContain("## Skills");
  });

  it("renders the authored Team instruction before the exact sibling AgentTeam sections", () => {
    const prompt = composeNativeAutoByteusPrompt({
      agentDefinition: definition(),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberTeamContext: teamContext(),
    });

    expect(prompt).toContain("## Team Instruction\n\n### Coordination");
    expect(prompt).toContain("## AgentTeam Addressing");
    expect(prompt).toContain("/worker");
    expect(prompt).toContain("## AgentTeam Collaboration\n\nUse `send_message_to` with `recipient_address`");
    expect(prompt.indexOf("## Team Instruction")).toBeLessThan(prompt.indexOf("## AgentTeam Addressing"));
    expect(prompt.indexOf("## AgentTeam Addressing")).toBeLessThan(prompt.indexOf("## AgentTeam Collaboration"));
    expect(prompt.indexOf("## AgentTeam Collaboration")).toBeLessThan(prompt.indexOf("## Working Environment"));
    expect(prompt.match(/^## AgentTeam Addressing$/gm)).toHaveLength(1);
    expect(prompt.match(/^## AgentTeam Collaboration$/gm)).toHaveLength(1);
    expect(prompt).not.toContain("## Team Runtime");
    expect(prompt).not.toContain("recipient_name");
    expect(prompt).not.toContain("You can message:");
    expect(prompt).toContain("submit_task_result");
    expect(prompt).toContain("review_task_result");
  });

  it("omits blank optional identity and team bodies", () => {
    const prompt = composeNativeAutoByteusPrompt({
      agentDefinition: definition({ description: " ", instructions: "\n" }),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberTeamContext: teamContext("  "),
    });
    expect(prompt).not.toContain("- Description:");
    expect(prompt).not.toContain("### Responsibilities and Boundaries");
    expect(prompt).not.toContain("## Team Instruction");
    expect(prompt).toContain("## AgentTeam Addressing");
    expect(prompt).toContain("## AgentTeam Collaboration");
    expect(prompt).not.toContain("## Team Runtime");
  });

  it("fails required scalars and unresolved placeholders before provider projection", () => {
    expect(() => composeNativeAutoByteusPrompt({
      agentDefinition: definition({ name: " " }),
      workspaceRootPath: "/tmp/workspace",
    })).toThrow(/name must be non-blank/);
    expect(() => composeNativeAutoByteusPrompt({
      agentDefinition: definition(),
      workspaceRootPath: "relative/path",
    })).toThrow(/absolute path/);
    expect(() => composeNativeAutoByteusPrompt({
      agentDefinition: definition({ instructions: "Use {{missing}}." }),
      workspaceRootPath: "/tmp/workspace",
    })).toThrow(/unresolved documentation placeholder/);
  });
});

describe("composeSharedCarpenterPrompt", () => {
  it("renders shared identity and collaboration without native workspace or file-operation guidance", () => {
    const prompt = composeSharedCarpenterPrompt({
      agentDefinition: definition(),
      memberTeamContext: teamContext(),
    });

    expect(prompt).toContain("## Agent Identity");
    expect(prompt).toContain("## Team Instruction\n\n### Coordination");
    expect(prompt).toContain("## AgentTeam Addressing");
    expect(prompt).toContain("## AgentTeam Collaboration");
    expect(prompt).not.toContain("## Working Environment");
    expect(prompt).not.toContain("## Bash Operating Practice");
    expect(prompt).not.toContain("## File And Directory Practice");
    expect(prompt).not.toContain("read_file");
    expect(prompt).not.toContain("edit_file");
    expect(prompt).not.toContain("write_file");
  });

  it("does not require a workspace path for standalone external composition", () => {
    const prompt = composeSharedCarpenterPrompt({
      agentDefinition: definition(),
    });

    expect(prompt).toContain("## Agent Identity");
    expect(prompt).not.toContain("## Working Environment");
  });

  it("preserves placeholder validation without a native workspace", () => {
    expect(() => composeSharedCarpenterPrompt({
      agentDefinition: definition({ instructions: "Use {{missing}}." }),
    })).toThrow(/unresolved documentation placeholder/);
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
