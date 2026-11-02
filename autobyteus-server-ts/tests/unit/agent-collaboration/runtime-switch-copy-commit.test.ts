import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { PendingRuntimeSwitch } from "../../../src/run-history/store/agent-run-metadata-types.js";
import {
  createCollaborationAgentRuntimeSwitchCommit,
} from "../../../src/agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { commitRuntimeSwitchInTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-mutator.js";
import { commitAgentOrgRuntimeSwitch } from "../../../src/agent-org-execution/services/agent-org-run-execution-tree-mutator.js";
import { commitStandaloneRootRuntimeSwitch } from "../../../src/standalone-agent-run-root/services/standalone-root-tree-mutator.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-348 (REQ-005, AC-008; M-7): a delegated copy that was switched is committed on ITS OWN record by the root
 * that holds it (a Team, an Org or an Agent root): the new session is set and the pending switch is removed in one write,
 * the user's choice and the started values stay, and a stale switch or an unknown copy is a conflict, never a no-op.
 */
const at = "2026-11-01T00:00:00.000Z";
const PENDING: PendingRuntimeSwitch = {
  switchId: "switch-1",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "haiku", llmConfig: null, platformAgentRunId: "claude-session" },
};
const started = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "haiku", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
const choice = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, selectedAt: at };

const agentCopy = {
  address: "/Helper", agentRunId: "copy-agent", platformAgentRunId: null, startedAt: at, delegatorAgentRunId: "manager",
  source: { kind: "agent", agentDefinitionId: "helper", launchConfiguration: started },
  userLaunchSelection: choice, pendingRuntimeSwitch: PENDING,
};
const teamCopy = {
  address: "/Workers", teamRunId: "copy-team", startedAt: at, delegatorAgentRunId: "manager", taskExecutions: [],
  members: [
    { address: "/Workers/lead", agentRunId: "copy-lead", platformAgentRunId: null, userLaunchSelection: choice, pendingRuntimeSwitch: PENDING },
    { address: "/Workers/writer", agentRunId: "copy-writer", platformAgentRunId: "writer-thread" },
  ],
  source: {
    kind: "agent_team", teamDefinitionId: "workers", coordinatorAddress: "/Workers/lead", handoffs: [], defaultLaunchConfiguration: started,
    members: ["lead", "writer"].map((name) => ({ address: `/Workers/${name}`, agentDefinitionId: name, followsTeam: false, launchConfiguration: started })),
  },
};

const identity = (kind: "agent_team" | "agent_org" | "agent", memberAddress: string, agentRunId: string) =>
  createCollaborationMemberExecutionIdentity({ root: createRootExecutionIdentity({ rootSubjectKind: kind, rootRunId: "root" }), memberAddress, agentRunId });
const commit = (kind: "agent_team" | "agent_org" | "agent", memberAddress: string, agentRunId: string, platformAgentRunId: string | null, switchId = "switch-1") =>
  createCollaborationAgentRuntimeSwitchCommit({ execution: identity(kind, memberAddress, agentRunId), switchId, platformAgentRunId });

const roots = {
  agent_team: {
    tree: () => {
      const base = testExecutionTree({ rootTeamRunId: "root", coordinatorAddress: "/Manager", children: [testAgentNode("/Manager", { agentRunId: "manager" })] });
      return { ...base, rootTeam: { ...base.rootTeam, taskExecutions: [agentCopy, teamCopy] } } as any;
    },
    apply: (tree: any, change: any) => commitRuntimeSwitchInTree({ tree, commit: change }),
    copies: (tree: any) => tree.rootTeam.taskExecutions,
  },
  agent_org: {
    tree: () => {
      const base = testAgentOrgExecutionTree({ orgRunId: "root", members: [testOrgAgentNode("/Manager", "manager")] });
      return { ...base, rootOrg: { ...base.rootOrg, taskExecutions: [agentCopy, teamCopy] } } as any;
    },
    apply: (tree: any, change: any) => commitAgentOrgRuntimeSwitch({ tree, commit: change }),
    copies: (tree: any) => tree.rootOrg.taskExecutions,
  },
  agent: {
    tree: () => ({ subjectKind: "agent", createdAt: at, host: { address: "/Manager", agentRunId: "root", agentDefinitionId: "manager" },
      collaborators: [], taskExecutions: [{ ...agentCopy, delegatorAgentRunId: "root" }, { ...teamCopy, delegatorAgentRunId: "root" }] }) as any,
    apply: (tree: any, change: any) => commitStandaloneRootRuntimeSwitch({ tree, commit: change }),
    copies: (tree: any) => tree.taskExecutions,
  },
} as const;

for (const [kind, root] of Object.entries(roots) as Array<[keyof typeof roots, (typeof roots)[keyof typeof roots]]>) {
  describe(`${kind} root: a switched delegated copy's activation commit`, () => {
    it("sets a task Agent copy's session and removes its pending switch, keeping its choice and started values", () => {
      const next = root.apply(root.tree(), commit(kind, "/Helper", "copy-agent", "codex-thread"));
      const copy = root.copies(next).find((task: any) => task.agentRunId === "copy-agent");
      expect(copy).toMatchObject({ platformAgentRunId: "codex-thread", userLaunchSelection: choice, source: { launchConfiguration: started } });
      expect(copy).not.toHaveProperty("pendingRuntimeSwitch");
      // The other copy is untouched.
      expect(root.copies(next).find((task: any) => task.teamRunId === "copy-team").members[0]).toHaveProperty("pendingRuntimeSwitch");
    });

    it("sets one task Team member's session, leaving its Team's other members as they were", () => {
      const next = root.apply(root.tree(), commit(kind, "/Workers/lead", "copy-lead", null));
      const members = root.copies(next).find((task: any) => task.teamRunId === "copy-team").members;
      expect(members[0]).toMatchObject({ agentRunId: "copy-lead", platformAgentRunId: null, userLaunchSelection: choice });
      expect(members[0]).not.toHaveProperty("pendingRuntimeSwitch");
      expect(members[1]).toEqual(teamCopy.members[1]);
    });

    it.each([
      ["a stale switch", () => commit(kind, "/Helper", "copy-agent", "thread", "switch-0")],
      ["an unknown copy", () => commit(kind, "/Helper", "no-such-copy", "thread")],
      ["a copy with no pending switch", () => commit(kind, "/Workers/writer", "copy-writer", "thread")],
    ])("refuses %s as a conflict, never a silent no-op", (_label, change) => {
      expect(() => root.apply(root.tree(), change())).toThrow();
    });
  });
}
