# Requirements — Remove false desktop startup timeout

Package MIGRATION-STARTUP-20260915-001. **Approved**, SR-010, 2026-09-15. Existing package/worktree identity retained; current scope narrowed to timeout only, not a new migration ticket.

## Approval and scope authority
User approved the timeout-first proposal: “Okay, thanks. I think the requirement is quite clear. Now you can, yeah, go ahead.” User then explicitly narrowed the current ticket: “migration scanning and local data repair will maybe further tickets after the current ticket, the timeout ticket is fixed.” This latest instruction supersedes SR009's same-ticket M2 plan. No further approval question pending. No additional tickets, repairs, scheduling, release or Git finalization authorized by this instruction.

## Problem / evidence
Electron currently stops waiting and declares startup failed after100seconds. In the observed normal-profile attempt, that happened before migration returned its per-item warnings and before the backend started listening. The backend was not killed and did start later, but Electron had terminally settled its startup generation. Canonical investigation INV003/008/009 contains exact code/log evidence; source-level findings and structural data probes are not a successful UI validation under the proposed fix.

## Supported scenarios
- SCN-003 / Supported Normal Scenario: user launches desktop; startup includes a legitimate migration taking longer than100seconds; user waits; the same backend eventually becomes healthy; desktop transitions from loading to usable application without restart or reset.
- SCN-003-F / Supported Explicit Edge Scenario: actual environment/spawn/platform-fatal/process failure occurs during the pending startup. The desktop promptly shows the genuine error instead of waiting forever or falsely becoming ready.
- SCN-003-S / Supported Normal Scenario: user deliberately closes the app while startup is pending. Existing shutdown remains effective and startup observers do not leak or mutate a later attempt.

## Active requirements and acceptance criteria
**REQ-003 / BEH-003 — startup waiting and true failure detection.** Remove elapsed100seconds alone as a terminal startup failure. Keep observing the current backend until authoritative readiness, genuine failure or deliberate shutdown. Display truthful pending/delayed-start information and existing diagnostics; do not assert migration progress or percentage without evidence. No replacement fixed completion deadline, automatic restart, duplicate child or data reset. Preserve real backend safety gates and genuine setup/fatal/process error reporting.

**REQ-004 / preserved safety subset — no data or backend migration changes.** This ticket changes desktop startup lifecycle/presentation only. Do not change migration ID, scanner/cohort, definitions, history readiness, conversion, ledger statuses or existing local data. Isolated validation must not replay user-profile migration or claim normal launches are read-only. Existing short HTTP-request, port-release and explicit shutdown timeouts serve different purposes and remain unchanged.

**AC-003 — acceptance.**
1. Startup stays pending beyond100seconds with an informational delay message; no timeout ERROR, backend kill, extra child or automatic migration retry.
2. Matching current child/generation health success later causes exactly one RUNNING transition and normal desktop access. No refocus/reload/restart needed.
3. Actual structured fatal, spawn/environment failure and process exit before health still settle promptly as error, once; stale later health/output cannot revive that attempt.
4. Existing stop/quit disposes pending polling/listeners/timers safely; repeated pending start requests do not launch duplicate children.
5. Initial loading and restarting render the pending message without error/recovery UI; ready/error/new attempt clear stale messages. No misleading “migration is progressing” or numerical percentage.
6. Validate durable lifecycle/bridge/store/render coverage and an actual isolated window-first desktop startup held beyond100seconds then allowed to become healthy. Browser-only or E2E profile opening its window only after readiness is insufficient for delayed-overlay acceptance. Distinguish controlled startup delay from a real large-data performance test.

**AC-004 — safety subset.** No source/data changes outside timeout/presentation and directly relevant checks/docs. Preserve migration per-item warning versus essential-fatal distinction. No real-profile reset, manual ledger edit, history deletion, forced replay, rollback or migration compatibility mechanism.

## Explicit exclusions / deferred work
REQ-001/002/005, BEH-001/002/005, SCN-001/002/004 and AC-001/002/005 are **deferred out of this ticket**. Their historical investigation is retained only as context. They concern migration candidate scanning, missing-tree disposition/full diagnostics, separate startup-wide history validation and per-access attachment policy. No implementation-ready design for those changes is included here. Their later tickets may be proposed after this timeout ticket is fixed, but are not bootstrapped or scheduled now.
Local test-data repair is likewise deferred; the read-only finding519valid flatTeam/14valid Org structural packages/8missing-tree directories is not a repair authorization or complete data-integrity certification. Do not add special feature-output recovery logic to the migration.

## Workspace / delivery
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery
Branch: codex/migration-startup-scope-recovery.
Pinned bootstrap base: origin/requirements/flat-agent-organization-model at3f853c7626851cb5d89178965534401e9e4aa5e4. Eventual target same unreleased feature base, NOT personal. Existing descriptive branch/path retained for continuity despite scope narrowing.
Design: /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/design-spec.md (DS-001, timeout only). No implementation or tests executed by Designer; specialist review/implementation/validation/delivery remain required according to routing. Finalization requires its own applicable user gate.
