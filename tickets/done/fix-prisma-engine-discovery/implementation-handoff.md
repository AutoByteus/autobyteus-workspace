# Implementation Handoff — Permanent Prisma Engine Discovery

## Current Result / Authority
IR-001 initial implementation, R3 Approved / D1 Ready / SR-004 / ARCH-REV-001.
Production source and focused unit work committed as `dd7be60ff6c732e0ddf6d9ac97a822bda8a85869`.
**Implementation-scoped work complete; ready for independent source review.** No overall acceptance/native Docker/API pass is claimed.
Task `project_task_6b8c9612-c94b-4d62-8053-00ef94bd94df`; **Medium / High unchanged**.
Source-only; no live repair, release, publication, merge/push or permanent-Task completion claimed.

Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/fix-prisma-engine-discovery`, branch `codex/fix-prisma-engine-discovery`.
Source base `e22245f097c208e66065302cfc30814cc5ffd14f`; architecture-review commit `0cd2a2bb1fde6ab92fded200c2b8edd0e628d0fd`; target remains Delivery-owned `origin/personal`, with moving-base audit.

## Upstream Cumulative Package
All relative ticket artifacts in this report resolve under
`/Users/normy/autobyteus_org/autobyteus-worktrees/fix-prisma-engine-discovery/tickets/in-progress/fix-prisma-engine-discovery/`.

Authorities: `requirements-doc.md` R3; `investigation-notes.md` E001–008; `design-spec.md` D1; `solution-revision-record.md` SR001–004 plus informational review receipt; `solution-handoff.md`.
Independent architecture review applicable: `design-review-report.md` and `architecture-review-revision-record.md`, ARCH-REV-001 Pass/no findings. These approve design, not source or executable results.
Relevant supplements remain `root-cause-summary.md`, `investigation-evidence/{available-image-dependency-metadata.json,cli-dependency-metadata.json,recurrence-node2-readonly.json,requirements-r2-superseded.md}`, `recurrence-findings-handoff.md`, and `delivery-custody-resolution.md`. R2 is historical/superseded, never current operational authority.
External historical/factual package remains `/Users/normy/autobyteus_org/autobyteus-delivery-records/docker-node2-prisma-engine-mismatch/package/` (especially cause-comparison/investigation), its sibling `solution-designer-terminal-receipt.md`, and `recurrence-20261013-upgrade/{handoff-summary.md,verification-request.md,evidence/results.json}`. No edits or replay. Old operational reviews/IR/API/DR do not approve this source. Supplement inventory/links in solution-handoff remain active context. Product/UI supplement N/A — not applicable.

Trigger: Architecture Reviewer initial current-source design handoff, not an operational rerun. Triggering findings N/A. Current code-review/API/Delivery revision IDs N/A — not yet performed for this source package (required downstream, not waived). Implementation history is `implementation-revision-record.md` IR-001, independent of old operational IR-001.

## Implementation / Production Path
| Behavior / requirements | Actual path / result |
| --- | --- |
| BEH-001 / REQ-001 / AC-001 | `src/startup/migrations.ts`: private resolver realpaths local CLI JS, resolves its engines manifest using `createRequire`, then engines-version JSON from that real manifest. Native files are selected only inside that associated engine directory. Root-pnpm, self-contained package-pnpm and flat graph fixtures pass. |
| BEH-002 / REQ-002 / AC-002 | Cache lookup reads only `cacheRoot/<expected40hexrevision>`, preserving runtime target preference and requiring a complete same-directory pair. Equivalent targets sorted deterministically; unrelated revisions/mtime never compete. Missing identity returns no automatic pair, leaving ordinary CLI behavior/errors. |
| BEH-003 / REQ-003,005 / AC-003,006 | Complete explicit pair still first. Partial values retained when no automatic pair; both replaced when one resolves. Canonical supplied DB overrides stale environment. Invocation/deploy/P3005/error owner and all callers/startup ordering byte-identical. Private local native deploy twice succeeded; no live node/data/backup/credential access. |
| BEH-001,002 / REQ-004 / AC-004 | Filesystem regression and host-native narrow integration implemented. **Current-source Linux Docker/no-pin/retained-incompatible-cache/startup/API-data/recreation evidence and durable E2E harness remain REQUIRED from API/E2E, not passed here.** |
| BEH-004 / REQ-006,007 / AC-005,006 | Existing factual cause brief retained: unowned search + revision-blind fallback, same historical image/different homes, unknown writer. This report supplies source/local results only. Reviewed validation/finalization/publication still distinct downstream gates. |

Production paths DS001 normal server, DS002 standalone host, DS003 explicit-target importer continue through common `runMigrations`. DS004 selection is internal to that owner. No caller-specific policy, new runtime service, new exported API, native downloader, DB schema/migration or pin.
Changes stay within UC001–003 Scope Guardrail. No app format/data transformation: **Not Affected** under D1 persisted-data decision; only normal existing schema writes on owned local test SQLite. No new migrations or historical runtime readers.

## Key Files / Removal / Design Health
- Modify `autobyteus-server-ts/src/startup/migrations.ts` only production file.
- Replace ownerless fixtures in `autobyteus-server-ts/tests/unit/startup/migrations-prisma-engine-env.test.ts`: 30 cases, real dependency symlinks/inert native files, native clean-child missing-metadata controls.
- Add `autobyteus-server-ts/tests/unit/startup/migrations-command.test.ts`: 8 preserved exec-boundary cases, no live CLI or DB.
- Ticket-owned evidence and reports only otherwise. Package script/dependency/lockfile/recipe/launcher untouched in this round.

Reviewed posture Bug Fix / Local Implementation Defect + Missing Invariant confirmed. Local refactor removes `listBundledPrismaEngineDirs`, unrelated store enumeration and all-revision/mtime ranking completely. No compatibility wrapper or dual old policy; matching cache and explicit env remain approved contracts. No new dead code found elsewhere during bounded reference audit. Existing public functions and three callers remain reached.
One private two-field metadata structure; no global cached identity or generic registry. Shared design guidance reapplied. Production file 243 nonempty lines; delta +60/-107 (167 total), below 500/220 guardrails. Test files are outside source-size guardrail. `source-audit.json` proves unchanged command/types/target rules and env/exec/migration tail, no other tracked source/recipe/helper/manifest/lockfile/schema/license/caller changes.

## Routing Classification / Ownership
- Task size Medium confirmed: one runtime owner, two focused unit files, downstream durable lifecycle check within existing boundaries.
- Architecture risk High confirmed: native execution selection feeds shared schema-startup prerequisite. No silent downgrade.
- Selected next route: independent Code Review, then applicable API/E2E and Delivery rules. Low-risk self-review N/A; independent source review required.
- No newly discovered product design/metadata/packaging impact in implemented owner. No changed supported behavior beyond approved automatic selection.
- **Role boundary:** implementation-engineer skill explicitly reserves API/E2E test authoring, execution and broader executable environments for API/E2E Engineer. D1's designed single `tests/e2e/startup/prisma-engine-discovery.docker.mjs` and `package.json` discoverability script are therefore required downstream API-owned work, not authored/executed by this role. This allocation does not remove any D1/REQ-004/AC-004 obligation or mark an uncreated harness as implemented. Do not fork a separate probe or waive current-source proof. Escalate if the normal route cannot retain this ownership.

## Environment / Local Implementation Checks
Evidence directory: `implementation-evidence/ir-001/`. All commands from isolated worktree with `env -i PATH="$PATH" HOME=<owned private temporary home> TMPDIR=<system temp> CI=1 NO_COLOR=1` except read-only Git/audits. No inherited app/provider variables, model calls, Docker commands or user-node probes in this source round.
Node v22.23.1, pnpm10.28.2, macOS ARM64. Installs frozen lockfile, task-local node_modules. Initial filtered install omitted build-only backend SDK; expanded filter added it and its dependencies. The first full unit run also exposed missing example-app dependency links; a full frozen-lockfile workspace install corrected this ordinary setup omission. First prebuild failure is preserved, not product failure or a silent retry. No dependency source/version/lock change.

| Check / command | Result / evidence |
| --- | --- |
| `pnpm install --frozen-lockfile --filter 'autobyteus-server-ts...'`, then additionally `--filter '@autobyteus/application-backend-sdk...'` | Both installs passed, `install.log`, `install-sdk.log`. Expected upstream ignored @google/genai install-script warning; no policy override. |
| Initial new filesystem regression against untouched base resolver | 30 run: 20 failed / 10 passed, `base-regression.log`; deliberate red proof of in-scope selection defects, **not native RPC control**. |
| First revised graph run | 27 passed / 3 failed, `graph-regression.log`: pnpm Vitest shim adds repository `.pnpm/node_modules` to NODE_PATH, making missing fixture metadata resolve installed test-runner packages. Corrected fixture isolation, not product selection or assertions. |
| Missing-metadata fixture correction | Clean child runs transpilation of this exact source with real native module resolution and fixture-private HOME/no NODE_PATH. No resolver mock, global monkeypatch, native binary/DB execution. Required missing/invalid/unreadable assertions remain. |
| `pnpm -C autobyteus-server-ts prebuild` | First setup failure missing backend SDK node_modules in `prebuild.log`; after install completion passes in `prebuild-complete-deps.log`. |
| `pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host tests/unit/secret-management --no-watch` | **20 files / 197 tests pass**, includes all38 newly changed/added owner cases; `focused-units.log`. |
| `pnpm -C autobyteus-server-ts typecheck` | Pass, including shared preparation; `typecheck.log`. |
| `pnpm -C autobyteus-server-ts build` | Pass, fresh TypeScript output plus sanitized built-module/bootstrap smoke; `build.log`. |
| `node <ticket>/implementation-evidence/ir-001/native-local-check.mjs` | Pass: current built source uses worktree CLI-owned native605 macOS ARM64 bundle, no pins; canonical private SQLite deployment27 migrations, repeat no pending; stale DB not created, owned fixture removed. Source/dist hashes in `native-local.log`. Narrow implementation integration only, not Linux Docker/API/full startup proof. |
| First `pnpm -C autobyteus-server-ts test:unit` | 682 files passed / 5 suite-loading errors / 4 skipped; 5431 tests passed / 7 skipped. Five application-backend suites imported uninstalled example-app SDK links after filtered setup; `server-units.log` preserved. No assertion failure or source regression attributed. |
| `pnpm install --frozen-lockfile`; rerun five affected application-backend suites plus both Prisma owner files | Install passed (`install-workspace.log`); **7 files / 62 tests pass** (`setup-corrected-units.log`). No source workaround, test suppression, dependency upgrade or baseline policy waiver. |
| Final complete `pnpm -C autobyteus-server-ts test:unit` | **687 files passed / 4 skipped; 5455 tests passed / 7 skipped; exit0**, `server-units-complete-deps.log`. Six gated live AGY cases and one Windows-only DB-location case skipped, not counted Pass. |
| `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py`; `git diff --check` | Pass; original `licensing.log`, `hygiene.log`, and final staged `final-gates.log`. |
| Bounded retained-input/dead-path/size audit | Pass, `source-audit.json`. |

No remaining local test/build failure after complete setup and rerun. Fixture-development/setup failures remain recorded as above; they were diagnosed and corrected, not labeled a baseline waiver. Broader repository integration suites and Docker API/E2E are intentionally not counted as local Pass. TESTING Rule9 applies to any newly observed actual baseline failure; no suppression or waiver.

## Frontend / Operational Limits
Frontend rendered-result check **Not Applicable**: no rendered surface/interaction changes. No screenshots/desktop/public-API journey claimed.
No user node, port8001/8003, user HOME/credentials/settings/volumes, private backup, operational pin or shared build container was touched. This source round neither rechecks current live readiness nor reopens historical recovery3466/restoration177/canceled06f7. Follow independent sourceTask6b8 only.
Task-local untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are generated prerequisites, not staged source. node_modules/server/core build outputs remain for downstream work; never stage them accidentally. Native test SQLite fixture removed; private command HOME and exact global-unit SQLite files removed per `cleanup.json`. No owned Docker/server process created.

## Required Downstream Coverage / Delivery
1. Code Reviewer independently reviews source + owner fixtures and the role-boundary allocation above against R3/D1; High route retained. No API/native Docker approval exists yet.
2. API/E2E authors **one** designed gated `prisma-engine-discovery.docker.mjs` plus `test:e2e:prisma-engine-discovery:docker` package script. Gate RUN_PRISMA_ENGINE_DOCKER_E2E=1; header owns prerequisites/cases/cleanup. No dependencies/recipe/launcher changes. Reuse this exact harness for lifecycle proof, not duplicate ticket-only probes.
3. Use current built worktree server. Audit entire image dist equality allowing ONLY changed output files before mounting; otherwise build owned current monorepo image. Record immutable image ID/source tree/dist hashes. Old b141/1779 operational configuration-only proof is NOT current-source proof.
4. Establish baseline native mismatch/control using owned publicly sourced pinned/checksummed incompatible fixture; original resolver must select wrong revision and fail real DB-free listMigrationDirectories or actual baseline startup. Fake graph red checks do not satisfy native control.
5. Corrected signed-out owned Linux stack, no explicit engine pins, retained incompatible cache: assert real matching native RPC, normal schema/startup, repeated HTTP200/statusok. Create representative durable data via supported API, **recreate container over SAME owned HOME/data**, verify readiness/data and unchanged wrong-cache evidence. Preserve failures/cleanup receipts and platform limits; no user ports/mounts/resources/providers or shared build/prune.
6. Run applicable broader server integration/startup/caller validation per TESTING, with full `test:integration:prepare` prerequisite setup. Native/build/required boundary failures cannot be hidden under local unit totals. Route any material packaging/metadata/source/design gap appropriately; TESTING Rule9 for baseline findings.
7. Delivery syncs root-cause brief's pending-implementation wording with actual validated result, preserves unknown cache writer and operational/source distinction; verifies user/release decision, moving base and source-only isolated merge/push. No public image publication/live rollout implicit. Until a corrected image is separately deployed, a container-local workaround is still recreation-unsafe.

## Applied Handoff Rule
Fresh `get_handoff_rules` on 2026-10-13 selected exactly the initial implementation-complete + architectural_risk=High + local-checks-complete source-review rule → `/software_engineering_team/code_reviewer`. No Local Fix, Low direct-validation or requirements/design-gap rule applies to this completed implementation scope. No additional manager/operational/SD notification. Handoff transport must be confirmed by tool; not preclaimed in this artifact.

Generated stdout log formatting: initial staged whitespace gate failed only on log trailing spaces/blank EOF (`final-gates-initial.log`). Own new logs were normalized without dropping result lines; raw and committed-text SHA256 values are in `log-normalization.json`. Final gates rerun after formatting. No historical/upstream evidence edited.
