import { describe, expect, it, vi } from "vitest";
import {
  CodexAppServerRuntimeService,
  mapCodexModelListRowToModelInfo,
  normalizeCodexReasoningEffort,
  resolveCodexSessionReasoningEffort,
} from "../../../../src/runtime-execution/codex-app-server/codex-app-server-runtime-service.js";

describe("codex-app-server-runtime-service helpers", () => {
  it("normalizes codex reasoning effort values", () => {
    expect(normalizeCodexReasoningEffort("HIGH")).toBe("high");
    expect(normalizeCodexReasoningEffort(" medium ")).toBe("medium");
    expect(normalizeCodexReasoningEffort("invalid")).toBeNull();
    expect(normalizeCodexReasoningEffort(null)).toBeNull();
  });

  it("resolves reasoning effort from llmConfig first, then runtime metadata", () => {
    expect(
      resolveCodexSessionReasoningEffort(
        { reasoning_effort: "high" },
        { reasoningEffort: "low" },
      ),
    ).toBe("high");

    expect(resolveCodexSessionReasoningEffort(null, { reasoningEffort: "MEDIUM" })).toBe(
      "medium",
    );

    expect(
      resolveCodexSessionReasoningEffort(
        { reasoning_effort: "not-a-valid-effort" },
        { reasoning_effort: "low" },
      ),
    ).toBe("low");
  });

  it("maps codex model rows with reasoning config schema", () => {
    const mapped = mapCodexModelListRowToModelInfo({
      id: "gpt-5.3-codex",
      model: "gpt-5.3-codex",
      displayName: "gpt-5.3-codex",
      supportedReasoningEfforts: [
        { reasoningEffort: "low" },
        { reasoningEffort: "medium" },
        { reasoningEffort: "high" },
      ],
      defaultReasoningEffort: "medium",
    });

    expect(mapped).not.toBeNull();
    expect(mapped?.display_name).toContain("default reasoning: medium");
    const schema = mapped?.config_schema as {
      parameters?: Array<{ name?: string; default_value?: unknown; enum_values?: unknown[] }>;
    };
    expect(schema.parameters?.[0]?.name).toBe("reasoning_effort");
    expect(schema.parameters?.[0]?.default_value).toBe("medium");
    expect(schema.parameters?.[0]?.enum_values).toEqual(["low", "medium", "high"]);
  });

  it("returns null when model row is missing an identifier", () => {
    expect(mapCodexModelListRowToModelInfo({ displayName: "missing-id" })).toBeNull();
  });
});

describe("CodexAppServerRuntimeService.sendTurn", () => {
  it("uses session reasoning effort when dispatching turn/start", async () => {
    const service = new CodexAppServerRuntimeService();
    const request = vi.fn().mockResolvedValue({ turn: { id: "turn-1" } });

    (service as unknown as { sessions: Map<string, unknown> }).sessions.set("run-1", {
      runId: "run-1",
      client: {
        request,
        close: vi.fn().mockResolvedValue(undefined),
      },
      threadId: "thread-1",
      model: "gpt-5.3-codex",
      workingDirectory: "/tmp",
      reasoningEffort: "high",
      activeTurnId: null,
      approvalRecords: new Map(),
      listeners: new Set(),
      unbindHandlers: [],
    });

    await service.sendTurn("run-1", {
      content: "hello",
      contextFiles: [],
    } as any);

    expect(request).toHaveBeenCalledWith(
      "turn/start",
      expect.objectContaining({
        threadId: "thread-1",
        model: "gpt-5.3-codex",
        effort: "high",
      }),
    );
  });
});
