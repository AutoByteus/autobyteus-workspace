# Implementation Handoff — IR-002 startup recovery

## Result and authority
**Implementation Complete — ready for fresh independent source review.** Not a recovered-installation or release claim. Production v1.4.87 incident remains **OPEN**, and **API-REV-002 FAIL** remains current until fresh executable evidence supersedes it.

Package docker-image-http400-20260926 / team-attachment-exact-execution; rework date 2026-09-27. Current code and this handoff supersede IR-001's blanket-startup-gate policy. The old handoff is retained at /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/recovery-evidence/implementation-handoff-IR001-historical.md.

## Workspaces / finalization constraints
- Software: /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery; branch codex/team-attachment-startup-recovery; base a35060c58d923311de496e75aa3ea0209708d8b3; integration target personal.
- Companion authoritative workflows: /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-migration-workflow; branch codex/team-attachment-migration-workflow; base 1b1a75ee57271745424030e9289a699523ff34a6; target main.
- Both repositories must be reviewed and delivered. All changes uncommitted. No live data repair, installed-copy mutation, Docker changes, commit, push, tag, release or deployment by implementation. Upstream ticket reopening from done to in-progress is intentional evidence preservation; do not revert it. Generated SDK dist folders are build products, not authored source.

## Cumulative upstream package
Canonical package: /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution

- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/requirements-doc.md — R2 approved, including SR-005 availability clarification.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/design-spec.md — D2; /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/investigation-notes.md; /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/solution-revision-record.md — SR-001..005.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/solution-handoff.md — isolation, both repositories and finalization constraints.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/design-review-report.md and /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/architecture-review-revision-record.md — ARCH-REV-002 Pass, superseding ARCH-REV-001 blanket-gate acceptance.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/api-e2e-execution-coverage-report.md and /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/api-e2e-revision-record.md — API-REV-002 FAIL; INC-01/INC-02 reproduction, INC-03 diagnosis only.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/api-e2e-evidence/startup-incident/incident-report.md — retained installed evidence.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/recovery-evidence/availability-policy-clarification.md — SR-005; zero usable historical runs is not a startup failure.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/recovery-evidence/workflow-prevention.md — mandatory companion scope.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-revision-record.md — IR-001 retained; current IR-002.
- Historical CRR-001/002, API-REV-001 and DR-001..004 remain evidence, not recovery passes. Fresh CRR/API/DR for recovery: not yet performed. Product/UI supplement: N/A — no visual design change.

## Current implementation summary / boundaries
The R1 exact containing TeamRun + canonical AgentRun final contract, separate drafts, captured frontend identity and physical execution layout remain. IR-002 corrects startup/disposition/admission; it adds no old runtime reader.

1. Extracted strict current Team/Org structural validation into RootRunPackageCurrentValidator, including required sidecars and family conflicts. Standalone candidates require current metadata identity. Missing trees/incomplete packages are preserved and excluded, not guessed or deleted.
2. The same registered migration ID performs source-group typed-reference preflight and dependency closure before commits. Safe incomplete/unavailable dispositions yield SUCCEEDED_WITH_WARNINGS, even if no historical group is usable. Real read/commit/journal attempt failures yield FAILED, with independent groups continuing where provable. Diagnostics are counts plus <=5 examples per disposition.
3. Existing V1 manifest/hash/original files are reused. Source groups reconcile to released entries; excluded entries and original bytes are retained. Original/target commit retry remains atomic and hash-checked. Completed evidence is not rewritten for formatting; newer validated current writes are not restored over. An incomplete journal can mark complete only when every plan is committed or has an explicit preserved exclusion; this does not grant admission.
4. Runtime readiness separately rebuilds structural facts + current typed-reference/dependency validation at startup regardless of ledger label. It does not call filtered location services while constructing its snapshot. admitCurrent now validates before publishing, not blind-add. Runtime knows only current final locators; ordinary external URLs/local paths remain unchanged.
5. Lists, stored direct loads, exact async/sync file ownership and standalone projection/restore consume admission. New valid standalone metadata is published through the same authority. Deletion invalidates affected reference dependencies. Both entrypoints drop only the attachment-SUCCEEDED blanket guard; actual unrelated core schema/vault gates are unchanged.
6. Single Data Migration Guideline renamed/promoted by designer, then refined per the user's direct request with a detailed **critical anti-pattern** incident example: failure chain, source assumption, review/validation misses, user impact, forbidden remedies, all-excluded behavior and mandatory release evidence. Web/server operational docs no longer prescribe clean ledger success as startup admission. Companion skill mandates guideline/predecessor investigation.

