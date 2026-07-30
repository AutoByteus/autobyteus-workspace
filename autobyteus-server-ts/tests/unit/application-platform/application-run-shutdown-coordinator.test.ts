import { describe, expect, it, vi } from "vitest";
import {
  ApplicationRunShutdownCoordinator,
} from "../../../src/application-platform/runtime/application-run-shutdown-coordinator.js";

describe("ApplicationRunShutdownCoordinator", () => {
  it("stops team runs before remaining agent runs and is idempotent", async () => {
    const order: string[] = [];
    const stopAllTeamRuns = vi.fn(async () => {
      order.push("teams");
    });
    const stopAllAgentRuns = vi.fn(async () => {
      order.push("agents");
    });
    const coordinator = new ApplicationRunShutdownCoordinator(
      { stopAllTeamRuns },
      { stopAllAgentRuns },
    );

    const firstStop = coordinator.stopAllRuns();
    const concurrentStop = coordinator.stopAllRuns();

    expect(concurrentStop).toBe(firstStop);
    await expect(firstStop).resolves.toBeUndefined();
    await expect(coordinator.stopAllRuns()).resolves.toBeUndefined();
    expect(order).toEqual(["teams", "agents"]);
    expect(stopAllTeamRuns).toHaveBeenCalledTimes(1);
    expect(stopAllAgentRuns).toHaveBeenCalledTimes(1);
  });

  it("continues after team failure and aggregates both owner failures", async () => {
    const order: string[] = [];
    const teamFailure = new Error("team shutdown failed");
    const agentFailure = new Error("agent shutdown failed");
    const coordinator = new ApplicationRunShutdownCoordinator(
      {
        stopAllTeamRuns: vi.fn(async () => {
          order.push("teams");
          throw teamFailure;
        }),
      },
      {
        stopAllAgentRuns: vi.fn(async () => {
          order.push("agents");
          throw agentFailure;
        }),
      },
    );

    const stop = coordinator.stopAllRuns();
    await expect(stop).rejects.toMatchObject({
      name: "AggregateError",
      message: "Application run shutdown failed.",
      errors: [teamFailure, agentFailure],
    });
    await expect(coordinator.stopAllRuns()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(["teams", "agents"]);
  });
});
