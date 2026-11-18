import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * autobyteus-345 (REQ-001, REQ-002, AC-001, AC-003): the server package carries only what runs. `package.json` `files` is the
 * one statement of what ships (`pnpm deploy` and `npm pack` both apply it), and the Prisma CLI, which the running server
 * starts to migrate its database, is a production dependency so `pnpm deploy --prod` keeps it. The real folder is proved by
 * the clean-clone build and the packaged-server startup check; this test guards the declarations and the file list.
 */
const SERVER = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(readFileSync(join(SERVER, "package.json"), "utf8")) as {
  files?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const listPackedFiles = (): string[] => {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: SERVER,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  expect(result.status, result.stderr).toBe(0);
  const [pack] = JSON.parse(result.stdout) as Array<{ files: Array<{ path: string }> }>;
  return pack!.files.map((file) => file.path);
};

describe("the server package", () => {
  let files: string[] = [];
  beforeAll(() => { files = listPackedFiles(); }, 120_000);

  it("lists exactly dist, prisma and application-packages", () => {
    expect(manifest.files).toEqual(["dist", "prisma", "application-packages"]);
  });

  it("declares the Prisma CLI as a production dependency, once", () => {
    expect(manifest.dependencies?.prisma).toBeTruthy();
    expect(manifest.devDependencies?.prisma).toBeUndefined();
  });

  it("has no file nothing refers to (canuse-ok.txt is gone)", () => {
    expect(existsSync(join(SERVER, "canuse-ok.txt"))).toBe(false);
  });

  it("packs the runtime content and nothing else", () => {
    for (const folder of ["src/", "tests/", "tickets/", "docs/", "docker/", "scripts/", "node_modules/"]) {
      expect(files.filter((path) => path.startsWith(folder)), folder).toEqual([]);
    }
    expect(files.filter((path) => /^(tsconfig.*\.json|vitest\.config\.ts|AGENTS\.md|canuse-ok\.txt|\.env.*)$/.test(path))).toEqual([]);
    expect(files).toEqual(expect.arrayContaining(["package.json", "LICENSE", "prisma/schema.prisma"]));
    expect(files.some((path) => /^prisma\/migrations\/[^/]+\/migration\.sql$/.test(path))).toBe(true);
    expect(files.filter((path) => !/^(dist|prisma|application-packages)\//.test(path)).sort())
      .toEqual(["LICENSE", "README.md", "package.json"]);
    // The build output is part of the package when it has been built (a clean unit run has no dist yet).
    if (existsSync(join(SERVER, "dist", "app.js"))) {
      expect(files).toEqual(expect.arrayContaining(["dist/app.js", "dist/index.js"]));
    }
  });

  it("keeps every migration folder of prisma/ in the package", () => {
    const folders = readdirSync(join(SERVER, "prisma", "migrations"), { withFileTypes: true }).filter((entry) => entry.isDirectory());
    for (const folder of folders) {
      expect(files, folder.name).toContain(`prisma/migrations/${folder.name}/migration.sql`);
    }
  });
});
