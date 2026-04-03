import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../../..");

const probePrismaQueryLogging = (
  envOverrides: Record<string, string | undefined> = {},
): { logLevel: string | null; logQueries: boolean | null } => {
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      [
        'import { rootPrismaClient } from "repository_prisma";',
        'console.log(JSON.stringify({',
        "  logLevel: rootPrismaClient._engineConfig?.logLevel ?? null,",
        "  logQueries: rootPrismaClient._engineConfig?.logQueries ?? null,",
        "}));",
        "await rootPrismaClient.$disconnect();",
      ].join(" "),
    ],
    {
      cwd: serverRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...envOverrides,
      },
    },
  ).trim();

  return JSON.parse(output) as { logLevel: string | null; logQueries: boolean | null };
};

describe("Prisma query log policy", () => {
  it("disables Prisma SQL query logging by default", () => {
    const result = probePrismaQueryLogging({
      PRISMA_LOG_QUERIES: undefined,
    });

    expect(result).toEqual({
      logLevel: "info",
      logQueries: false,
    });
  });

  it("enables Prisma SQL query logging when PRISMA_LOG_QUERIES=1", () => {
    const result = probePrismaQueryLogging({
      PRISMA_LOG_QUERIES: "1",
    });

    expect(result).toEqual({
      logLevel: "info",
      logQueries: true,
    });
  });

  it("treats false-like values as disabled", () => {
    const result = probePrismaQueryLogging({
      PRISMA_LOG_QUERIES: "false",
    });

    expect(result).toEqual({
      logLevel: "info",
      logQueries: false,
    });
  });
});
