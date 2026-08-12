import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { composeCarpenterPrompt } from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { containAuthoredMarkdownHeadings } from "../../../../src/agent-execution/prompt/markdown-heading-containment.js";

const definition = (input: Partial<ConstructorParameters<typeof AgentDefinition>[0]> = {}) =>
  new AgentDefinition({
    name: " Builder\nAgent ",
    description: " Builds\nthings ",
    instructions: "## Scope\n\nDo work.\n\n```md\n# keep\n```\n\n###### Deep",
    ...input,
  });

const teamContext = (teamInstruction: string | null = "## Coordination\n\nShare results.") =>
  new MemberTeamContext({
    teamRunId: "team-run",
    teamDefinitionId: "team-def",
    teamName: "Builders",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: " worker\nmember ",
    memberRouteKey: "worker",
    memberRunId: "run-worker",
    teamInstruction,
    sendMessageToEnabled: true,
    deliverInterAgentMessage: vi.fn(async () => undefined) as any,
  });

describe("composeCarpenterPrompt", () => {
  it("renders the exact ordered standalone foundation without role or fallbacks", () => {
    const prompt = composeCarpenterPrompt({
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
    expect(prompt).not.toContain("Ignored role");
    expect(prompt).not.toContain("## Team Instruction");
    expect(prompt).not.toContain("## Team Runtime");
    expect(prompt).not.toContain("## Skills");
  });

  it("renders team instruction and fixed team runtime from context only", () => {
    const prompt = composeCarpenterPrompt({
      agentDefinition: definition(),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberTeamContext: teamContext(),
    });

    expect(prompt).toContain("## Team Instruction\n\n### Coordination");
    expect(prompt).toContain("## Team Runtime\n\nCurrent team member: worker member");
    expect(prompt).toContain("No logical `recipient_name` roster recipients are currently listed for this run.");
    expect(prompt).toContain("You can delegate tasks with delegate_task:");
    expect(prompt).toContain("Task delegation protocol");
    expect(prompt).not.toContain("submit_task_result");
    expect(prompt).not.toContain("review_task_result");
  });

  it("omits blank optional identity and team bodies", () => {
    const prompt = composeCarpenterPrompt({
      agentDefinition: definition({ description: " ", instructions: "\n" }),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberTeamContext: teamContext("  "),
    });
    expect(prompt).not.toContain("- Description:");
    expect(prompt).not.toContain("### Responsibilities and Boundaries");
    expect(prompt).not.toContain("## Team Instruction");
    expect(prompt).toContain("## Team Runtime");
  });

  it("fails required scalars and unresolved placeholders before provider projection", () => {
    expect(() => composeCarpenterPrompt({
      agentDefinition: definition({ name: " " }),
      workspaceRootPath: "/tmp/workspace",
    })).toThrow(/name must be non-blank/);
    expect(() => composeCarpenterPrompt({
      agentDefinition: definition(),
      workspaceRootPath: "relative/path",
    })).toThrow(/absolute path/);
    expect(() => composeCarpenterPrompt({
      agentDefinition: definition({ instructions: "Use {{missing}}." }),
      workspaceRootPath: "/tmp/workspace",
    })).toThrow(/unresolved documentation placeholder/);
  });
});

describe("containAuthoredMarkdownHeadings", () => {
  it("preserves relative heading hierarchy and converts overflow to bold labels", () => {
    expect(containAuthoredMarkdownHeadings("# A\n### B\n###### C", 3)).toBe(
      "#### A\n###### B\n**C**",
    );
  });
});
