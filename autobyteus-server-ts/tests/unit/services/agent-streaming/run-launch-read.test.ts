import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readRunLaunch } from "../../../../src/services/agent-streaming/delegated-children-dtos.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { resetRootRunPackageReadinessIndex } from "../../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-461 CR-461-086 (F-60): a run's launch as its own file has it now, read from the run itself: what a delegator's
 * Settings shows for each delegated run after a save and after a reopen (model, runtime, settings and origin).
 */
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => { resetRootRunPackageReadinessIndex(root); return fs.rm(root, { recursive: true, force: true }); }));
});
const memoryDir = async () => { const memory = await fs.mkdtemp(path.join(os.tmpdir(), "run-launch-")); roots.push(memory); return memory; };
const agentMetadata = (memory: string, llmConfig: Record<string, unknown> | null, launchSource?: unknown) => ({
  runId: "writer", agentDefinitionId: "writer", address: "/writer", workspaceRootPath: "/w", memoryDir: path.join(memory, "agents", "writer"),
  llmModelIdentifier: "opus", llmConfig, autoExecuteTools: false, runtimeKind: "claude_agent_sdk", platformAgentRunId: null,
  ...(launchSource ? { launchSource } : {}),
}) as never;

describe("readRunLaunch (CR-461-086)", () => {
  it("an agent run's launch and origin from its own run_metadata, as its file has them now", async () => {
    const memory = await memoryDir();
    const store = new AgentRunMetadataStore(memory);
    await store.writeMetadata("writer", agentMetadata(memory, { reasoning_effort: "high" }, { origin: "configured", fallbacks: [] }));
    expect(await readRunLaunch({ kind: "agent", runId: "writer" }, memory)).toEqual({ kind: "agent", agentDefinitionId: "writer",
      launchConfiguration: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: { reasoning_effort: "high" }, autoExecuteTools: false, workspaceRootPath: "/w" },
      launchSource: { origin: "configured", fallbacks: [] } });
    // A Settings save writes the run's own file: the next read has it (no view record in between).
    await store.writeMetadata("writer", agentMetadata(memory, { reasoning_effort: "xhigh" }, { origin: "settings", fallbacks: [] }));
    expect(await readRunLaunch({ kind: "agent", runId: "writer" }, memory)).toMatchObject({
      launchConfiguration: { llmConfig: { reasoning_effort: "xhigh" } }, launchSource: { origin: "settings", fallbacks: [] } });
    expect(await readRunLaunch({ kind: "agent", runId: "nobody" }, memory)).toBeNull();
  });

  it("a team run's default and each member's launch, with their origins, from its own file", async () => {
    const memory = await memoryDir();
    const tree = testExecutionTree({ rootTeamRunId: "eng", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead" }), testAgentNode("/coder", { agentRunId: "coder" })] });
    const file = { ...tree, rootTeam: { ...tree.rootTeam, defaultLaunchSource: { origin: "configured", fallbacks: [] },
      members: [tree.rootTeam.members[0]!, { ...tree.rootTeam.members[1]!, launchConfiguration: { ...tree.rootTeam.members[1]!.launchConfiguration, llmConfig: { reasoning_effort: "xhigh" } },
        launchSource: { origin: "settings", fallbacks: [] } }] } };
    await new TeamRunExecutionTreeStore().write(new AgentMemoryLayout(memory).getTeamDirPath({ rootTeamRunId: "eng", ancestorTeamRunIds: [] }),
      validateTeamRunExecutionTreePayload(file, "eng"));
    const launch = await readRunLaunch({ kind: "agent_team", runId: "eng" }, memory);
    expect(launch).toMatchObject({ kind: "agent_team", coordinatorAddress: "/lead", defaultLaunchSource: { origin: "configured", fallbacks: [] } });
    if (!launch || launch.kind !== "agent_team") throw new Error("a team launch expected");
    expect(launch.members.map((member) => [member.address, member.launchConfiguration.llmConfig, member.launchSource?.origin ?? null])).toEqual([
      ["/lead", tree.rootTeam.members[0]!.launchConfiguration.llmConfig ?? null, null],
      ["/coder", { reasoning_effort: "xhigh" }, "settings"],
    ]);
    expect(await readRunLaunch({ kind: "agent_team", runId: "missing" }, memory)).toBeNull();
  });
});
