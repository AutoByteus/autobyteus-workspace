import { afterEach, describe, expect, it, vi } from "vitest";
import { RunModelSelectionService } from "../../../src/llm-management/services/run-model-selection-service.js";
import { storedModelNotOfferedRefusal } from "../../../src/llm-management/services/run-model-selection-refusal.js";
import { MODEL_LIST_READ_MS } from "../../../src/runtime-management/read-deadline.js";
import { NO_ON_DEMAND_MODELS } from "../../helpers/explicit-host-collaborators.js";

/**
 * autobyteus-500 G-5 (REQ-016, AC-012): whether a run's stored model is offered by its runtime now, from the runtime's list
 * only, bounded by the one-runtime model-list budget (8 s). A list that cannot be read, or not in time, is
 * `list_unreadable` and the start proceeds as before.
 */
const catalogOf = (read: (runtimeKind: string, cwd?: string, options?: { deadline?: unknown }) => Promise<unknown>) =>
  new RunModelSelectionService({ runtimeModelSelectionCatalog: read as never }, NO_ON_DEMAND_MODELS);
const offering = (...ids: string[]) => async () => ({ offeredModels: ids.map((model_identifier) => ({ model_identifier })) });

afterEach(() => { vi.useRealTimers(); });

describe("storedModelOffer (G-5)", () => {
  it("answers from the runtime's list only: offered, or not offered", async () => {
    const read = vi.fn(offering("sonnet", "opus"));
    const service = catalogOf(read);
    await expect(service.storedModelOffer({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" })).resolves.toBe("offered");
    await expect(service.storedModelOffer({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "retired" })).resolves.toBe("not_offered");
    expect(read).toHaveBeenCalledWith("claude_agent_sdk", undefined, { deadline: expect.objectContaining({ endsAt: expect.any(Number) }) });
  });

  it("a list that cannot be read is list_unreadable (the start proceeds)", async () => {
    const service = catalogOf(async () => { throw new Error("CLI not signed in"); });
    await expect(service.storedModelOffer({ runtimeKind: "grok_build", llmModelIdentifier: "grok-4" })).resolves.toBe("list_unreadable");
  });

  it.each(["grok_build", "autobyteus"])("a %s catalog slower than the 8 s budget (even one that ignores its deadline) answers list_unreadable at the budget", async (runtimeKind) => {
    vi.useFakeTimers();
    const service = catalogOf(() => new Promise(() => undefined));
    let answer: string | null = null;
    void service.storedModelOffer({ runtimeKind, llmModelIdentifier: "model" }).then((value) => { answer = value; });
    await vi.advanceTimersByTimeAsync(MODEL_LIST_READ_MS - 1);
    expect(answer).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(answer).toBe("list_unreadable");
  });

  it("the refusal says what happened, why, and what to do", () => {
    expect(storedModelNotOfferedRefusal({ agentName: "writer", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-old" })).toEqual({
      code: "RUN_MODEL_NOT_OFFERED",
      message: "writer can't start: its saved model 'gpt-old' is not offered by Codex App Server now. Stop it, then choose a runtime and model for writer in Settings.",
    });
  });
});
