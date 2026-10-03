import { describe, expect, it, vi } from "vitest";
import { RuntimeAvailabilityService } from "../../../src/runtime-management/runtime-availability-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

describe("independent runtime availability", () => {
  it("inventories registered kinds without probes and verifies only the requested provider", async () => {
    const codex = vi.fn(async () => ({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, enabled: true, reason: null }));
    const agy = vi.fn(() => new Promise<never>(() => {}));
    const service = new RuntimeAvailabilityService([
      { runtimeKind: RuntimeKind.CODEX_APP_SERVER, getRuntimeAvailability: codex },
      { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, getRuntimeAvailability: agy },
    ]);
    expect(service.listRuntimeKinds()).toEqual([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.ANTIGRAVITY_CLI, RuntimeKind.AUTOBYTEUS]);
    expect(codex).not.toHaveBeenCalled(); expect(agy).not.toHaveBeenCalled();
    await expect(service.getRuntimeAvailability(RuntimeKind.CODEX_APP_SERVER)).resolves.toEqual({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, enabled: true, reason: null });
    expect(codex).toHaveBeenCalledTimes(1); expect(agy).not.toHaveBeenCalled();
    await expect(service.getRuntimeAvailability(RuntimeKind.AUTOBYTEUS)).resolves.toMatchObject({ enabled: true });
  });
  it("preserves disabled reasons, provider failures and unconfigured choices", async () => {
    const probe = vi.fn(async () => ({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, enabled: false, reason: "Missing CLI" }));
    const service = new RuntimeAvailabilityService([{ runtimeKind: RuntimeKind.CODEX_APP_SERVER, getRuntimeAvailability: probe }]);
    await expect(service.getRuntimeAvailability(RuntimeKind.CODEX_APP_SERVER)).resolves.toMatchObject({ enabled: false, reason: "Missing CLI" });
    probe.mockRejectedValueOnce(new Error("provider failed"));
    await expect(service.getRuntimeAvailability(RuntimeKind.CODEX_APP_SERVER)).rejects.toThrow("provider failed");
    await expect(service.getRuntimeAvailability(RuntimeKind.CLAUDE_AGENT_SDK)).resolves.toMatchObject({ enabled: false, reason: expect.stringContaining("not configured") });
  });
});
