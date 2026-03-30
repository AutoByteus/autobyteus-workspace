import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { CodexAgentRunContext } from "../../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexThreadManager } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { CodexApprovalPolicy } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import type { CodexAppServerClient } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import type { CodexAppServerClientManager } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexClientThreadRouter } from "../../../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import type { CodexThreadCleanup } from "../../../../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";

const createRunContext = (runId: string, workingDirectory: string) =>
  new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def",
      llmModelIdentifier: "",
      autoExecuteTools: false,
      workspaceId: workingDirectory,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: null,
        workingDirectory,
        reasoningEffort: null,
        approvalPolicy: CodexApprovalPolicy.ON_REQUEST,
        sandbox: "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: [],
      },
    }),
  });

describe("CodexThreadManager", () => {
  it("registers the thread with the shared router before starting the remote thread", async () => {
    let routerRegistered = false;
    const request = vi.fn(async () => {
      expect(routerRegistered).toBe(true);
      return {
        thread: {
          id: "thread-live-1",
        },
      };
    });
    const client = {
      request,
      onNotification: vi.fn(() => () => {}),
      onServerRequest: vi.fn(() => () => {}),
      onClose: vi.fn(() => () => {}),
    } as unknown as CodexAppServerClient;

    const clientManager = {
      acquireClient: vi.fn(async () => client),
      releaseClient: vi.fn(async () => undefined),
    } as unknown as CodexAppServerClientManager;
    const threadCleanup = {
      cleanupThreadResources: vi.fn(async () => undefined),
    } as unknown as CodexThreadCleanup;
    const clientThreadRouter = {
      registerThread: vi.fn(() => {
        routerRegistered = true;
        return () => {
          routerRegistered = false;
        };
      }),
    } as unknown as CodexClientThreadRouter;

    const manager = new CodexThreadManager(
      clientManager,
      threadCleanup,
      clientThreadRouter,
    );

    const thread = await manager.createThread(createRunContext("run-1", "/tmp/workspace"));

    expect(clientThreadRouter.registerThread).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        cwd: "/tmp/workspace",
      }),
    );
    expect(thread.threadId).toBe("thread-live-1");
    expect(thread.startup.status).toBe("ready");
  });
});
