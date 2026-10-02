#!/usr/bin/env node
// Temporary API/E2E probe (TC-007): real Chrome → Nuxt dev → built backend (dist/app.js) → fake AGY CLI
// (tests/fixtures/agy-failure-cli.mjs, case mcp_calls). Owned temp data root, free ports, sanitized env.
// Usage: node tc-007-activity-panel-probe.mjs <worktree root> <output dir>
import { spawn, execFileSync } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const rootDir = path.resolve(process.argv[2]); const outDir = path.resolve(process.argv[3])
const webDir = path.join(rootDir, 'autobyteus-web'); const serverDir = path.join(rootDir, 'autobyteus-server-ts')
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const fakeAgy = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) }) })
const waitFor = async (label, fn, timeout = 90000, interval = 250) => { const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${label}`) }
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (label, command, args, cwd, env) => { const log = createWriteStream(path.join(outDir, `tc-007-${label}.log`))
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log); owned.push(child); return child }
const stopOwned = async (child) => { if (child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  return exited ? 'SIGTERM' : 'SIGKILL' }
const require = createRequire(path.join(serverDir, 'package.json'));
const { WebSocket } = require('ws');
const ts = require('typescript');
const { createHash, randomUUID } = await import('node:crypto');
const e = { startedAt: new Date().toISOString(), result: 'Fail', cleanup: [] };
let temp, socket, clone;
const sha = (v) => createHash('sha256').update(v).digest('hex');
let backendUrl;
const gql = async (query, variables) => { const r = await fetch(backendUrl+'/graphql', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})}); const b=await r.json(); assert(r.ok && b.data && !b.errors, 'GraphQL failure', b); return b.data; };
const runFiles = async (dir) => { const result={}; const walk=async(d)=>{ for(const f of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,f.name); if(f.isDirectory()) await walk(p); else result[path.relative(dir,p)]=sha(await fs.readFile(p));} }; await walk(dir); return result; };
try {
 await fs.mkdir(outDir,{recursive:true});
 temp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'agy-oldwriter-')));
 const data=path.join(temp,'data'), workspace=path.join(temp,'workspace'); await fs.mkdir(path.join(data,'db'),{recursive:true}); await fs.mkdir(workspace);
 const dbUrl=pathToFileURL(path.join(data,'db/probe.db')).href;
 const relative='src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts';
 const base=execFileSync('git',['show','b0b077b02571098a6bf7993ab46b67a69fdb8f9d:autobyteus-server-ts/'+relative],{cwd:rootDir,encoding:'utf8'});
 clone=path.join(serverDir,'dist-api-rev003-oldwriter'); assert(!existsSync(clone),'clone already exists');
 await fs.cp(path.join(serverDir,'dist'),clone,{recursive:true});
 await fs.writeFile(path.join(clone,relative.replace('src/','').replace('.ts','.js')),ts.transpileModule(base,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 e.writerBasis={base:'b0b077b02571098a6bf7993ab46b67a69fdb8f9d',sourceSha256:sha(base),method:'Current compiled server clone with exact base converter transpiled; all other production source is base-identical except unused new MCP helper. Not a clean baseline build.'};
 await fs.writeFile(path.join(outDir,'base-converter.ts'),base);
 execFileSync('pnpm',['exec','prisma','migrate','deploy','--schema','./prisma/schema.prisma'],{cwd:serverDir,env:{...baseEnv(),DATABASE_URL:dbUrl,DB_TYPE:'sqlite',APP_ENV:'development'},stdio:'ignore'});
 const start=async(dist,label)=>{const port=await freePort(); backendUrl='http://127.0.0.1:'+port;
 await fs.writeFile(path.join(data,'.env'),`APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
 const c=spawnOwned(label,process.execPath,[path.join(dist,'app.js'),'--host','127.0.0.1','--port',String(port),'--data-dir',data],serverDir,{...baseEnv(),APP_ENV:'development',DATABASE_URL:dbUrl,DB_TYPE:'sqlite',AUTOBYTEUS_SERVER_HOST:backendUrl,ANTIGRAVITY_CLI_COMMAND:fakeAgy,AGY_FAKE_CASE:'mcp_calls',AGY_FAKE_MCP_IMAGE_PATH:path.join(workspace,'mcp.png')});
 await waitFor(label,async()=> (await fetch(backendUrl+'/rest/health',{signal:AbortSignal.timeout(2000)})).ok,120000); return c;};
 const old=await start(clone,'old-writer');
 const definition=(await gql('mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }',{input:{name:'old-writer-'+randomUUID(),role:'assistant',description:'Compatibility probe',instructions:'Use tools when asked.',category:'runtime-e2e',toolNames:[]}})).createAgentDefinition.id;
 const run=(await gql('mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }',{input:{agentDefinitionId:definition,workspaceRootPath:workspace,llmModelIdentifier:'gemini-3.8-flash-low',llmConfig:null,autoExecuteTools:true,runtimeKind:'antigravity_cli'}})).createAgentRun; assert(run.success,'create run',run); e.runId=run.runId;
 socket=new WebSocket(backendUrl.replace('http:','ws:')+'/ws/agent/'+run.runId); const messages=[]; socket.on('message',r=>messages.push(JSON.parse(String(r)))); await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
 const id='e2e-'+randomUUID(); socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{message_id:id,dedupe_key:'agent_run_input:e2e:'+id,context_file_paths:[],image_urls:[],agent_run_id:run.runId,content:'Call MCP tools.'}}));
 await waitFor('TURN_COMPLETED',()=>messages.some(x=>x.type==='TURN_COMPLETED'),60000); await delay(500);
 const names=messages.filter(x=>x.type==='TOOL_EXECUTION_STARTED').map(x=>x.payload.tool_name); assert(JSON.stringify(names)===JSON.stringify(['view_file',...Array(6).fill('call_mcp_tool')]),'baseline wrapped names',names); e.oldNames=names;
 assert((await gql('mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }',{agentRunId:run.runId})).terminateAgentRun.success,'terminate');
 const query='query($runId: String!) { getRunProjection(runId: $runId) { conversation activities } }';
 const before=(await gql(query,{runId:run.runId})).getRunProjection;
 await fs.writeFile(path.join(outDir,'old-projection.json'),JSON.stringify(before,null,2));
 socket.close(); socket=null; e.cleanup.push({writer:await stopOwned(old)});
 const dir=path.join(data,'memory/agents',run.runId); const filesBefore=await runFiles(dir);
 const current=await start(path.join(serverDir,'dist'),'current-reader'); const after=(await gql(query,{runId:run.runId})).getRunProjection;
 await fs.writeFile(path.join(outDir,'current-projection.json'),JSON.stringify(after,null,2));
 assert(JSON.stringify(before)===JSON.stringify(after),'old history projection changed');
 e.cleanup.push({reader:await stopOwned(current)}); const filesAfter=await runFiles(dir);
 assert(JSON.stringify(filesBefore)===JSON.stringify(filesAfter),'persisted run bytes changed',{filesBefore,filesAfter});
 e.runFileHashes=filesAfter; e.result='Pass';
} catch(err) {e.error=String(err.stack??err);e.details=err.details; process.exitCode=1;} finally {
 socket?.close(); for(const c of owned.reverse()) e.cleanup.push({pid:c.pid,stop:await stopOwned(c)});
 if(clone) await fs.rm(clone,{recursive:true,force:true}); if(temp) await fs.rm(temp,{recursive:true,force:true}); e.cleanup.push({removed:[clone,temp]}); e.completedAt=new Date().toISOString();
 await fs.writeFile(path.join(outDir,'old-writer-result.json'),JSON.stringify(e,null,2)); console.log(JSON.stringify(e,null,2));
}
