/** Private full-host fixture for native-standalone-host-shutdown.e2e.test.ts. Run from server package.
 * Only inference is emulated. Host, app worker/RPC, execution service, native tools, ownership and close are real.
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'native-standalone-shutdown-')));
const data = join(own, 'data'), home = join(own, 'home'), workspace = join(own, 'workspace'), packageRoot = join(own, 'package');
for (const dir of [data, home, workspace]) await fs.mkdir(dir);
const record = { case: 'native-standalone-host-shutdown', date: new Date().toISOString(), own, steps: [] };
const note = (step, value) => record.steps.push({ step, value, at: new Date().toISOString() });
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
let cleaning = false; const executionDeadline = Date.now() + 90_000;
const wait = async (fn, label, timeout = 30_000) => { const end = cleaning ? Date.now() + timeout : Math.min(Date.now() + timeout, executionDeadline); while (Date.now() < end) { if (await fn()) return; await delay(75); } throw Error(`Timed out: ${label}`); };
const status = port => fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(750) }).then(r => r.status, () => null);
const quote = s => "'" + s.replaceAll("'", "'\\''") + "'";
let turn = 1, calls = 0, host, ready, logs = '', closed;
const children = [], expectedReceipts = [];
const commands = () => [0, 1].map(index => {
  const receipt = join(workspace, `listener-${turn}-${index}.json`);
  if (!expectedReceipts.includes(receipt)) expectedReceipts.push(receipt);
  const code = `const fs=require('fs'),http=require('http');${index === 0 ? `process.on('SIGTERM',()=>fs.writeFileSync(${JSON.stringify(receipt + '.term')},'observed'));` : ''}const server=http.createServer((q,r)=>{r.writeHead(426);r.end('owned')});server.listen(0,'127.0.0.1',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:server.address().port})));`;
  const command = `${quote(process.execPath)} -e ${quote(code)}`;
  return { receipt, name: index === 0 ? 'start_background_process' : 'run_bash', command: index === 0 ? command : `${command} > ${quote(receipt + '.log')} 2>&1 & while [ ! -s ${quote(receipt)} ]; do sleep 0.01; done` };
});
const model = createServer(async (req, res) => {
  if (req.method === 'GET') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ models: [{ key: 'shutdown-fixture', max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] })); return; }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const input = JSON.parse(raw); calls++;
  const tools = (input.tools ?? []).map(t => t.function?.name);
  const invoke = tools.includes('start_background_process') && !input.messages?.some(m => m.role === 'tool');
  const delta = invoke ? { role: 'assistant', tool_calls: commands().map((c, i) => ({ index: i, id: `call-${turn}-${i}`, type: 'function', function: { name: c.name, arguments: JSON.stringify({ command: c.command, cwd: workspace }) } })) } : { role: 'assistant', content: 'Owned work submitted.' };
  const chunk = (delta, finish_reason) => ({ id: `fixture-${calls}`, object: 'chat.completion.chunk', created: 1, model: 'shutdown-fixture', choices: [{ index: 0, delta, finish_reason }] });
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, invoke ? 'tool_calls' : 'stop'))}\n\ndata: [DONE]\n\n`);
  note('model', { calls, turn, invoke, tools });
});
await new Promise(r => model.listen(0, '127.0.0.1', r));
const sentinel = createServer((q, r) => r.end('unrelated'));
await new Promise(r => sentinel.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${model.address().port}`;
const env = { PATH: process.env.PATH, HOME: home, TMPDIR: own, LMSTUDIO_HOSTS: origin, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', APP_ENV: 'test' };
try {
  await fs.access(resolve('dist/index.js'));
  await fs.writeFile(join(data, '.env'), `APP_ENV=test\nLMSTUDIO_HOSTS=${origin}\n`);
  await fs.writeFile(join(data, 'sentinel'), 'preserve owned data');
  const app = join(packageRoot, 'applications', 'fixture');
  for (const dir of ['ui', 'backend', 'agents/worker']) await fs.mkdir(join(app, dir), { recursive: true });
  await fs.writeFile(join(app, 'ui/index.html'), '<!doctype html><title>Fixture</title>');
  await fs.writeFile(join(app, 'application.json'), JSON.stringify({ manifestVersion: '5', id: 'fixture', name: 'Fixture', ui: { entryHtml: 'ui/index.html', frontendSdkContractVersion: '6' }, backend: { bundleManifest: 'backend/bundle.json' }, executionResourceSlots: [], agentTools: [] }));
  await fs.writeFile(join(app, 'agents/worker/agent.md'), '---\nname: Worker\ndescription: Shutdown fixture\nrole: Engineer\n---\n\nExecute requested owned commands.\n');
  await fs.writeFile(join(app, 'agents/worker/agent-config.json'), JSON.stringify({ toolNames: ['start_background_process', 'run_bash'], skillNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], defaultLaunchConfig: null }));
  await fs.writeFile(join(app, 'backend/bundle.json'), JSON.stringify({ contractVersion: '1', entryModule: 'backend/entry.mjs', moduleFormat: 'esm', distribution: 'self-contained', targetRuntime: { engine: 'node', semver: '>=22 <27' }, sdkCompatibility: { backendDefinitionContractVersion: '7', frontendSdkContractVersion: '6' }, supportedExposures: { queries: true, commands: true, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
  await fs.writeFile(join(app, 'backend/entry.mjs'), `const events=[];const subscriptions=[];export default {
    definitionContractVersion:'7', queries:{events:async()=>events}, commands:{
      start:async(input,context)=>{const binding=await context.agentExecution.startAgent({launchRequestId:input.id,executionResourceRef:{source:'bundle',kind:'AGENT',localId:'worker'},launch:{kind:'AGENT',runtimeKind:'autobyteus',workspaceRootPath:input.workspace,llmModelIdentifier:input.model,autoExecuteTools:true}});
        const address={bindingId:binding.bindingId,memberAddress:null};subscriptions.push(await context.agentExecution.subscribeEventStream(address,{onEvent:event=>{events.push(event)}}));
        await context.agentExecution.sendInput({address,input:{text:'Run the owned fixtures.'}});return binding;},
      end:async(input,context)=>context.agentExecution.terminate(input.bindingId)
    }};`);
  const entry = join(own, 'host.mjs');
  const imported = relative => JSON.stringify(pathToFileURL(resolve(relative)).href);
  await fs.writeFile(entry, `import {startStandaloneApplicationHost} from ${imported('dist/index.js')};
    import {getModelCatalogService} from ${imported('dist/llm-management/services/model-catalog-service.js')};
    let host;try {host=await startStandaloneApplicationHost(${JSON.stringify({ packageRoot, localApplicationId: 'fixture', appDataDir: data, host: '127.0.0.1', port: 0 })});
      const catalog=await getModelCatalogService().reloadProviderModelCatalog('LMSTUDIO','autobyteus');
      process.send({kind:'ready',url:host.url,model:catalog.llmModels.find(m=>m.model_identifier.startsWith('shutdown-fixture:'))?.model_identifier});
      process.on('message',async message=>{if(message==='close'){try{await host.close();process.send({kind:'closed'},()=>process.exit(0));}catch(e){console.error(e);process.exit(93)}}});
    }catch(e){console.error(e);await host?.close().catch(console.error);process.exit(92)}`);
  host = spawn(process.execPath, [entry], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  record.hostPid = host.pid;
  host.stdout.on('data', b => { logs += b; }); host.stderr.on('data', b => { logs += b; });
  host.on('message', message => { note('host IPC', message); if (message.kind === 'ready') ready = message; if (message.kind === 'closed') closed = true; });
  await wait(() => { if (host.exitCode !== null) throw Error(`host exited ${host.exitCode}\n${logs}`); return ready; }, 'standalone ready', 45_000);
  assert(ready.model, 'fixture model missing'); assert.equal((await fetch(ready.url + '/_autobyteus/health')).status, 200);
  const call = async (kind, name, input = {}) => { const response = await fetch(`${ready.url}/_autobyteus/backend/${kind}/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }), signal: AbortSignal.timeout(20_000) }); const body = await response.json(); note('application ' + name, body); assert(response.ok, JSON.stringify(body)); return body.result; };
  for (turn = 1; turn <= 2; turn++) {
    const binding = await call('commands', 'start', { id: 'owned-' + turn, model: ready.model, workspace });
    await wait(async () => { try { await Promise.all(commands().map(c => fs.access(c.receipt))); return true; } catch { return false; } }, 'listener receipts', 30_000);
    const current = await Promise.all(commands().map(async c => ({ ...JSON.parse(await fs.readFile(c.receipt, 'utf8')), receipt: c.receipt })));
    children.push(...current);
    await wait(async () => (await call('queries', 'events')).some(e => e.address.bindingId === binding.bindingId && e.event.type === 'TURN_COMPLETED'), 'turn completed');
    for (const child of current) { assert.equal(await status(child.port), 426); child.anchor = Number(execFileSync('ps', ['-p', String(child.pid), '-o', 'pgid='], { encoding: 'utf8' }).trim()); }
    if (turn === 1) { await call('commands', 'end', { bindingId: binding.bindingId }); for (const child of current) assert.equal(await status(child.port), 426, 'ordinary agent end retains previews'); }
    note('live work', { turn, binding, current });
  }
  const started = Date.now(); host.send('close'); await wait(() => host.exitCode !== null, 'host close', 30_000);
  assert.equal(host.exitCode, 0); assert(closed, 'close completion receipt');
  record.elapsedMs = Date.now() - started;
  record.observations = await Promise.all(children.map(async child => ({ ...child, absent: !alive(child.pid), anchorAbsent: !alive(child.anchor), listenerStatus: await status(child.port), termObserved: await fs.access(child.receipt + '.term').then(() => true, () => false) })));
  note('post close', record.observations);
  for (const entry of record.observations) { assert(entry.absent, 'command survived host.close'); assert(entry.anchorAbsent, 'anchor survived host.close'); assert.equal(entry.listenerStatus, null); }
  assert(record.observations[0].termObserved && record.observations[2].termObserved);
  assert.equal(await status(sentinel.address().port), 200); assert.equal(await fs.readFile(join(data, 'sentinel'), 'utf8'), 'preserve owned data');
  record.sentinel = 200; record.data = 'preserve owned data'; record.result = 'Pass';
} catch (error) { record.result = 'Fail'; record.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  cleaning = true;
  if (host && host.exitCode === null && host.signalCode === null) { if (host.connected) host.send('close'); await wait(() => host.exitCode !== null || host.signalCode !== null, 'cleanup host', 15_000).catch(async () => { host.kill('SIGKILL'); await wait(() => host.signalCode !== null, 'exact host force'); note('cleanup forced', host.pid); }); }
  // A failed assertion may precede receipt collection. Discover only paths generated by this fixture, never ports/PID scans.
  for (const receipt of expectedReceipts) if (!children.some(c => c.receipt === receipt)) { try { children.push({ ...JSON.parse(await fs.readFile(receipt, 'utf8')), receipt }); } catch {} }
  for (const child of children) if (alive(child.pid)) { const identity = execFileSync('ps', ['-p', String(child.pid), '-o', 'command='], { encoding: 'utf8' }); assert(identity.includes(child.receipt), 'refuse unrelated cleanup'); process.kill(child.pid, 'SIGKILL'); await wait(() => !alive(child.pid), 'owned child cleanup'); note('fixture fallback cleanup', child.pid); }
  model.closeAllConnections(); sentinel.closeAllConnections(); await Promise.all([new Promise(r => model.close(r)), new Promise(r => sentinel.close(r))]);
  record.childrenAbsent = children.every(child => !alive(child.pid));
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); record.rootRemoved = true;
  if (process.env.TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR) { const out = resolve(process.env.TEST_NATIVE_SHUTDOWN_EVIDENCE_DIR); await fs.mkdir(out, { recursive: true }); await fs.writeFile(join(out, 'native-standalone-host.log'), logs); await fs.writeFile(join(out, 'native-standalone-host-result.json'), JSON.stringify(record, null, 2)); }
  console.log(JSON.stringify(record));
}
