#!/usr/bin/env node
// Temporary ticket setup (autobyteus-139, DESK-01). Creates demo data on an isolated instance through its
// public GraphQL API (TESTING.md › Data): the LM Studio catalog, writer agents, a Team (alpha, beta), an Org
// (alpha, beta), a PM agent that can delegate, and one Team run and one Org run on the local model.
// The runs are then opened and driven in the instance UI. Prints the created ids as JSON.
// Usage: node desk-setup.mjs --backend http://127.0.0.1:<serverPort> --workspace <abs dir>
const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const backend = arg("--backend"); const workspace = arg("--workspace");
const gql = async (query, variables = {}) => {
  const r = await fetch(`${backend}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors).slice(0, 600)); return b.data;
};
const cat = await gql(`mutation{ensureProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
const model = cat.ensureProviderModelCatalog.llmModels.map((m) => m.modelIdentifier).find((id) => id.startsWith("qwen/qwen3.6-35b-a3b:lmstudio@"));
const WRITER = "Answer in plain prose paragraphs, no headings, no lists. Do not use tools.";
const agent = async (name, instructions, toolNames = []) => (await gql(`mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}`,
  { i: { name, role: "assistant", description: `${name} (DESK-01)`, instructions, category: "probe", toolNames, skillNames: [] } })).createAgentDefinition.id;
const alpha = await agent("Desk Alpha", WRITER); const beta = await agent("Desk Beta", WRITER);
await agent("Desk Essay Worker", WRITER);
const pm = await agent("Desk PM", "You coordinate work. When asked to delegate, call delegate_task with the given arguments and nothing else.", ["list_available_agents"]);
const team = (await gql(`mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}`, { i: {
  name: "Desk Team", description: "DESK-01 team", instructions: "Members answer the user directly.", coordinatorMemberName: "alpha",
  nodes: [{ memberName: "alpha", ref: alpha, refScope: "SHARED" }, { memberName: "beta", ref: beta, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
const org = (await gql(`mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}`, { i: {
  name: "Desk Org", description: "DESK-01 org", instructions: "Members answer the user directly.",
  members: [{ memberName: "alpha", ref: alpha, refType: "AGENT", refScope: "SHARED" }, { memberName: "beta", ref: beta, refType: "AGENT", refScope: "SHARED" }], handoffs: [] } })).createAgentOrgDefinition.id;
const config = { workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus" };
const teamRun = (await gql(`mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}`, { i: {
  teamDefinitionId: team, teamConfigs: [{ teamAddress: "/", ...config }],
  memberConfigs: [{ memberAddress: "/alpha", agentDefinitionId: alpha, ...config }, { memberAddress: "/beta", agentDefinitionId: beta, ...config }] } })).createAgentTeamRun;
const orgRun = (await gql(`mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}`, { i: {
  agentOrgDefinitionId: org, rootConfiguration: config, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
console.log(JSON.stringify({ model, agents: { alpha, beta, pm }, team, org, teamRun, orgRun }, null, 1));
