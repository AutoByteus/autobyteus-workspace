import { describe, expect, it } from "vitest";
import { AgentTurnLedger } from "../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-ledger.js";

describe("AgentTurnLedger", () => {
  it("keeps a snapshot-named newer turn when the older turn's queued start and end arrive later", () => {
    const ledger = new AgentTurnLedger();
    expect(ledger.observeRuntimeSnapshotTurn("t2")).toBe(true);
    expect(ledger.activeTurnId).toBe("t2");

    expect(ledger.observeStreamStart("t1")).toBeNull();
    expect(ledger.activeTurnId).toBe("t1");
    expect(ledger.hasEnded("t2")).toBe(false);

    ledger.end("t1");
    expect(ledger.activeTurnId).toBeNull();
    expect(ledger.hasEnded("t1")).toBe(true);

    expect(ledger.observeRuntimeSnapshotTurn("t2")).toBe(true);
    expect(ledger.observeStreamStart("t2")).toBeNull();
    expect(ledger.activeTurnId).toBe("t2");
    expect(ledger.hasEnded("t2")).toBe(false);
  });

  it("ignores a snapshot naming another turn while the stream holds one", () => {
    const ledger = new AgentTurnLedger();
    ledger.observeStreamStart("t1");

    expect(ledger.observeRuntimeSnapshotTurn("t2")).toBe(false);
    expect(ledger.activeTurnId).toBe("t1");
    expect(ledger.hasEnded("t1")).toBe(false);
    expect(ledger.observeRuntimeSnapshotTurn("t1")).toBe(true);
  });

  it("lets an ordered stream start supersede and end the previous stream-held turn", () => {
    const ledger = new AgentTurnLedger();
    ledger.observeStreamStart("t1");

    expect(ledger.observeStreamStart("t2")).toBe("t1");
    expect(ledger.activeTurnId).toBe("t2");
    expect(ledger.hasEnded("t1")).toBe(true);
    expect(ledger.observeStreamStart("t2")).toBeNull();
  });

  it("lets a snapshot refresh a snapshot-held turn without ending it", () => {
    const ledger = new AgentTurnLedger();
    ledger.observeRuntimeSnapshotTurn("t1");

    expect(ledger.observeRuntimeSnapshotTurn("t2")).toBe(true);
    expect(ledger.activeTurnId).toBe("t2");
    expect(ledger.hasEnded("t1")).toBe(false);
  });

  it("never reopens an ended turn from either evidence", () => {
    const ledger = new AgentTurnLedger();
    ledger.observeStreamStart("t1");
    ledger.end("t1");

    expect(ledger.observeRuntimeSnapshotTurn("t1")).toBe(false);
    expect(ledger.observeStreamStart("t1")).toBeNull();
    expect(ledger.activeTurnId).toBeNull();
  });

  it("endActive ends the active turn and forgetActive releases it without ending", () => {
    const ledger = new AgentTurnLedger();
    expect(ledger.endActive()).toBeNull();

    ledger.observeRuntimeSnapshotTurn("t1");
    expect(ledger.endActive()).toBe("t1");
    expect(ledger.hasEnded("t1")).toBe(true);
    expect(ledger.activeTurnId).toBeNull();

    ledger.observeStreamStart("t2");
    ledger.forgetActive();
    expect(ledger.activeTurnId).toBeNull();
    expect(ledger.hasEnded("t2")).toBe(false);
    expect(ledger.observeStreamStart("t2")).toBeNull();
    expect(ledger.activeTurnId).toBe("t2");
  });
});
