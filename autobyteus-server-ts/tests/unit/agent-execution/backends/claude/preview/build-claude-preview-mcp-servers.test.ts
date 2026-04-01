import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
} from "../../../../../../src/agent-tools/preview/preview-tool-contract.js";
import { buildClaudePreviewMcpServers } from "../../../../../../src/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.js";

describe("buildClaudePreviewMcpServers", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env[PREVIEW_BRIDGE_BASE_URL_ENV];
    delete process.env[PREVIEW_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when preview tooling is unsupported", async () => {
    const sdkClient = {
      createToolDefinition: vi.fn(),
      createMcpServer: vi.fn(),
    } as any;

    await expect(
      buildClaudePreviewMcpServers({ sdkClient }),
    ).resolves.toBeNull();
    expect(sdkClient.createToolDefinition).not.toHaveBeenCalled();
    expect(sdkClient.createMcpServer).not.toHaveBeenCalled();
  });

  it("builds the preview MCP server and tool handlers", async () => {
    process.env[PREVIEW_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";
    process.env[PREVIEW_BRIDGE_TOKEN_ENV] = "preview-token";

    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/preview/open")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "opened",
              url: "http://localhost:3000/demo",
              title: "Demo",
            },
          }),
        };
      }
      if (url.endsWith("/preview/navigate")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "navigated",
              url: "http://localhost:3000/other",
            },
          }),
        };
      }
      if (url.endsWith("/preview/screenshot")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              artifact_path: "/tmp/preview-session-1.png",
              mime_type: "image/png",
            },
          }),
        };
      }
      if (url.endsWith("/preview/console-logs")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              entries: [{ sequence: 1, level: "log", message: "ready", timestamp_iso: "2026-01-01T00:00:00.000Z" }],
              next_sequence: 2,
            },
          }),
        };
      }
      if (url.endsWith("/preview/javascript")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              result_json: "{\"ready\":true}",
            },
          }),
        };
      }
      if (url.endsWith("/preview/devtools")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "opened",
            },
          }),
        };
      }
      if (url.endsWith("/preview/close")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "closed",
            },
          }),
        };
      }
      throw new Error(`Unexpected preview bridge url: ${url}`);
    }) as typeof globalThis.fetch;

    const createToolDefinition = vi.fn(async (definition) => definition);
    const createMcpServer = vi.fn(async ({ name, tools }) => ({
      name,
      toolCount: Array.isArray(tools) ? tools.length : 0,
      tools,
    }));
    const sdkClient = {
      createToolDefinition,
      createMcpServer,
    } as any;

    const servers = await buildClaudePreviewMcpServers({ sdkClient });

    expect(createToolDefinition).toHaveBeenCalledTimes(7);
    expect(createMcpServer).toHaveBeenCalledTimes(1);
    expect(servers).toMatchObject({
      autobyteus_preview: {
        name: "autobyteus_preview",
        toolCount: 7,
      },
    });

    const tools = createMcpServer.mock.calls[0]![0].tools as Array<Record<string, unknown>>;
    const openPreviewTool = tools.find((tool) => tool.name === OPEN_PREVIEW_TOOL_NAME);
    expect(openPreviewTool).toBeDefined();

    const result = await (openPreviewTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
      url: "http://localhost:3000/demo",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              preview_session_id: "preview-session-1",
              status: "opened",
              url: "http://localhost:3000/demo",
              title: "Demo",
            },
            null,
            2,
          ),
        },
      ],
    });

    const navigatePreviewTool = tools.find((tool) => tool.name === NAVIGATE_PREVIEW_TOOL_NAME);
    const screenshotTool = tools.find((tool) => tool.name === CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME);
    const consoleLogsTool = tools.find((tool) => tool.name === GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME);
    const executeJavascriptTool = tools.find((tool) => tool.name === EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME);
    const openDevToolsTool = tools.find((tool) => tool.name === OPEN_PREVIEW_DEVTOOLS_TOOL_NAME);
    const closePreviewTool = tools.find((tool) => tool.name === CLOSE_PREVIEW_TOOL_NAME);

    await expect(
      (navigatePreviewTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        preview_session_id: "preview-session-1",
        url: "http://localhost:3000/other",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              preview_session_id: "preview-session-1",
              status: "navigated",
              url: "http://localhost:3000/other",
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (screenshotTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        preview_session_id: "preview-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              preview_session_id: "preview-session-1",
              artifact_path: "/tmp/preview-session-1.png",
              mime_type: "image/png",
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (consoleLogsTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        preview_session_id: "preview-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              preview_session_id: "preview-session-1",
              entries: [
                {
                  sequence: 1,
                  level: "log",
                  message: "ready",
                  timestamp_iso: "2026-01-01T00:00:00.000Z",
                },
              ],
              next_sequence: 2,
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (executeJavascriptTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        preview_session_id: "preview-session-1",
        javascript: "JSON.stringify({ ready: true })",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              preview_session_id: "preview-session-1",
              result_json: "{\"ready\":true}",
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (openDevToolsTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        preview_session_id: "preview-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              preview_session_id: "preview-session-1",
              status: "opened",
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (closePreviewTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        preview_session_id: "preview-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              preview_session_id: "preview-session-1",
              status: "closed",
            },
            null,
            2,
          ),
        },
      ],
    });
  });
});
