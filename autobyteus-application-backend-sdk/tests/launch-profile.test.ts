import { describe, expect, it } from "vitest";
import type { ApplicationConfiguredTeamLaunchProfile } from "@autobyteus/application-sdk-contracts";
import {
  buildConfiguredTeamMemberLaunchConfigs,
  buildConfiguredTeamRunLaunch,
} from "../src/launch-profile.js";

const memberLaunchProfile: ApplicationConfiguredTeamLaunchProfile = {
  kind: "AGENT_TEAM",
  defaults: {
    runtimeKind: "saved-runtime",
    llmModelIdentifier: "saved-model",
    workspaceRootPath: "/saved/workspace",
  },
  memberProfiles: [
    {
      memberName: "tutor-one",
      memberRouteKey: "tutor-one",
      agentDefinitionId: "tutor-one-definition",
    },
    {
      memberName: "tutor-two",
      memberRouteKey: "tutor-two",
      agentDefinitionId: "tutor-two-definition",
    },
  ],
};

describe("configured team llmConfig propagation", () => {
  it("clones optional llmConfig into a preset without changing fallback selection", () => {
    const llmConfig = { reasoning_effort: "high", nested: { budget: 3 } };
    const launch = buildConfiguredTeamRunLaunch({
      launchProfile: null,
      workspaceRootPath: "/fallback/workspace",
      runtimeKind: "fallback-runtime",
      llmModelIdentifier: "fallback-model",
      llmConfig,
    });

    expect(launch).toEqual({
      kind: "AGENT_TEAM",
      mode: "preset",
      launchPreset: {
        workspaceRootPath: "/fallback/workspace",
        runtimeKind: "fallback-runtime",
        llmModelIdentifier: "fallback-model",
        autoExecuteTools: true,
        skillAccessMode: "PRELOADED_ONLY",
        llmConfig,
      },
    });
    if (launch.mode !== "preset") throw new Error("Expected preset launch.");
    expect(launch.launchPreset.llmConfig).not.toBe(llmConfig);
    expect(launch.launchPreset.llmConfig?.nested).not.toBe(llmConfig.nested);

    llmConfig.nested.budget = 9;
    expect(launch.launchPreset.llmConfig).toEqual({
      reasoning_effort: "high",
      nested: { budget: 3 },
    });
  });

  it("preserves explicit null and omits an absent llmConfig", () => {
    const withNull = buildConfiguredTeamRunLaunch({
      launchProfile: null,
      workspaceRootPath: "/workspace",
      llmModelIdentifier: "model",
      llmConfig: null,
    });
    const withoutConfig = buildConfiguredTeamRunLaunch({
      launchProfile: null,
      workspaceRootPath: "/workspace",
      llmModelIdentifier: "model",
    });

    if (withNull.mode !== "preset" || withoutConfig.mode !== "preset") {
      throw new Error("Expected preset launches.");
    }
    expect(withNull.launchPreset).toHaveProperty("llmConfig", null);
    expect(withoutConfig.launchPreset).not.toHaveProperty("llmConfig");
  });

  it("independently clones llmConfig for every member while saved runtime and model retain priority", () => {
    const llmConfig = { reasoning_effort: "high", nested: { budget: 3 } };
    const memberConfigs = buildConfiguredTeamMemberLaunchConfigs({
      launchProfile: memberLaunchProfile,
      workspaceRootPath: "/fallback/workspace",
      runtimeKind: "fallback-runtime",
      llmModelIdentifier: "fallback-model",
      llmConfig,
    });

    expect(memberConfigs).toHaveLength(2);
    for (const memberConfig of memberConfigs) {
      expect(memberConfig).toMatchObject({
        runtimeKind: "saved-runtime",
        llmModelIdentifier: "saved-model",
        workspaceRootPath: "/saved/workspace",
        llmConfig,
      });
      expect(memberConfig.llmConfig).not.toBe(llmConfig);
      expect(memberConfig.llmConfig?.nested).not.toBe(llmConfig.nested);
    }
    expect(memberConfigs[0]?.llmConfig).not.toBe(memberConfigs[1]?.llmConfig);
    expect(memberConfigs[0]?.llmConfig?.nested).not.toBe(memberConfigs[1]?.llmConfig?.nested);

    (memberConfigs[0]?.llmConfig?.nested as { budget: number }).budget = 7;
    expect(memberConfigs[1]?.llmConfig).toEqual({
      reasoning_effort: "high",
      nested: { budget: 3 },
    });
    expect(llmConfig.nested.budget).toBe(3);
  });
});
