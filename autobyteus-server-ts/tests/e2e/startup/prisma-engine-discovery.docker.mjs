/**
 * Current-built Linux Prisma/native startup + retained-HOME/data recreation regression.
 * Prerequisites: Node22+, installed workspace, pnpm, Docker, network to
 * official binaries.prisma.sh, a local immutable server image (built-in server package at
 * /opt/autobyteus/server-package). No credentials/models. Serialize against other builds.
 *
 * env -i PATH="$PATH" HOME=<private> TMPDIR=<private> \
 *   RUN_PRISMA_ENGINE_DOCKER_E2E=1 pnpm -C autobyteus-server-ts \
 *   test:e2e:prisma-engine-discovery:docker --image sha256:<id> --output-dir <new-dir>
 * Gate off prints SKIP (not Pass), without Docker/build/download operations.
 *
 * Cases: API002 builds this worktree, audits EVERY image dist file (only migrations
 * outputs may differ); API003 puts an official pinned, checksummed incompatible engine
 * cache in the retained HOME: its schema engine fails actual native RPC, and the current
 * resolver still selects the package's bundled engines, whose native RPC succeeds;
 * API004 normal no-pin entrypoint/schema/HTTP + GraphQL-created definition;
 * API005 distinct-container recreation over SAME owned HOME/data, current source,
 * repeated health, API data and unchanged incompatible-cache bytes.
 *
 * If image equality fails, stop: build a task-owned image with the existing
 * Dockerfile.monorepo/current workspace context and rerun with its immutable ID.
 * Never widen the allowlist or reuse an old image as changed-source proof.
 *
 * Owns unique labelled containers and one mkdtemp root; no user container/volume,
 * login, backup, fixed user port, image publication, shared build or prune. Uses
 * private bind mounts and a read-only current dist snapshot. Finally removes only
 * registered owned containers (-f -v) and temp root, even on failure/SIGINT/TERM;
 * retains JSON/log evidence. SIGKILL cannot be trapped: ownership.json identifies
 * exact resources for manual owned-only cleanup. Native binaries are NOT evidence
 * artifacts and never retained in output/Git. No provider inference or UI proof.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

if (process.env.RUN_PRISMA_ENGINE_DOCKER_E2E !== '1') {
  console.log('SKIP: set RUN_PRISMA_ENGINE_DOCKER_E2E=1; native Docker cases not executed.');
  process.exit(0);
}
const server = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workspace = path.dirname(server);
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
}
const image = option('--image');
assert.match(image ?? '', /^sha256:[a-f0-9]{64}$/, 'Provide a local immutable --image sha256:ID');
const output = path.resolve(option('--output-dir') ?? '');
assert(option('--output-dir') && !fs.existsSync(output), '--output-dir must be new');
const wrongRevision = 'c2990dca591cba766e3b7ef5d9e8a84796e47ab7';
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'api-prisma-docker-')));
const owned = new Set();
const runId = `api-prisma-${randomUUID().slice(0, 12)}`;
const label = `autobyteus.prisma-e2e=${runId}`;
let activeCase = 'API002';
let commandNumber = 0;
let cleaning = false;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (file, data) => fs.writeFileSync(path.join(output, file), JSON.stringify(data, null, 2) + '\n');
function event(caseId, result, details) {
  fs.appendFileSync(path.join(output, 'events.jsonl'), JSON.stringify({ time: new Date().toISOString(), caseId, result, details }) + '\n');
  console.log(caseId, result, details);
}
function command(cmd, argv, { input, check = true, timeout = 180000, log = true, env } = {}) {
  const r = spawnSync(cmd, argv, { cwd: workspace, input, encoding: 'utf8', timeout,
    maxBuffer: 32 * 1024 * 1024, env: env ?? process.env });
  if (log) save(`command-${String(++commandNumber).padStart(3, '0')}.json`, {
    command: [cmd, ...argv], exit: r.status, error: r.error?.message,
    stdout: r.stdout, stderr: r.stderr,
  });
  if (check) assert.equal(r.status, 0, `${cmd} ${argv.slice(0, 3).join(' ')}: ${r.error?.message ?? r.stderr}`);
  return r;
}
const docker = (a, opts) => command('docker', a, opts);
function manifest(dir) {
  const result = {};
  function walk(relative = '') {
    for (const name of fs.readdirSync(path.join(dir, relative)).sort()) {
      const entry = path.join(relative, name); const file = path.join(dir, entry);
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) walk(entry);
      else if (stat.isSymbolicLink()) result[entry] = `symlink:${fs.readlinkSync(file)}`;
      else result[entry] = sha(fs.readFileSync(file));
    }
  }
  walk(); return result;
}
function ownership() { save('ownership.json', { runId, root, image, containers: [...owned] }); }
function remove(name) {
  if (!owned.has(name)) return;
  const inspect = docker(['inspect', '--format', '{{json .Config.Labels}}', name], { check: false });
  if (inspect.status === 0) {
    assert.equal(JSON.parse(inspect.stdout)['autobyteus.prisma-e2e'], runId);
    docker(['rm', '-f', '-v', name]);
  } else {
    assert.match(inspect.stderr, /No such (object|container)/i, 'Cannot establish owned-container absence');
  }
  const absent = docker(['inspect', name], { check: false });
  assert.notEqual(absent.status, 0, 'Owned container still exists');
  assert.match(absent.stderr, /No such (object|container)/i, 'Cleanup absence not proven');
  owned.delete(name); ownership();
}
function cleanup() {
  if (cleaning) return;
  cleaning = true;
  const errors = [];
  for (const name of [...owned]) { try { remove(name); } catch (e) { errors.push(String(e)); } }
  // Do not remove bind sources while an owned container may still be running.
  if (owned.size === 0) fs.rmSync(root, { recursive: true, force: true });
  save('cleanup.json', { containersRemaining: [...owned], root, rootAbsent: !fs.existsSync(root), errors });
  assert.equal(errors.length, 0, 'Cleanup failure; see ownership/cleanup receipts');
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  event(activeCase, 'Interrupted', signal); cleanup(); process.exit(130);
});
function register(name) { owned.add(name); ownership(); }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const home = path.join(root, 'home'); const data = path.join(root, 'data');
const fixture = path.join(root, 'fixture'); const dist = path.join(root, 'dist');
for (const d of [home, data, fixture]) fs.mkdirSync(d, { mode: 0o700 });
const mounts = () => ['--mount', `type=bind,src=${home},dst=/root`, '--mount', `type=bind,src=${data},dst=/home/autobyteus/data`,
  '--mount', `type=bind,src=${dist},dst=/opt/autobyteus/server-package/dist,readonly`];
const authPaths = ['.codex/auth.json', '.claude/.credentials.json', '.gemini/antigravity-cli/antigravity-oauth-token'];
function assertSignedOut() { for (const p of authPaths) assert(!fs.existsSync(path.join(home, p)), `Unexpected credential ${p}`); }
async function download(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
  assert.equal(r.status, 200, `Official fixture unavailable ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
// Executed inside the owned image. Imported functions are the package's actual owners,
// not a rewritten resolver; native JSON-RPC process is real and database-free. The
// incompatible cache sits in the mounted HOME (WRONG_ENGINE_CACHE), where a retained
// /root keeps it across recreation.
const native = String.raw`
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {resolvePrismaEnginePair,buildPrismaCommandEnv} from '/opt/autobyteus/server-package/dist/startup/migrations.js';
const app='/opt/autobyteus/server-package';
assert(!process.env.PRISMA_QUERY_ENGINE_LIBRARY && !process.env.PRISMA_SCHEMA_ENGINE_BINARY);
const wrongSchemaEngine=process.env.WRONG_ENGINE_CACHE+'/schema-engine'; assert(fs.existsSync(wrongSchemaEngine));
const cli=fs.realpathSync(app+'/node_modules/prisma/build/index.js');
const req=createRequire(cli); const engines=fs.realpathSync(req.resolve('@prisma/engines/package.json'));
const version=JSON.parse(fs.readFileSync(createRequire(engines).resolve('@prisma/engines-version/package.json'),'utf8')).prisma.enginesVersion;
const current=resolvePrismaEnginePair(app,{});
assert.equal(current.source,'bundled'); assert.equal(current.sourcePath,path.dirname(engines));
assert.notEqual(version,'c2990dca591cba766e3b7ef5d9e8a84796e47ab7');
const queryVersion=createRequire(import.meta.url)(current.queryEngineLibrary).version();
const schemaVersion=execFileSync(current.schemaEngineBinary,['--version'],{encoding:'utf8'}).trim();
const wrongVersion=execFileSync(wrongSchemaEngine,['--version'],{encoding:'utf8'}).trim();
assert.equal(queryVersion.commit,version); assert(schemaVersion.includes(version)); assert(wrongVersion.includes('c2990dca591cba766e3b7ef5d9e8a84796e47ab7'));
async function rpc(binary) {
 return await new Promise((resolve,reject)=>{
  const child=spawn(binary,[],{stdio:['pipe','pipe','pipe']}); let text='',errors=''; let settled=false;
  const timer=setTimeout(()=>done(new Error('RPC timeout '+errors)),15000);
  function done(error,value) {if(settled)return;settled=true;clearTimeout(timer);child.kill();error?reject(error):resolve(value);}
  child.on('error',e=>done(e)); child.on('exit',code=>{if(!settled)done(new Error('RPC exited '+code+' '+errors));});
  child.stderr.on('data',d=>{errors+=d;});
  child.stdout.on('data',d=>{text+=d; for(const line of text.split('\n')) {try {const reply=JSON.parse(line);if(reply.id===1)done(null,reply);}catch{}}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'listMigrationDirectories',params:{migrationsDirectoryPath:app+'/prisma/migrations'}})+'\n');
 });
}
const wrongRpc=await rpc(wrongSchemaEngine); assert.equal(wrongRpc.error?.code,-32601);
const matchingRpc=await rpc(current.schemaEngineBinary); assert(Array.isArray(matchingRpc.result?.migrations)); assert(matchingRpc.result.migrations.length>0);
const env=buildPrismaCommandEnv({appRoot:app,databaseUrl:'file:/home/autobyteus/data/canonical.db',baseEnv:{DATABASE_URL:'file:/stale.db',KEEP:'sentinel'}});
assert.equal(env.DATABASE_URL,'file:/home/autobyteus/data/canonical.db'); assert.equal(env.KEEP,'sentinel');assert.equal(env.PRISMA_SCHEMA_ENGINE_BINARY,current.schemaEngineBinary);
console.log(JSON.stringify({cli,engines,version,current,queryVersion,schemaVersion,wrongSchemaEngine,wrongVersion,wrongRpc,matchingRpc,canonicalEnv:true}));
`;
async function health(name, round) {
  const mapping = docker(['port', name, '8000/tcp']).stdout.trim();
  assert.match(mapping, /^127\.0\.0\.1:\d+$/); const port = Number(mapping.split(':')[1]);
  assert(![8001,8003].includes(port)); const url = `http://${mapping}`;
  const deadline = Date.now() + 150000; const attempts = []; let consecutive = 0;
  while (Date.now() < deadline && consecutive < 3) {
    try {
      const r = await fetch(`${url}/rest/health`, { signal: AbortSignal.timeout(3000) }); const body = await r.json();
      attempts.push({ time: new Date().toISOString(), status: r.status, body });
      consecutive = r.status === 200 && body.status === 'ok' ? consecutive + 1 : 0;
    } catch (e) { attempts.push({ time: new Date().toISOString(), error: String(e) }); consecutive = 0; }
    await delay(1000);
  }
  save(`health-${round}.json`, { url, attempts });
  assert.equal(consecutive, 3, 'Normal backend repeated HTTP readiness failed');
  const startup = docker(['exec', name, 'cat', '/var/log/supervisor/autobyteus_server.log']).stdout;
  fs.writeFileSync(path.join(output, `startup-${round}.log`), startup);
  assert(startup.includes('Using Prisma engine overrides from bundled:'));
  assert(startup.includes('Database migrations completed successfully.'));
  const starterStatus = JSON.parse(docker(['exec', name, 'node', '/opt/autobyteus/starter/cli.mjs', 'status']).stdout);
  assert.equal(starterStatus.state, 'running'); const pid = String(starterStatus.server.pid); assert.match(pid,/^[1-9]\d*$/);
  const noPins = docker(['exec', name, 'node', '-e', `const fs=require('fs');const e=fs.readFileSync('/proc/${pid}/environ','utf8').split('\\0');if(e.some(v=>/^PRISMA_(QUERY_ENGINE_LIBRARY|SCHEMA_ENGINE_BINARY)=/.test(v)))process.exit(1);console.log('no explicit engine pins')`]);
  save(`backend-${round}.json`, { pid, noPins: noPins.stdout.trim() });
  return url;
}
async function graphql(url, query, variables) {
  const r = await fetch(url+'/graphql', { method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({query,variables}), signal:AbortSignal.timeout(15000) });
  assert.equal(r.status,200); const body=await r.json(); assert(!body.errors,JSON.stringify(body.errors)); return body.data;
}
function start(name) {
  register(name);
  const id = docker(['run','-d','--pull','never','--name',name,'--label',label,'-p','127.0.0.1::8000',...mounts(),
    image]).stdout.trim();
  const inspected=JSON.parse(docker(['inspect','--format','{{json .Mounts}}',name]).stdout);
  assert.deepEqual(inspected.filter(x=>x.Type==='bind').map(x=>[x.Source,x.Destination,x.RW]).sort(),[
    [home,'/root',true],[data,'/home/autobyteus/data',true],[dist,'/opt/autobyteus/server-package/dist',false]].sort());
  save(name+'.json',{id,image,mounts:inspected}); return id;
}
try {
  event(activeCase,'Started','current build and whole-dist audit');
  const buildEnv={PATH:process.env.PATH,HOME:home,TMPDIR:root,CI:'1',NO_COLOR:'1'};
  command('pnpm',['-C',server,'build'],{env:buildEnv,timeout:600000});
  fs.cpSync(path.join(server,'dist'),dist,{recursive:true}); const currentManifest=manifest(dist);
  const meta=JSON.parse(docker(['image','inspect','--format','{{json .}}',image],{log:false}).stdout);
  assert.equal(meta.Id,image);assert.equal(meta.Os,'linux');assert(['arm64','amd64'].includes(meta.Architecture));
  assert(!(meta.Config.Env??[]).some(v=>/^PRISMA_(QUERY_ENGINE_LIBRARY|SCHEMA_ENGINE_BINARY)=/.test(v)));
  const auditName=runId+'-audit';register(auditName);
  docker(['create','--name',auditName,'--label',label,'--network','none','--entrypoint','node',image,'--version']);
  const imageDist=path.join(root,'image-dist');docker(['cp',auditName+':/opt/autobyteus/server-package/dist',imageDist]);
  const originalManifest=manifest(imageDist);
  const differences=[...new Set([...Object.keys(originalManifest),...Object.keys(currentManifest)])].sort().filter(k=>originalManifest[k]!==currentManifest[k]);
  save('dist-audit.json',{image,os:meta.Os,architecture:meta.Architecture,originalManifest,currentManifest,differences});
  assert(differences.every(k=>/^startup\/migrations\.(js|js\.map|d\.ts|d\.ts\.map)$/.test(k)), 'Unrelated image dist differs: build owned current monorepo image; do not mount');
  remove(auditName);
  const source=fs.readFileSync(path.join(server,'src/startup/migrations.ts'));
  fs.writeFileSync(path.join(fixture,'native.mjs'),native);
  save('build-identity.json',{head:command('git',['rev-parse','HEAD']).stdout.trim(),tree:command('git',['rev-parse','HEAD^{tree}']).stdout.trim(),
    workingDiff:command('git',['diff','--stat']).stdout,sourceSha256:sha(source),distManifestSha256:sha(JSON.stringify(currentManifest)),image});
  event(activeCase,'Pass',`${Object.keys(currentManifest).length} dist entries audited; ${differences.length} allowed changes`);
  activeCase='API003';event(activeCase,'Started','official incompatible cache/native RPC');
  const target=meta.Architecture==='arm64'?'linux-arm64-openssl-3.0.x':'debian-openssl-3.0.x';
  const cache=path.join(home,'.cache/prisma/master',wrongRevision,target);fs.mkdirSync(cache,{recursive:true});
  const receipts=[];
  for(const [remote,local] of [['schema-engine','schema-engine'],['libquery_engine.so.node','libquery-engine']]) {
    const url=`https://binaries.prisma.sh/all_commits/${wrongRevision}/${target}/${remote}.gz`;
    const compressed=await download(url);const checksum=(await download(url+'.sha256')).toString().trim().split(/\s+/)[0];
    assert.match(checksum,/^[a-f0-9]{64}$/);assert.equal(sha(compressed),checksum);
    const unpacked=gunzipSync(compressed);fs.writeFileSync(path.join(cache,local),unpacked,{mode:0o700});
    receipts.push({url,checksumUrl:url+'.sha256',compressedSha256:checksum,sha256:sha(unpacked),bytes:unpacked.length,local});
  }
  save('native-fixture.json',{revision:wrongRevision,target,receipts});const wrongBefore=manifest(cache);
  assertSignedOut();const nativeName=runId+'-native';register(nativeName);
  const nativeResult=docker(['run','--rm','-i','--pull','never','--name',nativeName,'--label',label,'--network','none',...mounts(),
    '--mount',`type=bind,src=${fixture},dst=/fixture,readonly`,'-e',`WRONG_ENGINE_CACHE=/root/.cache/prisma/master/${wrongRevision}/${target}`,
    '--entrypoint','node',image,'/fixture/native.mjs']);
  save('native-proof.json',JSON.parse(nativeResult.stdout.trim()));remove(nativeName);
  assert.deepEqual(manifest(cache),wrongBefore);event(activeCase,'Pass','incompatible cache RPC -32601; current resolver selects bundled despite the cache; bundled native revision/RPC pass');
  activeCase='API004';event(activeCase,'Started','normal no-pin backend startup');
  const first=runId+'-first';const id1=start(first);const url1=await health(first,'first');
  const input={name:runId,role:'owned Prisma lifecycle fixture',description:'Retained-data proof; no model execution',instructions:'Do not run',category:'api-e2e'};
  const created=await graphql(url1,'mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name description instructions}}',{input});
  const expected=created.createAgentDefinition;assert(expected.id);assert.equal(expected.name,input.name);save('api-created.json',created);
  assert.deepEqual(manifest(cache),wrongBefore);assertSignedOut();event(activeCase,'Pass','HTTP200/statusok x3; representative definition created through GraphQL');
  activeCase='API005';event(activeCase,'Started','actual removal and same-state recreation');
  remove(first);const second=runId+'-recreated';const id2=start(second);assert.notEqual(id2,id1);
  const url2=await health(second,'recreated');
  const read=await graphql(url2,'query($id:String!){agentDefinition(id:$id){id name description instructions}}',{id:expected.id});
  assert.deepEqual(read.agentDefinition,expected);assert.deepEqual(manifest(cache),wrongBefore);assertSignedOut();
  assert.deepEqual(manifest(dist),currentManifest);assert.deepEqual(manifest(path.join(server,'dist')),currentManifest);
  save('recreation-proof.json',{firstId:id1,recreatedId:id2,home,data,image,read,wrongBefore,wrongAfter:manifest(cache),noPins:true,signedOut:true,distUnchanged:true});
  event(activeCase,'Pass','different container ID; same mounts/source; API data and wrong-cache bytes preserved; HTTP200/statusok x3');
} catch(error) {
  event(activeCase,'Fail',String(error));save('failure.json',{caseId:activeCase,message:String(error),stack:error.stack});process.exitCode=1;
} finally { cleanup(); }
