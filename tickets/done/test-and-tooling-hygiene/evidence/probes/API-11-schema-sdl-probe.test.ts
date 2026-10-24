/**
 * API-11 (autobyteus-253, API/E2E): temporary probe. Prints the SDL of the studio GraphQL schema, built twice in one
 * process, with whatever `type-graphql` is installed, and records the installed version. Not a committed test
 * (a copy is kept in the ticket's evidence/probes/). Run once on rc.4 and once with rc.3 swapped in:
 *   API253_SDL_OUT=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/tmp-probe/api253-schema-sdl.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { buildGraphqlSchema } from "../../src/api/graphql/schema.js";

it("prints the schema SDL of two builds", async () => {
  const require = createRequire(import.meta.url);
  const typeGraphqlEntry = require.resolve("type-graphql");
  const typeGraphqlRoot = path.dirname(typeGraphqlEntry);
  let packageDir = typeGraphqlRoot;
  while (!fs.existsSync(path.join(packageDir, "package.json")) || JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8")).name !== "type-graphql") {
    packageDir = path.dirname(packageDir);
  }
  const version = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8")).version as string;
  const { printSchema } = await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }));
  const first = printSchema(await buildGraphqlSchema()) as string;
  const second = printSchema(await buildGraphqlSchema()) as string;
  const out = process.env["API253_SDL_OUT"];
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `schema-${version}-build1.graphql`), first);
    fs.writeFileSync(path.join(out, `schema-${version}-build2.graphql`), second);
  }
  console.log(`API253_SDL version=${version} realpath=${fs.realpathSync(packageDir)} build1Lines=${first.split("\n").length} build2Lines=${second.split("\n").length} sameText=${first === second}`);
  expect(first.length).toBeGreaterThan(1000);
});
