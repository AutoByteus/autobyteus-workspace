import { describe, expect, it, vi } from "vitest";
import { AgentStreamHandler } from "../../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import { ClientMessageType, ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
const createStream = (events) => {
    const allEvents = async function* () {
        for (const event of events) {
            yield event;
            await new Promise((resolve) => setImmediate(resolve));
        }
    };
    return {
        allEvents,
        close: vi.fn().mockResolvedValue(undefined),
    };
};
describe("AgentStreamHandler", () => {
    it("parses valid messages", () => {
        const parsed = AgentStreamHandler.parseMessage(JSON.stringify({ type: ClientMessageType.SEND_MESSAGE, payload: { content: "Hello" } }));
        expect(parsed.type).toBe(ClientMessageType.SEND_MESSAGE);
        expect(parsed.payload?.content).toBe("Hello");
    });
    it("rejects invalid JSON", () => {
        expect(() => AgentStreamHandler.parseMessage("not-json")).toThrow("Invalid JSON");
    });
    it("rejects messages missing a type", () => {
        expect(() => AgentStreamHandler.parseMessage(JSON.stringify({ payload: {} }))).toThrow("Message missing 'type' field");
    });
    it("connects and sends CONNECTED message", async () => {
        const sessionManager = new AgentSessionManager();
        const agentManager = {
            getAgentRun: vi.fn().mockReturnValue({ agentId: "agent-123" }),
            getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
        };
        const handler = new AgentStreamHandler(sessionManager, agentManager);
        const connection = {
            send: vi.fn(),
            close: vi.fn(),
        };
        const sessionId = await handler.connect(connection, "agent-123");
        expect(sessionId).toBeTruthy();
        expect(sessionManager.getSession(sessionId)).toBeDefined();
        const payload = JSON.parse(connection.send.mock.calls[0][0]);
        expect(payload.type).toBe(ServerMessageType.CONNECTED);
        expect(payload.payload.agent_id).toBe("agent-123");
        expect(payload.payload.session_id).toBe(sessionId);
    });
    it("closes with 4004 when agent is missing", async () => {
        const handler = new AgentStreamHandler(new AgentSessionManager(), {
            getAgentRun: vi.fn().mockReturnValue(null),
            getAgentEventStream: vi.fn(),
        });
        const connection = {
            send: vi.fn(),
            close: vi.fn(),
        };
        const sessionId = await handler.connect(connection, "missing-agent");
        expect(sessionId).toBeNull();
        expect(connection.close).toHaveBeenCalledWith(4004);
        const payload = JSON.parse(connection.send.mock.calls[0][0]);
        expect(payload.type).toBe(ServerMessageType.ERROR);
        expect(payload.payload.code).toBe("AGENT_NOT_FOUND");
    });
    it("handles SEND_MESSAGE and forwards to agent", async () => {
        const agent = {
            agentId: "agent-123",
            postUserMessage: vi.fn().mockResolvedValue(undefined),
        };
        const agentManager = {
            getAgentRun: vi.fn().mockReturnValue(agent),
            getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
        };
        const sessionManager = new AgentSessionManager();
        const handler = new AgentStreamHandler(sessionManager, agentManager);
        const connection = {
            send: vi.fn(),
            close: vi.fn(),
        };
        const sessionId = await handler.connect(connection, "agent-123");
        await handler.handleMessage(sessionId, JSON.stringify({
            type: ClientMessageType.SEND_MESSAGE,
            payload: {
                content: "Hello world",
                context_file_paths: ["/a.py"],
                image_urls: ["https://example.com/img.png"],
            },
        }));
        expect(agent.postUserMessage).toHaveBeenCalledTimes(1);
        const message = agent.postUserMessage.mock.calls[0][0];
        expect(message.content).toBe("Hello world");
    });
    it("handles tool approvals", async () => {
        const agent = {
            agentId: "agent-123",
            postToolExecutionApproval: vi.fn().mockResolvedValue(undefined),
        };
        const agentManager = {
            getAgentRun: vi.fn().mockReturnValue(agent),
            getAgentEventStream: vi.fn().mockReturnValue(createStream([])),
        };
        const sessionManager = new AgentSessionManager();
        const handler = new AgentStreamHandler(sessionManager, agentManager);
        const connection = {
            send: vi.fn(),
            close: vi.fn(),
        };
        const sessionId = await handler.connect(connection, "agent-123");
        await handler.handleMessage(sessionId, JSON.stringify({
            type: ClientMessageType.APPROVE_TOOL,
            payload: { invocation_id: "inv-1", reason: "ok" },
        }));
        expect(agent.postToolExecutionApproval).toHaveBeenCalledWith("inv-1", true, "ok");
    });
    it("ignores messages for unknown sessions", async () => {
        const handler = new AgentStreamHandler(new AgentSessionManager(), {
            getAgentRun: vi.fn().mockReturnValue(null),
            getAgentEventStream: vi.fn(),
        });
        await handler.handleMessage("missing", JSON.stringify({ type: ClientMessageType.SEND_MESSAGE }));
    });
});
