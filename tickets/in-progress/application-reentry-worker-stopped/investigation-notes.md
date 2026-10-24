# Investigation Notes

## Investigation Meta

- Package identifier: `application-reentry-worker-stopped` (Project Task `autobyteus-296`)
- Request / ticket: autobyteus-296 (FU-003 and FU-002 of autobyteus-238, plus the user's design-findings request)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `codex/application-reentry-worker-stopped` (RELEASE.md naming)
- Resolved base: `origin/personal` @ `ddd6fdcdf6` (fetched 2026-10-24)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-server-ts test:integration:prepare` (SDK and Brief Studio `dist/` folders are untracked build outputs)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-24, in this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rules 1–10, project design documents, glossary pointer), `GLOSSARY.md`, `TESTING.md`, `RELEASE.md` (branch naming), `autobyteus-server-ts/AGENTS.md`
- Investigation status: complete

## Initial Request And Clarifications

- Original request: Task autobyteus-296 and its comment (see requirements doc).
- Clarifications: one ticket at a time; finalize to personal; no release; prove from a clean clone; any change to the user's data needs approval and a backup (none here).

## Source Log

| Date | Type | Source | Why | Finding | ID |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-reentry-service.ts:103-115,134-175` | The reentry tail | Not-ready → generic quarantine (111); previously inactive without `recoverPreviouslyInactive` → keep quarantine (134-147); otherwise `resumeApplication` → `engineLauncher.ensureReady` → `resumePendingEventsForApplication` → `activateApplication` → tools open (149-157); a throw → stop worker → quarantine (158-175) | E-01 |
| 2026-10-24 | Doc | `autobyteus-server-ts/docs/modules/application_orchestration.md:177-180`; `applications.md:111` | Contract | REENTERING → stop worker → binding recovery and dispatch resume → only then ACTIVE, worker stopped, next ensure-ready boots it | E-02 |
| 2026-10-24 | Code | `src/application-platform/runtime/application-platform-lifecycle.ts:51-58,85-126` | Startup order | Runtime folders → readiness; recovery: resume bindings → reconcile availability (ACTIVE) → quarantine not-ready with "Application setup is required: <diagnostics>" (113-119) → for ready apps resume pending events and open tools; never starts workers | E-03 |
| 2026-10-24 | Code | `src/application-orchestration/services/application-execution-event-dispatch-service.ts:85-95,117-119,138-170`; `application-availability-service.ts:205-215` | Dispatch needs ACTIVE | `resumePendingEventsForApplication` suspends and returns unless ACTIVE; drain starts the worker on demand (`ensureReady`, 166) | E-04 |
| 2026-10-24 | Code | `src/application-agent-tools/services/application-agent-tool-worker-invoker.ts` | Who starts a stopped worker | Tool calls start a `stopped` worker on demand; only `failed`/`stopping` fail closed | E-05 |
| 2026-10-24 | Code | `src/application-platform/runtime/application-definition-runtime-readiness.ts:10-17,108-114`; `application-catalog-transition-service.ts:145-165` | Diagnostics owner | Readiness keeps diagnostics per app; the transition passes only "recoverable" IDs (`isApplicationReady`) to reentry, so the reason is lost; the text "Application setup is required: …" is built in the error class (14) and in the lifecycle (118) | E-06 |
| 2026-10-24 | Code | `src/application-orchestration/services/application-orchestration-recovery-service.ts:89-107` | Binding recovery needs | Lookups and observer attach; no worker, no availability gate | E-07 |
| 2026-10-24 | History | `git show 598ee2c2f8` (2026-08-27, "checkpoint reviewed application-owned MCP capability"); `tickets/done/application-owned-mcp-capability/` | Why the worker start was added | Added with the application-owned MCP rework. That ticket's notes say tool calls after a crash "fail until an owning path restores the worker". The current invoker starts a stopped worker itself (E-05), so reentry need not | E-08 |
| 2026-10-24 | Code | `autobyteus-web` (`stores`, `components`, `services`, `graphql`) | User surfaces | No caller of `/backend/reload` or `reloadApplicationPackage` | E-09 |
| 2026-10-24 | Code | `tests/unit/application-orchestration/application-reentry-service.test.ts:91-97,130-135`; `application-catalog-transition-service.test.ts:44,299` | Tests pinning current behavior | The order assertion and the generic quarantine text will change | E-10 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Package reload / repair | transition → prepare participants (stop worker) → commit → readiness → reentry: recovery → worker start (REENTERING) → worker's host call refused → quarantine | QUARANTINED, 503 | E-01, SD-01 | Reproduced |
| BEH-002 | System | Reentry | dispatch resume while REENTERING → no-op | Pending events wait | E-04 | Read |
| BEH-003 | User | Import while signed out | readiness diagnostics → generic quarantine text | No reason shown | E-06, SD-01 | Reproduced |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Implication | Design Implication |
| --- | --- | --- | --- |
| `ApplicationReentryService.recoverParticipants` | Participant recovery after a transition | The order is wrong | Reorder; drop the worker start |
| `ApplicationDefinitionRuntimeReadiness` | Readiness diagnostics | Natural owner of the "setup required" text | One method used by startup and transition |
| `ApplicationCatalogTransitionService.commitAndRecover` | Passes readiness results to reentry | Passes IDs only | Pass the reasons |

## Structural And Payload Surface Inventory

- Structural: three server services (reentry, transition, readiness), the platform lifecycle (text owner switch), their unit tests, one new e2e, two module docs.
- API/persistence/security/deployment: absent. Lifecycle: the reentry order (in-memory availability, worker start timing).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| SD-01: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/zz-probe-application-reentry.e2e.test.ts --no-watch` on base `ddd6fdcdf6` (real studio server, scripted CLIs, Brief Studio imported by GraphQL) | RR: reload then repair; SO: signed-out import | RR: after package reload 503 "currently quarantined: … currently reentering"; repair answers `state: QUARANTINED`. SO: 503 "Application setup is required after catalog transition." | Reproduced | BEH-001, BEH-003 | `evidence/SD-01-repro-base.log` |
| SD-02: same with a TEMPORARY reorder of `recoverParticipants` (recovery → activate → tools open → dispatch resume; no worker start) | Control | RR passes: launch settings 200 after reload; repair `ACTIVE`; ensure-ready ready; `createBrief` succeeds. SO still fails only on the text (FU-002, not in this control) | Reproduced | DEC-001 sufficient | `evidence/SD-02-control-reentry-order.log` |

- Temporary diagnostics: SD-02's reorder in `application-reentry-service.ts`; reverted with `git checkout` right after; never committed.
- Reproduction for implementation to start from: `evidence/repro-application-reentry.e2e.test.ts` (copy into `autobyteus-server-ts/tests/e2e/runtime/`, run as SD-01). Both cases fail on base.

## Persisted Data And State Facts

- Not affected.

## Product Design Request Context

- `Not stated`.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro-application-reentry.e2e.test.ts` | Solution Designer | Reproduction | SCN-001…003 | AC-001…004 | Current | Evidence |
| `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-reentry-order.log` | Solution Designer | Outputs | — | — | Current | Evidence |
| `application-framework-design-findings.md` | Solution Designer | User-requested design report | Application SDK/framework | AC-009 | Current | Report |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| R-01 | Risk | After reentry the first request pays the worker start (lazy), as after startup | Latency | Same as startup; documented behavior | Accepted |
| R-02 | Risk | Pending-event dispatch now actually resumes after reentry and may start the worker right away | Behavior change toward the docs | Intended (REQ-002) | Accepted |

## Architecture Investigation Findings

- See the source log; design-health findings for the wider framework are in `application-framework-design-findings.md`.

## Requirement Implications

- Fix the reentry order to the documented one, with the dispatch correction; carry readiness reasons into the transition's quarantine.

## Notes For Architecture Design

- Keep the participant preparation and the catch-and-quarantine path.
