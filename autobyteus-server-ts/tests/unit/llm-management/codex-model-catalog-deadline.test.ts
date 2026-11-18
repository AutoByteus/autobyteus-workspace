import { describe, expect, it, vi } from "vitest";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";
import { createReadDeadline, DeadlineExceededError } from "../../../src/runtime-management/read-deadline.js";

describe("CodexModelCatalog with a step deadline", () => {
  it("abandons a model/list request that never answers at the deadline and releases the lease (AR-002)", async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(() => new Promise(() => undefined));
    const beginAcquire = vi.fn(() => ({ acquire: async () => ({ request }), release }));
    const catalog = new CodexModelCatalog({ beginAcquire } as never);
    const started = Date.now();
    await expect(catalog.listModels("/home/user", { deadline: createReadDeadline(150) })).rejects.toBeInstanceOf(DeadlineExceededError);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(beginAcquire).toHaveBeenCalledExactlyOnceWith("/home/user");
    expect(release).toHaveBeenCalledOnce();
  });

  it("reads every page as before when the requests answer in time", async () => {
    const release = vi.fn(async () => undefined);
    const pages = [
      { data: [{ id: "gpt-5.6", model: "gpt-5.6", displayName: "GPT-5.6" }], nextCursor: "next" },
      { data: [{ id: "gpt-5.6-mini", model: "gpt-5.6-mini", displayName: "GPT-5.6 mini" }], nextCursor: null },
    ];
    const request = vi.fn(async () => pages.shift());
    const catalog = new CodexModelCatalog({ beginAcquire: () => ({ acquire: async () => ({ request }), release }) } as never);
    const models = await catalog.listModels("/home/user", { deadline: createReadDeadline(5_000) });
    expect(request).toHaveBeenCalledTimes(2);
    expect(models.length).toBeGreaterThan(0);
    expect(release).toHaveBeenCalledOnce();
  });
});
