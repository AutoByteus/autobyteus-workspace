# Solution Revision Record — Universal Application Dual-Host Foundation

The latest [requirements.md](requirements.md), [investigation-notes.md](investigation-notes.md), [design-spec.md](design-spec.md), and listed supplements are authoritative. This record is only the chronological solution-round and routing index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Initial approved solution package / architecture review round 1 | N/A | `Initial Baseline` | Round 1 returned `Fail — Design Impact` |
| SR-002 | `architecture_reviewer` round 1 report plus user discussion refinements and latest-base refresh | AR-001–AR-004; SV-001–SV-007 | `Design Impact` | Revised package self-validated and routed for architecture re-review |
| SR-003 | `architecture_reviewer` round 2 / `ARCH-REV-002` | AR-001, AR-005, AR-006; SV-008 | `Design Impact` | Round-2 corrections self-validated and routed for architecture re-review |

## Revision Entries

### SR-001 — Initial dual-host foundation baseline

- Triggering role, report path, and round: Initial solution handoff followed by `architecture_reviewer` round 1 at [design-review-report.md](design-review-report.md).
- Triggering finding IDs: `N/A` for the baseline.
- Prior authoritative result: `N/A`.
- Current authoritative result: The initial package established the universal startup-provider/shared-runtime/two-composition direction; architecture review round 1 subsequently returned `Fail — Design Impact`.
- Why this baseline or revision entry is recorded: The initial handoff predated the mandatory revision record. This entry restores the required baseline without treating the missing prior record as a pass.
- Resolution: Initial authoritative requirements, investigation, critical analysis, and design were created in the dedicated task worktree.
- Approved behavior or requirement IDs affected: BEH-001–BEH-007; REQ-001–REQ-006; the then-current AC/use-case set.
- Canonical artifacts and sections updated: Current canonical paths are [requirements.md](requirements.md), [investigation-notes.md](investigation-notes.md), and [design-spec.md](design-spec.md); their latest contents supersede the initial round.
- Supplemental artifacts updated, added, or removed: [proposal-critical-analysis.md](proposal-critical-analysis.md) and retained proposal source.
- Downstream and architecture-review impact: Implementation was correctly blocked pending AR-001–AR-004.
- Next recipient or routing: Returned to `solution_designer`.
- Remaining gaps or risks: Exact named readiness, frontend migration inventory, composition-critical dependency conversion, and stable behavior traceability were unresolved in round 1.

### SR-002 — Review findings, native commands, and latest-base reconciliation

- Triggering role, report path, and round: `architecture_reviewer` round 1 [design-review-report.md](design-review-report.md), followed by user discussion refinements through 2026-07-27 and user-requested `origin/personal` refresh on 2026-07-29.
- Triggering finding IDs: AR-001–AR-004 and self-validation corrections SV-001–SV-007.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: Revised solution package is requirements-approved, self-validated, aligned to `origin/personal` at `6caf809303294252c109420b238588f0c68aca6a`, and ready for architecture re-review. No pass is assumed before that review.
- Why this baseline or revision entry is recorded: It is the completed solution-design rework round after architecture findings and the user's final command/workflow decisions.
- Resolution:
  - Enumerated exact startup/readiness/recovery/stop ownership, including refreshed-base protected operational paths, Prisma, secret vault, provisioned Search tool, event pipeline, and cleanup.
  - Completed the clean-cut frontend/source/generated migration inventory and unversioned code-symbol plan.
  - Defined the exact composition-critical dependency graph, bounded singleton conversion, route seams, and disposal inventory.
  - Stabilized BEH-001–BEH-007 and added complete reachable UC/DS traceability.
  - Fixed the native application-folder contract to `dev`, `dev:studio`, `build`, `validate`, and `start`; added production DS-010 and rejected public mock fallback.
  - Revalidated eighteen reachable use cases and twenty-four scenarios against the canonical design principles.
