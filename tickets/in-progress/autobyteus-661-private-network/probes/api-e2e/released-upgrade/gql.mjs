// node gql.mjs <secrets.json> <name> '<query>' ['<variables json>']: one owner GraphQL call; prints the answer.
import fs from 'node:fs'
const [file, name, query, vars] = process.argv.slice(2)
const { url, credential } = JSON.parse(fs.readFileSync(file, 'utf8'))[name]
const r = await fetch(`${url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${credential}` }, body: JSON.stringify({ query, variables: vars ? JSON.parse(vars) : {} }) })
console.log(JSON.stringify(await r.json()))
