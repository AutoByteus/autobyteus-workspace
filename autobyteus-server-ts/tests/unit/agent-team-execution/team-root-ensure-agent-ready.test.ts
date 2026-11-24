import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

/**
 * autobyteus-638 C-2: `RootTeamRun.ensureAgentReady(agentRunId)` makes one member's agent ready without input, in the
 * root's gate (a restart brings a person's Team back with its coordinator). Real root, flat backend and manager; only the
 * provider execution is a double.
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

describe("RootTeamRun.ensureAgentReady", () => {
  it("starts only that member's agent, posts nothing, and returns the live run on a second call", async () => {
    const f = await harness({ withTeammate: true });
    expect(f.handles.size).toBe(0);
    await f.root.ensureAgentReady("run-coordinator");
    const coordinator = f.handles.get("run-coordinator")!.handle;
    expect(coordinator.getOrCreateAgentRun).toHaveBeenCalledTimes(1);
    expect(coordinator.postMessage).not.toHaveBeenCalled();
    expect(coordinator.reserveInput).not.toHaveBeenCalled();
    expect(f.handles.has("run-worker")).toBe(false);
    await f.root.ensureAgentReady("run-coordinator");
    expect(f.handles.get("run-coordinator")!.handle).toBe(coordinator);
    expect(coordinator.getOrCreateAgentRun).toHaveBeenCalledTimes(2);
  });

  it("refuses an agent that is not a member with RUN_NOT_FOUND, starting nothing", async () => {
    const f = await harness();
    await expect(f.root.ensureAgentReady("run-stranger")).rejects.toThrow("RUN_NOT_FOUND: AgentRun 'run-stranger' is not in root");
    expect(f.handles.size).toBe(0);
  });
});
