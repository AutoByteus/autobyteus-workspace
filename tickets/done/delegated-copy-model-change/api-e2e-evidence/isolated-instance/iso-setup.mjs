// Temporary API/E2E scaffolding (not durable coverage): definitions for the real-runtime check of
// delegated-copy-model-change in an isolated desktop instance, created through the instance's public GraphQL API.
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
const codex = await models('codex_app_server')
const native = await models('autobyteus')
const claude = await models('claude_agent_sdk')
const chosen = {
  codexStart: codex.find((id) => /5\.6-luna/.test(id)) ?? codex[0] ?? null,
  codexSwitch: codex.find((id) => /6-luna/.test(id) && !/5\.6/.test(id)) ?? codex.find((id) => !/5\.6-luna/.test(id)) ?? null,
  native: native.find((id) => id === 'deepseek-v4-flash') ?? null,
  claude: claude.includes('haiku') ? 'haiku' : null,
}
const result = { catalogs: { codex, native, claude: claude.length }, chosen, ids: {} }
if (!chosen.codexStart || !chosen.codexSwitch || !chosen.native || !chosen.claude) { console.log(JSON.stringify(result)); throw new Error('a runtime catalog lacks a needed model') }
const agent = async (key, name, instructions, defaultLaunchConfig) => {
  result.ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, role: 'assistant', description: `${name} (copy model change verification).`, instructions, toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
}
await agent('manager', 'PM Manager', 'When the user asks you to delegate, call delegate_task exactly once with the recipient_address and description the user gives, then reply with the single word DONE. Do not call any other tool.', null)
await agent('codexWriter', 'Codex Writer', 'Reply with one short sentence. Never call any tool.', { runtimeKind: 'codex_app_server', llmModelIdentifier: chosen.codexStart, llmConfig: null })
await agent('nativeWriter', 'Native Writer', 'Reply with one short sentence. Never call any tool.', { runtimeKind: 'autobyteus', llmModelIdentifier: chosen.native, llmConfig: null })
await fs.writeFile(outFile, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ chosen, ids: result.ids, codex }))
