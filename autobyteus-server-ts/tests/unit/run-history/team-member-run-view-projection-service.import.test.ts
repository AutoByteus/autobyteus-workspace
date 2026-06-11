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
    vi.doMock("../../../src/run-history/services/team-run-history-service.js", () => ({
      TeamRunHistoryService: class {},
      getTeamRunHistoryService: vi.fn(),
    }));
    vi.doMock("../../../src/agent-team-execution/services/agent-team-run-manager.js", () => ({
      AgentTeamRunManager: {
        getInstance: () => ({
          getActiveRun: () => null,
        }),
      },
    }));
    vi.doMock("../../../src/agent-team-execution/domain/team-run-context.js", () => ({
      getRuntimeMemberContexts: () => [],
    }));
    vi.doMock("../../../src/agent-team-execution/domain/team-run-member-identity.js", () => ({
      normalizeMemberRouteKey: (value: string) => value,
    }));
    vi.doMock("../../../src/agent-memory/services/agent-memory-location-service.js", () => ({
      AgentMemoryLocationService: class {},
      getAgentMemoryLocationService: vi.fn(() => ({
        resolveTeamMemberLocationFromMetadata: () => ({
          member: {},
          memberRunId: "member-run",
          memoryDir: "/tmp/member-memory",
        }),
      })),
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
