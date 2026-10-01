import { describe, expect, it } from "vitest";
import { resolveContextImageSource } from "../../../../src/agent-execution/shared/context-image-source.js";

describe("resolveContextImageSource", () => {
  it("classifies data URLs, local paths, file URLs, http(s) URLs and falls back to a raw path", () => {
    expect(resolveContextImageSource("data:image/png;base64,AAAA")).toEqual({ kind: "data_url", url: "data:image/png;base64,AAAA" });
    expect(resolveContextImageSource("/abs/shot.png")).toEqual({ kind: "local_path", path: "/abs/shot.png" });
    expect(resolveContextImageSource("file:///abs/shot%20one.png")).toEqual({ kind: "local_path", path: "/abs/shot one.png" });
    expect(resolveContextImageSource("https://example.com/a.png")).toEqual({ kind: "http_url", url: "https://example.com/a.png" });
    expect(resolveContextImageSource("relative/a.png")).toEqual({ kind: "local_path", path: "relative/a.png" });
    expect(resolveContextImageSource("   ")).toBeNull();
  });
});
