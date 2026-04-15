import { beforeEach, describe, expect, it, vi } from "vitest";

const { publishFromRuntimeMock } = vi.hoisted(() => ({
  publishFromRuntimeMock: vi.fn(),
}));

vi.mock("../../../src/application-sessions/services/application-session-service.js", () => ({
  getApplicationSessionService: () => ({
    publishFromRuntime: publishFromRuntimeMock,
  }),
}));

import { publishArtifact } from "../../../src/application-sessions/tools/publish-artifact-tool.js";

describe("publishArtifact", () => {
  beforeEach(() => {
    publishFromRuntimeMock.mockReset();
    publishFromRuntimeMock.mockResolvedValue({
      applicationSessionId: "app-session-1",
    });
  });

  it("forwards the artifact-centric payload without adding legacy publication-family fields", async () => {
    await publishArtifact(
      {
        agentId: "agent-run-1",
        customData: {},
      },
      "1",
      "artifact-1",
      "markdown_document",
      "Requirements Draft",
      "Ready for review",
      {
        kind: "INLINE_JSON",
        mimeType: "application/json",
        value: { body: "Hello" },
      },
      { revision: 2 },
      true,
    );

    expect(publishFromRuntimeMock).toHaveBeenCalledWith({
      runId: "agent-run-1",
      customData: {},
      publication: {
        contractVersion: "1",
        artifactKey: "artifact-1",
        artifactType: "markdown_document",
        title: "Requirements Draft",
        summary: "Ready for review",
        artifactRef: {
          kind: "INLINE_JSON",
          mimeType: "application/json",
          value: { body: "Hello" },
        },
        metadata: { revision: 2 },
        isFinal: true,
      },
    });
  });
});
