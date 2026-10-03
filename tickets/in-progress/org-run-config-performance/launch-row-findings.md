> **SR-010 status update:** the cumulative SR-006 scope is now explicitly approved; architecture is ready for independent review at [design-spec.md](design-spec.md). This document remains factual pre-change evidence. Historical approval-pending/undecided-design prose below does not govern current intent or readiness. No changed-source performance result is claimed.

# Post-Run Agent Org / New-Row Performance Findings

## Answer / Scope
The user correctly distinguished two intervals: runtime/model options inside configuration, and **after a ready Codex/GPT-6.1 Sol configuration, Run Agent Org → newly created history row**. The initial 0.6s sample was workspace readiness, not row readiness; it did not settle the second symptom.

The additional experiment now measures the second interval in the **installed packaged desktop renderer and backend, both 1.4.93**, on a test-owned local node. It verifies history-volume amplification independently of runtime discovery. This is baseline investigation, not an implemented fix or changed-source validation.

## Setup / Safety
- Instance `iso-54639-13b7`, CDP 54639/backend 54640; normal isolated launch profile, private data/workspace. Exact receipt in evidence.
- Copy of local agent package imported through public API, then normal Org Library/config UI. Fixture files hash-pinned in `launch-row-fixture-manifest.json`; source working tree dirty and untouched.
- AutoByteus Org:3 Teams/10 Agents. Exact `codex_app_server` / `gpt-6.1-sol`; global inherited configuration, no explicit overrides, no inference/turn submitted. All configuration/readiness completed BEFORE measured Run click.
- Normal UI/DOM controls through repository packaged-test Playwright/CDP boundary. Passive click/DOM/long-task capture; exact created run ID checked against newly visible row. Screenshots verify the selected new row and recipient-free workspace.
- Synthetic public-API idle creates supplied larger history. Normal termination retained stored histories. 500 is a stress fixture, **not the user's confirmed run count or an approved capacity promise**. Population ended before UI timing. Final 524 test-owned roots; no active model workload.
- Small-history5 warm+5 cold-renderer samples; ~100 history5 warm + 1 cold and stored1005 warm + 1 cold; ~500 stored5 warm+5 cold, repeated with metadata-only observation5 warm+5 cold. Cold means renderer reload/warm server, not OS/backend cold start.

## Primary Measurements
Actual captured click → DOM/layout-visible exact new row, not automation/controller round trip or compositor paint. Request interval and workspace readiness are measured separately.

| Fixture / series | Samples | Backend creation median | New-row median / range | Workspace median |
| --- | --- | --- | --- | --- |
| Small history, warm |5|358ms|370ms /361–434ms|381ms|
| Small history, cold renderer |5|458ms|468ms /388–531ms|486ms|
| ~100 idle roots, warm |5|503ms|553ms /546–650ms|590ms|
| ~100 stored roots, warm |5|509ms|574ms /570–602ms|612ms|
| ~500 stored roots, warm, metadata-only observer |5|1256ms|1766ms /1724–1991ms|1361ms|
| ~500 stored roots, cold renderer, metadata-only observer |5|1055ms|1735ms /1689–2047ms|1121ms|

Earlier full-response stress observer also reproduced 1.76–2.28s rows; it is retained with overhead caveats, not substituted for the primary lighter-observer series. No page/console errors in the completed UI series. Exact per-sample timings/request metadata in `launch-row-timing-summary.json` and raw phase files.

## F-005 — Backend History-Amplified Creation
Actual owned backend was separately instrumented with timing-only method hooks through its own Node inspector. No installed/source files edited; hooks restored. Three API requests used the same successful UI launch input; instrumented timings are **not primary UI performance samples**.

At500existing Org histories, one new AutoByteus Org allocates10 Agent IDs. Collision checks reread **5000 stored Org execution trees** (500×10), before returning the new Org ID. Subsequent traces read5010/5020 as history increased. This is measured call count, not only a static complexity hypothesis.

High-level critical stages, three traces:
- Org planner/build including identity allocation: **602–1592ms**.
- Global current-package admission scan: **158–191ms**, rereading 501–503Org trees plus required messages/manifests.
- Selected-model validation: **116–123ms**, one shared Codex catalog for configured scopes, not 10 independent inference calls.
- Definition admission:178–382ms; recorded without claiming every cost inside this stage has been partitioned.

API totals 1.32–2.14s in these instrumented traces. Child timings overlap: the 5000 read durations cannot be summed as exclusive elapsed wall time.

