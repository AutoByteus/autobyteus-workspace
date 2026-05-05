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

import { buildClaudeMediaMcpServer } from "../../../../../../src/agent-execution/backends/claude/media/build-claude-media-mcp-server.js";

describe("buildClaudeMediaMcpServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no media tools are enabled", async () => {
    const sdkClient = {
      createToolDefinition: vi.fn(),
      createMcpServer: vi.fn(),
    } as any;

    await expect(buildClaudeMediaMcpServer({
      sdkClient,
      enabledToolNames: [],
      workingDirectory: "/tmp/workspace",
    })).resolves.toBeNull();
    expect(sdkClient.createToolDefinition).not.toHaveBeenCalled();
  });

  it("builds autobyteus_image_audio MCP tools with JSON text results", async () => {
    mediaServiceMock.generateImage.mockResolvedValue({ file_path: "/tmp/workspace/out.png" });
    const createToolDefinition = vi.fn(async (definition) => definition);
    const createMcpServer = vi.fn(async ({ name, tools }) => ({ name, tools }));
    const sdkClient = { createToolDefinition, createMcpServer } as any;

    const servers = await buildClaudeMediaMcpServer({
      sdkClient,
      enabledToolNames: [GENERATE_IMAGE_TOOL_NAME],
      workingDirectory: "/tmp/workspace",
    });

    expect(servers).toMatchObject({
      autobyteus_image_audio: {
        name: "autobyteus_image_audio",
      },
    });
    expect(createToolDefinition).toHaveBeenCalledTimes(1);
    const tools = createMcpServer.mock.calls[0]![0].tools as Array<Record<string, unknown>>;
    const generateTool = tools.find((tool) => tool.name === GENERATE_IMAGE_TOOL_NAME);
    expect(generateTool).toBeDefined();

    const result = await (generateTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
      prompt: "draw a house",
      output_file_path: "out.png",
    });

    expect(mediaServiceMock.generateImage).toHaveBeenCalledWith(
      { workspaceRootPath: "/tmp/workspace" },
      { prompt: "draw a house", input_images: null, output_file_path: "out.png", generation_config: null },
    );
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ file_path: "/tmp/workspace/out.png" }, null, 2),
        },
      ],
    });
  });
});
