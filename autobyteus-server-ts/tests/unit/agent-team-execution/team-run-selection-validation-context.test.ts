import { describe, expect, it, vi } from "vitest";
import { planStoppedTeamLaunchSave } from "../../../src/agent-team-execution/services/team-run-delegated-launch-plan.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-348 (REQ-001, 316 CRR-002 F-3 for members): a member's save is validated in the context of its SAVED agent
 * runtime: another runtime, or a model that has never run because a switch is pending, is a fresh selection (no current model).
 */
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/workspace" };
const tree = (pending?: unknown) => ({
  schemaVersion: 2, createdAt: "2026-11-01T00:00:00.000Z", archivedAt: null, applicationBinding: null, handoffs: [],
  rootTeam: {
    address: "/", teamDefinitionId: "def", teamDefinitionName: "Team", teamRunId: "root", coordinatorAddress: "/agent",
    defaultLaunchConfiguration: launch, taskExecutions: [],
    members: [{ address: "/agent", agentDefinitionId: "agent-def", role: null, description: null, agentRunId: "agent-run",
      platformAgentRunId: "thread-1", launchConfiguration: launch, ...(pending ? { pendingRuntimeSwitch: pending } : {}) }],
  },
} as never);
const plan = async (current: never, runtimeKind: RuntimeKind) => {
  const validateMany = vi.fn(async (inputs: unknown[]) => inputs.map((input: any) => ({ kind: "valid" as const, selection: { llmModelIdentifier: input.selection.llmModelIdentifier, llmConfig: null } })));
  const result = await planStoppedTeamLaunchSave({
    tree: current, closed: [], delegatedChanges: [], validator: { validate: vi.fn(), validateMany } as never,
    configuredPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/agent", runtimeKind, llmModelIdentifier: "target", llmConfig: null }],
  });
  return { result, context: (validateMany.mock.calls[0]![0] as any[])[0].context };
};

describe("validation context of a Team member's save", () => {
  it("the saved runtime again: the saved model is the current one", async () => {
    const { context } = await plan(tree(), RuntimeKind.CODEX_APP_SERVER);
    expect(context).toEqual({ runtimeKind: "codex_app_server", currentModelIdentifier: "gpt", workspaceRootPath: "/workspace" });
  });

  it("another runtime is a fresh selection of that runtime", async () => {
    const { context, result } = await plan(tree(), RuntimeKind.CLAUDE_AGENT_SDK);
    expect(context).toEqual({ runtimeKind: "claude_agent_sdk", currentModelIdentifier: null, workspaceRootPath: "/workspace" });
    expect(result.kind).toBe("planned");
  });

  it("while a switch is pending even the pending runtime has no current model (the pending model never ran)", async () => {
    const pending = { switchId: "s", from: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "haiku", llmConfig: null, platformAgentRunId: "sess" } };
    const { context } = await plan(tree(pending), RuntimeKind.CODEX_APP_SERVER);
    expect(context.currentModelIdentifier).toBeNull();
  });
});
