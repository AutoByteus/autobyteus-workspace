from pathlib import Path
import shutil
R=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces')
T=R/'tickets/in-progress/shared-network-workspaces';E=T/'evidence/acceptance-revision/sr024'
for f in ['approval-record-sr024.md','evidence/acceptance-revision/sr024/acceptance-disposition.md']:
 p=T/f;dest=E/('superseded-initial-'+p.name)
 if not dest.exists(): shutil.copyfile(p,dest)

def prior(f): return (E/('prior-'+f)).read_text()
def write(f,s): (T/f).write_text(s)
def rep(s,a,b):
 assert s.count(a)==1,(a[:110],s.count(a))
 return s.replace(a,b,1)
def line(s,prefix,new):
 matches=[x for x in s.splitlines() if x.startswith(prefix)];assert len(matches)==1,(prefix,len(matches))
 return rep(s,matches[0],new)
quote='Yeah, but all those test cases should be tested, right? I mean, even though we do not test the agent inside those nodes, but all those file system writing should be tested, right? I mean, because we have virtual machine, so the testing scope, even though we cannot verify, even though API E2E engineer cannot run on my, like, commands, which need permission, but all those test cases, even though it doesn\'t have agents, but all those shared file system test cases can be tested in different nodes, right? That\'s needed. That\'s the scope. At least that asks for the testing scope for this.'
matrix='''## SR024 Increment Acceptance And Deferred Qualification — DEC016

**This is a user-approved acceptance/sequencing change, not a statement that every test is
already complete.** The user's latest direct clarification requires the shared-filesystem
cases across different nodes, using VMs without agents if needed. The preceding suggestion
to finish immediately is qualified by this later instruction. A Mac VM's own mounted IO
alone is not proof of cross-node sharing. Complete the required filesystem matrix before
increment closeout. Separate real OS guests are acceptable for this increment; independent
physical hardware, authenticated agent execution and the user's personal setup are not
prerequisites to this ticket's completion. They remain explicit later qualification.

Existing product targets and stable REQ/AC/SCN/BEH IDs remain; the table below governs **which
proof is required now**. The API owner maps every planned filesystem case/AC subcase to
executed evidence, justified still-valid carried evidence, a real failure, or a specific
remaining prerequisite. Do not treat unavailable agent credentials as blocking non-agent
filesystem tests; do not label those tests passed merely because a VM boot passed.

| Disposition | Acceptance scope and traceability | Evidence/closure rule and owner |
| --- | --- | --- |
| IV-F01 Required now | Public create/join and actual shared source across different Mac/Linux VM nodes, including managed Docker CLIENTS on both OSes; native Mac/native Linux and Docker-on-Linux STORAGE modes. AC001/012/013/015/017/018 | API/E2E records node IDs/roles, OS/build, export/source/UUID, mounts and nonroot identity; reciprocal writes must be observed through another node's real mount. Separate kernels/guests prove VM topology; same-kernel containers alone do not prove Mac/Linux peer interoperability. Reuse valid scoped evidence, fill missing supported-mode cases; only Mac Docker STORAGE stays deferred |
| IV-F02 Required now | All planned ordinary file cases: create/read/write/overwrite/append/rename/delete/mkdir/list, exact text/binary bytes and metadata, warm-cache in-place and atomic/new publication, successful flush/fsync/close to another participant's fresh open <=5s for <=1MiB; AC001/003/004/017 | Non-agent processes/scripts are valid filesystem actors. Exercise both directions and relevant storage/client combinations, not copied reader values or shared host-directory shortcuts. Existing tests determine supported details; no new filesystem guarantee is invented |
| IV-F03 Required now | Different-file concurrency, documented coordinated same-file/Git behavior, exclusive create, supported locks, relative symlinks/executable files, permissions/nonroot access/private separation and refusal controls; AC004/005/008/009 | Actual independently mounted participants for cross-node properties. Keep documented platform locking limits; do not invent distributed locking on Mac v3. Local mocks/one participant are not peer proof. No unrestricted exports/world-write/security bypass |
| IV-F04 Required now | Repeat/reconnect/ordinary host restart and automatic availability, same source/UUID/bytes and selected Docker image/config/private-state preservation, true source/volume replacement refusal, safe drained detach; AC006/007/009/014/017/019 filesystem portions | Keep API-F003/F004/F005 scoped resolutions and current-build relevance; add missing cross-node/managed-client coverage proportionately. No reopening resolved defects solely because the acceptance basis changed. Deferred forced-outage isolation is not reintroduced |
| IV-F05 Required now | Filesystem-facing application/API/healthy-preview integration and applicable existing regression tests; AC006/010/020 non-agent portions | Actual mounted files plus API/browser evidence where the contract requires it; ordinary fixture writers can supply content. Native-agent-produced artifact journey is IV-D02, not required now. API owner reconciles prior valid evidence, completes material missing coverage and issues its own new result; then selected proportional durable test-code review, including cumulative af9f23 REST changes |
| IV-F06 Required before closeout | AC011 docs, precise candidate/command and limits, integrated-state verification, repository finalization and safe cleanup | Delivery owns. Existing release/Guide unavailability stays truthful; provide actual available testing entrypoint rather than invent a public download. Any post-integration change receives the delivery-required checks. PM receives deferred test/follow-up ownership at terminal receipt |
| IV-D01 Deferred from this increment | Independent physical Mac/Linux/Docker private-LAN qualification and actual user's network/admin context; physical portions of AC001/003/004/005/007/008/013/015/017/018/019 | User explicitly accepts VMs for current filesystem proof. User authorizes later real hosts/network; API owner executes when supplied; PM tracks later iteration. VM network failure is still a current IV-F01 gap, not excused by this physical deferral |
| IV-D02 Deferred from this increment | Authenticated Codex/Claude/Grok/AGY agent execution, native tool/unread linked-asset/peer-close/restore/Standalone-Team-Org/completed-native-artifact journey; agent portions of AC002/006/010 | User says agents need not run inside these nodes for this increment. User later supplies authorized isolated profiles/budget; API owner validates then. Existing local/scripted runtime regression checks remain their own scope; they are not relabeled native-agent qualification |
| IV-D03 Deferred from this increment | User personally runs commands and verifies their own real setup; personal-verification part of AC011 | Later user-led acceptance, not a pre-close wait. Record not performed, preserve necessary OS/disruption approval at actual execution. PM manages discoveries as later iterations with normal dispatch approval |
| IV-R01 Release-only gates retained | Published installer/hosted signing/notarization/full advertised platform qualification and public-bootstrap release portions of AC012/018/020 | No release authorization in this acceptance. Current feasible build/packaging/installer/static-workflow regression checks remain; unexecuted amd64 engine/hosted/publication qualification stays NotTested and cannot be advertised. Follow release guide if release is later requested; no release-lock or Guide gate bypass |

No automatic confidence increase, fabricated Passed API package or waiver of newly observed
in-scope failures. API006 Blocked67.86% remains its historical/current completed verdict
until the API owner issues a new round against SR024. Report incremental filesystem
acceptance separately from full product/physical/native-agent/public-release qualification.
Reuse evidence only with exact build/path/scope relevance, not a blanket rerun or blanket
Pass. If VM peer networking cannot be established with already authorized disposable
resources, report the specific transport/configuration prerequisite and attempted safe
alternatives; do not request physical hosts or provider profiles to solve an unrelated VM
filesystem gap. No host firewall/bridge/live node changes or new credentials/cost authorized.
'''
approval=f'''# Requirements Approval — SR024 / VM cross-node filesystem increment

Package `shared-network-workspaces`, Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`,
2026-10-15. **Approved by Solution Designer within the user's explicit direct clarification.**
This is an acceptance/sequencing revision; no technical mechanism or test result changes.

## Authority and chronology

1. Code Reviewer relayed the user's wish to close this increment and test their real setup
later. The initial designer draft retained remaining feasible checks. Its unpublished
approval/disposition drafts are retained as `evidence/acceptance-revision/sr024/superseded-initial-*`;
they are NOT the final baseline or a separate completed SR round.
2. The user directly stated they regarded the VM testing as sufficient and suggested sending
to Delivery or telling Code Reviewer the increment was accepted. The designer proposed
remaining test-code review and delivery, without another testing round.
3. **The latest direct user clarification qualifies that proposal:**

> {quote}

Latest message is the current scope authority. It requires actual cross-node filesystem
case coverage, not immediate ticket closure on existing Mac VM evidence alone. Physical
machines/personal commands and authenticated agents are not current increment prerequisites.
No unseen message, broad live-operation permission or full product-test Pass is inferred.

## Decision and readiness

DEC016 approves required IV-F01–F06 and deferred IV-D01–D03/release-only IV-R01 in canonical
requirements-doc.md. Preserve all normal functional/safety targets and only-Mac-Docker-
STORAGE deferral; accept different real OS VM nodes for this increment's topology, with
non-agent processes as filesystem actors. Complete/reconcile all shared-filesystem cases
before closeout, including both-OS managed clients, supported storage modes, reciprocal
exact-byte/consistency/permission/concurrency/restart/preservation contracts. Current
CRR013 source Pass and API006 Mac fix closure are evidence, not whole-matrix proof.

No new product mechanism or UI direction is chosen. Missing agent/physical permissions
cannot block independent feasible VM filesystem tests. API owns the revised execution
verdict; Code Reviewer owns subsequent proportional test-code review; Delivery owns
integration/docs/finalization/cleanup. No TaskDone, release, test-score inflation or review
bypass. No renewed question needed: latest explicit user statement settles this boundary.
Functional SR018 and technical SR023 authorities otherwise remain. Cumulative Large/High.

## User informed

Exact designer informing message after the latest clarification:

> Yes—that’s the required scope. Separate VM nodes can test shared-file behavior without running agents: cross-node reads/writes, exact contents, rename/delete, permissions, concurrent access, and restart/reconnect preservation.
>
> So I won’t treat “the Mac VM was tested” as proof that the whole filesystem matrix is complete. I’ll ask API/E2E to identify which cases already have evidence and finish the missing cross-node filesystem cases before delivery. Authenticated-agent runs and testing on your personal machines can wait.

Approval changes REQ012/015/016, AC011 and staged proof mapping/DEC014 sequencing; stable
other functional IDs/targets unchanged. Design aligns acceptance/next-work only; reviewed
SR023 production architecture remains. Evidence ownership and references are in the
acceptance-disposition supplement and cumulative package index. No separate behavior-
defining supplement or external Product artifact.
'''
write('approval-record-sr024.md',approval)
s=prior('requirements-doc.md')
s=line(s,'- Status:',"- Status: **Approved — SR-024, Solution Designer within the user's direct VM cross-node filesystem testing clarification.**")
s=line(s,'- Current baseline:',"- Current baseline: SR-024, 2026-10-15. Exact direct-user clarification, reasoning and informing message: [approval-record-sr024.md](approval-record-sr024.md). DEC016 requires the filesystem test matrix across different VM nodes before increment closeout, while deferring authenticated-agent/independent-physical/personal verification. Functional SR018 working-first scope and SR017 hosting/access remain; prior approvals retain their historical scopes.")
s=s.replace('real independent two-computer proof before delivery, not before implementation.','real independent two-computer proof was required before delivery under DEC014; DEC016 now accepts VM cross-node filesystem proof for this increment and defers independent physical qualification.')
s=s.replace('changes are merged, and the user explicitly verifies the result before finalization.','changes are merged, and delivery verifies the increment against DEC016. The full real-machine/runtime journey remains a later qualification target; personal user verification is no longer a pre-finalization gate for this increment.')
s=s.replace('Desired behavior (Approved SR-018)','Desired behavior (Approved SR-024; functional SR018 retained)')
s=line(s,'| Delivery Engineer / user |','| Delivery Engineer / user | Verify the increment and finish safely | Required cross-node VM filesystem evidence, review, docs, merge and cleanup; later user/physical/agent qualification explicitly deferred | Single-participant mocks do not prove cross-node sharing; unrun deferred cases are not Pass |')
s=rep(s,'## Scope Guardrail\n','## Scope Guardrail\n\nSR024 changes completion proof and sequencing only (DEC016 below). Required shared-filesystem cases across distinct VM nodes remain in this ticket; authenticated-agent journeys, independent physical/personal validation move to later qualification. No blanket acceptance of untested filesystem cases or new live-operation authorization.\n')
s=line(s,'All rows below form Approved','All rows below form Approved SR-024, with unchanged normal functional targets from SR018 except the explicit completion/proof staging in DEC016. DEC012/013 preserve hosting/access; DEC015 still defers advanced outage machinery. DEC016 supersedes DEC014 only for increment-completion sequencing. No live-operation or release permission is implied.')
s=line(s,'| REQ-012 |','| REQ-012 | Validate/document the healthy shared-filesystem matrix across distinct VM nodes without requiring agents as writers/readers. Retain actual bytes/consistency/permissions, public guided setup, repeat/restart, cleanup/preservation and filesystem-facing integration checks. Increment completion requires IV-F01–F06, merged changes and delivery verification; physical/native-agent/personal qualification is explicitly deferred under DEC016. Disclose deferred outage behavior. | All | Must | Direct user VM-filesystem testing clarification, approval-record-sr024.md |')
s=line(s,'| REQ-015 |',next(x for x in s.splitlines() if x.startswith('| REQ-015 |'))+' <!-- SR024: any physical-topology proof wording in this row is staged by DEC016; cross-node VM proof remains required now. -->')
s=line(s,'| REQ-016 |','| REQ-016 | Retain actual disposable filesystem/client/container/native-agent feasibility successes, failures and limits used for architecture selection. For current increment acceptance, actual distinct Mac/Linux VM nodes and managed Docker clients may prove the shared-filesystem contract without authenticated agents. Independent physical Mac/Linux/Docker and native-agent qualification remain later tests, not current pre-delivery gates; all required VM filesystem cases still need evidence under DEC016. Do not modify live storage/mounts/nodes without specific approval or introduce deferred outage-hardening gates. | BEH-001–005 | Must | Existing experimental basis plus DEC014/015 as qualified by direct-user DEC016 |')
s=line(s,'| AC-011 |','| AC-011 | 012 | All | IV-F01–F05 evidence and selected review complete | Delivery records exact builds/topology/commands, required VM filesystem evidence, limitations and deferred owners, docs, integrated-state verification, merge/finalization and cleanup | Unexecuted required filesystem cases or failed integration prevent closeout; IV-D01–D03 deferred cases do not. Never claim the user verified or all full-product tests passed | API revised-basis result, proportional test-code review, Delivery evidence/closeout; no personal-test wait |')
s=s.replace('it does not satisfy the independent physical pre-delivery gate','it is not independent physical proof; DEC016 permits distinct VM-node filesystem acceptance for this increment, not a physical Pass')
s=s.replace('real multi-computer pre-delivery gate retained','cross-node VM filesystem increment gate required under DEC016; independent physical qualification deferred')
s=rep(s,'## Relevant Scenarios And Journeys',matrix+'\n## Relevant Scenarios And Journeys')
s=s.replace('Current intended behavior is Approved SR-018;','Current intended behavior is Approved SR-024, with SR018 functional targets and DEC016 proof staging;')
s=s.replace('approval-record-sr018.md incorporates architecture-review-scope-feedback.md for working-first scope.','approval-record-sr018.md incorporates architecture-review-scope-feedback.md for working-first scope; approval-record-sr024.md captures the latest direct VM filesystem acceptance clarification. evidence/acceptance-revision/sr024/acceptance-disposition.md records evidence and deferred ownership, not an independent requirements authority.')
s=line(s,'| ASM-004 |','| ASM-004 | Independent physical resources and authenticated runtime access will be supplied for later qualification | User authorizes later; PM tracks, API validates when available | Deferred under DEC016; actual distinct-VM filesystem cases are required now and may not be declared impossible because agents/physical hosts are absent |')
s=line(s,'| DEC-014 |','| DEC-014 | Historical SR017 sequencing: native-Mac/Linux-container feasibility before implementation, independent physical proof before delivery | Retained historical decision; physical pre-increment-close sequencing is superseded by DEC016. VM evidence never becomes physical evidence | approval-record-sr017.md retained unchanged; current acceptance DEC016 |')
s=s.replace('not hosting, plaintext restrictions, physical normal-use proof or final user verification.','not hosting or plaintext restrictions; it did not itself waive physical/user verification. Later DEC016 separately changes increment proof/completion sequencing.')
s=rep(s,'## Traceability','## Current Increment Decision — SR024 / DEC016\n\nThe latest user explicitly requires all shared-filesystem cases across different nodes, accepting VMs and non-agent processes; personal physical commands/authenticated agents are not prerequisites. Approval and exact chronology: approval-record-sr024.md. The SR024 acceptance table is authoritative for current-versus-deferred proof. This qualifies the preceding immediate-close suggestion: scope acceptance is not a statement that missing cross-node cases ran. No question remains on this boundary. No source mechanism, security restriction or release gate changes.\n\n## Traceability')
s=s.replace('Current SR018 retains the SR015 Nodes guide and SR017 hosting/access/sequencing choices;','As of SR018 the baseline retained the SR015 Nodes guide and SR017 hosting/access/sequencing choices;')
s=s.replace('final physical validation is not waived.','full physical qualification remains unproved; later DEC016 defers it from this increment rather than claiming it passed.')
a=s.index('## Architecture Phase Input And Readiness');b=s.index('## Historical Evidence And Approval Evolution',a)
s=s[:a]+'''## Architecture Phase Input And Readiness

Approved SR024 is the current completion/proof basis; SR018 normal functional scope, DEC012
hosting/DEC013 access/DEC015 outage deferral remain. DEC016 is the direct user's latest
scope clarification, not an open questionnaire. Same reviewed SR023 runtime architecture
and current IR009 implementation apply; no new source change is prescribed. Technical
ARCH007 and CRR013 passes remain at their reviewed basis, not whole-product acceptance.

API006 Blocked67.86% is the latest completed execution report. It resolves the Mac identity
failure at executed scope but does not prove all cross-node filesystem cases. Reconcile and
complete the required VM filesystem matrix before closeout; physical/native-agent/personal
checks are later qualification. Preserve prior raw failures and scoped closures. No native
agent, independent physical host or user-live command is required merely to exercise files.
No public release authorization or full-platform qualification is inferred.

Design alignment is acceptance/validation sequencing only; actual architecture, state/data
and Product UI/UX are unchanged. Applicable configured review remains proportionate. The
next substantive work is API/E2E filesystem coverage, then durable test-code review and
Delivery finalization, not duplicate implementation or a full source/architecture re-audit.

'''+s[b:]
s=s.replace('Current SR018 approval state above supersedes earlier current-status language;','Current SR024 approval state above supersedes earlier current-status language;')
write('requirements-doc.md',s)
s=prior('requirements-approval-request.md');i=s.index('---\n## Historical approval-request record')
write('requirements-approval-request.md','''# Current disposition — Approved SR024

No historical questionnaire is pending. Latest direct-user clarification requires shared-filesystem tests across different VM nodes without agents; it qualifies the preceding immediate-close suggestion. Current authority: requirements-doc.md DEC016 and approval-record-sr024.md. Complete the required cross-node filesystem matrix; independent physical hosts, authenticated agents and personal-command verification are later qualification, not current dependency requests. No live-operation or release permission is implied. Earlier questions below are history only.

'''+s[i:])
s=prior('design-spec.md')
s=line(s,'- Package `shared-network-workspaces`','- Package `shared-network-workspaces`, Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; current alignment **SR-024**; status **Ready — Architecture Design Complete, acceptance/validation sequencing only; technical SR023/ARCH007 unchanged**.')
s=line(s,'- Intended-behavior authority:','- Intended-behavior authority: requirements-doc.md **Approved SR024**, exact direct-user VM cross-node filesystem clarification in approval-record-sr024.md. Functional SR018 working-first scope and DEC012 hosting/DEC013 private-LAN access/DEC015 outage deferral remain; DEC016 changes current-versus-later proof. Distinct VM nodes and non-agent filesystem actors are valid for this increment; all required filesystem cases remain gates. Physical/user/authenticated-agent qualification is deferred, not passed. No runtime, source identity, freshness, persistence, private-link or UI mechanism changes. Normal guards, source preservation, <=5s visibility, hard mounts and current-kernel support remain unchanged.')
s=line(s,'- Canonical evidence:','- Canonical evidence: investigation-notes.md, evidence/acceptance-revision/sr024/ and full cumulative API006 package. **IR009/source d3c88f37c30ee74a89a95a4f6906992667c9b875 / ARCH007 / CRR013 source Pass100**; **API006 Blocked67.86%** is latest completed execution. API-F005/CR007 resolved at actual native-Mac scope; API-F003/F004 and prior scopes retained. Missing cross-node/both-OS managed-client cases are not proved by those closures. No new established product failure, no CRR014/test-code review yet. No specialist/source edits by SR024. D001 deferred, IMP-D001/FUP001 unchanged.')
s=rep(s,'## Current-State Read And Intended Change','''## SR024 Acceptance Alignment — No New Production Design

Latest direct user clarification requires shared-filesystem test cases across different VM
nodes even without agents. Follow requirements DEC016/IV-F01–F06 for current acceptance,
IV-D01–D03 for later qualification and IV-R01 for unchanged release gates. Actual peer
mounts and non-agent processes are valid filesystem-layer proof; same-host local reads or
scripted native-agent claims are not. Mac guest network inability remains a required
filesystem-validation gap to investigate within already authorized disposable resources,
not a reason to demand physical machines/authenticated profiles for these cases.

Changed artifacts are requirements/approval, canonical evidence/history, this alignment
and handoff only. No implementation delta, new subsystem, persisted transition, dependency,
refactor or UI design. Cumulative Large/High is retained; the SR024 delta itself is a small
acceptance/sequencing change. ARCH007 remains the technical design review; no claim it
reviewed the new acceptance. Next substantive work: API coverage reconciliation/completion
on the revised basis, proportional test-code review, then Delivery integration/docs/
verification/finalization/cleanup. Fresh handoff rules govern the recipient, not an inferred
repeat implementation pass. Physical/authenticated-native-agent/personal verification no
longer blocks this increment, but unexecuted required filesystem cases do.

## Current-State Read And Intended Change''')
s=s.replace('current IR002–008 production implements','current IR002–009 production implements')
s=s.replace('CR007 now exposes the persisted Mac device-number lifetime mismatch.','CR007 exposed the persisted Mac device-number lifetime mismatch; IR009 implements SR023 and API006 resolves it at actual native-Mac scope.')
s=s.replace('SR023 current path:','Historical SR023 pre-correction path (fixed by IR009, scoped public proof API006):')
s=s.replace('Concrete files below.','Concrete files below. SR024 changes only acceptance/validation alignment artifacts; production files and technical SR023 contracts remain unchanged.',1)
s=line(s,'Independent review history preserved:','Independent history preserved: ARCH001–007, IR001–009, CRR001–013, API001–006. Latest CRR013 source Pass100 / API006 Blocked67.86% are separate authorities; historical CRR012/API005 Fail remain evidence, not current unresolved Mac failure. CR001–007 closures retain actual scopes, not full product Pass. Proportional af9f23 successful-test-code review remains pending after API completion on SR024. Delivery/finalization **N/A — not yet performed**; external Product **N/A — not applicable**.')
s=s.replace('| code-review-evidence/crr-012/package-index.json,','| evidence/api-e2e/api-rev-006/package-index.json and report/ledger; approval-record-sr024.md | Current scoped Mac fix closure and explicit VM-filesystem acceptance boundary | API006 remains Blocked; SR024 is not a new test Pass |\n| code-review-evidence/crr-012/package-index.json,',1)
s=s.replace('Independent failure evidence; no current fix Pass','Historical independent failure evidence; scoped public fix proof now API006')
s=s.replace('Experimental evidence supports UUID+inode, not product closure.','SR023 experimental evidence supported UUID+inode, not product closure; IR009/API006 now establish the corrected public native-Mac scope, not full qualification.')
s=line(s,'**Current recovery delta SR023:**','**Current SR024 next work:** technical SR023 implemented/reviewed in IR009/CRR013; API006 has resolved API-F005 at public native-Mac scope. Do not reimplement or rerun the full audit just for acceptance alignment. API/E2E must map/reuse current relevant evidence and complete missing required cross-node VM filesystem cases per DEC016, without waiting for authenticated agents/physical user hosts. Then selected proportional durable test-code review (af9f23 included) and Delivery integration/docs/verification/finalization/cleanup. Fresh rules govern handoff; no duplicate implementation dispatch. The numbered sequence below is original implementation context, not a request to redo completed work.')
s=s.replace('Delivery docs, real physical scenario, merge, explicit user verification, authorized release/cleanup.','Delivery docs, required cross-node VM filesystem evidence under DEC016, merge and cleanup; independent physical/native-agent/personal verification is later qualification, release separate and authorized only under its guide.')
s=s.replace('SR023 API-F005-first ordering supersedes historical API-F002/API-F003/API-F004 first-case orders for this incoming correction; prior scoped resolutions remain regression evidence, not reopened failures.','Historical SR023 API-F005-first ordering was executed in API006. SR024 now completes the remaining VM filesystem matrix; prior scoped resolutions remain regression evidence, not reopened failures.')
s=s.replace('Physical Mac and independent Linux plus Mac Docker agent, actual one-command create/connect and user verification are release/delivery gates, not designer waits.','Actual public create/connect and peer filesystem proof remain increment gates, with distinct VMs allowed under DEC016. Independent physical Mac/Linux, authenticated agents and personal verification are later qualification, not pre-close waits. Mac managed Docker CLIENT filesystem coverage remains required.')
s=s.replace('User receives the runnable single command only once built/published and verified;','User receives the exact available built candidate/testing entrypoint with truthful qualification/publication status; a public installer is offered only once actually published and qualified;')
write('design-spec.md',s)
notes='''## Current SR024 — User-approved VM filesystem acceptance boundary

2026-10-15. Requirements **Approved SR024**, design alignment **Ready SR024** with unchanged
technical SR023/ARCH007; Large/High. User's latest direct clarification supersedes the
preceding suggestion of immediate closeout: all shared-filesystem cases across different
nodes remain needed, VMs and non-agent readers/writers are acceptable. Physical/personal/
authenticated-agent validation can wait. Exact quote/approval/informing message:
[approval-record-sr024.md](approval-record-sr024.md). Canonical intended proof staging is
requirements-doc.md DEC016; not an evidence claim or blanket test waiver.

Facts inspected: source d3c88f37c30ee74a89a95a4f6906992667c9b875 / IR009; CRR013 Pass100;
API006 Blocked67.86%, no new established product failure. Public Mac two ordinary boots
with real device reassignment/automatic nonroot mounted RW and real replacement refusal
resolve CR007 at that scope. Linux native regression and earlier Linux native/Docker
freshness/lifecycle closures retained. API006 current Macguest could not reach Linuxguest
2049/SSH despite Linux listener/self-connect; no peer proof resulted. Macmanaged-client/
full cross-node filesystem matrix remains incomplete. No source review pass, own-mount IO
or agent-credential absence closes that gap. Evidence: API006 report/ledger/blockers/
prior-failure-resolution and cumulative1592-reference index.

Authorities: solution-designer SKILL, requirements-engineering, architecture-design,
design-principles/templates (full phase reading gates in this conversation), task root
AGENTS/DESIGN/TESTING, current canonical approval/design/history/review/implementation/API
artifacts; current source.go/source_identity.go and packaging/RELEASE.md. No new migration
or mechanism work. API ledger/report current sections read; historical evidence reused at
its named scope, not a claim to rerun/re-audit all history. Prior approval018 and specialist
records are read-only. Investigation this round is local document/source evidence review;
no tests, VM/provider/host/network operations or owned live resources.

Supplement inventory: evidence/acceptance-revision/sr024/acceptance-disposition.md is
Solution Designer-owned evidence, coverage intent and follow-up ownership (all relevant
filesystem ACs; ApprovedSR024 applicability); input-audit/snapshots/package-index/final-audit
retain complete input/protection evidence. Earlier draft approval/disposition retained as
superseded before dispatch; only current canonical SR024 is authority. No Product supplement.
Next expected action is API coverage reconciliation and missing cross-node filesystem
execution, after any configured alignment review; not duplicate production implementation.
No API Pass/CRR014/release/TaskDone/user-test claim; deferred D001/IMP-D001/FUP001 limits stay.

'''
s=prior('investigation-notes.md');s=rep(s,'## Current SR023 —','## Historical SR023 —')
s=rep(s,'# Investigation Notes — Shared Network Workspaces\n\n','# Investigation Notes — Shared Network Workspaces\n\n'+notes)
write('investigation-notes.md',s)
history='''

## SR024 — Direct-user VM cross-node filesystem acceptance revision (2026-10-15)

- Trigger: Code Reviewer relayed incremental-close request after API006; user then directly
  accepted VM scope/suggested Delivery or Reviewer, then explicitly clarified **all shared
  filesystem cases across different nodes are needed even without agents**. Latest quote
  and exact approval/informing message in approval-record-sr024.md. Earlier immediate-close
  interpretation is superseded before dispatch, not a completed delivery or separate SR.
- Prior ApprovedSR018 / ReadySR023 / ARCH007 / IR009 / CRR013 source Pass100 / API006
  Blocked67.86%. Current **ApprovedSR024 / ReadySR024 acceptance alignment**, same technical
  SR023 and unchanged source d3c88f37c30ee74a89a95a4f6906992667c9b875. No new finding/CRR014,
  API result, numeric score or production modification. API-F005/CR007 now scoped resolved
  by API006; CR005/API-F003, CR006/API-F004 and previous scopes retained.
- DEC016 / REQ012/015/016 / AC011 and staged proof across AC001–020: distinct Mac/Linux VM
  peer mounts plus managed Docker clients can prove this increment without agents; all
  planned filesystem read/write/consistency/concurrency/permission/lifecycle/preservation
  cases still required. Physical hardware/native-agent/personal verification deferred to
  user-authorized follow-up. Known Macguest transport gap remains current filesystem work,
  not erased by physical deferral. No unsupported filesystem/locking guarantee added.
- Canonical requirements and approval-request current status, investigation/supplement,
  design next-work/acceptance alignment and full solution handoff updated. All old solution
  history retained as exact prefix. No technical subsystem/refactor/state transition/UI
  impact; cumulative Large/High retained. Approval by Solution Designer within direct
  user-defined scope, user informed; no further generic questionnaire needed.
- Required downstream: API owner reconciles exact carried evidence and completes missing
  cross-node filesystem matrix, emits own new verdict; then proportional af9f23/durable
  test-code review and Delivery integration/docs/verification/finalization/cleanup. No
  immediate TaskDone or full-matrix Pass. User personal tests later with PM follow-up
  custody; no new Task/delegated copy/duplicate FUP001 here. Release gates unchanged.
- No runtime tests/live resources this round;1592 input refs/1586 protected inputs and286
  old dist files audited. No specialist artifact changed; initial pre-clarification draft
  records retained separately, not a competing authority. Fresh routing recorded below
  after classification/context persisted. No duplicate implementation/API dispatch.
'''
write('solution-revision-record.md',prior('solution-revision-record.md')+history)
write('evidence/acceptance-revision/sr024/acceptance-disposition.md','''# SR024 acceptance disposition — final user clarification

Evidence/ownership supplement, Solution Designer2026-10-15. Canonical intended proof scope:
requirements-doc.md DEC016. Approval chronology and exact latest quote: approval-record-sr024.md.
The initial draft in superseded-initial-* is historical only; it predates two direct user
clarifications. Latest clarification retains all cross-node filesystem cases, accepts VMs
and explicitly allows no agents inside the nodes. No immediate-close/all-tests-done claim.

## Current evidence

Input HEAD f0e28f60473715be0df34194ea538082f1a355e3; current source
 d3c88f37c30ee74a89a95a4f6906992667c9b875 / IR009 / CRR013 Pass100 / ARCH007.
API006 **Blocked67.86%** owns current execution result under old SR018 proof basis. Native
Mac public create/two ordinary boots/automatic nonroot mounted RW/actual device reassignment/
real source+volume replacement refusal establishes CR007 closure at that scope. Linux
native regression and API005 Linuxnative/Dockerstorage 40fixtures/80fresh reads <=5s plus
API-F003 boot/Stop/policy/replacement/detach remain their documented scopes. Not a complete
both-OS client/independent-peer case matrix. No test rerun or new runtime claim by designer.

Specific gap: API006 peer-network-confirm could not connect Macguest to Linuxguest22/2049;
Linux listener/self-connect was healthy. Both guests' own-mounted IO is not cross-guest proof.
Current Mac managed Docker clients and full filesystem-facing preview matrix were NotTested,
not proved impossible. Missing authenticated profiles/physical hosts do not justify skipping
these cases now that user accepts distinct VMs/non-agent actors.

## Next coverage reconciliation (API owner)

Use requirements IV-F01–F05 as the required scope, including all planned filesystem cases,
not only a newly selected happy path. Produce a matrix with case/AC, storage mode, writer
and reader nodes/OS/client form, public setup route, exact builds/engine/source/UUID,
nonroot identity, assertion/evidence, and Pass/Fail/NotTested/Blocked. Carry valid existing
results with exact relevance and identify only the missing executions. Read/write scripts
are valid filesystem actors but are not native-agent-tool proof. Probe all required actual
peer behaviors (visibility after commit, independent concurrency, permissions, metadata,
rename/delete/list, lifecycle/preservation) using normal supported paths. No copying data
into the reader, direct-controller shortcut for setup or fake API substitutes.

Re-establish isolated guest transport only within existing disposable-VM/network authority;
no hostbridge/firewall/usernode mutation inferred. If blocked, preserve attempted safe
alternatives and name the narrow missing capability; don't re-ask for physical machines or
provider credentials for a filesystem case. This is not an authorization for paid access.
No generic outage-hardening or new locking guarantees. Retain source review and scoped
fixes, not repeated full reviews/rebuilds. Emit a new API verdict on revised acceptance;
never edit old Blocked67.86 to Pass or manufacture a confidence increase.

## Ownership after required filesystem proof

IV-F06: Delivery integration/docs/current testing entrypoint/finalization/cleanup after
selected proportional test-code review (af9f23 cumulative REST still pending). No new source
fix prescribed. Exact fresh rule chooses immediate next recipient; user also requests API
coverage clarification and previously allowed reviewer continuation. Do not duplicate
implementation dispatch just because technical design/source already passed.

IV-D01 independent physical/private-LAN, IV-D02 authenticated native-agent full journeys,
IV-D03 personal commands/acceptance: deferred from this increment, not Passed. User later
authorizes resources/profiles/budget and tests; API records resulting evidence and PM tracks
subsequent iterations/fixes using normal dispatch approval. No new Task or duplicate FUP001.
IV-R01 qualification/signing/hosted/public release: separate unchanged gates, no authorization.
Feasible local build/packaging tests remain required. Preserve unavailable Guide/public-link
state and distinguish actual candidate entrypoint from a published installer. D001/DEC015
outage limitation and IMP-D001 private links/currentSourceUpdateRemove/AGY local remain.
''')
print('Updated six canonical artifacts, approval and final disposition. No production/specialist edits.')
