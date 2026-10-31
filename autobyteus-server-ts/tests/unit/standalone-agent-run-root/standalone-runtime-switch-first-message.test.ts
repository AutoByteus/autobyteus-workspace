import { afterEach, describe, expect, it, vi } from "vitest";
import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { HOST, buildManager, cleanupDirectories, metadata } from "./helpers/standalone-root-harness.js";

vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class { assertAdmitted = async () => undefined; },
}));

/**
 * ARCH-F-002 (autobyteus-316): the first message after a saved agent runtime switch reaches the lifecycle through the run's
 * real root and host handle, which build the member context from the current metadata and are not changed by the switch.
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

const THREAD_ID = "33333333-3333-4333-8333-333333333333";
const PENDING = {
  requestedAt: "2026-10-30T10:00:00.000Z",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, platformAgentRunId: "session-1" },
};

describe("the first message after a saved agent runtime switch, through the real root and host handle", () => {
  it("builds the host member context, then the lifecycle makes the switch with it: fresh session, marker, commit without the pending field, notice", async () => {
    const f = await buildManager();
    f.host.crash();
    const pending: AgentRunMetadata = metadata(f.memoryDir, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", platformAgentRunId: null, pendingRuntimeSwitch: PENDING });
    f.setMetadata({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", platformAgentRunId: null, pendingRuntimeSwitch: PENDING });

    const order: string[] = [];
    const run = { runId: HOST };
    const fresh = {
      runId: HOST, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: THREAD_ID,
      commitPublication: vi.fn(() => { order.push("publish"); manager.getActiveRun.mockReturnValue(run); return run; }),
      abort: vi.fn(async () => ({ kind: "aborted" as const })),
    };
    const manager = testActivationManager({
      getActiveRun: vi.fn(() => null),
      newPreparation: vi.fn(async (request: { config: { memberExecutionContext: unknown; runtimeKind: RuntimeKind } }) => {
        order.push(`prepare:${request.config.runtimeKind}`);
        expect(request.config.memberExecutionContext).toBe(f.contexts[0]);
        return fresh;
      }),
      restorePreparation: vi.fn(), platformPreparation: vi.fn(),
    });
    let stored: AgentRunMetadata = pending;
    const memory = { record: vi.fn(() => { order.push("record"); }) };
    const notices = { register: vi.fn(() => { order.push("register"); }) };
    const lifecycle = new StandaloneAgentRunLifecycleService("/unused", {
      agentRunManager: manager as never,
      metadataService: { readMetadataState: vi.fn(async () => ({ kind: "present" as const, metadata: stored })) } as never,
      historyCatalogService: { recordRunStarted: vi.fn(async (input: AgentRunMetadata & { clearPendingRuntimeSwitch?: boolean }) => {
        order.push("commit");
        const { clearPendingRuntimeSwitch, ...written } = input;
        stored = written;
        return written;
      }) } as never,
      workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-1" })) } as never,
      tokenUsageReadiness: { assertCurrentSchemaReady: () => undefined, assertExistingRunRestoreReady: () => undefined },
      modelSelectionValidator: { validate: vi.fn() } as never,
      switching: { memory, notices },
    });
    f.restores.mockImplementation(async (hostRunId, input) => {
      f.contexts.push(input.memberExecutionContext!);
      const result = await lifecycle.activateHost(hostRunId, input);
      return result as never;
    });

    const root = (await f.manager.resolveRootAndEnsureHost(HOST))!;

    expect(root).toBeTruthy();
    expect(f.contexts[0]?.identity).toMatchObject({ agentRunId: HOST, memberAddress: "/research_assistant" });
    expect(order).toEqual(["prepare:codex_app_server", "record", "commit", "publish", "register"]);
    expect(stored.platformAgentRunId).toBe(THREAD_ID);
    expect(Object.hasOwn(stored, "pendingRuntimeSwitch")).toBe(false);
    expect(memory.record).toHaveBeenCalledWith(pending.memoryDir, expect.objectContaining({
      from: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" }, to: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5" } }));
  });
});
