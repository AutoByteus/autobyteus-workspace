import 'reflect-metadata';
import { buildSchema, registerEnumType } from 'type-graphql';
import { createRequire } from 'node:module';
const { graphql } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const io=vi.hoisted(()=>({getMemberModelConfig:vi.fn(),updateStoppedMemberModelConfig:vi.fn()}));
vi.mock('../../../../../src/api/graphql/studio-application-api-services.js',()=>({getStudioAgentOrgRunService:()=>io}));
vi.mock('../../../../../src/run-history/services/agent-org-member-run-view-projection-service.js',()=>({getAgentOrgMemberRunViewProjectionService:()=>({})}));
import { SkillAccessMode } from 'autobyteus-ts/agent/context/skill-access-mode.js';
registerEnumType(SkillAccessMode, { name: 'SkillAccessModeEnum' });
import { AgentOrgRunResolver } from '../../../../../src/api/graphql/types/agent-org-run.js';
const identity={orgRunId:'org',memberAddress:'/worker',agentRunId:'agent'};
const canonical={...identity,launchConfiguration:{runtimeKind:'autobyteus',llmModelIdentifier:'model',llmConfig:{temperature:0,enabled:false},autoExecuteTools:false,skillAccessMode:'PRELOADED_ONLY',workspaceRootPath:'/workspace'},isActive:false,editability:{editable:true,reason:null}};
describe('Org model configuration GraphQL transport',()=>{
 it('executes the actual web query/mutation documents through typed resolver contracts',async()=>{
  const schema=await buildSchema({resolvers:[AgentOrgRunResolver],validate:false});
  const web=new URL('../../../../../../autobyteus-web/',import.meta.url);
  const queryText=readFileSync(new URL('graphql/queries/runModelOptionsQueries.ts',web),'utf8');
  const query=queryText.match(/export const AgentOrgMemberModelConfig = gql`([\s\S]*?)`/)![1]!.replace('${options}',queryText.match(/const options = gql`([\s\S]*?)`/)![1]!);
  const mutation=readFileSync(new URL('graphql/mutations/agentOrgRunMutations.ts',web),'utf8').match(/export const UpdateStoppedAgentOrgMemberModelConfig = gql`([\s\S]*?)`/)![1]!;
  io.getMemberModelConfig.mockResolvedValue({...canonical,modelOptions:{currentModelIdentifier:'model',currentContextTokens:null,replacements:[],unavailableReason:'metadata unavailable'}});
  const read=await graphql({schema,source:query,variableValues:{identity}});expect(read.errors).toBeUndefined();expect(io.getMemberModelConfig).toHaveBeenCalledWith(identity);expect(read.data?.getAgentOrgMemberModelConfig).toMatchObject(canonical);
  io.updateStoppedMemberModelConfig.mockResolvedValue({success:true,outcome:'UPDATED',message:'Saved',canonical,isActive:false,editability:canonical.editability,fieldErrors:[]});
  const input={...identity,llmModelIdentifier:'model',llmConfig:{temperature:0,enabled:false}};
  const saved=await graphql({schema,source:mutation,variableValues:{input}});expect(saved.errors).toBeUndefined();expect(io.updateStoppedMemberModelConfig).toHaveBeenCalledWith(input);expect(saved.data?.updateStoppedAgentOrgMemberModelConfig).toMatchObject({canonical,success:true});
  const invalid=await graphql({schema,source:mutation,variableValues:{input:{...input,runtimeKind:'codex_app_server'}}});expect(invalid.errors?.length).toBeGreaterThan(0);
 });
});
