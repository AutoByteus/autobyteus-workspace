import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { createSessionHarness, fixturePath, waitFor, type SessionHarness } from "./acp-fake-agent-harness.js";

const harnesses: SessionHarness[] = [];
afterEach(async () => {
  for (const harness of harnesses.splice(0)) {
    harness.session.close();
    await harness.connection.close();
  }
});

/** Server receipt times in call order: prompt send, call 1 usage, tool finished, call 2 usage. */
const scriptedClock = (times: number[]) => () => {
  const next = times.shift();
  if (next === undefined) throw new Error("unexpected clock read");
  return next;
};

const runRecordedTurn = async (fixture: string, times: number[]) => {
  const harness = createSessionHarness({ fixture: fixturePath(fixture), autoExecuteTools: true, now: scriptedClock(times) });
  harnesses.push(harness);
  await harness.connection.initialize();
  await harness.session.openNew({ cwd: os.tmpdir(), mcpServers: [], _meta: { rules: "rules", yoloMode: false } });
  harness.events.push(...harness.session.startTurn("turn-1", [{ type: "text", text: "go" }]));
  await waitFor(() => harness.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
  return harness.events.filter((event) => event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED).map((event) => event.payload);
};

describe("ACP/Grok per-call TPS (DEC-002 end to end, server-observed)", () => {
  it("times each call from its request boundary to its usage effect, tool time excluded (recorded Grok turn)", async () => {
    const usage = await runRecordedTurn("prompt", [1_000, 4_000, 9_000, 10_000]);
    expect(usage.map((row) => row.output_throughput)).toEqual([
      { method: "end_to_end", output_tokens: usage[0]!.reported_output_tokens, duration_ms: 3_000 },
      // Grok announces the tool_call after response_completed; only the finished tool opens call 2.
      { method: "end_to_end", output_tokens: usage[1]!.reported_output_tokens, duration_ms: 1_000 },
    ]);
  });

  it("times every call of a three-call MCP turn", async () => {
    const usage = await runRecordedTurn("mcp", [0, 2_000, 2_500, 4_000, 4_100, 5_100]);
    expect(usage.map((row) => (row.output_throughput as { duration_ms: number }).duration_ms)).toEqual([2_000, 1_500, 1_000]);
  });
});
