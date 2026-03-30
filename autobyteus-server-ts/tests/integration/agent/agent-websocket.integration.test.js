import fastify from "fastify";
import websocket from "@fastify/websocket";
import { describe, expect, it } from "vitest";
import WebSocket from "ws";
import { AgentInputUserMessage, StreamEvent, StreamEventType } from "autobyteus-ts";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
class FakeEventStream {
    queue = [];
    waiters = [];
    closed = false;
    push(event) {
        if (this.closed) {
            return;
        }
        const waiter = this.waiters.shift();
        if (waiter) {
            waiter(event);
            return;
        }
        this.queue.push(event);
    }
    async close() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        const waiter = this.waiters.shift();
        if (waiter) {
            waiter(null);
        }
        else {
            this.queue.push(null);
        }
    }
    async next() {
        if (this.queue.length > 0) {
            return this.queue.shift() ?? null;
        }
        return new Promise((resolve) => this.waiters.push(resolve));
    }
    async *allEvents() {
        while (true) {
            const event = await this.next();
            if (!event) {
                break;
            }
            yield event;
        }
    }
}
class FakeAgent {
    agentId;
    messages = [];
    approvals = [];
    constructor(agentId) {
        this.agentId = agentId;
    }
    async postUserMessage(message) {
        this.messages.push(message);
    }
    async postToolExecutionApproval(invocationId, approved, reason) {
        this.approvals.push({ invocationId, approved, reason: reason ?? null });
    }
}
class FakeAgentManager {
    agent;
    stream;
    constructor(agent, stream) {
        this.agent = agent;
        this.stream = stream;
    }
    getActiveRun(agentId) {
        if (agentId !== this.agent.agentId) {
            return null;
        }
        return {
            runId: this.agent.agentId,
            runtimeKind: "autobyteus",
            getStatus: () => "ACTIVE",
            isActive: () => true,
            subscribeToEvents: (listener) => {
                void (async () => {
                    for await (const event of this.stream.allEvents()) {
                        listener(event);
                    }
                })();
                return () => {
                    void this.stream.close();
                };
            },
            postUserMessage: async (message) => {
                await this.agent.postUserMessage(message);
                return { accepted: true, runtimeReference: null };
            },
            approveToolInvocation: async (invocationId, approved, reason) => {
                await this.agent.postToolExecutionApproval(invocationId, approved, reason ?? null);
                return { accepted: true };
            },
            interrupt: async () => {
                return { accepted: true };
            },
        };
    }
}
const waitForMessage = (socket, timeoutMs = 2000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket message")), timeoutMs);
    socket.once("message", (data) => {
        clearTimeout(timer);
        resolve(data.toString());
    });
});
const waitForCondition = async (fn, timeoutMs = 2000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (fn()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Timed out waiting for condition");
};
describe("Agent websocket integration", () => {
    it("streams events and handles client messages", async () => {
        const agent = new FakeAgent("agent-1");
        const stream = new FakeEventStream();
        const manager = new FakeAgentManager(agent, stream);
        const handler = new AgentStreamHandler(new AgentSessionManager(), manager);
        const app = fastify();
        await app.register(websocket);
        const dummyTeamHandler = {
            connect: async () => null,
            handleMessage: async () => { },
            disconnect: async () => { },
        };
        await registerAgentWebsocket(app, handler, dummyTeamHandler);
        const address = await app.listen({ port: 0, host: "127.0.0.1" });
        const url = new URL(address);
        const localBaseUrl = `ws://${url.hostname}:${url.port}`;
        const socket = new WebSocket(`${localBaseUrl}/ws/agent/${agent.agentId}`);
        const connectedPromise = waitForMessage(socket);
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), 2000);
            socket.once("open", () => {
                clearTimeout(timer);
                resolve();
            });
            socket.once("error", (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
        const connectedMessage = JSON.parse(await connectedPromise);
        expect(connectedMessage.type).toBe("CONNECTED");
        expect(connectedMessage.payload.agent_id).toBe(agent.agentId);
        socket.send(JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
                content: "hello",
                context_file_paths: ["/tmp/note.txt"],
                image_urls: ["https://example.com/cat.png"],
            },
        }));
        await waitForCondition(() => agent.messages.length === 1);
        expect(agent.messages[0]).toBeInstanceOf(AgentInputUserMessage);
        expect(agent.messages[0].content).toBe("hello");
        expect(agent.messages[0].contextFiles?.length).toBe(2);
        socket.send(JSON.stringify({
            type: "APPROVE_TOOL",
            payload: { invocation_id: "inv-123", reason: "ok" },
        }));
        await waitForCondition(() => agent.approvals.length === 1);
        expect(agent.approvals[0]).toEqual({ invocationId: "inv-123", approved: true, reason: "ok" });
        const segmentPromise = waitForMessage(socket);
        const event = new StreamEvent({
            event_type: StreamEventType.SEGMENT_EVENT,
            data: {
                event_type: "SEGMENT_START",
                segment_id: "seg-1",
                segment_type: "text",
                payload: { metadata: { foo: "bar" } },
            },
            agent_id: agent.agentId,
        });
        stream.push(event);
        const segmentMessage = JSON.parse(await segmentPromise);
        expect(segmentMessage.type).toBe("SEGMENT_START");
        expect(segmentMessage.payload.id).toBe("seg-1");
        expect(segmentMessage.payload.segment_type).toBe("text");
        socket.close();
        await app.close();
    });
});
