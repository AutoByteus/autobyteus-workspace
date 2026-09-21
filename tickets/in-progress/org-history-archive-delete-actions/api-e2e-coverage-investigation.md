# API/E2E Coverage Investigation — ORG-HISTORY-ARCHIVE-DELETE-20260921-001

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/requirements-doc.md` (`SR-001`)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/solution-revision-record.md` (`SR-002`)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/tickets/in-progress/org-history-archive-delete-actions/design-spec.md`
- Design Review Report / Architecture Revision: `design-review-report.md`, `architecture-review-revision-record.md` (`ARCH-REV-001`, Pass)
- Implementation Handoff / Revision: `implementation-handoff.md`, `implementation-revision-record.md` (`IR-001`, `IR-002`)
- Code Review Report / Revision: `code-review-report.md`, `code-review-revision-record.md` (`CRR-002`, Pass; `CR-001` resolved)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md` (`API-REV-001`)
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: `1`
- Trigger: Code Reviewer cumulative implementation Pass
- Prior Investigation Reviewed: `N/A — initial API/E2E baseline`
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required when API/E2E changes durable tests; otherwise Not Applicable`

## Current Requirement And Design Basis

A stopped, non-pending top-level AgentOrg history row must expose isolated Archive and Delete actions; active/managed roots remain Stop-only and are authoritatively rejected even from stale clients. Archive must write one canonical `archivedAt` to the existing V1 tree and index while retaining the complete package. Delete must use the shared localized confirmation modal and remove only the exact package/index row. Client pruning, retained-context retirement, topology refresh and selected-route exit occur only after authoritative success. Failures retain row/context/route and never activate, restore or invoke a provider. English and Simplified Chinese labels/accessibility must identify AgentOrg history. Sibling roots, Agent/Team history, definitions, workspaces, drafts, conversations, tasks, Activity, attachments and bindings remain unchanged.

## Changed Behavior Summary

| Behavior / Boundary | Change | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` stopped/active row actions | Added | SR-001, IR-002 | Real browser desktop/narrow, pointer/keyboard, click isolation, active protection |
| `BEH-002` archive persistence | Added | DS-001/003/004 | Real GraphQL→manager→tree/index path plus file inventories/hashes |
| `BEH-003` confirmed delete | Added | DS-002/003/004 | Cancel and confirmed real modal; exact destructive filesystem proof |
| `BEH-004` lifecycle authority | Changed | manager inactive-history lane | Repository concurrency tests plus live active-root rejection corroboration |
| `BEH-005` feedback/cleanup/localization | Added | composable/store/panel | English and zh-CN modal/toast/ARIA; selected route/context cleanup only on success |
| Agent/Team and non-target state | Preserved | REQ-007 | Synthetic mixed-family histories and before/after inventories |

## Changed Surface And Boundary Classification

| Surface | Affected | Actual Boundary | Repository Evidence | Remaining Risk | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Backend domain/persistence | Yes | manager admission and AgentOrg catalog archive/delete/compensation | focused owner tests | real filesystem/listening service | isolated backend + hashes |
| GraphQL contract | Yes | two subject-explicit mutations/results | resolver tests | real request mapping | browser/Apollo plus optional corroboration |
| Frontend state/component | Yes | row controls, shared mutation owner, Pinia cleanup/router | real component/store suites | production composition | normal Chrome |
| Browser user journey | Yes | action discovery, modal, feedback/navigation | implementation preview only | actual user action path | normal Chrome |
| Localization/accessibility | Yes | en/zh-CN AgentOrg destructive copy and native controls | real modal regression | actual locale/AX/keyboard | normal Chrome |
| Process/lifecycle | Yes | stopped-only transition lane | deterministic owner tests | actual managed root | UI-created active root + live rejection |
| Persisted data | Yes | direct current tree/index/package | focused file-store tests | exact retained/removal scope | disposable profile inventories |
| Authentication/session | No | local app has no relevant auth boundary | N/A | none | N/A |
| Electron shell | No | no shell/preload/IPC delta | N/A | negligible | browser preferred |
| Worker/distributed/external provider | No | no change; provider must not start | negative assertions | log evidence | process logs |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions`
- Stack: TypeScript/Fastify/Apollo/SQLite/filesystem backend; Nuxt/Vue/Pinia frontend; Electron wraps the same renderer.
- Instructions: root and server README prescribe `pnpm dev` or built server with `--data-dir`; browser is appropriate because no shell boundary changed.
- Dependency state: package-local `node_modules` was absent. Cross-worktree symlink attempts were insufficient for transitive workspace resolution and Nuxt `#app-manifest`; the repository-supported `pnpm install --frozen-lockfile` and `nuxi prepare` path was used before acceptance. Validation-owned installations and generated outputs were removed afterward.
- Secrets: `N/A`; provider calls are out of scope and the isolated profile will contain no provider credentials.

