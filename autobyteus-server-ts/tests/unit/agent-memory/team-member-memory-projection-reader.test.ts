import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamMemberMemoryProjectionReader } from "../../../src/agent-memory/services/team-member-memory-projection-reader.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";

describe("TeamMemberMemoryProjectionReader", () => {
  let memoryDir: string;
  let layout: TeamMemberMemoryLayout;
  let reader: TeamMemberMemoryProjectionReader;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-member-projection-reader-"));
    layout = new TeamMemberMemoryLayout(memoryDir);
    reader = new TeamMemberMemoryProjectionReader(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("reads projection from the canonical team-member subtree", async () => {
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
          trace_type: "assistant",
          content: "hi",
          turn_id: "turn_1",
          seq: 2,
          ts: 1_700_000_001,
        }),
      ].join("\n") + "\n",
      "utf-8",
    );

    const projection = await reader.getProjection("team-1", "member-a");
    expect(projection.runId).toBe("member-a");
    expect(projection.conversation.length).toBe(2);
    expect(projection.summary).toBe("hello");
    expect(projection.lastActivityAt).toBeTruthy();
  });

  it("throws when the canonical member subtree is missing", async () => {
    await expect(reader.getProjection("team-1", "missing-member")).rejects.toThrow();
  });
});
