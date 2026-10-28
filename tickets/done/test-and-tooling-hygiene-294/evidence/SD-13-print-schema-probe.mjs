// Prints the server's GraphQL schema from a built dist to a file (stdout is unsafe: singletons log to it, and exit truncates pipes).
const [dist, out] = process.argv.slice(2);
await import("reflect-metadata");
const { printSchema } = await import("graphql");
const { writeFileSync } = await import("node:fs");
const { buildGraphqlSchema } = await import(dist + "/api/graphql/schema.js");
writeFileSync(out, printSchema(await buildGraphqlSchema()));
process.exit(0);
