import { describe, expect, it, vi } from "vitest";
import type { RunScopedMemberBindingInput } from "../../../src/distributed/runtime-binding/run-scoped-member-binding.js";
import { createWorkerBootstrapMemberArtifactService } from "../../../src/distributed/bootstrap/worker-bootstrap-member-artifact-service.js";

describe("worker bootstrap member artifact service", () => {
  it("prepares canonical member memoryDir only for local bindings", () => {
    const memberLayoutStore = {
      getMemberDirPath: vi.fn((teamRunId: string, memberAgentId: string) => `/memory/agent_teams/${teamRunId}/${memberAgentId}`),
    };
    const memberRunManifestStore = {
      writeManifest: vi.fn(async () => undefined),
    };
    const service = createWorkerBootstrapMemberArtifactService({
      localNodeId: "worker-1",
      memberLayoutStore,
      memberRunManifestStore,
    });
    const rawBindings: RunScopedMemberBindingInput[] = [
      {
        memberName: "student",
        memberAgentId: "student_abcd1234",
        memberRouteKey: "student",
        hostNodeId: "worker-1",
        agentDefinitionId: "1",
        llmModelIdentifier: "model-1",
        autoExecuteTools: false,
      },
      {
        memberName: "professor",
        memberAgentId: "professor_efgh5678",
        memberRouteKey: "professor",
        hostNodeId: "worker-2",
        agentDefinitionId: "2",
        llmModelIdentifier: "model-2",
        autoExecuteTools: false,
      },
      {
        memberName: "observer",
        hostNodeId: "worker-1",
        agentDefinitionId: "3",
        llmModelIdentifier: "model-3",
        autoExecuteTools: false,
      },
    ];

    const prepared = service.prepareMemberBindings("team-1", rawBindings);

    expect(prepared[0].memoryDir).toBe("/memory/agent_teams/team-1/student_abcd1234");
    expect(prepared[1].memoryDir).toBeNull();
    expect(prepared[2]).toEqual(
      expect.objectContaining({
        memberName: "observer",
        hostNodeId: "worker-1",
        agentDefinitionId: "3",
        llmModelIdentifier: "model-3",
        autoExecuteTools: false,
        memberAgentId: null,
        memoryDir: null,
      }),
    );
    expect(memberLayoutStore.getMemberDirPath).toHaveBeenCalledTimes(1);
  });

  it("writes local member run manifests only for local member bindings", async () => {
    const memberLayoutStore = {
      getMemberDirPath: vi.fn((teamRunId: string, memberAgentId: string) => `/memory/agent_teams/${teamRunId}/${memberAgentId}`),
    };
    const memberRunManifestStore = {
      writeManifest: vi.fn(async () => undefined),
    };
    const service = createWorkerBootstrapMemberArtifactService({
      localNodeId: "worker-1",
      memberLayoutStore,
      memberRunManifestStore,
    });

    const memberBindings: RunScopedMemberBindingInput[] = [
      {
        memberName: "student",
        memberAgentId: " student_abcd1234 ",
        memberRouteKey: "student",
        hostNodeId: " worker-1 ",
        workspaceRootPath: " /workspace/student ",
        agentDefinitionId: "1",
        llmModelIdentifier: "model-1",
        autoExecuteTools: false,
        llmConfig: null,
      },
      {
        memberName: "professor",
        memberAgentId: "professor_efgh5678",
        memberRouteKey: "professor",
        hostNodeId: "worker-2",
        workspaceRootPath: "/workspace/professor",
        agentDefinitionId: "2",
        llmModelIdentifier: "model-2",
        autoExecuteTools: false,
      },
    ];

    await service.persistLocalMemberRunManifests({
      teamRunId: "team-1",
      runVersion: "4.9",
      nowIso: "2026-02-24T18:00:00.000Z",
      memberBindings,
    });

    expect(memberRunManifestStore.writeManifest).toHaveBeenCalledTimes(1);
    expect(memberRunManifestStore.writeManifest).toHaveBeenCalledWith(
      "team-1",
      expect.objectContaining({
        version: 1,
        teamRunId: "team-1",
        runVersion: 4,
        memberName: "student",
        memberRouteKey: "student",
        memberAgentId: "student_abcd1234",
        hostNodeId: "worker-1",
        workspaceRootPath: "/workspace/student",
        lastKnownStatus: "IDLE",
      }),
    );
  });
});
