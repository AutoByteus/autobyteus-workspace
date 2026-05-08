import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERATE_IMAGE_TOOL_NAME } from "../../../../../../src/agent-tools/media/media-tool-contract.js";

const { mediaServiceMock } = vi.hoisted(() => ({
  mediaServiceMock: {
    generateImage: vi.fn(),
    editImage: vi.fn(),
    generateSpeech: vi.fn(),
  },
}));

vi.mock(
  "../../../../../../src/agent-tools/media/media-generation-service.js",
  () => ({
    getMediaGenerationService: () => mediaServiceMock,
  }),
);

import { buildMediaDynamicToolRegistrationsForEnabledToolNames } from "../../../../../../src/agent-execution/backends/codex/media/build-media-dynamic-tool-registrations.js";

describe("buildMediaDynamicToolRegistrationsForEnabledToolNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no media tools are enabled", () => {
    expect(buildMediaDynamicToolRegistrationsForEnabledToolNames({
      enabledToolNames: [],
      workingDirectory: "/tmp/workspace",
    })).toBeNull();
  });

  it("builds enabled media tool specs and JSON text handlers", async () => {
    mediaServiceMock.generateImage.mockResolvedValue({ file_path: "/tmp/workspace/out.png" });

    const registrations = buildMediaDynamicToolRegistrationsForEnabledToolNames({
      enabledToolNames: [GENERATE_IMAGE_TOOL_NAME, "read_file"],
      workingDirectory: "/tmp/workspace",
    });

    expect(registrations).toHaveLength(1);
    expect(registrations?.[0]?.spec).toMatchObject({
      name: GENERATE_IMAGE_TOOL_NAME,
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: expect.arrayContaining(["prompt", "output_file_path"]),
        properties: {
          input_images: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    });

    const result = await registrations![0]!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-1",
      toolName: GENERATE_IMAGE_TOOL_NAME,
      arguments: {
        prompt: "draw a house",
        output_file_path: "out.png",
      },
    });

    expect(mediaServiceMock.generateImage).toHaveBeenCalledWith(
      { workspaceRootPath: "/tmp/workspace", runId: "run-1", agentId: "run-1" },
      { prompt: "draw a house", input_images: null, output_file_path: "out.png", generation_config: null },
    );
    expect(result.success).toBe(true);
    expect(JSON.parse(result.contentItems[0]!.text)).toEqual({
      file_path: "/tmp/workspace/out.png",
    });
  });

  it("returns a structured JSON error payload when service execution fails", async () => {
    mediaServiceMock.generateImage.mockRejectedValue(new Error("provider down"));
    const registrations = buildMediaDynamicToolRegistrationsForEnabledToolNames({
      enabledToolNames: [GENERATE_IMAGE_TOOL_NAME],
      workingDirectory: "/tmp/workspace",
    });

    const result = await registrations![0]!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-1",
      toolName: GENERATE_IMAGE_TOOL_NAME,
      arguments: {
        prompt: "draw a house",
        output_file_path: "out.png",
      },
    });

    expect(result.success).toBe(false);
    expect(JSON.parse(result.contentItems[0]!.text)).toMatchObject({
      error: {
        code: "media_tool_execution_failed",
        message: "provider down",
      },
    });
  });
});
