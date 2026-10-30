import { describe, expect, it, vi } from "vitest";
import { AgentDefinitionChangeSignal } from "../../../src/agent-definition/services/agent-definition-change-signal.js";

describe("AgentDefinitionChangeSignal", () => {
  it("calls every listener in order, keeps going past a failing one, and stops after unsubscribe", () => {
    const signal = new AgentDefinitionChangeSignal();
    const calls: string[] = [];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const unsubscribeFirst = signal.subscribe(() => { calls.push("first"); });
    signal.subscribe(() => { throw new Error("listener failed"); });
    signal.subscribe(() => { calls.push("third"); });

    signal.notifyChanged();
    expect(calls).toEqual(["first", "third"]);
    expect(warn).toHaveBeenCalledWith("AGENT_DEFINITION_CHANGE_LISTENER_FAILED", expect.any(Error));

    unsubscribeFirst();
    signal.notifyChanged();
    expect(calls).toEqual(["first", "third", "third"]);
    warn.mockRestore();
  });
});
