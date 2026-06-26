import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexAgentRunBackend } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend.js";
import { CodexThread } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread.js";
import { CodexThreadEventName } from "../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

vi.mock("../../../../../src/token-usage/pricing/token-price-config-provider.js", () => ({
  TokenPriceConfigProvider: class TokenPriceConfigProvider {
    async resolvePolicy() {
      return {
        pricing_policy_key: null,
        price_config_id: null,
        model_provider: null,
        model_identifier: null,
        model_value: null,
        canonical_name: null,
        currency: null,
        input_price_per_million: null,
        output_price_per_million: null,
        cached_input_read_price_per_million: null,
        cached_input_write_price_per_million: null,
        cached_input_write_5m_price_per_million: null,
        cached_input_write_1h_price_per_million: null,
        input_price_tiers: [],
        pricing_status: "missing",
        trusted_dimensions: {
          input: false,
          output: false,
          cached_input_read: false,
          cached_input_write: false,
          cached_input_write_5m: false,
          cached_input_write_1h: false,
        },
        missing_reason: "test_unpriced",
        source: null,
        effective_from: null,
        effective_to: null,
        version: null,
      };
    }
  },
}));

const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for expected Codex backend event.");
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
};

const createBackend = (overrides: Record<string, unknown> = {}) => {
  const threadManager = {
    hasThread: vi.fn().mockReturnValue(true),
    terminateThread: vi.fn().mockResolvedValue(undefined),
  };

  const runContext = {
    runId: "run-codex-1",
    config: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    },
    runtimeContext: {
      threadId: "thread-1",
      activeTurnId: null,
      codexThreadConfig: {
        model: null,
        workingDirectory: "/tmp/codex-backend-test-workspace",
        reasoningEffort: null,
        serviceTier: null,
        approvalPolicy: null,
        sandbox: null,
      },
    },
  };

  const startup = {
    status: "ready",
    waitForReady: Promise.resolve(),
    resolveReady: vi.fn(),
    rejectReady: vi.fn(),
  };

  const client = {
    request: vi.fn().mockResolvedValue({
      turn: {
        id: "turn-1",
      },
    }),
    respondSuccess: vi.fn(),
    respondError: vi.fn(),
  };

  const codexThread = new CodexThread({
    runContext: runContext as any,
    client: client as any,
    startup: startup as any,
  });

  Object.assign(codexThread, overrides);

  return {
    codexThread,
    threadManager,
    emitThreadEvent: (event: Record<string, unknown>) => {
      codexThread.handleAppServerNotification(
        String(event.method),
        (event.params ?? {}) as Record<string, unknown>,
      );
    },
    backend: new CodexAgentRunBackend(
      runContext as any,
      codexThread as any,
      threadManager as any,
    ),
  };
};