| Path | Authority / Constraint |
| --- | --- |
| `README.md` | canonical local full-stack and test-owned-state policy |
| `autobyteus-server-ts/README.md` | explicit `--data-dir`, host/port, required `.env`, process-level database authority |
| `autobyteus-web/package.json`, `nuxt.config.ts` | Nuxt commands and explicit backend endpoint environment |
| `validation/README.md` | upstream test evidence and typecheck qualifications |
| `test-support/fixtures/lazy-configured-restore/README.md` | credential-free synthetic Agent/Team/Org package; test-owned server only |

| Component | Setup / Start | Readiness | Cleanup |
| --- | --- | --- | --- |
| backend | build, then `env -i` with explicit absolute `DATABASE_URL`, memory/data paths; `node dist/app.js --data-dir ... --host 127.0.0.1 --port 51781` | `/rest/health` | stop owned PID/session; remove profile |
| frontend | Nuxt dev with all backend HTTP/WS endpoints set to `127.0.0.1:51781`, port `51783` | page/HTTP readiness | stop owned PID/session |
| Chrome | normal Chrome via CUA at `127.0.0.1:51783` | semantic DOM | close owned tab |

| Fixture Need | Mechanism | Safety / Cleanup |
| --- | --- | --- |
| valid definitions | copy repository-owned credential-free lazy-configured-restore package into the isolated profile | no user/private profile; delete owned clone |
| active/stopped Org roots | ordinary frontend launches/stops without Send | no inference; exact owned roots only |
| Agent/Team comparators | ordinary frontend launch/stop from same synthetic package | preserve and inventory |
| archive/delete targets | disposable stopped Org roots with synthetic package content | archive retained; delete intentionally removed; entire profile deleted afterward |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Existing V1 tree/index/package shapes are exercised as produced by the current production UI/backend.
- Archive proof: exact package inventory/content hashes unchanged except tree/index archive projections; same timestamp; default-list row removed.
- Delete proof: exact target package and index row removed; all non-target inventories/hashes unchanged.
- No migration/compatibility branch is authorized or planned.

## Existing Durable Coverage Inventory

| Path / Scenario | Decision | Reason / Action |
| --- | --- | --- |
| server manager lifecycle test | Still Valid | exact inactive/managed/racing transition authority; rerun |
| server catalog service test | Still Valid | archive/delete readback, compensation, unsafe IDs, exact sibling preservation; rerun |
| server service/resolver tests | Still Valid | no-activation delegation and explicit GraphQL results; rerun |
| `WorkspaceAgentOrgDisclosure.spec.ts` | Still Valid | actual row eligibility/action isolation/accessibility; rerun |
| `WorkspaceAgentRunsTreePanel.spec.ts` | Still Valid | selected route and real zh-CN shared modal; rerun |
| `runHistoryStore.spec.ts` | Still Valid | exact success-only client cleanup/mismatch failure retention; rerun |
| `useWorkspaceHistoryMutations.spec.ts` | Still Valid | discriminated pending/confirmation/toasts/en localization; rerun |
| IR-002 manifest / preservation | Still Valid | candidate identity and IR-001 preservation; verify independently |

