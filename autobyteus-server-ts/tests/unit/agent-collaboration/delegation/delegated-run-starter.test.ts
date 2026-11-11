import { describe, expect, it, vi } from "vitest";
import { DelegatedRunStartError, DelegatedRunStarter } from "../../../../src/agent-collaboration/execution/delegation/delegated-run-starter.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** autobyteus-461 design DS-1, contract §2.2 (D2): a local delegation creates an ordinary run carrying its own origin. */
const source = { kind: "agent" as const, agentDefinitionId: "image-maker",
  launchConfiguration: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "gpt-image", llmConfig: { size: "1k" }, autoExecuteTools: true, workspaceRootPath: "/Users/me/projects/x" },
  launchSource: { origin: "agent_default" as const, fallbacks: [] } };
const delegatedFrom = { delegatingRun: { kind: "agent_team" as const, runId: "marketing_team_5a00" }, delegatorAgentRunId: "copywriter_77c1" };

describe("DelegatedRunStarter (local delegation)", () => {
  it("prepares an ordinary agent run with the resolved launch, its address, its launch source and its origin (no nodeId)", async () => {
    const prepareAgentRun = vi.fn(async () => ({ runId: "image_maker_33f0", activationState: "PREPARED" as const, preparedExpiresAt: "t" }));
    const starter = new DelegatedRunStarter({ agentRuns: { prepareAgentRun }, teamRuns: {} as never });
    await expect(starter.startAgent({ source, address: "/image_maker" as never, delegatedFrom })).resolves.toEqual({ agentRunId: "image_maker_33f0" });
    expect(prepareAgentRun).toHaveBeenCalledExactlyOnceWith({ agentDefinitionId: "image-maker", runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "gpt-image", llmConfig: { size: "1k" }, autoExecuteTools: true, workspaceRootPath: "/Users/me/projects/x",
      address: "/image_maker", launchSource: { origin: "agent_default", fallbacks: [] }, delegatedFrom });
  });

  it("a launch without a workspace, or a failed preparation, is a DelegatedRunStartError with the reason", async () => {
    const starter = new DelegatedRunStarter({ agentRuns: { prepareAgentRun: vi.fn(async () => { throw new Error("No model is set."); }) }, teamRuns: {} as never });
    await expect(starter.startAgent({ source, address: "/image_maker" as never, delegatedFrom }))
      .rejects.toMatchObject({ name: "DelegatedRunStartError", message: "No model is set.", changedWhileStarting: false });
    await expect(starter.startAgent({ source: { ...source, launchConfiguration: { ...source.launchConfiguration, workspaceRootPath: null } },
      address: "/image_maker" as never, delegatedFrom })).rejects.toBeInstanceOf(DelegatedRunStartError);
  });
});
