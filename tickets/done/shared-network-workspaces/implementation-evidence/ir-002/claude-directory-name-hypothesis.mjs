/** Native SDK metadata-only check. No user prompt/model turn/auth import.
 * Run in a clean environment: node <file> <absolute-sdk-entry> <fresh-json>.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [sdkEntry, output] = process.argv.slice(2);
try { await fs.access(output); throw new Error('Evidence output must be fresh'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'ab-nfs-ir002-claude-')));
const plugin = path.join(root, 'plugin'), project = path.join(root, 'project'), source = path.join(root, 'source', 'linked-proof');
const result = { scope: 'Claude SDK 0.3.280 private linked mixed-name discovery; no inference/NFS', cases: [], children: [] };
const children = []; let q; let endInput;
const done = new Promise(resolve => { endInput = resolve; });
const within = async (promise, ms) => {
 let timer; try { return await Promise.race([promise, new Promise((_,reject) => { timer=setTimeout(() => reject(new Error('metadata deadline')),ms); })]); }
 finally { clearTimeout(timer); }
};
try {
 for (const dir of [project,source,path.join(root,'home'),path.join(root,'config'),path.join(plugin,'.claude-plugin'),path.join(plugin,'skills','directory-control')]) await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(plugin,'.claude-plugin','plugin.json'),JSON.stringify({name:'autobyteus-configured',version:'1.0.0',description:'Owned linked discovery fixture'}));
 for (const [name,dir] of [['linked-proof',source],['directory-control',path.join(plugin,'skills','directory-control')]]) {
  await fs.writeFile(path.join(dir,'SKILL.md'),`---\nname: ${name === "linked-proof" ? "Mixed Writer" : name}\ndescription: Owned discovery fixture\n---\nRead support.txt.\n`);
  await fs.writeFile(path.join(dir,'support.txt'),'test-owned-support-'+name+'\n');
 }
 await fs.symlink(source,path.join(plugin,'skills','linked-proof'),'dir');
 const env = {PATH:process.env.PATH,HOME:path.join(root,'home'),CLAUDE_CONFIG_DIR:path.join(root,'config'),TERM:'dumb',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1'};
 // The SDK also reads its own process environment; this probe is launched with env -i.
 const {query}=await import(pathToFileURL(sdkEntry).href);
 q=query({prompt:(async function*(){await done;})(),options:{cwd:project,settingSources:[],plugins:[{type:'local',path:plugin}],persistSession:false,env,
  spawnClaudeCodeProcess(options){
   const child=spawn(options.command,options.args,{cwd:options.cwd,env:options.env,stdio:['pipe','pipe','pipe']});
   const receipt={pid:child.pid,closed:false,argv:[options.command,...options.args]};result.children.push(receipt);
   children.push({child,closed:new Promise(resolve=>child.once('close',(code,signal)=>{receipt.closed=true;receipt.code=code;receipt.signal=signal;resolve();}))});
   child.stderr.on('data',data=>{result.stderr=(result.stderr??'')+data.toString();});return child;
  }
 }});
 result.initialization=await within(q.initializationResult(),25000);
 result.commands=await within(q.supportedCommands(),10000);
 const names=result.commands.map(c=>c.name);
 result.cases.push({name:'positive directory control discovered',pass:names.includes('autobyteus-configured:directory-control')});
 result.cases.push({name:'private directory symlink discovered',pass:names.includes('autobyteus-configured:linked-proof')});
 result.cases.push({name:'project unmodified',pass:(await fs.readdir(project)).length===0});
 result.cases.push({name:'source support intact',pass:await fs.readFile(path.join(source,'support.txt'),'utf8')==='test-owned-support-linked-proof\n'});
 if(result.cases.some(c=>!c.pass))throw new Error('native discovery assertion failed');
} catch(error) {result.failure=String(error);process.exitCode=1;}
finally {
 endInput();q?.close();
 for(const {child,closed} of children){
  try {await within(closed,3000);}catch{child.kill('SIGTERM');try{await within(closed,3000);}catch{child.kill('SIGKILL');await within(closed,3000);}}
 }
 await fs.rm(root,{recursive:true});
 result.cleanup={exactChildrenClosed:result.children.every(c=>c.closed),scratchRemoved:await fs.access(root).then(()=>false,()=>true)};
 await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({cases:result.cases,failure:result.failure,cleanup:result.cleanup}));
