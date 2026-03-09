import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  listenMock,
  closeMock,
  readEnvMock,
  buildRuntimeConfigMock,
  createGatewayAppMock,
} = vi.hoisted(() => ({
  listenMock: vi.fn(),
  closeMock: vi.fn(),
  readEnvMock: vi.fn(),
  buildRuntimeConfigMock: vi.fn(),
  createGatewayAppMock: vi.fn(),
}));

vi.mock("../../../src/config/env.js", () => ({
  readEnv: readEnvMock,
}));

vi.mock("../../../src/config/runtime-config.js", () => ({
  buildRuntimeConfig: buildRuntimeConfigMock,
}));

vi.mock("../../../src/bootstrap/create-gateway-app.js", () => ({
  createGatewayApp: createGatewayAppMock,
}));

import { startGateway } from "../../../src/bootstrap/start-gateway.js";

describe("startGateway", () => {
  const signalListeners = new Map<string, (...args: Array<unknown>) => unknown>();

  beforeEach(() => {
    signalListeners.clear();
    listenMock.mockReset();
    closeMock.mockReset();
    readEnvMock.mockReset();
    buildRuntimeConfigMock.mockReset();
    createGatewayAppMock.mockReset();

    readEnvMock.mockReturnValue({});
    buildRuntimeConfigMock.mockReturnValue({});
    createGatewayAppMock.mockReturnValue({
      listen: listenMock,
      close: closeMock,
    });
    listenMock.mockResolvedValue(undefined);
    closeMock.mockResolvedValue(undefined);

    vi.spyOn(process, "once").mockImplementation(((event: string, listener: (...args: Array<unknown>) => unknown) => {
      signalListeners.set(event, listener);
      return process;
    }) as typeof process.once);
    vi.spyOn(process, "removeListener").mockImplementation(((event: string) => {
      signalListeners.delete(event);
      return process;
    }) as typeof process.removeListener);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("closes the gateway app when SIGTERM is received", async () => {
    await startGateway();

    expect(listenMock).toHaveBeenCalledWith({ port: 8010, host: "0.0.0.0" });
    expect(signalListeners.has("SIGTERM")).toBe(true);
    expect(signalListeners.has("SIGINT")).toBe(true);

    await signalListeners.get("SIGTERM")?.();

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(signalListeners.has("SIGTERM")).toBe(false);
    expect(signalListeners.has("SIGINT")).toBe(false);
  });
});
