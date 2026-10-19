#!/usr/bin/env node
// Creates the team (J2) and organization (J3) runs on the Claude runtime through public GraphQL, so the UI journeys start from them.
// Usage: node create-live-roots.mjs <backendUrl> <seeded.json> <workspace> <team|org> [model] [runtime]
const [backend, seededPath, workspace, kind, model = "claude-haiku-5-5", runtime = "claude_agent_sdk"] = process.argv.slice(2);
import { readFileSync } from "node:fs";
const seeded = JSON.parse(readFileSync(seededPath, "utf8"));
const gql = async (query, variables) => {
  const response = await fetch(new URL("/graphql", backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length || !body.data) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const config = { workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: runtime };
if (kind === "team") {
  const created = (await gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`, { input: {
    teamDefinitionId: seeded.reviewCrew.id, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [
      { memberAddress: "/writer", agentDefinitionId: seeded.writer.id, ...config },
      { memberAddress: "/reviewer", agentDefinitionId: seeded.reviewer.id, ...config }] } })).createAgentTeamRun;
  console.log(JSON.stringify(created));
} else {
  const created = (await gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`, { input: {
    agentOrgDefinitionId: seeded.studio.id, rootConfiguration: config, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  console.log(JSON.stringify(created));
}
