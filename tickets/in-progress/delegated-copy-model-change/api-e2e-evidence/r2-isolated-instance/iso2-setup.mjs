// Temporary API/E2E scaffolding (not durable coverage), round 2: an SE-team-like Team for the real-runtime per-member
// journey (AC-010 scenario: change the code reviewer of a delegated team copy), created through the instance's GraphQL API.
// Usage: node iso2-setup.mjs <backendUrl> <outFile>
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
const chosen = { reviewerStart: codex.find((id) => /5\.6-luna/.test(id)) ?? null, reviewerSwitch: codex.find((id) => /^gpt-6-luna$/.test(id)) ?? null }
const result = { codex, chosen, ids: {} }
if (!chosen.reviewerStart || !chosen.reviewerSwitch) { console.log(JSON.stringify(result)); throw new Error('Codex catalog lacks a needed model') }
const agent = async (key, name, instructions, defaultLaunchConfig) => {
  result.ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: {
    name, role: 'assistant', description: `${name} (per-member copy model change verification).`, instructions, toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id
}
await agent('manager', 'PM Manager', 'When the user asks you to delegate, call delegate_task exactly once with the recipient_address and description the user gives, then reply with the single word DONE. Do not call any other tool.', null)
await agent('lead', 'Review Lead', 'When you receive work, call send_message_to exactly once with recipient_address set to your teammate whose address ends with /code_reviewer and content "Review: the function adds two numbers. Reply with one short sentence.", then reply with the single word DONE. Do not call any other tool.', null)
await agent('reviewer', 'Code Reviewer', 'Reply with one short sentence. Never call any tool.', { runtimeKind: 'codex_app_server', llmModelIdentifier: chosen.reviewerStart, llmConfig: null })
await agent('writer', 'Doc Writer', 'Reply with one short sentence. Never call any tool.', null)
result.ids.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: {
  name: 'Review Team', description: 'SE-like review team (verification).', instructions: 'Work together briefly.', coordinatorMemberName: 'lead', handoffs: [],
  nodes: [['lead', 'lead'], ['code_reviewer', 'reviewer'], ['writer', 'writer']].map(([memberName, ref]) => ({ memberName, ref: result.ids[ref], refScope: 'SHARED' })) } })).createAgentTeamDefinition.id
await fs.writeFile(outFile, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ chosen, ids: result.ids }))
