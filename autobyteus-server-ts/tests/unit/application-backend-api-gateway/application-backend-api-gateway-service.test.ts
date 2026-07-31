import { describe, expect, it, vi } from "vitest";
import { ApplicationUnavailableError } from "../../../src/application-orchestration/services/application-availability-service.js";
import { ApplicationBackendApiGatewayService } from "../../../src/application-backend-api-gateway/services/application-backend-api-gateway-service.js";
import { ApplicationBackendWebSocketSessionService } from "../../../src/application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";

class TestSocket {
  sent: Array<string | Uint8Array> = [];
  closes: Array<{ code?: number; reason?: string }> = [];
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  send(value: string | Uint8Array): void { this.sent.push(value); }
  close(code?: number, reason?: string): void { this.closes.push({ code, reason }); }
  on(event: string, listener: (...args: unknown[]) => void): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }
}

const flushAsyncWork = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const applicationWithWebSockets = (webSockets: boolean) => ({
  id: "app-1",
  backend: {
    supportedExposures: {
      queries: true,
      commands: true,
      routes: true,
      graphql: true,
      notifications: true,
      eventHandlers: true,
      webSockets,
    },
  },
});

const buildGateway = (input: {
  application?: unknown;
  availabilityError?: Error;
  controller?: Record<string, unknown>;
  launcher?: Record<string, unknown>;
}) => {
  const controller = {
    onNotification: vi.fn(() => () => undefined),
    onWebSocketAction: vi.fn(() => () => undefined),
    onWorkerClose: vi.fn(() => () => undefined),
    invokeApplicationQuery: vi.fn(async () => ({ ok: true })),
    invokeApplicationCommand: vi.fn(async () => ({ ok: true })),
    openApplicationWebSocket: vi.fn(async () => undefined),
    closeApplicationWebSocket: vi.fn(async () => undefined),
    ...input.controller,
  };
  const launcher = {
    ensureReady: vi.fn(async () => ({ applicationId: "app-1", state: "ready", ready: true })),
    ...input.launcher,
  };
  const webSocketSessionService = new ApplicationBackendWebSocketSessionService({
    engineController: controller as never,
    engineLauncher: launcher as never,
  });
  const service = new ApplicationBackendApiGatewayService({
    applicationBundleService: {
      getApplicationById: vi.fn(async () => input.application ?? { id: "app-1" }),
    } as never,
    availabilityService: {
      requireApplicationActive: vi.fn(async () => {
        if (input.availabilityError) throw input.availabilityError;
      }),
    } as never,
    engineController: controller as never,
    engineLauncher: launcher as never,
    notificationHub: { publish: vi.fn() } as never,
    webSocketSessionService,
  });
  return { service, controller, launcher };
};

describe("ApplicationBackendApiGatewayService", () => {
  it("keeps the backend API gateway app-scoped and forwards app request context explicitly", async () => {
    const { service, controller } = buildGateway({});

    await expect(service.invokeApplicationQuery(
      "app-1",
      "tickets.get",
      { applicationId: "app-1" },
      { ticketId: "t-1" },
    )).resolves.toEqual({ ok: true });

    expect(controller.invokeApplicationQuery).toHaveBeenCalledWith("app-1", {
      queryName: "tickets.get",
      requestContext: { applicationId: "app-1" },
      input: { ticketId: "t-1" },
    });
  });

  it("rejects mismatched requestContext identity so callers cannot bypass the app boundary", async () => {
    const { service, controller } = buildGateway({});

    await expect(service.invokeApplicationCommand(
      "app-1",
      "tickets.create",
      { applicationId: "other-app" },
      { title: "Hello" },
    )).rejects.toThrow("requestContext.applicationId must match the route applicationId");
    expect(controller.invokeApplicationCommand).not.toHaveBeenCalled();
  });

  it("rejects disabled custom WebSockets before opening the application engine path", async () => {
    const { service, controller } = buildGateway({ application: applicationWithWebSockets(false) });
    const socket = new TestSocket();

    service.connectApplicationWebSocket({
      applicationId: "app-1",
      request: { path: "/rooms/one", params: {}, query: {}, headers: {} },
      socket,
    });
    await flushAsyncWork();

    expect(controller.openApplicationWebSocket).not.toHaveBeenCalled();
    expect(socket.sent).toEqual([]);
    expect(socket.closes).toEqual([{ code: 1011, reason: "Application backend connection rejected" }]);
  });

  it("opens custom WebSockets after the active bundle enables the exposure", async () => {
    const { service, controller } = buildGateway({ application: applicationWithWebSockets(true) });
    const socket = new TestSocket();

    service.connectApplicationWebSocket({
      applicationId: "app-1",
      request: { path: "/rooms/one", params: {}, query: {}, headers: {} },
      socket,
    });
    await flushAsyncWork();

    expect(controller.openApplicationWebSocket).toHaveBeenCalledOnce();
    expect(socket.sent).toEqual([JSON.stringify({
      protocol: "autobyteus.application-backend.websocket.v1",
      type: "CONNECTION_READY",
    })]);
    expect(socket.closes).toEqual([]);
  });

  it("surfaces application availability failures before worker launch", async () => {
    const { service, launcher } = buildGateway({
      availabilityError: new ApplicationUnavailableError("app-1", "QUARANTINED", "manifest invalid"),
    });

    await expect(service.ensureApplicationReady("app-1")).rejects.toThrow(
      "Application 'app-1' is currently quarantined: manifest invalid",
    );
    expect(launcher.ensureReady).not.toHaveBeenCalled();
  });

  it("keeps backend admission blocked while an application is REENTERING", async () => {
    const { service, launcher } = buildGateway({
      availabilityError: new ApplicationUnavailableError("app-1", "REENTERING", null),
    });

    await expect(service.ensureApplicationReady("app-1")).rejects.toThrow(
      "Application 'app-1' is currently reentering. Please retry after repair/reload completes.",
    );
    expect(launcher.ensureReady).not.toHaveBeenCalled();
  });
});
