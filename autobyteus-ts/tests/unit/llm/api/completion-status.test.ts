import {describe, expect, it, vi} from 'vitest';
import {OpenAICompatibleLLM} from '../../../../src/llm/api/openai-compatible-llm.js';
import {OpenAIResponsesLLM} from '../../../../src/llm/api/openai-responses-llm.js';
import {AnthropicLLM} from '../../../../src/llm/api/anthropic-llm.js';
import {GeminiLLM} from '../../../../src/llm/api/gemini-llm.js';
import {MistralLLM} from '../../../../src/llm/api/mistral-llm.js';
import {OllamaLLM} from '../../../../src/llm/api/ollama-llm.js';
import {AutobyteusLLM} from '../../../../src/llm/api/autobyteus-llm.js';
import {LLMModel} from '../../../../src/llm/models.js';
import {LLMProvider} from '../../../../src/llm/providers.js';
import {LLMConfig} from '../../../../src/llm/utils/llm-config.js';
import {Message,MessageRole} from '../../../../src/llm/utils/messages.js';
import {providerApiKeyResolver,geminiRuntimeResolver} from '../../provider-api-key-resolver-test-helpers.js';

const model = (provider:LLMProvider) => new LLMModel({name:'test',value:'test',provider,hostUrl:'http://localhost:1'});
const config = () => new LLMConfig({maxTokens:1234,systemMessage:'system'});
const key = providerApiKeyResolver();
const messages=[new Message(MessageRole.SYSTEM,{content:'system'}),new Message(MessageRole.USER,{content:'summarize'})];
const fixture=(family:string,reason:string|undefined)=>{
 let llm:any;const send=vi.fn();
 switch(family){
 case 'chat': llm=new OpenAICompatibleLLM(model(LLMProvider.OPENAI),'http://localhost:1',config(),key,LLMProvider.OPENAI);send.mockResolvedValue({choices:[{finish_reason:reason,message:{content:'ok'}}]});llm.clientPromise=Promise.resolve({chat:{completions:{create:send}}});break;
 case 'responses':llm=new OpenAIResponsesLLM(model(LLMProvider.OPENAI),'http://localhost:1',config(),key,LLMProvider.OPENAI);send.mockResolvedValue({status:reason,output:[{type:'message',content:[{type:'output_text',text:'ok'}]}]});llm.clientPromise=Promise.resolve({responses:{create:send}});break;
 case 'anthropic':llm=new AnthropicLLM(model(LLMProvider.ANTHROPIC),config(),key);send.mockResolvedValue({stop_reason:reason,content:[{type:'text',text:'ok'}]});llm.clientPromise=Promise.resolve({messages:{create:send}});break;
 case 'gemini':llm=new GeminiLLM(model(LLMProvider.GEMINI),config(),key,geminiRuntimeResolver());send.mockResolvedValue({text:'ok',candidates:[{finishReason:reason}]});llm.clientPromise=Promise.resolve({client:{models:{generateContent:send}},runtimeInfo:{runtime:'api_key'}});break;
 case 'mistral':llm=new MistralLLM(model(LLMProvider.MISTRAL),config(),key);send.mockResolvedValue({choices:[{finishReason:reason,message:{content:'ok'}}]});llm.clientPromise=Promise.resolve({chat:{complete:send}});break;
 case 'ollama':llm=new OllamaLLM(model(LLMProvider.OLLAMA),config(),key);send.mockResolvedValue({done:true,done_reason:reason,message:{content:'ok'}});llm.client={chat:send,abort:vi.fn()};break;
 case 'rpa':llm=new AutobyteusLLM(model(LLMProvider.AUTOBYTEUS),config(),key);send.mockResolvedValue({content:'ok',finish_reason:reason});llm.clientPromise=Promise.resolve({sendMessage:send,cleanup:vi.fn()});break;
 }
 return {llm,send};
};
describe('normalized nonstream provider completion',()=>{
 it.each([
 ['chat','stop','complete'],['chat','length','incomplete'],['chat','content_filter','incomplete'],['chat','tool_calls','incomplete'],['chat',undefined,'unknown'],
 ['responses','completed','complete'],['responses','incomplete','incomplete'],['responses','failed','incomplete'],['responses',undefined,'unknown'],
 ['anthropic','end_turn','complete'],['anthropic','max_tokens','incomplete'],['anthropic','pause_turn','incomplete'],['anthropic','refusal','incomplete'],['anthropic',undefined,'unknown'],
 ['gemini','STOP','complete'],['gemini','MAX_TOKENS','incomplete'],['gemini','SAFETY','incomplete'],['gemini',undefined,'unknown'],
 ['mistral','stop','complete'],['mistral','length','incomplete'],['mistral','tool_calls','incomplete'],['mistral',undefined,'unknown'],
 ['ollama','stop','complete'],['ollama','length','incomplete'],['ollama',undefined,'unknown'],['rpa','stop','unknown'],
 ])('%s %s becomes %s',async(family,reason,expected)=>{
  const {llm,send}=fixture(family!,reason);const signal=new AbortController().signal;
  const result=await llm.sendMessages(messages,{logicalConversationId:'fresh-summary'},{signal});
  expect(result.completionStatus).toBe(expected);expect(result.completionReason).toBe(family==='rpa'?null:reason??null);
  expect(result.content).toBe('ok');expect(send).toHaveBeenCalledOnce();
  const payload=send.mock.calls[0][0];
  expect(payload.tools).toBeUndefined();expect(payload.stream).not.toBe(true);
  if(family==='chat'||family==='anthropic')expect(payload.max_tokens ?? payload.max_completion_tokens).toBe(1234);
  if(family==='responses')expect(payload.max_output_tokens).toBe(1234);
  if(family==='mistral')expect(payload.maxTokens).toBe(1234);
  if(family==='gemini'){expect(payload.config.maxOutputTokens).toBe(1234);expect(payload.config.abortSignal).toBe(signal);}
  else if(family!=='ollama')expect(send.mock.calls[0][1]?.signal).toBe(signal);
  if(family==='ollama')expect(payload.options.num_predict).toBe(1234);
 });
 it('rejects tool/refusal output even when Responses claims completed',async()=>{
  const {llm,send}=fixture('responses','completed');
  send.mockResolvedValue({status:'completed',output:[{type:'function_call',name:'bad'}]});
  expect((await llm.sendMessages(messages)).completionStatus).toBe('incomplete');
 });
 it('does not infer completion from RPA complete-looking text or cleanup',async()=>{
  const {llm}=fixture('rpa','stop');await llm.sendMessages(messages,{logicalConversationId:'isolated'});
  const client=await llm.clientPromise;const signal=new AbortController().signal;
  await llm.cleanup({signal});expect(client.cleanup).toHaveBeenCalledExactlyOnceWith('isolated',{signal});
 });
});
