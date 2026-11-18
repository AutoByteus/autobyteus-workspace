import { describe, expect, it, vi } from "vitest";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunAgentStatusEntry } from "../../../../src/agent-collaboration/execution/remote/run-agent-access.js";
import { RunningAgentsListing } from "../../../../src/agent-collaboration/running/running-agents-listing.js";
import type { RunListingFacts } from "../../../../src/run-history/store/run-own-agents-reader.js";

/**
 * autobyteus-492 DS-001 (AC-001 … AC-003, REQ-001 … REQ-007, DEC-004, DEC-009, DEC-010, DEC-013): the live Agent and Team runs a
 * person started whose entry agent runs, except the caller's; one entry each with exactly the REQ-002 fields.
 */
const root = (rootSubjectKind: RootExecutionIdentity["rootSubjectKind"], rootRunId: string) => ({ rootSubjectKind, rootRunId }) as RootExecutionIdentity;
const live = (agentRunId: string, status: RunAgentStatusEntry["status"]): RunAgentStatusEntry => ({ agentRunId, status, backgroundTasksRunning: 0 });

const CALLER = root("agent", "pm_caller");
const PM = root("agent", "pm_other");
const TEAM = root("agent_team", "team_product");
const COPY = root("agent", "copy_1");
const ORG = root("agent_org", "org_1");
const STOPPED = root("agent", "pm_idle_shut");
const BROKEN = root("agent", "pm_broken");

const facts: Record<string, RunListingFacts | Error | null> = {
  pm_caller: { kind: "agent", startedByPerson: true, definitionId: "pm", startedAt: "2026-11-14T09:00:00Z", workspace: "/work/a" },
  pm_other: { kind: "agent", startedByPerson: true, definitionId: "pm", startedAt: "2026-11-14T09:12:03Z", workspace: "/work/b" },
  team_product: { kind: "agent_team", startedByPerson: true, definitionId: "product-team", definitionName: "Product Team", startedAt: "2026-11-15T08:00:00Z",
    workspace: "/work/designs", coordinatorAgentRunId: "lead_1" },
  copy_1: { kind: "agent", startedByPerson: false, definitionId: "pm", startedAt: "2026-11-16T08:00:00Z", workspace: "/tmp/x" },
  pm_idle_shut: { kind: "agent", startedByPerson: true, definitionId: "pm", startedAt: null, workspace: null },
  pm_broken: new Error("run_metadata.json is not JSON"),
};
const statuses: Record<string, readonly RunAgentStatusEntry[]> = {
  pm_caller: [live("pm_caller", "running")], pm_other: [live("pm_other", "idle")], team_product: [live("lead_1", "running"), live("writer_1", "idle")],
  copy_1: [live("copy_1", "running")], org_1: [live("org_agent", "idle")], pm_idle_shut: [], pm_broken: [live("pm_broken", "idle")],
};

const setup = (projects: Record<string, string> = { pm_other: "AutoByteus" }) => {
  const listingFactsOf = vi.fn(async (run: RootExecutionIdentity) => { const found = facts[run.rootRunId] ?? null; if (found instanceof Error) throw found; return found; });
  const listing = new RunningAgentsListing({
    running: { liveRoots: () => [CALLER, PM, TEAM, COPY, ORG, STOPPED, BROKEN], statusesOf: (run) => statuses[run.rootRunId] ?? [] },
    runFiles: { listingFactsOf },
    agentName: async (definitionId) => definitionId === "pm" ? "Project Task Manager" : null,
    catalogAddresses: async () => ({ addressFor: (ref) => ref.definitionId === "pm" ? "/project_task_manager" as never : ref.definitionId === "product-team" ? "/product_team" as never : null }),
    projectOf: async (run) => projects[run.runId] ? { name: projects[run.runId]! } : null,
  });
  return { listing, listingFactsOf };
};

describe("RunningAgentsListing", () => {
  it("AC-001, AC-002: the other user-started Agent run and the Team run, with exactly their fields; no copy, Org, stopped or caller run", async () => {
    const f = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(f.listing.list({ caller: CALLER })).resolves.toEqual([
      { kind: "agent", name: "Project Task Manager", address: "/project_task_manager", agent_run_id: "pm_other", workspace: "/work/b", state: "idle",
        started_at: "2026-11-14T09:12:03Z", project: "AutoByteus" },
      // A Team is one entry: its coordinator's run ID, workspace and state (DEC-009, DEC-013); not under a Project: no `project`.
      { kind: "agent_team", name: "Product Team", address: "/product_team", team_run_id: "team_product", team_coordinator_agent_run_id: "lead_1",
        workspace: "/work/designs", state: "running", started_at: "2026-11-15T08:00:00Z" },
    ]);
    // An Org run's file is not read (DEC-004); one run whose file cannot be read is left out, named (DESIGN.md rule 7).
    expect(f.listingFactsOf).not.toHaveBeenCalledWith(ORG);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'agent:pm_broken' is left out"));
    warn.mockRestore();
  });

  it("DS-002: a peer's answer has no caller, so every such run is listed (the asking node is never one of them)", async () => {
    const f = setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const agents = await f.listing.list({ caller: null });
    expect(agents.map((entry) => entry.kind === "agent" ? entry.agent_run_id : entry.team_run_id)).toEqual(["pm_caller", "pm_other", "team_product"]);
  });

  it("AC-003: filters by catalog address and by state; an unknown address lists nothing", async () => {
    const f = setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(f.listing.list({ caller: CALLER, filters: { state: "running" } })).resolves.toMatchObject([{ team_run_id: "team_product" }]);
    await expect(f.listing.list({ caller: CALLER, filters: { address: "/project_task_manager" } })).resolves.toMatchObject([{ agent_run_id: "pm_other" }]);
    await expect(f.listing.list({ caller: CALLER, filters: { address: "/nobody" } })).resolves.toEqual([]);
  });

  it("an entry whose definition is not in the node catalog has no address; a deleted definition is named by its ID", async () => {
    const listing = new RunningAgentsListing({
      running: { liveRoots: () => [PM], statusesOf: () => [live("pm_other", "error")] },
      runFiles: { listingFactsOf: async () => ({ kind: "agent", startedByPerson: true, definitionId: "gone", startedAt: null, workspace: null }) },
      agentName: async () => null, catalogAddresses: async () => ({ addressFor: () => null }), projectOf: async () => null,
    });
    await expect(listing.list({ caller: null })).resolves.toEqual([{ kind: "agent", name: "gone", agent_run_id: "pm_other", state: "error" }]);
  });
});
