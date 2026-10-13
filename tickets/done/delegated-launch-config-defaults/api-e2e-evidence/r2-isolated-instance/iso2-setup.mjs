// Temporary API/E2E scaffolding (not durable coverage), round 4 (IR-003): definitions for the user's reported journey
// (screenshot 37: plain New chat → typed text → heading switcher → Marketing Team) in an isolated desktop instance with
// real runtime catalogs, created through the instance's public GraphQL API. Usage: node iso2-setup.mjs <backendUrl> <outFile>
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
const codex = await models('codex_app_server')
const claude = await models('claude_agent_sdk')
const chosen = { codex: codex.find((id) => /luna/.test(id)) ?? codex[0] ?? null, claude: claude.includes('haiku') ? 'haiku' : claude.find((id) => /haiku/.test(id)) ?? null }
const result = { catalogs: { codex: codex.length, claude: claude.length }, chosen, ids: {} }
if (!chosen.codex || !chosen.claude) { console.log(JSON.stringify(result)); throw new Error('a runtime catalog is empty') }
const agent = async (key, name, instructions, defaultLaunchConfig) => {
  result.ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, role: 'assistant', description: `${name} (launch defaults verification).`, instructions, toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
}
await agent('manager', 'PM Manager', 'When the user asks you to delegate, call delegate_task exactly once with the recipient_address and description the user gives, then reply with the single word DONE. Do not call any other tool.', null)
await agent('strategist', 'Marketing Strategist', 'Reply with the single word DONE. Never call any tool.', { runtimeKind: 'codex_app_server', llmModelIdentifier: chosen.codex, llmConfig: null })
await agent('copywriter', 'Marketing Copywriter', 'Reply with the single word OK. Never call any tool.', { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: chosen.claude, llmConfig: null })
await agent('analyst', 'Marketing Analyst', 'Reply with the single word OK. Never call any tool.', null)
await agent('auditor', 'Marketing Auditor', 'Reply with the single word OK. Never call any tool.', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'iso-no-such-model', llmConfig: null })
result.ids.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
  name: 'Marketing Team', description: 'Marketing (verification).', instructions: 'Work together briefly.', coordinatorMemberName: 'strategist', handoffs: [],
  nodes: ['strategist', 'copywriter', 'analyst', 'auditor'].map((memberName) => ({ memberName, ref: result.ids[memberName], refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
await fs.writeFile(outFile, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
