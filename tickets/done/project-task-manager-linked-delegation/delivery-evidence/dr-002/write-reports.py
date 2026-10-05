import pathlib,json,datetime
w=pathlib.Path(__file__).resolve().parents[5];t=w/'tickets/in-progress/project-task-manager-linked-delegation';e=t/'delivery-evidence/dr-002';now=datetime.datetime.now(datetime.timezone.utc).isoformat()
base='10fb69504f99a615e0728ffdd6c1fcab0104ff05';head='ccb5fbe3ca63b3542fa6538e035a4b1428c80788'; priorbase='4dee901d6163ca7053916fa1edc295afbfd7a6da'; resolved='cd469cbadc2d871e7a0139262869334e6b1cd682'; checkpoint='028cca2312eae25737f482d94f9f3c213d83c3b9'
authority='REQ-BL-008 / scoped SD-AP-001+002 / semantic SR-014 / ARCH-REV-005; **Large / High / Reviewed**'
checks=[json.loads(x) for x in (e/'check-results.jsonl').read_text().splitlines()];assert len(checks)==4 and all(x['exitCode']==0 for x in checks)
limits='''- API17 is independently **Pass95.00%, broader Required — completed** on IR011/4dee901d; source CRR022 Full Re-Audit **Pass9.20** and cumulative all20 test-code CRR023 **Pass** remain separate, unchanged authorities. API16/CRR021 are pre-refresh support, not current executable certification; withdrawn API15 is not converted.
- API17's exact paid per-actor PID/IO diagnostic supplement is **Not Tested** because standalone metadata does not support Org IDs. Business ACK/Offline or controlled SDK real-child, Native or helper evidence does not backfill it. No universal paid physical/provider/root/model/remote-host certificate or new confidence score.
- FAPI007 remains **Open / Unclear / Not Reproduced**. FAPI011 original inner/physical/sole-cause/schedule attribution and FAPI008 wire/stage/FIFO/observer limits remain; prospective positives do not causally close them.
- API17 observer corrections for retired offline input rows/separate lifetime collection, unsuccessful attempts, initial cleanup EADDRINUSE and trailing wrapper error after inner Vitest0 are retained. IR011 broader unit **3files4fails /227files2046pass /3files5skip** and architecture **1 unchanged blanket-boundary fail /3files43Pass** retain checkpoint provenance; these are not disabled, fixed or turned green by the selected Delivery checks.
- Agent projection is visibility evidence, not standalone privacy certification. Native hosted-child checks and controlled helper backends cover their named ownership/admission boundaries, not all roots/providers or paid OS teardown. No Gemini4.8, all-model or remote-host prerequisite is invented.
- API17 actual current-at-that-round packaged Sonnet5 CLI-auth Manager/Org saved-ID/attachment/status/protection and normal same-profile restart evidence, 4426 dist/package files, all545/all20 and asar binding remain attributable to **4dee901d/IR011**. DR002 did not rebuild/start an app or run a paid journey on the additional five base commits; it does not re-label the API17 asar as a ccb5fbe3 artifact.'''
(e/'retained-limits.md').write_text('# Retained evidence boundaries — DR-002\n\n'+limits+'\n')
docnotes={
'TESTING.md':('Regression map','Linked lifetime/helper/Native paths, clean-cut fixture location, layer and artifact-fidelity limits.'),
'autobyteus-server-ts/docs/modules/projects.md':('Canonical Task/business/runtime contract','Shipped ordinary Manager, saved-ID mode, compact mutation/list assignments, one current array, owned forest, DONE/retry/reopen/Delete protections.'),
'autobyteus-web/docs/projects.md':('User-facing behavior and exclusions','Chat/@ Manager and linkage without new Project chat/status UI; unchanged Refresh/gating; acknowledgement versus cleanup.'),
'autobyteus-server-ts/docs/modules/agent_team_execution.md':('Delegation/lifecycle preservation','Strict linked/described modes, business Task versus retired delegation subsystem; closed lifetime exceptions to idle/wake/restore.'),
'autobyteus-server-ts/docs/modules/agent_orgs.md':('Org integration','Root-neutral lifetime/helpers, physical host versus ownership, independent A/B/unowned protection.'),
'autobyteus-server-ts/docs/modules/standalone_agent_run_root.md':('Agent-root integration','Current standalone root owner and same linked-copy/fence/protection contract.'),
'autobyteus-server-ts/docs/modules/agent_communication.md':('Address resolution exception','Own Team → lifetime helper → borrowed unowned outside → lifetime-local new helper; exact input fencing.'),
'autobyteus-server-ts/docs/modules/run_history.md':('Retained/public projection','Recursive exact child DTO projection, private stamps omitted without losing children, closed restore remains fenced.')}
table='\n'.join(f'| `{w/p}` | {kind} | {note} |' for p,(kind,note) in docnotes.items())
checktable='\n'.join(f"| {x['name']} | `{x['commandText']}` | exit0 | `{x['log']}` |" for x in checks)
(t/'docs-sync-report.md').write_text(f'''# Docs Sync Report — DR-002

## Scope / Result
**Updated; docs synchronization Pass. Overall Delivery Blocked — awaiting explicit user testing/verification.** {authority}.
Package: `project-task-manager-linked-delegation`; trigger current IR011 / CRR022 / API-REV017 / CRR023 reviewed-route return. Completed preparation at {now}. This is not terminal Delivery Completed.

- Original bootstrap: `806907faeb567d2b703e10fe984fcd01be0b41fd`, recorded finalization target **origin/personal**.
- DR001/IR011 reviewed integration base: `{priorbase}`. Prior DR001 source-conflict hold was resolved by IR011 and independently re-reviewed/validated, not erased.
- Required fresh fetch `GIT_OPTIONAL_LOCKS=0 git fetch --no-tags origin +refs/heads/personal:refs/remotes/origin/personal` exit0: latest `{base}`, five new base commits.
- Finished already-reviewed resolved pending merge locally at `{resolved}` (all545 package bytes exact before the next refresh), then clean base-into-ticket merge at `{head}`. These local integration commits are the permitted pre-verification safety exception, **not finalization**. No target merge/push occurred.
- Docs started only after clean integration and all four focused executable checks passed. Exact argv/cwd/environment/times/exit/logs: `{e}/check-results.jsonl`. Server37files482tests, Native/Task4files31tests, web6files75tests, production compile exit0. Counts overlap upstream coverage; not whole baseline certification.

## Why Long-Lived Docs Changed
The former Projects docs denied shipped Manager/linkage/resource effects and described full mutation diagnostics; Team docs described every restored copy as wakeable. Those statements no longer matched the accepted current source. Durable business-role, exact lifetime ownership, no-migration persistence and public projection knowledge must not remain only in this ticket. Current source is primary truth; approved requirements/design and separate current review/API reports support it.

## Docs Reviewed / Updated
| Absolute doc path | Type | New truth |
| --- | --- | --- |
{table}

`DESIGN.md`, root/server/web AGENTS.md, migration guideline, prompt_engineering.md and electron_packaging.md were also reviewed. **No change**: design/testing rules and generic prompt/packaging mechanics remain current; Manager-specific knowledge is promoted into Projects rather than changing the prompt architecture or inventing release behavior. Upstream's background-command presentation docs already describe its five-commit additive change.

## Durable Knowledge / Replaced Understanding
- Saved-ID delegation is a strict coequal mode, not a fallback or a caller-overridden payload. Task authority resolves current saved work; exact fresh Agent/Team ingress identity drives follow-up.
- DONE is explicit business status plus atomic irreversible lifetime closure and platform-owned scoped release, not engineering acceptance, physical proof, automatic completion or Manager resource supervision.
- Owned forest is stamped ownership across recursive/sibling-hosted helpers, not definition equality, physical containment or all-root Stop. Borrowed advisers and independent A/B lifetimes remain separate.
- Current bare Project array plus optional node lifetime collection replaces the earlier unshipped envelope proposal; no startup converter or dual reader. Metadata deletion retains lifetime/history facts.
- Current standalone Agent root/Native test location replaces the former agent-run-collaboration owner/location from pre-refresh evidence; prior snapshots remain recoverable. Existing recursive Agent/Org public DTO mapper preserves children while omitting internal stamps.
Sources: requirements-doc.md (REQ003–010), design-spec.md (DS002–008), IR011 reconciliation/fidelity, CRR022 production audit, API17 coverage/acceptance/ledger, CRR023 all20 successful test-code review. No source/test/prompt change or new acceptance rule was made by Delivery.

## Verification / Continuation
Added11 relative links/anchors and whitespace check pass: `{e}/docs-check.json`; exact before/after hashes, prior doc snapshots and diff: docs-change-provenance.json / prior-docs / docs-diff.patch in the same directory.
Docs-local blockers: **None**. Overall hold is explicit user verification and subsequent repository finalization/safe cleanup. No code/design/requirements issue requiring a reroute was discovered. User “then do the handoff” authorizes normal advance only. No successful terminal return or new API/source/test review is claimed.
''')
(t/'handoff-summary.md').write_text(f'''# Handoff Summary — DR-002 User-Verification Candidate

## Authoritative State
**Preparation ready; Delivery Blocked — explicit user testing/verification pending.** {authority}.
Current package **IR011 / CRR022 source Pass9.20 / API-REV017 independent Pass95.00 broader Required-completed / CRR023 all20 test-code Pass**. Current docs/report/revision supersede DR001's routing hold only; DR001 evidence/history remain unchanged and recoverable.

## Integrated Candidate / Checks
- Worktree `{w}`; branch `codex/project-task-manager-linked-delegation`; HEAD `{head}`.
- Recorded finalization target origin/personal, freshly fetched `{base}`. Resolved prior 4dee merge committed locally `{resolved}`, then five new base commits merged cleanly. No unmerged paths or pending merge remain. The latest additive upstream change exposes background shell commands; selected lifecycle/projection/UI checks found no changed approved Task contract. No conflict was silently selected or resolved by this round.
- Production compile exit0; server37files482tests, Native/Task4files31tests and web6files75tests all Pass. Exact commands/logs/results `{e}/check-commands.json` / check-results.jsonl. These are Delivery-owned post-refresh checks, not a new API certificate or universal physical/model journey.
- Eight long-lived docs synchronized; authoritative `{t}/docs-sync-report.md`. Delivery doc edits remain unstaged; ticket remains in-progress. No runtime-source/test edit by Delivery.

## Business Behavior To Verify
Use a **fresh build of this worktree** and disposable/owned Project/context/workspace data, never the installed/user app. The recorded API17 asar predates this five-commit refresh. The normal documented entry is `pnpm --silent isolated-app start --build`; only run model sends if deliberately selected/authorized by the user. Stop the exact instance ID that command creates afterwards.

1. Invoke the ordinary shipped Project Task Manager through Chat/@; resolve a real Project, reuse/create saved Task text/context and clarify ambiguity without inventing IDs.
2. Delegate saved work by Task ID to the chosen Agent/Team; verify exact ingress follow-up, saved content and explicit IN_PROGRESS. Observe workers through existing concrete run/history surfaces, not a new Projects assignment panel.
3. From actual results or explicit business instruction set DONE; check only owned work closes while Manager/other Task/borrowed adviser and retained files/history survive. Do not substitute business ACK/Offline for exact physical teardown proof.
4. Refresh the board; reopening TODO/IN_PROGRESS starts nothing. Deliberate later dispatch uses fresh copies/lifetime; old closed copies remain closed.

Please report **explicitly verified** or the concrete observed issue after your testing. No entire provider/root/model matrix is required or invented. No verified-user reference is currently available. After verification Delivery must fetch target again, protect docs and reintegrate/recheck if advanced; a material handoff change requires renewed verification.

## Preserved Evidence / Limits
{limits}

Safety: original DR001 checkpoint/backups remain; current-input binary index derivative SHA `7b88df25613022646974421c128cb3570c6c4bba26ee0efd141540a2fa33baea` was preserved before authorized commits at `{w.parent}/.task-safety-backups/project-task-manager-linked-delegation/dr-002-latest-base`. Its API17 recurrence origin is unassigned, not original-byte-exact;46507-entry semantic/extension audit remains API-owned. DR002 expected Git/index changes are local integration only, never arbitrary restoration/stash reset. Prior Delivery reports/docs are archived in `{e}`.

## Remaining Gates / Ownership
User verification **not received**; ticket move-done, final ticket commit/push, final origin/personal merge/push and safe task-worktree/branch cleanup **not performed / held**. Release/tag/deploy/rollout **not requested, Not required for this preparation scope**. No app/paid journey/credential/user-data change by Delivery. Retained disposable Vitest DB was preflighted as repository-owned with no live owner and archived before serial setup resets; not a user DB.
Current Delivery revision `{t}/delivery-revision-record.md`; release/finalization authority `{t}/release-deployment-report.md`. No successful terminal package eligible or sent. The verification hold needs no new Implementation/API assignment or upstream classification; continuation stays with Delivery after the user's signal.
''')
(t/'release-deployment-report.md').write_text(f'''# Delivery / Release / Deployment Report — DR-002

## Scope / Authoritative Result
**Blocked — awaiting explicit user testing/verification; preparation integration/checks/docs complete.** {authority}.
Normal reviewed-route advance only; no blanket merge/push/release/deploy/paid-test authority. Finalization target **origin/personal** from recorded bootstrap context. Delivery revision DR002 follows DR001 Blocked; its chronology is retained.

## Handoff / Integration
- `{t}/handoff-summary.md`: **Updated**, coherent user-verification candidate, not Delivery Completed.
- `{t}/docs-sync-report.md`: **Updated / Pass**, eight long-lived docs, before/after hashes and eleven new links checked.
- `{t}/delivery-revision-record.md`: DR001 retained; DR002 appended.
- Required initial fresh fetch exit0 `{base}`, five commits beyond reviewed IR011/API17 base `{priorbase}`.
- Existing checkpoint `{checkpoint}` remains exact/recoverable. Completed reviewed resolved pending merge `{resolved}`, all545 input package bytes preserved before next merge.
- Latest base merged cleanly into ticket: `{head}`; no conflicts/unmerged entries/pending merge. **Local integration only, not repository finalization.** No final target branch merge or push.
- Post-integration executable reruns **Yes / Passed**, then docs edits; no stale/already-current/no-rerun rationale. All four commands exit0, 37/482 server,4/31NativeTask,6/75web plus compile. Detailed records below. Tests used the repository-defined disposable SQLite fixture (no lsof owner, inherited bytes archived); no application/user DB or credentials.
- Handoff current with the last fetched target **Yes, as of this fetch**. Must refresh again after explicit verification; no perpetual freshness claim.

## User Verification / Ticket
- Explicit user testing/verification received: **No**; reference **N/A**. Prior “then do the handoff” is routing authorization, not verification.
- Renewed verification: not yet applicable; re-evaluate after required post-signal refresh/material re-integration.
- Ticket moved to done: **No**, remains `{t}`; archived path N/A.
- Version bump/tag/release commit: **Not performed / Not required for current no-release preparation scope**.

## Repository Finalization
- Branch `codex/project-task-manager-linked-delegation`, local integration HEAD `{head}`.
- Final ticket commit / push: **Blocked, not attempted**; local pre-verification integration commits above are not final delivery commits.
- Target origin/personal update / ticket-into-target merge / target push: **Blocked, not attempted**.
- Target advanced after verification: N/A — no verification. Protect docs before any further integration; finalization order remains ticket done → final commit/push → target update/merge/push.
- Overall repository finalization: **Blocked solely by explicit verification gate and consequent unfinished work**, not unresolved DR001 source conflicts.

## Release / Deployment / Cleanup
- Release/publication/deployment applicable: **No — not requested**. Result **Not required for this scope**, no command, version, tag or rollout; not an assertion all future releases are unnecessary.
- Method if later authorized: root documented release helper/web AGENTS, only after verified finalization. Do not invent tag or run paid `release:test`/publication now.
- Release notes / archived note handoff: **Not required**, no release request.
- Dedicated worktree `{w}` and local task branch cleanup/prune: **Blocked/held until safe finalized target**. Remote branch deletion **Not required**. No source rollback, stash drop, user-app/data/credential cleanup or foreign process termination.
- API17 own instance cleanup evidence remains separately complete; it is not task-worktree cleanup or DR002 app execution.

## Environment / Data Transition
Approved persisted-data decision **Directly Usable — No Migration**: one current Project array, optional node lifetime collection/stamps, side-effect-free reads and ordinary atomic writes. Delivery app-data action **None**; no converter, migration, profile reset/replay or downgrade. Do not run an older concurrent writer over newly created lifetime facts. Metadata Delete/DONE preserve recorded history/other work; no destructive scope expansion.

## Verification Checks
| Layer | Exact command (cwd `{w}`, GIT_OPTIONAL_LOCKS=0) | Result | Log |
| --- | --- | --- | --- |
{checktable}

Logs retain expected fixture/token/Vue warnings. No failed Delivery executable check was suppressed; selected runs are not a whole repository green certificate. Documentation check `{e}/docs-check.json` exit0. Current package/authority/reference preservation audit lives in the same directory.

## Retained Boundaries
{limits}

## Rollback / Recovery Visibility
Original accepted checkpoint and DR001 safety archive remain; current pre-integration state/index/stages/status/patches/full package+ticket tar archived at `{w.parent}/.task-safety-backups/project-task-manager-linked-delegation/dr-002-latest-base`. Input index is disclosed API17 stat-cache derivative (7b88df...), not API17-original bytes; original46507-entry semantic audit and unresolved origin retained. Authorized integration produces a new expected index/HEAD; no arbitrary old-index restoration is claimed. Doc pre-images and DR001 reports are retained in `{e}`. Do not reset shared/user work or erase failed history. If verification finds a defect, preserve evidence and route its actual classification; future deployed rollback/data downgrade needs explicit planning, not automatic reversal of integration commits.

## Hold Classification / Routing
- Classification: **Verification gate (not a code Local Fix, Design Impact, Requirement Gap or Unclear issue)**. No new issue requires upstream classification.
- Recommended action/owner: **Delivery continues after explicit user testing/verification**. Fresh rules have no matching nonterminal verification-hold rule; do not manufacture one or send a successful Solution Designer terminal. Under the incoming-request fallback, return this preparation result only to requesting Reviewer run `code_reviewer_324c9986b1b745749a92256d790995c4`, with no new review/API assignment. Fresh rules/selection/actual receipt are archived separately; acceptance is claimed only after the tool succeeds.

## Final Status
- Explicit user testing/verification complete **No**; finalization complete **No**.
- Applicable release/deploy/rollout **Not required**; required safe worktree cleanup **not complete**.
- Unresolved blocker: explicit user verification, then finalization and safe cleanup.
- Successful terminal eligible / sent to Solution Designer: **No / No**, reference N/A.
''')
record=t/'delivery-revision-record.md';old=record.read_text();prior=(e/'prior-delivery-revision-record.md').read_text();assert old==prior
row='| DR-002 | Current IR011 / CRR022 / API17 / CRR023 return; clean latest-base refresh/checks/docs | DR-001 Blocked — source integration | **Blocked — explicit user verification pending (preparation ready)** | docs-sync-report.md; handoff-summary.md; release-deployment-report.md |\n'
marker='\n## Revision Entries\n';assert old.count(marker)==1
new=old.replace(marker,row+marker,1)+f'''
### DR-002 — Current reviewed package integrated and documented; verification hold (2026-10-05)
- Trigger: current IR011 recovery / CRR022 Full Re-Audit source Pass9.20 / API-REV017 independent Pass95.00 broader Required-completed / CRR023 proportional all20 Pass. {authority} unchanged.
- Prior result DR001 **Blocked — source-integration conflicts** retained; IR011 reconciled conflicts/automatic changes, independent current gates passed. DR001 did not become a historical success.
- Current result **Blocked — explicit user testing/verification pending**; preparation integration, focused checks and docs synchronization completed. No new source/API/test review or confidence.
- Fresh origin/personal `{base}` five commits beyond `{priorbase}`. Completed already-reviewed resolved merge `{resolved}`, then clean local base merge `{head}`. Permitted pre-verification integration, not finalization. Original checkpoint `{checkpoint}`, backups, accepted snapshots and disclosed stat-cache derivative index remain recoverable.
- Four Delivery-owned executable commands exit0: production compile,37files482unit tests,4files31NativeTask,6files75web. Exact records `{e}/check-results.jsonl`. Additional five-commit source state is not an API17 packaged-asar/model/restart rerun. Wider baseline failures/attributions remain.
- Docs `{t}/docs-sync-report.md` **Updated / Pass**: eight long-lived docs promote Manager/business projection, saved-ID work, exact owned forest/fences/retry, bare-array no-migration, closed restore, recursive public visibility and testing limits. Eleven new links/diff checks pass; prior docs archived. No source/test/prompt fixes.
- Handoff `{t}/handoff-summary.md` **Updated** for user verification at `{head}`; release/finalization `{t}/release-deployment-report.md` **Blocked**. DR001 pre-images in `{e}` preserve completed previous result.
- User verification **not received**, reference N/A. Ticket remains in-progress; no final commit/push/target merge/tag/release/deploy/task cleanup. Release/rollout not requested and Not required in current scope. No app/model sends/credentials/user-data mutation; only repository-owned disposable test DB reset by normal setup after archive/no-live-owner preflight.
- Successful terminal return **Not yet eligible**, not sent. Clear verification hold has no upstream issue classification: no fresh rule matches; sole requester-return fallback to exact Reviewer run, not another validation task. Continue only on later explicit input/user verification; no polling.
- Remaining gates: explicit testing verification, post-signal target refresh/reintegration/checks/renewed verification if material, ticket archive/finalization and safe worktree/local branch cleanup. Retained precise limitations in `{e}/retained-limits.md` are not broadened or backfilled; source/API/test reports and original attributions unchanged.
'''
# Prior DR001 chronology body remains byte-for-byte, apart from added index row.
assert new.split('### DR-001',1)[1].split('\n### DR-002',1)[0]==old.split('### DR-001',1)[1]
record.write_text(new)
(e/'completed-preparation.json').write_text(json.dumps({'at':now,'revision':'DR-002','result':'Blocked','reason':'Explicit user verification pending','preparation':'Ready','head':head,'latestBase':base,'taskSize':'Large','architecturalRisk':'High','route':'Reviewed','checks':4,'checksAllExit0':True,'docsUpdated':8,'userVerification':False,'finalization':False,'terminalEligible':False,'releaseDeployment':'Not required for current scope'},indent=2)+'\n')
print('Updated four authoritative Delivery artifacts; DR001 history retained, DR002 appended.')
