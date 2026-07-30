import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { MemberTeamContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { TeamMemberCodexThreadBootstrapStrategy } from "../../../src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.js";
import { ApplicationExecutionResourceResolver } from "../../../src/application-orchestration/services/application-execution-resource-resolver.js";
import { createApplicationDefinitionServices } from "../../../src/application-platform/runtime/create-application-definition-services.js";
import { validateStandaloneApplicationPackage } from "../../../src/application-platform/launch-configuration/application-standalone-package-validator.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const packageRoot = path.resolve("../applications/brief-studio/dist/importable-package");

describe("Brief package team prompt authority", () => {
  it("places the exact graph-local package team instruction in the final Codex member bootstrap", async () => {
    const validated = await validateStandaloneApplicationPackage({
      packageRoot,
      localApplicationId: "brief-studio",
    });
    const definitions = createApplicationDefinitionServices({
      appConfig: {
        getAgentsDir: () => path.join(packageRoot, ".test-only", "agents"),
        getAgentTeamsDir: () => path.join(packageRoot, ".test-only", "agent-teams"),
        getAdditionalAgentPackageRoots: () => [],
      } as never,
      bundleService: validated.bundleService,
    });
    const resolver = new ApplicationExecutionResourceResolver({
      applicationBundleService: validated.bundleService,
      ...definitions,
    });
    const slot = validated.selection.bundle.executionResourceSlots.find(
      (candidate) => candidate.slotKey === "draftingTeam",
    );
    if (!slot?.defaultExecutionResourceRef) throw new Error("Brief draftingTeam default is missing.");
    const teamResource = await resolver.resolveExecutionResource(
      validated.selection.applicationId,
      slot.defaultExecutionResourceRef,
    );
    const packageTeam = await definitions.agentTeamDefinitionService
      .getDefinitionById(teamResource.definitionId);
    if (!packageTeam) throw new Error("Package team definition was not resolved.");
    const researcherDefinitionId = buildTeamLocalAgentDefinitionId(
      teamResource.definitionId,
      "researcher",
    );
    const researcher = await definitions.agentDefinitionService
      .getAgentDefinitionById(researcherDefinitionId);
    if (!researcher) throw new Error("Package researcher definition was not resolved.");

    const globalTeamLookup = vi.spyOn(AgentTeamDefinitionService, "getInstance");
    const memberTeamContext = await new MemberTeamContextBuilder(
      definitions.agentTeamDefinitionService,
    ).build({
      teamRunId: "brief-team-run",
      teamDefinitionId: teamResource.definitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      currentMemberName: "researcher",
      currentMemberRouteKey: "researcher",
      currentMemberRunId: "brief-researcher-run",
      members: [
        {
          memberName: "researcher",
          memberPath: ["researcher"],
          memberRouteKey: "researcher",
          memberRunId: "brief-researcher-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        },
        {
          memberName: "writer",
          memberPath: ["writer"],
          memberRouteKey: "writer",
          memberRunId: "brief-writer-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        },
      ],
      deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
    });
    const prepared = new TeamMemberCodexThreadBootstrapStrategy().prepare({
      runContext: {
        config: {
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memberTeamContext,
        },
      } as never,
      agentInstruction: researcher.instructions,
      configuredToolExposure: {
        sendMessageToConfigured: true,
        enabledTaskDelegationToolNames: [],
      } as never,
    });

    expect(memberTeamContext.teamInstruction).toBe(packageTeam.instructions.trim());
    expect(packageTeam.instructions).toContain(
      "researcher starts the fresh run, writes `brief-studio/research.md`, publishes it with `publish_artifacts`",
    );
    expect(prepared.baseInstructions).toContain("## Team Instruction");
    expect(prepared.baseInstructions).toContain(packageTeam.instructions.trim());
    expect(prepared.baseInstructions).toContain("## Agent Instruction");
    expect(prepared.baseInstructions).toContain(researcher.instructions.trim());
    expect(prepared.developerInstructions).toContain("Current team member: researcher");
    expect(globalTeamLookup).not.toHaveBeenCalled();
  });
});
