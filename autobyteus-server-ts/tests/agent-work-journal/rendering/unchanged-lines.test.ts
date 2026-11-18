import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RecordBuilder, render } from "../journal-record-fixtures.js";
import { RUNTIME_OF, SYNTHETIC_TRACES } from "../synthetic-run-traces.js";

/**
 * AC-007: a journal file with no converted entry is byte-identical to what revision 1 wrote. The golden
 * file holds revision 1's output for groups 1 and 2 of the synthetic traces (conversation records and every
 * built-in tool with its outcome variants), made from the base commit.
 */
const GOLDEN = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, "../../fixtures/agent-work-journal/unchanged-groups-before.json"), "utf8")) as Record<string, string>;

describe("lines this revision does not change", () => {
  for (const name of Object.keys(SYNTHETIC_TRACES)) {
    it(`${name}: conversation records and built-in tools render byte-identically`, () => {
      const builder = new RecordBuilder();
      const records: ReturnType<RecordBuilder["call"]>[] = [];
      for (const item of SYNTHETIC_TRACES[name]!) {
        if (item.group > 2) continue;
        if (item.kind === "tool") { const call = builder.call(item.tool, item.args); records.push(call, builder.result(call, item.result, item.error)); }
        else if (item.kind === "call_only") records.push(builder.call(item.tool, item.args));
        else if (item.kind === "result_only") records.push(builder.record("tool_result", { toolName: item.tool, toolCallId: "orphan_call", toolResult: item.result, toolError: null }));
        else records.push(builder.record(item.type, { content: item.text }));
      }
      expect(render(RUNTIME_OF[name]!, records).markdown).toBe(GOLDEN[name]);
    });
  }
});
