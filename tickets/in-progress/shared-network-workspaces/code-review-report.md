# Code Review Report

## Latest Authoritative Result / Review Round Meta

**CRR-009 — Pass, implementation SOURCE review only; 10.0/10 (100/100).**
**CR-005 is resolved at the SR021 design/source boundary. API-F003 remains OPEN
until independent current-build ordinary-reboot validation. API003 remains
Fail /57.14% / broader Required; this report does not replace that authority.**

- Date2026-10-15; task `shared-network-workspaces` /
  `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
- Entry **Implementation Review**, round9, **Full Re-Audit**. Prior canonical
  **CRR008 Fail / Design Impact CR005 P1** reviewed first. The new post-host
  selected-client spine, shared Snapshot lifecycle fields and persisted attempt
  subject require the full structural checklist and scorecard, not a two-file
  local-fix review. This audit covers the relevant implementation architecture,
  new delta and affected dependencies, not every repository file or full runtime matrix.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`,
  branch `codex/shared-network-workspaces`, finalization `origin/personal`.
  Input/handoff `ec3bf6b270ef8d038f309b0fad1f599566d1b233`;
  source `d318bd9db935affdf16d141ef4e88a6c0e4939b5`;
  implementation base `50d9c9d0c883e1ad8d3a1808b9e980a7df4f132b`.
- Authorities: [Approved SR018 requirements](requirements-doc.md),
  [approval018](approval-record-sr018.md), [scope feedback](architecture-review-scope-feedback.md),
  [Ready SR021 design](design-spec.md), [investigation](investigation-notes.md),
  [solution history](solution-revision-record.md), [solution handoff](solution-design-handoff.md),
  [ARCH-REV005 Pass](design-review-report.md),
  [architecture history](architecture-review-revision-record.md),
  [SR021 lifecycle investigation](evidence/design-recovery/sr021/lifecycle-investigation.md),
  [IR007 handoff](implementation-handoff.md), [implementation history](implementation-revision-record.md).
  Complete739-reference incoming chain retained. Earlier evidence/approvals are
  historical at their stated scope, not reapproved or relabelled here.
- Trigger: IR007 implemented reviewed CR005 recovery. Relevant API authority:
  [API003 report](api-e2e-execution-coverage-report.md),
  [investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md),
  [API history](api-e2e-revision-record.md) and original failure/reboot receipts.
  [CRR001–009 history](code-review-revision-record.md) preserves all prior results.
  DR **N/A — not performed**. Successful API test-code review **not triggered**;
  cumulative af9f23 REST tests await a passed API package, not reviewed as successful here.
- Personal review/check execution only, no delegation/spawning or production/test fixes.

## Routing Classification Review

**Large / High / Reviewed**, independent source review required. Cumulative
privileged multi-platform service/runtime scope and preservation risks support
this classification. SR021's bounded lifecycle/persistence delta is Medium/High
in isolation;739 references do not determine size. No classification correction.

## Review Scope And Prior Findings

Reviewed all15 IR007 paths and full affected forward lifecycle: CLI consent and
service entry, admin lock/supervisor, setup configuration/engine/host proof,
selected discovery/reference/daemon, Docker Snapshot/volume/probe/receipt/start/
API verification, Store atomic persistence, status, detach and launcher guidance.
Rechecked unchanged DS001–005 boundaries/source identities against prior source
review and current design. Full audit means renewed structural reasoning, not
re-running unchanged web/server/physical suites or reopening approved business scope.

