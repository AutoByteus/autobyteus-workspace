import { afterEach, describe, expect, it, vi } from "vitest";

describe("team-member-run-view-projection-service import timing", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../../src/config/app-config-provider.js");
  });

  it("does not resolve the memory dir during module import", async () => {
    const getMemoryDir = vi.fn(() => {
      throw new Error("getMemoryDir should not run during module import");
    });

    vi.doMock("../../../src/run-history/services/agent-run-view-projection-service.js", () => ({
      AgentRunViewProjectionService: class {},
    }));
    vi.doMock("../../../src/run-history/services/team-run-execution-tree-location-service.js", () => ({
      TeamRunExecutionTreeLocationService: class {},
    }));
    vi.doMock("../../../src/config/app-config-provider.js", () => ({
      appConfigProvider: {
        config: {
          getMemoryDir,
        },
      },
    }));

    const module = await import(
      "../../../src/run-history/services/team-member-run-view-projection-service.js"
    );

    expect(module.TeamMemberRunViewProjectionService).toBeTypeOf("function");
    expect(getMemoryDir).not.toHaveBeenCalled();
  });
});
