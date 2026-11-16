import { describe, expect, it, vi } from "vitest";
import { displayNameOf, runDisplayNameOf } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
import { createRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const entry = (recipientAddress: string) => ({ recipientAddress }) as never;

/** autobyteus-461 SR-091 (CR-461-113, REQ-014): a delegated run has one name everywhere, its slot. */
describe("displayNameOf", () => {
  it("names a delegated run after its slot, the last segment of its delegation address, as its row does", () => {
    expect(displayNameOf({ delegated: true, address: "/worker" })).toBe("worker");
    expect(displayNameOf({ delegated: true, address: "/squad/release_notes-writer" })).toBe("release notes writer");
  });

  it("names no run nobody delegated (its definition names it), and none without an address", () => {
    expect(displayNameOf({ delegated: false, address: "/worker" })).toBeNull();
    expect(displayNameOf({ delegated: true, address: null })).toBeNull();
    expect(displayNameOf({ delegated: true, address: "/" })).toBeNull();
  });
});

describe("runDisplayNameOf", () => {
  const index = (entries: Record<string, string>, agentAddresses: Record<string, string | null> = {}) => ({
    currentTaskOf: vi.fn((run: { agentRunId?: string; teamRunId?: string }) => {
      const id = run.agentRunId ?? run.teamRunId!;
      return entries[id] ? entry(entries[id]!) : null;
    }),
    agentsOf: vi.fn(async (run: { rootRunId: string }) => [{ agentRunId: run.rootRunId, address: agentAddresses[run.rootRunId] ?? null, agentDefinitionId: null }]),
  });
  const agent = (id: string) => createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: id });
  const team = (id: string) => createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: id });

  it("an agent run a Task names: its own address, as its row reads it, else the address it was delegated to", async () => {
    await expect(runDisplayNameOf(index({ copy: "/worker" }, { copy: "/writer" }), agent("copy"))).resolves.toBe("writer");
    await expect(runDisplayNameOf(index({ copy: "/worker" }), agent("copy"))).resolves.toBe("worker");
  });

  it("a team run a Task names: its entry's recipient address (its own root is /)", async () => {
    await expect(runDisplayNameOf(index({ squad: "/review_squad" }), team("squad"))).resolves.toBe("review squad");
  });

  it("a run no Task names, or an Org run: no name, its definition's", async () => {
    await expect(runDisplayNameOf(index({}), agent("mine"))).resolves.toBeNull();
    await expect(runDisplayNameOf(index({ org: "/x" }), createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: "org" }))).resolves.toBeNull();
  });
});
