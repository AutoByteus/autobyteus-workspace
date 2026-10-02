import { describe,it,expect,vi,afterEach } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts';
import { SenderType } from 'autobyteus-ts/agent/sender-type.js';
import { createRecoveryFixture, eventually, summary } from './recovery-native-fixture.js';

afterEach(()=>vi.restoreAllMocks());
describe('AgentRun with real native backend and recovery gate (synthetic LLM)',()=>{
 it('keeps held A and queued B; standalone admission authorizes once, duplicate B does not replay; reconnect is exact',async()=>{
  const f=await createRecoveryFixture();
  try {
   f.request(); f.compress.mockRejectedValueOnce(new Error('synthetic reject'));
   expect((await f.submit('A')).ack.accepted).toBe(true);
   await eventually(()=>f.run.getInputStateSnapshot().entries.some(e=>e.state==='held'));
   const held=f.run.getInputStateSnapshot();
   expect(held.entries[0]).toMatchObject({message_id:'A',content:'A',state:'held'});
   expect(f.registry.getRecord(f.run.runId,'A')?.state).toBe('HELD');
   const turn=held.entries[0].turn_id;
   expect(f.parent.requests).toHaveLength(3);
   const snapshots:any[]=[];const unsubscribe=f.run.subscribeToEvents(e=>{if(e.eventType==='AGENT_INPUT_STATE')snapshots.push(e.payload)});
   await eventually(()=>snapshots.length);
   expect(snapshots[0]).toEqual(held);unsubscribe();
   let release!:(s:string)=>void;f.compress.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve}));
   const auth=vi.spyOn(f.backend.compactionRecovery,'authorize');
   await f.submit('B');await f.submit('B');
   await eventually(()=>!!release);
   expect(auth).toHaveBeenCalledTimes(1);
   expect(f.parent.requests).toHaveLength(3);
   expect(f.run.getInputStateSnapshot().entries.map(e=>[e.message_id,e.turn_id])).toEqual([['A',turn],['B',null]]);
   release(summary);
   await eventually(()=>f.parent.requests.length===5 && f.run.getInputStateSnapshot().entries.length===0);
   expect(f.parent.requests.slice(3).map(m=>m.at(-1)?.content)).toEqual(['A','B']);
   expect(f.forwarded.mock.calls.filter(([p])=>p.message.content==='A')).toHaveLength(1);
   expect(f.registry.getRecord(f.run.runId,'A')?.state).toBe('COMPLETED');
   expect(f.run.getStatusSnapshot().recoverableBlock).toBeNull();
  }finally{await f.close()}
 },15000);
 it('does not use an agent reservation release as retry intent; stop fences before waiting for held quiescence',async()=>{
  const f=await createRecoveryFixture();
  try {
   f.request();f.compress.mockRejectedValueOnce(new Error('blocked'));
   await f.submit('A');await eventually(()=>f.native.getCompactionRecovery()?.position.kind==='held_turn');
   const reservation=await f.run.reserveUserMessage(new AgentInputUserMessage('agent input',SenderType.AGENT));
   if(!reservation.reserved)throw new Error('reservation rejected');
   reservation.reservation.commit().release();
   await new Promise(resolve=>setTimeout(resolve,30));
   expect(f.compress).toHaveBeenCalledTimes(1);expect(f.parent.requests).toHaveLength(3);
   await expect(f.run.terminate()).resolves.toMatchObject({accepted:true});
   expect(f.native.isRunning).toBe(false);expect(f.run.getInputStateSnapshot().entries).toEqual([]);
  }finally{await f.close()}
 },15000);
 it('finishes answered A once, blocks prequeued B, and grants oldest FIFO B from fresh C',async()=>{
  const f=await createRecoveryFixture(true);
  try {
   let reject!:(e:Error)=>void;f.compress.mockImplementationOnce(()=>new Promise((_,r)=>{reject=r}));
   await f.submit('A');await eventually(()=>!!reject);await f.submit('B');
   reject(new Error('post response exhausted'));
   await eventually(()=>f.native.context.state.activeTurn===null && f.native.getCompactionRecovery()?.position.kind==='next_turn');
   expect(f.run.getStatusSnapshot()).toMatchObject({status:'error',recoverableBlock:{position:{kind:'next_turn'}}});
   expect(f.registry.getRecord(f.run.runId,'A')?.state).toBe('COMPLETED');
   expect(f.parent.requests).toHaveLength(4);expect(f.compress).toHaveBeenCalledTimes(1);
   expect(f.run.getInputStateSnapshot().entries.map(e=>e.message_id)).toEqual(['B']);
   await f.submit('C');await eventually(()=>f.parent.requests.length===6 && f.run.getInputStateSnapshot().entries.length===0);
   expect(f.parent.requests.slice(3).map(m=>m.at(-1)?.content)).toEqual(['A','B','C']);
   expect(f.compress).toHaveBeenCalledTimes(2);
  }finally{await f.close()}
 },15000);
 it('buffers held/terminal facts before dispatch ACK without duplicate forwarding, and ignores during-recovery credit',async()=>{
  const f=await createRecoveryFixture();
  try {
   const send=f.backend.dispatchUserInput.bind(f.backend);let releaseAck!:()=>void;
   vi.spyOn(f.backend,'dispatchUserInput').mockImplementationOnce(async input=>{const result=await send(input);await new Promise<void>(resolve=>{releaseAck=resolve});return result;});
   f.request();f.compress.mockRejectedValueOnce(new Error('first'));
   await f.submit('A');await eventually(()=>f.native.getCompactionRecovery()?.state==='awaiting_user' && !!releaseAck);
   const epoch=f.native.getCompactionRecovery()!.failureEpoch;
   let reject!:(e:Error)=>void;f.compress.mockImplementationOnce(()=>new Promise((_,r)=>{reject=r}));
   await f.submit('B');await eventually(()=>!!reject);await f.submit('C');reject(new Error('second'));
   await eventually(()=>f.native.getCompactionRecovery()!.failureEpoch>epoch);
   expect(f.compress).toHaveBeenCalledTimes(2);expect(f.parent.requests).toHaveLength(3);
   expect(f.registry.getRecord(f.run.runId,'A')?.state).toBe('ADMITTED');
   await f.submit('D');await eventually(()=>f.parent.requests.length===4);
   releaseAck();await eventually(()=>f.parent.requests.length===7 && f.run.getInputStateSnapshot().entries.length===0);
   expect(f.parent.requests.slice(3).map(m=>m.at(-1)?.content)).toEqual(['A','B','C','D']);
   expect(f.forwarded.mock.calls.filter(([p])=>p.message.content==='A')).toHaveLength(1);
   expect(f.compress).toHaveBeenCalledTimes(3);
  }finally{await f.close()}
 },15000);
 it('revokes the unused next-turn grant when normalization proves B undelivered, never replays consumed A',async()=>{
  const f=await createRecoveryFixture(true);
  try {
   f.compress.mockRejectedValueOnce(new Error('post response'));await f.submit('A');
   await eventually(()=>f.native.context.state.activeTurn===null && !!f.native.getCompactionRecovery());
   const epoch=f.native.getCompactionRecovery()!.failureEpoch;
   vi.spyOn(f.normalizer,'normalizeForProvider').mockImplementationOnce(()=>{throw new Error('invalid attachment')});
   await f.submit('B');await eventually(()=>f.native.getCompactionRecovery()!.failureEpoch>epoch);
   expect(f.compress).toHaveBeenCalledTimes(1);expect(f.parent.requests).toHaveLength(4);
   await f.submit('C');await eventually(()=>f.parent.requests.length===5 && f.run.getInputStateSnapshot().entries.length===0);
   expect(f.parent.requests.at(-1)?.at(-1)?.content).toBe('C');
  }finally{await f.close()}
 },15000);
 it.each([false,true])('pins unknown recovery delivery; positive native lifecycle reconciles it, shutdown never resends (delivered=%s)',async delivered=>{
  const f=await createRecoveryFixture(true);
  try {
   f.compress.mockRejectedValueOnce(new Error('post response'));await f.submit('A');
   await eventually(()=>f.native.context.state.activeTurn===null && !!f.native.getCompactionRecovery());
   const send=f.backend.dispatchUserInput.bind(f.backend);
   const dispatch=vi.spyOn(f.backend,'dispatchUserInput').mockImplementationOnce(async input=>{
     if(delivered) await send(input);
     return {forwarded:false,delivery:'uncertain',turnId:null};
   });
   await f.submit('B');
   if(delivered){await eventually(()=>f.parent.requests.length===5 && f.run.getInputStateSnapshot().entries.length===0);}
   else {await eventually(()=>dispatch.mock.calls.length===1);await new Promise(r=>setTimeout(r,25));expect(f.parent.requests).toHaveLength(4);}
   await expect(f.run.terminate()).resolves.toMatchObject({accepted:true});
   expect(dispatch).toHaveBeenCalledTimes(1);
  }finally{await f.close()}
 },15000);

});
