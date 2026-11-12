import { describe, expect, it } from "vitest";
import { inOrderViewDelivery } from "../../../../src/services/agent-streaming/run-view-rows.js";

type Event = Readonly<{ id: string; row?: boolean }>;

const harness = () => {
  const sent: string[] = [];
  const reads = new Map<string, () => void>();
  const deliver = inOrderViewDelivery<Event>((event) => event.row === true, async (event) => {
    if (event.row) await new Promise<void>((resolve) => reads.set(event.id, resolve));
    sent.push(event.id);
  });
  return { sent, reads, deliver };
};

describe("inOrderViewDelivery (a view's events, in order, as base sent them)", () => {
  it("sends an event at once when no row event is being read", () => {
    const { sent, deliver } = harness();
    deliver({ id: "a" });
    deliver({ id: "b" });
    expect(sent).toEqual(["a", "b"]);
  });

  it("holds events behind a row event whose records are being read, then sends them in order", async () => {
    const { sent, reads, deliver } = harness();
    deliver({ id: "a" });
    deliver({ id: "row-1", row: true });
    deliver({ id: "b" });
    await Promise.resolve();
    expect(sent).toEqual(["a"]);
    reads.get("row-1")!();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sent).toEqual(["a", "row-1", "b"]);
    deliver({ id: "c" });
    expect(sent).toEqual(["a", "row-1", "b", "c"]);
  });
});
