import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
