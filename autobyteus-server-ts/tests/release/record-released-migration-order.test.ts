import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appConfigProvider } from "../../src/config/app-config-provider.js";
import { AppDataMigrationRegistry } from "../../src/app-data-migrations/app-data-migration-registry.js";

/**
 * Records the app-data migration order a release ships (autobyteus-500 G-1, FU-027 option 1). `scripts/desktop-release.sh`
 * runs it before its release commit (`pnpm -C autobyteus-server-ts migrations:record-released`, which sets
 * RECORD_RELEASED_MIGRATION_ORDER=1), so the tag holds exactly the order it shipped; the order test
 * (`app-data-migration-registry-order.test.ts`) reads the file. Nobody edits it by hand. It runs through vitest, the
 * server's own TypeScript runner, so the release needs no other tool. Skipped in every other run.
 *
 * It refuses, writing nothing, when the registry does not start with the recorded list: a release can't record a
 * reordered list, even when the order test was skipped.
 */
const RECORD = new URL("../../src/app-data-migrations/released-migration-order.json", import.meta.url);
const RECORDING = process.env["RECORD_RELEASED_MIGRATION_ORDER"] === "1";

describe("the released app-data migration order", () => {
  it.runIf(RECORDING)("is written from the registry, which must start with the order already recorded", () => {
    appConfigProvider.initialize({ appDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "released-migration-order-")) });
    const recorded = JSON.parse(fs.readFileSync(RECORD, "utf8")) as string[];
    const ids = new AppDataMigrationRegistry().listDefinitions().map((definition) => definition.id);
    expect(ids.slice(0, recorded.length), "a released migration keeps its place; append new ones after the last. Nothing was written.")
      .toEqual(recorded);
    fs.writeFileSync(RECORD, `${JSON.stringify(ids, null, 2)}\n`);
    console.log(`Recorded ${ids.length} app-data migrations (${ids.length - recorded.length} new).`);
  });
});
