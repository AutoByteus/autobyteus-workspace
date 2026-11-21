/** autobyteus-285 / autobyteus-461 DS-9: which active root holds a live agent run, and its place there (host or member). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const boundary = (members: readonly string[]) => ({
  hasAgentExecution: (id: string) => members.includes(id),
  ownsAgentRun: (id: string) => members.includes(id),
  deliverExactAgentMessage: vi.fn(),
  deliverToPeerRun: vi.fn(),
});
const register = (directory: ActiveCollaborationRootDirectory, root: RootExecutionIdentity, b: ReturnType<typeof boundary>) =>
  directory.reserve(root, b).commit();

afterEach(() => vi.restoreAllMocks());

describe("ActiveCollaborationRootDirectory.placeOf", () => {
  it("tells the standalone host, Team and Org members, and runs no root holds; a delegated run is the host of its own root", () => {
    const directory = new ActiveCollaborationRootDirectory();
    register(directory, { rootSubjectKind: "agent", rootRunId: "host-1" }, boundary(["host-1"]));
    register(directory, { rootSubjectKind: "agent", rootRunId: "child-1" }, boundary(["child-1"]));
    register(directory, { rootSubjectKind: "agent_team", rootRunId: "team-1" }, boundary(["coordinator", "worker"]));
    register(directory, { rootSubjectKind: "agent_org", rootRunId: "org-1" }, boundary(["org-agent"]));

    expect(directory.placeOf("host-1")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "host-1" }, place: "host" });
    expect(directory.placeOf("child-1")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "child-1" }, place: "host" });
    expect(directory.placeOf(" worker ")).toEqual({ root: { rootSubjectKind: "agent_team", rootRunId: "team-1" }, place: "member" });
    expect(directory.placeOf("org-agent")).toEqual({ root: { rootSubjectKind: "agent_org", rootRunId: "org-1" }, place: "member" });
    expect(directory.placeOf("application-run")).toBeNull();
  });

  it("a Team or Org run named like a host is a member", () => {
    const directory = new ActiveCollaborationRootDirectory();
    register(directory, { rootSubjectKind: "agent_team", rootRunId: "same-id" }, boundary(["same-id", "x"]));
    expect(directory.placeOf("same-id")?.place).toBe("member");
    expect(directory.placeOf("x")?.place).toBe("member");
  });

  it("logs when several roots claim a run and prefers the host", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const directory = new ActiveCollaborationRootDirectory();
    register(directory, { rootSubjectKind: "agent_team", rootRunId: "team-1" }, boundary(["m"]));
    register(directory, { rootSubjectKind: "agent", rootRunId: "m" }, boundary(["m"]));
    expect(directory.placeOf("m")).toEqual({ root: { rootSubjectKind: "agent", rootRunId: "m" }, place: "host" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("claimed by 2 active roots"));
  });
});
