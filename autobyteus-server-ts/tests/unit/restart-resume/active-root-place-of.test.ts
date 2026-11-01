/** autobyteus-285: which active root holds a live agent run, and its place there (host, member or delegated). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const boundary = (members: readonly string[], delegated: readonly string[] = [], withQuery = true) => ({
  hasAgentExecution: (id: string) => members.includes(id) || delegated.includes(id),
  deliverExactAgentMessage: vi.fn(),
  ...(withQuery ? { isDelegatedRun: (id: string) => delegated.includes(id) } : {}),
});
const register = (directory: ActiveCollaborationRootDirectory, root: RootExecutionIdentity, b: ReturnType<typeof boundary>) =>
  directory.reserve(root, b).commit();

afterEach(() => vi.restoreAllMocks());

describe("ActiveCollaborationRootDirectory.placeOf", () => {
  it("tells the standalone host, its delegated runs, Team and Org members, and runs no root holds", () => {
    const directory = new ActiveCollaborationRootDirectory();
    register(directory, { rootSubjectKind: "agent", rootRunId: "host-1" }, boundary(["host-1"], ["copy-1", "copy-team-member"]));
    register(directory, { rootSubjectKind: "agent_team", rootRunId: "team-1" }, boundary(["coordinator", "worker"], ["team-copy"]));
    register(directory, { rootSubjectKind: "agent_org", rootRunId: "org-1" }, boundary(["org-agent"]));

    expect(directory.placeOf("host-1")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "host-1" }, place: "host" });
    expect(directory.placeOf("copy-1")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "host-1" }, place: "delegated" });
    expect(directory.placeOf("copy-team-member")?.place).toBe("delegated");
    expect(directory.placeOf(" worker ")).toEqual({ root: { rootSubjectKind: "agent_team", rootRunId: "team-1" }, place: "member" });
    expect(directory.placeOf("team-copy")?.place).toBe("delegated");
    expect(directory.placeOf("org-agent")).toEqual({ root: { rootSubjectKind: "agent_org", rootRunId: "org-1" }, place: "member" });
    expect(directory.placeOf("application-run")).toBeNull();
  });

  it("a root without the delegated query reports members; a Team or Org run named like a host is a member", () => {
    const directory = new ActiveCollaborationRootDirectory();
    register(directory, { rootSubjectKind: "agent_team", rootRunId: "same-id" }, boundary(["same-id", "x"], [], false));
    expect(directory.placeOf("same-id")?.place).toBe("member");
    expect(directory.placeOf("x")?.place).toBe("member");
  });

  it("logs when several roots claim a run and prefers the host, then a delegated claim", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const directory = new ActiveCollaborationRootDirectory();
    register(directory, { rootSubjectKind: "agent_team", rootRunId: "team-copy" }, boundary(["m"]));
    register(directory, { rootSubjectKind: "agent", rootRunId: "host-1" }, boundary(["host-1"], ["m"]));
    expect(directory.placeOf("m")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "host-1" }, place: "delegated" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("claimed by 2 active roots"));
  });
});
