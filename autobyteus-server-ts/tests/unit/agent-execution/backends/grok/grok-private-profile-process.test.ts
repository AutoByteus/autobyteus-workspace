import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createGrokBuildAgentRunBackendFactory } from '../../../../../src/agent-execution/backends/grok/grok-build-agent-run-backend-factory.js';
import { AgentRunConfig } from '../../../../../src/agent-execution/domain/agent-run-config.js';
import { AgentDefinition } from '../../../../../src/agent-definition/domain/models.js';
import { Skill } from '../../../../../src/skills/domain/models.js';
import type { AgentRunBackend } from '../../../../../src/agent-execution/backends/agent-run-backend.js';
let root: string;
let backend: AgentRunBackend | undefined;
const saved = new Map<string,string | undefined>();
afterEach(async()=>{
 await backend?.terminate();backend=undefined;
 for(const [key,value] of saved){if(value===undefined)delete process.env[key];else process.env[key]=value;}saved.clear();
 if(root)await fs.rm(root,{recursive:true,force:true});
});
describe('Grok private profile through an owned native process fixture',()=>{
 it.each([true,false])('configured=%s never falls back to project materialization',async configured=>{
  root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'grok-private-process-')));
  for(const name of ['project','memory','source'])await fs.mkdir(path.join(root,name));
  await fs.writeFile(path.join(root,'source','SKILL.md'),'---\nname: writer\ndescription: fixture\n---\n');
  const fixtures=fileURLToPath(new URL('../../../../fixtures/grok-acp/',import.meta.url));
  const wrapper=path.join(root,'fake-grok');
  const quote=(s:string)=>`'${s.replaceAll("'","'\\''")}'`;
  await fs.writeFile(wrapper,`#!/bin/sh\nexec ${quote(process.execPath)} ${quote(path.join(fixtures,'fake-grok-cli.mjs'))} "$@"\n`,{mode:0o700});
  for(const [key,value] of Object.entries({GROK_BUILD_COMMAND:wrapper,FAKE_ACP_FIXTURE:path.join(fixtures,'handshake.jsonl'),FAKE_ACP_RECORD:path.join(root,'wire.jsonl')})){
   saved.set(key,process.env[key]);process.env[key]=value;
  }
  const skill=new Skill({name:'writer',description:'fixture',content:'',rootPath:path.join(root,'source')});
  const factory=createGrokBuildAgentRunBackendFactory({
   definitions:{getAgentDefinitionById:async()=>new AgentDefinition({id:'fixture',name:'Fixture',role:'writer',description:'fixture',skillNames:configured?['writer']:[],toolNames:[]})} as never,
   skills:{resolveSkillScope:()=> 'CONFIGURED',resolveConfiguredSkillBindingsForAgent:()=>configured?[{kind:'resolved',skill}]:[]} as never,
   workspaces:{resolveWorkingDirectory:async()=>path.join(root,'project')},
   mcpSessions:{activateForRun:()=>({kind:'not_exposed'})} as never,
  });
  backend=await factory.beginPreparation({kind:'new',runId:'fixture-run',config:new AgentRunConfig({runtimeKind:'grok_build',agentDefinitionId:'fixture',llmModelIdentifier:'fixture',autoExecuteTools:false,memoryDir:configured?path.join(root,'memory'):null})}).prepare();
  expect(await fs.readdir(path.join(root,'project'))).toEqual([]);
  const parent=path.join(root,'memory','runtime-skill-profiles');
  if(configured){
   const entries=await fs.readdir(parent);expect(entries).toHaveLength(1);
   expect(await fs.realpath(path.join(parent,entries[0]!,'skills','writer'))).toBe(skill.rootPath);
   expect(await fs.readFile(path.join(root,'wire.jsonl'),'utf8')).toContain('_x.ai/skills/list');
  }else await expect(fs.access(parent)).rejects.toMatchObject({code:'ENOENT'});
  await backend.terminate();backend=undefined;
  if(configured)expect(await fs.readdir(parent)).toEqual([]);
  expect(await fs.readdir(path.join(root,'project'))).toEqual([]);
  expect(await fs.readFile(path.join(skill.rootPath,'SKILL.md'),'utf8')).toContain('writer');
 },15000);
});
