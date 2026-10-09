import {describe, expect, it, vi} from 'vitest';
import {OpenAICompatibleLLM} from 'autobyteus-ts/llm/api/openai-compatible-llm.js';
import {OpenAIResponsesLLM} from 'autobyteus-ts/llm/api/openai-responses-llm.js';
import {AnthropicLLM} from 'autobyteus-ts/llm/api/anthropic-llm.js';
import {GeminiLLM} from 'autobyteus-ts/llm/api/gemini-llm.js';
import {MistralLLM} from 'autobyteus-ts/llm/api/mistral-llm.js';
import {OllamaLLM} from 'autobyteus-ts/llm/api/ollama-llm.js';
import {AutobyteusLLM} from 'autobyteus-ts/llm/api/autobyteus-llm.js';
import {LLMModel} from 'autobyteus-ts/llm/models.js';
import {LLMProvider} from 'autobyteus-ts/llm/providers.js';
import {LLMConfig} from 'autobyteus-ts/llm/utils/llm-config.js';
import {Message,MessageRole} from 'autobyteus-ts/llm/utils/messages.js';
import {SecretValue} from 'autobyteus-ts/secrets/secret-value.js';
import {configureCompactionLlm} from '../../../../src/agent-execution/compaction/compaction-llm-factory.js';
const providerApiKeyResolver=()=>({resolve:async()=>SecretValue.fromString('synthetic')});
const geminiRuntimeResolver=()=>async()=>({kind:'aiStudio' as const});

const model = (provider:LLMProvider) => new LLMModel({name:'test',value:'test',provider,hostUrl:'http://localhost:1'});
const config = () => configureCompactionLlm(model(LLMProvider.OPENAI),new LLMConfig({maxTokens:1234,extraParams:{tools:[{name:'bad'}],max_completion_tokens:1,response_format:{type:'json_object'},stop:['bad'],stream:true,n:9,previous_response_id:'old'}}),{extraParams:{max_tokens:1,max_output_tokens:2,maxOutputTokens:3,num_predict:4,tool_choice:'required',system_instruction:'bad',messages:[{role:'user',content:'bad'}],options:{num_predict:5},config:{tools:[{}],maxOutputTokens:6,responseMimeType:'application/json'}}});
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
describe('effective isolated compactor provider requests',()=>{
 it.each(['chat','responses','anthropic','gemini','mistral','ollama'])('%s cannot reintroduce invocation controls from defaults or extraParams',async family=>{
  const {llm,send}=fixture(family,undefined);await llm.sendMessages(messages,{logicalConversationId:'fresh'});
  const payload=send.mock.calls[0][0];const flattened=JSON.stringify(payload);
  expect(payload.tools).toBeUndefined();expect(payload.tool_choice).toBeUndefined();
  expect(payload.response_format).toBeUndefined();expect(payload.stop).toBeUndefined();
  expect(payload.stream).not.toBe(true);expect(payload.n).toBeUndefined();expect(payload.previous_response_id).toBeUndefined();
  expect(flattened).not.toContain('"bad"');expect(flattened).not.toContain('json_object');expect(flattened).not.toContain('application/json');
  if(family==='chat')expect(payload.max_completion_tokens).toBe(1234);
  if(family==='anthropic')expect(payload.max_tokens).toBe(1234);
  if(family==='responses')expect(payload.max_output_tokens).toBe(1234);
  if(family==='mistral')expect(payload.maxTokens).toBe(1234);
  if(family==='gemini'){expect(payload.config.maxOutputTokens).toBe(1234);expect(payload.config.tools).toBeUndefined();}
  if(family==='ollama')expect(payload.options.num_predict).toBe(1234);
 });
});
