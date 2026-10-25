import { describe, expect, it, vi } from "vitest";
import {
  ApplicationDefinitionRuntimeReadiness,
} from "../../../src/application-platform/runtime/application-definition-runtime-readiness.js";

describe("ApplicationDefinitionRuntimeReadiness static adapter ownership", () => {
  it("rejects an unselected application open_tab declaration from the complete names snapshot", async () => {
    const reloadAgents = vi.fn(async () => undefined);
    const reloadTeams = vi.fn(async () => undefined);
    const readiness = new ApplicationDefinitionRuntimeReadiness({
      bundleService: {
        listApplications: vi.fn(async () => [{
          id: "app-a",
          localApplicationId: "app-a",
          bundleResources: [],
        }]),
      } as never,
      agentDefinitionService: { reloadAgentPackageDefinitions: reloadAgents } as never,
      agentTeamDefinitionService: { reloadAgentPackageDefinitions: reloadTeams } as never,
      configurationService: {
        getApplicationLaunchConfigurationView: vi.fn(async () => ({
          readiness: { status: "RUNNABLE", issues: [] },
          slots: [],
        })),
      } as never,
      executionResourceResolver: {} as never,
      skillService: {} as never,
      activeApplicationIds: new Set(["app-a"]),
      applicationAgentToolCatalog: {
        listToolNames: vi.fn(() => ["open_tab"]),
      } as never,
      staticAdapterToolNames: new Set(["open_tab"]),
    });

    await expect(readiness.prepare()).rejects.toMatchObject({
      name: "ApplicationSetupRequiredError",
      diagnostics: [
        "app-a: application tool 'open_tab' collides with a platform/static Agent Tools MCP adapter",
      ],
    });
    expect(readiness.isApplicationReady("app-a")).toBe(false);
    // autobyteus-296 (AC-006): one owner for the setup text; the quarantine detail is the startup error's message.
    expect(readiness.getSetupRequiredDetail("app-a")).toBe(
      "Application setup is required: app-a: application tool 'open_tab' collides with a platform/static Agent Tools MCP adapter",
    );
    expect(readiness.getSetupRequiredDetail("other-app")).toBeNull();
    // SR-009: application-package definitions are read on demand, so readiness does not reload the agent packages.
    expect(reloadAgents).not.toHaveBeenCalled();
    expect(reloadTeams).not.toHaveBeenCalled();
  });
});
