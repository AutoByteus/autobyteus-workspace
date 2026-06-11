import type {
  CodexAppServerClient,
} from "../../../../runtime-management/codex/client/codex-app-server-client.js";
import type {
  CodexNotificationMessage,
  CodexServerRequestMessage,
} from "../../../../runtime-management/codex/client/codex-app-server-client-types.js";
import {
  resolveThreadIdFromAppServerMessage,
  resolveTurnIdFromAppServerMessage,
} from "./codex-thread-id-resolver.js";
import type { CodexThread } from "./codex-thread.js";

const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";
const CLIENT_GLOBAL_CODEX_NOTIFICATION_METHODS = new Set([
  "account/rateLimits/updated",
  "mcpServer/startupStatus/updated",
  "mcp/startupComplete",
]);

const normalizeMethod = (method: string): string => method.trim();

const isClientGlobalCodexNotification = (method: string): boolean =>
  CLIENT_GLOBAL_CODEX_NOTIFICATION_METHODS.has(normalizeMethod(method));

const paramKeysOf = (params: Record<string, unknown> | null | undefined): string[] =>
  Object.keys(params ?? {});

type ThreadRegistration = {
  thread: CodexThread;
  onThreadClientClosed?: (thread: CodexThread) => void;
};

type ClientRoute = {
  registrations: Map<CodexThread, ThreadRegistration>;
  unbindNotification: () => void;
  unbindServerRequest: () => void;
  unbindClose: () => void;
};

const isAppServerMessageForThread = (
  state: CodexThread,
  _method: string,
  params: Record<string, unknown>,
  threadCount: number,
): boolean => {
  const threadId = resolveThreadIdFromAppServerMessage(params);
  if (threadId) {
    return threadId === state.threadId;
  }
  const turnId = resolveTurnIdFromAppServerMessage(params);
  if (turnId && state.activeTurnId) {
    return turnId === state.activeTurnId;
  }
  return threadCount === 1;
};

const logClientGlobalNotificationSkip = (
  method: string,
  params: Record<string, unknown>,
  threadCount: number,
): void => {
  if (!isRuntimeRawEventDebugEnabled) {
    return;
  }
  console.log("[CodexAppServerNotificationSkipped]", {
    method,
    threadCount,
    reason: "client_global_notification",
    paramKeys: paramKeysOf(params),
  });
};

const logUnrouteableAppServerMessage = (
  kind: "notification" | "server_request",
  method: string,
  params: Record<string, unknown>,
  threadCount: number,
  requestId?: string | number,
): void => {
  if (threadCount <= 1) {
    return;
  }
  console.warn("[CodexClientThreadRouter] app-server message was not routed", {
    kind,
    method,
    requestId,
    threadCount,
    paramKeys: paramKeysOf(params),
  });
};

const respondUnrouteableServerRequest = (
  client: CodexAppServerClient,
  message: CodexServerRequestMessage,
  threadCount: number,
): void => {
  if (threadCount <= 1) {
    return;
  }
  try {
    client.respondError(
      message.id,
      -32000,
      `Codex app server request '${message.method}' could not be routed to a single active thread.`,
      {
        method: message.method,
        threadCount,
        paramKeys: paramKeysOf(message.params),
      },
    );
  } catch (error) {
    console.warn(
      "[CodexClientThreadRouter] failed to respond to unrouteable app-server request",
      {
        id: message.id,
        method: message.method,
        error: String(error),
      },
    );
  }
};

export class CodexClientThreadRouter {
  private readonly routes = new Map<CodexAppServerClient, ClientRoute>();

  registerThread(input: {
    client: CodexAppServerClient;
    thread: CodexThread;
    onThreadClientClosed?: (thread: CodexThread) => void;
  }): () => void {
    const route = this.getOrCreateRoute(input.client);
    route.registrations.set(input.thread, {
      thread: input.thread,
      onThreadClientClosed: input.onThreadClientClosed,
    });

    return () => {
      const activeRoute = this.routes.get(input.client);
      if (!activeRoute) {
        return;
      }
      activeRoute.registrations.delete(input.thread);
      if (activeRoute.registrations.size === 0) {
        this.detachRoute(input.client, activeRoute);
      }
    };
  }

