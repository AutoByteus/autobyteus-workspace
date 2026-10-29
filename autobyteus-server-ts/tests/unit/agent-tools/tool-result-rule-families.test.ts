import { afterEach, describe, expect, it, vi } from "vitest";
import * as browserServices from "../../../src/agent-tools/browser/browser-tool-service.js";
import type { BrowserToolService } from "../../../src/agent-tools/browser/browser-tool-service.js";
import { openTab } from "../../../src/agent-tools/browser/open-tab.js";
import { listTabs } from "../../../src/agent-tools/browser/list-tabs.js";
import { BrowserToolsMcpAdapterProvider } from "../../../src/agent-tools/mcp/providers/browser-tools-mcp-adapter-provider.js";
import { MediaToolsMcpAdapterProvider } from "../../../src/agent-tools/mcp/providers/media-tools-mcp-adapter-provider.js";
import * as mediaServices from "../../../src/agent-tools/media/media-generation-service.js";
import type { MediaGenerationService } from "../../../src/agent-tools/media/media-generation-service.js";
import { buildMediaToolDefinition } from "../../../src/agent-tools/media/media-autobyteus-tools.js";
import { getMediaToolManifestEntry } from "../../../src/agent-tools/media/media-tool-manifest.js";
import { agentDiscoveryToolText } from "../../../src/agent-tools/agent-discovery/agent-discovery-refusal.js";
import { toAgentDiscoveryMcpResult } from "../../../src/agent-tools/mcp/providers/agent-discovery-mcp-result.js";
import { toAgentToolsMcpStructuredJsonResult } from "../../../src/agent-tools/mcp/agent-tools-mcp-structured-json-result.js";
import { serializeSendMessageToResult, sendMessageToRejection } from "../../../src/agent-communication/services/send-message-to-tool-result-contract.js";

/**
 * autobyteus-260 AC-001: each platform tool family applies the one result rule on both routes: a field with no value
 * (`null`, `""`, `[]`, `{}`) is absent, `false` and `0` stay, refusals keep `code` and `message`, and the JSON is compact.
 * The Project Task family is covered in `project-tasks/project-task-list-entries-tools.test.ts`; `send_message_to`,
 * `get_handoff_rules` and `delegate_task` in `team-communication/`.
 */
const compact = (text: string) => {
  expect(text).not.toMatch(/\n/);
  expect(text).not.toMatch(/null|\[\]|""|:\{\}/);
  return JSON.parse(text);
};

afterEach(() => vi.restoreAllMocks());

describe("browser tools", () => {
  const service = {
    isBrowserSupported: () => true,
    openTab: vi.fn(async () => ({ tab_id: "t1", status: "opened", url: "https://example.com", title: null })),
    listTabs: vi.fn(async () => ({ tabs: [] })),
  } as unknown as BrowserToolService;

  it("native: leaves out a null title and an empty tab list, compact", async () => {
    vi.spyOn(browserServices, "getBrowserToolService").mockReturnValue(service);
    expect(compact(await openTab({ agentId: "a" }, "https://example.com"))).toEqual({ tab_id: "t1", status: "opened", url: "https://example.com" });
    expect(await listTabs({ agentId: "a" })).toBe("{}");
  });

  it("MCP: the same text; a refusal keeps code and message", async () => {
    const adapter = new BrowserToolsMcpAdapterProvider(service).getAdapters().find((a) => a.definition.name === "open_tab")!;
    const result = await adapter.execute({ session: {} as never, rawArguments: { url: "https://example.com" } });
    expect(result).toMatchObject({ kind: "operation_result", result: { accepted: true } });
    if (result.kind !== "operation_result") throw new Error("Expected an operation result.");
    expect(compact(result.result.message!)).toEqual({ tab_id: "t1", status: "opened", url: "https://example.com" });
    vi.mocked(service.openTab).mockRejectedValueOnce(new Error("bridge down"));
    const refused = await adapter.execute({ session: {} as never, rawArguments: { url: "https://example.com" } });
    if (refused.kind !== "operation_result") throw new Error("Expected an operation result.");
    expect(refused.result.message).toBe('{"error":{"code":"browser_bridge_unavailable","message":"bridge down"}}');
  });
});

describe("media tools", () => {
  const service = { generateImage: vi.fn(async () => ({ file_path: "/tmp/out.png" })) } as unknown as MediaGenerationService;

  it("native returns compact text; MCP returns the same text", async () => {
    vi.spyOn(mediaServices, "getMediaGenerationService").mockReturnValue(service);
    const entry = getMediaToolManifestEntry("generate_image");
    const nativeTool = buildMediaToolDefinition(entry).customFactory!();
    const args = { prompt: "a cat", output_file_path: "/tmp/out.png" };
    const native = await nativeTool.execute({ agentId: "a" } as never, args);
    expect(native).toBe('{"file_path":"/tmp/out.png"}');
    const adapter = new MediaToolsMcpAdapterProvider(service).getAdapters().find((a) => a.definition.name === "generate_image")!;
    const result = await adapter.execute({ rawArguments: args, session: { sender: { senderRunId: "a" }, owner: { runId: "r" }, executionContext: {} } as never });
    if (result.kind !== "operation_result") throw new Error("Expected an operation result.");
    expect(result.result.message).toBe(native);
  });
});

describe("agent discovery tools", () => {
  it("native and MCP: empty fields left out, false and 0 kept; a refusal stays plain text", () => {
    const outcome = { agents: [{ address: "/a", description: "", local: false, depth: 0, tags: [] }] };
    expect(agentDiscoveryToolText(outcome)).toBe('{"agents":[{"address":"/a","local":false,"depth":0}]}');
    expect(toAgentDiscoveryMcpResult(outcome).result).toEqual({
      content: [{ type: "text", text: '{"agents":[{"address":"/a","local":false,"depth":0}]}' }],
      structuredContent: { agents: [{ address: "/a", local: false, depth: 0 }] },
    });
    const refusal = { accepted: false as const, code: "REMOTE_COLLABORATION_OFF", message: "Remote collaboration is off." };
    expect(() => agentDiscoveryToolText(refusal)).toThrow("Remote collaboration is off.");
    expect(toAgentDiscoveryMcpResult(refusal).result).toEqual({ content: [{ type: "text", text: "Remote collaboration is off." }], isError: true });
  });
});

describe("MCP structured result helper", () => {
  it("builds both copies from one pruned value and refuses a non-object result", () => {
    expect(toAgentToolsMcpStructuredJsonResult({ ok: true, none: null, list: [], nested: { empty: "" } }, { isError: true })).toEqual({
      content: [{ type: "text", text: '{"ok":true}' }], structuredContent: { ok: true }, isError: true,
    });
    expect(() => toAgentToolsMcpStructuredJsonResult([1, 2])).toThrow("must contain a JSON object");
  });
});

describe("send_message_to", () => {
  it("a refusal has no receiver field", () => {
    expect(serializeSendMessageToResult(sendMessageToRejection("TARGET_NOT_FOUND", "Missing.")))
      .toBe('{"accepted":false,"code":"TARGET_NOT_FOUND","message":"Missing."}');
  });
});
