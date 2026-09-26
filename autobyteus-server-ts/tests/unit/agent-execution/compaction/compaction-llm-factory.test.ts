import {beforeEach, describe, expect, it, vi} from 'vitest';
import {LLMModel} from 'autobyteus-ts/llm/models.js';
import {LLMProvider} from 'autobyteus-ts/llm/providers.js';
import {LLMConfig} from 'autobyteus-ts/llm/utils/llm-config.js';
import {COMPACTION_SUMMARY_PROMPT} from 'autobyteus-ts/memory/compaction/compaction-summary-prompt.js';
const mocks = vi.hoisted(() => ({get:vi.fn(), create:vi.fn()}));
vi.mock('../../../../src/config/app-config-provider.js', () => ({appConfigProvider:{config:{get:mocks.get}}}));
vi.mock('../../../../src/agent-execution/backends/autobyteus/available-llm-construction.js', () => ({createAvailableLlm:mocks.create}));
import {configureCompactionLlm, createCompactionLlm} from '../../../../src/agent-execution/compaction/compaction-llm-factory.js';
const model = (maxOutputTokens?:number) => new LLMModel({name:'test',value:'test',provider:LLMProvider.OPENAI,maxOutputTokens});
beforeEach(() => { vi.resetAllMocks(); });
describe('fresh compaction model construction', () => {
  it('selects current parent on every call and resolves availability through existing authority', async () => {
    await createCompactionLlm({parentModelIdentifier:'parent-a'});
    await createCompactionLlm({parentModelIdentifier:'parent-b'});
    expect(mocks.create.mock.calls.map(args => args[0])).toEqual(['parent-a','parent-b']);
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
  it('selects explicit override without fallback on unavailable model', async () => {
    mocks.get.mockReturnValue('{"modelIdentifier":"override","llmConfig":{"temperature":0.1}}');
    mocks.create.mockRejectedValue(new Error('unavailable'));
    await expect(createCompactionLlm({parentModelIdentifier:'parent'})).rejects.toThrow('unavailable');
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith('override',expect.any(Function));
  });
  it.each([[null,undefined,8192],[2000,undefined,2000],[16000,4000,4000],[0,10000,8192],[-1,4000,4000]])('resolves reserved cap %s/%s to %s', (configured,max,expected) => {
    expect(configureCompactionLlm(model(max),new LLMConfig({maxTokens:configured}),null).maxTokens).toBe(expected);
  });
  it('neutralizes default and explicit invocation controls before adapter construction without losing safe tuning', () => {
    const defaults = new LLMConfig({maxTokens:12000,stopSequences:['bad'],systemMessage:'bad',extraParams:{tools:[{}],response_format:{type:'json_object'},options:{num_predict:1,temperature:0.2}}});
    const result = configureCompactionLlm(model(4096),defaults,{system_message:'bad',max_tokens:6000,temperature:0.1,extraParams:{model:'bad',messages:[],max_output_tokens:1,stop:['bad'],conversation_id:'old',stream:true,n:4,tool_choice:'required',config:{system_instruction:'bad',candidate_count:5,topK:10}}});
    expect(result.maxTokens).toBe(4096); expect(result.systemMessage).toBe(COMPACTION_SUMMARY_PROMPT);
    expect(result.stopSequences).toBeNull(); expect(result.temperature).toBe(0.1);
    expect(result.extraParams).toEqual({options:{temperature:0.2},config:{topK:10}});
    expect(defaults.extraParams.tools).toEqual([{}]); expect(defaults.maxTokens).toBe(12000);
  });
});
