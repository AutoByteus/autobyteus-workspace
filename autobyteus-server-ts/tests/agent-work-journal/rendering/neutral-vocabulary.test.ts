import { describe, expect, it } from "vitest";
import { RecordBuilder, render } from "../journal-record-fixtures.js";
import { RUNTIME_OF, SYNTHETIC_TRACES, type TraceCase } from "../synthetic-run-traces.js";

/**
 * AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-012: one complete synthetic trace per runtime
 * (the contract's section 11) is rendered with the real renderer. A case with an `expected` line must
 * give exactly that line; the neutrality check reads the whole rendering.
 */

type Rendered = Readonly<{ markdown: string; entryByCase: ReadonlyMap<number, readonly string[]> }>;

const LINK = / \[↗\]\([^)]*\)$/;
const TIME = /^\[\d\d:\d\d:\d\d\] /;
const INDENT = " ".repeat(11);

const splitEntries = (markdown: string): Map<string, string[]> => {
  const entries = new Map<string, string[]>();
  let current: string[] = [];
  for (const line of markdown.split("\n").slice(4).filter((text) => text.length > 0)) {
    if (TIME.test(line) && current.length) {
      entries.set(/#(rt_\d+)\)$/.exec(current[current.length - 1]!)?.[1] ?? "", current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) entries.set(/#(rt_\d+)\)$/.exec(current[current.length - 1]!)?.[1] ?? "", current);
  return entries;
};

const renderRuntime = (name: string): Rendered => {
  const builder = new RecordBuilder();
  const records: ReturnType<RecordBuilder["call"]>[] = [];
  const firstIds: string[] = [];
  for (const item of SYNTHETIC_TRACES[name]!) {
    let made: ReturnType<RecordBuilder["call"]>[];
    if (item.kind === "tool") { const call = builder.call(item.tool, item.args); made = [call, builder.result(call, item.result, item.error)]; }
    else if (item.kind === "call_only") made = [builder.call(item.tool, item.args)];
    else if (item.kind === "result_only") made = [builder.record("tool_result", { toolName: item.tool, toolCallId: "orphan_call", toolResult: item.result, toolError: null })];
    else made = [builder.record(item.type, { content: item.text })];
    records.push(...made);
    firstIds.push(made[0]!.id!);
  }
  const markdown = render(RUNTIME_OF[name]!, records).markdown;
  const byId = splitEntries(markdown);
  return { markdown, entryByCase: new Map(firstIds.map((id, index) => [index, byId.get(id) ?? []])) };
};

/** An entry as the contract prints it: the head with its outcome, and the lines below it. */
const headAndBody = (entry: readonly string[]): { head: string; body: string[] } => {
  const lines = entry.map((line, index) => index === entry.length - 1 ? line.replace(LINK, "") : line);
  return { head: lines[0]!.replace(TIME, ""), body: lines.slice(1).map((line) => line.startsWith(INDENT) ? line.slice(INDENT.length) : line) };
};

const identifierLike = (name: string): boolean => name.includes("_") || /[a-z][A-Z]/.test(name);

for (const name of Object.keys(SYNTHETIC_TRACES)) {
  describe(`neutral vocabulary: ${name}`, () => {
    const cases = SYNTHETIC_TRACES[name]!;
    const rendered = renderRuntime(name);
    const toolCases = cases.map((item, index) => ({ item, index })).filter(
      (entry): entry is { item: Extract<TraceCase, { kind: "tool" }>; index: number } => entry.item.kind === "tool");

    it("has converted cases to check", () => {
      expect(toolCases.filter(({ item }) => item.expected).length).toBeGreaterThanOrEqual(name === "grok" ? 28 : 30);
    });

    it("gives every converted case the expected neutral line (AC-001…006)", () => {
      for (const { item, index } of toolCases) {
        if (!item.expected) continue;
        const entry = rendered.entryByCase.get(index)!;
        expect(headAndBody(entry), `${name}: ${item.tool} ${JSON.stringify(item.args).slice(0, 60)}`)
          .toEqual({ head: item.expected.head, body: [...item.expected.body] });
      }
    });

    it("names no converted tool by its recorded name in a converted line (AC-012)", () => {
      for (const { item, index } of toolCases) {
        if (!item.expected) continue;
        const { head } = headAndBody(rendered.entryByCase.get(index)!);
        const inner = item.tool === "call_mcp_tool" ? String(item.args.ToolName) : item.tool;
        if (identifierLike(inner)) expect(head, `${name}: ${inner}`).not.toContain(inner);
        // The generic rule's `Tool:` line stays only for a server-qualified tool, which names its server.
        if (head.startsWith("Tool: ")) expect(head).toContain("(via ");
      }
    });
  });
}
