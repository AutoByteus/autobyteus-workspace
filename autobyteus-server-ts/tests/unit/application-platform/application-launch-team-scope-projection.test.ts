import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationExecutionResourceSlotDeclaration,
} from "@autobyteus/application-sdk-contracts";
import {
  ApplicationLaunchResourceBaselineBuilder,
} from "../../../src/application-platform/launch-configuration/application-launch-resource-baseline-builder.js";
import {
  applyApplicationLaunchOverride,
} from "../../../src/application-platform/launch-configuration/application-launch-override-overlay.js";

const slot: ApplicationExecutionResourceSlotDeclaration = {
  slotKey: "team",
  name: "Team",
  allowedExecutionResourceKinds: ["AGENT_TEAM"],
  allowedExecutionResourceSources: ["bundle"],
  required: true,
  supportedLaunchConfig: {
    AGENT_TEAM: {
      runtimeKind: true,
      llmModelIdentifier: true,
      llmConfig: true,
      workspaceRootPath: true,
      memberOverrides: {
        runtimeKind: true,
        llmModelIdentifier: true,
        llmConfig: true,
      },
    },
  },
  defaultExecutionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "root-team",
  },
};

const buildHarness = () => {
  const teams = new Map<string, unknown>([
    ["root-team", {
      name: "Root Team",
      coordinatorMemberName: "Lead",
      defaultLaunchConfig: {
        runtimeKind: "codex_app_server",
        llmModelIdentifier: "gpt-5.6-luna",
        llmConfig: { reasoning_effort: "high" },
      },
      nodes: [
        { memberName: "Lead", refType: "agent", refScope: "shared", ref: "lead-agent" },
        { memberName: "Review", refType: "agent_team", refScope: "shared", ref: "review-team" },
      ],
    }],
    ["review-team", {
      name: "Review Team",
      coordinatorMemberName: "Reviewer",
      defaultLaunchConfig: {
        runtimeKind: "claude_agent_sdk",
        llmModelIdentifier: "claude-sonnet",
        llmConfig: { effort: "high" },
      },
      nodes: [
        { memberName: "Reviewer", refType: "agent", refScope: "shared", ref: "reviewer-agent" },
      ],
    }],
  ]);
  const agents = new Map<string, unknown>([
    ["lead-agent", {
      name: "Lead",
      defaultLaunchConfig: {
        runtimeKind: "autobyteus",
        llmModelIdentifier: "agent-model",
      },
    }],
    ["reviewer-agent", {
      name: "Reviewer",
      defaultLaunchConfig: {
        runtimeKind: "autobyteus",
        llmModelIdentifier: "agent-model",
      },
    }],
  ]);
  return new ApplicationLaunchResourceBaselineBuilder({
    executionResourceResolver: {
      resolveExecutionResource: vi.fn(async () => ({
        source: "bundle",
        kind: "AGENT_TEAM",
        localId: "root-team",
        definitionId: "root-team",
        name: "Root Team",
        applicationId: "app-1",
      })),
    } as never,
    agentDefinitionService: {
      getAgentDefinitionById: vi.fn(async (id: string) => agents.get(id) ?? null),
    } as never,
    agentTeamDefinitionService: {
      getDefinitionById: vi.fn(async (id: string) => teams.get(id) ?? null),
    } as never,
  });
};

describe("application Team launch scope projection", () => {
  it("projects complete rooted Team scopes and leaves with application definition precedence", async () => {
    const baseline = await buildHarness().build({
      applicationId: "app-1",
      slot,
      executionResourceRef: slot.defaultExecutionResourceRef!,
      provenance: "PACKAGE",
    });

    expect(baseline.resourceKind).toBe("AGENT_TEAM");
    if (baseline.resourceKind !== "AGENT_TEAM") throw new Error("Expected Team baseline.");
    expect(baseline.teamScopes).toEqual([
      expect.objectContaining({
        teamAddress: "/",
        displayName: "Root Team",
        teamDefinitionId: "root-team",
        runtimeKind: "codex_app_server",
        llmModelIdentifier: "gpt-5.6-luna",
        provenance: expect.objectContaining({
          runtimeKind: { kind: "PACKAGE_TEAM_DEFAULT", teamDefinitionId: "root-team" },
        }),
      }),
      expect.objectContaining({
        teamAddress: "/Review",
        displayName: "Review",
        teamDefinitionId: "review-team",
        runtimeKind: "claude_agent_sdk",
        llmModelIdentifier: "claude-sonnet",
        provenance: expect.objectContaining({
          runtimeKind: { kind: "PACKAGE_TEAM_DEFAULT", teamDefinitionId: "review-team" },
        }),
      }),
    ]);
    expect(baseline.leaves).toEqual([
      expect.objectContaining({
        memberAddress: "/Lead",
        runtimeKind: "codex_app_server",
        llmModelIdentifier: "gpt-5.6-luna",
      }),
      expect.objectContaining({
        memberAddress: "/Review/Reviewer",
        runtimeKind: "claude_agent_sdk",
        llmModelIdentifier: "claude-sonnet",
      }),
    ]);
  });

  it("applies a slot overlay to every Team/Agent subject and an exact member overlay only to that leaf", async () => {
    const baseline = await buildHarness().build({
      applicationId: "app-1",
      slot,
      executionResourceRef: slot.defaultExecutionResourceRef!,
      provenance: "PACKAGE",
    });
    const effective = applyApplicationLaunchOverride({
      baseline,
      workspaceRootPath: "/runtime/app",
      launchOverride: {
        kind: "AGENT_TEAM",
        defaults: {
          runtimeKind: "autobyteus",
          llmModelIdentifier: "shared-model",
          llmConfig: { shared: true },
          workspaceRootPath: "/workspace/team",
        },
        memberProfiles: [{
          memberAddress: "/Review/Reviewer",
          displayName: "Reviewer",
          agentDefinitionId: "reviewer-agent",
          runtimeKind: "claude_agent_sdk",
          llmModelIdentifier: "member-model",
          llmConfig: { member: true },
        }],
      },
    });

    expect(effective.resourceKind).toBe("AGENT_TEAM");
    if (effective.resourceKind !== "AGENT_TEAM") throw new Error("Expected Team configuration.");
    expect(effective.teamScopes).toHaveLength(2);
    expect(effective.teamScopes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        teamAddress: "/",
        runtimeKind: "autobyteus",
        llmModelIdentifier: "shared-model",
        llmConfig: { shared: true },
        workspaceRootPath: "/workspace/team",
      }),
      expect.objectContaining({
        teamAddress: "/Review",
        runtimeKind: "autobyteus",
        llmModelIdentifier: "shared-model",
        llmConfig: { shared: true },
        workspaceRootPath: "/workspace/team",
      }),
    ]));
    expect(effective.leaves).toEqual(expect.arrayContaining([
      expect.objectContaining({
        memberAddress: "/Lead",
        runtimeKind: "autobyteus",
        llmModelIdentifier: "shared-model",
        llmConfig: { shared: true },
      }),
      expect.objectContaining({
        memberAddress: "/Review/Reviewer",
        runtimeKind: "claude_agent_sdk",
        llmModelIdentifier: "member-model",
        llmConfig: { member: true },
      }),
    ]));
  });
});