  private getOrCreateRoute(client: CodexAppServerClient): ClientRoute {
    const existing = this.routes.get(client);
    if (existing) {
      return existing;
    }

    const route: ClientRoute = {
      registrations: new Map(),
      unbindNotification: client.onNotification((message) => {
        this.handleAppServerNotification(client, message);
      }),
      unbindServerRequest: client.onServerRequest((message) => {
        this.handleAppServerRequest(client, message);
      }),
      unbindClose: client.onClose((error) => {
        this.handleClose(client, error);
      }),
    };
    this.routes.set(client, route);
    return route;
  }

  private detachRoute(client: CodexAppServerClient, route: ClientRoute): void {
    this.routes.delete(client);
    route.unbindNotification();
    route.unbindServerRequest();
    route.unbindClose();
    route.registrations.clear();
  }

  private handleAppServerNotification(
    client: CodexAppServerClient,
    message: CodexNotificationMessage,
  ): void {
    const route = this.routes.get(client);
    if (!route) {
      return;
    }

    const registrations = Array.from(route.registrations.values());
    const threadCount = registrations.length;
    if (isClientGlobalCodexNotification(message.method)) {
      logClientGlobalNotificationSkip(message.method, message.params, threadCount);
      return;
    }

    let delivered = false;
    for (const registration of registrations) {
      const matchesThread = isAppServerMessageForThread(
        registration.thread,
        message.method,
        message.params,
        threadCount,
      );
      if (isRuntimeRawEventDebugEnabled) {
        console.log("[CodexAppServerNotification]", {
          runId: registration.thread.runId,
          method: message.method,
          matchesThread,
          threadId: registration.thread.threadId,
          activeTurnId: registration.thread.activeTurnId,
          threadCount,
          paramKeys: Object.keys(message.params ?? {}),
        });
      }
      if (!matchesThread) {
        continue;
      }
      delivered = true;
      registration.thread.handleAppServerNotification(message.method, message.params);
    }
    if (!delivered) {
      logUnrouteableAppServerMessage(
        "notification",
        message.method,
        message.params,
        threadCount,
      );
    }
  }

  private handleAppServerRequest(
    client: CodexAppServerClient,
    message: CodexServerRequestMessage,
  ): void {
    const route = this.routes.get(client);
    if (!route) {
      return;
    }

    const registrations = Array.from(route.registrations.values());
    const threadCount = registrations.length;
    let delivered = false;
    for (const registration of registrations) {
      const matchesThread = isAppServerMessageForThread(
        registration.thread,
        message.method,
        message.params,
        threadCount,
      );
      if (isRuntimeRawEventDebugEnabled) {
        console.log("[CodexAppServerRequest]", {
          runId: registration.thread.runId,
          id: message.id,
          method: message.method,
          matchesThread,
          threadId: registration.thread.threadId,
          activeTurnId: registration.thread.activeTurnId,
          threadCount,
          paramKeys: Object.keys(message.params ?? {}),
        });
      }
      if (!matchesThread) {
        continue;
      }
      delivered = true;
      registration.thread.handleAppServerRequest(
        message.id,
        message.method,
        message.params,
      );
    }
    if (!delivered) {
      logUnrouteableAppServerMessage(
        "server_request",
        message.method,
        message.params,
        threadCount,
        message.id,
      );
      respondUnrouteableServerRequest(client, message, threadCount);
    }
  }

  private handleClose(client: CodexAppServerClient, error: Error | null): void {
    const route = this.routes.get(client);
    if (!route) {
      return;
    }

    const registrations = Array.from(route.registrations.values());
    this.detachRoute(client, route);
    for (const registration of registrations) {
      registration.thread.handleClientClosed(error);
      registration.onThreadClientClosed?.(registration.thread);
    }
  }
}

let cachedCodexClientThreadRouter: CodexClientThreadRouter | null = null;

export const getCodexClientThreadRouter = (): CodexClientThreadRouter => {
  if (!cachedCodexClientThreadRouter) {
    cachedCodexClientThreadRouter = new CodexClientThreadRouter();
  }
  return cachedCodexClientThreadRouter;
};
