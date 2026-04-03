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
import { buildBrowserDynamicToolRegistrations } from "../../../../../../src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.js";

describe("buildBrowserDynamicToolRegistrations", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when the browser bridge is not configured", () => {
    expect(buildBrowserDynamicToolRegistrations()).toBeNull();
  });

  it("builds browser tool handlers and returns Codex text results", async () => {
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

    const registrations = buildBrowserDynamicToolRegistrations();
    expect(registrations).not.toBeNull();
    expect(registrations).toHaveLength(8);

    const openTabRegistration = registrations!.find(
      (registration) => registration.spec.name === OPEN_TAB_TOOL_NAME,
    );
    expect(openTabRegistration).toBeDefined();

    const result = await openTabRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-1",
      toolName: OPEN_TAB_TOOL_NAME,
      arguments: {
        url: "http://localhost:3000/demo",
      },
    });

    expect(result.success).toBe(true);
    expect(result.contentItems).toHaveLength(1);
    expect(JSON.parse(result.contentItems[0]!.text)).toEqual({
      tab_id: "browser-session-1",
      status: "opened",
      url: "http://localhost:3000/demo",
      title: "Demo",
    });

    const navigateToRegistration = registrations!.find(
      (registration) => registration.spec.name === NAVIGATE_TO_TOOL_NAME,
    );
    const screenshotRegistration = registrations!.find(
      (registration) => registration.spec.name === SCREENSHOT_TOOL_NAME,
    );
    const listSessionsRegistration = registrations!.find(
      (registration) => registration.spec.name === LIST_TABS_TOOL_NAME,
    );
    const readPageRegistration = registrations!.find(
      (registration) => registration.spec.name === READ_PAGE_TOOL_NAME,
    );
    const executeJavascriptRegistration = registrations!.find(
      (registration) => registration.spec.name === RUN_SCRIPT_TOOL_NAME,
    );
    const domSnapshotRegistration = registrations!.find(
      (registration) => registration.spec.name === DOM_SNAPSHOT_TOOL_NAME,
    );
    const closeTabRegistration = registrations!.find(
      (registration) => registration.spec.name === CLOSE_TAB_TOOL_NAME,
    );

    const navigateResult = await navigateToRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-2",
      toolName: NAVIGATE_TO_TOOL_NAME,
      arguments: {
        tab_id: "browser-session-1",
        url: "http://localhost:3000/other",
      },
    });
    expect(JSON.parse(navigateResult.contentItems[0]!.text)).toEqual({
      tab_id: "browser-session-1",
      status: "navigated",
      url: "http://localhost:3000/other",
    });

    const screenshotResult = await screenshotRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-3",
      toolName: SCREENSHOT_TOOL_NAME,
      arguments: {
        tab_id: "browser-session-1",
      },
    });
    expect(JSON.parse(screenshotResult.contentItems[0]!.text)).toEqual({
      tab_id: "browser-session-1",
      artifact_path: "/tmp/browser-session-1.png",
      mime_type: "image/png",
    });

    const listSessionsResult = await listSessionsRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-4",
      toolName: LIST_TABS_TOOL_NAME,
      arguments: {},
    });
    expect(JSON.parse(listSessionsResult.contentItems[0]!.text)).toEqual({
      sessions: [
        {
          tab_id: "browser-session-1",
          title: "Demo",
          url: "http://localhost:3000/demo",
        },
      ],
    });

    const readPageResult = await readPageRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-5",
      toolName: READ_PAGE_TOOL_NAME,
      arguments: {
        tab_id: "browser-session-1",
      },
    });
    expect(JSON.parse(readPageResult.contentItems[0]!.text)).toEqual({
      tab_id: "browser-session-1",
      url: "http://localhost:3000/demo",
      cleaning_mode: "thorough",
      content: "<main>Demo</main>",
    });

    const domSnapshotResult = await domSnapshotRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-6",
      toolName: DOM_SNAPSHOT_TOOL_NAME,
      arguments: {
        tab_id: "browser-session-1",
      },
    });
    expect(JSON.parse(domSnapshotResult.contentItems[0]!.text)).toEqual({
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
    });

    const executeJavascriptResult = await executeJavascriptRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-7",
      toolName: RUN_SCRIPT_TOOL_NAME,
      arguments: {
        tab_id: "browser-session-1",
        javascript: "JSON.stringify({ ready: true })",
      },
    });
    expect(JSON.parse(executeJavascriptResult.contentItems[0]!.text)).toEqual({
      tab_id: "browser-session-1",
      result_json: "{\"ready\":true}",
    });

    const closeResult = await closeTabRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-8",
      toolName: CLOSE_TAB_TOOL_NAME,
      arguments: {
        tab_id: "browser-session-1",
      },
    });
    expect(JSON.parse(closeResult.contentItems[0]!.text)).toEqual({
      tab_id: "browser-session-1",
      status: "closed",
    });
  });
});
