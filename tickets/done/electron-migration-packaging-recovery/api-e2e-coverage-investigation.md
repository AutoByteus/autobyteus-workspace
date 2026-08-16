# API/E2E Coverage Investigation

## Investigation Meta

- Requirements: `requirements.md` refined through `R/AC-MIG-020`
- Design/runtime: `proposed-design.md` v8 / `future-state-runtime-call-stack.md` v8
- Solution/architecture: `SR-005` / `ARCH-REV-008` Pass
- Implementation/source review: `IR-003` / `CRR-007` Pass
- API/E2E revision: `API-REV-004`
- Investigation round: `3`
- Trigger: `UV-002` exposed validated current Team packages omitted from the persisted Team history index.
- Latest authoritative investigation: this round, with execution results synchronized after Stage 7.

## Requirement And Design Basis

`BEH-MIG-010` / `UC-MIG-010` requires the existing unreleased `20260814_team_run_execution_tree_v1` migration to project every complete validated current or successfully promoted TeamRun root into exactly one deterministic Team history row. Current tree facts own identity, definition, workspace, creation, and archive state; existing index-only summary/termination fields are preserved. Invalid, historical-residue, and unresolved roots remain absent. Equivalent output is a no-write/no-backup result. Malformed index or pre-commit failure remains retryable and preserves prior bytes. Runtime catalog, GraphQL, and sidebar remain index-driven, with no standalone Agent history duplication for Team members.

The cumulative package requirement remains an exact personal Linux x64 build whose packaged server executes the current migration pipeline, becomes healthy, and stops cleanly.

## Changed Boundary Classification

| Boundary | Change / Risk | Direct Coverage | Result |
| --- | --- | --- | --- |
| Backend/domain | current Team history-row projection/reconciliation | reconciler, V1, catalog, store tests | Pass |
| Persisted transition | existing `20260814` rebuilds Team history index | mixed integration + copied operational retry/restart | Pass |
| API | workspace history receives complete Team rows | copied server GraphQL | Pass |
| Frontend | no source change; existing sidebar consumes GraphQL | API contract plus user handoff verification | Pass for changed boundary |
| Electron/package | current corrected server must be staged | boundary test, canonical build, package inspection | Pass |
| Lifecycle | startup migration before readers; health/shutdown | repository harness + actual AppImage | Pass |
| Operational safety | live data must remain read-only | hashes/ledger verification and explicit copied selectors | Pass |

## Execution Environment

