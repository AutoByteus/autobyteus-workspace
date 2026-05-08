import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildClaudePublishArtifactsToolDefinition } from "../../../../../../src/agent-execution/backends/claude/published-artifacts/build-claude-publish-artifacts-tool-definition.js";

const publishManyForRunMock = vi.fn();

vi.mock(
  "../../../../../../src/services/published-artifacts/published-artifact-publication-service.js",
  () => ({
    getPublishedArtifactPublicationService: () => ({
      publishManyForRun: publishManyForRunMock,
    }),
  }),
);

describe("buildClaudePublishArtifactsToolDefinition", () => {
  beforeEach(() => {
    publishManyForRunMock.mockReset();
  });

  const createDefinition = async () => {
    const createToolDefinition = vi.fn(async (definition) => definition);
    const definition = await buildClaudePublishArtifactsToolDefinition({
      sdkClient: { createToolDefinition } as any,
      runId: "run-1",
    });
    return { definition: definition as any, createToolDefinition };
  };

  it("builds a plural tool definition and publishes through the shared batch service", async () => {
    publishManyForRunMock.mockResolvedValue([{ id: "artifact-a", path: "reports/a.md" }]);

    const { definition, createToolDefinition } = await createDefinition();

    expect(createToolDefinition).toHaveBeenCalledTimes(1);
    expect(definition.name).toBe("publish_artifacts");
    expect(definition.description).toContain("absolute paths can point outside the workspace");
    expect(definition.description).not.toContain("must still resolve inside the current workspace");
    expect(definition.inputSchema).toHaveProperty("artifacts");
    expect(definition.inputSchema).not.toHaveProperty("path");
    expect(definition.inputSchema.artifacts.element.shape.path.description).toContain(
      "Absolute paths may point outside the workspace",
    );

    const result = await definition.handler({
      artifacts: [{ path: "reports/a.md", description: "Ready" }],
    });

    expect(publishManyForRunMock).toHaveBeenCalledWith({
      runId: "run-1",
      artifacts: [{ path: "reports/a.md", description: "Ready" }],
    });
    expect(JSON.parse(result.content[0].text)).toEqual({
      success: true,
      artifacts: [{ id: "artifact-a", path: "reports/a.md" }],
    });
  });

  it("normalizes blank descriptions through the shared contract before publishing", async () => {
    publishManyForRunMock.mockResolvedValue([{ id: "artifact-a", path: "reports/a.md" }]);

    const { definition } = await createDefinition();
    const descriptionSchema = definition.inputSchema.artifacts.element.shape.description;

    expect(descriptionSchema.safeParse("").success).toBe(true);

    const result = await definition.handler({
      artifacts: [{ path: "reports/a.md", description: "" }],
    });

    expect(publishManyForRunMock).toHaveBeenCalledWith({
      runId: "run-1",
      artifacts: [{ path: "reports/a.md", description: null }],
    });
    expect(JSON.parse(result.content[0].text)).toEqual({
      success: true,
      artifacts: [{ id: "artifact-a", path: "reports/a.md" }],
    });
  });


  it("returns a tool error for old top-level single-file payloads before publication", async () => {
    const { definition } = await createDefinition();

    const result = await definition.handler({ path: "reports/a.md" });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text).error).toBe(
      "publish_artifacts disallows top-level fields: path.",
    );
    expect(publishManyForRunMock).not.toHaveBeenCalled();
  });
});