- Approved behavior or requirement IDs affected: BEH-001–BEH-007; REQ-001–REQ-006; AC-001–AC-013; UC-001–UC-018; DS-001–DS-010.
- Canonical artifacts and sections updated: [requirements.md](requirements.md), [investigation-notes.md](investigation-notes.md), and [design-spec.md](design-spec.md), including behavior maps, named readiness, command/process boundaries, file mapping, sequence, risk, and guidance sections.
- Supplemental artifacts updated, added, or removed: Updated [proposal-critical-analysis.md](proposal-critical-analysis.md); updated [design-self-validation.md](design-self-validation.md); retained original proposal source; retained round-1 [design-review-report.md](design-review-report.md) as triggering evidence.
- Downstream and architecture-review impact: Architecture review should verify AR-001–AR-004 resolution plus the new DS-010/native-command and refreshed-base process-resource design. Implementation remains blocked until review passes.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: Optimized standalone binary/container distribution, full offline dependency packaging, public-internet operation, marketplace isolation, and repository-wide singleton removal remain intentionally out of scope. Real execution must later verify worker-crash recovery and latest-base vault/Search/restart cleanup.

### SR-003 — Readiness consistency, maintained-project mappings, and fallback removal

- Triggering role, report path, and round: `architecture_reviewer` round 2 [design-review-report.md](design-review-report.md), indexed by [architecture-review-revision-record.md](architecture-review-revision-record.md) as `ARCH-REV-002`.
- Triggering finding IDs: AR-001, AR-005, AR-006, plus self-validation correction SV-008.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: The cumulative package uses one exact refreshed-base readiness order and seven-group tool contract, makes all approved maintained-project commands executable through explicit devkit inputs, removes the contrary broad-server fallback from the approved supplement, and is ready for architecture re-review. No pass is assumed before that review.
- Why this revision entry is recorded: Round 2 verified AR-002–AR-004 resolved but found three bounded cross-artifact/production-path gaps that still blocked implementation.
- Resolution:
  - Aligned every lifecycle rule, sequence, graph/example, file row, guidance statement, and SV-C24 to `AppConfig/database location -> core migration -> protected DB/root-key/sidecar paths -> Prisma -> secret vault -> app-data migration -> remaining readiness`.
  - Replaced the stale six-group target row with exactly seven named P6 groups including provisioned Search.
  - Audited Brief Studio and Socratic's real layouts and selected one existing-owner path: identical checked-in `autobyteus-app.config.mjs` mappings for frontend/backend roots, entries, optional assets/agents, root teams, migrations, seven exposure booleans, and output.
  - Assigned icons to `frontend-src`, package-SDK imports to app entries, the five scripts directly to devkit, and clean deletion of custom builders plus source-root generated `ui`/`backend`/vendor mirrors.
  - Ran a disposable exact-config probe: both maintained apps packed and validated through the current devkit with icons, teams, migrations, and exposure manifests present; all probe/build/dependency artifacts were removed.
  - Revised the critical-analysis correction, target behavior, roadmap, and decision table so the current broad `buildApp()` composition is rejected as any standalone fallback or interim stage. Named underlying prerequisites remain reusable only inside the explicit selected-application composition.
- Approved behavior or requirement IDs affected: BEH-004–BEH-007; REQ-004–REQ-006; AC-001, AC-005, AC-006, AC-009–AC-013; UC-015, UC-016, UC-018; DS-005, DS-006, DS-010. This is execution/design precision for already-approved behavior, not a new product requirement.
- Canonical artifacts and sections updated: [requirements.md](requirements.md) BEH-006/REQ-006/UC-015/AC-011 and constraints; [investigation-notes.md](investigation-notes.md) source log/behavior/design-health/open decisions/review guidance; [design-spec.md](design-spec.md) round-2 map, DS-006, lifecycle rules, exact mappings/removals, file maps, examples, and sequence.
- Supplemental artifacts updated, added, or removed: Updated approved [proposal-critical-analysis.md](proposal-critical-analysis.md) to remove the contradictory fallback; updated evidence-only [design-self-validation.md](design-self-validation.md) with SV-008. No new supplement was required.
- Downstream and architecture-review impact: Implementation remains blocked until architecture review verifies AR-001, AR-005, and AR-006 resolved. AR-002–AR-004 remain resolved and were not reopened.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: The config probe validates package-input feasibility only. Downstream execution must prove the new real `dev`/`dev:studio`/`start` sessions, worker recovery, origin/static behavior, graph isolation, and event-pipeline/vault/Prisma cleanup. Optimized independent distribution, marketplace isolation, and full offline dependency packaging remain out of scope.
