import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { AgentRunConfig } from '../../../../../src/agent-execution/domain/agent-run-config.js';
import { AgentRunContext } from '../../../../../src/agent-execution/domain/agent-run-context.js';
import { CodexAgentRunContext } from '../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js';
import { CodexThreadManager } from '../../../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js';
import { CodexClientThreadRouter } from '../../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js';
import { CodexAppServerClient } from '../../../../../src/runtime-management/codex/client/codex-app-server-client.js';
import { CodexAppServerClientManager } from '../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js';
import { RuntimeSkillProfile } from '../../../../../src/agent-execution/backends/shared/runtime-skill-profile.js';
import { Skill } from '../../../../../src/skills/domain/models.js';

it('retains exact Codex private exposure until process close succeeds, without touching a peer',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'codex-private-process-')));
 const children:CodexAppServerClient[]=[];const profiles:RuntimeSkillProfile[]=[];
 const fixture=fileURLToPath(new URL('../../../../fixtures/codex-owned-terminal-cli.mjs',import.meta.url));
 const clients=new CodexAppServerClientManager({createClient:cwd=>{const c=new CodexAppServerClient({command:process.execPath,args:[fixture],cwd,env:{},requestTimeoutMs:2000});children.push(c);return c;}});
 const manager=new CodexThreadManager(clients,new CodexClientThreadRouter());
 try{
  for(const name of ['project','source'])await fs.mkdir(path.join(root,name));
  await fs.writeFile(path.join(root,'source','SKILL.md'),'configured');
  const skill=new Skill({name:'writer',description:'fixture',content:'',rootPath:path.join(root,'source')});
  for(let i=0;i<2;i++){
   const memoryDir=path.join(root,`memory-${i}`);await fs.mkdir(memoryDir);
   const p=new RuntimeSkillProfile({runtime:'codex',privateParent:path.join(root,'profiles'),workingDirectory:path.join(root,'project'),bindings:[{kind:'resolved',skill}],collisionPolicy:'fail',resolveManagedSkill:()=>skill,assertAccepting:()=>{}});
   profiles.push(p);await p.prepare();
   await manager.createThread(new AgentRunContext({runId:`run-${i}`,config:new AgentRunConfig({runtimeKind:'codex_app_server',agentDefinitionId:'fixture',llmModelIdentifier:'',autoExecuteTools:false,memoryDir}),
    runtimeContext:new CodexAgentRunContext({privateSkillProfile:p,codexThreadConfig:{model:null,workingDirectory:path.join(root,'project'),reasoningEffort:null,serviceTier:null,approvalPolicy:null,sandbox:null,baseInstructions:null,developerInstructions:null,dynamicTools:[]}})}),()=>{});
  }
  expect(children).toHaveLength(2);
  const close=vi.spyOn(children[0]!,'close').mockRejectedValueOnce(Error('test physical close pending'));
  const first=manager.getThread('run-0')!;
  await expect(manager.terminateThread('run-0',first)).rejects.toThrow();
  expect(await fs.readFile(path.join(profiles[0]!.exposures[0]!.linkRoot,'SKILL.md'),'utf8')).toBe('configured');
  await manager.terminateThread('run-0',first);
  expect(close).toHaveBeenCalledTimes(2);
  await expect(fs.access(profiles[0]!.root)).rejects.toMatchObject({code:'ENOENT'});
  expect(await fs.readFile(path.join(profiles[1]!.exposures[0]!.linkRoot,'SKILL.md'),'utf8')).toBe('configured');
  await children[1]!.request('test/barrier',{});
  await manager.terminateThread('run-1',manager.getThread('run-1')!);
  await expect(fs.access(profiles[1]!.root)).rejects.toMatchObject({code:'ENOENT'});
  expect(await fs.readdir(path.join(root,'project'))).toEqual([]);
  expect(await fs.readFile(path.join(skill.rootPath,'SKILL.md'),'utf8')).toBe('configured');
 }finally{await clients.close();for(const p of profiles)await p.release();await fs.rm(root,{recursive:true,force:true});}
},15000);
