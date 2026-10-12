import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskTeamExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { agents, cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

/**
 * REQ-008 through a real Team root: a fallback note appears in the result of the delegation or
 * bring-in that admitted the agent (AC-005), never again for the same instance, and never for
 * a teammate re-projected from a copy's recorded snapshot (AR-002).
 */
const designer = agents.find((agent) => agent.id === "designer")!;
afterEach(async () => {
  designer.defaultLaunchConfig = null;
  vi.restoreAllMocks();
  await cleanupDirectories();
});

type Harness = Awaited<ReturnType<typeof harness>>;
const coordinatorOf = (f: Harness) => f.identity("/coordinator", "run-coordinator");
const note = (name: string) => expect.stringMatching(new RegExp(
  `^${name}: its agent default codex_app_server / \\(no model\\) could not be used \\(It names no model\\); it runs on .+ \\(inherited from the run\\)\\.$`));

describe("Team root launch notes", () => {
  it("send_message_to that brings a Team in appends its notes once; the recorded member keeps its source", async () => {
    designer.defaultLaunchConfig = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: null, llmConfig: null };
    const f = await harness();
    const first = await f.message(coordinatorOf(f), "/product_team", "Design it");
    expect(first.accepted).toBe(true);
    expect(first.message).toContain("\nLaunch configuration notes:\n- designer: its agent default codex_app_server / (no model) could not be used (It names no model)");
    const again = await f.message(coordinatorOf(f), "/product_team", "More");
    expect(again.message ?? "").not.toContain("Launch configuration notes");
    const [product] = f.root.getExecutionTreeSnapshot().rootTeam.collaborators;
    expect(product?.kind === "agent_team" && product.members[1]).toMatchObject({
      address: "/product_team/designer", launchSource: { origin: "inherited", fallbacks: [{ reason: "incomplete" }] },
    });
  });

  it("delegate_task to a catalog copy carries its notes; a teammate delegated inside that copy carries none", async () => {
    designer.defaultLaunchConfig = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: null, llmConfig: null };
    const f = await harness();
    const copy = await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    await flushMicrotasks();
    expect(copy).toMatchObject({ delegated: true, launchNotes: [note("designer")] });
    const [team] = f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions as TaskTeamExecution[];
    const lead = team!.members.find((member) => member.address === "/product_team/lead")!;
    const teammate = await f.root.delegateToNewCopy(
      { identity: f.identity("/product_team/lead", (lead as { agentRunId: string }).agentRunId) },
      { recipient_address: "/product_team/designer", description: "Mock it" },
    );
    expect(teammate).toMatchObject({ delegated: true });
    expect("launchNotes" in teammate).toBe(false);
    const agentCopy = await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/designer", description: "Sketch" });
    expect(agentCopy).toMatchObject({ delegated: true, launchNotes: [note("Designer")] });
  });
});
