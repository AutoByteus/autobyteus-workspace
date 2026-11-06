/** Private full-host fixture for deepseek-harness-standalone-host.e2e.test.ts. Run from the server package.
 * A real standalone application host (current `dist/`) serving one application whose backend starts an agent on
 * DeepSeek Harness. The host runs no credential proxy (DEC-020), so dsh must be unavailable with that reason and the
 * launch refused before dsh starts. `dsh` is a recording stand-in: it answers `--version` and logs any other start.
 * Prints one JSON receipt line last.
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'dsh-standalone-host-')));
const data = join(own, 'data'), home = join(own, 'home'), workspace = join(own, 'workspace');
const packageRoot = join(own, 'package'), bin = join(own, 'bin'), starts = join(own, 'dsh-starts.log');
for (const dir of [data, home, workspace, bin]) await fs.mkdir(dir, { recursive: true });
const record = { case: 'deepseek-harness-standalone-host', date: new Date().toISOString(), steps: [] };
const note = (step, value) => record.steps.push({ step, value });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let host, ready, logs = '', closed = false;
const wait = async (fn, label, timeout = 45_000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await fn()) return; await delay(100); }
  throw Error(`Timed out: ${label}\n${logs}`);
};
try {
  await fs.access(resolve('dist/index.js'));
  const dsh = join(bin, 'dsh');
  await fs.writeFile(dsh, `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "dsh 0.2.2-rc.1"; exit 0; fi\necho "$@" >> '${starts}'\nexit 1\n`, { mode: 0o755 });
  await fs.writeFile(join(data, '.env'), 'APP_ENV=test\n');

  const app = join(packageRoot, 'applications', 'fixture');
  for (const dir of ['ui', 'backend', 'agents/worker']) await fs.mkdir(join(app, dir), { recursive: true });
  await fs.writeFile(join(app, 'ui/index.html'), '<!doctype html><title>Fixture</title>');
  await fs.writeFile(join(app, 'application.json'), JSON.stringify({ manifestVersion: '5', id: 'fixture', name: 'Fixture',
    ui: { entryHtml: 'ui/index.html', frontendSdkContractVersion: '6' }, backend: { bundleManifest: 'backend/bundle.json' },
    executionResourceSlots: [], agentTools: [] }));
  await fs.writeFile(join(app, 'agents/worker/agent.md'), '---\nname: Worker\ndescription: DeepSeek Harness standalone fixture\nrole: Engineer\n---\n\nAnswer briefly.\n');
  await fs.writeFile(join(app, 'agents/worker/agent-config.json'), JSON.stringify({ toolNames: [], skillNames: [], inputProcessorNames: [],
    llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [],
    defaultLaunchConfig: null }));
  await fs.writeFile(join(app, 'backend/bundle.json'), JSON.stringify({ contractVersion: '1', entryModule: 'backend/entry.mjs', moduleFormat: 'esm',
    distribution: 'self-contained', targetRuntime: { engine: 'node', semver: '>=22 <27' },
    sdkCompatibility: { backendDefinitionContractVersion: '7', frontendSdkContractVersion: '6' },
    supportedExposures: { queries: true, commands: true, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
  await fs.writeFile(join(app, 'backend/entry.mjs'), `export default {
    definitionContractVersion:'7', queries:{}, commands:{
      start:async(input,context)=>{try{const binding=await context.agentExecution.startAgent({launchRequestId:input.id,
        executionResourceRef:{source:'bundle',kind:'AGENT',localId:'worker'},
        launch:{kind:'AGENT',runtimeKind:'deepseek_harness',workspaceRootPath:input.workspace,llmModelIdentifier:'deepseek-v4-flash',
          llmConfig:{reasoning_effort:'low'},autoExecuteTools:true}});
        return {started:true,binding};}catch(error){return {started:false,error:String(error?.message??error)};}}
    }};`);

  const entry = join(own, 'host.mjs');
  const imported = (relative) => JSON.stringify(pathToFileURL(resolve(relative)).href);
  await fs.writeFile(entry, `import {startStandaloneApplicationHost} from ${imported('dist/index.js')};
    import {getRuntimeAvailabilityService} from ${imported('dist/runtime-management/runtime-availability-service.js')};
    let host;try {host=await startStandaloneApplicationHost(${JSON.stringify({ packageRoot, localApplicationId: 'fixture', appDataDir: data, host: '127.0.0.1', port: 0 })});
      const availability=await getRuntimeAvailabilityService().getRuntimeAvailability('deepseek_harness');
      process.send({kind:'ready',url:host.url,availability});
      process.on('message',async message=>{if(message==='close'){try{await host.close();process.send({kind:'closed'},()=>process.exit(0));}catch(e){console.error(e);process.exit(93)}}});
    }catch(e){console.error(e);await host?.close().catch(console.error);process.exit(92)}`);
  const env = { PATH: process.env.PATH, HOME: home, TMPDIR: own, APP_ENV: 'test', AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', DEEPSEEK_HARNESS_COMMAND: dsh };
  host = spawn(process.execPath, [entry], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  host.stdout.on('data', (b) => { logs += b; }); host.stderr.on('data', (b) => { logs += b; });
  host.on('message', (message) => { note('host IPC', message); if (message.kind === 'ready') ready = message; if (message.kind === 'closed') closed = true; });
  await wait(() => { if (host.exitCode !== null) throw Error(`host exited ${host.exitCode}\n${logs}`); return ready; }, 'standalone ready');
  assert.equal((await fetch(`${ready.url}/_autobyteus/health`)).status, 200);
  record.availability = ready.availability;

  const response = await fetch(`${ready.url}/_autobyteus/backend/commands/start`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { id: 'dsh-launch-1', workspace } }), signal: AbortSignal.timeout(30_000) });
  const body = await response.json();
  note('start command', { status: response.status, body });
  record.launch = body.result ?? body;
  await delay(1_000);
  record.dshStarts = await fs.readFile(starts, 'utf8').then((text) => text.split('\n').filter(Boolean), () => []);
  record.dshDataFiles = await fs.readdir(join(data, 'runtimes', 'deepseek-harness'), { recursive: true }).catch(() => []);

  host.send('close');
  await wait(() => host.exitCode !== null, 'host close', 30_000);
  assert.equal(host.exitCode, 0); assert(closed, 'close completion receipt');
  record.result = 'Pass';
} catch (error) { record.result = 'Fail'; record.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  if (host && host.exitCode === null && host.signalCode === null) { host.kill('SIGKILL'); await delay(500); }
  if (process.env.TEST_DSH_STANDALONE_EVIDENCE_DIR) {
    const out = resolve(process.env.TEST_DSH_STANDALONE_EVIDENCE_DIR);
    await fs.mkdir(out, { recursive: true });
    await fs.writeFile(join(out, 'deepseek-harness-standalone-host.log'), logs);
  }
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); record.rootRemoved = true;
  console.log(JSON.stringify(record));
}
