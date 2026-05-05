import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCodexPublishArtifactsDynamicToolRegistration } from "../../../../../../src/agent-execution/backends/codex/published-artifacts/build-codex-publish-artifacts-dynamic-tool-registration.js";

const publishManyForRunMock = vi.fn();

vi.mock(
  "../../../../../../src/services/published-artifacts/published-artifact-publication-service.js",
  () => ({
    getPublishedArtifactPublicationService: () => ({
      publishManyForRun: publishManyForRunMock,
    }),
  }),
);

describe("buildCodexPublishArtifactsDynamicToolRegistration", () => {
  beforeEach(() => {
    publishManyForRunMock.mockReset();
  });

  it("builds the plural schema and publishes through the shared batch service", async () => {
    publishManyForRunMock.mockResolvedValue([
      { id: "artifact-a", path: "reports/a.md" },
      { id: "artifact-b", path: "reports/b.md" },
    ]);

    const registrations = buildCodexPublishArtifactsDynamicToolRegistration();
    const registration = registrations?.[0];

    expect(registration?.spec).toMatchObject({
      name: "publish_artifacts",
      inputSchema: {
        required: ["artifacts"],
        additionalProperties: false,
      },
    });
    expect((registration?.spec.inputSchema as any).properties).not.toHaveProperty("path");

    const result = await registration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: "turn-1",
      callId: "call-1",
      toolName: "publish_artifacts",
      arguments: {
        artifacts: [
          { path: "reports/a.md" },
          { path: "reports/b.md", description: "Second" },
        ],
      },
    });

    expect(publishManyForRunMock).toHaveBeenCalledWith({
      runId: "run-1",
      artifacts: [
        { path: "reports/a.md", description: null },
        { path: "reports/b.md", description: "Second" },
      ],
    });
    expect(result.success).toBe(true);
    expect(JSON.parse(result.contentItems[0]!.text)).toEqual({
      success: true,
      artifacts: [
        { id: "artifact-a", path: "reports/a.md" },
        { id: "artifact-b", path: "reports/b.md" },
      ],
    });
  });

  it("rejects old top-level single-file payloads before publication", async () => {
    const registration = buildCodexPublishArtifactsDynamicToolRegistration()?.[0];

    await expect(
      registration!.handler({
        runId: "run-1",
        threadId: "thread-1",
        turnId: "turn-1",
        callId: "call-1",
        toolName: "publish_artifacts",
        arguments: { path: "reports/a.md" },
      }),
    ).rejects.toThrow("publish_artifacts disallows top-level fields: path.");
    expect(publishManyForRunMock).not.toHaveBeenCalled();
  });
});
