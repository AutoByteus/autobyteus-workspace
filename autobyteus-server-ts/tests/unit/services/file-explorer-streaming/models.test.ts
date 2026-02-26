import { describe, expect, it } from "vitest";
import {
  ServerMessageType,
  createConnectedMessage,
  createFileChangeMessage,
  createErrorMessage,
  createPongMessage,
} from "../../../../src/services/file-explorer-streaming/models.js";

describe("File explorer streaming models", () => {
  it("defines expected message types", () => {
    expect(ServerMessageType.CONNECTED).toBe("CONNECTED");
    expect(ServerMessageType.FILE_SYSTEM_CHANGE).toBe("FILE_SYSTEM_CHANGE");
    expect(ServerMessageType.ERROR).toBe("ERROR");
    expect(ServerMessageType.PONG).toBe("PONG");
  });

  it("creates connected messages", () => {
    const message = createConnectedMessage("ws-123", "sess-456");

    expect(message.type).toBe(ServerMessageType.CONNECTED);
    expect(message.payload.workspace_id).toBe("ws-123");
    expect(message.payload.session_id).toBe("sess-456");

    const json = message.toJson();
    expect(json).toContain('"type":"CONNECTED"');
    expect(json).toContain('"workspace_id":"ws-123"');
  });

  it("creates file change messages", () => {
    const changes = [
      { type: "add", parent_id: "p1", node: { id: "n1", name: "test.py" } },
      { type: "delete", parent_id: "p1", node_id: "n2" },
    ];

    const message = createFileChangeMessage(changes);

    expect(message.type).toBe(ServerMessageType.FILE_SYSTEM_CHANGE);
    expect(message.payload.changes).toEqual(changes);
  });

  it("creates error messages", () => {
    const message = createErrorMessage("WORKSPACE_NOT_FOUND", "Workspace ws-123 not found");

    expect(message.type).toBe(ServerMessageType.ERROR);
    expect(message.payload.code).toBe("WORKSPACE_NOT_FOUND");
    expect(message.payload.message).toBe("Workspace ws-123 not found");
  });

  it("creates pong messages", () => {
    const message = createPongMessage();

    expect(message.type).toBe(ServerMessageType.PONG);
    expect(message.payload).toEqual({});
  });

  it("serializes messages with type and payload", () => {
    const message = createConnectedMessage("w1", "s1");
    const parsed = JSON.parse(message.toJson()) as { type: string; payload: Record<string, unknown> };

    expect(parsed.type).toBe("CONNECTED");
    expect(parsed.payload).toBeTruthy();
  });
});
