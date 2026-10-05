import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { StandaloneRootTreeSnapshot } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";
import { StandaloneRootPackageStore } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { StandaloneRootLocationService } from "../../../../src/standalone-agent-run-root/services/standalone-root-location-service.js";
import { StandaloneRunTokenUsageSummaryService } from "../../../../src/token-usage/services/standalone-run-token-usage-summary-service.js";

const HOST = "research_assistant_host";
const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "model", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/ws" };
const at = "2026-10-04T00:00:00.000Z";

/** A collaborator Agent, a collaborator Team (two members, one with its own copy) and a root-level copy. */
const tree = (): StandaloneRootTreeSnapshot => ({
  subjectKind: "agent",
  createdAt: at,
  host: { address: "/research_assistant" as never, agentRunId: HOST, agentDefinitionId: "research-assistant" },
  collaborators: [
    { kind: "agent", address: "/code_reviewer" as never, agentDefinitionId: "code-reviewer", agentRunId: "reviewer-run",
      platformAgentRunId: null, launchConfiguration: launch, addedAt: at, addedViaAgentRunId: HOST },
    { kind: "agent_team", address: "/product_team" as never, teamDefinitionId: "product-team", teamRunId: "product-team-run",
      coordinatorAddress: "/product_team/lead" as never, handoffs: [], defaultLaunchConfiguration: launch, addedAt: at, addedViaAgentRunId: HOST,
      members: [
        { address: "/product_team/lead" as never, agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null },
        { address: "/product_team/designer" as never, agentDefinitionId: "designer", agentRunId: "designer-run", platformAgentRunId: null },
      ],
      taskExecutions: [{ address: "/product_team/designer" as never, agentRunId: "designer-copy-run", platformAgentRunId: null,
        delegatorAgentRunId: "lead-run", startedAt: at }] },
  ],
  taskExecutions: [{ address: "/code_reviewer" as never, agentRunId: "reviewer-copy-run", platformAgentRunId: null,
    delegatorAgentRunId: HOST, startedAt: at }],
});
const CHILDREN = ["designer-copy-run", "designer-run", "lead-run", "reviewer-copy-run", "reviewer-run"];

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const serviceOver = (locations: StandaloneRootLocationService) => {
  const store = { getStandaloneRunSummary: vi.fn(async (input: { hostRunId: string }) => ({ run_id: input.hostRunId }) as never) };
  const service = new StandaloneRunTokenUsageSummaryService({
    tree: { listChildAgentRunIds: async (hostRunId) => (await locations.listAgents({ rootRunId: hostRunId })).map((agent) => agent.agentRunId) },
    store,
  });
  const childIds = () => [...(store.getStandaloneRunSummary.mock.calls[0]![0] as { childAgentRunIds: string[] }).childAgentRunIds].sort();
  return { service, store, childIds };
};

describe("StandaloneRunTokenUsageSummaryService (REQ-006)", () => {
  it("rolls up over the stored package of an existing run: collaborators, Team members and copies, once each", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "standalone-token-rollup-"));
    roots.push(memoryDir);
    const dir = new AgentMemoryLayout(memoryDir).getAgentRunCollaborationDirPath(HOST);
    expect((await new StandaloneRootPackageStore().writeTree(dir, tree())).outcome).toBe("committed");
    const { service, store, childIds } = serviceOver(new StandaloneRootLocationService({ memoryDir }));

    await expect(service.getSummary(` ${HOST} `)).resolves.toEqual({ run_id: HOST });
    expect(store.getStandaloneRunSummary).toHaveBeenCalledWith(expect.objectContaining({ hostRunId: HOST }));
    expect(childIds()).toEqual(CHILDREN);
  });

  it("uses the live root's tree when the root is active", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "standalone-token-rollup-live-"));
    roots.push(memoryDir);
    const { service, childIds } = serviceOver(new StandaloneRootLocationService({
      memoryDir,
      roots: { getActiveTree: (hostRunId) => hostRunId === HOST ? tree() : null },
    }));
    await service.getSummary(HOST);
    expect(childIds()).toEqual(CHILDREN);
  });

  it("is the host alone for a run without a collaboration package", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "standalone-token-rollup-none-"));
    roots.push(memoryDir);
    const { service, store } = serviceOver(new StandaloneRootLocationService({ memoryDir }));
    await service.getSummary(HOST);
    expect(store.getStandaloneRunSummary).toHaveBeenCalledWith({ hostRunId: HOST, childAgentRunIds: [] });
  });
});
