/** Actual current packaged Electron-Node child IPC. Fault injection changes only the temporary runner.
 * Windows parent/taskkill ordering remains deterministic repository coverage, not platform certification.
 */
import fs from 'node:fs/promises';import{join,resolve}from'node:path';import{tmpdir}from'node:os';import{pathToFileURL}from'node:url';import{spawn,execFileSync}from'node:child_process';import assert from'node:assert/strict';
const evidence=resolve(process.env.TEST_API_EVIDENCE_DIR ?? 'tickets/in-progress/backend-port-conflict-20261024/evidence'),app=resolve('autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents'),exe=join(app,'MacOS/AutoByteus'),server=join(app,'Resources/server');
const own=await fs.realpath(await fs.mkdtemp(join(tmpdir(),'ab-api07-'))),wire='autobyteus.embedded-server.shutdown.v1:';
const record={case:'API-07',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),own,date:new Date().toISOString(),cases:[]};const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label,ms=40000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await delay(50)}throw Error('timeout '+label)};
let active;
try{
 for(const mode of['startup-cancel','complete','cleanup-unconfirmed','transport-unconfirmed']){
  const root=join(own,mode),data=join(root,'data'),home=join(root,'home');for(const dir of[data,home])await fs.mkdir(dir,{recursive:true});await fs.writeFile(join(data,'sentinel'),'unchanged');await fs.writeFile(join(data,'.env'),'APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:0\n');
  const row={mode,messages:[],start:new Date().toISOString()};record.cases.push(row);let logs='';
  let entry=join(server,'dist/app.js');
  if(mode==='cleanup-unconfirmed'){
   entry=join(root,'fault.mjs');await fs.writeFile(entry,`import{NativeCommandShutdown}from ${JSON.stringify(pathToFileURL(join(server,'dist/compositions/native-command-shutdown.js')).href)};const close=NativeCommandShutdown.prototype.close;NativeCommandShutdown.prototype.close=async function(cleanup){await close.call(this,cleanup);throw Error('API07_EMULATED_UNCONFIRMED_REPORT')};const{startServer}=await import(${JSON.stringify(pathToFileURL(join(server,'dist/app.js')).href)});await startServer();`);
  }
  active=spawn(exe,[entry,'--host','127.0.0.1','--port','0','--data-dir',data],{cwd:server,env:{PATH:process.env.PATH,HOME:home,TMPDIR:root,ELECTRON_RUN_AS_NODE:'1',AUTOBYTEUS_AGENT_PACKAGE_ROOTS:''},stdio:['ignore','pipe','pipe','ipc']});row.pid=active.pid;
  active.stdout.on('data',b=>logs+=b);active.stderr.on('data',b=>logs+=b);let ready=false;
  active.on('message',message=>{row.messages.push({message,at:new Date().toISOString(),childExited:active.exitCode!==null});if(message===wire+'ready'){ready=true;if(mode==='startup-cancel')active.send(wire+'request')}});
  await wait(()=>{if(active.exitCode!==null)throw Error('child exited before ready '+logs);return ready},'IPC ready');
  if(mode!=='startup-cancel'){
   await wait(()=>{if(active.exitCode!==null)throw Error('child exited before HTTP '+logs);return logs.includes('Server listening on 127.0.0.1:0')},'HTTP ready');
   const urls=[...logs.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)];row.url=urls.at(-1)?.[1];assert(row.url);assert.equal((await fetch(row.url+'/rest/health')).status,200);
   if(mode==='transport-unconfirmed'){active.disconnect();active.kill('SIGTERM')}else active.send(wire+'request');
  }
  const requested=Date.now();await wait(()=>active.exitCode!==null||active.signalCode!==null,'shutdown exit',30000);row.exit=active.exitCode;row.signal=active.signalCode;row.elapsedMs=Date.now()-requested;
  assert.equal(row.signal,null);assert.equal(row.exit,mode.endsWith('unconfirmed')?1:0);
  assert.equal(row.messages.some(x=>x.message===wire+'complete'),!mode.endsWith('unconfirmed'));
  assert.equal(row.messages.some(x=>x.message===wire+'failed'),mode==='cleanup-unconfirmed');
  assert(row.messages.every(x=>!x.childExited),'wire completion must precede exit');
  if(mode==='transport-unconfirmed')assert(logs.includes('shutdown result unconfirmed'));
  if(row.url)assert.equal(await fetch(row.url+'/rest/health',{signal:AbortSignal.timeout(800)}).then(r=>r.status,()=>null),null);
  assert.equal(await fs.readFile(join(data,'sentinel'),'utf8'),'unchanged');row.data='unchanged';row.result='Pass';await fs.writeFile(join(evidence,`API-07-${mode}.log`),logs);console.log(JSON.stringify(row));active=null;
 }
 record.result='Pass';
}catch(error){record.result='Fail';record.error=String(error.stack??error);console.error(error);process.exitCode=1}
finally{if(active&&active.exitCode===null&&active.signalCode===null){active.kill('SIGTERM');await wait(()=>active.exitCode!==null||active.signalCode!==null,'owned cleanup',15000).catch(async()=>{active.kill('SIGKILL');await wait(()=>active.signalCode!==null,'owned force')})}await fs.rm(own,{recursive:true,force:true,maxRetries:10,retryDelay:100});record.rootRemoved=true;await fs.writeFile(join(evidence,'API-07-result.json'),JSON.stringify(record,null,2))}
