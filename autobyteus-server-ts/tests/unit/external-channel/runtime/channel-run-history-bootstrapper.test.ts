import { describe, expect, it, vi } from "vitest";
import { ChannelRunHistoryBootstrapper } from "../../../../src/external-channel/runtime/channel-run-history-bootstrapper.js";

describe("ChannelRunHistoryBootstrapper", () => {
  it("persists manifest and run history with runtime metadata for messaging-created runs", async () => {
    const writeManifest = vi.fn().mockResolvedValue(undefined);
    const upsertRunHistoryRow = vi.fn().mockResolvedValue(undefined);
    const bootstrapper = new ChannelRunHistoryBootstrapper({
      manifestStore: { writeManifest },
      runHistoryService: { upsertRunHistoryRow },
    });

    await bootstrapper.bootstrapNewRun({
      agentDefinitionId: "agent-definition-1",
      launchPreset: {
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "gpt-test",
        runtimeKind: "AUTOBYTEUS",
        autoExecuteTools: false,
        skillAccessMode: "PRELOADED_ONLY",
        llmConfig: { temperature: 0.2 },
      },
      session: {
        runId: "agent-run-1",
        runtimeKind: "codex_app_server",
        mode: "agent",
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "session-1",
          threadId: "thread-1",
          metadata: { origin: "messaging" },
        },
      },
      initialSummary: "First external message",
    });

    expect(writeManifest).toHaveBeenCalledWith(
      "agent-run-1",
      expect.objectContaining({
        agentDefinitionId: "agent-definition-1",
        workspaceRootPath: "/tmp/workspace",
        llmModelIdentifier: "gpt-test",
        runtimeKind: "codex_app_server",
        runtimeReference: {
          runtimeKind: "codex_app_server",
          sessionId: "session-1",
          threadId: "thread-1",
          metadata: { origin: "messaging" },
        },
      }),
    );
    expect(upsertRunHistoryRow).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "agent-run-1",
        summary: "First external message",
        manifest: expect.objectContaining({
          runtimeKind: "codex_app_server",
          runtimeReference: {
            runtimeKind: "codex_app_server",
            sessionId: "session-1",
            threadId: "thread-1",
            metadata: { origin: "messaging" },
          },
        }),
      }),
    );
  });
});
