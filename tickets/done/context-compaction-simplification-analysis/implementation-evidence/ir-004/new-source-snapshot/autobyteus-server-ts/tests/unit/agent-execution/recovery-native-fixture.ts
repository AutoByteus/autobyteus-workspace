import { LLMConfig } from 'autobyteus-ts/llm/utils/llm-config.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi, expect } from 'vitest';
import { AgentFactory, AgentConfig, AgentInputUserMessage, Message, LLMModel, LLMProvider, BaseLLM } from 'autobyteus-ts';
import { ChunkResponse, CompleteResponse } from 'autobyteus-ts/llm/utils/response-types.js';
import { buildLlmTokenUsageObservation } from 'autobyteus-ts/llm/utils/llm-token-usage-observation.js';
import { createEnabledMemoryCompactionConfiguration } from 'autobyteus-ts/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from 'autobyteus-ts/memory/policies/compaction-policy.js';
import { COMPACTION_SUMMARY_HEADINGS } from 'autobyteus-ts/memory/compaction/compaction-summary-parser.js';
import { resolveCompactionPlanningBudget } from 'autobyteus-ts/memory/compaction/compaction-planning-budget.js';
import { AgentRun } from '../../../src/agent-execution/domain/agent-run.js';
import { AgentRunContext } from '../../../src/agent-execution/domain/agent-run-context.js';
import { AgentRunConfig } from '../../../src/agent-execution/domain/agent-run-config.js';
import { AutoByteusAgentRunBackend } from '../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js';
import { AgentRunProviderInputNormalizer } from '../../../src/agent-execution/input/agent-run-provider-input-normalizer.js';
import { AgentRunCommandCoordinator } from '../../../src/agent-execution/services/agent-run-command-coordinator.js';
import { AgentRunCommandRegistry } from '../../../src/agent-execution/services/agent-run-command-registry.js';

export const summary = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\n- Preserve the approved scope; do not deploy.`).join('\n\n');
export async function eventually(check: () => unknown) {
  await vi.waitFor(() => expect(check()).toBeTruthy(), { timeout: 6000, interval: 10 });
}
class Parent extends BaseLLM {
  requests: Message[][] = [];
  constructor(private postResponse: boolean) {
    super(new LLMModel({ name:'parent', value:'parent', provider:LLMProvider.OPENAI, maxContextTokens:12000, activeContextTokens:12000 }),
      new LLMConfig({ maxTokens:200, compactionRatio:0.5, safetyMarginTokens:10 }));
  }
  private response(messages: Message[]) {
    this.requests.push(messages); const n = this.requests.length;
    return { content:`ANSWER-${n}`, usage:buildLlmTokenUsageObservation({ inputTokens:this.postResponse && n===4 ? 7000:200, outputTokens:1, totalTokens:null, rawUsage:null }) };
  }
  protected async _sendMessagesToLLM(messages: Message[]) { return new CompleteResponse(this.response(messages)); }
  protected async *_streamMessagesToLLM(messages: Message[]) { yield new ChunkResponse({ ...this.response(messages), is_complete:true }); }
}
export async function createRecoveryFixture(postResponse = false) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'server-recovery-'));
  const parent=new Parent(postResponse), compress=vi.fn(async()=>summary);
  const config=new AgentConfig('recovery','tester','test',parent); config.memoryDir=dir;
  config.memoryCompaction=createEnabledMemoryCompactionConfiguration(new CompactionPolicy(),()=>({compress}));
  const native=new AgentFactory().createAgent(config); native.start();
  await eventually(()=>native.currentStatus==='idle');
  const context=new AgentRunContext({ runId:native.agentId, runtimeContext:native.context,
    config:new AgentRunConfig({ agentDefinitionId:'test', llmModelIdentifier:'parent', autoExecuteTools:false, runtimeKind:'autobyteus' }) });
  const backend=new AutoByteusAgentRunBackend(context,native,{ isActive:()=>native.isRunning, removeAgent:async()=>{ await native.stop(2); return true; } });
  const forwarded=vi.fn();
  const normalizer=new AgentRunProviderInputNormalizer({ resolve:()=>null });
  const run=new AgentRun({context,backend,providerInputNormalizer:normalizer,commandObservers:[{onUserMessageForwarded:forwarded}]});
  const registry=new AgentRunCommandRegistry();
  const coordinator=new AgentRunCommandCoordinator({ registry, agentRunService: {
    getAgentRun:()=>run, resolveCommandReadyAgentRun:async()=>run, recordRunActivity:async()=>{},
  } as any, overlayStore:{clear:()=>{},getOverlay:()=>null} as any,
    projectionService:{getRunStatusProjection:()=>({statusPayload:run.getStatusSnapshot()})} as any,
    broadcaster:{publishToRun:()=>{}} as any });
  const submit=(text:string,id=text)=>coordinator.postUserMessage({runId:run.runId,messageId:id,dedupeKey:`input:${id}`,message:new AgentInputUserMessage(text)});
  for(let i=0;i<3;i++) {
    await run.postUserMessage(new AgentInputUserMessage(`seed-${i} ${'context '.repeat(1100)}`));
    await eventually(()=>parent.requests.length===i+1 && native.context.state.activeTurn===null && run.getInputStateSnapshot().entries.length===0);
  }
  return {native,run,backend,parent,compress,normalizer,forwarded,registry,coordinator,submit,
    request:()=>native.context.state.memoryManager!.requestCompaction({requestKind:'hard_input_cap',requestedTurnId:'request',planningBudget:resolveCompactionPlanningBudget({inputBudget:11800,triggerThresholdTokens:5900},7000)}),
    close:async()=>{if(native.isRunning)await native.stop(2);fs.rmSync(dir,{recursive:true,force:true});} };
}
