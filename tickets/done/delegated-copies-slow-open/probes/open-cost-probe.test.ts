/**
 * Investigation probe (delegated-copies-slow-open): read-only timing of what the app asks the server
 * for when a hub run's delegated-copy tree is shown, against a TEST-OWNED copy of a memory dir.
 * To run: copy to autobyteus-server-ts/tests/scratch-dcso/ (imports are relative to that folder), then
 * `pnpm -C autobyteus-server-ts exec vitest run tests/scratch-dcso/open-cost-probe.test.ts --no-watch --reporter=verbose`.
 * Gate: TEST_DCSO_MEMORY_DIR=<copied memory dir> TEST_DCSO_HOST=<host run id>.
 */
import { describe, it } from "vitest";
import { StandaloneRootPackageStore } from "../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { StandaloneRootLocationService } from "../../src/standalone-agent-run-root/services/standalone-root-location-service.js";
import { StandaloneRootMemberViewProjectionService } from "../../src/standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";
import { CollaborationExecutionLocationService } from "../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../src/run-history/services/team-run-execution-tree-location-service.js";
import { AgentOrgExecutionTreeLocationService } from "../../src/agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentRunMetadataService } from "../../src/run-history/services/agent-run-metadata-service.js";
import { AgentRunViewProjectionService } from "../../src/run-history/services/agent-run-view-projection-service.js";
import { AgentMemoryLayout } from "../../src/agent-memory/store/agent-memory-layout.js";

const memoryDir = process.env.TEST_DCSO_MEMORY_DIR ?? "";
const host = process.env.TEST_DCSO_HOST ?? "";
const ms = (t: bigint) => Number(process.hrtime.bigint() - t) / 1e6;
const now = () => process.hrtime.bigint();

describe.skipIf(!memoryDir || !host)("delegated copies open cost", () => {
  it("measures", async () => {
    const store = new StandaloneRootPackageStore();
    const layout = new AgentMemoryLayout(memoryDir);
    const dir = layout.getAgentRunCollaborationDirPath(host);

    let t = now();
    const tree = await store.readTree(dir, host);
    const treeMs = ms(t);
    t = now();
    const messages = tree ? await store.readMessages(dir, tree) : null;
    const msgMs = ms(t);
    const viewBytes = JSON.stringify({ tree, messages }).length;
    console.log(`[inspection] readTree ${treeMs.toFixed(0)} ms; readMessages ${msgMs.toFixed(0)} ms; tree+messages JSON ${(viewBytes / 1e6).toFixed(1)} MB; messages ${(messages as any)?.messages?.length}`);

    {
      const meta = await new AgentRunMetadataService(memoryDir).readMetadata(host);
      const views = new AgentRunViewProjectionService(memoryDir);
      t = now();
      const p = await views.getRequiredProjectionFromMetadata({ runId: host, metadata: { ...meta!, memoryDir: layout.getAgentRunCollaborationDirPath(host).replace(/\/collaboration$/, "") } as any });
      console.log(`[host] own projection ${ms(t).toFixed(0)} ms, ${(JSON.stringify(p).length / 1e6).toFixed(1)} MB`);
    }
    const locations = new StandaloneRootLocationService({ memoryDir });
    const agents = await locations.listAgents({ rootRunId: host });
    console.log(`[children] ${agents.length} child agents`);

    // One member: location (whole hub tree re-read) and projection separately.
    const projections = new StandaloneRootMemberViewProjectionService({ memoryDir, locations });
    const sample = agents.slice(0, 20);
    let locTotal = 0;
    for (const a of sample) { t = now(); await locations.findAgent({ rootRunId: host, memberAddress: a.memberAddress, agentRunId: a.agentRunId }); locTotal += ms(t); }
    console.log(`[projection] hub-scoped location lookup avg ${(locTotal / sample.length).toFixed(0)} ms per member`);

    t = now();
    let projBytes = 0; let failures = 0;
    for (const a of agents) {
      try { projBytes += JSON.stringify(await projections.getProjection(host, a.memberAddress, a.agentRunId)).length; }
      catch { failures += 1; }
    }
    const projMs = ms(t);
    console.log(`[projection] all ${agents.length} members sequential ${projMs.toFixed(0)} ms (${(projMs / agents.length).toFixed(0)} ms avg), payload ${(projBytes / 1e6).toFixed(1)} MB, failures ${failures}`);

    // File changes: run lookup without a root (what getRunFileChanges does for a copy member).
    const metadata = new AgentRunMetadataService(memoryDir);
    const any = new CollaborationExecutionLocationService({
      teams: createStoredTeamRunExecutionTreeLocationService(memoryDir),
      orgs: new AgentOrgExecutionTreeLocationService({ memoryDir }),
      agents: new StandaloneRootLocationService({ memoryDir }),
    });
    const fcSample = agents.slice(0, 5);
    t = now();
    for (const a of fcSample) { await metadata.readMetadata(a.agentRunId); await any.findAgent({ agentRunId: a.agentRunId }); }
    const fcMs = ms(t) / fcSample.length;
    const teams = createStoredTeamRunExecutionTreeLocationService(memoryDir);
    const orgs = new AgentOrgExecutionTreeLocationService({ memoryDir });
    const hubs = new StandaloneRootLocationService({ memoryDir });
    for (const [name, svc] of [["teams", teams], ["orgs", orgs], ["agents", hubs]] as const) {
      t = now(); const found = await (svc as any).findAgent({ agentRunId: fcSample[0].agentRunId });
      console.log(`[fileChanges] family ${name}: ${ms(t).toFixed(0)} ms found=${!!found}`);
    }
    console.log(`[fileChanges] hub ids with packages: ${(await hubs.listHostRunIds()).length}`);
    console.log(`[fileChanges] unscoped run lookup avg ${fcMs.toFixed(0)} ms per member -> x${agents.length} = ${(fcMs * agents.length / 1000).toFixed(1)} s sequential`);
  }, 3_600_000);
});
