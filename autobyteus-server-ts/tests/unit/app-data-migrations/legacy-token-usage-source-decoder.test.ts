import { describe, expect, it } from "vitest";
import {
  legacySourceTokens,
  type LegacyTokenUsageLedgerRow,
} from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-row.js";
import {
  cumulativeSnapshotTokenFields,
} from "../../../src/token-usage/projections/cumulative-snapshot-reconciliation-metadata.js";

const sourceRow = (value: unknown): LegacyTokenUsageLedgerRow => Object.fromEntries([
  ...cumulativeSnapshotTokenFields.map((field) => [`source_${field}`, null]),
  ["source_reported_input_tokens", value],
]) as unknown as LegacyTokenUsageLedgerRow;

const fieldValue = (transport: unknown): bigint | null =>
  legacySourceTokens(sourceRow(transport))?.reported_input_tokens ?? null;

describe("legacy cumulative-source scalar decoder", () => {
  it.each([
    ["integer:0", 0n],
    ["integer:1", 1n],
    ["integer:9007199254740991", 9_007_199_254_740_991n],
  ] as const)("admits canonical transport %s exactly", (transport, expected) => {
    expect(fieldValue(transport)).toBe(expected);
  });

  it.each([
    1,
    1n,
    "1",
    ":1",
    "integer",
  ])("rejects malformed tagged transport %s", (transport) => {
    expect(() => fieldValue(transport)).toThrow(
      "Legacy token usage field 'source_reported_input_tokens' has invalid tagged JSON integer transport.",
    );
  });

  it.each([
    "real:1.0",
    "text:1",
    "true:1",
    "false:0",
    "array:[1]",
    "object:{\"value\":1}",
  ])("rejects unsupported JSON source transport %j", (transport) => {
    expect(() => fieldValue(transport)).toThrow(
      "Legacy token usage field 'source_reported_input_tokens' has an unsupported JSON source type.",
    );
  });

  it.each([
    "integer:",
    "integer:+1",
    "integer:-1",
    "integer:01",
    "integer:1.0",
    "integer:1e3",
    "integer:1:2",
    "integer: 1",
  ])("rejects noncanonical integer transport %j", (transport) => {
    expect(() => fieldValue(transport)).toThrow(
      "Legacy token usage field 'source_reported_input_tokens' is not a canonical nonnegative JSON integer.",
    );
  });

  it("rejects the first exact integer above SafeInt with a range-specific error", () => {
    expect(() => fieldValue("integer:9007199254740992")).toThrow(
      "Legacy token usage field 'source_reported_input_tokens' exceeds JavaScript SafeInt.",
    );
  });

  it("returns no checkpoint when every closed source field is NULL", () => {
    expect(legacySourceTokens(sourceRow(null))).toBeNull();
  });
});
