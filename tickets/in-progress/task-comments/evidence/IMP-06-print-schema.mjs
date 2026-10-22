// Prints the GraphQL SDL of a built server (dist) to a file, for web codegen against this worktree's schema.
import "reflect-metadata";
import { printSchema } from "graphql";
import { writeFileSync } from "node:fs";
const [distSchema, out] = process.argv.slice(2);
const { buildGraphqlSchema } = await import(distSchema);
writeFileSync(out, printSchema(await buildGraphqlSchema()));
console.log("schema written");
process.exit(0);
