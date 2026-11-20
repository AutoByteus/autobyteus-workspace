// followup-cleanups-568 API/E2E API-01 (temporary): the built server's GraphQL schema after D-1.
// Starts <repo>/autobyteus-server-ts/dist/app.js (the FS-DOCKER fresh clone's build) on 127.0.0.1 with a temp data root and
// HOME and its own launch credential (never printed), then:
//   1. sends the removed `approveToolInvocation` mutation as an older client would → a GraphQL validation error;
//   2. introspects the Mutation and Query types and the schema's type names: no approveToolInvocation or its types;
//      the out-of-scope fields (restoreAgentRun, agentRunCollaborationMemberProjection) and the resolver's other
//      mutations are still there;
//   3. a live mutation of the same resolver (terminateAgentRun for an unknown id) still answers.
// Args: <repo> <evidence file>
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net';
import { spawn } from 'node:child_process'; import { randomBytes } from 'node:crypto';
const [REPO, OUT] = process.argv.slice(2); const S = `${REPO}/autobyteus-server-ts`;
const lines = []; const log = (...a) => { lines.push(a.join(' ')); console.log(a.join(' ')); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const owner = `own_${randomBytes(32).toString('base64url')}`;
const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const base = `http://127.0.0.1:${port}`;
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'abtest568-node-')));
const data = path.join(root, 'data'); const home = path.join(root, 'home'); fs.mkdirSync(data); fs.mkdirSync(home);
fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${base}\nLOG_LEVEL=WARN\n`);
let child; let ok = true;
const check = (name, cond, detail) => { ok &&= cond; log(`${cond ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };
try {
  log(`# API-01: ${S}/dist/app.js on ${base.replace(String(port), '<port>')}; temp data root; ${new Date().toISOString()}`);
  child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], { cwd: S,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: base, AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner },
    stdio: ['ignore', 'ignore', 'ignore'] });
  let up = false; for (let i = 0; i < 180 && !(up = await fetch(`${base}/rest/health`).then((r) => r.ok).catch(() => false)); i++) await sleep(1000);
  if (!up) throw new Error('server did not start');
  log('server up: /rest/health 200');
  const post = async (query, variables) => (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query, variables }) })).json();
  const removed = await post('mutation($i: ApproveToolInvocationInput!) { approveToolInvocation(input: $i) { success message } }',
    { i: { agentRunId: 'x', invocationId: 'y', isApproved: true } });
  const messages = (removed.errors ?? []).map((e) => e.message);
  log(`the removed mutation, as an older client sends it → errors: ${JSON.stringify(messages)}; data: ${JSON.stringify(removed.data ?? null)}`);
  check('the removed mutation is refused by validation', messages.some((m) => /approveToolInvocation|ApproveToolInvocationInput/.test(m)) && !removed.data, 'validation error, no data');
  const intro = await post('{ __schema { mutationType { fields { name } } queryType { fields { name } } types { name } } }');
  const mutations = intro.data.__schema.mutationType.fields.map((f) => f.name);
  const queries = intro.data.__schema.queryType.fields.map((f) => f.name);
  const types = intro.data.__schema.types.map((t) => t.name);
  log(`schema: ${mutations.length} mutations, ${queries.length} queries, ${types.length} types`);
  check('no approveToolInvocation mutation', !mutations.includes('approveToolInvocation'), `mutations include it: ${mutations.includes('approveToolInvocation')}`);
  check('no ApproveToolInvocationInput / ApproveToolInvocationResult types', !types.some((t) => t.startsWith('ApproveToolInvocation')), JSON.stringify(types.filter((t) => t.startsWith('ApproveTool'))));
  for (const m of ['terminateAgentRun', 'createAgentRun', 'prepareAgentRun', 'cancelPreparedAgentRun', 'restoreAgentRun', 'updateStoppedAgentRunSelection'])
    check(`mutation ${m} still served`, mutations.includes(m), String(mutations.includes(m)));
  check('query agentRunCollaborationMemberProjection still served (out of scope, FU-001)', queries.includes('agentRunCollaborationMemberProjection'), String(queries.includes('agentRunCollaborationMemberProjection')));
  const term = await post('mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }', { id: 'api-01-unknown-run' });
  log(`terminateAgentRun(unknown id) → ${JSON.stringify(term.data ?? term.errors).slice(0, 200)}`);
  check('the same resolver still answers a live mutation', !!term.data?.terminateAgentRun && term.data.terminateAgentRun.success === false, 'success false for an unknown run, no GraphQL error');
} catch (e) { ok = false; log(`ERROR ${String(e).replace(owner, 'own_…')}`); }
finally {
  child?.kill('SIGTERM'); await sleep(1500); try { child?.kill('SIGKILL'); } catch {}
  fs.rmSync(root, { recursive: true, force: true });
  log(`server stopped; temp root removed: ${!fs.existsSync(root)}`);
  log(`API-01 ${ok ? 'Pass' : 'Fail'}`);
  fs.writeFileSync(OUT, lines.join('\n').split(owner).join('own_…') + '\n');
  process.exit(ok ? 0 : 1);
}