describe("CodexAgentRunBackend", () => {
  it("returns the accepted platform run id from the codex thread", async () => {
    const { backend, codexThread } = createBackend();

    const result = await backend.postUserMessage(
      new AgentInputUserMessage("hello codex"),
    );

    expect((codexThread.client as any).request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        input: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            text: "hello codex",
          }),
        ]),
      }),
    );
    expect(result).toEqual({
      accepted: true,
      turnId: "turn-1",
      platformAgentRunId: "thread-1",
    });
  });

  it("returns a runtime command failure when the codex thread sendTurn throws", async () => {
    const { backend } = createBackend({
      client: {
        request: vi.fn().mockRejectedValue(new Error("boom")),
        respondSuccess: vi.fn(),
        respondError: vi.fn(),
      },
    });

    const result = await backend.postUserMessage(
      new AgentInputUserMessage("hello failing codex"),
    );

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("Failed to send user input");
  });

  it("dispatches idle lifecycle events even when token usage updates were observed earlier", async () => {
    const { backend, codexThread, emitThreadEvent } = createBackend();
    codexThread.runContext.runtimeContext.activeTurnId = "turn-usage-1";
    codexThread.runContext.runtimeContext.codexThreadConfig.model = "gpt-5.4-mini";
    codexThread.setCurrentStatus("RUNNING");

    const emittedEvents: Array<Record<string, unknown>> = [];
    backend.subscribeToEvents((event) => {
      emittedEvents.push(event as unknown as Record<string, unknown>);
    });

    emitThreadEvent({
      method: CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED,
      params: {
        threadId: "thread-1",
        turnId: "turn-usage-1",
        tokenUsage: {
          modelContextWindow: 128000,
          last: {
            totalTokens: 15,
            inputTokens: 10,
            cachedInputTokens: 4,
            outputTokens: 5,
            reasoningOutputTokens: 2,
          },
        },
      },
    });

    emitThreadEvent({
      method: CodexThreadEventName.THREAD_STATUS_CHANGED,
      params: {
        threadId: "thread-1",
        status: {
          type: "idle",
        },
      },
    });

    emitThreadEvent({
      method: CodexThreadEventName.TURN_COMPLETED,
      params: {
        threadId: "thread-1",
        turn: {
          id: "turn-usage-1",
        },
      },
    });
    await waitForCondition(() =>
      emittedEvents.some((event) => event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED),
    );

    expect(emittedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: expect.objectContaining({
            status: "idle",
            can_interrupt: false,
          }),
        }),
        expect.objectContaining({
          eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
          runId: "run-codex-1",
          payload: expect.objectContaining({
            turn_id: "turn-usage-1",
            runtime_kind: "codex_app_server",
            ingestion_kind: "codex_thread_token_usage",
            usage_scope: "per_turn",
            idempotency_key: "codex_token_usage:run-codex-1:thread-1:turn-usage-1:per_turn:10:5:15",
            reported_input_tokens: 10,
            reported_output_tokens: 5,
            reported_total_tokens: 15,
            input_token_semantic: "gross_includes_cache",
            cache_read_input_tokens: 4,
            cache_state: "positive",
            reasoning_output_tokens: 2,
            latest_prompt_tokens: 10,
            effective_context_window_tokens: 128000,
            context_window_usage_percent: 0.0078125,
            model_provider: "OPENAI",
            model_identifier: "gpt-5.4-mini",
            raw_usage_json: {
              totalTokens: 15,
              inputTokens: 10,
              cachedInputTokens: 4,
              outputTokens: 5,
              reasoningOutputTokens: 2,
            },
          }),
        }),
        expect.objectContaining({
          eventType: AgentRunEventType.TURN_COMPLETED,
          payload: expect.objectContaining({
            turnId: "turn-usage-1",
          }),
        }),
      ]),
    );
  });

  it("emits normalized token usage events for late token usage updates after idle", async () => {
    const { backend, codexThread, emitThreadEvent } = createBackend();
    codexThread.runContext.runtimeContext.activeTurnId = "turn-late-usage-1";
    codexThread.runContext.runtimeContext.codexThreadConfig.model = "gpt-5.4-mini";
    codexThread.setCurrentStatus("IDLE");

    const emittedEvents: Array<Record<string, unknown>> = [];
    backend.subscribeToEvents((event) => {
      emittedEvents.push(event as unknown as Record<string, unknown>);
    });

    emitThreadEvent({
      method: CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED,
      params: {
        threadId: "thread-1",
        turnId: "turn-late-usage-1",
        tokenUsage: {
          last: {
            totalTokens: 18,
            inputTokens: 11,
            outputTokens: 7,
          },
        },
      },
    });

    await waitForCondition(() => emittedEvents.length === 1);

    expect(emittedEvents).toEqual([
      expect.objectContaining({
        eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
        runId: "run-codex-1",
        payload: expect.objectContaining({
          turn_id: "turn-late-usage-1",
          usage_scope: "per_turn",
          idempotency_key: "codex_token_usage:run-codex-1:thread-1:turn-late-usage-1:per_turn:11:7:18",
          reported_input_tokens: 11,
          reported_output_tokens: 7,
          reported_total_tokens: 18,
        }),
      }),
    ]);
  });
});