| Finding | Verified disposition | Evidence |
| --- | --- | --- |
| CR-005 / CAND009 / API-F003 | **Resolved at design/source boundary; independent API-F003 still OPEN** | SR021/ARCH005 supplies missing owner; current locked Reconnect completes only eligible selected pre-process failure after host + fresh daemon proof, consumes attempt before same-ID Start and verifies actual API/current state. Source trace, all affected tests, mutation controls; no fresh reboot claimed |
| CR-003 / API-F002 | **API003 independent fresh native-Ubuntu public scope resolution retained** | Original non-preinstalled default-kernel create16.778s/reconnect0.508/0.605s, source/modes/UUID evidence unchanged; engine pair unchanged |
| CR-004 | **Source/contract resolution retained** | IR006/CRR007 actual workflow gates unchanged; current Python workflow regression passes, no hosted execution |
| CR-002 / API-F001 | **Earlier native-Mac cold-create scope retained** | API002 independent receipts and unchanged Apple fix; no fresh Mac create in this round |
| CR-001 | **Restrictive-mode fix retained** | Source unchanged, fresh Go parent/real child mode fixture passes; no root installation here |
| FUP001 | **PM-owned out-of-scope custody retained** | Historical current-source Nuxt/Electron failures remain distinct from removed-candidate green; no duplicate task, patch, suppression or deduction |

## Upstream Behavior And Production-Path Basis Confirmation

Approved business intent and Scope Guardrail/Change Scope understood.
**Behavior basis Confirmed**, no contradicted/new behavior or material ambiguity.
Architecture MP006–008 and SR021 Stop observability decision were checked against
actual source and captured public fields, not inferred from the new tests.

| Behavior | Status | Current implementation / preserved production evidence |
| --- | --- | --- |
| BEH001/004/005 | Confirmed at source boundary | DS001 first-use remains intact; DS006 ordinary OS/job -> lock -> host proof -> selected recovery -> real API/current state. Source/private/config/selection preservation; status separate from action |
| BEH002/003 | Confirmed, unchanged | DS002 direct OS NFS bytes; DS003 shared-run admission/private current-source profiles/native process owner unchanged. No data proxy/local fallback/source lease |
| BEH006 | Confirmed, unchanged | DS004 existing healthy explorer/REST/static/completed-artifact/PTY readers retained; no outage isolation or automatic-notification claim |
| BEH007 | Confirmed, unchanged | DS005 existing Guide/release availability owner; empty qualification keeps commands unavailable rather than inventing a release |

Detailed forward caller/state/evidence trace:
[source-trace.md](code-review-evidence/crr-009/source-trace.md).
Unchanged evidence remains scoped; source confirmation is not full acceptance-test proof.

## Supported Product Scenario And Reachability Gate

| Scenario / contract | Kind / initiator and coherent goal | Independent entry / lifecycle -> outcome | Evidence and validity | Review use |
| --- | --- | --- | --- | --- |
| SCN009/013; AC007/014/018/019; BEH001/004/005 | Operational: owner restarts a normally configured supported host and resumes the same workspace | Public selected create/connect -> ordinary OS reboot -> Docker pre-process NFS mount refusal -> later healthy storage/host -> owned selected completion restores same node/API | Approved SR018; API003 two ordinary boots, raw state/journals and same-object diagnostic repair; SR021 MP006. **Supported Normal Scenario / Reachable** | Use: CR005 resolution and bounded completion machinery |
| AC009/017; BEH005; MP007 | User: owner intentionally stops a successfully-running selected unless-stopped node | Existing launcher/Docker Stop -> successful-start error already cleared -> stopped observation -> no completion Start during tick/reconnect | Preservation requirements; versioned Moby start/stop contract and current eligibility; actual serial control remains API work. **Supported Normal Scenario / Reachable** | Use: preservation, no all-stopped restart rule |
| AC007/009/017; MP008 | Operational: owner inspects a pending failed start and disables automatic completion | Already-failed raw Stop is no-op; documented existing Docker update --restart=no -> current policy veto on tick and confirmed reconnect | SR021 separately investigated public control contract; launcher still forwards Stop only, truthful guidance and adapter policy checks. **Supported Explicit Edge Scenario / Reachable** | Use: truthful limitation, policy veto; no invented inspect flag/private intent ledger |
| SR021 DS006-L / approved bounded attempt and identity contract | Contract: setup owns exact selected start, Docker owns live state/config/process policy | Current ref/daemon/volume -> fresh isolated current-image proof -> reinspection -> atomic current attempt -> one immutable-ID Start -> actual API/binding/current state | ARCH005/SR021 state/identity/consent contract, existing Store/Probe/VerifyStarted, personal source and fixture checks. **Supported Explicit Edge Scenario / Reachable** | Use: persistence, authority and failure handling |
| SR021 / shared structural principles | Contract: preserve established owner boundaries/current-schema runtime | CLI -> SetupService -> Docker adapter; reused Store/platform/probe; new attempt is distinct bounded subject, not migration/desiredRunning | Current source/diff and declared ownership/removal/transition maps. **Supported Normal Scenario** | Use: structural and size checks |

