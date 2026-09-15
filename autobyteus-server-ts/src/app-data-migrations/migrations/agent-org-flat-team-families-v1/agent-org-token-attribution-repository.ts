import { Prisma, type PrismaClient } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { rootPrismaClient } from "repository_prisma";
import { isAgentOrgTokenAttributionReady } from "../../../token-usage/domain/agent-org-token-attribution.js";

const BATCH_SIZE = 250;
type RawRecord = Record<string, unknown> & {
  run_id: string; root_team_run_id: string | null; root_attribution_status: string; identity_summary_json: string;
};
export interface OrgTokenAttributionRepository {
  listClaimedRoots(): AsyncIterable<string>;
  convertRoot(orgRunId: string, agentRunIds: readonly string[]): Promise<number>;
}
/** Migration-only SQL authority. Never roundtrip accounting through a domain codec/upsert. */
export class AgentOrgTokenAttributionRepository implements OrgTokenAttributionRepository {
  constructor(private readonly client: PrismaClient = rootPrismaClient) {}
  async *listClaimedRoots(): AsyncIterable<string> {
    let after: string | null = null;
    while (true) {
      const rows: Array<{ root_team_run_id: string }> = await this.client.$queryRaw<Array<{ root_team_run_id: string }>>(Prisma.sql`
        SELECT DISTINCT root_team_run_id FROM token_usage_run_records
        WHERE root_team_run_id IS NOT NULL ${after === null ? Prisma.empty : Prisma.sql`AND root_team_run_id > ${after}`}
        ORDER BY root_team_run_id LIMIT ${BATCH_SIZE}`);
      for (const row of rows) yield row.root_team_run_id;
      if (rows.length < BATCH_SIZE) break;
      after = rows[rows.length - 1]!.root_team_run_id;
    }
  }
  async convertRoot(orgRunId: string, agentRunIds: readonly string[]): Promise<number> {
    const members = new Set(agentRunIds);
    return this.client.$transaction(async (tx) => {
      const rows = new Map<string, RawRecord>();
      const claimants = await tx.$queryRaw<RawRecord[]>`SELECT * FROM token_usage_run_records WHERE root_team_run_id = ${orgRunId}`;
      for (const row of claimants) {
        if (!members.has(row.run_id)) throw new Error(`Unexpected token claimant '${row.run_id}' for Org '${orgRunId}'.`);
        rows.set(row.run_id, row);
      }
      const ids = [...members];
      for (let start = 0; start < ids.length; start += BATCH_SIZE) {
        const records = await tx.$queryRaw<RawRecord[]>(Prisma.sql`SELECT * FROM token_usage_run_records WHERE run_id IN (${Prisma.join(ids.slice(start, start + BATCH_SIZE))})`);
        records.forEach((row) => rows.set(row.run_id, row));
      }
      let changed = 0;
      for (const row of rows.values()) {
        const identity: unknown = JSON.parse(row.identity_summary_json);
        if (!identity || typeof identity !== "object" || Array.isArray(identity)) throw new Error(`Malformed token identity for '${row.run_id}'.`);
        const summary = identity as Record<string, unknown>;
        const tuple = { rootTeamRunId: row.root_team_run_id, rootAttributionStatus: row.root_attribution_status, identitySummary: summary };
        if (isAgentOrgTokenAttributionReady(tuple)) continue;
        if (row.root_team_run_id !== orgRunId || row.root_attribution_status !== "single"
          || !isDeepStrictEqual(summary.rootTeamRunIds, { status: "single", value: orgRunId })) {
          throw new Error(`Conflicting token attribution for Agent '${row.run_id}' in Org '${orgRunId}'.`);
        }
        const nextIdentity = JSON.stringify({ ...summary, rootTeamRunIds: { status: "unknown" } });
        const count = await tx.$executeRaw`UPDATE token_usage_run_records
          SET root_team_run_id = NULL, root_attribution_status = 'unknown', identity_summary_json = ${nextIdentity}
          WHERE run_id = ${row.run_id} AND root_team_run_id = ${orgRunId}
            AND root_attribution_status = 'single' AND identity_summary_json = ${row.identity_summary_json}`;
        if (count !== 1) throw new Error(`Token attribution precondition changed for '${row.run_id}'.`);
        const [actual] = await tx.$queryRaw<RawRecord[]>`SELECT * FROM token_usage_run_records WHERE run_id = ${row.run_id}`;
        const expected = { ...row, root_team_run_id: null, root_attribution_status: "unknown", identity_summary_json: nextIdentity };
        if (!isDeepStrictEqual(actual, expected) || !isAgentOrgTokenAttributionReady({
          rootTeamRunId: actual?.root_team_run_id, rootAttributionStatus: actual?.root_attribution_status,
          identitySummary: JSON.parse(actual!.identity_summary_json),
        })) throw new Error(`Token allowed-difference reread failed for '${row.run_id}'.`);
        changed++;
      }
      return changed;
    }, { maxWait: 30_000, timeout: 120_000 });
  }
}
