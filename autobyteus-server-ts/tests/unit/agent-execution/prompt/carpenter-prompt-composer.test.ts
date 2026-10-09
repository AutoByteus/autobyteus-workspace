import { describe, expect, it, vi } from "vitest";
import { WORK_REQUEST_EXECUTION_LLM_INSTRUCTION } from "../../../../src/agent-collaboration/domain/agent-team-collaboration-llm-contract.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { containAuthoredMarkdownHeadings } from "../../../../src/agent-execution/prompt/markdown-heading-containment.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import {
  createAgentRootExecutionIdentity,
  createRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
} from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

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
      agentDefinition: definition({ role: "Ignored role" }),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberExecutionContext: null,
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
      memberExecutionContext: teamContext(),
    });

    expect(prompt).toContain("## Team Instruction\n\n### Coordination");
    expect(prompt).toContain("## AgentTeam Addressing\n\nAgentTeams use filesystem-like logical addresses.");
    expect(prompt).toContain("Your Agent address is:\n\n/worker");
    expect(prompt).toContain("Relative addresses, bare names, `../`, backslashes");
    expect(prompt).toContain("The root AgentTeam is represented by `/`");
    expect(prompt).toContain("├── /A              (Agent)");
    expect(prompt).toContain("└── /C              (nested AgentTeam)");
    expect(prompt).toContain("The letters in this example are placeholders only.");
    expect(prompt).not.toContain("requirements_engineering");
    expect(prompt).toContain("## AgentTeam Collaboration\n\n### Work Requests and Outcomes");
    expect(prompt.indexOf("## Team Instruction")).toBeLessThan(prompt.indexOf("## AgentTeam Addressing"));
    expect(prompt.indexOf("## AgentTeam Addressing")).toBeLessThan(prompt.indexOf("## AgentTeam Collaboration"));
    expect(prompt.indexOf("## AgentTeam Collaboration")).toBeLessThan(prompt.indexOf("## Working Environment"));
    expect(prompt.match(/^## AgentTeam Addressing$/gm)).toHaveLength(1);
    expect(prompt.match(/^## AgentTeam Collaboration$/gm)).toHaveLength(1);
    expect(prompt).not.toContain("## Team Runtime");
    expect(prompt).not.toContain("recipient_name");
    expect(prompt).not.toContain("You can message:");
    expect(prompt).toContain("delegate_task");
    expect(prompt).not.toContain("submit_task_result");
    expect(prompt).not.toContain("review_task_result");
  });

  it("omits blank optional identity and team bodies", () => {
    const prompt = composeNativeAutoByteusPrompt({
      agentDefinition: definition({ description: " ", instructions: "\n" }),
      workspaceRootPath: "/tmp/carpenter-workspace",
      memberExecutionContext: teamContext("  "),
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
      memberExecutionContext: teamContext(),
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

describe("standalone collaboration section (Agent-root host)", () => {
  const hostContext = () => new MemberExecutionContext({
    identity: createCollaborationMemberExecutionIdentity({
      root: createAgentRootExecutionIdentity("daily-assistant-run"),
      memberAddress: "/daily_assistant",
      agentRunId: "daily-assistant-run",
    }),
    teamScoped: false,
    collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }),
    tasks: {
      root: createAgentRootExecutionIdentity("daily-assistant-run"),
      delegateToNewCopy: async () => ({ delegated: false, message: "none" }),
      assignToExistingCopy: async () => ({ delegated: false, message: "none" }),
    },
  });

  it("renders the short standalone section instead of the Team sections for every eligible standalone agent", () => {
    const prompt = composeSharedCarpenterPrompt({
      agentDefinition: new AgentDefinition({
        id: "autobyteus-daily-assistant", name: "Daily Assistant", description: "Helps with everyday tasks.", instructions: "Be helpful.",
      }),
      memberExecutionContext: hostContext(),
    });
    expect(prompt).toMatchSnapshot();
    expect(prompt).not.toContain("AgentTeam Addressing");
    expect(prompt).not.toContain("get_handoff_rules");
    expect(prompt).toContain("Your address in this run is `/daily_assistant`.");
  });

  it("keeps a standalone agent without a member context unchanged", () => {
    const prompt = composeSharedCarpenterPrompt({
      agentDefinition: new AgentDefinition({ name: "Helper", description: "d", instructions: "i" }),
      memberExecutionContext: null,
    });
    expect(prompt).not.toContain("## Collaboration");
  });
});

describe.each([
  ["shared", composeSharedCarpenterPrompt],
  ["native", composeNativeAutoByteusPrompt],
] as const)("%s work-request guidance", (_runtime, compose) => {
  it.each([
    ["Team member", "agent_team", "/worker", true],
    ["Org member", "agent_org", "/engineering/worker", true],
    ["collaborator Team coordinator", "agent", "/product/coordinator", true],
    ["standalone host", "agent", "/assistant", false],
    ["standalone collaborator", "agent", "/researcher", false],
    ["delegated Agent copy", "agent", "/worker_copy", false],
  ] as const)("projects one shared paragraph for %s before tool mechanics", (_label, rootSubjectKind, memberAddress, teamScoped) => {
    const root = createRootExecutionIdentity({ rootSubjectKind, rootRunId: "root-run" });
    const context = new MemberExecutionContext({
      identity: createCollaborationMemberExecutionIdentity({ root, memberAddress, agentRunId: "member-run" }),
      teamScoped,
      collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }),
      tasks: { root, delegateToNewCopy: async () => ({ delegated: false, message: "none" }), assignToExistingCopy: async () => ({ delegated: false, message: "none" }) },
    });
    const prompt = compose({
      agentDefinition: definition(), memberExecutionContext: context, workspaceRootPath: "/tmp/workspace",
    });
    expect(prompt.split(WORK_REQUEST_EXECUTION_LLM_INSTRUCTION)).toHaveLength(2);
    expect(prompt.match(/^### Work Requests and Outcomes$/gm)).toHaveLength(1);
    expect(prompt.indexOf(WORK_REQUEST_EXECUTION_LLM_INSTRUCTION)).toBeLessThan(
      prompt.indexOf(teamScoped ? "Choose the collaboration mode" : "- `send_message_to`"),
    );
    expect(prompt.includes("get_handoff_rules")).toBe(teamScoped);
    expect(prompt).toContain("delegate_task");
    expect(prompt).toContain("target_agent_run_id");
    expect(prompt).toContain(memberAddress);
  });

  it("does not add collaboration guidance without a member context", () => {
    const prompt = compose({
      agentDefinition: definition(), memberExecutionContext: null, workspaceRootPath: "/tmp/workspace",
    });
    expect(prompt).not.toContain(WORK_REQUEST_EXECUTION_LLM_INSTRUCTION);
    expect(prompt).not.toContain("get_handoff_rules");
  });
});
