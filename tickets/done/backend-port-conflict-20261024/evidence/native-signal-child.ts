// Probe signal harness, not the assembled Studio server. Runs real native tools and shutdown orchestrator.
import { startBackgroundProcess, registerStartBackgroundProcessTool } from '../../../../autobyteus-ts/src/tools/terminal/tools/start-background-process';
import { AgentShutdownOrchestrator } from '../../../../autobyteus-ts/src/agent/shutdown-steps/agent-shutdown-orchestrator';
const [dir,receipt]=process.argv.slice(2);
const context:any={agentId:'owned-signal-probe',workspaceRootPath:dir,toolInstances:{start_background_process:registerStartBackgroundProcessTool()}};
const code=`const fs=require('fs'),http=require('http');const s=http.createServer((q,r)=>{r.writeHead(426);r.end('owned native listener');});s.listen(0,'::',()=>fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({pid:process.pid,port:s.address().port})));`;
const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
process.once('SIGTERM',async()=>{const result=await new AgentShutdownOrchestrator().run(context);console.log(JSON.stringify({signal:'SIGTERM',nativeShutdownSuccess:result}));process.exit(result?0:1)});
void startBackgroundProcess(context,`${quote(process.execPath)} -e ${quote(code)}`,dir);
