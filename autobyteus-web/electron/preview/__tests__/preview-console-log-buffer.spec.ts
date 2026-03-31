import { describe, expect, it } from "vitest";
import { PreviewConsoleLogBuffer } from "../preview-console-log-buffer";

describe("PreviewConsoleLogBuffer", () => {
  it("normalizes console levels and returns all entries by default", () => {
    const buffer = new PreviewConsoleLogBuffer();

    buffer.append(0, "hello");
    buffer.append(2, "warning");
    buffer.append(3, "failure");

    const result = buffer.list(null);
    expect(result.entries).toHaveLength(3);
    expect(result.entries.map((entry) => entry.level)).toEqual([
      "log",
      "warn",
      "error",
    ]);
    expect(result.nextSequence).toBe(4);
  });

  it("filters entries using since_sequence semantics", () => {
    const buffer = new PreviewConsoleLogBuffer();

    buffer.append(1, "first");
    buffer.append(1, "second");
    buffer.append(1, "third");

    const result = buffer.list(2);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.message).toBe("third");
    expect(result.entries[0]?.sequence).toBe(3);
  });

  it("evicts the oldest entries when the max size is exceeded", () => {
    const buffer = new PreviewConsoleLogBuffer(2);

    buffer.append(0, "one");
    buffer.append(0, "two");
    buffer.append(0, "three");

    const result = buffer.list(null);
    expect(result.entries.map((entry) => entry.message)).toEqual(["two", "three"]);
  });
});