No coverage is stale or removed. API/E2E will add no durable tests before execution because the implementation already includes boundary-appropriate regressions; the remaining gap is realistic browser/listening-service/filesystem evidence.

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | verify `ir002-source-manifest.json` SHA-256 and `git diff --check` | exact candidate | Pass — 26/26 exact | `validation/api-e2e/manifest-check.json`, `diff-check.log` |
| 2 | focused server Vitest (4 files) | manager/catalog/service/resolver | Pass — 4 files / 19 tests | `server-focused-tests.log` |
| 3 | focused Nuxt Vitest (4 files) | row/panel/store/composable | Pass — 4 files / 123 tests | `web-focused-tests.log` |
| 4 | server production build | executable backend | Pass | `server-build.log` |
| 5 | Nuxt production build | executable frontend | Pass — 16 routes prerendered | `web-build.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — multiple destructive, lifecycle, localization and cleanup cases.
- Canonical ledger: `api-e2e-test-case-ledger.md`
- Initialized before execution: `Yes`

| Case | Journey | Authority | Surface |
| --- | --- | --- | --- |
| R01 | exact manifest, focused regressions and production builds | all | repository |
| B01 | stopped versus active controls, isolation, keyboard and active rejection | AC-001/004/005 | Chrome + backend |
| B02 | English Archive success on selected stopped Org | AC-002/005 | Chrome/Apollo/filesystem |
| B03 | Delete cancel then confirmed delete in English and zh-CN | AC-003/005 | Chrome/modal/filesystem |
| B04 | failure retention and ordinary compensation/indeterminate qualification | AC-002–005 | browser failure + repository owner evidence |
| B05 | mixed-family/sibling/definition/workspace/data preservation and no provider start | AC-002–005 | Chrome/files/logs |
| C01 | cleanup and artifact audit | workflow | process/files |

## Post-Repository Confidence Scorecard

| Category | Score | Support | Remaining uncertainty |
| --- | ---: | --- | --- |
| Requirement and AC proof | 84% | all focused owner/UI regressions pass | no live destructive journey |
| Changed-boundary directness | 88% | exact candidate and direct owner tests | listening-service path unproven |
| Cross-boundary realism | 68% | resolver/store/component tests | mocks separate browser/API/filesystem |
| Environment/fixture fidelity | 80% | production builds and current V1 fixtures | no isolated live profile yet |
| Failure/lifecycle/recovery | 90% | managed/race/compensation/unsafe-ID owner tests | live retained client state unproven |
| User surface/browser | 55% | real component tests only | no normal browser execution |
| Durable regression quality | 97% | 142 focused tests, exact reviewed manifest | no permanent full-stack E2E |

- Overall post-repository confidence: **80.3%** (simple average, one decimal).
- Every critical AC directly proven: `No` — live archive/delete/localization/cleanup remain.
- Categories below 90%: requirement proof, directness, cross-boundary realism, environment fidelity, user surface.
- Default 95% target met: `No`.
- Broader validation remains required.

## Broader Validation Decision

- Decision: `Required`
- Mode: `Browser + isolated listening backend + filesystem/process corroboration`
- Gap: real modal/localization, exact success-only routing/context cleanup, real archive/delete persistence, active protection, and non-target preservation.
- Browser is the correct web-equivalent desktop surface; no Electron-specific code changed.

## Live Environment And Fixture Plan

Use only a newly created worktree-local profile with explicit process-level absolute data variables and repository-owned synthetic packages. Create valid runs through ordinary frontend flows; never copy or mutate user profile/history. Capture semantic DOM, screenshots, network mutation counts/results, backend logs, tree/index/package inventories and hashes. Close the validation tab, stop only owned services, remove the owned profile and generated build outputs created solely for validation.

## Not Tested / Deferred

| Boundary | Reason | Risk |
| --- | --- | --- |
| Electron shell | no shell delta | negligible; no shell certification |
| provider inference | explicitly out of scope and must not start | none; negative log evidence only |
| catastrophic filesystem destruction beyond controlled ordinary failure | destructive fault injection cannot safely certify every OS failure | bounded; exact indeterminate policy covered durably |

## Investigation Decision

- Proceed: `Yes`
- Durable coverage changes by API/E2E: `No` initially
- Broader validation: `Required`
- Reroute required before execution: `No`

## Broader Validation Outcome Update

- Completed cases: `R01`, `B01`, `B02`, `B03`, `B04`, `B05`, and `C01` all `Pass`.
- Execution mode completed: normal Chrome against an owned isolated Nuxt frontend and listening backend, with exact filesystem/process corroboration.
- Final validation confidence: **97.4%**.
- Result: **Pass**.
- Reroute required: `No`.
- Durable API/E2E coverage changed by this round: `No`; reviewed implementation-owned regressions were sufficient and the remaining gap required realistic temporary acceptance evidence.
- Proportional test-code review: `Not Applicable` because API/E2E added, updated, or removed no repository-resident durable tests.
- Residual scope: no Electron-shell certification because no shell boundary changed; catastrophic compensation/removal uncertainty was not destructively induced live but is covered by the reviewed owner tests; no provider-inference certification because the validated history actions must not invoke a provider, and absence was verified through trace/file and request-log evidence.
- Authoritative result details: `api-e2e-execution-coverage-report.md`; concise round history: `api-e2e-revision-record.md`.
