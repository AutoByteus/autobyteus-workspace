import { describe, expect, it } from "vitest";
import {
  projectMcpToolResultForApplication,
  type McpEffectiveResultSource,
} from "../../../../src/agent-tools/mcp/mcp-effective-tool-result-projector.js";
import {
  hasExplicitProviderMcpMarker,
  isMcpWireToolName,
} from "../../../../src/agent-tools/mcp/mcp-tool-source.js";

const source: McpEffectiveResultSource = {
  kind: "mcp_tool_result",
  provider: "codex",
  evidence: "provider_mcp_wire_tool_name",
  rawToolName: "mcp__example_server__example_tool",
  canonicalToolName: "mcp__example_server__example_tool",
};

describe("MCP tool source helpers", () => {
  it("detects general MCP wire tool names", () => {
    expect(isMcpWireToolName("mcp__example_server__example-tool_1")).toBe(true);
    expect(isMcpWireToolName("example_server__example_tool")).toBe(false);
    expect(isMcpWireToolName("mcp__example_server")).toBe(false);
  });

  it("detects explicit provider MCP markers", () => {
    expect(hasExplicitProviderMcpMarker({ isMcpTool: true })).toBe(true);
    expect(hasExplicitProviderMcpMarker({ result_source: "mcp_tool_result" })).toBe(true);
    expect(hasExplicitProviderMcpMarker({ metadata: { toolSource: "mcp" } })).toBe(true);
    expect(hasExplicitProviderMcpMarker({ source: "mcp" })).toBe(false);
  });
});

describe("projectMcpToolResultForApplication", () => {
  it("returns unmatched for malformed MCP envelopes", () => {
    const rawResult = { structuredContent: { ok: true }, _meta: { hidden: true } };

    expect(projectMcpToolResultForApplication(rawResult, source)).toEqual({
      matched: false,
      result: rawResult,
      isError: false,
      errorMessage: null,
    });
  });

  it("prefers non-null structuredContent", () => {
    const structuredContent = { answer: 42 };

    const projection = projectMcpToolResultForApplication({
      structuredContent,
      content: [{ type: "text", text: "fallback" }],
      _meta: { hidden: true },
    }, source);

    expect(projection).toMatchObject({
      matched: true,
      result: structuredContent,
      isError: false,
      errorMessage: null,
    });
  });

  it("parses one JSON text block", () => {
    const projection = projectMcpToolResultForApplication({
      content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
      structuredContent: null,
    }, source);

    expect(projection.result).toEqual({ ok: true });
  });

  it("returns one plain text block as text", () => {
    const projection = projectMcpToolResultForApplication({
      content: [{ type: "text", text: "completed" }],
      structuredContent: null,
    }, source);

    expect(projection.result).toBe("completed");
  });

  it("joins multiple text blocks without parsing", () => {
    const projection = projectMcpToolResultForApplication({
      content: [
        { type: "text", text: "{\"first\":true}" },
        { type: "text", text: "second" },
      ],
    }, source);

    expect(projection.result).toBe('{"first":true}\n\nsecond');
  });

  it("projects mixed rich content to sanitized ordered items", () => {
    const projection = projectMcpToolResultForApplication({
      content: [
        { type: "text", text: "see image", _meta: { hidden: true } },
        {
          type: "image",
          data: "abc123",
          mimeType: "image/png",
          _meta: { hidden: true },
          nested: { keep: true, _meta: { hidden: true } },
        },
      ],
      _meta: { hidden: true },
    }, source);

    expect(projection.result).toEqual({
      items: [
        { type: "text", text: "see image" },
        {
          type: "image",
          data: "abc123",
          mimeType: "image/png",
          nested: { keep: true },
        },
      ],
    });
  });

  it("projects empty content to null", () => {
    const projection = projectMcpToolResultForApplication({
      content: [],
      structuredContent: null,
    }, source);

    expect(projection.result).toBeNull();
  });

  it("extracts deterministic error messages for MCP isError envelopes", () => {
    const projection = projectMcpToolResultForApplication({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: { message: "bad input" } }),
        },
      ],
    }, source);

    expect(projection).toMatchObject({
      matched: true,
      result: { error: { message: "bad input" } },
      isError: true,
      errorMessage: "bad input",
    });
  });
});
