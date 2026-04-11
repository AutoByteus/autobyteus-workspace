import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamMemberLocalRunProjectionReader } from "../../../src/run-history/services/team-member-local-run-projection-reader.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";

describe("TeamMemberLocalRunProjectionReader", () => {
  let memoryDir: string;
  let layout: TeamMemberMemoryLayout;
  let reader: TeamMemberLocalRunProjectionReader;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "autobyteus-team-member-local-projection-reader-"),
    );
    layout = new TeamMemberMemoryLayout(memoryDir);
    reader = new TeamMemberLocalRunProjectionReader(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("reads a replay bundle from the canonical team-member subtree", async () => {
    const memberDir = layout.getMemberDirPath("team-1", "member-a");
    await fs.mkdir(memberDir, { recursive: true });
    await fs.writeFile(
      path.join(memberDir, "raw_traces.jsonl"),
      [
        JSON.stringify({
          trace_type: "user",
          content: "hello",
          turn_id: "turn_1",
          seq: 1,
          ts: 1_700_000_000,
        }),
        JSON.stringify({
          trace_type: "tool_call",
          tool_call_id: "call-1",
          tool_name: "run_bash",
          tool_args: { command: "pwd" },
          turn_id: "turn_1",
          seq: 2,
          ts: 1_700_000_001,
        }),
        JSON.stringify({
          trace_type: "tool_result",
          tool_call_id: "call-1",
          tool_result: { stdout: "/tmp" },
          turn_id: "turn_1",
          seq: 3,
          ts: 1_700_000_002,
        }),
      ].join("\n") + "\n",
      "utf-8",
    );

    const projection = await reader.getProjection("team-1", "member-a");
    expect(projection.runId).toBe("member-a");
    expect(projection.conversation.length).toBe(2);
    expect(projection.activities).toEqual([
      expect.objectContaining({
        invocationId: "call-1",
        toolName: "run_bash",
        status: "success",
      }),
    ]);
    expect(projection.summary).toBe("hello");
    expect(projection.lastActivityAt).toBeTruthy();
  });

  it("returns an empty replay bundle when the canonical member subtree is missing", async () => {
    await expect(reader.getProjection("team-1", "missing-member")).resolves.toEqual({
      runId: "missing-member",
      conversation: [],
      activities: [],
      summary: null,
      lastActivityAt: null,
    });
  });
});
