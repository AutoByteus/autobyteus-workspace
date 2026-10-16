import { describe, expect, it } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { renderCollaborationSections } from "../../../../src/agent-execution/prompt/collaboration-prompt-sections.js";
import {
  MemberCollaborationContext,
  MemberExecutionContext,
} from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import type { MemberCollaborationRole } from "../../../../src/agent-collaboration/execution/domain/member-instance-scope.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * Rendered collaboration prompt per kind of agent (wording authority §3, AC-001, AC-002, AC-007). The
 * snapshots were reviewed against the approved complete views; the checks below hold for every view.
 */
const agent = new AgentDefinition({ id: "a", name: "Web Researcher", description: "Researches.", instructions: "Research the web." });
const handoff = { from: "/code_reviewer", to: "/implementation_engineer", rules: ["When the review passes."] };

const root = (kind: "agent" | "agent_team" | "agent_org"): RootExecutionIdentity => createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: "root-run" });
const context = (input: {
  role: MemberCollaborationRole;
  rootKind: "agent" | "agent_team" | "agent_org";
  address: string;
  teamInstruction?: string | null;
  handoffs?: boolean;
}): MemberExecutionContext => {
  const identityRoot = root(input.rootKind);
  return new MemberExecutionContext({
    identity: createCollaborationMemberExecutionIdentity({ root: identityRoot, memberAddress: input.address, agentRunId: "member-run" }),
    teamScoped: input.role !== "standalone_agent",
    collaborationRole: input.role,
    authoredEnclosingScopeInstruction: input.teamInstruction ?? null,
    collaboration: new MemberCollaborationContext({
      outgoingHandoffs: input.handoffs ? [handoff] : [],
      deliverLogicalMessage: async () => ({ accepted: true }),
    }),
    tasks: { root: identityRoot, delegateToNewCopy: async () => ({ delegated: false, message: "none" }), assignToExistingCopy: async () => ({ delegated: false, message: "none" }) },
  });
};

const VIEWS: ReadonlyArray<readonly [string, Parameters<typeof context>[0]]> = [
  ["standalone agent", { role: "standalone_agent", rootKind: "agent", address: "/web_researcher" }],
  ["task agent in an Agent run", { role: "task_agent", rootKind: "agent", address: "/web_researcher" }],
  ["task agent in a Team run", { role: "task_agent", rootKind: "agent_team", address: "/web_researcher" }],
  ["task agent in an Org run", { role: "task_agent", rootKind: "agent_org", address: "/web_researcher" }],
  ["task agent with handoff rules", { role: "task_agent", rootKind: "agent_team", address: "/code_reviewer", teamInstruction: "Ship it.", handoffs: true }],
  ["member of a user-started team", { role: "team_member", rootKind: "agent_team", address: "/team/code_reviewer", teamInstruction: "Work together.", handoffs: true }],
  ["member of a team without handoff rules", { role: "team_member", rootKind: "agent_team", address: "/team/helper", teamInstruction: "Work together." }],
  ["member of a task agent team", { role: "team_member", rootKind: "agent", address: "/software_team/code_reviewer", handoffs: true }],
  ["member of an organization's team", { role: "team_member", rootKind: "agent_org", address: "/software_team/code_reviewer", teamInstruction: "Org rules.", handoffs: true }],
  ["direct agent of an organization", { role: "org_agent", rootKind: "agent_org", address: "/project_task_manager", teamInstruction: "Org rules.", handoffs: true }],
];

describe.each([
  ["shared (Codex, Claude, ACP, AGY)", composeSharedCarpenterPrompt],
  ["native AutoByteus", (input: Parameters<typeof composeSharedCarpenterPrompt>[0]) =>
    composeNativeAutoByteusPrompt({ ...input, workspaceRootPath: "/tmp/workspace" })],
] as const)("collaboration prompt on the %s path", (_path, compose) => {
  it.each(VIEWS)("renders the approved text for a %s", (_label, input) => {
    const prompt = compose({ agentDefinition: agent, memberExecutionContext: context(input) });
    expect(prompt).toMatchSnapshot();
  });
});

describe("collaboration prompt properties", () => {
  const rendered = (input: Parameters<typeof context>[0]) => renderCollaborationSections(context(input));

  it.each(VIEWS)("never states the agent's own address, nor uses a word the agent should not read (%s)", (_label, input) => {
    const prompt = composeSharedCarpenterPrompt({ agentDefinition: agent, memberExecutionContext: context(input) });
    expect(prompt).not.toContain(input.address);
    expect(prompt).not.toMatch(/\b(your address|Your Agent address)\b/i);
    expect(prompt).not.toMatch(/\b(copy|copies|spawn|spawns|this run(?! ID)|your run(?! ID)|mounted|collaborator|brought in|nested|Task worker|root AgentTeam)\b/i);
  });

  it("gives Handoffs exactly to an agent with handoff rules, at the end of its working section", () => {
    for (const [label, input] of VIEWS) {
      const text = rendered(input);
      expect(text.includes("### Handoffs"), label).toBe(Boolean(input.handoffs));
      if (input.handoffs) expect(text.endsWith("otherwise finish normally."), label).toBe(true);
    }
  });

  it("gives the addressing section to team and organization agents only, and each prompt its own opening", () => {
    expect(rendered(VIEWS[0]![1])).toMatch(/^## Working With Other Agents\n\nYou can delegate tasks to other agents and agent teams\./);
    expect(rendered(VIEWS[1]![1])).toMatch(/^## Working With Other Agents\n\nYou are a task agent: another agent delegated a task to you\./);
    for (const [label, input] of VIEWS) {
      expect(rendered(input).startsWith("## AgentTeam Addressing"), label).toBe(input.role === "team_member" || input.role === "org_agent");
    }
    expect(rendered(VIEWS[9]![1])).toContain("To talk with an agent or agent team of your organization");
  });

  it("adds the organization line only for a team member whose root is an organization", () => {
    const line = "You can also talk with the organization's other agents and agent teams at their addresses.";
    expect(rendered(VIEWS[5]![1])).not.toContain(line);
    expect(rendered(VIEWS[7]![1])).not.toContain(line);
    expect(rendered(VIEWS[8]![1])).toContain(line);
  });

  it("tells every prompt how to answer a message by its sender run ID", () => {
    for (const [label, input] of VIEWS) {
      expect(rendered(input), label).toContain("Every message you receive, including a new task, gives its sender run ID. To answer it, or to report your task result, use `send_message_to` with `target_agent_run_id` set to that sender run ID.");
    }
  });

  it("keeps the authored Team Instruction whenever the agent has one, before the collaboration sections", () => {
    const prompt = composeSharedCarpenterPrompt({ agentDefinition: agent, memberExecutionContext: context(VIEWS[4]![1]) });
    expect(prompt.indexOf("## Team Instruction")).toBeGreaterThan(prompt.indexOf("## Agent Identity"));
    expect(prompt.indexOf("## Team Instruction")).toBeLessThan(prompt.indexOf("## Working With Other Agents"));
  });
});
