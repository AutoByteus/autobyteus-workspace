import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { PeerStartedRunLaunches } from "../../../src/remote-collaboration/inbound/peer-started-run-launches.js";
import { remoteRunSummariesOf } from "../../../src/remote-collaboration/channel/peer-run-view-answers.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

/** autobyteus-461 SR-038 (design DS-8): a peer child's launches are read from the run's own file on its node when asked. */
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const routed = { origin: "model_router" as const, fallbacks: [], choiceReason: "Reviews need care.", taskKind: "review" };

describe("PeerStartedRunLaunches (node B)", () => {
  it("an agent run's own launch and a team's members' launches, from their own files; a changed launch reads changed", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "peer-launches-"));
    roots.push(memory);
   
    const metadata = (model: string) => ({ runId: "writer_1", agentDefinitionId: "writer", address: "/writer", workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "writer_1"),
      llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus", platformAgentRunId: null, launchSource: routed }) as never;
    await new AgentRunMetadataStore(memory).writeMetadata("writer_1", metadata("sonnet"));
    const dir = new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "team_b", ancestorTeamRunIds: [] });
    const base = structuredClone(testExecutionTree({ rootTeamRunId: "team_b", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead_b" }), testAgentNode("/analyst", { agentRunId: "analyst_b" })] })) as unknown as { rootTeam: { members: Record<string, unknown>[] } };
    // The lead records its own source; the analyst takes the team's (recorded on the team, DS-10 step 4).
    base.rootTeam.members[0]!.launchSource = routed;
    (base.rootTeam as Record<string, unknown>).defaultLaunchSource = { origin: "team_default", fallbacks: [] };
    const tree = base;
    await new TeamRunExecutionTreeStore().write(dir, validateTeamRunExecutionTreePayload(tree, "team_b"));
    const launches = new PeerStartedRunLaunches(memory);
    expect(await launches.of({ kind: "agent", runId: "writer_1" })).toEqual([{ address: "/writer", runtimeKind: "autobyteus", llmModelIdentifier: "sonnet", source: routed }]);
    const team = await launches.of({ kind: "agent_team", runId: "team_b" });
    expect(team.map((launch) => [launch.address, launch.source.origin])).toEqual([["/lead", "model_router"], ["/analyst", "team_default"]]);
    await new AgentRunMetadataStore(memory).writeMetadata("writer_1", metadata("opus"));
    expect((await launches.of({ kind: "agent", runId: "writer_1" }))[0]!.llmModelIdentifier).toBe("opus");
    expect(await launches.of({ kind: "agent", runId: "gone" })).toEqual([]);
  });
});

describe("a run summary's launches (node A, strict)", () => {
  const run = { kind: "agent", runId: "writer_1", title: null, statuses: [] };
  it("parsed when sent; none from a peer that does not send them; a malformed one makes the answer malformed", () => {
    const launch = { address: "/writer", runtimeKind: "autobyteus", llmModelIdentifier: "sonnet", source: { origin: "agent_default", fallbacks: [] } };
    expect(remoteRunSummariesOf({ runs: [{ ...run, launches: [launch] }] })![0]!.launches).toEqual([launch]);
    expect(remoteRunSummariesOf({ runs: [run] })![0]!.launches).toEqual([]);
    expect(remoteRunSummariesOf({ runs: [{ ...run, launches: [{ address: "/writer" }] }] })).toBeNull();
  });
});
