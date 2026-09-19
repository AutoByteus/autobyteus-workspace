import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  AgentOrgTokenAttributionDataRejection,
  AgentOrgTokenAttributionRepository,
} from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-repository.js";

type Row = Record<string, unknown> & {
  run_id: string;
  root_team_run_id: string | null;
  root_attribution_status: string;
  identity_summary_json: string;
};

const legacyRow = (overrides: Partial<Row> = {}): Row => ({
  run_id: "member",
  root_team_run_id: "org",
  root_attribution_status: "single",
  identity_summary_json: JSON.stringify({ rootTeamRunIds: { status: "single", value: "org" }, retained: "value" }),
  retained_column: "unchanged",
  ...overrides,
});

const expectedReadyRow = (row: Row): Row => ({
  ...row,
  root_team_run_id: null,
  root_attribution_status: "unknown",
  identity_summary_json: JSON.stringify({
    ...JSON.parse(row.identity_summary_json),
    rootTeamRunIds: { status: "unknown" },
  }),
});

const repositoryWith = (input: {
  claimants?: readonly Row[];
  members?: readonly Row[];
  updateCount?: number;
  reread?: Row | undefined;
  queryFailure?: Error;
  updateFailure?: Error;
  transactionFailure?: Error;
} = {}) => {
  const row = input.members?.[0] ?? legacyRow();
  const query = vi.fn();
  if (input.queryFailure) query.mockRejectedValueOnce(input.queryFailure);
  else {
    query.mockResolvedValueOnce(input.claimants ?? []);
    query.mockResolvedValueOnce(input.members ?? [row]);
    query.mockResolvedValueOnce(input.reread === undefined ? [expectedReadyRow(legacyRow())] : input.reread ? [input.reread] : []);
  }
  const update = input.updateFailure
    ? vi.fn().mockRejectedValue(input.updateFailure)
    : vi.fn().mockResolvedValue(input.updateCount ?? 1);
  const tx = { $queryRaw: query, $executeRaw: update };
  const transaction = input.transactionFailure
    ? vi.fn().mockRejectedValue(input.transactionFailure)
    : vi.fn(async (work: (client: typeof tx) => Promise<number>) => work(tx));
  const repository = new AgentOrgTokenAttributionRepository({ $transaction: transaction } as unknown as PrismaClient);
  return { repository, query, update, transaction };
};

const rejectionFrom = async (promise: Promise<unknown>): Promise<unknown> => promise.then(
  () => null,
  (error: unknown) => error,
);

describe("AgentOrgTokenAttributionRepository data rejection boundary", () => {
  it("types an unexpected claimant as root-local legacy data rejection", async () => {
    const { repository, update } = repositoryWith({ claimants: [legacyRow({ run_id: "outside" })] });

    const error = await rejectionFrom(repository.convertRoot("org", ["member"]));

    expect(error).toBeInstanceOf(AgentOrgTokenAttributionDataRejection);
    expect(String(error)).toContain("Unexpected token claimant 'outside'");
    expect(update).not.toHaveBeenCalled();
  });

  it("types unparseable identity JSON as root-local legacy data rejection", async () => {
    const { repository, update } = repositoryWith({ members: [legacyRow({ identity_summary_json: "not-json" })] });

    const error = await rejectionFrom(repository.convertRoot("org", ["member"]));

    expect(error).toBeInstanceOf(AgentOrgTokenAttributionDataRejection);
    expect(String(error)).toContain("not valid JSON");
    expect(update).not.toHaveBeenCalled();
  });

  it.each(["null", "[]", "{}", '{"rootTeamRunIds":null}', '{"rootTeamRunIds":[]}'])("types migration-invalid parsed identity %s as data rejection", async (identity_summary_json) => {
    const { repository, update } = repositoryWith({ members: [legacyRow({ identity_summary_json })] });

    const error = await rejectionFrom(repository.convertRoot("org", ["member"]));

    expect(error).toBeInstanceOf(AgentOrgTokenAttributionDataRejection);
    expect(String(error)).toContain("Malformed token identity");
    expect(update).not.toHaveBeenCalled();
  });

  it("types a conflicting legacy attribution tuple as data rejection", async () => {
    const row = legacyRow({ root_attribution_status: "mixed" });
    const { repository, update } = repositoryWith({ members: [row] });

    const error = await rejectionFrom(repository.convertRoot("org", ["member"]));

    expect(error).toBeInstanceOf(AgentOrgTokenAttributionDataRejection);
    expect(String(error)).toContain("Conflicting token attribution");
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ["query", { queryFailure: new Error("query unavailable") }],
    ["update", { updateFailure: new Error("update unavailable") }],
    ["precondition", { updateCount: 0 }],
    ["strict reread", { reread: legacyRow() }],
    ["unknown transaction", { transactionFailure: new Error("unexpected transaction failure") }],
  ] as const)("does not type %s failure as source-data rejection", async (_name, input) => {
    const { repository } = repositoryWith(input);

    const error = await rejectionFrom(repository.convertRoot("org", ["member"]));

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AgentOrgTokenAttributionDataRejection);
  });
});
