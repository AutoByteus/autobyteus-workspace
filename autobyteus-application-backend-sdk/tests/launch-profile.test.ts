import { describe, expect, it } from "vitest";
import type {
  ApplicationEffectiveLaunchConfiguration,
} from "@autobyteus/application-sdk-contracts";
import {
  buildEffectiveAgentRunLaunch,
  buildEffectiveTeamRunLaunch,
} from "../src/launch-profile.js";

const provenance = {
  runtimeKind: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: "agent-1" } as const,
  llmModelIdentifier: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: "agent-1" } as const,
  llmConfig: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: "agent-1" } as const,
  workspaceRootPath: "APPLICATION_RUNTIME" as const,
};

const buildAgentConfiguration = (
  llmConfig: Record<string, unknown> | null,
): ApplicationEffectiveLaunchConfiguration => ({
  slotKey: "assistant",
  executionResourceRef: { source: "bundle", kind: "AGENT", localId: "assistant" },
  resourceDefinitionId: "agent-1",
  resourceKind: "AGENT",
  leaves: [{
    memberAddress: null,
    displayName: "Assistant",
    agentDefinitionId: "agent-1",
    runtimeKind: "codex_app_server",
    llmModelIdentifier: "gpt-5.6-luna",
    llmConfig,
    workspaceRootPath: "/workspace/assistant",
    provenance,
  }],
});

const buildTeamConfiguration = (
  llmConfig: Record<string, unknown> | null,
): ApplicationEffectiveLaunchConfiguration => ({
  slotKey: "team",
  executionResourceRef: { source: "bundle", kind: "AGENT_TEAM", localId: "team" },
  resourceDefinitionId: "team-1",
  resourceKind: "AGENT_TEAM",
  teamScopes: [{
    teamAddress: "/",
    displayName: "Team",
    teamDefinitionId: "team-1",
    runtimeKind: "codex_app_server",
    llmModelIdentifier: "gpt-5.6-luna",
    llmConfig,
    workspaceRootPath: "/workspace/team",
    provenance: {
      ...provenance,
      runtimeKind: { kind: "PACKAGE_TEAM_DEFAULT", teamDefinitionId: "team-1" },
      llmModelIdentifier: { kind: "PACKAGE_TEAM_DEFAULT", teamDefinitionId: "team-1" },
      llmConfig: { kind: "PACKAGE_TEAM_DEFAULT", teamDefinitionId: "team-1" },
    },
  }],
  leaves: ["researcher", "writer"].map((memberName) => ({
    memberAddress: `/${memberName}`,
    displayName: memberName === "researcher" ? "Researcher" : "Writer",
    agentDefinitionId: `${memberName}-agent`,
    runtimeKind: "codex_app_server",
    llmModelIdentifier: "gpt-5.6-luna",
    llmConfig,
    workspaceRootPath: `/workspace/${memberName}`,
    provenance: {
      ...provenance,
      runtimeKind: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: `${memberName}-agent` },
      llmModelIdentifier: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: `${memberName}-agent` },
      llmConfig: { kind: "PACKAGE_AGENT_DEFAULT", agentDefinitionId: `${memberName}-agent` },
    },
  })),
});

describe("effective application launch translation", () => {
  it("builds the exact agent launch and independently clones llmConfig", () => {
    const llmConfig = { reasoning_effort: "high", nested: { budget: 3 } };
    const launch = buildEffectiveAgentRunLaunch({ configuration: buildAgentConfiguration(llmConfig) });

    expect(launch).toEqual({
      kind: "AGENT",
      workspaceRootPath: "/workspace/assistant",
      runtimeKind: "codex_app_server",
      llmModelIdentifier: "gpt-5.6-luna",
      llmConfig,
      autoExecuteTools: true,
      skillAccessMode: "PRELOADED_ONLY",
    });
    expect(launch.llmConfig).not.toBe(llmConfig);
    expect(launch.llmConfig?.nested).not.toBe(llmConfig.nested);
  });

  it("omits a null llmConfig and preserves explicit skill access", () => {
    const launch = buildEffectiveAgentRunLaunch({
      configuration: buildAgentConfiguration(null),
      skillAccessMode: "NONE",
    });

    expect(launch).not.toHaveProperty("llmConfig");
    expect(launch.skillAccessMode).toBe("NONE");
  });

  it("builds rooted member configs and independently clones every llmConfig", () => {
    const llmConfig = { reasoning_effort: "high", nested: { budget: 3 } };
    const launch = buildEffectiveTeamRunLaunch({ configuration: buildTeamConfiguration(llmConfig) });

    expect(launch).toMatchObject({ kind: "AGENT_TEAM", mode: "memberConfigs" });
    if (launch.mode !== "memberConfigs") throw new Error("Expected memberConfigs launch.");
    expect(launch.teamConfigs).toEqual([{
      teamAddress: "/",
      workspaceRootPath: "/workspace/team",
      runtimeKind: "codex_app_server",
      llmModelIdentifier: "gpt-5.6-luna",
      llmConfig,
      autoExecuteTools: true,
      skillAccessMode: "PRELOADED_ONLY",
    }]);
    expect(launch.teamConfigs[0]?.llmConfig).not.toBe(llmConfig);
    expect(launch.teamConfigs[0]?.llmConfig?.nested).not.toBe(llmConfig.nested);
    expect(launch.memberConfigs.map(({ memberAddress, displayName, agentDefinitionId }) => ({
      memberAddress,
      displayName,
      agentDefinitionId,
    }))).toEqual([
      { memberAddress: "/researcher", displayName: "Researcher", agentDefinitionId: "researcher-agent" },
      { memberAddress: "/writer", displayName: "Writer", agentDefinitionId: "writer-agent" },
    ]);
    for (const memberConfig of launch.memberConfigs) {
      expect(memberConfig).toMatchObject({
        runtimeKind: "codex_app_server",
        llmModelIdentifier: "gpt-5.6-luna",
        llmConfig,
      });
      expect(memberConfig.llmConfig).not.toBe(llmConfig);
      expect(memberConfig.llmConfig?.nested).not.toBe(llmConfig.nested);
    }
    expect(launch.memberConfigs[0]?.llmConfig).not.toBe(launch.memberConfigs[1]?.llmConfig);
  });

  it("rejects a team leaf without a rooted member address", () => {
    const configuration = buildTeamConfiguration(null);
    configuration.leaves[0]!.memberAddress = null;

    expect(() => buildEffectiveTeamRunLaunch({ configuration })).toThrow(
      "memberAddress is required for an effective team leaf.",
    );
  });
});
