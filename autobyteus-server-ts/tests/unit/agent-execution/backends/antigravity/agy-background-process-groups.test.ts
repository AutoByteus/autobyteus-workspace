import { afterEach, describe, expect, it, vi } from "vitest";

const execFileSync = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFileSync }));

import {
  listAgyBackgroundProcessGroups,
  parseProcessTable,
  selectAgyBackgroundProcessGroups,
  signalProcessGroups,
} from "../../../../../src/agent-execution/backends/antigravity/stream/agy-background-process-groups.js";

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
garbage line
`;

afterEach(() => { vi.restoreAllMocks(); execFileSync.mockReset(); });

describe("AGY background process-group selection", () => {
  it("selects only groups led by a live AGY descendant", () => {
    expect(selectAgyBackgroundProcessGroups(parseProcessTable(PROCESS_TABLE), 200, 100)).toEqual([300, 400]);
  });

  it("never selects AGY's own group, the server's group, pgid <= 1, foreign-led or unrelated groups", () => {
    const groups = selectAgyBackgroundProcessGroups(parseProcessTable(PROCESS_TABLE), 200, 100);
    for (const excluded of [100, 1, 900, 600]) expect(groups).not.toContain(excluded);
  });

  it("finds nothing once AGY is gone from the process table (AGY crashed, groups reparented)", () => {
    const afterCrash = "  300     1   300\n  301   300   300\n  100     1   100\n";
    expect(selectAgyBackgroundProcessGroups(parseProcessTable(afterCrash), 200, 100)).toEqual([]);
  });

  it("lists through a bounded ps call on macOS/Linux", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    execFileSync.mockReturnValue(PROCESS_TABLE);
    expect(listAgyBackgroundProcessGroups(200, 100)).toEqual([300, 400]);
    expect(execFileSync).toHaveBeenCalledWith("ps", ["-A", "-o", "pid=,ppid=,pgid="],
      expect.objectContaining({ encoding: "utf8", timeout: 2000 }));
  });

  it("skips process-table access on Windows", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    expect(listAgyBackgroundProcessGroups(200, 100)).toEqual([]);
    expect(execFileSync).not.toHaveBeenCalled();
  });
});

describe("AGY background process-group signalling", () => {
  it("signals each group by negative pgid and keeps going when one group is gone or not permitted", () => {
    const signalled: number[] = [];
    vi.spyOn(process, "kill").mockImplementation(((pid: number) => {
      signalled.push(pid);
      if (pid === -300) throw Object.assign(new Error("gone"), { code: "ESRCH" });
      if (pid === -400) throw Object.assign(new Error("denied"), { code: "EPERM" });
      return true;
    }) as typeof process.kill);

    expect(() => signalProcessGroups([300, 400, 500], "SIGTERM")).not.toThrow();
    expect(signalled).toEqual([-300, -400, -500]);
  });
});
