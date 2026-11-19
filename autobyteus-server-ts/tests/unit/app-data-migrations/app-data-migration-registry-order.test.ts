import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";

/**
 * The registry's order is the order migrations run in on data that has not run them yet (CR-461-048). A released
 * migration keeps its place, and no new migration runs ahead of one: data that has not yet run a released migration
 * would otherwise meet the new one in a shape no released build left it in.
 *
 * The released order is recorded by each release (`tests/release/record-released-migration-order.test.ts`, run by
 * `scripts/desktop-release.sh` before its release commit; autobyteus-500 G-1): nobody keeps a list by hand.
 */
const RELEASED = JSON.parse(fs.readFileSync(new URL("../../../src/app-data-migrations/released-migration-order.json", import.meta.url), "utf8")) as string[];

const dateOf = (id: string) => id.slice(0, 8);

/** The order rule (D-1): the registry starts with the released order; later entries are dated after it, in date order. */
const orderProblems = (released: readonly string[], ids: readonly string[]): string[] => {
  const problems: string[] = [];
  if (JSON.stringify(ids.slice(0, released.length)) !== JSON.stringify(released)) problems.push("a released entry moved");
  const later = ids.slice(released.length);
  const newestReleased = released.map(dateOf).sort().at(-1)!;
  if (later.some((id) => dateOf(id) < newestReleased)) problems.push("a new entry is dated before the newest released one");
  if (JSON.stringify(later.map(dateOf)) !== JSON.stringify([...later.map(dateOf)].sort())) problems.push("new entries are not in date order");
  return problems;
};

describe("app-data migration registry order (CR-461-048)", () => {
  const ids = new AppDataMigrationRegistry().listDefinitions().map((definition) => definition.id);

  it("the released order is recorded (a release writes it) and is not empty", () => {
    expect(RELEASED.length).toBeGreaterThanOrEqual(46); // v1.5.14-beta.1
    expect(new Set(RELEASED).size).toBe(RELEASED.length);
  });

  it("the released migrations come first, in their released order", () => {
    expect(ids.slice(0, RELEASED.length)).toEqual(RELEASED);
  });

  it("every later migration runs after them, in date order, none dated before the newest released one", () => {
    const later = ids.slice(RELEASED.length);
    const newestReleased = RELEASED.map(dateOf).sort().at(-1)!;
    expect(later.filter((id) => dateOf(id) < newestReleased)).toEqual([]);
    expect(later.map(dateOf)).toEqual([...later.map(dateOf)].sort());
  });

  it("the registry meets the rule", () => {
    expect(orderProblems(RELEASED, ids)).toEqual([]);
  });

  it("AC-009: moving a released entry, inserting one before it, or appending one dated earlier breaks the rule", () => {
    const moved = [...RELEASED]; [moved[3], moved[4]] = [moved[4]!, moved[3]!];
    expect(orderProblems(RELEASED, moved)).toContain("a released entry moved");
    expect(orderProblems(RELEASED, ["20261116_inserted", ...RELEASED])).toContain("a released entry moved");
    expect(orderProblems(RELEASED, [...RELEASED, "20250101_dated_earlier"])).toContain("a new entry is dated before the newest released one");
    expect(orderProblems(RELEASED, [...RELEASED, "20261201_b", "20261130_a"])).toContain("new entries are not in date order");
    expect(orderProblems(RELEASED, [...RELEASED, "20261130_a", "20261201_b"])).toEqual([]);
  });

  it("autobyteus-461's migration runs after the Skill Improvement removal, which deletes the improver's helper runs first", () => {
    expect(ids.indexOf("20261111_delegated_runs_own_runs_v1")).toBeGreaterThan(ids.indexOf("20261020_remove_skill_improvement_data"));
  });
});
