# Code Review Report

## Latest Authoritative Result
**Fail — Local Fix, implementation-owned. CRR-002 / focused API/E2E Failure-Origin Review, round 2, 2026-09-14.**

F-001 is confirmed: retained Org reconnect requires an active-only checkpoint, so ordinary server restart strands the previously focused member in `reopen_required` with its last Idle status. Separate history rows become Offline. This is a pre-existing source defect exposed by the approved restart scenario, **not an introduced lazy-runtime regression** and not a missing Offline setter or demonstrated Vue stale-reference bug.

Medium / High confirmed. Supported Product Scenario Gate: **Pass**; Material-Premise Gate: **Pass** (finding grounded in supported scenario). Overall review fails for F-001. API-REV-001 remains Fail/72.1%; its incomplete B02–B04 cases also prevent validation Pass. Next owner: Implementation Engineer under current failure-origin handoff rule. No successful-test review or delivery handoff.

## Review Round Meta / Authority
- Package AORG-FOLLOWUP-20260914-001. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up`; branch `codex/flat-agent-organization-model-follow-up`.
- Approved [requirements-doc.md](requirements-doc.md): SR-005; [design-spec.md](design-spec.md): DS-REV-001/SR-007; [investigation-notes.md](investigation-notes.md), [solution-revision-record.md](solution-revision-record.md), SR-006 evidence and SR-008 evidence-only supplement.
- Architecture: [design-review-report.md](design-review-report.md), [architecture-review-revision-record.md](architecture-review-revision-record.md), ARCH-REV-001. Implementation: [implementation-handoff.md](implementation-handoff.md), [implementation-revision-record.md](implementation-revision-record.md), IR-001.
- Prior source result: CRR-001 Pass, preserved in [code-review-revision-record.md](code-review-revision-record.md) and report at git `b4b8f042f:.../code-review-report.md`. This canonical report now records the latest focused result; prior 100/100 is **not current approval of the failed scenario**.
- Trigger: API/E2E Engineer's [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), API-REV-001, F-001/B01/SCN-001/AC-001 and truthful-status AC-002. Read [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md), [api-e2e-test-case-ledger.md](api-e2e-test-case-ledger.md), [api-e2e-revision-record.md](api-e2e-revision-record.md) and relevant runtime evidence.
- Cumulative supplements retained: restart-resume-analysis.md, team-backend-abstraction-analysis.md, status-implementation-comparison.md, bootstrap-handoff.md, solution-handoff.md, validation/README.md. SR-008 neither changes approved intent nor certifies runtime equivalence.
- Source e8db80a9c; tested HEAD b4b8f042f06ffbd9e6e4dbfa09c684d7149103ca; base72dee5ad2c2e332272a0c00eb36af1a036bd69fb. Current production remains unchanged; incoming API tests/fixtures/evidence and Designer notes remain local and untouched. Delivery revision: N/A.
- Skill: focused failure-origin review, not full structural/size audit or successful API/E2E test review. No production or durable-test fix by reviewer.

## Supported Scenario / Forward Production Path
**SCN-001 / BEH-001, BEH-003 / DS-002, DS-005**, with REQ-002 truthful lifecycle: user has sent legitimate work to an Org-mounted member, keeps its conversation open, restarts server, then continues the retained conversation. This is explicitly approved normal operation, not a contrived concurrency, file mutation or generic network-failure premise.

1. Previously focused `/team/worker` has real conversation and Idle runtime status.
2. Test-owned server restarts with the same data/port; no active roots/providers exist in new process.
3. Existing Org WebSocket closes → `AgentOrgStreamingService.ts:104–120` retains context and enters `reopen_required` → bounded transparent recovery.
4. `attemptTransparentRecovery` (385–401) calls `reopenOwned` (123–138) whenever a retained context exists. `reopenOwned` requires `fetchCheckpoint` **before** opening another socket or staging a candidate.
5. `fetchCheckpoint` (429–445) calls `getAgentOrgExecutionCheckpoint`; server `api/graphql/types/agent-org-run.ts:107–113` uses `getActive` and rejects inactive retained roots. That is a legitimate checkpoint contract, but the recovery caller incorrectly requires it for ordinary inactive-root recovery.
6. All bounded recovery attempts fail; `scheduleTransparentRecovery` (369–377) reports error. No new snapshot publication or `onInactive` callback occurs. `AgentOrgExecutionContext.requireReopen` leaves the member's last `currentStatus` unchanged.
7. Separately, `runHistoryLoadActions.ts:143–147,172–183` refreshes Org history rows without reconciling retained Org member contexts. `agentOrgHistoryRows.ts:48–72` uses historical/Offline values when context is not live. Thus rows are Offline while `TeamWorkspaceSurface.vue:15–18` still renders retained `target.context.state.currentStatus` as Idle.
8. Refocus invokes current read-only inspection through `agentOrgContextsStore.openForInspection/readInspection` and `getAgentOrgRunInspection` (server resolver78–80), replacing/adopting a correctly hydrated inactive context without provider startup. This explains observed focus-only recovery.

The Org WebSocket itself is also active-only (`services/agent-streaming/agent-org-stream-handler.ts:42–48`). Merely skipping the checkpoint and opening another socket would not admit a historical snapshot. Existing read-only inspection is the applicable current capability; no automatic runtime restore is necessary or authorized merely to update status.

## Evidence / Exact Failure Execution
- API-owned command: `node tickets/in-progress/flat-agent-organization-model-follow-up/validation/runtime-probe/server.mjs`; frontend `BACKEND_NODE_BASE_URL=http://127.0.0.1:50244 pnpm -C autobyteus-web exec nuxt dev --host 127.0.0.1 --port 50381`.
- Keep actual mounted-worker conversation focused after reply/Idle, restart owned server on same data/port, wait for status; then select direct and worker without Send/reload. Two independent retained-tab restarts: PID26991→35181 and35181→43597.
- Expected: after authoritative inactive observation, same-leaf header Offline with retained conversation/identity; no need for manual refocus and no provider startup to obtain status.
- Observed: header Idle/sidebar Offline and backend active/pending/events empty. Stable DOM additionally contains **“Live updates could not recover automatically…”**, so this is failed recovery, not merely a missed render tick.
- `validation/runtime-probe/server-cycle-2.log:122,124` and `server-cycle-3.log:119,124` independently record GraphQL `getAgentOrgExecutionCheckpoint` errors: active Org not found, for exact retained Org ID. These logs materially identify the failed boundary beyond the initial UI hypothesis.
- DOM: org-after-restart-before-input-dom.txt, org-second-before-restart-dom.txt, org-second-after-restart-dom.txt, org-second-after-restart-stable-dom.txt (worker selected52; Idle63; recovery alert65), org-second-refocus-dom.txt (Offline62).
- Screenshot `org-second-after-restart.png` independently inspected by reviewer: selected worker, gray row, green Idle header. Telemetry `second-after-restart-telemetry.json` and `refocus-zero-telemetry.json`: PID43597, empty registry/candidate/event arrays before/after refocus.
- API telemetry/server helpers inspected: real methods are wrapped for observation, not replaced with fake responses; controls restart only owned processes. No evidence that instrumentation causes the active-root query precondition failure.

