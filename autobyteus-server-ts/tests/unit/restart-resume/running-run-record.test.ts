/**
 * autobyteus-638 C-1: the running-run record's tolerant reader (missing, invalid, present) and its atomic writer (one
 * entry per root, sorted by kind then ID). Temporary data root only.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readRunningRunRecord,
  removeRunningRunRecord,
  runningRunRecordPath,
  writeRunningRunRecord,
} from "../../../src/restart-resume/running-run-record.js";

let appDataDir: string;
let recordPath: string;

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "running-run-record-"));
  recordPath = runningRunRecordPath(appDataDir);
});
afterEach(async () => { await fs.rm(appDataDir, { recursive: true, force: true }); });

const writeRaw = async (text: string) => {
  await fs.mkdir(path.dirname(recordPath), { recursive: true });
  await fs.writeFile(recordPath, text);
};

describe("running-run record", () => {
  it("lives at <appDataDir>/restart-resume/running-runs.json and reads as missing when absent", async () => {
    expect(recordPath).toBe(path.join(appDataDir, "restart-resume", "running-runs.json"));
    expect(await readRunningRunRecord(recordPath)).toEqual({ kind: "missing" });
  });

  it("writes one entry per root, sorted by kind then ID, and reads it back", async () => {
    await writeRunningRunRecord(recordPath, { runs: [
      { rootSubjectKind: "agent_team", rootRunId: "team-b" },
      { rootSubjectKind: "agent", rootRunId: "ptm-2" },
      { rootSubjectKind: "agent", rootRunId: "ptm-1" },
      { rootSubjectKind: "agent", rootRunId: "ptm-2" },
    ] });
    expect(JSON.parse(await fs.readFile(recordPath, "utf8"))).toEqual({ runs: [
      { rootSubjectKind: "agent", rootRunId: "ptm-1" },
      { rootSubjectKind: "agent", rootRunId: "ptm-2" },
      { rootSubjectKind: "agent_team", rootRunId: "team-b" },
    ] });
    expect(await readRunningRunRecord(recordPath)).toEqual({ kind: "present", record: { runs: [
      { rootSubjectKind: "agent", rootRunId: "ptm-1" },
      { rootSubjectKind: "agent", rootRunId: "ptm-2" },
      { rootSubjectKind: "agent_team", rootRunId: "team-b" },
    ] } });
    await removeRunningRunRecord(recordPath);
    expect(await readRunningRunRecord(recordPath)).toEqual({ kind: "missing" });
  });

  it.each([
    ["not JSON", "{", /JSON|Unexpected|position/],
    ["no runs list", JSON.stringify({ entries: [] }), /no runs list/],
    ["an Org root", JSON.stringify({ runs: [{ rootSubjectKind: "agent_org", rootRunId: "org-1" }] }), /run 0: invalid rootSubjectKind/],
    ["an empty run ID", JSON.stringify({ runs: [{ rootSubjectKind: "agent", rootRunId: " " }] }), /run 0: invalid root/],
    ["a non-object entry", JSON.stringify({ runs: ["agent:a"] }), /run 0: not an object/],
  ])("is invalid as a whole for %s", async (_case, text, reason) => {
    await writeRaw(text);
    const read = await readRunningRunRecord(recordPath);
    expect(read.kind).toBe("invalid");
    expect(read.kind === "invalid" ? read.reason : "").toMatch(reason);
  });
});
