import { describe, expect, it } from "vitest";
import { resolveTaskCopyHost } from "../../../../src/agent-collaboration/execution/task/task-copy-host.js";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";

const a = (value: string) => value as AgentTeamAddress;
/** A delegator inside a nested Team instance `/target/sub` of `/target`; a root-hosted delegator has none. */
const index = {
  teamInstancesOf: (agentRunId: string) => agentRunId === "nested-member"
    ? [{ teamRunId: "sub-run", address: a("/target/sub") }, { teamRunId: "target-run", address: a("/target") }]
    : [],
};

describe("resolveTaskCopyHost (REQ-012)", () => {
  it("hosts a teammate copy in the delegator's instance whose address is the copy's parent, deepest first", () => {
    expect(resolveTaskCopyHost(index, "nested-member", a("/target/sub/writer")))
      .toEqual({ hostKind: "team", hostRunId: "sub-run", hostAddress: "/target/sub" });
    expect(resolveTaskCopyHost(index, "nested-member", a("/target/lead")))
      .toEqual({ hostKind: "team", hostRunId: "target-run", hostAddress: "/target" });
  });

  it("places a top-level copy (catalog, collaborator, Org-level placement) and every root-hosted delegator's copy at the root", () => {
    expect(resolveTaskCopyHost(index, "nested-member", a("/marketing_team"))).toEqual({ hostKind: "root" });
    expect(resolveTaskCopyHost(index, "nested-member", a("/other_team/member"))).toEqual({ hostKind: "root" });
    expect(resolveTaskCopyHost(index, "director", a("/target/lead"))).toEqual({ hostKind: "root" });
  });
});
