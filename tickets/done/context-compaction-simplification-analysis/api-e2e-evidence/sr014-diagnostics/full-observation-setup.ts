import fs from 'node:fs';
import { afterAll,expect,vi } from 'vitest';
import * as transport from '../../../../../autobyteus-ts/src/llm/transport/local-long-running-fetch.js';
import { appConfigProvider } from '../../../../../autobyteus-server-ts/src/config/app-config-provider.js';
import { COMPACTION_MODEL_SETTINGS_KEY } from '../../../../../autobyteus-server-ts/src/config/compaction-model-settings.js';
import { LiveE2eEvidenceScanner } from '../../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';
import { observeFullFetch } from './full-wire-observer.js';
const file=new URL('full-wire.jsonl',import.meta.url);fs.writeFileSync(file,'',{flag:'wx'});
const scanner=new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);
const emit=(v:any)=>{scanner.assertEvidenceClean(v);fs.appendFileSync(file,JSON.stringify({time:new Date().toISOString(),...v})+'\n');};
const original=transport.createLocalLongRunningFetch;
const state={limit:64,count:0,pending:[] as Promise<unknown>[],validate:(body:any)=>{
 const tuple=JSON.parse(appConfigProvider.config.get(COMPACTION_MODEL_SETTINGS_KEY)!);expect(tuple).toEqual({modelIdentifier:null,llmConfig:null});
 expect(body.temperature).toBe(body.stream?0:0.7);expect(body.max_completion_tokens).toBe(body.stream?1024:8192);
}};
vi.spyOn(transport,'createLocalLongRunningFetch').mockImplementation(()=>observeFullFetch(original(),emit,state));
afterAll(async()=>{await Promise.all(state.pending);emit({event:'full_observation_finished',actualWireCalls:state.count});vi.restoreAllMocks();});
