import { DatabaseSync } from "node:sqlite";
import { expect } from "vitest";

/**
 * The migration ledger of an install upgraded from a release (autobyteus-619 REQ-001): every migration that release ran is
 * recorded, the migrations it never ran are not. A startup test that places released data on an empty ledger instead runs
 * every historical migration on data already past them, which no install ever does.
 *
 * Made the way an install made it: a first start of this build on the empty data folder records every registered migration;
 * then the rows of the migrations the modeled release never ran are deleted. The released data is placed after this.
 */
export type FaithfulUpgradeLedger = Readonly<{
  /** Every migration this build registers, in registration order (the ledger of the first start). */
  registered: readonly string[];
  /** The migrations the modeled release never ran: they run on the start under test. */
  neverRan: readonly string[];
}>;

/** The migrations from `firstNeverRan` on, in registration order: a release that ran every migration before it. */
export const migrationsFrom = (firstNeverRan: string) => (registered: readonly string[]): readonly string[] => {
  const index = registered.indexOf(firstNeverRan);
  if (index < 0) throw new Error(`${firstNeverRan} is not registered in this build.`);
  return registered.slice(index);
};

export const faithfulUpgradeLedger = async (input: Readonly<{
  /** The data folder's database, the one the server under test starts on. */
  databaseFile: string;
  /** Starts this build on the empty data folder, returns its migrations in registration order, and stops it. */
  firstStart: () => Promise<readonly string[]>;
  neverRan: (registered: readonly string[]) => readonly string[];
}>): Promise<FaithfulUpgradeLedger> => {
  const registered = [...await input.firstStart()];
  const neverRan = [...input.neverRan(registered)];
  for (const id of neverRan) expect(registered, `${id} is registered`).toContain(id);
  const db = new DatabaseSync(input.databaseFile);
  try {
    const remove = db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?");
    for (const id of neverRan) remove.run(id);
    const remaining = (db.prepare("SELECT migration_id FROM app_data_migration_records").all() as Array<{ migration_id: string }>)
      .map((row) => row.migration_id).sort();
    expect(remaining, "every migration the release ran stays recorded").toEqual(registered.filter((id) => !neverRan.includes(id)).sort());
  } finally {
    db.close();
  }
  return Object.freeze({ registered, neverRan });
};

/**
 * The ledger after the start under test (AC-001): no migration the release ran runs again (each keeps the one attempt of the
 * first start), and one line per migration that ran on it, its ID and status, for the run log.
 */
export const migrationsOfStartUnderTest = (
  ledger: FaithfulUpgradeLedger,
  migrations: ReadonlyArray<Readonly<{ migrationId: string; status: string; attempts: number }>>,
): string => {
  const rerun = migrations.filter((migration) => !ledger.neverRan.includes(migration.migrationId) && migration.attempts !== 1);
  expect(rerun.map((migration) => `${migration.migrationId} attempts ${migration.attempts}`), "no migration the release ran runs again").toEqual([]);
  return migrations.filter((migration) => ledger.neverRan.includes(migration.migrationId))
    .map((migration) => `${migration.migrationId} ${migration.status}`).join("\n");
};
