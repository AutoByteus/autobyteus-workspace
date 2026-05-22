import { describe, expect, it } from "vitest";
import { EventBatcher } from "../../../../src/file-explorer/watcher/event-batcher.js";
const makeEvent = (label) => JSON.stringify({ changes: [{ type: "add", name: label }] });
async function* createEventStream() {
    yield makeEvent("first");
    yield makeEvent("second");
}
describe("EventBatcher", () => {
    it("combines rapid events into a single composite event", async () => {
        const batcher = new EventBatcher(createEventStream(), 0.01);
        const results = [];
        for await (const event of batcher.getBatchedEvents()) {
            results.push(event);
        }
        expect(results).toHaveLength(1);
        const parsed = JSON.parse(results[0]);
        expect(parsed.changes).toHaveLength(2);
        const names = parsed.changes.map((change) => change.name).sort();
        expect(names).toEqual(["first", "second"]);
    });
    it("unblocks a pending consumer when the batched stream is returned", async () => {
        let sourceCancelled = false;
        const source = {
            next: () => new Promise(() => undefined),
            return: async () => {
                sourceCancelled = true;
                return { done: true, value: undefined };
            },
            throw: async (error) => {
                throw error;
            },
            [Symbol.asyncDispose]: async () => undefined,
            [Symbol.asyncIterator]: () => source,
        };
        const batcher = new EventBatcher(source, 0.01);
        const stream = batcher.getBatchedEvents();
        const pendingNext = stream.next();
        await stream.return?.();
        const result = await Promise.race([
            pendingNext,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for batched stream return")), 100)),
        ]);
        expect(result.done).toBe(true);
        expect(sourceCancelled).toBe(true);
    });
});