Verified production path:
`createAgentOrgRun` → `AgentOrgRunService.create` → fresh definition/admission/workspace/config resolution → `validateMany` → `AgentOrgRunPlanner.build` →10 `AgentRunIdentityAllocator.allocateForAgentDefinition` → compound collision locations → `AgentOrgExecutionTreeLocationService.containsRunId` loops every admitted stored Org tree. Manager materialization then `admitCurrent` → full `RootRunPackageCurrentValidator.scan`, followed by history record.

Exact source owners: `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts`, `agent-org-run-planner.ts`, `agent-org-execution-tree-location-service.ts`; `src/agent-execution/services/agent-run-identity-allocator.ts`; `src/agent-execution/runtime/general-process-run-supervisor.ts` wires stored Org collision locations; `src/run-history/services/root-run-package-readiness-index.ts` and `root-run-package-current-validator.ts`. Actual installed compiled method/file pins retained.

## F-006 — History Payload / Renderer Publication Amplification
After creation, history refresh transfers full Org execution trees for the collection, not just the new row. Around500 roots each response is **~10MB**; multiple refreshes occur during a single launch/activation, sometimes with a periodic refresh already in flight. Workspace can be ready before the row: primary stress medians show an additional ~0.4–0.6s until the new row is visible.

A separately profiled stress launch identified the history navigation equality path as a renderer hotspot. `runHistoryNavigationProjection.ts:retainEqualNodes` calls **JSON.stringify on both entire old/new workspace nodes**, which contain full Org history trees. Actual compiled callback at `workspace.BtwlJi55.js` line727/column28606 has 136 self sample hits in the one 1ms-interval CPU profile. This is evidence of costly full-subtree equality, **not 136ms guaranteed exclusive cost**. The profile excerpt maps the same expression to current source. Stress captures also show 150–260ms-class main-thread long tasks.

Source owners: `autobyteus-web/stores/runHistoryNavigationProjection.ts`, `runHistoryNavigationStoreActions.ts`, `runHistoryLoadActions.ts`, `runHistoryStoreSupport.ts`, `src`-relative backend `run-history/services/collaboration-root-history-service.ts`; launch starts `refreshTreeQuietly` in `AgentOrgRunConfigPanel.vue`. Request-generation guards preserve freshness; they must not be removed merely to publish stale rows sooner. Individual causes of every overlapping refresh were not all traced; count/payload and the equality hotspot are established.

## What This Does / Does Not Establish
- Confirms **two distinct delay categories**: configuration discovery, and post-Run creation/history scaling. The second is not explained by the first.
- Establishes actual backend repeated-history reads and a packaged renderer history-projection hotspot; small-history launch can still be sub-second.
- Does not prove the user's exact local workload has 500 roots, the same stored message size, or no competing active agents. Long transcripts/background streaming remain untested. Do not claim the entire live symptom reproduced/fixed.
- Proposed intended improvement is in canonical requirements, not a selected target design. Identity uniqueness, fresh required definitions/model/schema/workspace checks, structural admission, history freshness and recipient semantics must remain intact.

## Cleanup / Evidence
Hooks restored, profiler/control clients disconnected, exact isolated app gracefully stopped (`forced:false`), private root/copy removed, control/backend/debugger ports 54639/54640/9229 released. User app/data/runs untouched. `launch-row-cleanup-receipt.json` confirms cleanup; no production change/release/inference.

Canonical evidence: `launch-row-timing-summary.json`; raw `launch-row-small-history.json`, `launch-row-history-100.json`, `launch-row-stored-history-100.json`, `launch-row-stored-history-500.json`, `launch-row-stored-history-500-light.json`; passive/probe scripts and screenshots; population/fixture-stop receipts; `launch-row-backend-trace.json` plus hook/install/ownership artifacts; renderer CPU profile/summary/hotspot excerpt; installed-source/fixture content pins; isolated start/stop/log/cleanup; `launch-row-caveats.md`. All relative to this package's `evidence/`.

## SR-004 — Why Collision Checks Read Execution Trees (Evidence-Only)
The user asks why the measured 5000 reads happen and suspects over-engineering on both sides. This asks for explanation, not explicit approval; SR-003 intended requirements remain unchanged and unapproved. No new UI samples, source change, design or instance launch in this clarification.