### Candidate Finding And Mechanism Gate

| Candidate | Observation / mechanism | Independent basis / forward consequence | Evidence | Disposition / scope / response |
| --- | --- | --- | --- | --- |
| CAND009 (reused) | Previously missing normal-boot completion owner; now exact selected failed-start completion | SCN009/013 + MP006: normal reboot can fail the client mount before process creation; existing host-only recovery was insufficient | CRR008/API003 raw receipts; SR021/ARCH005; current DS006/DS006-L trace and tests | **Promote — this ticket**, mechanism proportionate; **CR005 resolved at source boundary**. Require independent public reboot proof next, not source-review claim of runtime closure |
| CAND009 preservation constraints | Current policy/state/identity guards and bounded write-ahead attempt | AC009/017, MP007/008 and SR021 state contract prevent starting intentional stopped/unselected nodes or repeated ambiguous same-incarnation starts | Exact current predicates, reused ownership checks, Store atomic0600, same-ID call, mutation controls and status/detach trace | **Promote — this ticket**, accepted necessary bounds, no new defect/deduction |
| Excluded premise (no new finding) | Race-free cancellation against artificially timed contradictory external Docker commands; recovery from arbitrary diagnostics or all stopped nodes | Exposed commands alone do not establish this concurrent workflow; SR021 explicitly does not promise it | Example9, approved ordinary serial controls and MP008 observability limit | **Reject — Technically Possible but Unsupported/Contrived**; no fencing/event framework/private veto/blanket retry or score deduction |

No candidate held for missing scenario authority. Actual reboot testing is a
known next validation stage, not a fabricated source premise or source Pass for
unexecuted behavior. Original reported failure remains in independent API authority.

## Structural / Design Checks

All mandatory checks renewed; evidence is [source trace](code-review-evidence/crr-009/source-trace.md),
[source/delta audit](code-review-evidence/crr-009/source-audit.json), SR021/ARCH005 and current code.
No required corrective action in any row.

