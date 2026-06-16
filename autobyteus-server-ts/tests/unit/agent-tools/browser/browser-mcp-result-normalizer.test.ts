import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeBrowserMcpToolResult } from "../../../../src/agent-tools/browser/browser-mcp-result-normalizer.js";

describe("normalizeBrowserMcpToolResult", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps direct known-browser result objects canonical", () => {
    const result = {
      tab_id: "tab-direct",
      status: "opened",
      url: "https://example.com/",
      title: "Example",
    };

    expect(normalizeBrowserMcpToolResult("open_tab", result)).toEqual(result);
  });

  it("parses known-browser JSON string results", () => {
    expect(
      normalizeBrowserMcpToolResult(
        "open_tab",
        JSON.stringify({
          tab_id: "tab-string",
          status: "opened",
          url: "https://example.com/",
          title: null,
        }),
      ),
    ).toEqual({
      tab_id: "tab-string",
      status: "opened",
      url: "https://example.com/",
      title: null,
    });
  });

  it("unwraps known-browser MCP content text envelopes", () => {
    expect(
      normalizeBrowserMcpToolResult("open_tab", {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              tab_id: "tab-envelope",
              status: "reused",
              url: "https://example.com/",
              title: "Example",
            }),
          },
        ],
        structuredContent: null,
        _meta: null,
      }),
    ).toEqual({
      tab_id: "tab-envelope",
      status: "reused",
      url: "https://example.com/",
      title: "Example",
    });
  });

  it("unwraps nested MCP content envelopes", () => {
    expect(
      normalizeBrowserMcpToolResult(
        "open_tab",
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                tab_id: "tab-nested",
                status: "opened",
              }),
            },
          ],
        }),
      ),
    ).toEqual({
      tab_id: "tab-nested",
      status: "opened",
    });
  });

  it("prefers structuredContent when a known-browser MCP envelope provides it", () => {
    expect(
      normalizeBrowserMcpToolResult("open_tab", {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              tab_id: "tab-content",
              status: "opened",
            }),
          },
        ],
        structuredContent: {
          tab_id: "tab-structured",
          status: "opened",
        },
      }),
    ).toEqual({
      tab_id: "tab-structured",
      status: "opened",
    });
  });

  it("leaves unknown non-browser MCP results raw", () => {
    const result = {
      content: [
        {
          type: "text",
          text: JSON.stringify({ tab_id: "not-browser" }),
        },
      ],
    };

    expect(normalizeBrowserMcpToolResult("send_message_to", result)).toBe(result);
  });

  it("logs a diagnostic when a tab-scoped browser result lacks tab_id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const normalized = normalizeBrowserMcpToolResult("open_tab", {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "opened",
            url: "https://example.com/",
          }),
        },
      ],
    });

    expect(normalized).toEqual({
      status: "opened",
      url: "https://example.com/",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("without tab_id"),
    );
  });
});