## Classification and design health
**Medium / High / Reviewed retained.** Persistence, startup and cross-package admission risk remain High. Selected downstream route: independent **Code Review**, not direct API/E2E. Direct-route lightweight review: N/A. Implementation self-inspection does not replace independent review.
D2 ownership/policy root cause and focused refactor confirmed. Required >220-line readiness delta was split into structural classifier and bounded current reference validator; all changed production files <=500 effective non-empty lines (maximum 482). No new framework, migration version, DB, persisted denylist, parallel journal, address fallback, identity guessing, deletion/reset, completed-task revival or unrelated gate change.
SR-005 clarifies availability without changing D2 structure. No unresolved new design gap claimed; broad platform changes were explicitly not inferred.

## Behavior trace
| Behavior | Actual implementation path | Local result |
|---|---|---|
| BEH-001/003/004 preserved | final owner resolver, Team/Org stored locations, finalization, provider normalization; frontend source unchanged | exact IDs, separate drafts, async/sync owner rejection and duplicate-address byte selection pass |
| BEH-002 preserved/revised | typed record walker, grouped transition and released V1 journal | archives/sidecars/non-locator bytes, backup/hash/retry checks pass |
| BEH-005 | strict classifier + scoped readiness; both startup entrypoints; Team/Org catalogs/loaders and standalone catalog/projection/lifecycle | incomplete roots preserved/excluded; valid subset and new metadata publication pass locally |
| BEH-006 | current reference validator + dependency closure in transition/readiness | old/current unavailable refs, standalone dependants, valid cycles, failed-attempt isolation, republish exclusion pass |
| BEH-007 | server Data Migration Guideline, README/modules and operational docs; companion Solution Designer skill/reference | single authoritative guide + detailed historic critical failure; companion validator pass |

## Implementation evidence and environment
- **157 server unit checks / 19 files PASS**; production source TypeScript check PASS; shared builds/Prisma generation PASS; both repository diff checks and companion skill validation PASS.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/checks.md — commands, scope, fixture corrections and limits.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/server-unit.log; /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/source-typecheck.log; /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/dependency-build.log.
- /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/source-size-check.txt; /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/changed-files.txt; /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/companion-skill-validation.log.
- The summary counts are source-group dispositions now, not the older file counts; upstream 192/88 or installed 7,335/363 counts are historical point-in-time evidence, not this implementation's scan.
- Frontend feedback loop: **N/A for IR-002** — backend admission and documentation only; no rendered component/style/interaction source changed. Historical browser evidence does not prove corrected Electron startup.

## Required downstream gates / known limits
1. Fresh source review of warning versus actual attempt failure, current dependency closure, direct/sync/restore bypasses, publication, and released manifest reconciliation; include both repos and expanded guideline.
2. API/E2E owns real executable coverage and necessary REST/process fixture updates. Exact remaining callsites/obsolete assertions are listed in /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-startup-recovery/tickets/in-progress/team-attachment-exact-execution/implementation-evidence/recovery/checks.md. Do not restore permissive readers or mocks as a substitute for real startup.
3. **Mandatory before recovery/release claims:** both real entrypoints and repeat startup; same-ID FAILED retry plus terminal success/warning ledger independence; predecessor warning residue; all-excluded history with actual new work; stopped-writer actual installed-data copy retaining all eight missing-tree roots/hashes; usable history and exact attachment regression; actual reported desktop startup boundary.
4. Full archive/reference scanning is confined to startup/rebuild/publication, not each HTTP GET. No performance SLA/installed-corpus timing was established here. Terminal migration outcomes remain skipped by the generic runner; later unresolved historical upgrade requirements must be designed, never ledger-reset.
5. Preserve all historical evidence, originals and current newer writes. No production mutation is authorized by this handoff. Fresh user verification and Delivery publication/install gates remain mandatory.

## Handoff protocol
AgentTeam get_handoff_rules/send_message_to tools unavailable after discovery; no successful lookup is claimed. Use the explicitly authorized existing original specialist thread fallback, single primary recipient Code Reviewer 01a0deea-7dc5-7752-a767-312bf71c6af4. No new task or duplicate execution. Stop this implementation stage after confirmed handoff.
