// Test-only read-only telemetry. No runtime/provider responses are replaced.
import fs from 'node:fs';
import { AgentRunManager } from '../../../../../autobyteus-server-ts/dist/agent-execution/services/agent-run-manager.js';
const events = [];
for (const name of ['prepareNewAgentRun', 'prepareRestoreAgentRun', 'prepareRestoreAgentRunFromPlatformState']) {
  const original = AgentRunManager.prototype[name];
  AgentRunManager.prototype[name] = async function (...args) {
    const input = args[0];
    const event = { method: name, runId: input?.runId, startedAt: new Date().toISOString(), outcome: 'pending' };
    events.push(event);
    try {
      const candidate = await original.apply(this, args);
      event.outcome = 'prepared'; event.platformAgentRunId = candidate.platformAgentRunId;
      return candidate;
    } catch (error) { event.outcome = 'rejected'; event.code = error?.code ?? error?.name; throw error; }
  };
}
const timer = setInterval(() => {
  try {
    const manager = AgentRunManager.getInstance();
    const registry = manager.activationRegistry; // test telemetry only: compiled TS-private maps, no mutation
    const active = [...registry.activeRuns.values()].map(run => ({ runId: run.runId, active: run.isActive(), status: run.getStatusSnapshot() }));
    const pending = [...registry.pending.values()].map(item => ({ runId: item.claim.runId, state: item.state }));
    const target = process.env.AORG_TELEMETRY_PATH;
    fs.writeFileSync(target + '.tmp', JSON.stringify({ pid: process.pid, at: new Date().toISOString(), active, pending, events }, null, 2));
    fs.renameSync(target + '.tmp', target);
  } catch { /* composition not initialized yet */ }
}, 200);
timer.unref();

// Explicit test-owned fixture construction, not normal user work: assemble the
// old eager-but-never-messaged state with REAL provider candidates and owner writes.
import { ConfiguredAgentExecutionHandle } from '../../../../../autobyteus-server-ts/dist/agent-collaboration/execution/backends/configured-agent-execution-handle.js';
import { FlatTeamAgentExecutionHandle } from '../../../../../autobyteus-server-ts/dist/agent-team-execution/local/flat-team-agent-execution-handle.js';
const handles = new Map();
import { FlatTeamExecutionManager } from '../../../../../autobyteus-server-ts/dist/agent-team-execution/local/flat-team-execution-manager.js';
const flatManagers=new Set();
const managerStatus=FlatTeamExecutionManager.prototype.getLeafAgentStatusSnapshots;
FlatTeamExecutionManager.prototype.getLeafAgentStatusSnapshots=function(...args){flatManagers.add(this);return managerStatus.apply(this,args);};
const configuredStatus = ConfiguredAgentExecutionHandle.prototype.getStatusSnapshot;
ConfiguredAgentExecutionHandle.prototype.getStatusSnapshot = function(...args) {
  handles.set(this.identity.agentRunId, this); return configuredStatus.apply(this,args);
};
const flatStatus = FlatTeamAgentExecutionHandle.prototype.getLeafAgentStatusSnapshots;
FlatTeamAgentExecutionHandle.prototype.getLeafAgentStatusSnapshots = function(...args) {
  handles.set(this.context.agentRunId, this); return flatStatus.apply(this,args);
};
let handling = false;
const fixtureTimer=setInterval(async()=>{
 const file=process.env.AORG_TELEMETRY_PATH.replace('telemetry.json','fixture-action.json');
 if(handling || !fs.existsSync(file)) return;
 handling=true;
 try {
  const action=JSON.parse(fs.readFileSync(file,'utf8'));fs.unlinkSync(file);
  if(action.kind!=='prepare_empty' || !Array.isArray(action.agentRunIds) || action.agentRunIds.some(id=>!id.startsWith('aorg_validation_agent_'))) throw Error('unsafe fixture action');
  const results=[];
  for(const id of action.agentRunIds){
   const handle=handles.get(id) ?? [...flatManagers].map(manager=>manager.getConfiguredAgent(id)).find(Boolean);if(!handle || handle.isActive()) throw Error('fixture requires inactive configured handle '+id);
   const run=await handle.getOrCreateAgentRun();
   results.push({agentRunId:id,active:run.isActive(),status:run.getStatusSnapshot(),inputSent:false});
  }
  fs.writeFileSync(file.replace('fixture-action','fixture-result'),JSON.stringify({at:new Date().toISOString(),results},null,2));
 }catch(error){fs.writeFileSync(file.replace('fixture-action','fixture-result'),JSON.stringify({error:String(error)}));}
 finally{handling=false;}
},250);fixtureTimer.unref();
