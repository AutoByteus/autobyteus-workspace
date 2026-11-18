import { describe, expect, it } from "vitest";
import { toolCallLine } from "../../../src/agent-work-journal/rendering/tool-call-line.js";
import { getRuntimeTranslation, type BuiltInConverter, type RuntimeTranslation } from "../../../src/agent-work-journal/rendering/runtimes/runtime-translation.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { OK } from "../../../src/agent-work-journal/rendering/tool-outcome.js";

/** DS-003: the order of the lookup chain is the contract (AC-001, AC-002, AC-006). */
describe("toolCallLine", () => {
  const base = getRuntimeTranslation(null);
  const own: BuiltInConverter = () => ({ head: "Own line", outcome: OK, parts: [] });
  const translation = (patch: Partial<RuntimeTranslation>): RuntimeTranslation => ({ ...base, ...patch });
  const done = { value: "x", error: null };

  it("a runtime's own table wins over the platform table", () => {
    const t = translation({ builtInTools: new Map([["send_message_to", own]]) });
    expect(toolCallLine(t, { name: "send_message_to", args: { recipient_address: "/a", content: "hi" } }, done).head).toBe("Own line");
  });

  it("a platform name that no table of the runtime holds gets the platform line, on every runtime and without a runtime", () => {
    for (const kind of [...Object.values(RuntimeKind), null]) {
      expect(toolCallLine(getRuntimeTranslation(kind), { name: "list_projects", args: {} }, done).head, String(kind)).toBe("List projects");
    }
  });

  it("an unknown name uses the generic rule", () => {
    expect(toolCallLine(base, { name: "ssh_session_exec", args: { host: "h" } }, done).head).toBe("Tool: ssh_session_exec host=\"h\"");
  });

  it("a qualified name never reaches a table: it is the generic line with its server, even when the tool is a platform tool's name", () => {
    const t = translation({
      builtInTools: new Map([["list_projects", own]]),
      splitToolName: (name) => name.startsWith("acme.") ? { server: "acme", tool: name.slice(5) } : null,
    });
    expect(toolCallLine(t, { name: "acme.list_projects", args: { q: 1 } }, done).head).toBe("Tool: list_projects (via acme) q=1");
    expect(toolCallLine(t, { name: "list_projects", args: {} }, done).head).toBe("Own line");
  });

  it("unwraps the runtime's wrapper first, then looks the inner name up", () => {
    const agy = getRuntimeTranslation(RuntimeKind.ANTIGRAVITY_CLI);
    const line = toolCallLine(agy, { name: "call_mcp_tool", args: { ServerName: "s", ToolName: "list_peer_nodes", Arguments: {} } },
      { value: { provider_state: "DONE", output: "[]" }, error: null });
    expect(line.head).toBe("List peer nodes");
    expect(line.parts).toEqual([{ kind: "output", text: "[]" }]);
  });

  it("Codex and Antigravity split their qualified names; the others do not qualify", () => {
    const codex = getRuntimeTranslation(RuntimeKind.CODEX_APP_SERVER);
    const agy = getRuntimeTranslation(RuntimeKind.ANTIGRAVITY_CLI);
    expect(codex.splitToolName?.("plugin_management.search_plugins")).toEqual({ server: "plugin_management", tool: "search_plugins" });
    expect(codex.splitToolName?.("run_bash")).toBeNull();
    expect(agy.splitToolName?.("mcp__acme_prices__lookup_price")).toEqual({ server: "acme_prices", tool: "lookup_price" });
    expect(agy.splitToolName?.("run_command")).toBeNull();
    for (const kind of [RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.GROK_BUILD, RuntimeKind.AUTOBYTEUS]) {
      expect(getRuntimeTranslation(kind).splitToolName).toBeUndefined();
    }
  });

  it("a call without a result still has its line", () => {
    expect(toolCallLine(base, { name: "list_projects", args: {} }, null)).toMatchObject({ head: "List projects", outcome: { kind: "no_result" } });
  });
});
