// IR008 implementation diagnostic only; no provider or API acceptance execution.
import { describe, expect, it } from "/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/node_modules/vitest/dist/index.js";
import { projectAgentCollaborationView } from "/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts";
import { createCollaborationAgentStatusSnapshot } from "/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/src/agent-collaboration/execution/domain/collaboration-agent-execution-event.ts";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/src/agent-collaboration/execution/domain/root-execution-identity.ts";
import { emptyAgentRunCollaborationTree, emptyAgentRunCollaborationMessages } from "/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-tree.ts";

const createdAt = "2026-10-01T00:00:00.000Z";
const hostRunId = "host";
const tree = emptyAgentRunCollaborationTree({
  host: { address: "/host" as never, agentRunId: hostRunId, agentDefinitionId: "host-definition" }, createdAt,
});
const entry = {
  kind: "agent" as const, address: "/reviewer" as never, agentDefinitionId: "reviewer-definition",
  agentRunId: "reviewer-run", platformAgentRunId: null,
  launchConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: "model", llmConfig: null,
    autoExecuteTools: false, workspaceRootPath: null },
  addedAt: createdAt, addedViaAgentRunId: hostRunId,
};
const project = (withChild: boolean) => projectAgentCollaborationView({
  hostRunId, isActive: true, baseChangeSequence: 0,
  snapshot: {
    tree: { ...tree, collaborators: withChild ? [entry] : [] } as never,
    messages: emptyAgentRunCollaborationMessages(hostRunId),
    statuses: withChild ? [createCollaborationAgentStatusSnapshot({
      execution: createCollaborationMemberExecutionIdentity({
        root: createAgentRootExecutionIdentity(hostRunId), memberAddress: "/reviewer", agentRunId: "reviewer-run",
      }),
      status: "offline",
    })] : [],
  },
});
describe("IR008 Agent-root merged contract diagnostic", () => {
  it("empty-root control parses", () => expect(() => project(false)).not.toThrow());
  it("ordinary admitted dormant collaborator snapshot parses", () => expect(() => project(true)).not.toThrow());
});
