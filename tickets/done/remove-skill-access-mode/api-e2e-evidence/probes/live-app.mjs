import fs from 'node:fs'; import path from 'node:path';
const [pkgPath, dataRoot, outFile] = process.argv.slice(2);
const BASE = 'http://127.0.0.1:8000'; const out = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query, variables = {}) => { const res = await fetch(`${BASE}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); return res.json(); };
const app = async (applicationId, request) => { const res = await fetch(`${BASE}/rest/applications/${encodeURIComponent(applicationId)}/backend/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestContext: { applicationId }, request }) }); const text = await res.text(); try { return { status: res.status, body: JSON.parse(text) }; } catch { return { status: res.status, text: text.slice(0, 600) }; } };
out.kinds = ["LOCAL_PATH"];
out.capability = await gql(`mutation { setApplicationsEnabled(enabled: true) { __typename } }`);
out.applications = await gql(`{ listApplications { id name } }`);
if (!out.applications.data?.listApplications?.some((a) => /brief/i.test(a.name))) out.import = await gql(`mutation($input: ImportApplicationPackageInput!){ importApplicationPackage(input:$input){ packageId displayName } }`, { input: { sourceKind: out.kinds.find((k) => /LOCAL|PATH/.test(k)) ?? out.kinds[0], source: pkgPath } });
for (let i = 0; i < 20; i += 1) { out.applications = await gql(`{ listApplications { id name } }`); if (out.applications.data?.listApplications?.some((a) => /brief/i.test(a.name))) break; await sleep(1000); }
const brief = out.applications.data?.listApplications?.find((a) => /brief/i.test(a.name));
if (brief) {
  out.createBrief = await app(brief.id, { query: `mutation CreateBriefMutation($input: CreateBriefInput!) { createBrief(input: $input) { briefId title status latestRunId } }`, operationName: 'CreateBriefMutation', variables: { input: { title: 'RSAM live brief' } } });
  const briefId = out.createBrief.body?.result?.data?.createBrief?.briefId ?? out.createBrief.body?.data?.createBrief?.briefId;
  out.briefId = briefId;
  if (briefId) {
    out.launch = await app(brief.id, { query: `mutation LaunchDraftRunMutation($input: LaunchDraftRunInput!) { launchDraftRun(input: $input) { briefId bindingId runId status } }`, operationName: 'LaunchDraftRunMutation', variables: { input: { briefId, llmModelIdentifier: 'gpt-5.5' } } });
    const launched = JSON.stringify(out.launch); const runId = (launched.match(/"runId":"([^"]+)"/) ?? [])[1]; out.runId = runId;
    if (runId) {
      await sleep(4000);
      out.resume = await gql(`query($id:String!){ getTeamRunResumeConfig(teamRunId:$id){ teamRunId isActive executionTree } }`, { id: runId });
      const treePath = path.join(dataRoot, 'memory', 'agent_teams', runId, 'team_run_execution_tree.json');
      out.treeFile = fs.existsSync(treePath) ? { exists: true, hasField: /skill_?access/i.test(fs.readFileSync(treePath, 'utf8')) } : { exists: false };
      out.terminate = await gql(`mutation($id:String!){ terminateAgentTeamRun(teamRunId:$id){ success message } }`, { id: runId });
    }
  }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ kinds: out.kinds, import: out.import, apps: out.applications, createBrief: out.createBrief, launch: out.launch, runId: out.runId, isActive: out.resume?.data?.getTeamRunResumeConfig?.isActive, resumeErr: out.resume?.errors, treeFile: out.treeFile, terminate: out.terminate }, null, 1).slice(0, 3500));
