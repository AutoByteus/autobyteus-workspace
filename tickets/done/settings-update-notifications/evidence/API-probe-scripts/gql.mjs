// Runs one of the renderer's GraphQL documents against an instance. Usage: node gql.mjs <graphqlUrl> <file.ts> <DOC_NAME> [jsonVars]
import fs from 'node:fs';
const [endpoint, file, name, vars] = process.argv.slice(2);
const src = fs.readFileSync(`/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/autobyteus-web/graphql/${file}`, 'utf8');
const t = Object.fromEntries([...src.matchAll(/export const (\w+) = gql`([\s\S]*?)`/g)].map((m) => [m[1], m[2]]));
const query = t[name].replace(/\$\{(\w+)\}/g, (_a, n) => t[n] ?? '');
const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables: vars ? JSON.parse(vars) : undefined }) });
process.stdout.write(JSON.stringify(await res.json(), null, 2) + '\n');
