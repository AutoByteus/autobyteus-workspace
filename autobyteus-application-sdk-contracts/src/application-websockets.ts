import type { ApplicationHandlerContext } from "./index.js";

export type ApplicationWebSocketFrame =
  | { kind: "text"; text: string }
  | { kind: "binary"; data: Uint8Array };

export type ApplicationWebSocketRequest = {
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
};

export type ApplicationWebSocketSessionClose = {
  code: number;
  reason: string;
};

export type ApplicationWebSocketSession = {
  readonly sessionId: string;
  readonly signal: AbortSignal;
  send: (frame: ApplicationWebSocketFrame | string | Uint8Array) => Promise<void>;
  close: (code?: number, reason?: string) => Promise<void>;
};

export type ApplicationWebSocketSessionHandler = {
  onMessage?: (frame: ApplicationWebSocketFrame) => Promise<void> | void;
  onClose?: (event: ApplicationWebSocketSessionClose) => Promise<void> | void;
};

export type ApplicationWebSocketRouteDefinition = {
  path: string;
  open: (
    request: ApplicationWebSocketRequest,
    session: ApplicationWebSocketSession,
    context: ApplicationHandlerContext,
  ) => Promise<ApplicationWebSocketSessionHandler | void> | ApplicationWebSocketSessionHandler | void;
};
