# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements: `requirements.md` refined through `R/AC-MIG-020`
- Design/runtime: `proposed-design.md` v8 and `future-state-runtime-call-stack.md` v8
- Solution/design review: `SR-005` / `ARCH-REV-008` Pass
- Implementation/source review: `IR-003` / `CRR-007` Pass
- Coverage investigation: round 3
- API/E2E revision: `API-REV-004`
- Execution round: `4`
- Trigger: `UV-002` history-index discoverability re-entry
- Latest authoritative round: this report

## Investigation And Execution Basis

- Investigation completed before execution: `Yes`.
- Planned repository, copied-operational, GraphQL, restart, packaging, and AppImage surfaces executed: `Yes`.
- Material deviation: the assigned SSD lost its SATA device twice under sustained build I/O (`EIO`, `ata3: disable device`, aborted ext4 journal). The ticket was reconstructed from hash-verified recovery archives on an exact-base fallback clone and all repository checks were rerun before packaging.
- Reroute required: `No`; the storage failure did not expose an application defect and the recovered candidate was independently verified.

## Compatibility / Legacy Scope Check

- Runtime backward-compatibility reader introduced: `No`.
- New migration ID introduced: `No`.
- Existing released `20260521` migration edited: `No`.
- Persisted transition owner: existing unreleased `20260814_team_run_execution_tree_v1`.
- Standalone Agent history duplication introduced for Team members: `No`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Acceptance Criteria | Boundary | Execution Surface | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `SCN-MIG-008` | `AC-MIG-015`–`020` | validated V1 Team roots -> Team history index | Unit/integration | Pass | Reconciler, V1, catalog, store, and mixed-history tests; cumulative group 11 files / 68 tests. |
| `SCN-MIG-009` | `AC-MIG-001`–`014`, `AC-TEST-001` | preserved migration topology and retry safety | Unit/integration | Pass | Runner, classifier, resolver, normalizer, projection, token, and integration suites all pass. |
| `SCN-MIG-010` | `AC-MIG-015`–`019` | copied operational DB/index/tree inventory | Live lifecycle | Pass | Attempt 4 failed copy retried to success at attempt 5; exact 8 Team rows; prior summaries preserved; one protected backup. |
| `SCN-API-001` | `AC-MIG-015`, `020` | workspace history GraphQL projection | Live GraphQL | Pass | Exact five superrepo Team run IDs returned from `listWorkspaceRunHistory`; no standalone Agent-index expansion. |
| `SCN-MIG-011` | `AC-MIG-018`, `019` | restart idempotence | Live lifecycle | Pass | Second startup preserved Team index hash, attempt count, backup count, memory inventory, and five GraphQL rows. |
| `SCN-PKG-001` | `AC-PKG-001`, `004` | production dependency graph/link | Repository/package | Pass | Boundary integration 2/2; production list excludes renderer contract; link and guard pass. |
| `SCN-PKG-002` | `AC-PKG-002` | current server/renderer/Electron composition | Canonical builder | Pass | Full personal Linux x64 command exited 0 after recovered-tree 68/68 verification. |
| `SCN-PKG-003` | `AC-PKG-003`, `004` | release artifact identity | AppImage/metadata | Pass | Executable ELF x86-64; metadata size/hash agree; required Prisma engine roots present; current reconciler string present in packaged server. |
| `SCN-PKG-004` | `AC-PKG-005` | packaged server startup/shutdown | Unpacked Electron runtime | Pass | 21 Prisma migrations, migration-success log, REST health, SIGTERM, clean close. |
| `SCN-PKG-005` | `AC-PKG-003`–`005` | actual AppImage shell/embedded server | Mount-isolated AppImage | Pass | Fresh disposable home; 21 migrations; `ServerStatusManager: Server is ready`; no scoped TeamRun/migration failure. |

## Repository And Package Execution

| Check | Result |
| --- | --- |
| 11 explicit migration/run-history Vitest files | Pass, 68 tests |
| `pnpm --filter autobyteus-server-ts run build:full` | Pass before storage incident; current source rebuilt again by canonical package build |
| Electron package-boundary integration | Pass, 2 tests |
| `guard:web-boundary` | Pass |
| production dependency list | Pass; `@autobyteus/team-stream-contracts` absent |
| contract link | Pass; `../../../autobyteus-team-stream-contracts` |
| `git diff --check` | Pass |
| canonical personal Linux x64 Electron build | Pass |

