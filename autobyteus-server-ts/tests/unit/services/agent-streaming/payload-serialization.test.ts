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

  it("preserves shared references as duplicated JSON-safe values", () => {
    const sharedResult = {
      content: [
        {
          type: "text",
          text: "{\"tab_id\":\"tab-1\",\"url\":\"https://example.com/\"}",
        },
      ],
      structuredContent: null,
    };

    const serialized = serializePayload({
      item: {
        result: sharedResult,
      },
      result: sharedResult,
    });

    expect(serialized).toMatchObject({
      item: {
        result: sharedResult,
      },
      result: sharedResult,
    });
    expect(serialized.result).not.toBe("[Circular]");
  });

  it("converts bigint values to strings", () => {
    const serialized = serializePayload({
      bytes: BigInt(42),
    });

    expect(serialized.bytes).toBe("42");
  });
});
