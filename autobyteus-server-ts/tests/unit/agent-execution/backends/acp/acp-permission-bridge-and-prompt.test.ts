import { describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { AcpPermissionBridge } from "../../../../../src/agent-execution/backends/acp/session/acp-permission-bridge.js";
import { buildAcpPromptBlocks } from "../../../../../src/agent-execution/backends/acp/input/acp-prompt-builder.js";

const OPTIONS = [
  { optionId: "always-allow", name: "Always", kind: "allow_always" },
  { optionId: "allow-once", name: "Once", kind: "allow_once" },
  { optionId: "reject-once", name: "No", kind: "reject_once" },
  { optionId: "reject-always", name: "Never", kind: "reject_always" },
] as const;

describe("AcpPermissionBridge", () => {
  it("answers with one-shot options only and never an always grant", async () => {
    const bridge = new AcpPermissionBridge();
    const approved = bridge.pend("a", OPTIONS);
    const denied = bridge.pend("b", OPTIONS);
    expect(bridge.decide("a", true)).toEqual({ kind: "answered", outcome: "allowed" });
    expect(bridge.decide("b", false)).toEqual({ kind: "answered", outcome: "rejected" });
    expect(await approved).toEqual({ outcome: { outcome: "selected", optionId: "allow-once" } });
    expect(await denied).toEqual({ outcome: { outcome: "selected", optionId: "reject-once" } });
    expect(bridge.decide("a", true)).toEqual({ kind: "not_pending" });
  });

  it("refuses an approval the agent offered no one-time option for, and cancels on interrupt", async () => {
    const bridge = new AcpPermissionBridge();
    const pending = bridge.pend("a", [OPTIONS[0], OPTIONS[3]]);
    expect(bridge.decide("a", true)).toEqual({ kind: "option_unavailable" });
    expect(bridge.cancelAll()).toEqual(["a"]);
    expect(await pending).toEqual({ outcome: { outcome: "cancelled" } });
  });

  it("reports a denial without a reject-once option as cancelled, never as a user rejection", async () => {
    const bridge = new AcpPermissionBridge();
    const pending = bridge.pend("a", [OPTIONS[0], OPTIONS[3]]);
    expect(bridge.decide("a", false)).toEqual({ kind: "answered", outcome: "cancelled" });
    expect(await pending).toEqual({ outcome: { outcome: "cancelled" } });
  });
});

describe("buildAcpPromptBlocks (AC-007)", () => {
  it("lists local text and image files as absolute paths and sends no image blocks or remote URLs", () => {
    const message = new AgentInputUserMessage("Summarize these", undefined, [
      new ContextFile("/work/notes.md", ContextFileType.MARKDOWN),
      new ContextFile("/work/diagram.png", ContextFileType.IMAGE),
      new ContextFile("https://example.com/remote.png", ContextFileType.IMAGE),
      new ContextFile("data:image/png;base64,AAAA", ContextFileType.IMAGE),
    ]);
    const blocks = buildAcpPromptBlocks(message);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "text", text: "Summarize these\n\nReference files:\n- /work/notes.md\n- /work/diagram.png" });
  });

  it("rejects an empty message", () => {
    expect(() => buildAcpPromptBlocks(new AgentInputUserMessage("  "))).toThrow("ACP_PROMPT_EMPTY");
  });
});
