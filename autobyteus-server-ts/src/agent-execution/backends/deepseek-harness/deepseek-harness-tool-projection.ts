import {
  isAgentToolsMcpProviderToolName,
  normalizeAgentToolsMcpToolNameForEvent,
} from "../../../agent-tools/mcp/agent-tools-mcp-tool-name.js";
import { projectMcpToolResultForApplication } from "../../../agent-tools/mcp/mcp-effective-tool-result-projector.js";
import type { AcpToolCallProjection, AcpToolCallSnapshot } from "../acp/acp-agent-session-profile.js";

type Record_ = Record<string, unknown>;

const isRecord = (value: unknown): value is Record_ =>
  !!value && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

/** dsh names a tool call by its tool name in `title` (RT-003); there is no other name. */
export const resolveDeepSeekHarnessToolName = (snapshot: AcpToolCallSnapshot): string =>
  text(snapshot.title)?.trim() ?? text(snapshot.kind)?.trim() ?? "unknown_tool";

const toolInput = (snapshot: AcpToolCallSnapshot): Record_ => (isRecord(snapshot.rawInput) ? snapshot.rawInput : {});

const contentText = (snapshot: AcpToolCallSnapshot): string | null => {
  const parts = snapshot.content.flatMap((entry) => {
    const block = isRecord(entry) && isRecord(entry.content) ? entry.content : null;
    return block?.type === "text" && typeof block.text === "string" && block.text ? [block.text] : [];
  });
  return parts.length > 0 ? parts.join("\n") : null;
};

const terminal = (snapshot: AcpToolCallSnapshot): boolean =>
  snapshot.status === "completed" || snapshot.status === "failed";

const withOutcome = (
  snapshot: AcpToolCallSnapshot,
  base: Pick<AcpToolCallProjection, "toolName" | "segmentType" | "arguments">,
  outcome: () => { result: unknown } | { error: string },
): AcpToolCallProjection => (terminal(snapshot) ? { ...base, ...outcome() } : base);

/** dsh's shell result: the body and the exit code of its `[exit code: N]` marker (no marker: exit 0). */
const shellExit = (output: string): Readonly<{ body: string; exitCode: number }> => {
  const exit = /\n?\[exit code: (\d+)\]$/.exec(output);
  return exit ? { body: output.slice(0, exit.index), exitCode: Number(exit[1]) } : { body: output, exitCode: 0 };
};

const projectShell = (snapshot: AcpToolCallSnapshot): AcpToolCallProjection => {
  const input = toolInput(snapshot);
  const args = { command: text(input.command) ?? "", ...(text(input.cwd) ? { cwd: input.cwd } : {}) };
  return withOutcome(snapshot, { toolName: "run_bash", segmentType: "run_bash", arguments: args }, () => {
    const { body, exitCode } = shellExit(contentText(snapshot) ?? "");
    if (snapshot.status === "failed" || exitCode !== 0) {
      return { error: `${body}${body.endsWith("\n") || !body ? "" : "\n"}Exit code: ${snapshot.status === "failed" && exitCode === 0 ? "unknown" : exitCode}`.trim() };
    }
    return { result: body };
  });
};

const projectFileMutation = (snapshot: AcpToolCallSnapshot, toolName: "write_file" | "edit_file"): AcpToolCallProjection => {
  const input = toolInput(snapshot);
  const filePath = text(input.file_path) ?? text(input.path) ?? snapshot.locations[0]?.path ?? null;
  const args = { ...input, ...(filePath ? { file_path: filePath } : {}) };
  return withOutcome(snapshot, { toolName, segmentType: "tool_call", arguments: args }, () =>
    snapshot.status === "failed"
      ? { error: contentText(snapshot) ?? "Tool execution failed." }
      : { result: contentText(snapshot) ?? { file_path: filePath } });
};

/** An Agent Tools call (`mcp__autobyteus_agent_tools__<tool>`): shown and recorded under its AutoByteus name. */
const projectAgentTool = (snapshot: AcpToolCallSnapshot, rawToolName: string): AcpToolCallProjection => {
  const toolName = normalizeAgentToolsMcpToolNameForEvent(rawToolName) ?? rawToolName;
  return withOutcome(snapshot, { toolName, segmentType: "tool_call", arguments: toolInput(snapshot) }, () => {
    const output = contentText(snapshot);
    if (snapshot.status === "failed") return { error: output ?? "MCP tool execution failed." };
    const projection = projectMcpToolResultForApplication({ content: [{ type: "text", text: output ?? "" }] }, {
      kind: "mcp_tool_result", provider: "deepseek_harness", evidence: "provider_mcp_wire_tool_name",
      rawToolName, canonicalToolName: toolName,
    });
    return projection.isError ? { error: projection.errorMessage ?? "MCP tool execution failed." } : { result: projection.result };
  });
};

const projectBuiltIn = (snapshot: AcpToolCallSnapshot, toolName: string): AcpToolCallProjection =>
  withOutcome(snapshot, { toolName, segmentType: "tool_call", arguments: toolInput(snapshot) }, () =>
    snapshot.status === "failed"
      ? { error: contentText(snapshot) ?? "Tool execution failed." }
      : { result: contentText(snapshot) ?? snapshot.rawOutput ?? null });

/** Maps dsh tool calls (standard ACP fields only) to canonical AutoByteus tools. */
export const projectDeepSeekHarnessToolCall = (snapshot: AcpToolCallSnapshot): AcpToolCallProjection => {
  const name = resolveDeepSeekHarnessToolName(snapshot);
  if (isAgentToolsMcpProviderToolName(name)) return projectAgentTool(snapshot, name);
  switch (name) {
    case "bash": return projectShell(snapshot);
    case "write": return projectFileMutation(snapshot, "write_file");
    case "edit":
    case "apply_patch": return projectFileMutation(snapshot, "edit_file");
    default: return projectBuiltIn(snapshot, name);
  }
};
