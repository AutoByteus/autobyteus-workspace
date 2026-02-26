import { describe, expect, it } from "vitest";
import { AgentSession } from "../../../../src/services/agent-streaming/agent-session.js";
describe("AgentSession", () => {
    it("connects and reports connected state", () => {
        const session = new AgentSession("s1", "agent-1");
        expect(session.isConnected).toBe(false);
        session.connect();
        expect(session.isConnected).toBe(true);
    });
    it("prevents connecting a closed session", () => {
        const session = new AgentSession("s2", "agent-2");
        session.close();
        expect(() => session.connect()).toThrow("Cannot connect a closed session");
    });
    it("closes and resets connected state", () => {
        const session = new AgentSession("s3", "agent-3");
        session.connect();
        session.close();
        expect(session.isConnected).toBe(false);
    });
});
