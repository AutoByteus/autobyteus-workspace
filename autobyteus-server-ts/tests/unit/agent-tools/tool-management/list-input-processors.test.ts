import { beforeEach, describe, expect, it, vi } from "vitest";
import { listInputProcessors } from "../../../../src/agent-tools/tool-management/list-input-processors.js";
import { defaultInputProcessorRegistry } from "autobyteus-ts";

describe("listInputProcessors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns sorted processor names", async () => {
    vi.spyOn(defaultInputProcessorRegistry, "getAllDefinitions").mockReturnValue({
      b: { name: "beta" } as any,
      a: { name: "alpha" } as any,
    });

    const result = await listInputProcessors({ agentId: "test-agent" } as any);
    const data = JSON.parse(result) as Array<Record<string, unknown>>;
    expect(data.map((item) => item.name)).toEqual(["alpha", "beta"]);
  });

  it("returns empty array when no definitions exist", async () => {
    vi.spyOn(defaultInputProcessorRegistry, "getAllDefinitions").mockReturnValue({});
    const result = await listInputProcessors({ agentId: "test-agent" } as any);
    expect(result).toBe("[]");
  });
});
