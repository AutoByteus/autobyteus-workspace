import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationAgentToolWorkerInvoker } from "../../../src/application-agent-tools/services/application-agent-tool-worker-invoker.js";
import { ApplicationEngineController } from "../../../src/application-engine/services/application-engine-controller.js";
import { ApplicationEngineLauncher } from "../../../src/application-engine/services/application-engine-launcher.js";
import { createApplicationEngineBaseStatus } from "../../../src/application-engine/services/application-engine-state-registry.js";

/**
 * autobyteus-296 (SR-002, AR-001, MP-001): a crashed worker (`failed`, detached) fails its tool calls closed until it is
 * stopped; a stop, as reentry's participant preparation does, resets it to `stopped`, and the next tool call starts it
 * on demand. The controller and the launcher's `ensureReady`/`stop` are real; only the launcher's worker start is
 * faked (it attaches a handle whose client answers the tool call).
 */
const APPLICATION_ID = "app-a";
const command = {
  applicationId: APPLICATION_ID,
  toolName: "probe",
  arguments: { value: "x" },
  caller: { bindingId: "binding-a", agentRunId: "run-a" },
} as never;
const toolResult = { content: [{ type: "text", text: "ok" }] };

const buildHarness = () => {
  const controller = new ApplicationEngineController();
  const launcher = new ApplicationEngineLauncher({
    applicationBundleService: {} as never,
    storageLifecycleService: {} as never,
    orchestrationHostService: {} as never,
    agentStreamingService: { stopApplication: vi.fn() } as never,
    controller,
  });
  const handle = {
    client: { request: vi.fn(async () => toolResult), close: vi.fn(async () => undefined) },
    supervisor: { stop: vi.fn(async () => undefined) },
  };
  const start = vi.spyOn(launcher as never as { startApplicationEngine: (id: string) => Promise<unknown> }, "startApplicationEngine")
    .mockImplementation(async (applicationId: string) => {
      controller.attach(applicationId, handle as never);
      const status = { ...createApplicationEngineBaseStatus(applicationId), state: "ready" as const, ready: true, startedAt: "2026-10-25T08:00:00.000Z" };
      controller.updateStatus(applicationId, status);
      return status;
    });
  const invoker = new ApplicationAgentToolWorkerInvoker({ controller, launcher });
  /** What the launcher's worker-close handler does on a crash: detach the handle, record `failed`. */
  const crash = () => {
    controller.detachIfCurrent(APPLICATION_ID, handle as never);
    controller.updateStatus(APPLICATION_ID, {
      ...createApplicationEngineBaseStatus(APPLICATION_ID), state: "failed", lastFailure: "Application worker exited unexpectedly (code=1, signal=null).",
    });
  };
  return { controller, launcher, invoker, start, crash };
};

afterEach(() => vi.restoreAllMocks());

describe("ApplicationAgentToolWorkerInvoker after a worker crash", () => {
  it("fails closed while the crashed worker is failed, and starts it on demand after a stop", async () => {
    const { controller, launcher, invoker, start, crash } = buildHarness();
    await expect(invoker.invoke(command)).resolves.toEqual(toolResult);
    expect(start).toHaveBeenCalledTimes(1);

    crash();
    expect(controller.getStatus(APPLICATION_ID).state).toBe("failed");
    // Without a stop, the crashed worker stays unavailable and nothing restarts it.
    await expect(invoker.invoke(command)).rejects.toMatchObject({ code: "APPLICATION_TOOL_UNAVAILABLE" });
    expect(start).toHaveBeenCalledTimes(1);

    // Reentry's participant preparation stops the worker: the crashed worker is now `stopped`.
    await launcher.stop(APPLICATION_ID);
    expect(controller.getStatus(APPLICATION_ID)).toMatchObject({ state: "stopped", ready: false, lastFailure: null });

    // The next tool call starts it on demand and reaches the worker.
    await expect(invoker.invoke(command)).resolves.toEqual(toolResult);
    expect(start).toHaveBeenCalledTimes(2);
    expect(controller.getStatus(APPLICATION_ID).state).toBe("ready");
  });
});
