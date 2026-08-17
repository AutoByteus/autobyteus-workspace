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
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";

const createRunContext = (
  runId: string,
  workingDirectory: string,
  input: {
    autoExecuteTools?: boolean;
    approvalPolicy?: CodexApprovalPolicy;
    sandbox?: "read-only" | "workspace-write" | "danger-full-access";
    serviceTier?: string | null;
    threadId?: string | null;
    teamRunId?: string | null;
    appServerConfig?: Record<string, unknown> | null;
  } = {},
) =>
  new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def",
      llmModelIdentifier: "",
      autoExecuteTools: input.autoExecuteTools ?? false,
      workspaceId: workingDirectory,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
      memberTeamContext: input.teamRunId
        ? new MemberTeamContext({
            identity: {
              rootTeamRunId: input.teamRunId,
              memberAddress: `/${runId}`,
              agentRunId: runId,
            },
            collaboration: { outgoingHandoffs: [] },
          })
        : null,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: null,
        workingDirectory,
        reasoningEffort: null,
        serviceTier: input.serviceTier ?? null,
        approvalPolicy: input.approvalPolicy ?? CodexApprovalPolicy.ON_REQUEST,
        sandbox: input.sandbox ?? "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        appServerConfig: input.appServerConfig ?? null,
        dynamicTools: [],
      },
      threadId: input.threadId ?? null,
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

    const thread = await manager.createThread(
      createRunContext("run-1", "/tmp/workspace", { serviceTier: "fast" }),
    );

    expect(clientManager.acquireClient).toHaveBeenCalledWith(
      "/tmp/workspace",
    );
    expect(clientThreadRouter.registerThread).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        cwd: "/tmp/workspace",
        serviceTier: "fast",
      }),
    );
    expect(thread.threadId).toBe("thread-live-1");
    expect(thread.startup.status).toBe("ready");
  });

  it("uses the workspace app-server client boundary for same-workspace standalone agent runs", async () => {
    const sharedClient = {
      request: vi.fn(async () => ({
        thread: { id: `thread-${sharedClient.request.mock.calls.length}` },
      })),
      onNotification: vi.fn(() => () => {}),
      onServerRequest: vi.fn(() => () => {}),
      onClose: vi.fn(() => () => {}),
    } as unknown as CodexAppServerClient;
    const clientManager = {
      acquireClient: vi.fn(async () => sharedClient),
      releaseClient: vi.fn(async () => undefined),
    } as unknown as CodexAppServerClientManager;
    const threadCleanup = {
      cleanupThreadResources: vi.fn(async () => undefined),
    } as unknown as CodexThreadCleanup;
    const clientThreadRouter = {
      registerThread: vi.fn(() => () => {}),
    } as unknown as CodexClientThreadRouter;
    const manager = new CodexThreadManager(
      clientManager,
      threadCleanup,
      clientThreadRouter,
    );

    const firstThread = await manager.createThread(createRunContext("run-one", "/tmp/workspace"));
    const secondThread = await manager.createThread(createRunContext("run-two", "/tmp/workspace"));

    expect(firstThread.client).toBe(sharedClient);
    expect(secondThread.client).toBe(sharedClient);
    expect(clientManager.acquireClient).toHaveBeenNthCalledWith(1, "/tmp/workspace");
    expect(clientManager.acquireClient).toHaveBeenNthCalledWith(2, "/tmp/workspace");
    expect(clientThreadRouter.registerThread).toHaveBeenCalledTimes(2);
    expect(clientThreadRouter.registerThread).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ client: sharedClient }),
    );
    expect(clientThreadRouter.registerThread).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ client: sharedClient }),
    );
  });

  it("shares the cwd-scoped app-server client for team member runs", async () => {
    const sharedClient = {
      request: vi.fn(async (_method: string, params: { threadId?: string }) => ({
        thread: { id: params.threadId ? "thread-restored" : `thread-${sharedClient.request.mock.calls.length}` },
      })),
      onNotification: vi.fn(() => () => {}),
      onServerRequest: vi.fn(() => () => {}),
      onClose: vi.fn(() => () => {}),
    } as unknown as CodexAppServerClient;
    const clientManager = {
      acquireClient: vi.fn(async () => sharedClient),
      releaseClient: vi.fn(async () => undefined),
    } as unknown as CodexAppServerClientManager;
    const threadCleanup = {
      cleanupThreadResources: vi.fn(async () => undefined),
    } as unknown as CodexThreadCleanup;
    const clientThreadRouter = {
      registerThread: vi.fn(() => () => {}),
    } as unknown as CodexClientThreadRouter;
    const manager = new CodexThreadManager(
      clientManager,
      threadCleanup,
      clientThreadRouter,
    );

    const firstThread = await manager.createThread(
      createRunContext("team-run-one", "/tmp/workspace", { teamRunId: "team-1" }),
    );
    const secondThread = await manager.createThread(
      createRunContext("team-run-two", "/tmp/workspace", { teamRunId: "team-1" }),
    );

    expect(firstThread.client).toBe(sharedClient);
    expect(secondThread.client).toBe(sharedClient);
    expect(clientManager.acquireClient).toHaveBeenCalledWith("/tmp/workspace");
    expect(clientManager.acquireClient).toHaveBeenCalledTimes(2);
    expect(clientThreadRouter.registerThread).toHaveBeenCalledTimes(2);
  });

  it("passes auto-approved access config to Codex thread start and resume", async () => {
    const request = vi.fn(async (method: string) => ({
      thread: {
        id: method === "thread/resume" ? "thread-auto-resumed" : "thread-auto-started",
      },
    }));
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
      registerThread: vi.fn(() => () => {}),
    } as unknown as CodexClientThreadRouter;
    const manager = new CodexThreadManager(
      clientManager,
      threadCleanup,
      clientThreadRouter,
    );
    const autoConfig = {
      autoExecuteTools: true,
      approvalPolicy: CodexApprovalPolicy.NEVER,
      sandbox: "danger-full-access" as const,
    };

    await manager.createThread(createRunContext("run-auto-start", "/tmp/workspace", autoConfig));
    await manager.restoreThread(
      createRunContext("run-auto-resume", "/tmp/workspace", {
        ...autoConfig,
        threadId: "thread-existing-auto",
      }),
    );

    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        approvalPolicy: "never",
        sandbox: "danger-full-access",
      }),
    );
    expect(request).toHaveBeenCalledWith(
      "thread/resume",
      expect.objectContaining({
        threadId: "thread-existing-auto",
        approvalPolicy: "never",
        sandbox: "danger-full-access",
      }),
    );
  });

  it("passes serviceTier when resuming a remote Codex thread", async () => {
    const request = vi.fn(async () => ({
      thread: {
        id: "thread-restored-1",
      },
    }));
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
      registerThread: vi.fn(() => () => {}),
    } as unknown as CodexClientThreadRouter;
    const manager = new CodexThreadManager(
      clientManager,
      threadCleanup,
      clientThreadRouter,
    );

    await manager.restoreThread(
      createRunContext("run-restore", "/tmp/workspace", {
        serviceTier: "fast",
        threadId: "thread-existing",
      }),
    );

    expect(request).toHaveBeenCalledWith(
      "thread/resume",
      expect.objectContaining({
        threadId: "thread-existing",
        serviceTier: "fast",
      }),
    );
  });

  it("passes thread-scoped app-server config to thread start and resume", async () => {
    const request = vi.fn(async (method: string) => ({
      thread: {
        id: method === "thread/resume" ? "thread-resumed-config" : "thread-started-config",
      },
    }));
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
      registerThread: vi.fn(() => () => {}),
    } as unknown as CodexClientThreadRouter;
    const manager = new CodexThreadManager(
      clientManager,
      threadCleanup,
      clientThreadRouter,
    );
    const appServerConfig = {
      mcp_servers: {
        autobyteus_agent_tools: {
          url: "http://127.0.0.1:3000/mcp/agent-tools/session-codex",
          http_headers: {
            Authorization: "Bearer unit-test-agent-tools-token",
          },
          enabled_tools: ["send_message_to"],
          startup_timeout_sec: 5,
        },
      },
    };

    await manager.createThread(
      createRunContext("run-start-config", "/tmp/workspace", { appServerConfig }),
    );
    await manager.restoreThread(
      createRunContext("run-resume-config", "/tmp/workspace", {
        threadId: "thread-existing-config",
        appServerConfig,
      }),
    );

    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        config: appServerConfig,
      }),
    );
    expect(request).toHaveBeenCalledWith(
      "thread/resume",
      expect.objectContaining({
        threadId: "thread-existing-config",
        config: appServerConfig,
      }),
    );
  });

  it("surfaces a known-thread resume failure without starting a replacement thread", async () => {
    const request = vi.fn(async (method: string) => {
      if (method === "thread/resume") throw new Error("known thread unavailable");
      return { thread: { id: "replacement-must-not-start" } };
    });
    const client = {
      request,
      onNotification: vi.fn(() => () => {}),
      onServerRequest: vi.fn(() => () => {}),
      onClose: vi.fn(() => () => {}),
    } as unknown as CodexAppServerClient;
    const releaseClient = vi.fn(async () => undefined);
    const manager = new CodexThreadManager(
      {
        acquireClient: vi.fn(async () => client),
        releaseClient,
      } as unknown as CodexAppServerClientManager,
      { cleanupThreadResources: vi.fn(async () => undefined) } as unknown as CodexThreadCleanup,
      { registerThread: vi.fn(() => () => {}) } as unknown as CodexClientThreadRouter,
    );

    await expect(manager.restoreThread(
      createRunContext("run-known-resume", "/tmp/workspace", {
        threadId: "thread-known",
      }),
    )).rejects.toThrow("known thread unavailable");

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "thread/resume",
      expect.objectContaining({ threadId: "thread-known" }),
    );
    expect(request).not.toHaveBeenCalledWith("thread/start", expect.anything());
    expect(releaseClient).toHaveBeenCalledWith("/tmp/workspace");
  });
});
