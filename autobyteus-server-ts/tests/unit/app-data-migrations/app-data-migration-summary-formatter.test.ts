import { describe, expect, it } from "vitest";
import { formatAppDataMigrationSummary } from "../../../src/app-data-migrations/domain/app-data-migration-summary-formatter.js";

describe("formatAppDataMigrationSummary", () => {
  it("formats independent aggregate counts without including item details", () => {
    const summary = formatAppDataMigrationSummary({
      scannedCount: 158_025,
      migratedCount: 1_283,
      skippedCount: 17,
      failedCount: 2,
      details: Array.from({ length: 10_000 }, (_, index) => ({
        itemId: `item-${index}`,
        status: "SKIPPED" as const,
        message: `Skipped item ${index}`,
      })),
    });

    expect(summary).toBe(
      "Scanned 158025; migrated 1283; skipped 17; failed 2.",
    );
    expect(summary).not.toContain("item-");
  });
});
