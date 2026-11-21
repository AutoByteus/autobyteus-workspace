import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import type { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { finalizeBusyRuns, inspectBusyAgentRuns } from "../../../src/agent-execution/services/busy-runs.js";
import { composeBusyRunCount } from "../../../src/compositions/busy-run-count-composition.js";
import { registerBusyRunRoutes } from "../../../src/api/rest/busy-runs.js";

function run(initialView: unknown = {kind:"unsupported"}) {
  const state = {status:"idle", background:false, read:vi.fn(async ():Promise<unknown> => initialView)};
  return {state, live: {getStatusSnapshot:() => ({status:state.status}),hasRunningBackgroundTasks:()=>state.background,
    inspectBackgroundTasks:state.read} as unknown as AgentRun};
}
function owner(...runs: AgentRun[]) {
  const members=new Map(runs.map((r,i)=>[String(i),r]));
  return {members, listActiveRuns:()=>[...members.keys()], getActiveRun:(id:string)=>members.get(id)??null};
}
afterEach(()=>vi.useRealTimers());
describe("node busy observation",()=>{
  it.each(["inactive","incomplete","inspection_failed"])("unavailable (%s) is unknown, not a safe zero; recovers on next observation",async reason=>{
    const r=run({kind:"unavailable",reason}), m=owner(r.live);
    expect(finalizeBusyRuns(m,await inspectBusyAgentRuns(m))).toEqual({busy:0,unknown:1});
    r.state.read.mockResolvedValueOnce({kind:"snapshot",tasks:[]});
    expect(finalizeBusyRuns(m,await inspectBusyAgentRuns(m))).toEqual({busy:0,unknown:0});
  });
  it("stalled and thrown reads are unknown; late results cannot change that inspection",async()=>{
    vi.useFakeTimers();
    let settle!:(v:unknown)=>void;
    const slow=run(),failed=run(),m=owner(slow.live,failed.live);
    slow.state.read.mockImplementation(()=>new Promise(r=>{settle=r}));failed.state.read.mockRejectedValue(Error("unreadable"));
    const inspecting=inspectBusyAgentRuns(m);await vi.advanceTimersByTimeAsync(6000);
    const result=await inspecting;settle({kind:"unsupported"});await Promise.resolve();
    expect(finalizeBusyRuns(m,result)).toEqual({busy:0,unknown:2});
  });
  it("counts both owners in one final turn after the slower one finishes",async()=>{
    const p=run(),stream=run({kind:"event-stream",tasks:[{status:"running"}]}), late=run();
    const process=owner(p.live), app=owner(stream.live,late.live);
    let settle!:(v:unknown)=>void; late.state.read.mockImplementation(()=>new Promise(r=>{settle=r}));
    const count=composeBusyRunCount({inspectBusy:()=>inspectBusyAgentRuns(app),finalizeBusy:i=>finalizeBusyRuns(app,i)},()=>process);
    const pending=count(); await new Promise<void>(resolve => setImmediate(resolve));
    p.state.status="running";settle({kind:"snapshot",tasks:[]}); expect(await pending).toEqual({busy:2,unknown:0});
  });
  it("finalizes the application owner after a slower process inspection too", async () => {
    const slow = run(), fast = run(), process = owner(slow.live), app = owner(fast.live);
    let settle!: (value: unknown) => void;
    slow.state.read.mockImplementation(() => new Promise(resolve => { settle = resolve; }));
    const count = composeBusyRunCount({
      inspectBusy: () => inspectBusyAgentRuns(app), finalizeBusy: inspected => finalizeBusyRuns(app, inspected),
    }, () => process);
    const pending = count();
    await new Promise<void>(resolve => setImmediate(resolve));
    fast.state.background = true;
    settle({ kind: "snapshot", tasks: [{ status: "running" }] });
    expect(await pending).toEqual({ busy: 2, unknown: 0 });
  });
  it("new and replaced objects are unknown; removed ones disappear; synchronous busy wins",async()=>{
    const a=run(),b=run(),gone=run(),m=owner(a.live,b.live,gone.live);
    const i=await inspectBusyAgentRuns(m);m.members.set("0",run().live);m.members.delete("2");m.members.set("3",run().live);b.state.background=true;
    expect(finalizeBusyRuns(m,i)).toEqual({busy:1,unknown:2});
  });
  it("re-reads the application owner too; completed event streams and unsupported runtimes do not stay unknown",async()=>{
    const a=run({kind:"event-stream",tasks:[]}), b=run(), m=owner(a.live,b.live);
    const i=await inspectBusyAgentRuns(m); expect(finalizeBusyRuns(m,i)).toEqual({busy:0,unknown:0});
    a.state.status="initializing";expect(finalizeBusyRuns(m,i)).toEqual({busy:1,unknown:0});
  });
  it("REST returns just the current safe counts; failed observation is not 200/zero",async()=>{
    const app=Fastify();try{
      const observe=vi.fn().mockResolvedValueOnce({busy:1,unknown:2}).mockRejectedValueOnce(Error("unavailable"));
      await app.register(async route=>registerBusyRunRoutes(route,observe),{prefix:"/rest"});
      const res=await app.inject("/rest/busy-runs");expect(res.statusCode).toBe(200);expect(res.json()).toEqual({busy:1,unknown:2});
      expect((await app.inject("/rest/busy-runs")).statusCode).toBe(500);
    }finally{await app.close();}
  });
});
