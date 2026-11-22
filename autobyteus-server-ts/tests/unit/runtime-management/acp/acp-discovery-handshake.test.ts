import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { runAcpDiscoveryHandshake } from "../../../../src/runtime-management/acp/acp-discovery-handshake.js";
import { createReadDeadline } from "../../../../src/runtime-management/read-deadline.js";
import {
  fakeAcpLaunchProfile,
  readFixture,
  removeTestTempDirs,
  writeCustomFixture,
  type FixtureRow,
} from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

/**
 * The discovery handshake with a follow-up notification (autobyteus-551 REQ-002, DS-003), against the fake ACP agent:
 * an agent may announce, shortly after `initialize`, a connection-wide notification that replaces part of its answer.
 * The method and the window are the caller's; the cases use short windows.
 */
const [INITIALIZE_REQUEST, INITIALIZE_ANSWER] = readFixture("handshake") as [FixtureRow, FixtureRow];
const FOLLOW_UP = "agent/catalog_update";
const announce = (method: string, n: number): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", method, params: { n } } });
/** The fake agent's own pause row (not in the harness's row type). */
const pause = (ms: number): FixtureRow => ({ dir: "pause", ms } as unknown as FixtureRow);

let fixture = "";
const profile = fakeAcpLaunchProfile("Fake Agent", () => ({ FAKE_ACP_FIXTURE: fixture }));
const timed = async <T>(work: () => Promise<T>): Promise<{ value: T; ms: number }> => {
  const started = performance.now();
  const value = await work();
  return { value, ms: performance.now() - started };
};

afterEach(() => { vi.useRealTimers(); });
afterAll(removeTestTempDirs);

describe("runAcpDiscoveryHandshake follow-up", () => {
  it("returns the follow-up that comes after the answer, ending the wait when it comes", async () => {
    fixture = writeCustomFixture([INITIALIZE_REQUEST, INITIALIZE_ANSWER, pause(150), announce(FOLLOW_UP, 1), announce(FOLLOW_UP, 2)]);
    const { value, ms } = await timed(() => runAcpDiscoveryHandshake(profile, { method: FOLLOW_UP, withinMs: 5_000 }));
    expect(value.initialize.agentCapabilities?.loadSession).toBe(true);
    expect(value.followUp).toEqual({ n: 1 });
    expect(ms).toBeLessThan(4_000);
  }, 20_000);

  it("keeps a follow-up that comes before the answer and returns at once", async () => {
    fixture = writeCustomFixture([INITIALIZE_REQUEST, announce(FOLLOW_UP, 1), INITIALIZE_ANSWER]);
    const { value, ms } = await timed(() => runAcpDiscoveryHandshake(profile, { method: FOLLOW_UP, withinMs: 5_000 }));
    expect(value.followUp).toEqual({ n: 1 });
    expect(ms).toBeLessThan(4_000);
  }, 20_000);

  it("returns the answer alone after the window when no follow-up comes; other notifications do not count", async () => {
    fixture = writeCustomFixture([INITIALIZE_REQUEST, INITIALIZE_ANSWER, announce("agent/other", 1)]);
    const { value, ms } = await timed(() => runAcpDiscoveryHandshake(profile, { method: FOLLOW_UP, withinMs: 400 }));
    expect(value.initialize.agentCapabilities?.loadSession).toBe(true);
    expect(value.followUp).toBeNull();
    expect(ms).toBeGreaterThanOrEqual(390);
  }, 20_000);

  it("ends the wait shortly before the process's bound: the answer is returned, never a time-out", async () => {
    fixture = writeCustomFixture([INITIALIZE_REQUEST, INITIALIZE_ANSWER]);
    const { value, ms } = await timed(() => runAcpDiscoveryHandshake(profile, { method: FOLLOW_UP, withinMs: 60_000 },
      { deadline: createReadDeadline(3_000) }));
    expect(value.followUp).toBeNull();
    expect(value.initialize.agentCapabilities?.loadSession).toBe(true);
    expect(ms).toBeGreaterThan(2_000); // it waited until near the bound (3 s - 250 ms), not the window
    expect(ms).toBeLessThan(3_000);
  }, 20_000);

  // REQ-001 (AC-001): the short process's bound is 90 s; an agent that never answers fails with the time-out kind then.
  it("waits up to 90 s for an agent's answer, then fails with the time-out kind", async () => {
    fixture = writeCustomFixture([INITIALIZE_REQUEST]);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const state: { value: unknown } = { value: "pending" };
    runAcpDiscoveryHandshake(profile, { method: FOLLOW_UP, withinMs: 3_000 })
      .then((result) => { state.value = result; }, (error: unknown) => { state.value = error; });
    const until = performance.now() + 300;
    while (performance.now() < until) await new Promise((resolve) => setImmediate(resolve));
    await vi.advanceTimersByTimeAsync(89_999);
    expect(state.value).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    vi.useRealTimers();
    const settled = performance.now() + 5_000;
    while (state.value === "pending" && performance.now() < settled) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.value).toMatchObject({ name: "AcpDiscoveryError", kind: "timeout" });
  }, 20_000);
});
