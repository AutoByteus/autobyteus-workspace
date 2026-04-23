import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_EXECUTION_CONTEXT_KEY } from "../../../../src/application-orchestration/domain/models.js";
import { registerPublishArtifactTool } from "../../../../src/agent-tools/published-artifacts/publish-artifact-tool.js";

const publishForRunMock = vi.fn();

vi.mock(
  "../../../../src/services/published-artifacts/published-artifact-publication-service.js",
  () => ({
    getPublishedArtifactPublicationService: () => ({
      publishForRun: publishForRunMock,
    }),
  }),
);

describe("publishArtifactTool", () => {
  beforeEach(() => {
    publishForRunMock.mockReset();
  });

  it("describes the publish path as the exact absolute path returned by write_file", async () => {
    const tool = registerPublishArtifactTool();
    const toolClass = tool.constructor as typeof tool.constructor & {
      getDescription: () => string;
      getArgumentSchema: () => { getParameter: (name: string) => { description?: string } | undefined };
    };

    expect(toolClass.getDescription()).toContain("exact absolute file path returned by write_file");
    expect(toolClass.getArgumentSchema().getParameter("path")?.description).toContain(
      "Absolute path to the file that should be published as an artifact.",
    );
  });

  it("publishes one workspace file using the runtime run id as provenance", async () => {
    publishForRunMock.mockResolvedValue({
      artifactId: "artifact-1",
      revisionId: "revision-1",
      path: "reports/final.md",
    });

    const tool = registerPublishArtifactTool();
    const result = await tool.execute(
      { agentId: "run-123" } as any,
      { path: "reports/final.md", description: "Final report" },
    );

    expect(publishForRunMock).toHaveBeenCalledWith({
      runId: "run-123",
      path: "reports/final.md",
      description: "Final report",
    });
    expect(JSON.parse(result)).toEqual({
      success: true,
      artifact: {
        artifactId: "artifact-1",
        revisionId: "revision-1",
        path: "reports/final.md",
      },
    });
  });

  it("rejects removed legacy payload fields at the tool boundary", async () => {
    const tool = registerPublishArtifactTool();

    await expect(
      tool.execute(
        { agentId: "run-123" } as any,
        { path: "reports/final.md", artifactType: "legacy" },
      ),
    ).rejects.toThrow("publish_artifact disallows fields: artifactType.");
  });

  it("requires an agent runtime context", async () => {
    const tool = registerPublishArtifactTool();

    await expect(
      tool.execute({} as any, { path: "reports/final.md" }),
    ).rejects.toThrow("publish_artifact requires an agent runtime context.");
  });

  it("uses the team-member runtime fallback context when publishing from an AutoByteus team member", async () => {
    publishForRunMock.mockResolvedValue({
      id: "artifact-1",
      revisionId: "revision-1",
      path: "brief-studio/research.md",
    });
    const notifyAgentArtifactPersisted = vi.fn();
    const applicationExecutionContext = {
      applicationId: "app-1",
      bindingId: "binding-1",
      producer: {
        runId: "team-run-1",
        memberRouteKey: "researcher",
        memberName: "Researcher",
        displayName: "Researcher",
        runtimeKind: "AGENT_TEAM_MEMBER",
        teamPath: [],
      },
    };

    const tool = registerPublishArtifactTool();
    await tool.execute(
      {
        agentId: "native-agent-1",
        workspaceRootPath: "/tmp/workspace",
        config: {
          memoryDir: "/tmp/memory",
        },
        customData: {
          member_run_id: "researcher_member_run",
          [APPLICATION_EXECUTION_CONTEXT_KEY]: applicationExecutionContext,
        },
        statusManager: {
          notifier: {
            notifyAgentArtifactPersisted,
          },
        },
      } as any,
      { path: "brief-studio/research.md" },
    );

    expect(publishForRunMock).toHaveBeenCalledTimes(1);
    expect(publishForRunMock).toHaveBeenCalledWith({
      runId: "researcher_member_run",
      path: "brief-studio/research.md",
      description: null,
      fallbackRuntimeContext: expect.objectContaining({
        memoryDir: "/tmp/memory",
        workspaceRootPath: "/tmp/workspace",
        applicationExecutionContext,
        emitArtifactPersisted: expect.any(Function),
      }),
    });

    const fallbackRuntimeContext = publishForRunMock.mock.calls[0]?.[0]?.fallbackRuntimeContext;
    expect(fallbackRuntimeContext).toBeTruthy();
    await fallbackRuntimeContext.emitArtifactPersisted({
      id: "artifact-1",
      runId: "researcher_member_run",
      path: "brief-studio/research.md",
      type: "file",
      revisionId: "revision-1",
    });
    expect(notifyAgentArtifactPersisted).toHaveBeenCalledWith({
      artifact_id: "artifact-1",
      agent_id: "researcher_member_run",
      path: "brief-studio/research.md",
      type: "file",
      revision_id: "revision-1",
      workspace_root: "/tmp/workspace",
    });
  });
});
