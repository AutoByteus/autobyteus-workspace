import fs from 'node:fs';
import {afterAll,vi} from 'vitest';
import {capture} from './capture-observation.js';
import {observe,State} from './bounded-fetch.js';
import {LiveE2eEvidenceScanner} from '../../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';
const scanner=new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);
const phase=process.env.API007_PHASE as 'flow'|'quality';
if(!['flow','quality'].includes(phase))throw new Error('API007_BAD_PHASE');
const file=new URL('campaign-state.json',import.meta.url);
const prior=JSON.parse(fs.readFileSync(file,'utf8'));
if(prior.closed||Date.now()>=prior.deadline)throw new Error('API007_CAMPAIGN_CLOSED');
const output=new URL(phase+'-wire.jsonl',import.meta.url);fs.writeFileSync(output,'',{flag:'wx'});
const state:State={...prior,pending:[],phase,phaseSummary:0,localOrigin:process.env.AUTOBYTEUS_TEST_SERVER_URL!,
 summaryHash:'2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7'};
const save=()=>{const {pending,...safe}=state;fs.writeFileSync(file,JSON.stringify(safe,null,2));};
const emit=(v:any)=>{scanner.assertEvidenceClean(v);fs.appendFileSync(output,JSON.stringify({time:new Date().toISOString(),phase,...v})+'\n');save();};
vi.stubGlobal('fetch',observe(globalThis.fetch,emit,state));
const write=process.stdout.write.bind(process.stdout);
vi.spyOn(process.stdout,'write').mockImplementation(((chunk:any,...args:any[])=>{
 capture(chunk,v=>scanner.assertEvidenceClean(v),(event,value)=>{
 fs.writeFileSync(new URL(event+'.json',import.meta.url),JSON.stringify(value,null,2),{flag:'wx'});
 });
 return (write as any)(chunk,...args);
}) as any);
afterAll(async()=>{await Promise.all(state.pending);emit({event:'finished',parentRequests:state.parent,summaryRequests:state.summary,closed:state.closed});vi.restoreAllMocks();vi.unstubAllGlobals();});
