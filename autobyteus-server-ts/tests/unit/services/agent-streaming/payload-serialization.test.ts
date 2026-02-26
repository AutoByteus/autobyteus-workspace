import { describe, expect, it } from "vitest";
import { serializePayload } from "../../../../src/services/agent-streaming/payload-serialization.js";

describe("serializePayload", () => {
  it("returns empty object for non-object payloads", () => {
    expect(serializePayload("not-an-object")).toEqual({});
    expect(serializePayload(null)).toEqual({});
  });

  it("returns JSON-safe payload for circular objects", () => {
    const payload: Record<string, unknown> = {
      name: "root",
    };
    payload.self = payload;

    const serialized = serializePayload(payload);
    expect(serialized.name).toBe("root");
    expect(serialized.self).toBe("[Circular]");
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });

  it("converts bigint values to strings", () => {
    const serialized = serializePayload({
      bytes: BigInt(42),
    });

    expect(serialized.bytes).toBe("42");
  });
});
