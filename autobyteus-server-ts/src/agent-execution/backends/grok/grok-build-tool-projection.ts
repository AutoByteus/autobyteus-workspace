import { normalizeAgentToolsMcpToolNameForEvent } from "../../../agent-tools/mcp/agent-tools-mcp-tool-name.js";
import { projectMcpToolResultForApplication } from "../../../agent-tools/mcp/mcp-effective-tool-result-projector.js";
import type { AcpToolCallProjection, AcpToolCallSnapshot } from "../acp/acp-agent-session-profile.js";

const GROK_TOOL_META_KEY = "x.ai/tool";

type Record_ = Record<string, unknown>;

const isRecord = (value: unknown): value is Record_ =>
  !!value && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

/** Stable Grok tool name from `_meta["x.ai/tool"].name`; the display `title` is never used. */
export const resolveGrokToolName = (snapshot: AcpToolCallSnapshot): string => {
  const tool = snapshot.meta && isRecord(snapshot.meta[GROK_TOOL_META_KEY]) ? snapshot.meta[GROK_TOOL_META_KEY] : null;
  return text(tool?.name)?.trim() ?? text(snapshot.kind)?.trim() ?? "unknown_tool";
};

/** Grok's structured tool input without its internal `variant` discriminator. */
const toolInput = (snapshot: AcpToolCallSnapshot): Record_ => {
  if (!isRecord(snapshot.rawInput)) return {};
  const { variant: _variant, ...input } = snapshot.rawInput;
  return input;
};

const contentText = (snapshot: AcpToolCallSnapshot): string | null => {
  const parts = snapshot.content.flatMap((entry) => {
    const block = isRecord(entry) && isRecord(entry.content) ? entry.content : null;
    return block?.type === "text" && typeof block.text === "string" && block.text ? [block.text] : [];
  });
  return parts.length > 0 ? parts.join("\n") : null;
};

const failureText = (snapshot: AcpToolCallSnapshot, output: Record_ | null): string =>
  text(output?.error) ?? text(output?.message) ?? text(output?.output_for_prompt) ?? contentText(snapshot) ?? "Tool execution failed.";

const terminal = (snapshot: AcpToolCallSnapshot): boolean =>
  snapshot.status === "completed" || snapshot.status === "failed";

const withOutcome = (
  snapshot: AcpToolCallSnapshot,
  base: Pick<AcpToolCallProjection, "toolName" | "segmentType" | "arguments">,
  outcome: () => { result: unknown } | { error: string },
): AcpToolCallProjection => (terminal(snapshot) ? { ...base, ...outcome() } : base);

const projectShell = (snapshot: AcpToolCallSnapshot): AcpToolCallProjection => {
  const input = toolInput(snapshot);
  const args = { command: text(input.command) ?? "", ...(text(input.cwd) ? { cwd: input.cwd } : {}) };
  return withOutcome(snapshot, { toolName: "run_bash", segmentType: "run_bash", arguments: args }, () => {
    const output = isRecord(snapshot.rawOutput) ? snapshot.rawOutput : null;
    const body = typeof output?.output_for_prompt === "string" ? output.output_for_prompt : contentText(snapshot) ?? "";
    const exitCode = typeof output?.exit_code === "number" ? output.exit_code : null;
    if (snapshot.status === "failed" || (exitCode !== null && exitCode !== 0)) {
      return { error: `${body}${body.endsWith("\n") || !body ? "" : "\n"}Exit code: ${exitCode ?? "unknown"}`.trim() };
    }
    return { result: body };
  });
};

const projectFileMutation = (snapshot: AcpToolCallSnapshot, toolName: "write_file" | "edit_file"): AcpToolCallProjection => {
  const input = toolInput(snapshot);
  const filePath = text(input.file_path) ?? text(input.path) ?? snapshot.locations[0]?.path ?? null;
  const args = { ...input, ...(filePath ? { file_path: filePath } : {}) };
  return withOutcome(snapshot, { toolName, segmentType: "tool_call", arguments: args }, () => {
    const output = isRecord(snapshot.rawOutput) ? snapshot.rawOutput : null;
    return snapshot.status === "failed" ? { error: failureText(snapshot, output) }
      : { result: contentText(snapshot) ?? output ?? { file_path: filePath } };
  });
};

/** `use_tool` indirection: shown and recorded under the invoked MCP tool's canonical name. */
const projectUseTool = (snapshot: AcpToolCallSnapshot): AcpToolCallProjection => {
  const input = toolInput(snapshot);
  const rawToolName = text(input.tool_name)?.trim() ?? "use_tool";
  const toolName = normalizeAgentToolsMcpToolNameForEvent(rawToolName) ?? rawToolName;
  const args = isRecord(input.tool_input) ? input.tool_input : {};
  return withOutcome(snapshot, { toolName, segmentType: "tool_call", arguments: args }, () => {
    const output = isRecord(snapshot.rawOutput) ? snapshot.rawOutput : null;
    if (snapshot.status === "failed") return { error: failureText(snapshot, output) };
    const body = isRecord(output?.output) ? output.output : output?.output;
    const okText = isRecord(body) ? text(body.OkayOutput) : text(body);
    if (!okText) {
      const errorText = isRecord(body) ? text(body.ErrorOutput) ?? text(body.Error) : null;
      return errorText ? { error: errorText } : { result: body ?? contentText(snapshot) };
    }
    const projection = projectMcpToolResultForApplication({ content: [{ type: "text", text: okText }] }, {
      kind: "mcp_tool_result", provider: "grok_build", evidence: "provider_mcp_wire_tool_name",
      rawToolName, canonicalToolName: toolName,
    });
    return projection.isError ? { error: projection.errorMessage ?? "MCP tool execution failed." } : { result: projection.result };
  });
};

const projectBuiltIn = (snapshot: AcpToolCallSnapshot, toolName: string): AcpToolCallProjection =>
  withOutcome(snapshot, { toolName, segmentType: "tool_call", arguments: toolInput(snapshot) }, () => {
    const output = isRecord(snapshot.rawOutput) ? snapshot.rawOutput : null;
    return snapshot.status === "failed" ? { error: failureText(snapshot, output) }
      : { result: contentText(snapshot) ?? snapshot.rawOutput ?? null };
  });

/** Maps Grok tool calls (standard ACP fields plus Grok tool `_meta`) to canonical AutoByteus tools. */
export const projectGrokToolCall = (snapshot: AcpToolCallSnapshot): AcpToolCallProjection => {
  const name = resolveGrokToolName(snapshot);
  switch (name) {
    case "run_terminal_command": return projectShell(snapshot);
    case "write": return projectFileMutation(snapshot, "write_file");
    case "search_replace": return projectFileMutation(snapshot, "edit_file");
    case "use_tool": return projectUseTool(snapshot);
    default: return projectBuiltIn(snapshot, name);
  }
};