| Check | Result | Evidence | Required action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | SR021 identifies real boot ownership gap; existing setup/Docker owners extended narrowly | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplement; current approved requirements and SR021/ARCH005 preserved | None |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS001–005 retained; full DS006 and bounded DS006-L traced through actual API/current state | None |
| Ownership boundary preservation and clarity | Pass | Setup sequences, Docker classifies/acts, Store persists, daemon keeps process policy | None |
| Off-spine concern clarity | Pass | Volume inspector/attempt representation serve Docker, no competing lifecycle owner | None |
| Existing capability/subsystem reuse check | Pass | Existing Probe, VerifyStarted, Store, admin lock and supervisor reused | None |
| Reusable owned structures check | Pass | One volume validator/options owner shared by EnsureVolume and recovery | None |
| Shared-structure/data-model tightness check | Pass | Actual Snapshot fields; six-field current attempt, no auth/config/READY/desiredRunning | None |
| Repeated coordination ownership check | Pass | One selected-set coordinator and one Docker observer reused for status/action | None |
| Empty indirection check | Pass | Each new file owns selection, observation, action or volume invariant; no pass-through layer | None |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Parsing remains CLI, orchestration setup, Docker protocol/state in adapter | None |
| Ownership-driven dependency check | Pass | No app/launcher-start/global daemon shortcut or new cycle | None |
| Authoritative Boundary Rule check | Pass | Callers use setup/Docker entrypoints; no caller duplicates or bypasses failed-start policy | None |
| File placement check | Pass | Concrete concerns reside under owning setup/docker packages | None |
| Flat-vs-over-split layout judgment | Pass | Four short substantive files fit existing package layout without new subsystem scaffolding | None |
| Interface/API/query/command/service-method boundary clarity | Pass | CompleteFailedStart current exact selected identity; retryConsumed only public consent; observation separate | None |
| Naming quality and naming-to-responsibility alignment check | Pass | Start observation/recovery/reconnect names describe real concern; no generic manager/helper | None |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Old EnsureVolume block moved into shared owned validator; no copied probe/atomic writer | None |
| Patch-on-patch complexity control | Pass | One accepted recovery path replaces host-only ending; no fallback ladder or broad retry | None |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | Old validator removed; Reconnect callers updated; new functions have production callers; no dormant old path identified | None |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Captured public error/state with explicit eligibility/preservation assertions; actual API verification invoked in fixture | None |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Cohesive HTTP harness, selected-set Unix fixture, scoped launcher fake; tests exempt from source thresholds | None |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Existing suites retained at active contracts; new mutation controls fail intended assertions, no version compatibility tests | None |
| API/E2E readiness for the next workflow stage | Pass | Current reproducible source/CLI metadata and exact engine inputs; original failure and two-boot/negative-control plan remain explicit | None |

## Source File Size And Structure Audit

Changed production only; tests/README excluded from thresholds. Effective
nonempty counts; base is origin/personal@f13bdd0…, prior is IR007 input50d9c9d….
No >500 file, no >220 added+removed delta. Each row passes SoC/placement;
no size-driven split or corrective classification warranted.