## Focused Diagnostic Checks (Not Product Fixes)
Reviewer executed two temporary probes against unchanged current source:
1. `pnpm -C autobyteus-web test:nuxt tests/crr002-status-probe.spec.ts --run`: **2 passed**. Actual Org context/store + mounted Team surface/status display, with transport/query fixtures: both inactive event and historical candidate adoption update the existing header to Offline and preserve AgentContext identity. Rejects the proposed missing-setter/simple stale-proxy explanation at this boundary.
2. `pnpm -C autobyteus-web test:nuxt tests/crr002-recovery-probe.spec.ts --run`: **1 passed, reproducing the defect**, not acceptance. Real OrgStreamingService and real context; socket/clock/GraphQL boundary controlled to reproduce the already-recorded production rejection. Result: 5 checkpoint attempts, 1 original socket, 1 original publication, **0 inactive callbacks**, phase reopen_required, member status Idle, error active Org not found.

Probe sources/logs retained under `validation/crr002-{status,recovery}-probe.spec.ts` and matching `.log`; temporary copies removed from web/tests. To rerun, copy each source to its original web/tests filename then execute the corresponding command and remove that copy. These are diagnostic artifacts, not durable regression coverage; no live server restart by reviewer. Existing API 348 server/39 frontend passes remain supplied evidence, not rerun here. Strict global typecheck limitations remain unchanged.

