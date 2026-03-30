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
  method: string,
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
      registration.thread.handleAppServerNotification(message.method, message.params);
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
      registration.thread.handleAppServerRequest(
        message.id,
        message.method,
        message.params,
      );
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
