import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ConfiguredAgentActivationPlanner } from "../../../src/agent-collaboration/execution/backends/configured-agent-activation-planner.js";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const identity = createCollaborationMemberExecutionIdentity({
  root: createAgentOrgRootExecutionIdentity("org-run"),
  memberAddress: "/verifier",
  agentRunId: "agent-run",
});

const config = new AgentRunConfig({
  agentDefinitionId: "verifier-definition",
  llmModelIdentifier: "gpt-5.6-sol",
  autoExecuteTools: false,
  memoryDir: "/memory/agent_org/org-run/agent-run",
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

const candidate = (platformAgentRunId: string) => ({
  runId: identity.agentRunId,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId,
  commitPublication: vi.fn(),
  abort: vi.fn(),
});

const build = (input: {
  activity: "none" | "present" | "indeterminate";
  platformAgentRunId?: string | null;
}) => {
  const freshCandidate = candidate("new-thread-id");
  const restoredCandidate = candidate("existing-thread-id");
  const prepareNewAgentRun = vi.fn().mockResolvedValue(freshCandidate);
  const prepareRestoreAgentRunFromPlatformState = vi.fn().mockResolvedValue(restoredCandidate);
  const planner = new ConfiguredAgentActivationPlanner({
    identity,
    mode: "restore",
    manager: { prepareNewAgentRun, prepareRestoreAgentRunFromPlatformState } as never,
    activityInspector: {
      inspect: () => input.activity === "indeterminate"
        ? { kind: "indeterminate" as const, error: new Error("unreadable trace") }
        : { kind: input.activity },
    } as never,
  });
  return {
    planner,
    binding: input.platformAgentRunId === undefined ? "existing-thread-id" : input.platformAgentRunId,
    freshCandidate,
    restoredCandidate,
    prepareNewAgentRun,
    prepareRestoreAgentRunFromPlatformState,
  };
};

describe("ConfiguredAgentActivationPlanner external restore", () => {
  it("starts a fresh provider conversation for a never-messaged member with a prospective thread id", async () => {
    const fixture = build({ activity: "none" });

    const prepared = await fixture.planner.prepare(config, fixture.binding);

    expect(fixture.prepareNewAgentRun).toHaveBeenCalledWith({ runId: "agent-run", config });
    expect(fixture.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
    expect(prepared.candidate).toBe(fixture.freshCandidate);
    expect(prepared.bindingChange).toMatchObject({
      kind: "replace_without_conversation",
      replacement: {
        expectedPreviousPlatformAgentRunId: "existing-thread-id",
        binding: { platformAgentRunId: "new-thread-id" },
      },
    });
  });

  it("restores the exact provider conversation when durable user or assistant activity exists", async () => {
    const fixture = build({ activity: "present" });

    const prepared = await fixture.planner.prepare(config, fixture.binding);

    expect(fixture.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledWith({
      runId: "agent-run",
      config,
      platformAgentRunId: "existing-thread-id",
    });
    expect(fixture.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(prepared.candidate).toBe(fixture.restoredCandidate);
    expect(prepared.bindingChange).toMatchObject({
      kind: "adopt_or_retain",
      binding: { platformAgentRunId: "existing-thread-id" },
    });
  });

  it("fails closed when real conversation activity has no provider binding", async () => {
    const fixture = build({ activity: "present", platformAgentRunId: null });

    await expect(fixture.planner.prepare(config, fixture.binding)).rejects.toMatchObject({
      code: "COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING",
    });
    expect(fixture.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(fixture.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
  });

  it("fails closed when durable conversation activity cannot be classified", async () => {
    const fixture = build({ activity: "indeterminate" });

    await expect(fixture.planner.prepare(config, fixture.binding)).rejects.toMatchObject({
      code: "COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE",
    });
    expect(fixture.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(fixture.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
  });
});
