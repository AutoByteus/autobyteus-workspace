import { beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_EXECUTION_CONTEXT_KEY } from "../../../../src/application-orchestration/domain/models.js";
import { registerPublishArtifactsTool } from "../../../../src/agent-tools/published-artifacts/publish-artifacts-tool.js";

const publishManyForRunMock = vi.fn();

vi.mock(
  "../../../../src/services/published-artifacts/published-artifact-publication-service.js",
  () => ({
    getPublishedArtifactPublicationService: () => ({
      publishManyForRun: publishManyForRunMock,
    }),
  }),
);

describe("publishArtifactsTool", () => {
  beforeEach(() => {
    publishManyForRunMock.mockReset();
  });

  it("describes one-item artifact arrays and workspace-relative or absolute paths", async () => {
    const tool = registerPublishArtifactsTool();
    const toolClass = tool.constructor as typeof tool.constructor & {
      getDescription: () => string;
      getArgumentSchema: () => { getParameter: (name: string) => { description?: string } | undefined };
    };

    expect(toolClass.getDescription()).toContain("single-file publication uses a one-item array");
    expect(toolClass.getDescription()).toContain("absolute paths can point outside the workspace");
    expect(toolClass.getDescription()).not.toContain("must still resolve inside the current workspace");
    expect(toolClass.getArgumentSchema().getParameter("artifacts")?.description).toContain(
      "Use a one-item array for a single artifact",
    );
    expect(toolClass.getArgumentSchema().getParameter("path")).toBeUndefined();
  });

  it("publishes one workspace file through the plural array contract", async () => {
    publishManyForRunMock.mockResolvedValue([
      {
        artifactId: "artifact-1",
        revisionId: "revision-1",
        path: "reports/final.md",
      },
    ]);

    const tool = registerPublishArtifactsTool();
    const result = await tool.execute(
      { agentId: "run-123" } as any,
      { artifacts: [{ path: "reports/final.md", description: "Final report" }] },
    );

    expect(publishManyForRunMock).toHaveBeenCalledWith({
      runId: "run-123",
      artifacts: [{ path: "reports/final.md", description: "Final report" }],
    });
    expect(JSON.parse(result)).toEqual({
      success: true,
      artifacts: [
        {
          artifactId: "artifact-1",
          revisionId: "revision-1",
          path: "reports/final.md",
        },
      ],
    });
  });

  it("publishes multiple workspace files in the requested order", async () => {
    publishManyForRunMock.mockResolvedValue([
      { id: "artifact-a", path: "reports/a.md" },
      { id: "artifact-b", path: "reports/b.md" },
    ]);

    const tool = registerPublishArtifactsTool();
    const result = await tool.execute(
      { agentId: "run-123" } as any,
      {
        artifacts: [
          { path: "reports/a.md" },
          { path: "reports/b.md", description: null },
        ],
      },
    );

    expect(publishManyForRunMock).toHaveBeenCalledWith({
      runId: "run-123",
      artifacts: [
        { path: "reports/a.md", description: null },
        { path: "reports/b.md", description: null },
      ],
    });
    expect(JSON.parse(result).artifacts.map((artifact: { path: string }) => artifact.path)).toEqual([
      "reports/a.md",
      "reports/b.md",
    ]);
  });

  it("rejects the old top-level single-file payload before publishing", async () => {
    const tool = registerPublishArtifactsTool();

    await expect(
      tool.execute(
        { agentId: "run-123" } as any,
        { path: "reports/final.md" },
      ),
    ).rejects.toThrow("Required parameter 'artifacts' is missing.");
    expect(publishManyForRunMock).not.toHaveBeenCalled();
  });

  it("rejects removed rich artifact fields at the item boundary", async () => {
    const tool = registerPublishArtifactsTool();

    await expect(
      tool.execute(
        { agentId: "run-123" } as any,
        { artifacts: [{ path: "reports/final.md", artifactType: "legacy" }] },
      ),
    ).rejects.toThrow("publish_artifacts disallows artifacts[0] fields: artifactType.");
    expect(publishManyForRunMock).not.toHaveBeenCalled();
  });

  it("requires an agent runtime context", async () => {
    const tool = registerPublishArtifactsTool();

    await expect(
      tool.execute({} as any, { artifacts: [{ path: "reports/final.md" }] }),
    ).rejects.toThrow("publish_artifacts requires an agent runtime context.");
  });

  it("uses the team-member runtime fallback context when publishing from an AutoByteus team member", async () => {
    publishManyForRunMock.mockResolvedValue([
      {
        id: "artifact-1",
        revisionId: "revision-1",
        path: "brief-studio/research.md",
      },
    ]);
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

    const tool = registerPublishArtifactsTool();
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
      { artifacts: [{ path: "brief-studio/research.md" }] },
    );

    expect(publishManyForRunMock).toHaveBeenCalledTimes(1);
    expect(publishManyForRunMock).toHaveBeenCalledWith({
      runId: "researcher_member_run",
      artifacts: [{ path: "brief-studio/research.md", description: null }],
      fallbackRuntimeContext: expect.objectContaining({
        memoryDir: "/tmp/memory",
        workspaceRootPath: "/tmp/workspace",
        applicationExecutionContext,
        emitArtifactPersisted: expect.any(Function),
      }),
    });

    const fallbackRuntimeContext = publishManyForRunMock.mock.calls[0]?.[0]?.fallbackRuntimeContext;
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
