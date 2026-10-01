// Minimal GraphQL client for validation probes: node gql.mjs <baseUrl> <query> [variablesJson]
const [base, query, vars] = process.argv.slice(2);
const res = await fetch(`${base}/graphql`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query, variables: vars ? JSON.parse(vars) : {} }),
});
const text = await res.text();
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(res.status, text); }
