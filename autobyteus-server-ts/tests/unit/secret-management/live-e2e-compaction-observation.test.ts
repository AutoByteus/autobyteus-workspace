import fs from 'node:fs/promises';
import { afterEach, expect, it, vi } from 'vitest';
import { AgentRun } from '../../../src/agent-execution/domain/agent-run.js';
import { AutoByteusAgentRunBackendFactory } from '../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js';
import { LiveE2eScenarioExecution } from '../../../../test-support/live-e2e/live-e2e-harness.js';
import { describeLiveE2eError } from '../../../../test-support/live-e2e/live-e2e-safe-error.js';
import { liveE2eScenarios } from '../../../../test-support/live-e2e/live-e2e-scenarios.mjs';
import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('omits arbitrary messages, stacks, headers and unknown codes including nested causes', () => {
  const error = Object.assign(new Error('synthetic-private-value'), {code:'synthetic-private-value',headers:{value:'synthetic-private-value'},cause:Object.assign(new Error('synthetic-private-value'),{code:'ENOENT'})});
  const result = describeLiveE2eError(error);
  expect(JSON.stringify(result)).not.toContain('synthetic-private-value');
  expect(result).toMatchObject({category:'Error',code:null,cause:{code:'ENOENT'}});
});
it('captures post failure before termination/deletion and rethrows original without provider traffic', async () => {
  const registry = defaultToolRegistry.snapshot();
  const network = vi.fn(() => { throw new Error('NETWORK_FORBIDDEN'); }); vi.stubGlobal('fetch', network);
  const scenario = new LiveE2eScenarioExecution('lmstudio.qwen36.compaction-agent-flow',liveE2eScenarios['lmstudio.qwen36.compaction-agent-flow']!,{} as never,'http://127.0.0.1:1');
  vi.spyOn(scenario as any,'resolveScenarioModelIdentifier').mockResolvedValue('fixture');
  let root = ''; const order:string[]=[];
  vi.spyOn(AutoByteusAgentRunBackendFactory.prototype,'createBackend').mockImplementation(async(config,id)=>{
    root = config.memoryDir!.replace(/\/memory$/,'');
    return {getContext:()=>({runId:id,config}),getLifecycleSnapshot:()=>({availability:'online',phase:'idle',currentTurn:{kind:'NONE'}}),subscribeToSourceEventBatches:()=>()=>{}} as never;
  });
  const failure=Object.assign(new Error('synthetic-private-value'),{code:'ETIMEDOUT'});
  vi.spyOn(AgentRun.prototype,'postUserMessage').mockRejectedValue(failure);
  vi.spyOn(AgentRun.prototype,'terminate').mockImplementation(async()=>{order.push('terminate');return {} as never;});
  const output=vi.spyOn(process.stdout,'write').mockImplementation(()=>true);
  let observed:any;
  try {
    await expect(scenario.executeCompactionAgentFlow((value:any)=>{
      if(value.event==='managed_compaction_all_exit'){order.push('observe');observed=value;}
    })).rejects.toBe(failure);
    expect(order).toEqual(['observe','terminate']);
    expect(observed).toMatchObject({stage:'post-turn-1',completedTurns:0,error:{code:'ETIMEDOUT'},parentRequests:[],summaryRequests:[]});
    expect(JSON.stringify(output.mock.calls)).not.toContain('synthetic-private-value');
    await expect(fs.stat(root)).rejects.toMatchObject({code:'ENOENT'});
    expect(network).not.toHaveBeenCalled();
  } finally { defaultToolRegistry.restore(registry); }
});