## Candidate Finding And Mechanism Gate
| ID | Observation / Scenario And Independent Trigger | Forward Path / Consequence | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| CR-C08 / F-001 | Ordinary approved kept-open restart leaves an inactive retained Org, but recovery demands active-only checkpoint | Socket close → mandatory checkpoint rejection → no inactive publication → stale focused status and disabled continuation until inspection/refocus | Two real server logs/DOM/telemetry, source trace, recovery diagnostic | **Promote**, implementation Local Fix |
| CR-C09 | Suspected missing Offline setter / broken mounted-header reactive update | setActive(false) already cleans all member statuses; controlled delivery updates same retained header | Existing cleanup, two status propagation probes | **Reject as origin**; do not add redundant setters/remount keys |
| CR-C10 | Blame new eager activation or reviewed backend delta | Actual registry empty at failure; implicated frontend/recovery/server-query files byte-identical to base | git diff --quiet base→tested HEAD exits0; runtime telemetry | **Reject attribution**; do not alter lazy provider readiness |

ARCH-PM-001/002 (binding continuity/durability) unchanged and not implicated. No new behavior ID or design requirement introduced. Missing native/task/uncertainty executions are coverage obligations, not additional inferred product defects.

## Original Personal Comparison — User-Requested Insight
Read-only reference `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793` (the package's pinned original-personal comparison), not a fetched current tip or runtime rerun.
- Original `autobyteus-web/stores/runHistoryLoadActions.ts:131+`, especially194–209, reconciles retained Team contexts against authoritative active-Team history: absent active root → root inactive → every member cleanup (preserving existing Error where intended). This works through the existing Team view even for nested membership.
- That same Team reconciliation remains in current source at277–293. Org history publication at143–147/182 updates its own rows but has no equivalent retained Org-context reconciliation. This is a useful parity insight, not a mandate to copy Team internals into Org callers.
- Original Team `hydrateTeamRunContextForStreamRecovery` also requires live checkpoints (319–335). Therefore the older checkpoint routine by itself is **not** a drop-in solution for inactive-root recovery. The useful principle is separate authoritative liveness reconciliation/read-only inspection from live-stream checkpoint recovery.
- No evidence that flattening/naming caused F-001, and no nested-Team refactor needed. Preserve Org-owned context publication, exact identities, drafts and activity-generation guards rather than bypassing them.

## Finding F-001 / Classification / Proportionate Correction
**Local Fix — Implementation Engineer.** Existing Org frontend recovery/reconciliation fails a supported inactive lifecycle; existing context and read-only inspection boundaries already support the intended outcome. No product decision, new schema or architectural owner is required.

Correct the existing owner path so a verified retained inactive Org can publish truthful Offline contexts/continuable history without an active-only checkpoint, implicit provider startup, manual refocus or reload. Preserve active-stream checkpoint safety, pending-submission ownership, exact identities/history/drafts, and distinction between confirmed inactive and an unreachable/unknown server. Do not treat arbitrary transport/query failure as proof all members are Offline or parse error text as a new persistence contract. Implementation owner chooses the bounded change using existing capabilities; any genuinely new boundary/behavior need returns to Solution Designer.

Add durable coverage through the real retained-context/recovery boundary (not a status setter alone), and rerun F-001 in kept-open browser first. Then complete API B02–B04. Implementation-owned correction requires source review and API/E2E again; successful API test review is still outstanding.

## Failure Origin / Prior Review Gap / Affected Score
- Origin: **pre-existing implementation defect**, reachable by this ticket's approved scenario. Not an implementation change after review; no implicated production-source delta between base72dee5ad and tested b4b8f042f.
- Earlier review gap: **Yes, narrowly**. CRR-001 confirmed DS-005 projections but did not trace automatic retained-context reconnect far enough to compare mandatory checkpoint admission with the inactive-root resolver/stream preconditions and separate history reconciliation. That contradiction was source-detectable. The browser made it conclusive; it is not an unknowable runtime-only defect.
- Update only affected category: **Runtime Correctness And Behavioral Fidelity, 10.0→8.0**, rationale CR-C08/F-001: approved restart lifecycle can retain false Idle status and remain recovery-blocked. Restore clean score only after source correction and relevant evidence. No fresh full scorecard/overall average or unrelated structural deduction in this focused round; unaffected CRR-001 checks remain historical supporting evidence.
- API test fixture corrections do not explain F-001; no successful-test review performed. No defect inferred for interrupted standalone peer test or incomplete native/task/fault cases.

## Residual Risks / Routing
Cumulative authority and all API evidence retained. No user server/conversation, generated API outputs, other-owner docs, tests or fixture package altered. No release/reset/merge/push. Future Delivery target remains `origin/requirements/flat-agent-organization-model`, not personal.

After report/CRR-002 persistence, select current implementation-defect failure-origin rule and deliver full package to its exact Implementation Engineer recipient only. Routing confirmation is recorded in CRR-002. API-REV-001 remains failed and unfinished critical validation must resume after correction.
