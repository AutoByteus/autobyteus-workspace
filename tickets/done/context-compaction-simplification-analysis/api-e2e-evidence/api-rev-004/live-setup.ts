import fs from 'node:fs';
import {afterAll,vi} from 'vitest';
import {capture} from './capture-observation.js';
import {observe,State} from './bounded-fetch.js';
import {LiveE2eEvidenceScanner} from '../../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';
const scanner=new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);
const output=new URL('wire.jsonl',import.meta.url);fs.writeFileSync(output,'',{flag:'wx'});
const state:State={parent:0,summary:0,closed:false,pending:[],summaryHash:'2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7'};
const emit=(v:any)=>{scanner.assertEvidenceClean(v);fs.appendFileSync(output,JSON.stringify({time:new Date().toISOString(),...v})+'\n');};
vi.stubGlobal('fetch',observe(globalThis.fetch,emit,state));
const write=process.stdout.write.bind(process.stdout);
vi.spyOn(process.stdout,'write').mockImplementation(((chunk:any,...args:any[])=>{
 capture(chunk,value=>scanner.assertEvidenceClean(value),(event,value)=>{
  fs.writeFileSync(new URL(event+'.json',import.meta.url),JSON.stringify(value,null,2),{flag:'wx'});
 });
 return (write as any)(chunk,...args);
}) as any);
afterAll(async()=>{await Promise.all(state.pending);emit({event:'finished',parentRequests:state.parent,summaryRequests:state.summary,closed:state.closed});vi.restoreAllMocks();vi.unstubAllGlobals();});
