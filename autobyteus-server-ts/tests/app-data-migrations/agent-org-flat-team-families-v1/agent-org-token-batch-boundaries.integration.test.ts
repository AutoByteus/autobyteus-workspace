import { afterEach, describe, expect, it } from "vitest";
import { createOrgMigrationFixture } from "../../helpers/org-family-migration-fixtures.js";
import { buildCurrentTokenUsagePayload } from "../../helpers/token-usage-run-record-fixtures.js";

const fixtures: Awaited<ReturnType<typeof createOrgMigrationFixture>>[] = [];
const fixture = async () => {
  const value = await createOrgMigrationFixture();
  fixtures.push(value);
  return value;
};
afterEach(async () => { for (const value of fixtures.splice(0)) await value.close(); });

/** AC-004/005: exercise SQL boundaries using actual persisted rows, not mocked pages. */
describe("Org token migration SQL batch boundaries", () => {
  it("enumerates 501 exact claimed roots over three pages without duplicates or omissions", async () => {
    const e = await fixture();
    await e.store.recordObservation(buildCurrentTokenUsagePayload({ runId: "seed", rootTeamRunId: "seed" }));
    const seed = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "seed" } });
    await e.client.tokenUsageRunRecord.deleteMany();
    const roots = Array.from({ length: 501 }, (_, i) => `root-${String(i).padStart(3, "0")}`);
    await e.client.tokenUsageRunRecord.createMany({ data: roots.flatMap((root, i) => [0, 1].map((member) => ({
      ...seed, id: i * 2 + member + 1, runId: `agent-${i}-${member}`, rootTeamRunId: root,
      identitySummaryJson: JSON.stringify({ ...JSON.parse(seed.identitySummaryJson), rootTeamRunIds: { status: "single", value: root } }),
    }))) });
    const actual: string[] = [];
    for await (const root of e.attributionRepository.listClaimedRoots()) actual.push(root);
    expect(actual).toEqual(roots);
  });

  it("rolls back an exact root when member 251 has a contradictory claim, then corrects all 501 members and validates current readiness", async () => {
    const e = await fixture();
    await e.store.recordObservation(buildCurrentTokenUsagePayload({ runId: "seed", rootTeamRunId: "org", inputTokens: 100, outputTokens: 20, totalCost: 0.031 }));
    const seed = await e.client.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId: "seed" } });
    await e.client.tokenUsageRunRecord.deleteMany();
    const ids = Array.from({ length: 501 }, (_, i) => `member-${String(i).padStart(3, "0")}`);
    await e.client.tokenUsageRunRecord.createMany({ data: ids.map((runId, i) => ({ ...seed, id: i + 1, runId })) });
    const middle = ids[250]!;
    await e.client.tokenUsageRunRecord.update({ where: { runId: middle }, data: { rootTeamRunId: "foreign" } });
    const before = await e.client.tokenUsageRunRecord.findMany({ orderBy: { runId: "asc" } });
    await expect(e.attributionRepository.convertRoot("org", ids)).rejects.toThrow("Conflicting token attribution");
    expect(await e.client.tokenUsageRunRecord.findMany({ orderBy: { runId: "asc" } })).toEqual(before);
    await e.client.tokenUsageRunRecord.update({ where: { runId: middle }, data: { rootTeamRunId: "org" } });
    expect(await e.attributionRepository.convertRoot("org", ids)).toBe(501);
    const corrected = await e.client.tokenUsageRunRecord.findMany({ orderBy: { runId: "asc" } });
    expect(corrected).toEqual(ids.map((runId, i) => ({ ...seed, id: i + 1, runId, rootTeamRunId: null, rootAttributionStatus: "unknown",
      identitySummaryJson: JSON.stringify({ ...JSON.parse(seed.identitySummaryJson), rootTeamRunIds: { status: "unknown" } }),
    })));
    expect(await e.attributionRepository.convertRoot("org", ids)).toBe(0);
    await expect(e.store.assertAgentOrgRecordsReady({ orgRunId: "org", agentRunIds: [...ids, ...ids, "absent"] })).resolves.toBeUndefined();
    await e.client.tokenUsageRunRecord.update({ where: { runId: ids[500]! }, data: { rootAttributionStatus: "invalid" } });
    await expect(e.store.assertAgentOrgRecordsReady({ orgRunId: "org", agentRunIds: ids })).rejects.toThrow("AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY");
  });
});
