// Temporary API/E2E scaffolding (not durable coverage): creates the definitions for the isolated-desktop journey
// (AC-015 shape) through the instance's public GraphQL API, choosing small real models from the instance's own catalogs.
// Usage: node iso-setup.mjs <backendUrl> <outFile>
import fs from 'node:fs/promises'

const [backendUrl, outFile] = process.argv.slice(2)
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors).slice(0, 600))
  return json.data
}
const models = async (runtimeKind) => (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: runtimeKind }))
  .providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier))
const prefer = (list, patterns) => patterns.map((p) => list.find((id) => p.test(id))).find(Boolean) ?? list[0] ?? null

const catalogs = { codex: await models('codex_app_server'), native: await models('autobyteus'), claude: await models('claude_agent_sdk') }
const chosen = {
  codex: prefer(catalogs.codex, [/mini/i, /spark/i, /nano/i]),
  native: prefer(catalogs.native, [/flash-lite/i, /flash/i, /mini/i, /haiku/i, /nano/i]),
  claude: prefer(catalogs.claude, [/^haiku$/i, /haiku/i]),
}
const result = { catalogs: Object.fromEntries(Object.entries(catalogs).map(([k, v]) => [k, v.length])), chosen, ids: {}, names: {} }
if (!chosen.codex || !chosen.native || !chosen.claude) { console.log(JSON.stringify(result)); throw new Error('a runtime catalog is empty') }

const agent = async (key, name, instructions, defaultLaunchConfig) => {
  result.names[key] = name
  result.ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, role: 'assistant', description: `${name} (delegated launch defaults verification).`, instructions, toolNames: [],
    ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
}
await agent('manager', 'ISO Manager', 'When the user asks you to delegate, call delegate_task exactly once with the recipient_address and description the user gives, then reply with the single word DONE. Do not call any other tool.', null)
await agent('lead', 'ISO Lead', 'When you receive work, call send_message_to exactly once with recipient_address set to your teammate whose address ends with /engineer and content "Reply OK.", then reply with the single word DONE. Do not call any other tool.',
  { runtimeKind: 'codex_app_server', llmModelIdentifier: chosen.codex, llmConfig: null })
await agent('engineer', 'ISO Engineer', 'Reply with the single word OK. Never call any tool.', { runtimeKind: 'autobyteus', llmModelIdentifier: chosen.native, llmConfig: null })
await agent('reviewer', 'ISO Reviewer', 'Reply with the single word OK. Never call any tool.', null)
await agent('auditor', 'ISO Auditor', 'Reply with the single word OK. Never call any tool.', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'iso-no-such-model', llmConfig: null })
result.names.team = 'ISO SE Team'
result.ids.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
  name: 'ISO SE Team', description: 'Verification team.', instructions: 'Work together briefly.', coordinatorMemberName: 'lead', handoffs: [],
  nodes: ['lead', 'engineer', 'reviewer', 'auditor'].map((memberName) => ({ memberName, ref: result.ids[memberName], refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
await fs.writeFile(outFile, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
