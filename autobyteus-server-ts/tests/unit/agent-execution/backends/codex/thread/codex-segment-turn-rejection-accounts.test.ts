import { describe, expect, it } from "vitest";
import { CodexSegmentTurnRejectionAccounts } from "../../../../../../src/agent-execution/backends/codex/thread/codex-segment-turn-rejection-accounts.js";

describe("CodexSegmentTurnRejectionAccounts", () => {
  it("marks only the first rejection of an account as due a detailed line and counts the rest", () => {
    const accounts = new CodexSegmentTurnRejectionAccounts();

    expect(accounts.record("turn-t")).toBe(true);
    expect(accounts.record("turn-t")).toBe(false);
    expect(accounts.record("turn-t")).toBe(false);

    expect(accounts.takeSummaries()).toEqual([{ turnId: "turn-t", count: 2 }]);
  });

  it("keeps separate accounts per turn id and one account for events without a turn id", () => {
    const accounts = new CodexSegmentTurnRejectionAccounts();

    expect(accounts.record("turn-a")).toBe(true);
    expect(accounts.record(null)).toBe(true);
    expect(accounts.record("turn-b")).toBe(true);
    expect(accounts.record(null)).toBe(false);
    expect(accounts.record("turn-a")).toBe(false);

    expect(accounts.takeSummaries()).toEqual([
      { turnId: "turn-a", count: 1 },
      { turnId: null, count: 1 },
    ]);
  });

  it("resets pending counts on take but keeps accounts, so a turn never gets a second detailed line", () => {
    const accounts = new CodexSegmentTurnRejectionAccounts();
    accounts.record("turn-t");
    accounts.record("turn-t");

    expect(accounts.takeSummaries()).toEqual([{ turnId: "turn-t", count: 1 }]);
    expect(accounts.takeSummaries()).toEqual([]);

    expect(accounts.record("turn-t")).toBe(false);
    expect(accounts.record("turn-t")).toBe(false);
    expect(accounts.takeSummaries()).toEqual([{ turnId: "turn-t", count: 2 }]);
  });

  it("returns no summaries when nothing is pending", () => {
    const accounts = new CodexSegmentTurnRejectionAccounts();
    expect(accounts.takeSummaries()).toEqual([]);
    accounts.record("turn-t");
    expect(accounts.takeSummaries()).toEqual([]);
  });
});