- Original assigned worktree: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-electron-migration-packaging-recovery`.
- Verified recovery worktree: `/home/ryan-ai/miniHDD/autobyteus-history-build-20260816`.
- Recovery base: `840fa0d2443f624a36a507905540164f80c7640e`.
- Recovery inputs: tracked patch SHA-256 `dc951ac930c54c14b44310200ed7ef92101b40861fb2a31e3aa58383ef932da9`; untracked archive SHA-256 `eb6b831456fd095ae2fefae07bb4eb9bc3ae58a0f88caa6a2297388628fe374e`.
- Stack: Node 22, pnpm 10, Fastify/GraphQL/Prisma, Nuxt/Electron 42.4.1, Linux x86-64.
- Data selector: explicit copied `DATABASE_URL` plus `dist/app.js --data-dir <copy>`.
- Embedded port: 29695; copied lifecycle port: 29795.

The assigned SSD twice lost `ata3` and returned `EIO` during sustained build I/O, with an aborted ext4 journal. This is a hardware/environment incident, not a disk-capacity or application failure. All current execution evidence was regenerated on the recovered exact-base tree.

## Durable Coverage Inventory

| Path / Group | Intent | Criteria | Result |
| --- | --- | --- | --- |
| `team-run-history-index-reconciler.test.ts` | projection, preservation, backup, malformed/missing input, no-op | `AC-MIG-015`–`019` | Pass |
| `team-run-execution-tree-v1-app-data-migration.test.ts` | orchestrator result/failure behavior | `AC-MIG-017`–`020` | Pass |
| `team-run-history-catalog-service.test.ts` | shared runtime row semantics | `AC-MIG-016`, `020` | Pass |
| `team-run-history-index-store.test.ts` | strict snapshot/tolerant reader/atomic store | `AC-MIG-017`, `019` | Pass |
| mixed TeamRun migration integration | current/promoted/residue convergence and second-run inventory | `AC-MIG-015`, `018`, `019` | Pass |
| runner/classifier/resolver/normalizer/projection/token group | cumulative migration safety | `AC-MIG-001`–`014` | Pass |
| Electron package-boundary integration/guard | production graph and link integrity | `AC-PKG-001`–`004` | Pass |

## Execution Results

| Order | Check | Result |
| --- | --- | --- |
| 1 | Five focused IR-003 files | Pass, 15 tests |
| 2 | Server `build:full` and sanitized bootstrap | Pass |
| 3 | Cumulative 11-file migration/run-history set on recovered tree | Pass, 68 tests |
| 4 | Source audit: one `20260814`, no `20260521` edit, no runtime fallback | Pass |
| 5 | Copied operational retry and GraphQL | Pass, exact 8 Team / 5 superrepo rows |
| 6 | Copied restart idempotence | Pass |
| 7 | Electron boundary test, production list, link, guard, diff | Pass |
| 8 | Exact canonical build | Pass |
| 9 | Packaged server lifecycle | Pass, 21 migrations / health / clean SIGTERM |
| 10 | Actual isolated AppImage | Pass, embedded server ready / no scoped migration error |

## Persisted Data Transition Evidence

- Approved strategy: migration required through existing unreleased `20260814`; no runtime fallback.
- Copied ledger: V1 `FAILED`, attempt 4 -> `SUCCEEDED`, attempt 5.
- Copied Team history index: exact eight validated rows, including exact five superrepo workspace rows.
- Existing index summaries for `hello` and the classroom run were preserved.
- GraphQL exposed exactly the five expected superrepo Team runs.
- Standalone Agent history index remained byte-identical.
- Second startup changed no Team index bytes, attempt count, backup count, memory inventory, or GraphQL result.
- Live terminal record remains unchanged and will not rerun automatically without a separately authorized live-state action.

## Final Confidence Scorecard

| Category | Score | Direct Support | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement/acceptance proof | 99% | durable + copied 8/5 + package criteria | live record intentionally unchanged |
| Changed-boundary directness | 99% | real classes, files, DB, API, processes | none material |
| Cross-boundary realism | 99% | copied operational state through GraphQL and package | manual visual grouping deferred to user |
| Environment/config fidelity | 99% | explicit copied selectors and native x64 artifact | non-Linux out of scope |
| Failure/lifecycle/recovery | 99% | malformed/no-op/retry/restart/health/stop | none material |
| User-surface/desktop shell | 97% | actual AppImage ready, existing renderer contract | manual sidebar inspection remains |
| Durable regression quality | 99% | owner-aligned tests and executable proof | proportional review in Stage 8 |

- Overall final confidence: `98.7%`.
- Critical criteria directly proven: `Yes`.
- Categories below 90%: none.
- 95% target met: `Yes`.

## Broader Validation Decision

- Decision: `Required and completed`.
- Modes: Live API, lifecycle, and project desktop validation.
- Browser: not required because no frontend source changed and browser execution cannot prove packaged migration behavior.
- Actual desktop: used only after repository/package lifecycle checks, with live home hidden.

## Deferred / Out Of Scope

| Boundary | Reason | Follow-up |
| --- | --- | --- |
| Live operational mutation | unauthorized and unnecessary for proof | user may later authorize a separate live repair/reset |
| Non-Linux-x64 package | outside ticket scope | release CI |
| Manual sidebar visual check | existing UI contract, backend/API directly proved | user verification on handed-off AppImage |
| SATA repair | machine hardware, not repository scope | power down; reseat/replace cable/port/power path; inspect SMART |

## Investigation Decision

- Proceeded to execution: `Yes`.
- Execution result: `Pass`.
- Final confidence: `98.7%`.
- Reroute required: `No`.
- Next recipient: Stage 8 code reviewer.
