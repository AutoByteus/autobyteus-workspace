// Investigation only: assertions document the baseline defect, not desired behavior.
import { test, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { startBackgroundProcess, registerStartBackgroundProcessTool } from '../../../../autobyteus-ts/src/tools/terminal/tools/start-background-process';
import { getBackgroundManager } from '../../../../autobyteus-ts/src/tools/terminal/background-process-context';
import { ToolCleanupStep } from '../../../../autobyteus-ts/src/agent/shutdown-steps/tool-cleanup-step';
import { BaseServerManager } from '../../../../autobyteus-web/electron/server/baseServerManager';
import { createEmbeddedServerClientEndpoint } from '../../../../autobyteus-web/shared/embeddedServerClientEndpoint';
vi.mock('../../../../autobyteus-web/electron/logger', () => { const logger:any = {info(){},warn(){},error(){},debug(){},child(){return logger}}; return {logger}; });
vi.mock('../../../../autobyteus-web/electron/server/services/AppDataService', () => ({AppDataService: class {getAppDataDir(){return '/unused-probe'} isFirstRun(){return false} initialize(){} }}));
class ProbeManager extends BaseServerManager {
  protected getServerRoot(){ return '/unused-probe'; }
  protected async launchServerProcess() { throw new Error('No backend spawn allowed in this probe'); }
  public checkPort(){return this.waitForPortToBeFree(250);}
}

test('unrelated 426 listener survives stop; preflight recovers after listener removal', async()=> {
  const listener=createServer((_req,res)=> {res.writeHead(426);res.end('Upgrade Required');});
  await new Promise<void>(r=>listener.listen(0,'::',r));
  const port=(listener.address() as any).port;
  const manager=new ProbeManager({clientEndpoint:createEmbeddedServerClientEndpoint(port),listenerPolicy:'preserve-backend-default',baseDataRoot:'/unused-probe',environmentPolicy:'inherit-caller'});
  try {
    expect((await fetch(`http://127.0.0.1:${port}/rest/health`)).status).toBe(426);
    await expect(manager.checkPort()).rejects.toThrow(`Port ${port} is still in use after 250ms`);
    await manager.stopServer();
    expect((await fetch(`http://127.0.0.1:${port}/rest/health`)).status).toBe(426);
    console.log(JSON.stringify({case:'unrelated-listener',port,afterStop:426,baselineDiagnostic:'generic port error without ownership or guidance'}));
  } finally { listener.closeAllConnections();await new Promise<void>(r=>listener.close(()=>r())); }
  await expect(manager.checkPort()).resolves.toBeUndefined();
  console.log(JSON.stringify({case:'unrelated-listener',port,cleanup:'listener closed; actual production preflight passes'}));
});

test('native background tool inherits no-op cleanup: shutdown step leaves owned listener alive', async()=> {
  const dir=await mkdtemp(join(tmpdir(),'ab-shutdown-probe-')); const receipt=join(dir,'listener.json');
  const ctx:any={agentId:'probe-owned-agent',workspaceRootPath:dir,customData:{terminalChildEnvironment:()=>({PATH:process.env.PATH,HOME:dir})},toolInstances:{start_background_process:registerStartBackgroundProcessTool()}};
  const code=`const fs=require('fs'),http=require('http'); const s=http.createServer((q,r)=>{r.writeHead(426);r.end('owned probe');});s.listen(0,'127.0.0.1',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:s.address().port})));`;
  const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
  let info:any;
  try {
    info=await startBackgroundProcess(ctx,`${quote(process.execPath)} -e ${quote(code)}`,dir);
    let child:any; for(let i=0;i<100;i++){try{child=JSON.parse(await readFile(receipt,'utf8'));break;}catch{await sleep(30)}}
    expect(child).toBeTruthy();
    expect((await fetch(`http://127.0.0.1:${child.port}`)).status).toBe(426);
    const result=await new ToolCleanupStep().execute(ctx);
    expect(result).toBe(true);
    expect((await fetch(`http://127.0.0.1:${child.port}`)).status).toBe(426);
    console.log(JSON.stringify({case:'native-background-shutdown',toolPid:info.pid,listener:child,cleanupStepReportedSuccess:result,listenerStillAlive:true,toolCleanupType:typeof ctx.toolInstances.start_background_process.cleanup}));
  } finally {await getBackgroundManager(ctx).stopAll();await rm(dir,{recursive:true,force:true});if(info){expect(()=>process.kill(info.pid,0)).toThrow();} console.log(JSON.stringify({case:'native-background-shutdown',cleanup:'exact owned manager stopped; temp directory removed'}));}
});
