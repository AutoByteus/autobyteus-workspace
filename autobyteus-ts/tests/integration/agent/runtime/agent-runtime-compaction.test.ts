import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { InterAgentMessage } from '../../../../src/agent/message/inter-agent-message.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';
import { EventType } from '../../../../src/events/event-types.js';
import {DirectLlmCompactionSummarizer} from '../../../../src/memory/compaction/direct-llm-compaction-summarizer.js';
import {COMPACTION_SUMMARY_HEADINGS} from '../../../../src/memory/compaction/compaction-summary-parser.js';
import {createEnabledMemoryCompactionConfiguration} from '../../../../src/memory/compaction/memory-compaction-configuration.js';
import {CompactionPolicy} from '../../../../src/memory/policies/compaction-policy.js';
import {MemoryType} from '../../../../src/memory/models/memory-types.js';
import {resetAgentFactory,waitForCondition,waitForStatus} from './runtime-test-harness.js';
class RecordingMainLLM extends BaseLLM {
  readonly requests: Array<Array<Record<string, unknown>>> = [];

  constructor(
    model: LLMModel,
    config: LLMConfig,
    private readonly promptTokensByCall: Array<number | null>
  ) {
    super(model, config);
  }

  protected async _sendMessagesToLLM(messages: Message[]): Promise<CompleteResponse> {
    const callIndex = this.recordRequest(messages);
    return new CompleteResponse(this.buildResponsePayload(callIndex));
  }

  protected async *_streamMessagesToLLM(messages: Message[]): AsyncGenerator<ChunkResponse, void, unknown> {
    const callIndex = this.recordRequest(messages);
    yield new ChunkResponse({
      ...this.buildResponsePayload(callIndex),
      is_complete: true
    });
  }

  private recordRequest(messages: Message[]): number {
    this.requests.push(messages.map((message) => message.toDict()));
    return this.requests.length;
  }

  private buildResponsePayload(callIndex: number): ConstructorParameters<typeof ChunkResponse>[0] {
    const promptTokens = callIndex - 1 < this.promptTokensByCall.length
      ? this.promptTokensByCall[callIndex - 1]!
      : 1;
    return {
      content: `assistant-turn-${callIndex}`,
      usage: buildLlmTokenUsageObservation({
        inputTokens: promptTokens,
        outputTokens: 1,
        totalTokens: promptTokens === null ? null : promptTokens + 1,
        rawUsage: null,
      }),
    };
  }
}


const summary = COMPACTION_SUMMARY_HEADINGS.map(h=>`## ${h}\n- Preserve scope. No deployment approved. /repo/check.ts remains unrun.`).join('\n\n');
class SummaryLLM extends BaseLLM {
  readonly send = vi.fn();
  readonly cleanup = vi.fn(async()=>undefined);
  constructor(readonly output:string) {
    super(new LLMModel({name:'summary',value:'summary',provider:LLMProvider.OPENAI,maxContextTokens:100000}),new LLMConfig({maxTokens:8192}));
    this.send.mockResolvedValue(new CompleteResponse({content:output,completionStatus:'complete'}));
  }
  protected _sendMessagesToLLM(messages:Message[]) {return this.send(messages);}
  protected async *_streamMessagesToLLM() {}
}
describe('direct compaction narrow runtime integration',()=>{
 beforeEach(()=>{resetAgentFactory();vi.spyOn(console,'debug').mockImplementation(()=>undefined);});
 afterEach(()=>{resetAgentFactory();vi.restoreAllMocks();});
 it.each([false,true])('continues with one summary; explicit user retry=%s',async(failFirst)=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'direct-runtime-'));
  const main=new RecordingMainLLM(new LLMModel({name:'parent',value:'parent',provider:LLMProvider.OPENAI,maxContextTokens:12000,activeContextTokens:12000}),new LLMConfig({maxTokens:200,compactionRatio:0.5,safetyMarginTokens:10}),[200,200,200,7000,200]);
  const created:SummaryLLM[]=[];
  const create=vi.fn(async()=>{const llm=new SummaryLLM(failFirst&&created.length===0?'invalid':`<compaction_summary>\n${summary}\n</compaction_summary>`);created.push(llm);return llm;});
  const config=new AgentConfig('test','tester','direct compaction',main);config.memoryDir=dir;
  config.memoryCompaction=createEnabledMemoryCompactionConfiguration(new CompactionPolicy(),new DirectLlmCompactionSummarizer(create));
  const agent=new AgentFactory().createAgent(config);const events:any[]=[];
  try{
   agent.start();expect(await waitForStatus(agent.context,status=>status===AgentStatus.IDLE)).toBe(true);
   agent.context.statusManager?.notifier.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED,(event)=>events.push(event));
   for(let i=1;i<=3;i++){
    await agent.postUserMessage(new AgentInputUserMessage(`Seed ${i}: ${'context '.repeat(1100)}`));
    expect(await waitForCondition(()=>main.requests.length===i&&agent.currentStatus===AgentStatus.IDLE&&agent.context.state.activeTurn===null,10000)).toBe(true);
   }
   await agent.postUserMessage(new AgentInputUserMessage('Complete this turn and compact.'));
   expect(await waitForCondition(()=>events.some(e=>e.phase===(failFirst?'failed':'completed'))&&agent.context.state.activeTurn===null,10000)).toBe(true);
   if(failFirst){
    expect(created).toHaveLength(1);expect(main.requests).toHaveLength(4);
    expect(agent.context.state.memoryManager?.isCompactionAwaitingUserRetry()).toBe(true);
   }
   await agent.postUserMessage(new AgentInputUserMessage('Continue with the approved scope.'));
   expect(await waitForCondition(()=>main.requests.length===5&&agent.currentStatus===AgentStatus.IDLE,10000)).toBe(true);
   expect(created).toHaveLength(failFirst?2:1);
   for(const llm of created){expect(llm.send).toHaveBeenCalledOnce();expect(llm.cleanup).toHaveBeenCalledOnce();}
   expect(create.mock.calls.every((args:any)=>args[0].parentModelIdentifier==='parent')).toBe(true);
   expect(events.filter(e=>e.phase==='completed')).toHaveLength(1);
   expect(new Set(events.map(e=>e.compaction_operation_id)).size).toBe(1);
   const manager=agent.context.state.memoryManager!;
   expect(manager.hasPendingCompaction()).toBe(false);
   expect(manager.store.list(MemoryType.EPISODIC)).toEqual([]);
   expect(manager.store.list(MemoryType.SEMANTIC)).toEqual([]);
   expect(main.requests[4]?.some(message=>String(message.content).includes('No deployment approved'))).toBe(true);
  }finally{if(agent.isRunning)await agent.stop(2);await main.cleanup();fs.rmSync(dir,{recursive:true,force:true});}
 },30000);
});
