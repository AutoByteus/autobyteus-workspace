import { afterEach, describe, expect, it, vi } from "vitest";

const execFileSync = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFileSync }));

import {
  parseProcessTable,
  processGroupsInactive,
  readProcessTable,
  selectDescendantPidsInGroup,
  selectDescendantProcessGroups,
  signalProcessGroups,
} from "../../../src/utils/process-tree.js";

// pid ppid pgid. The server (100) spawned AGY (200) without detaching, so AGY shares the server's group.
const PROCESS_TABLE = `
  PID  PPID  PGID
    1     0     1
  100     1   100
  200   100   100
  201   200   100
  300   200   300
  301   300   300
  302   301   300
  400   200   400
  401   400   400
  500   200   900
  700   200     1
  900     1   900
  600     1   600
  601   600   600
  101     1   100
garbage line
`;
const rows = parseProcessTable(PROCESS_TABLE);

afterEach(() => { vi.restoreAllMocks(); execFileSync.mockReset(); });

describe("descendant process-group selection", () => {
  it("selects only groups led by a live descendant of the root", () => {
    expect(selectDescendantProcessGroups(rows, 200, [100])).toEqual([300, 400]);
  });

  it("never selects excluded groups, pgid <= 1, foreign-led or unrelated groups", () => {
    const groups = selectDescendantProcessGroups(rows, 200, [100, 300]);
    expect(groups).toEqual([400]);
    for (const excluded of [100, 300, 1, 900, 600]) expect(groups).not.toContain(excluded);
  });

  it("selects the server's descendant-led groups from the server root", () => {
    expect(selectDescendantProcessGroups(rows, 100, [100])).toEqual([300, 400]);
  });

  it("finds nothing once the root is gone from the process table (its groups reparented)", () => {
    const afterCrash = parseProcessTable("  300     1   300\n  301   300   300\n  100     1   100\n");
    expect(selectDescendantProcessGroups(afterCrash, 200, [100])).toEqual([]);
  });
});

describe("descendant pids in one group", () => {
  it("selects the root's descendants in its own group, never the root or a non-descendant member", () => {
    expect(selectDescendantPidsInGroup(rows, 100, 100)).toEqual([200, 201]);
  });

  it("selects nothing when the root has no descendants in that group", () => {
    expect(selectDescendantPidsInGroup(rows, 600, 100)).toEqual([]);
  });
});

describe("process-table reading", () => {
  it("reads through one bounded ps call", () => {
    execFileSync.mockReturnValue(PROCESS_TABLE);
    expect(readProcessTable()).toEqual(rows);
    expect(execFileSync).toHaveBeenCalledWith("ps", ["-A", "-o", "pid=,ppid=,pgid="],
      expect.objectContaining({ encoding: "utf8", timeout: 2000 }));
  });

  it("throws when the table cannot be read", () => {
    execFileSync.mockImplementation(() => { throw new Error("spawn ps ENOENT"); });
    expect(() => readProcessTable()).toThrow("ENOENT");
  });
});

describe("process-group signalling", () => {
  it("signals each group by negative pgid and keeps going when one group is gone or not permitted", () => {
    const signalled: number[] = [];
    vi.spyOn(process, "kill").mockImplementation(((pid: number) => {
      signalled.push(pid);
      if (pid === -300) throw Object.assign(new Error("gone"), { code: "ESRCH" });
      if (pid === -400) throw Object.assign(new Error("denied"), { code: "EPERM" });
      return true;
    }) as typeof process.kill);

    expect(() => signalProcessGroups([300, 400, 500], "SIGTERM")).toThrow("Exact process-group signal failed");
    expect(signalled).toEqual([-300, -400, -500]);
  });

  it("treats only ESRCH as proof that a group is gone", () => {
    vi.spyOn(process, "kill").mockImplementation(((pid: number) => {
      if (pid === -300) throw Object.assign(new Error("gone"), { code: "ESRCH" });
      if (pid === -400) throw Object.assign(new Error("denied"), { code: "EPERM" });
      return true;
    }) as typeof process.kill);

    expect(processGroupsInactive([300])).toBe(true);
    expect(processGroupsInactive([300, 500])).toBe(false);
    expect(() => processGroupsInactive([400])).toThrow("denied");
  });
});
