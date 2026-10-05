from pathlib import Path
import re,json
W=Path.cwd(); E=W/'tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-011'
pattern=re.compile(r'^<<<<<<<[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n',re.M|re.S)
rows=[]
def resolve(path, decisions, replacements=()):
 p=W/path;s=p.read_text();matches=list(pattern.finditer(s));assert len(matches)==len(decisions),(path,len(matches))
 i=iter(decisions)
 def pick(m):
  choice,why=next(i);value=m[1] if choice=='candidate' else m[2] if choice=='upstream' else choice(m[1],m[2]);rows.append({'path':path,'startLine':s[:m.start()].count('\n')+1,'decision':why,'candidate':m[1],'upstream':m[2],'resolution':value});return value
 s=pattern.sub(pick,s)
 for a,b in replacements:s=s.replace(a,b)
 p.write_text(s)
base='autobyteus-server-ts/src/'
resolve(base+'standalone-agent-run-root/domain/standalone-agent-run-root.ts',[
 (lambda a,b: a.replace('import { collectAgentRootInputSnapshots } from "../services/agent-run-collaboration-input-snapshot.js";\n','').replace('import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";\n','')+b,'Retain Task lifetime types and scope adapter; use the renamed input snapshot owner.'),
 ('upstream','Delegate/address implementation moved to owned MessageDelivery; retain public types without obsolete root-only helper imports.'),
 ('upstream','Use renamed StandaloneRootTaskExecutionAdapter; recipient creation now belongs beside delivery wiring, not an obsolete root field.'),
 ('upstream','Retain extracted delivery owner and communication callbacks; add lifetimePort and task-scoped recipient below.'),
 ('upstream','Retain extracted message delegation entrypoints; sender leases restored below.'),
 ('upstream','Retain command-routing extraction; preserve non-waking command lease in MessageDelivery.'),
 ('upstream','Remove obsolete extracted inline delivery/input/presentation/liveness implementation, not its guarantees.'),
])
resolve(base+'agent-org-execution/domain/agent-org-run.ts',[
 ('upstream','Move error conversion to existing delivery owner; root keeps public delegation types.'),
 ('upstream','Retain extracted Org delivery owner; wire task-scoped recipient beside it below.'),
 ('upstream','Retain extracted message delivery entrypoints; sender leases restored below.'),
 ('upstream','Retain extracted command owner and remove duplicated liveness helper; non-waking lease restored there.'),
])
resolve(base+'standalone-agent-run-root/services/standalone-root-execution-index.ts',[
 ('candidate','Keep exact owned lifetime/helper/transitive-exclusivity methods with renamed indexed type.')], [('AgentRunCollaborationIndexedTaskExecution','StandaloneRootIndexedTaskExecution')])
resolve(base+'standalone-agent-run-root/services/standalone-root-recipient-resolver.ts',[
 (lambda a,b: a.split('    getIndex():')[0]+b,'Keep taskScope option with upstream renamed index/collaborator types.')])
resolve(base+'standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts',[
 ('candidate','Keep private activation plans/registrations and exact admission, under renamed adapter.'),
 (lambda a,b: a+'    // The copy is placed by its address (shared owner), not under the delegator\'s host.\n','Keep split plan/begin activation fence and upstream copy-host rule.')], [('AgentRunCollaborationTaskExecutionAdapter','StandaloneRootTaskExecutionAdapter'),('AgentRunCollaborationPlacement','StandaloneRootPlacement'),('  type PreparedTaskExecutionActivation,\n','')])
resolve('autobyteus-server-ts/tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts',[
 (lambda a,b:a.replace('workspaceCollisionPolicy, onAcquired });','workspaceCollisionPolicy, onAcquired }).then(result => result.materializedSkills);'),'Keep acquired-receipt assertions while adapting to upstream result DTO.')])
resolve('autobyteus-server-ts/tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts',[
 ('upstream','Keep new host-context ownership assertions; factory spy uses opaque preparation below.'),
 ('upstream','Keep current activateHost retry public API; spy uses opaque preparation below.')], [('current.agentRunManager.prepareNewAgentRun','current.agentRunManager.newPreparation')])
resolve('autobyteus-server-ts/tests/unit/agent-team-execution/team-run-model-selection-save.test.ts',[
 ('upstream','Retain real admitted on-disk package fixture; no obsolete blanket readiness mock.')], [('    const h = harness();','    const h = await harness();')])
(E/'conflict-decisions.json').write_text(json.dumps(rows,indent=2)+'\n')
print('resolved semantic conflict blocks',len(rows),'files',len(set(r['path'] for r in rows)))