Verified code mechanism:
1. The allocator generates an Agent run ID using a normalized definition name plus a Node crypto randomUUID token (agent-run-id.ts:22–32). The 5000 reads do not mean 5000 actual ID collisions occurred.
2. For each candidate it reserves the ID locally and checks active standalone runs, standalone metadata/path, then collaboration membership (agent-run-identity-allocator.ts:64–112).
3. Org member identities are nested inside execution trees; the Org membership implementation answers containsRunId by iterating every admitted Org root, reading its tree and constructing AgentOrgExecutionIndex to look for the candidate Agent/Team ID (location-service.ts:91–102). The process supervisor injects a stored-only Org service into this allocator.
4. Each stored read opens the tree JSON, parses and validates the full payload (tree-store.ts:19–27). No sharing across the 10 candidate checks was observed in this path. Therefore 10 new IDs × 500 existing Org trees = 5000 stored-tree reads, even when all candidates are unused. This is not model inference or 5000 model calls.

Purpose versus cost: the safety purpose is to avoid reusing an identity already present in any active/stored collaboration. Tree data contains child IDs not answered by the standalone run-path check. Reusing a general execution-location lookup makes that small yes/no membership question depend on full historical structure. That is an evidence-backed inefficient hot-path coupling; the original author's reasoning/history was not established. Random UUID generation makes accidental collisions extremely unlikely, but this alone is not authorization to remove identity/data-integrity guarantees.

Frontend purpose versus cost: history includes full Org trees to represent expandable hierarchical members. retainEqualNodes serializes both prior/new nodes to decide whether it can reuse old object references; this can avoid reactive churn for unchanged data but itself walks the full subtree. Actual CPU evidence in F-006 establishes the cost under the stress fixture. Correct hierarchy, fresh updates and reference reuse are useful goals; repeated full snapshots/full equality comparisons are not inherently required by those goals. Specific simplification choices remain for architecture after approval, rather than selecting another cache/index layer here.

Scope judgment: the measured paths do too much repeated work for creating one Org/publishing one row. This supports targeted simplification; it does not establish that the entire application is over-engineered. Exact live-user workload remains unknown. Source/hash references: evidence/collision-check-explanation-source.json. User reference: evidence/user-collision-check-question.json.

## SR-005 — Fresh Creation Does Not Require Old Execution State
The user asks whether starting a fresh Org intrinsically needs old execution trees, rather than asking how the loop works, then says continue. For the measured 5000 member-identity collision reads, the purpose is solely the allocator's global ID-reuse check; old trees supply stored child IDs. The fresh launch plan resolves its new topology/configuration from current definitions and selected configuration, not prior Org execution state (agent-org-run-planner.ts:30–84). The per-member allocator calls the general collaboration membership lookup and thereby scans all admitted old Org trees. Thus this scanning is a consequence of the current ID-membership implementation, not a fundamental dependency on earlier Org state. Identity uniqueness remains a preserved requirement; full historical tree loading per new member is not inherent to that requirement. This explanation does not assert that all other admission/history-validation scans have the same purpose or can be removed. It is not approval to remove collision or structural safety guarantees, and it selects no architecture alternative.
Read-only code references: existing evidence/collision-check-explanation-source.json plus AgentOrgRunPlanner.build/resolveConfiguration source inspected in this round. No new timings or production changes. User evidence: evidence/user-new-org-scan-necessity.json. Requirements baseline SR-003 remains unchanged and unapproved, Ready for Approval; SR-005 is evidence-only.

## SR-006 — UUID Generation / Proposed No-History-Scan Fresh Creation
User challenges whether checking prior executions is justified when fresh IDs use UUIDs (spoken "YoYo ID", interpreted as UUID). Source confirms createUuidIdentityToken uses node:crypto.randomUUID, removes dashes, then adds a normalized definition-name prefix. AgentRunIdentityAllocator defaults to that token source. The historical lookup is an extra explicit negative-membership check, not required to generate UUIDs or construct a fresh Org. UUID uniqueness is probabilistic, not mathematical impossibility; no demonstrated product need in this investigation justifies full saved-tree lookup for every fresh candidate. "Preserve identity safety" must not be read as "preserve the current exhaustive historical collision check."

Impact: requirement refinement, not approved implementation. REQ-006/AC-006 now propose no saved-Org execution-tree reads for collision checking during normal fresh UUID-based Org member allocation, rather than merely reducing M×N repetition. Preserve fresh identity generation, configuration/definition/workspace/schema/structural admission, data continuity and authoritative history. This is not blanket removal of admission checks, nor a claim about user-supplied/imported/resumed identity policies, which have not been designed or changed. No target cache/index/alternative architecture selected. Existing user evidence does not approve the cumulative runtime/frontend/backend package; requirements are Ready for Approval at SR-006, with explicit approval pending.

No new timing or production change. Source evidence is existing collision-check-explanation-source.json; new user supplement is evidence/user-uuid-scan-objection.json. All are factual/non-normative; canonical requirements carry the proposed behavior. The source-generator feasibility fact should not be conflated with the rationale for all existing checks.
