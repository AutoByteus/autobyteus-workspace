import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskTeamExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { agents, cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

/**
 * REQ-008 through a real Team root: a fallback note appears in the result of the delegation that
 * started the copy (AC-005), and never for an instance that is not freshly started (AR-002).
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
  `^${name}: its agent default Codex App Server / \\(no model\\) could not be used \\(It names no model\\); it runs on .+ \\(inherited from the run\\)\\.$`));

describe("Team root launch notes", () => {
  it("delegate_task to a catalog copy carries its notes; a teammate delegation inside that copy is refused (CM-1)", async () => {
    designer.defaultLaunchConfig = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: null, llmConfig: null };
    const f = await harness();
    const copy = await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    await flushMicrotasks();
    expect(copy).toMatchObject({ delegated: true, launchNotes: [note("designer")] });
    const [team] = f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions as TaskTeamExecution[];
    const lead = team!.members.find((member) => member.address === "/product_team/lead")!;
    await expect(f.root.delegateToNewCopy(
      { identity: f.identity("/product_team/lead", (lead as { agentRunId: string }).agentRunId) },
      { recipient_address: "/product_team/designer", description: "Mock it" },
    )).rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    const agentCopy = await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/designer", description: "Sketch" });
    expect(agentCopy).toMatchObject({ delegated: true, launchNotes: [note("Designer")] });
  });
});
