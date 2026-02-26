export enum ServerMessageType {
  CONNECTED = "CONNECTED",
  FILE_SYSTEM_CHANGE = "FILE_SYSTEM_CHANGE",
  ERROR = "ERROR",
  PONG = "PONG",
}

export enum ClientMessageType {
  PING = "PING",
}

export type ServerMessagePayload = Record<string, unknown>;

export class ServerMessage {
  readonly type: ServerMessageType;
  readonly payload: ServerMessagePayload;

  constructor(type: ServerMessageType, payload: ServerMessagePayload) {
    this.type = type;
    this.payload = payload;
  }

  toJson(): string {
    return JSON.stringify({
      type: this.type,
      payload: this.payload,
    });
  }
}

export function createConnectedMessage(workspaceId: string, sessionId: string): ServerMessage {
  return new ServerMessage(ServerMessageType.CONNECTED, {
    workspace_id: workspaceId,
    session_id: sessionId,
  });
}

export function createFileChangeMessage(changes: Record<string, unknown>[]): ServerMessage {
  return new ServerMessage(ServerMessageType.FILE_SYSTEM_CHANGE, {
    changes,
  });
}

export function createErrorMessage(code: string, message: string): ServerMessage {
  return new ServerMessage(ServerMessageType.ERROR, {
    code,
    message,
  });
}

export function createPongMessage(): ServerMessage {
  return new ServerMessage(ServerMessageType.PONG, {});
}
