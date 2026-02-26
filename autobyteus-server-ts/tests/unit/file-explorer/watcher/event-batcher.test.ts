import { describe, expect, it } from "vitest";
import { EventBatcher } from "../../../../src/file-explorer/watcher/event-batcher.js";

const makeEvent = (label: string): string =>
  JSON.stringify({ changes: [{ type: "add", name: label }] });

async function* createEventStream(): AsyncGenerator<string, void, void> {
  yield makeEvent("first");
  yield makeEvent("second");
}

describe("EventBatcher", () => {
  it("combines rapid events into a single composite event", async () => {
    const batcher = new EventBatcher(createEventStream(), 0.01);

    const results: string[] = [];
    for await (const event of batcher.getBatchedEvents()) {
      results.push(event);
    }

    expect(results).toHaveLength(1);
    const parsed = JSON.parse(results[0]) as { changes: Array<{ name: string }> };
    expect(parsed.changes).toHaveLength(2);
    const names = parsed.changes.map((change) => change.name).sort();
    expect(names).toEqual(["first", "second"]);
  });
});
