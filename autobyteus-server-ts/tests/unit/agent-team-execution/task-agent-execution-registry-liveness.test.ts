import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { TaskAgentExecutionRegistry } from "../../../src/agent-team-execution/local/registries/task-agent-execution-registry.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testMemberExecutionContext, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";
import { observeConfiguredHandles } from "../agent-org-execution/helpers/task-publication-handles.js";

afterEach(() => vi.restoreAllMocks());

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const buildRegistry = () => {
  const handles = observeConfiguredHandles();
  const worker = testAgentNode("/worker", { agentRunId: "configured-worker", runtimeKind: RuntimeKind.CODEX_APP_SERVER });
  const config = testTeamRunConfig({ rootTeamRunId: "liveness-root", coordinatorAddress: "/worker", children: [worker] });
  const teamContext = new TeamRunContext({
    teamKind: "configured",
    physicalScope: createRootExecutionPhysicalScope({ root: createTeamRootExecutionIdentity("liveness-root"), ancestorTeamRunIds: [] }),
    teamRunId: "liveness-root",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    handoffs: config.handoffs,
    runtimeContext: new FlatTeamExecutionContext({
      memberContexts: [new FlatAgentExecutionContext({
        address: "/worker", agentRunId: "configured-worker", runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null,
      })],
    }),
  });
  const registry = new TaskAgentExecutionRegistry({
    teamContext,
    callbacks: {
      buildMemberExecutionContext: vi.fn(async ({ identity }) => testMemberExecutionContext({
        rootTeamRunId: identity.root.rootRunId, memberAddress: identity.memberAddress, agentRunId: identity.agentRunId,
      })),
      publishAgentEvent: vi.fn(),
      commitPlatformBindingChange: vi.fn(async () => undefined),
    },
  });
  return { registry, handles, worker };
};

describe("TaskAgentExecutionRegistry single liveness predicate (AR-005)", () => {
  it("keeps the handle registered on shutdown, reports it offline, gates commands, and re-activates it on wake", async () => {
    const { registry, handles, worker } = buildRegistry();
    const prepared = await registry.beginPreparation({
      address: "/worker", agentRunId: "task-run", sourceNode: worker,
      message: new AgentInputUserMessage("start", SenderType.USER),
    }).prepare();
    prepared.sealForCommit();
    prepared.commitAfterDurability().releaseWork(() => undefined);
    await flush();
    const execution = handles.get("task-run")!;
    expect(registry.isLive("task-run")).toBe(true);

    execution.emit("idle");
    await expect(registry.tryShutDownIfQuiet("task-run")).resolves.toBe(true);
    expect(execution.finish).toHaveBeenCalledOnce();
    // The handle stays registered; only its AgentRun ended.
    const retained = registry.get("task-run");
    expect(retained).not.toBeNull();
    expect(registry.isLive("task-run")).toBe(false);
    expect(registry.getLeafAgentStatusSnapshots().map((snapshot) => snapshot.details.status)).toEqual(["offline"]);
    expect(registry.hasRunningWork()).toBe(false);
    await expect(registry.tryShutDownIfQuiet("task-run")).resolves.toBe(false);

    // approve/interrupt on a non-live task Agent never touch the handle.
    await expect(registry.executeCommand("task-run", { kind: "approve_tool", invocationId: "inv", approved: true, reason: null }))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_ACTIVE" });
    await expect(registry.executeCommand("task-run", { kind: "interrupt" })).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_ACTIVE" });
    expect(execution.handle.interrupt).not.toHaveBeenCalled();
    expect(execution.handle.approveToolInvocation).not.toHaveBeenCalled();

    // Wake: restore re-activates the retained handle in place before any input is reserved.
    await registry.restore({ address: "/worker", agentRunId: "task-run", platformAgentRunId: null, sourceNode: worker });
    expect(registry.get("task-run")).toBe(retained);
    expect(execution.handle.getOrCreateAgentRun).toHaveBeenCalled();
    expect(registry.isLive("task-run")).toBe(true);
    expect(handles.get("task-run")).toBe(execution);
  });

  it("creates a restore-mode handle when none exists (after a root reopen) and activates it", async () => {
    const { registry, handles, worker } = buildRegistry();
    expect(registry.get("reopened-task")).toBeNull();
    await registry.restore({ address: "/worker", agentRunId: "reopened-task", platformAgentRunId: "provider-thread", sourceNode: worker });
    const execution = handles.get("reopened-task")!;
    expect(execution.input.activationMode).toBe("restore");
    expect(execution.handle.getOrCreateAgentRun).toHaveBeenCalled();
    expect(registry.isLive("reopened-task")).toBe(true);
  });

  it("gives a stopped retained handle the copy's current selection, with its pending runtime switch, when it wakes (autobyteus-348)", async () => {
    const { registry, handles, worker } = buildRegistry();
    const prepared = await registry.beginPreparation({
      address: "/worker", agentRunId: "switched-task", sourceNode: worker,
      message: new AgentInputUserMessage("start", SenderType.USER),
    }).prepare();
    prepared.sealForCommit();
    prepared.commitAfterDurability().releaseWork(() => undefined);
    await flush();
    const execution = handles.get("switched-task")!;
    execution.emit("idle");
    await registry.tryShutDownIfQuiet("switched-task");

    // The user chose another agent runtime while the copy was stopped: its record now holds the new launch and the pending switch.
    const pending = { switchId: "switch-1", from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null, platformAgentRunId: "codex-thread" } };
    const switched = { ...worker, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "claude-sonnet", pendingRuntimeSwitch: pending };
    await registry.restore({ address: "/worker", agentRunId: "switched-task", platformAgentRunId: null, sourceNode: switched });
    expect(execution.handle.replaceSelection).toHaveBeenCalledWith(expect.objectContaining({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "claude-sonnet", platformAgentRunId: null, pendingRuntimeSwitch: pending,
    }));
    expect(execution.handle.getOrCreateAgentRun).toHaveBeenCalled();
  });

  it("builds a restore-mode handle for a switched copy with its pending runtime switch in the execution it activates (autobyteus-348)", async () => {
    const { registry, handles, worker } = buildRegistry();
    const pending = { switchId: "switch-1", from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null, platformAgentRunId: "codex-thread" } };
    await registry.restore({ address: "/worker", agentRunId: "reopened-switched", platformAgentRunId: null,
      sourceNode: { ...worker, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, pendingRuntimeSwitch: pending } });
    const execution = handles.get("reopened-switched")!;
    expect(execution.input.execution).toMatchObject({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: null, pendingRuntimeSwitch: pending });
  });
});
