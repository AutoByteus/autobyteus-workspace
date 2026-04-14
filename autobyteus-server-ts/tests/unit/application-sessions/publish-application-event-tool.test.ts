import { beforeEach, describe, expect, it, vi } from "vitest";

const { publishFromRuntimeMock } = vi.hoisted(() => ({
  publishFromRuntimeMock: vi.fn(),
}));

vi.mock("../../../src/application-sessions/services/application-session-service.js", () => ({
  getApplicationSessionService: () => ({
    publishFromRuntime: publishFromRuntimeMock,
  }),
}));

import { publishApplicationEvent } from "../../../src/application-sessions/tools/publish-application-event-tool.js";

describe("publishApplicationEvent", () => {
  beforeEach(() => {
    publishFromRuntimeMock.mockReset();
    publishFromRuntimeMock.mockResolvedValue({
      applicationSessionId: "app-session-1",
    });
  });

  it("forwards the declared publication family without coercing unsupported values", async () => {
    await publishApplicationEvent(
      {
        agentId: "agent-run-1",
        customData: {},
      },
      "1",
      "NOT_A_REAL_FAMILY",
      "publication-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(publishFromRuntimeMock).toHaveBeenCalledWith({
      runId: "agent-run-1",
      customData: {},
      publication: {
        contractVersion: "1",
        publicationFamily: "NOT_A_REAL_FAMILY",
        publicationKey: "publication-1",
      },
    });
  });
});
