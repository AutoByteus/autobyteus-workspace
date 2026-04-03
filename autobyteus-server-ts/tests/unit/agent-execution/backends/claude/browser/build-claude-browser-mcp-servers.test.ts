import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SCREENSHOT_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
  LIST_TABS_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  OPEN_TAB_TOOL_NAME,
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
  DOM_SNAPSHOT_TOOL_NAME,
  READ_PAGE_TOOL_NAME,
} from "../../../../../../src/agent-tools/browser/browser-tool-contract.js";
import { buildClaudeBrowserMcpServers } from "../../../../../../src/agent-execution/backends/claude/browser/build-claude-browser-mcp-servers.js";

describe("buildClaudeBrowserMcpServers", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when browser tooling is unsupported", async () => {
    const sdkClient = {
      createToolDefinition: vi.fn(),
      createMcpServer: vi.fn(),
    } as any;

    await expect(
      buildClaudeBrowserMcpServers({ sdkClient }),
    ).resolves.toBeNull();
    expect(sdkClient.createToolDefinition).not.toHaveBeenCalled();
    expect(sdkClient.createMcpServer).not.toHaveBeenCalled();
  });

  it("builds the browser MCP server and tool handlers", async () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";
    process.env[BROWSER_BRIDGE_TOKEN_ENV] = "browser-token";

    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/browser/open")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              tab_id: "browser-session-1",
              status: "opened",
              url: "http://localhost:3000/demo",
              title: "Demo",
            },
          }),
        };
      }
      if (url.endsWith("/browser/navigate")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              tab_id: "browser-session-1",
              status: "navigated",
              url: "http://localhost:3000/other",
            },
          }),
        };
      }
      if (url.endsWith("/browser/screenshot")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              tab_id: "browser-session-1",
              artifact_path: "/tmp/browser-session-1.png",
              mime_type: "image/png",
            },
          }),
        };
      }
      if (url.endsWith("/browser/list")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              sessions: [
                {
                  tab_id: "browser-session-1",
                  title: "Demo",
                  url: "http://localhost:3000/demo",
                },
              ],
            },
          }),
        };
      }
      if (url.endsWith("/browser/read-page")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              tab_id: "browser-session-1",
              url: "http://localhost:3000/demo",
              cleaning_mode: "thorough",
              content: "<main>Demo</main>",
            },
          }),
        };
      }
      if (url.endsWith("/browser/javascript")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              tab_id: "browser-session-1",
              result_json: "{\"ready\":true}",
            },
          }),
        };
      }
      if (url.endsWith("/browser/dom-snapshot")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              tab_id: "browser-session-1",
              url: "http://localhost:3000/demo",
              schema_version: "autobyteus-browser-dom-snapshot-v1",
              total_candidates: 1,
              returned_elements: 1,
              truncated: false,
              elements: [
                {
                  element_id: "e1",
                  tag_name: "button",
                  dom_id: null,
                  css_selector: "button:nth-of-type(1)",
                  role: null,
                  name: null,
                  text: "Run",
                  href: null,
                  value: null,
                  bounding_box: { x: 10, y: 20, width: 100, height: 30 },
                },
              ],
            },
          }),
        };
      }
      if (url.endsWith("/browser/close")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              tab_id: "browser-session-1",
              status: "closed",
            },
          }),
        };
      }
      throw new Error(`Unexpected browser bridge url: ${url}`);
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

    const servers = await buildClaudeBrowserMcpServers({ sdkClient });

    expect(createToolDefinition).toHaveBeenCalledTimes(8);
    expect(createMcpServer).toHaveBeenCalledTimes(1);
    expect(servers).toMatchObject({
      autobyteus_browser: {
        name: "autobyteus_browser",
        toolCount: 8,
      },
    });

    const tools = createMcpServer.mock.calls[0]![0].tools as Array<Record<string, unknown>>;
    const openTabTool = tools.find((tool) => tool.name === OPEN_TAB_TOOL_NAME);
    expect(openTabTool).toBeDefined();

    const result = await (openTabTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
      url: "http://localhost:3000/demo",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tab_id: "browser-session-1",
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

    const navigateToTool = tools.find((tool) => tool.name === NAVIGATE_TO_TOOL_NAME);
    const screenshotTool = tools.find((tool) => tool.name === SCREENSHOT_TOOL_NAME);
    const listSessionsTool = tools.find((tool) => tool.name === LIST_TABS_TOOL_NAME);
    const readPageTool = tools.find((tool) => tool.name === READ_PAGE_TOOL_NAME);
    const executeJavascriptTool = tools.find((tool) => tool.name === RUN_SCRIPT_TOOL_NAME);
    const domSnapshotTool = tools.find((tool) => tool.name === DOM_SNAPSHOT_TOOL_NAME);
    const closeTabTool = tools.find((tool) => tool.name === CLOSE_TAB_TOOL_NAME);

    await expect(
      (navigateToTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        tab_id: "browser-session-1",
        url: "http://localhost:3000/other",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tab_id: "browser-session-1",
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
        tab_id: "browser-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tab_id: "browser-session-1",
              artifact_path: "/tmp/browser-session-1.png",
              mime_type: "image/png",
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (listSessionsTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({}),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              sessions: [
                {
                  tab_id: "browser-session-1",
                  title: "Demo",
                  url: "http://localhost:3000/demo",
                },
              ],
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (readPageTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        tab_id: "browser-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tab_id: "browser-session-1",
              url: "http://localhost:3000/demo",
              cleaning_mode: "thorough",
              content: "<main>Demo</main>",
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (domSnapshotTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        tab_id: "browser-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tab_id: "browser-session-1",
              url: "http://localhost:3000/demo",
              schema_version: "autobyteus-browser-dom-snapshot-v1",
              total_candidates: 1,
              returned_elements: 1,
              truncated: false,
              elements: [
                {
                  element_id: "e1",
                  tag_name: "button",
                  dom_id: null,
                  css_selector: "button:nth-of-type(1)",
                  role: null,
                  name: null,
                  text: "Run",
                  href: null,
                  value: null,
                  bounding_box: { x: 10, y: 20, width: 100, height: 30 },
                },
              ],
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (executeJavascriptTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        tab_id: "browser-session-1",
        javascript: "JSON.stringify({ ready: true })",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tab_id: "browser-session-1",
              result_json: "{\"ready\":true}",
            },
            null,
            2,
          ),
        },
      ],
    });

    await expect(
      (closeTabTool!.handler as (input: unknown) => Promise<Record<string, unknown>>)({
        tab_id: "browser-session-1",
      }),
    ).resolves.toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tab_id: "browser-session-1",
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
