/** Private fixture for busy-run-stop-now.e2e.test.ts (mode `application`). Run from the server package after `pnpm build`.
 * A real standalone application host (host, app worker/RPC, orchestration, native runtime) whose application starts an
 * agent; the agent's scripted LM Studio inference runs a long foreground `run_bash` (a busy turn). The application's own
 * `end` command calls `context.agentExecution.terminate(bindingId)`: it must return within 10 s and the foreground
 * command must be gone (REQ-001 via DEC-005). Only inference is emulated.
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const serverDir = resolve(process.env.BUSY_STOP_SERVER_DIR ?? '.');
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'busy-application-terminate-')));
const data = join(own, 'data'), home = join(own, 'home'), workspace = join(own, 'workspace'), packageRoot = join(own, 'package');
for (const dir of [data, home, workspace]) await fs.mkdir(dir);
const tag = `BQ284_APP_${process.pid}_${Date.now()}`;
const record = { case: 'busy-application-terminate', serverDir, date: new Date().toISOString(), own, tag, steps: [] };
const note = (step, value) => record.steps.push({ step, value, at: new Date().toISOString() });
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const wait = async (fn, label, timeout = 30_000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn()) return; await delay(50); } throw Error(`Timed out: ${label}`); };
const quote = s => "'" + s.replaceAll("'", "'\\''") + "'";
const marked = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,command='], { encoding: 'utf8' }).split('\n')
  .filter(l => l.includes(tag) && !l.includes('ps -ww')).map(l => ({ pid: Number(l.trim().split(/\s+/)[0]), command: l.trim().slice(0, 160) }));
const receipt = join(workspace, 'foreground.json');
const code = `/*${tag}*/require('fs').writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid}));setInterval(()=>{},1000)`;
const command = `${quote(process.execPath)} -e ${quote(code)} ${tag}`;
let calls = 0, host, ready, logs = '', closed;
const model = createServer(async (req, res) => {
  if (req.method === 'GET') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ models: [{ key: 'busy-app-fixture', max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] })); return; }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const input = JSON.parse(raw); calls++;
  const invoke = (input.tools ?? []).some(t => t.function?.name === 'run_bash') && !input.messages?.some(m => m.role === 'tool');
  const delta = invoke ? { role: 'assistant', tool_calls: [{ index: 0, id: 'call-fg', type: 'function', function: { name: 'run_bash', arguments: JSON.stringify({ command, cwd: workspace, timeout_seconds: 600 }) } }] } : { role: 'assistant', content: 'Done.' };
  const chunk = (d, finish_reason) => ({ id: `fixture-${calls}`, object: 'chat.completion.chunk', created: 1, model: 'busy-app-fixture', choices: [{ index: 0, delta: d, finish_reason }] });
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, invoke ? 'tool_calls' : 'stop'))}\n\ndata: [DONE]\n\n`);
  note('model', { calls, invoke });
});
await new Promise(r => model.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${model.address().port}`;
const env = { PATH: process.env.PATH, HOME: home, TMPDIR: own, LMSTUDIO_HOSTS: origin, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', APP_ENV: 'test' };
try {
  await fs.access(join(serverDir, 'dist/index.js'));
  await fs.writeFile(join(data, '.env'), `APP_ENV=test\nLMSTUDIO_HOSTS=${origin}\n`);
  const app = join(packageRoot, 'applications', 'fixture');
  for (const dir of ['ui', 'backend', 'agents/worker']) await fs.mkdir(join(app, dir), { recursive: true });
  await fs.writeFile(join(app, 'ui/index.html'), '<!doctype html><title>Fixture</title>');
  await fs.writeFile(join(app, 'application.json'), JSON.stringify({ manifestVersion: '5', id: 'fixture', name: 'Fixture', ui: { entryHtml: 'ui/index.html', frontendSdkContractVersion: '6' }, backend: { bundleManifest: 'backend/bundle.json' }, executionResourceSlots: [], agentTools: [] }));
  await fs.writeFile(join(app, 'agents/worker/agent.md'), '---\nname: Worker\ndescription: Busy terminate fixture\nrole: Engineer\n---\n\nExecute requested owned commands.\n');
  await fs.writeFile(join(app, 'agents/worker/agent-config.json'), JSON.stringify({ toolNames: ['run_bash'], skillNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], defaultLaunchConfig: null }));
  await fs.writeFile(join(app, 'backend/bundle.json'), JSON.stringify({ contractVersion: '1', entryModule: 'backend/entry.mjs', moduleFormat: 'esm', distribution: 'self-contained', targetRuntime: { engine: 'node', semver: '>=22 <27' }, sdkCompatibility: { backendDefinitionContractVersion: '7', frontendSdkContractVersion: '6' }, supportedExposures: { queries: true, commands: true, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
  await fs.writeFile(join(app, 'backend/entry.mjs'), `const events=[];export default {
    definitionContractVersion:'7', queries:{events:async()=>events}, commands:{
      start:async(input,context)=>{const binding=await context.agentExecution.startAgent({launchRequestId:input.id,executionResourceRef:{source:'bundle',kind:'AGENT',localId:'worker'},launch:{kind:'AGENT',runtimeKind:'autobyteus',workspaceRootPath:input.workspace,llmModelIdentifier:input.model,autoExecuteTools:true}});
        const address={bindingId:binding.bindingId,memberAddress:null};await context.agentExecution.subscribeEventStream(address,{onEvent:event=>{events.push(event)}});
        await context.agentExecution.sendInput({address,input:{text:'Run the owned command.'}});return binding;},
      end:async(input,context)=>{const started=Date.now();const binding=await context.agentExecution.terminate(input.bindingId);return {binding,elapsedMs:Date.now()-started};}
    }};`);
  const entry = join(own, 'host.mjs');
  const imported = relative => JSON.stringify(pathToFileURL(join(serverDir, relative)).href);
  await fs.writeFile(entry, `import {startStandaloneApplicationHost} from ${imported('dist/index.js')};
    import {getModelCatalogService} from ${imported('dist/llm-management/services/model-catalog-service.js')};
    let host;try {host=await startStandaloneApplicationHost(${JSON.stringify({ packageRoot, localApplicationId: 'fixture', appDataDir: data, host: '127.0.0.1', port: 0 })});
      const catalog=await getModelCatalogService().reloadProviderModelCatalog('LMSTUDIO','autobyteus');
      process.send({kind:'ready',url:host.url,model:catalog.llmModels.find(m=>m.model_identifier.startsWith('busy-app-fixture:'))?.model_identifier});
      process.on('message',async message=>{if(message==='close'){try{await host.close();process.send({kind:'closed'},()=>process.exit(0));}catch(e){console.error(e);process.exit(93)}}});
    }catch(e){console.error(e);await host?.close().catch(console.error);process.exit(92)}`);
  host = spawn(process.execPath, [entry], { cwd: serverDir, env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  record.hostPid = host.pid;
  host.stdout.on('data', b => { logs += b; }); host.stderr.on('data', b => { logs += b; });
  host.on('message', message => { note('host IPC', message); if (message.kind === 'ready') ready = message; if (message.kind === 'closed') closed = true; });
  await wait(() => { if (host.exitCode !== null) throw Error(`host exited ${host.exitCode}\n${logs}`); return ready; }, 'standalone ready', 45_000);
  assert(ready.model, 'fixture model missing');
  const call = async (kind, name, input = {}, timeout = 20_000) => { const response = await fetch(`${ready.url}/_autobyteus/backend/${kind}/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }), signal: AbortSignal.timeout(timeout) }); const body = await response.json(); note('application ' + name, body); assert(response.ok, JSON.stringify(body)); return body.result; };
  const binding = await call('commands', 'start', { id: 'busy-1', model: ready.model, workspace });
  let pid; await wait(async () => { try { pid = JSON.parse(await fs.readFile(receipt, 'utf8')).pid; return true; } catch { return false; } }, 'foreground receipt');
  await delay(300);
  assert(alive(pid), 'foreground command running'); note('busy', { binding, pid });
  const started = Date.now();
  const ended = await call('commands', 'end', { bindingId: binding.bindingId }, 20_000).then(r => r, e => ({ error: `pending or failed: ${String(e)}` }));
  record.applicationTerminate = { bindingId: binding.bindingId, result: ended, roundTripMs: Date.now() - started };
  await wait(() => !alive(pid), 'foreground gone after application terminate', 5_000).catch(() => {});
  record.applicationTerminate.foregroundGone = !alive(pid);
  note('application terminate', record.applicationTerminate);
  assert(!ended.error, ended.error);
  assert(record.applicationTerminate.roundTripMs <= 10_000, `application terminate took ${record.applicationTerminate.roundTripMs} ms`);
  assert(record.applicationTerminate.foregroundGone, 'the terminated run left its foreground command');
  const closeStarted = Date.now(); host.send('close'); await wait(() => host.exitCode !== null, 'host close', 30_000);
  record.close = { exitCode: host.exitCode, closed: !!closed, elapsedMs: Date.now() - closeStarted };
  assert.equal(host.exitCode, 0);
  record.result = 'Pass';
} catch (error) { record.result = 'Fail'; record.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  if (host && host.exitCode === null && host.signalCode === null) { if (host.connected) host.send('close'); await wait(() => host.exitCode !== null || host.signalCode !== null, 'cleanup host', 15_000).catch(async () => { host.kill('SIGKILL'); await wait(() => host.signalCode !== null, 'host force').catch(() => {}); note('cleanup forced', host.pid); }); }
  for (const row of marked()) { try { process.kill(row.pid, 'SIGKILL'); note('fixture fallback cleanup', row); } catch {} }
  model.closeAllConnections(); await new Promise(r => model.close(r));
  record.calls = calls; record.hostLogTail = logs.split('\n').slice(-60).join('\n');
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); record.rootRemoved = true;
  if (process.env.TEST_BUSY_STOP_EVIDENCE_DIR) { const out = resolve(process.env.TEST_BUSY_STOP_EVIDENCE_DIR); await fs.mkdir(out, { recursive: true }); await fs.writeFile(join(out, `busy-application-terminate-${process.env.TEST_BUSY_STOP_LABEL ?? 'result'}.json`), JSON.stringify(record, null, 2)); }
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null, applicationTerminate: record.applicationTerminate ?? null, close: record.close ?? null, rootRemoved: record.rootRemoved }));
}
