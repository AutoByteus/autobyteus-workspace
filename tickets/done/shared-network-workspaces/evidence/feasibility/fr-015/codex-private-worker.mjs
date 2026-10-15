// Designer-owned capability only. Imports the immutable image's unmodified RPC client.
import { CodexAppServerClient } from './dist/runtime-management/codex/client/codex-app-server-client.js';
import { createInterface } from 'node:readline';
const [root, skillParent, skillName, resumeId] = process.argv.slice(2);
const report = x => process.stdout.write(JSON.stringify(x) + '\n');
const client = new CodexAppServerClient({command:'codex',
  args:['app-server','-c','agents.enabled=false'], cwd:root, requestTimeoutMs:120000,
  env:Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(OPENAI_API_KEY|AUTOBYTEUS_|ANTHROPIC_|AWS_|AZURE_|GOOGLE_)/.test(key))),
});
let current = null, stopped = false;
client.onNotification(event => {
  if (!current) return;
  current.events.push(event);
  if (event.method === 'turn/completed') {
    report({event:'TURN_COMPLETED',...current}); current=null;
  }
});
client.onServerRequest(request => {
  current?.events.push({method:'SERVER_REQUEST_DENIED',params:{method:request.method}});
  client.respondError(request.id,-32000,'No interactive approval or extra authority granted by this owned capability probe');
});
client.onClose(error => { if (!stopped && error) report({event:'ERROR',message:String(error)}); });
const reader=createInterface({input:process.stdin});
try {
  await client.start();
  const initialized=await client.request('initialize',{clientInfo:{name:'autobyteus-owned-private-skill-probe',version:'0.0.1'},capabilities:{experimentalApi:true}});
  client.notify('initialized',{});
  const roots=await client.request('skills/extraRoots/set',{extraRoots:[skillParent]});
  const discovered=await client.request('skills/list',{cwds:[root],forceReload:true});
  const list=discovered.data?.flatMap(row=>row.skills??[])??[];
  if (!list.some(s=>s.name===skillName && s.enabled && s.path===skillParent+'/'+skillName+'/SKILL.md')) throw new Error('Configured private skill not discovered at exact source');
  const models=await client.request('model/list',{limit:100});
  const choices=(models.data??[]).map(m=>m.model??m.id);
  const preferred=['gpt-5.4-mini','gpt-5.1-codex-mini'];
  const model=preferred.find(m=>choices.includes(m))??choices[0];
  if (!model) throw new Error('Native model catalog empty');
  const options={cwd:root,model,approvalPolicy:'never',sandbox:'workspace-write',
    baseInstructions:'Use actual native filesystem commands, only within the owned project and configured private skill. Never read credentials/home/config/environment or call network or delegate tools. Do not simulate. Project data must remain ordinary shared files.'};
  const response=await client.request(resumeId?'thread/resume':'thread/start',{...options,...(resumeId?{threadId:resumeId}:{} )});
  const thread=response.thread;
  if (thread.cwd!==root) throw new Error('Native thread cwd differs from selected project');
  report({event:'READY',initialization:initialized,extraRootsResult:roots,discovered,thread,privateSkill:skillParent+'/'+skillName+'/SKILL.md',model});
  for await (const line of reader) {
    const cmd=JSON.parse(line);
    if (cmd.action==='close') {stopped=true;break;}
    if (cmd.action==='turn') {
      if (current) throw new Error('Turn already pending');
      current={label:cmd.label,events:[]};
      const input=[{type:'text',text:cmd.prompt,text_elements:[]}];
      if (cmd.useSkill) input.push({type:'skill',name:skillName,path:skillParent+'/'+skillName+'/SKILL.md'});
      try {await client.request('turn/start',{threadId:thread.id,input,cwd:root,model,effort:'low'});}
      catch(error) {report({event:'ERROR',message:String(error)});current=null;}
    }
  }
} catch(error) {report({event:'ERROR',message:String(error)});process.exitCode=1;}
finally {stopped=true;reader.close();await client.close();}