| Source (relative to repo) | Base branch | Prior | After | Added + removed | >500 / >220 | Ownership / placement |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `autobyteus-nfs/internal/cli/run.go` | 0 | 190 | 193 | 5 + 2 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/docker/attachment.go` | 0 | 106 | 87 | 0 + 19 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/docker/snapshot.go` | 0 | 213 | 214 | 3 + 2 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/docker/start_observation.go` | 0 | 0 | 117 | 127 + 0 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/docker/start_recovery.go` | 0 | 0 | 92 | 96 + 0 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/docker/volume.go` | 0 | 0 | 42 | 47 + 0 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/setup/lifecycle.go` | 0 | 143 | 152 | 12 + 3 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/setup/reconnect_nodes.go` | 0 | 0 | 65 | 68 + 0 | Pass / Pass | Pass — existing owning package |
| `autobyteus-nfs/internal/setup/status.go` | 0 | 91 | 70 | 17 + 38 | Pass / Pass | Pass — existing owning package |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | 266 | 266 | 267 | 2 + 1 | Pass / Pass | Pass — existing owning package |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No versioned old reader/dual writer |
| No legacy old-behavior retention in changed scope | Pass | No host-only completion bypass or old EnsureVolume duplicate |
| Dead code removed in touched files/modules | Pass | No obsolete implementation/test item identified; new APIs reached by service/status/detach |
| Approved persisted-data transition followed | Pass | Existing attachment/refs/source/receipts directly usable; attempt is a separate new bounded current subject |
| No version-specific dual reads/writes or old-shape fallback | Pass | Current parser ignores irrelevant fields normally; no legacy branch |
| Transition mechanics match reviewed design | Pass | No migration required; reuse atomic0600/root0700 Store, per-node failures, exact detach cleanup |

**Dead/obsolete/legacy items requiring removal: None identified.**

## Docs-Impact Verdict

**Yes.** README and actual launcher Stop output now distinguish ordinary running
Stop from already-failed no-op Stop, current policy=no veto and confirmed consumed
retry. No policy mutation, new mandatory setup step or invented release command.
Delivery still owns integrated docs/release/user-verification sync. Root DESIGN.md
and TESTING.md are unchanged. No closer NFS/scripts AGENTS.md was found; project
and shared guidance applied with no new conflict. FUP001 retains its existing
scope disposition rather than using baseline failure as a Pass.

## Additional Material Premise Validation

| Upstream premise | Current status | Evidence / limits |
| --- | --- | --- |
| MP006 | Confirmed | Independent ordinary-boot failure + current missing-owner correction traced; new actual reboot proof pending API |
| MP007 | Confirmed at contract/source boundary | Normal successful-running Stop has empty startup error; fixture rejects it; actual serial control remains mandatory |
| MP008 | Confirmed at contract/source boundary | Already-failed Stop no-op documented; current policy veto, no fictitious manuallyStopped field/private veto |
| MP001–004 | Unchanged at recorded dispositions | DEC015 outage deferral and independent source-update/private-profile boundaries untouched |
| MP005 | Prior scoped resolution retained | API003 fresh public native-Ubuntu no-preinstall proof, not broadened to all targets |

No additional new/reclassified premise beyond the scenario gate.

## Review Scorecard

**10.0/10;100/100**, simple average of ten categories. This is source-review
quality for the supported scope, not API coverage confidence or a release score.
No evidenced promoted deficiency warrants a deduction; unexecuted downstream
validation is listed explicitly rather than silently scored as proven.

| Priority | Category | Score | Why | Weakness / drag | Required improvement |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 10 | DS006 spans ordinary reboot through real readiness; local attempt spine explicit | None found | None |
| 2 | Ownership Clarity and Boundary Encapsulation | 10 | Setup/Docker/Store/daemon boundaries coherent; CR005 missing owner supplied | None found | None |
| 3 | API / Interface / Query / Command Clarity | 10 | Exact identities, consent retry and read-only status distinct | None found | None |
| 4 | Separation of Concerns and File Placement | 10 | Cohesive bounded selection/observation/action/volume files | None found | None |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 10 | Public Snapshot facts, single validator, minimal current attempt | None found | None |
| 6 | Naming Quality and Local Readability | 10 | Concrete function/result/reason names; qualification/consumption order visible | None found | None |
| 7 | API/E2E Readiness | 10 | Focused tests and exact input/build chain; original API failure and real next-case plan preserved | No source-readiness gap; actual API gate pending | Execute independent matrix, not a source change |
| 8 | Runtime Correctness And Behavioral Fidelity | 10 | Supported CAND009/MP006–008 paths/negative bounds align in source and local tests | No source defect evidenced; no hosted/reboot qualification asserted | API-F003 current public two-boot proof first |
| 9 | No Backward-Compatibility / No Legacy Retention | 10 | Current schema only, no migration/version fallback or old policy retained | None found | None |
| 10 | Cleanup Completeness | 10 | Duplicate volume block removed; exact attempt/probe ownership; reviewer scratch cleaned | None found | None |

## Checks, Provenance And Limits

Personal commands/raw outcomes, input hashes and cleanup are in
[checks-and-limits](code-review-evidence/crr-009/checks-and-limits.md),
[checks-result](code-review-evidence/crr-009/checks-result.json),
[source audit](code-review-evidence/crr-009/source-audit.json),
[attempts](code-review-evidence/crr-009/audit-attempts.json) and
[cleanup](code-review-evidence/crr-009/cleanup.json).

- Seven Go packages race/count1 pass;52 top-level enumerated,51 pass/1 standalone
  child-helper skip;100 direct subcases pass. Go vet passes.
  Four Python modules18 enumerated/17 pass/1 standalone Go-child skip; Go's real
  parent/child fixture executed. Bash syntax passes. Two reviewer mutation controls
  fail intended assertions (policy=no admission, missing write-ahead), not compilation.
- Source aggregate recomputed968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764;
  default publish refuses unqualified candidate as expected.739 references exist,
  all15 changed paths and1350 prior package paths match received hashes.
  Eleven retained IR005 files and four IR007 candidate files independently match.
- IR007 four-target compilation/seven mutations and actual CLI builds are inherited
  evidence, not relabelled reviewer executions. Retained arm64 CLI/metadata source
  hash51f81cd187caf269ecffa83fecc35a4f665b70942716d7858fa7d964d3b335ed with same engine
  pair; current candidate has no Docker image identity. API must bind actual owned
  current image. No engine rebuild required or performed. Empty qualification honest.
- Reviewer first attempt failed before tests on Python tarfile keyword support;
  second download was interrupted after observed IPv6 connection stall. Original
  runners/traces/cleanups retained. Final same official SHA-verified Go archive
  used request-local IPv4, no system network change. No product failure inferred.
- No real Docker daemon, VM, root installation, source mount, desktop/UI, provider,
  physical peer, public installer, hosted Actions/signing or release execution here.
  Synthetic daemon fixtures do not prove boot scheduling or normal real Stop behavior.
  No source/durable-test edits, global cache cleanup or unrelated resource mutation.

## Findings / Follow-ups / Classification

**No new or unresolved source finding. CR005 source correction accepted.**
Failure classification **N/A — source Pass**, not a reclassification of API003.
FUP001 remains with Project Task Manager under existing receipt; no new follow-up
or duplicate notification. D001/DEC015 remains deferred **NOT fixed**; IMP-D001
private current links/independent confirmed Source Update/Remove/unchanged AGY and
local behavior preserved. No pin/copy/refcount/retirement or outage framework.

## Residual Risks And Next Validation Gate

1. **API-F003 first:** current public selected setup and **two ordinary whole-host
   reboots without manual Start/reconnect**; actual API/mounted bytes, same immutable
   node/image/Config/HostConfig/ports/aliases/private volumes+bytes/source inode,
   device/UID/GID/mode/bytes/UUID. Preserve normal node restart and safe detach.
2. Real normal-running unless-stopped Stop, current policy=no on captured failed
   start, already-failed raw Stop no-op/guidance and unselected control. Do not
   count diagnostic manual Start as automatic recovery, infer all stopped nodes
   should start, or convert150s observation into a new SLA. Unknown error grammar
   fails closed; ambiguous consumed attempt requires confirmed reconnect.
3. Continue full remaining current-product matrix: both OSes/native+managedDocker
   clients, Linux native/Docker storage, independent peers/locks/Git/lifecycle/
   preservation; actual native tools/unread linked assets/peer close/restore/
   Standalone-Team-Org/completed-artifact and all healthy previews; independent
   physical Mac/Linux/Docker and explicit user verification. Only MacDocker
   **STORAGE** hosting is deferred, not clients; peer-NAT limit remains separate.
4. API003's scoped mounted HTTP/GraphQL/PTY/locks and isolated desktop Guide/HTML/
   image/text-refresh gains retained, not entire acceptance proof. Actual amd64
   engine/hosted workflow/signing/public bootstrap qualification still absent.
5. After successful API execution, separate proportional test-code review, then
   Delivery/docs/finalization and user/release-guide authorized release. No merge,
   push, release, TaskDone or user-verification claim in this review.

## Latest Authoritative Result / Routing

- Decision **Pass — CRR009 source only**; scenario and material-premise gates **Pass**.
- Prior CRR008 remains preserved history; CR005 resolved at design/source boundary.
- API003 **Fail57.14% / broader Required / API-F003 OPEN** remains independent authority.
- Recommended next owner: fresh configured implementation-review Pass rule's exact
  `/software_engineering_team/api_e2e_engineer`. Record rules/receipt in review evidence;
  notify only the single most-specific recipient under the current team contract.
  No informational duplicate, polling, delegation or premature Delivery forwarding.
