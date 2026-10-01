import { describe,it,expect,vi,afterEach } from 'vitest';
import { AgentInputPipeline } from 'autobyteus-ts/agent/pipelines/agent-input-pipeline.js';
import { createRecoveryFixture,eventually } from './recovery-native-fixture.js';

afterEach(()=>vi.restoreAllMocks());
describe('supported recovery lifecycle races with native runtime and server FIFO',()=>{
 it('latches a next-turn grant while consumed A final hooks are unfinished, without rerunning A or its hooks',async()=>{
  const f=await createRecoveryFixture(true);
  let release:(()=>void)|undefined;
  try {
   const manager=f.native.context.statusManager!;
   const execute=manager.executeLifecycleProcessors.bind(manager);
   let afterResponseHooks=0;
   vi.spyOn(manager,'executeLifecycleProcessors').mockImplementation(async(...args)=>{
    if(args[1]==='idle') {
     afterResponseHooks++;
     if(afterResponseHooks===1)await new Promise<void>(resolve=>{release=resolve});
    }
    return execute(...args);
   });
   f.compress.mockRejectedValueOnce(new Error('post response exhausted'));
   await f.submit('A');await eventually(()=>!!release);
   const consumedTurn=f.native.context.state.activeTurn!.turnId;
   expect(f.native.getCompactionRecovery()).toMatchObject({position:{kind:'next_turn',failedTurnId:consumedTurn},state:'awaiting_user'});
   await f.submit('B');await eventually(()=>f.native.getCompactionRecovery()?.state==='authorized');
   expect(f.native.context.state.activeTurn?.turnId).toBe(consumedTurn);
   expect(f.parent.requests).toHaveLength(4);expect(f.compress).toHaveBeenCalledOnce();
   release!();await eventually(()=>f.parent.requests.length===5 && f.run.getInputStateSnapshot().entries.length===0);
   expect(f.parent.requests.slice(3).map(m=>m.at(-1)?.content)).toEqual(['A','B']);
   expect(afterResponseHooks).toBe(2);expect(f.registry.getRecord(f.run.runId,'A')?.state).toBe('COMPLETED');
   expect(f.compress).toHaveBeenCalledTimes(2);
  }finally{release?.();await f.close()}
 },15000);
 it('cancelling a bound recovery turn in its input pipeline revokes permission; prequeued C cannot inherit it',async()=>{
  const f=await createRecoveryFixture(true);
  try {
   f.compress.mockRejectedValueOnce(new Error('post response exhausted'));
   await f.submit('A');await eventually(()=>f.native.context.state.activeTurn===null && !!f.native.getCompactionRecovery());
   const original=AgentInputPipeline.prototype.processExternalTrigger;
   let pipelineEntered=false;
   vi.spyOn(AgentInputPipeline.prototype,'processExternalTrigger').mockImplementationOnce(async function(event,context,turn,notifier){
    pipelineEntered=true;
    await turn.executionScope.runAbortable({kind:'test_input_processing'},()=>new Promise<void>(()=>{}));
    return original.call(this,event,context,turn,notifier);
   });
   const epoch=f.native.getCompactionRecovery()!.failureEpoch;
   await f.submit('B');await eventually(()=>pipelineEntered);
   const bTurn=f.native.context.state.activeTurn!.turnId;
   await f.submit('C');
   await expect(f.run.interrupt(bTurn)).resolves.toMatchObject({accepted:true});
   await eventually(()=>f.native.context.state.activeTurn===null && f.native.getCompactionRecovery()!.failureEpoch>epoch);
   expect(f.native.getCompactionRecovery()).toMatchObject({state:'awaiting_user',position:{kind:'next_turn'}});
   expect(f.parent.requests).toHaveLength(4);expect(f.compress).toHaveBeenCalledOnce();
   await eventually(()=>f.run.getInputStateSnapshot().entries.map(e=>e.message_id).join(',')==='C');
   expect(f.run.getInputStateSnapshot().entries.map(e=>e.message_id)).toEqual(['C']);
   await f.submit('D');await eventually(()=>f.parent.requests.length===6 && f.run.getInputStateSnapshot().entries.length===0);
   expect(f.parent.requests.slice(3).map(m=>m.at(-1)?.content)).toEqual(['A','C','D']);
   expect(f.compress).toHaveBeenCalledTimes(2);
  }finally{await f.close()}
 },15000);
 it('root shutdown fences queued input and interrupts held A before quiescence, without consuming a retry',async()=>{
  const f=await createRecoveryFixture();
  try {
   f.request();f.compress.mockRejectedValueOnce(new Error('held'));
   await f.submit('A');await eventually(()=>f.native.getCompactionRecovery()?.position.kind==='held_turn');
   const block=f.native.getCompactionRecovery()!;
   const fenced=await f.run.fenceInputAndInterruptForRootShutdown();
   expect(fenced).toMatchObject({accepted:true});
   expect((await f.submit('B')).ack.accepted).toBe(false);
   expect(f.parent.requests).toHaveLength(3);expect(f.compress).toHaveBeenCalledOnce();
   expect(f.run.getInputStateSnapshot().entries).toEqual([]);
   await f.run.terminate();
   expect(await f.backend.compactionRecovery.authorize({block,userAdmissionId:'late'})).toBe('stopped');
   expect(f.compress).toHaveBeenCalledOnce();
  }finally{await f.close()}
 },15000);
});
