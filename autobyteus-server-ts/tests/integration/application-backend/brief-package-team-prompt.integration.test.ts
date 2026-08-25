import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { MemberTeamContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { ApplicationExecutionResourceResolver } from "../../../src/application-orchestration/services/application-execution-resource-resolver.js";
import { createApplicationDefinitionServices } from "../../../src/application-platform/runtime/create-application-definition-services.js";
import { validateStandaloneApplicationPackage } from "../../../src/application-platform/launch-configuration/application-standalone-package-validator.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberTaskRootResolver } from "../../fixtures/current-team-run-fixtures.js";

const packageRoot = path.resolve("../applications/brief-studio/dist/importable-package");
const workspaceRoot = path.resolve("../applications/brief-studio");

describe("Brief package team prompt authority", () => {
  it("composes the exact graph-local package team and member semantics through Codex bootstrap", async () => {
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

    const globalAgentLookup = vi.spyOn(AgentDefinitionService, "getInstance");
    const globalTeamLookup = vi.spyOn(AgentTeamDefinitionService, "getInstance");
    const researcherNode = {
      kind: "agent",
      address: "/researcher",
      agentDefinitionId: researcherDefinitionId,
      agentRunId: "brief-researcher-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    } as const;
    const writerNode = {
      kind: "agent",
      address: "/writer",
      agentDefinitionId: buildTeamLocalAgentDefinitionId(teamResource.definitionId, "writer"),
      agentRunId: "brief-writer-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    } as const;
    const memberTeamContext = await new MemberTeamContextBuilder(
      definitions.agentTeamDefinitionService,
    ).build({
      teamContext: new TeamRunContext({
        physicalScope: createRootTeamRunPhysicalScope("brief-team-run"),
        teamRunId: "brief-team-run",
        teamBackendKind: TeamBackendKind.MIXED,
        teamNode: {
          kind: "agent_team",
          address: "/",
          teamDefinitionId: teamResource.definitionId,
          teamRunId: "brief-team-run",
          coordinatorAddress: "/researcher",
          children: [researcherNode, writerNode],
        } as never,
        handoffs: [{
          from: "/researcher",
          to: "/writer",
          rules: ["When research is ready."],
        }],
        runtimeContext: null,
      }),
      agentNode: researcherNode as never,
      deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
      taskRootResolver: testMemberTaskRootResolver(),
    });
    const createAgentToolMcpSession = vi.fn((input: {
      runtimeExposure: { requestedToolNames: string[] };
    }) => ({
      session: {},
      descriptor: {
        name: "autobyteus_agent_tools",
        transport: "streamable_http",
        serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/brief-researcher",
        headers: { Authorization: "Bearer test-token" },
        enabledTools: input.runtimeExposure.requestedToolNames.filter(
          (toolName) => toolName !== "write_file",
        ),
      },
      redactedDescriptor: null,
    }));
    const bootstrapper = new CodexThreadBootstrapper(
      {
        materializeConfiguredWorkspaceSkills: vi.fn(async () => []),
      } as never,
      {
        resolveWorkingDirectory: vi.fn(async () => workspaceRoot),
      } as never,
      definitions.agentDefinitionService,
      {
        resolveConfiguredSkillBindingsForAgent: vi.fn(() => []),
      } as never,
      {
        acquireClient: vi.fn(),
        releaseClient: vi.fn(async () => undefined),
      } as never,
      { createAgentToolMcpSession } as never,
    );

    const result = await bootstrapper.bootstrapForCreate(new AgentRunContext({
      runId: "brief-researcher-run",
      config: new AgentRunConfig({
        agentDefinitionId: researcherDefinitionId,
        llmModelIdentifier: "gpt-5.6-luna",
        autoExecuteTools: true,
        workspaceId: "brief-workspace",
        memoryDir: path.join(workspaceRoot, ".test-memory"),
        llmConfig: null,
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberTeamContext,
      }),
      runtimeContext: null,
    }));

    const prompt = result.runtimeContext.codexThreadConfig.baseInstructions;
    expect(memberTeamContext.authoredTeamInstruction).toBe(packageTeam.instructions.trim());
    expect(packageTeam.instructions).toContain(
      "researcher starts the fresh run, writes `brief-studio/research.md`, publishes it with `publish_artifacts`",
    );
    expect(prompt).toContain("## Agent Identity");
    expect(prompt).toContain(`- Name: ${researcher.name}`);
    expect(prompt).toContain(researcher.instructions.trim());
    expect(prompt).toContain("## Team Instruction");
    expect(prompt).toContain(packageTeam.instructions.trim());
    expect(prompt).toContain("## AgentTeam Addressing");
    expect(prompt).toContain("Your Agent address is:\n\n/researcher");
    expect(prompt).toContain("## AgentTeam Collaboration");
    expect(prompt).not.toContain("## Team Runtime");
    expect(prompt).toContain("writer");
    expect(createAgentToolMcpSession).toHaveBeenCalledWith(expect.objectContaining({
      owner: expect.objectContaining({
        runId: "brief-researcher-run",
        teamIdentity: {
          rootTeamRunId: "brief-team-run",
          memberAddress: "/researcher",
          agentRunId: "brief-researcher-run",
        },
      }),
      runtimeExposure: expect.objectContaining({
        requestedToolNames: expect.arrayContaining(["publish_artifacts", "send_message_to"]),
      }),
    }));
    expect(globalAgentLookup).not.toHaveBeenCalled();
    expect(globalTeamLookup).not.toHaveBeenCalled();
  });
});
