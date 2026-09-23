import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
export const evidence = path.dirname(new URL(import.meta.url).pathname);
export const info = JSON.parse(await fs.readFile(path.join(evidence, 'api-r2-stack.json'), 'utf8'));
export async function gql(query, variables = {}) {
 const response=await fetch(info.serverUrl+'/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(120000)});
 const data=await response.json(); assert(!data.errors, JSON.stringify(data.errors)); return data.data;
}
export const config = async id => (await gql(`query($id:String!){ getAgentOrgRunConfig(orgRunId:$id){orgRunId executionTree isActive editability{editable reason}} }`,{id})).getAgentOrgRunConfig;
export const stop = async id => (await gql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`,{id})).terminateAgentOrgRun;
export const restore = async id => (await gql(`mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`,{id})).restoreAgentOrgRun;
export const save = async (id,root) => (await gql(`mutation($input:UpdateStoppedAgentOrgRunConfigInput!){updateStoppedAgentOrgRunConfig(input:$input){success outcome message canonical isActive fieldErrors{path message}}}`,{input:{orgRunId:id,modelPatches:[],teamWorkspacePatches:[{teamAddress:'/team',workspaceRootPath:root}]}})).updateStoppedAgentOrgRunConfig;
