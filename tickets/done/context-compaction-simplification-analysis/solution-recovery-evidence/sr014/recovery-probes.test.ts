import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LMStudioModelProvider } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/llm/lmstudio-provider.js';
import { LLMConfig } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/llm/utils/llm-config.js';
import { OpenAICompatibleRequestBuilder } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/llm/api/openai-compatible-request-builder.js';
import { Message, MessageRole } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/llm/utils/messages.js';
import { createCompactedMemoryUserMessage } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/memory/working-context-finalizer.js';
import { WorkingContextCompactionPromptBuilder } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.js';
import { COMPACTION_SUMMARY_PROMPT } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-ts/src/memory/compaction/compaction-summary-prompt.js';
vi.mock('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/src/config/app-config-provider.js', () => ({appConfigProvider:{config:{get:vi.fn()}}}));
vi.mock('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/src/agent-execution/backends/autobyteus/available-llm-construction.js', () => ({createAvailableLlm:vi.fn()}));
import { configureCompactionLlm } from '/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.js';
const root='/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
afterEach(()=>{ vi.unstubAllGlobals();vi.unstubAllEnvs(); });
describe('SR-014 no-provider reconstruction: defaults and immutable repeated input',()=>{
  it('discovers synthetic model metadata and constructs current app-controlled default request without a provider',async()=>{
    vi.stubEnv('LMSTUDIO_HOSTS','http://localhost:1234');
    const fetchMock=vi.fn(async()=>new Response(JSON.stringify({models:[{key:'qwen/qwen3.6-35b-a3b',max_context_length:262144,loaded_instances:[{config:{context_length:262144}}]}]}),{status:200}));
    vi.stubGlobal('fetch',fetchMock);
    const discovered=await LMStudioModelProvider.discoverModels();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('http://localhost:1234/api/v1/models');
    const model=discovered.models[0]!;
    const effective=configureCompactionLlm(model,model.defaultConfig,null);
    const request=OpenAICompatibleRequestBuilder.build({model:model.value,messages:[{role:'system',content:COMPACTION_SUMMARY_PROMPT},{role:'user',content:'Synthetic source only'}],config:effective,kwargs:{logicalConversationId:'sr014-no-provider'}}) as any;
    expect(model.defaultConfig.temperature).toBe(0.7);expect(model.defaultConfig.maxTokens).toBeNull();
    expect(effective.temperature).toBe(0.7);expect(effective.maxTokens).toBe(8192);
    expect(request.temperature).toBe(0.7);expect(request.max_completion_tokens).toBe(8192);
    for(const key of ['tools','tool_choice','stop','stream','response_format','seed','top_p','logicalConversationId'])expect(request).not.toHaveProperty(key);
    expect(Object.keys(request).sort()).toEqual(['max_completion_tokens','messages','model','temperature']);
    const parent=new LLMConfig({temperature:0,maxTokens:1024});
    const baseline=configureCompactionLlm(model,model.defaultConfig,null);
    expect(baseline.temperature).not.toBe(parent.temperature);expect(baseline.maxTokens).not.toBe(parent.maxTokens);
    const zero=configureCompactionLlm(model,model.defaultConfig,{temperature:0});
    expect(zero.temperature).toBe(0);expect(zero.maxTokens).toBe(baseline.maxTokens);
    writeFileSync(root+'/solution-recovery-evidence/sr014/configuration-reconstruction.json',JSON.stringify({
      kind:'No-provider reconstruction from current source and synthetic discovery metadata; not failed-run wire capture',
      modelIdentifier:model.modelIdentifier,defaultTemperature:model.defaultConfig.temperature,defaultMaxTokens:model.defaultConfig.maxTokens,
      effectiveTemperature:effective.temperature,effectiveMaxTokens:effective.maxTokens,requestKeys:Object.keys(request),
      requestControls:{temperature:request.temperature,max_completion_tokens:request.max_completion_tokens},
      providerOwnedUnobserved:['top_p','top_k','min_p','seed','chat-template','thinking-mode','quantization','backend-version'],
      parentFixture:{temperature:parent.temperature,maxTokens:parent.maxTokens},isolatedOverrideSupported:{temperature:zero.temperature,maxTokens:zero.maxTokens},
      realNetworkCalls:0,limitations:'Does not recover historical wire bytes or server-side defaults; does not demonstrate temperature caused or fixes semantic failure.'
    },null,2)+'\n');
  });
  it('freezes exact failed repeated input and distinguishes correction from completed action',()=>{
    const obs=JSON.parse(readFileSync(root+'/api-e2e-evidence/api-rev-002/semantic-final-observations.json','utf8'));
    const first=obs.find((v:any)=>v.event==='semantic_first');const repeated=obs.find((v:any)=>v.event==='semantic_repeated');
    const unit=(id:string,message:Message,kind:'message'|'compacted_memory')=>({id,kind,startIndex:0,endIndex:0,rawTraceIds:[],messages:[message]});
    const history=new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      unit('prior-summary',createCompactedMemoryUserMessage(first.summary),'compacted_memory'),
      unit('correction',new Message(MessageRole.USER,{content:repeated.correction}),'message')]);
    expect(history).toContain(first.summary);expect(history).toContain(repeated.correction);
    expect(first.summary).not.toContain('APPROVAL-73');expect(history).not.toContain('Updated plan with retention policy');
    expect(repeated.summary).toContain('Updated plan with retention policy (30 days) and checkpoint `APPROVAL-73`.');
    const sourceMessages=[{role:'system',content:COMPACTION_SUMMARY_PROMPT},{role:'user',content:'Summary budget: 3000 tokens.\n\n'+history}];
    writeFileSync(root+'/solution-recovery-evidence/sr014/frozen-repeated-input.json',JSON.stringify({
      kind:'Production prompt-builder replay from retained synthetic failed-sample source; no generation',
      firstSummary:first.summary,correction:repeated.correction,sourceMessages,
      firstSummarySha256:sha(first.summary),correctionSha256:sha(repeated.correction),messagesSha256:sha(JSON.stringify(sourceMessages)),
      approvedPromptFileSha256:sha(readFileSync(root+'/proposed-compaction-prompt.md','utf8')),
      failedRepeatedSummarySha256:sha(repeated.summary),noSubsequentAssistantOrToolEvidence:true,
      note:'Freeze this previous summary rather than generating another first summary when comparing request configuration; failed run itself is not replayable from a random seed.'
    },null,2)+'\n');
  });
});
