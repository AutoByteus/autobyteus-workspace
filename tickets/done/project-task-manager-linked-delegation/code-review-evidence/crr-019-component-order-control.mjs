// CRR-019 independent re-execution; adapted output/import paths only from SR-020 diagnostic.
// Disposable deterministic diagnostic only: real compiled cleanup/session/tracker methods,
// partially constructed owned session and controlled process/tooling/skills/MCP. NOT live SDK proof.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {ClaudeSession} from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/dist/agent-execution/backends/claude/session/claude-session.js';
import {ClaudeSessionCleanup} from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/dist/agent-execution/backends/claude/session/claude-session-cleanup.js';
import {ClaudeTurnTracker} from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/dist/agent-execution/backends/claude/session/claude-turn-tracker.js';
import {ClaudeBackgroundTaskRegistry} from '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/autobyteus-server-ts/dist/agent-execution/backends/claude/session/claude-background-task-registry.js';
const E='/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-evidence';
function target(){const order=[],events=[];const session=Object.create(ClaudeSession.prototype);
 session.runContext={runId:'sr020_control',runtimeContext:{activeTurnId:'turn',materializedConfiguredSkills:[]}};
 session.listeners=new Set([e=>{order.push('delivered:'+e.method);events.push(e);}]);session.textProjector=null;session.closing=null;session.openProcess=null;
 session.providerSessionLifecycle={sessionId:'11111111-1111-4111-8111-111111111111'};
 session.dependencies={toolingCoordinator:{clearPendingToolApprovals(){order.push('approvals');}}};session.agentToolsMcpSessionState={release(){order.push('mcp');}};
 session.process={async close(){order.push('process-proof');}};
 session.turnTracker=new ClaudeTurnTracker({runId:'sr020_control',registry:new ClaudeBackgroundTaskRegistry(()=>{}),createTurnId:()=> 'turn',createUuid:()=> 'uuid',listener:{turnStarted(){},turnSettled(id,s){order.push('settled:'+s.kind+':listeners='+session.listeners.size);session.handleTurnSettled(id,s);},notice(){},turnContent(){},turnResult(){},anomaly(){}}});
 session.turnTracker.registerInput({kind:'start_turn'});session.turnTracker.markSent('uuid');return {session,order,events};}
const direct=target();await direct.session.closeProcess('controlled');assert.equal(direct.events.length,1);assert.equal(direct.events[0].method,'turn/interrupted');
const parallel=target();const cleanup=new ClaudeSessionCleanup({async cleanupMaterializedWorkspaceSkills(){parallel.order.push('skills');}});await cleanup.cleanupSessionResources({session:parallel.session});assert.equal(parallel.events.length,0);assert(parallel.order.includes('settled:interrupted:listeners=0'));assert.equal(parallel.session.turnTracker.activeTurnId,null);
await cleanup.cleanupSessionResources({session:parallel.session});await parallel.session.closeProcess('retry');assert.equal(parallel.events.length,0,'Lost terminal is not re-emitted on exact repeat after tracker closed');
const out={scope:'Controlled order diagnostic; production compiled methods, partial owned session/double process; no live/physical proof',direct:{order:direct.order,events:direct.events},parallel:{order:parallel.order,events:parallel.events,activeTurnId:parallel.session.turnTracker.activeTurnId},checks:3};fs.writeFileSync(E+'/crr-019-component-order-control.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
