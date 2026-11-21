import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChildRowProjection, localChildRecord } from "../../../../src/agent-collaboration/delegation/run-tree-records.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-461 stage C: `RunTreeView` reads its rows' records from the runs' own files (a team's launch, each member's
 * launch and source; F-66 / CR-461-086) and a peer's run from its Task link and its node's latest answer (SR-086 G-B2).
 */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const fallback = { layer: "agent_default" as const, runtimeKind: "grok_build", llmModelIdentifier: "grok-4", reason: "runtime_unavailable" as const, detail: "no grok" };
const teamFile = () => {
  const base = testExecutionTree({ rootTeamRunId: "se-run", coordinatorAddress: "/lead", children: [
    testAgentNode("/lead", { agentRunId: "lead-run", workspaceRootPath: "/w" }),
    testAgentNode("/ie", { agentRunId: "ie-run", workspaceRootPath: "/w" }),
  ] });
  const team = base.rootTeam;
  return { ...base, rootTeam: { ...team, defaultLaunchConfiguration: { ...team.defaultLaunchConfiguration, ...claude },
    defaultLaunchSource: { origin: "inherited" as const, fallbacks: [fallback] }, members: [
      { ...team.members[0]!, launchConfiguration: { ...team.members[0]!.launchConfiguration, ...claude } },
      { ...team.members[1]!, launchConfiguration: { ...team.members[1]!.launchConfiguration, ...claude, llmModelIdentifier: "sol-6.1" },
        launchSource: { origin: "settings" as const, fallbacks: [] } },
    ] } };
};
let dir: string | null = null;
afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }); dir = null; });

describe("RunTreeView's records", () => {
  it("a delegated team's record: its launch and each member's, a member without its own source taking its team's", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "run-tree-records-"));
    await new TeamRunExecutionTreeStore().write(new AgentMemoryLayout(dir).getTeamDirPath({ rootTeamRunId: "se-run", ancestorTeamRunIds: [] }), teamFile() as never);
    const tree = { agentsOf: async () => [] };
    const ownTreeOf = async (run: { rootRunId: string }) => run.rootRunId === "se-run" ? { kind: "agent_team" as const, teamRunId: "se-run", coordinatorAddress: "/lead",
      members: [{ agentRunId: "lead-run", address: "/lead" }, { agentRunId: "ie-run", address: "/ie" }] } : null;
    const record = await localChildRecord({ run: { teamRunId: "se-run" }, recipientAddress: "/se" } as never, dir, tree as never, ownTreeOf as never);
    expect(record).toMatchObject({ kind: "agent_team", teamRunId: "se-run", address: "/se", coordinatorAddress: "/lead",
      launch: { llmModelIdentifier: "opus", source: { origin: "inherited", fallbacks: [fallback] }, ownSource: true },
      members: [
        { address: "/lead", agentRunId: "lead-run", launch: { llmModelIdentifier: "opus", source: { origin: "inherited" }, ownSource: false } },
        { address: "/ie", agentRunId: "ie-run", launch: { llmModelIdentifier: "sol-6.1", source: { origin: "settings" }, ownSource: true } },
      ] });
    // A run whose own file is missing has no record.
    expect(await localChildRecord({ run: { teamRunId: "gone" }, recipientAddress: "/x" } as never, dir, tree as never, ownTreeOf as never)).toBeNull();
  });

  it("F-66, SR-086 G-B2: a peer's record carries its launches from its node's latest answer, kept with its status, never asking the node", async () => {
    const link = { recipientAddress: "/helper", nodeId: "node-b", delegatorAgentRunId: "host", linkedAt: "t", open: true, run: { agentRunId: "peer-agent" } };
    const summary = { nodeId: "node-b", runId: "peer-agent", reachable: true, title: "Help", statuses: [],
      launches: [{ address: "/helper", runtimeKind: "codex_app_server", llmModelIdentifier: "gpt", source: { origin: "agent_default", fallbacks: [] } }] };
    const channel = { peerName: async () => "B", runSummaries: vi.fn() };
    let kept: typeof summary | null = summary;
    const projection = createChildRowProjection({ memoryDir: "/unused", ownTreeOf: async () => null, channel: () => channel as never, peerSummaryOf: () => kept as never,
      tree: { agentsOf: async () => [], peerChildrenOf: () => [link] } as never });
    const child = { run: { agentRunId: "peer-agent" }, nodeId: "node-b", parent: { rootSubjectKind: "agent", rootRunId: "host" } } as never;
    expect(await projection.rowOf(child)).toMatchObject({ kind: "peer", summary: { title: "Help", reachable: true },
      launches: [{ address: "/helper", llmModelIdentifier: "gpt" }], link: { kind: "agent", agentRunId: "peer-agent", nodeId: "node-b", nodeName: "B" } });
    kept = null;
    expect(await projection.rowOf(child)).toMatchObject({ launches: null, summary: null });
    expect(channel.runSummaries).not.toHaveBeenCalled();
  });
});
