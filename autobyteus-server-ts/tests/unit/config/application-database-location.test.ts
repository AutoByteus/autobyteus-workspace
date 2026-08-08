import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ApplicationDatabaseLocation,
  ApplicationDatabaseLocationError,
  toPrismaSqliteUrl,
} from "../../../src/config/application-database-location.js";

describe("ApplicationDatabaseLocation", () => {
  it("formats Windows paths for Prisma without generic file URL slashes", () => {
    expect(toPrismaSqliteUrl("C:\\Users\\tester\\.autobyteus\\db\\production.db")).toBe(
      "file:C:/Users/tester/.autobyteus/db/production.db",
    );
  });

  it("formats POSIX paths for Prisma", () => {
    expect(toPrismaSqliteUrl("/var/lib/autobyteus/production.db")).toBe(
      "file:/var/lib/autobyteus/production.db",
    );
  });

  it("round-trips an absolute configured database location", () => {
    const appRoot = path.resolve("test-runtime");
    const configured = ApplicationDatabaseLocation.fromConfiguredFileUrl(
      "file:db/production.db",
      appRoot,
    );
    const roundTripped = ApplicationDatabaseLocation.fromAbsoluteFileUrl(configured.databaseUrl);

    expect(roundTripped).toEqual(configured);
    expect(roundTripped.databaseUrl).toBe(toPrismaSqliteUrl(configured.databasePath));
  });

  it("accepts a canonical absolute file URL at the import boundary", () => {
    const databasePath = path.resolve("test-runtime", "db", "production.db");
    const location = ApplicationDatabaseLocation.fromAbsoluteFileUrl(
      pathToFileURL(databasePath).href,
    );

    expect(location.databasePath).toBe(databasePath);
    expect(location.databaseUrl).toBe(toPrismaSqliteUrl(databasePath));
    expect(location.rootKeyPath).toBe(`${databasePath}.secret.key`);
  });

  it.runIf(process.platform === "win32")(
    "converts a canonical Windows file URL to Prisma datasource syntax",
    () => {
      const location = ApplicationDatabaseLocation.fromAbsoluteFileUrl(
        "file:///C:/Users/tester/.autobyteus/db/production.db",
      );

      expect(location.databasePath).toBe(
        "C:\\Users\\tester\\.autobyteus\\db\\production.db",
      );
      expect(location.databaseUrl).toBe(
        "file:C:/Users/tester/.autobyteus/db/production.db",
      );
    },
  );

  it.each([
    "",
    "file:",
    "file:relative.db",
    "https://example.invalid/production.db",
    "file:/tmp/production.db?mode=ro",
    "file:/tmp/production.db#fragment",
  ])("rejects invalid absolute database URL %s", (databaseUrl) => {
    expect(() => ApplicationDatabaseLocation.fromAbsoluteFileUrl(databaseUrl)).toThrow(
      ApplicationDatabaseLocationError,
    );
  });
});