The first recovered-clone test attempt failed only because a fresh install had not generated Prisma Client. After the required `prisma generate`, the same complete 11-file command passed 68/68; this is classified as environment bootstrap, not a product failure.

## Copied Operational Data Evidence

- Live `/home/ryan-ai/.autobyteus/server-data` remained read-only. Live DB/index hashes and V1 terminal record were checked before and after the one accidental read-only startup that inherited the live `DATABASE_URL`; they were unchanged.
- The correct lifecycle explicitly selected both the copied `DATABASE_URL` and copied `--data-dir`.
- Copied V1 ledger moved from `FAILED`, attempt 4, to `SUCCEEDED`, attempt 5.
- Result summary contained 15 details: one Team-history-index migration, 14 skips, zero failures.
- The Team history index contained exactly eight validated V1 roots, including exactly five for the superrepo workspace.
- GraphQL returned exactly these five IDs:
  - `software_engineering_team_3d1f933ae33d4018a09a436103e8d3cc`
  - `software_engineering_team_b9f693970ea54330b407d79f3ada609c`
  - `software_engineering_team_c8cb1499e313447f9317b62968038933`
  - `software_engineering_team_cc86d4c9ed784ae991e7c3d28123f396`
  - `team_software-engineering-team_ffc3cd70`
- Existing `hello` and classroom summaries were preserved.
- The standalone Agent history index remained byte-identical.
- Second startup preserved Team index SHA-256 `af29d621ebf8e56e0a22e249c7209c901d1c683faa2356b7724f63cf05e3dcb3`, attempt 5, one backup, memory inventory, and GraphQL results.

## Artifact And Lifecycle Evidence

- Artifact: `autobyteus-web/electron-dist/AutoByteus_personal_linux-x64-1.4.52.AppImage`
- Size: `533,488,451` bytes.
- SHA-256: `ceb3a04a015075cd4fba01c1a8469965cdaff61720715d6f6a43503f8bf66b9e`.
- Built: `2026-08-16 21:59:25 +0200`.
- Updater metadata: version `1.4.52`, matching size/SHA-512, embedded `blockMapSize: 553815`.
- Packaged server contains the current reconciler execution path and both Prisma engine families.
- Repository lifecycle harness used disposable SQLite data, observed all 21 migrations and health, sent SIGTERM, and observed clean server close.
- Actual AppImage used bubblewrap to hide the operational home, mounted only the built artifact read-only, applied all migrations, and reached ready on port 29695.
- Ctrl-C ended the owned shell smoke after readiness; Chromium child/GPU termination diagnostics are expected for that forced shell stop. Graceful server shutdown is independently proven by the lifecycle harness.
- Port 29695 is free and the disposable AppImage home was moved to trash.

## Validation Confidence Scorecard

| Category | Final | Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance proof | 99% | All critical history, retry, API, and package criteria directly pass. | Live terminal record is intentionally not reset. |
| Changed-boundary directness | 99% | Store, migration, copied persisted state, GraphQL, package, and process executed. | None material. |
| Cross-boundary realism / mock gap | 99% | Real operational-shape copy and actual packaged runtime. | Renderer visual grouping remains user verification. |
| Environment / configuration / fixture fidelity | 99% | Exact 8/5 inventory, explicit copied DB/data dir, native Linux x64 package. | Non-Linux targets out of scope. |
| Failure / lifecycle / recovery | 99% | Malformed/no-op tests, retry, restart, health, graceful stop. | None material. |
| User surface / desktop shell | 97% | Actual AppImage reached ready; existing GraphQL/sidebar contract unchanged. | Manual sidebar inspection remains appropriate. |
| Durable regression quality | 99% | Owner-aligned deterministic tests plus operational executable proof. | Proportional test review follows in Stage 8. |

- Final confidence: `98.7%` simple average.
- Critical criteria directly proven: `Yes`.
- Any category below 90%: `No`.
- Default 95% target met: `Yes`.

## Tests Implemented Or Updated

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| `tests/unit/app-data-migrations/team-run-history-index-reconciler.test.ts` | Added | `AC-MIG-015`–`019` | Pass |
| `tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts` | Updated | `AC-MIG-015`, `018`, `019` | Pass |

No durable test was edited during Stage 7 execution itself. These two cumulative candidate paths require proportional Stage 8 review.

## Result Summary

- Result: `Pass`.
- Broader validation: `Required and completed`.
- Critical acceptance criteria lacking proof: none.
- Operational data mutation: none.
- Recommended recipient: code reviewer for proportional review of the two changed durable test files.
