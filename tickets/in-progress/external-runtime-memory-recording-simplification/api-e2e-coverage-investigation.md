# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/persisted-snapshot-inventory.md` (evidentiary; approval `N/A`)
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `code_reviewer` source-review pass `CRR-003` under `SR-004`, `ARCH-REV-003`, and `IR-003`
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: This file, round 1

## Current Requirement And Design Basis

External Codex and Claude runtimes retain provider-owned continuation and provider compaction while AutoByteus retains normalized raw traces as its only required activity record for these runtimes. The reviewed source must no longer construct, read, update, or write external `working_context_snapshot.json`. Raw field fidelity, ordering, tool lifecycle reconstruction across writer recreation, all-runtime raw-backed projection, and completed provider-boundary rotation must remain intact.

The persisted outcome is `Discard or Rebuild`: startup cleanup may unlink only the exact snapshot at current standalone and recursive team-member locations classified as Codex or Claude by authoritative metadata and layout/location owners. It must preserve native AutoByteus, imports, unclassified/invalid/mismatched metadata, task-like history, future runtimes, raw/archive/metadata/provider/artifact files, and symlink targets/directories outside the owned traversal. Cleanup is idempotent. A non-`ENOENT` unlink failure is truthfully reported, retains the file, leaves manual retry available, and does not block later startup work or provider/raw behavior. The generic file-backed inspector intentionally returns no WorkingContext after absence/successful cleanup, may return stale WorkingContext after failed retention, returns raws independently, and preserves native/imported behavior. No runtime-qualified hiding, migration-status read coupling, compatibility fallback, dual write, or raw-to-snapshot reconstruction is approved.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / DS-001 provider continuation | Preserved | REQ-001, AC-001, design DS-001; CRR-003 | Re-execute representative Codex and Claude continuation evidence; prove it remains provider-ID based and independent of snapshot state. |
| BEH-002 / DS-002, DS-007, DS-008 external recording | Changed | REQ-002, REQ-004, REQ-005; AC-002, AC-003, AC-005, AC-006 | Replace stale mixed-writer tests with raw-only writer, accumulator, sequencer, recorder, and restart hydration coverage; assert snapshot absence. |
| BEH-003 / DS-003 raw-backed projection | Preserved | REQ-003, AC-004 | Re-run cross-runtime integration and GraphQL/raw projection coverage with external WorkingContext absent. |
| BEH-004 / DS-006 inspector behavior | Changed | REQ-011, AC-012; SR-004 | Add durable GraphQL/service evidence for external absence plus raws, approved retained stale snapshot plus raws, and native snapshot preservation. |
| BEH-005 / DS-004, DS-009 provider boundary | Preserved | REQ-006, AC-007 | Re-run Codex and Claude boundary/dedupe/retry/rotation coverage using the renamed raw-only writer. |
| BEH-006 / DS-005, DS-010, DS-011 cleanup | Added | REQ-007, REQ-008, REQ-012; AC-008, AC-009, AC-013 | Add durable cleanup coverage for exact classification, recursive teams, exclusions, idempotence, symlinks, failure/warning/retention/retry, and runner continuation. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | External raw writer/model contraction; cleanup classification/unlink/result policy | Unit and integration Vitest plus filesystem fixtures | None after planned durable cleanup/writer coverage | None |
| API / transport / contract | No production contract change; observable result changed | Existing GraphQL memory view reflects physical snapshot absence/presence | Repository GraphQL E2E builds real schema and executes resolver/service/store | None after external/native/failed-retained fixtures | None |
| Frontend component / state | No | Existing UI consumes unchanged nullable WorkingContext and independent raws | Existing UI contract plus GraphQL E2E | Browser would only repeat unchanged renderer handling; no frontend source changed | None |
| Browser integration / user journey | No | No browser API, route, renderer, or client state changed | N/A | No browser-specific risk created | None |
| Authentication / session / permissions | No | Provider session IDs remain continuation authority | Existing provider continuation API/E2E/integration | Live-provider availability may limit real account fidelity | Live provider or provider-protocol harness if needed |
| Desktop renderer / web-equivalent UI | No | Existing Memory Inspector contract only | GraphQL boundary gives authoritative backend payload | No changed renderer implementation | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes | Writer recreation; startup migration order/non-blocking outcomes | Integration/filesystem tests and migration-runner tests | Real startup is unnecessary if runner and definition are directly exercised | Lifecycle-focused repository tests |
| Persisted-data transition | Yes | Exact discard of classified external snapshot only | New durable migration tests planned | Real user corpus must not be mutated; aggregate inventory is upstream evidence only | Isolated filesystem lifecycle |
| Worker / queue / distributed coordination | No material change | Existing per-run Promise queue preserved | Recorder unit/integration | None | None |
| External integration | Preserved | Codex thread and Claude session continuation | Existing live-gated and deterministic protocol-harness tests | Live provider/account fidelity | Targeted live provider where safe and materially useful |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification`
- Project type and runtime stack: pnpm TypeScript monorepo; `autobyteus-server-ts` uses Node 22.23.1, Vitest 4.0.18, Fastify/GraphQL, SQLite/Prisma, real filesystem memory stores, optional Codex CLI and Claude CLI/SDK live suites.
- Conflicting, missing, or unclear project instructions: None. `AGENTS.md` requires `vitest run ... --no-watch`; package scripts prepare shared packages and Prisma global setup resets the isolated test DB.
- Required environment variables or secrets available: Repository checks `Yes`; live provider authentication not assumed merely from CLI presence. `codex-cli 0.146.0` and Claude Code `2.1.220` are installed. Live suites require explicit `RUN_CODEX_E2E=1` or `RUN_CLAUDE_E2E=1`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/autobyteus-server-ts/AGENTS.md` | Closest repository test instructions | Use `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; integration suite path documented. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/autobyteus-server-ts/README.md` | Build/runtime/environment authority | Node 18+; build via `pnpm -C autobyteus-server-ts build`; app-data migrations run at startup; optional isolated `--data-dir`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/autobyteus-server-ts/package.json` | Component scripts/dependencies | `typecheck`, `build`, `test`; pre-hooks build shared workspace packages. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/autobyteus-server-ts/vitest.config.ts` | Test runner authority | Node environment, fork pool, serial files, Prisma setup/global setup; `tests/**/*.test.ts`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/autobyteus-server-ts/.env.test` | Isolated test environment | `APP_ENV=test`, SQLite test DB, loopback server host. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/package.json` | Workspace/live E2E scripts | `test:e2e`, `test:e2e:real:preflight`, `test:e2e:real`; live runtime suites are gated. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/autobyteus-server-ts/tests/setup/prisma-global-setup.ts` | DB fixture setup | Test run resets isolated SQLite DB with Prisma before execution. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Focused repository tests | worktree root | `pnpm -C autobyteus-server-ts exec vitest run <files> --no-watch` | Uses existing installed locked dependencies and isolated test DB/temp dirs | Vitest result | Test hooks remove temp dirs; global process exits |
| Broader server suite | worktree root | `pnpm -C autobyteus-server-ts exec vitest run tests/unit tests/integration tests/e2e --no-watch` or full configured suite | Live-gated suites skip unless enabled | Vitest result | Test hooks/runner |
| TypeScript/build | worktree root | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts build` | Shared packages and Prisma generation run via pre-hooks | Exit 0 | Generated build output is repository-owned ignored output |
| Optional live Codex | worktree root | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run <target> --no-watch` | Requires installed/authenticated Codex app-server and provider model; creates only temporary workspace/memory | CLI/version then test readiness | Test terminates thread/client and removes temp dirs |
| Deterministic Claude protocol continuation | worktree root | Run the non-live Claude websocket continuation E2E | Fake SDK preserves provider session semantics without account/secret | E2E assertions | Harness closes WebSocket, Fastify app, session |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Raw traces/archives/snapshots | `RunMemoryFileStore`, test JSON/JSONL helpers, temp directories | No real user memory root | `afterEach` recursive removal |
| Standalone/team runtime metadata | `AgentRunMetadataStore`, `TeamRunMetadataStore`, current member-tree fixtures | Synthetic IDs/paths only | Temp root removal |
| Cleanup failure | Focused `fs.unlink` spy for one exact eligible path | No permission mutation or user file | Spy restored; retained temp file removed after assertion |
| GraphQL inspector | Real schema against isolated configured memory root | No network/server process needed | Created run directories removed |
| Provider identity/continuation | Existing Codex/Claude runtime harnesses; live only when safe | No secret values recorded | Harness owns process/session termination |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`, `Cleanup Lifecycle`, DS-005/DS-010/DS-011; handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: Synthetic standalone Codex/Claude/native/future/invalid/unclassified runs; recursive team Codex/Claude/native members; imported and task-like snapshots; canonical and poisoned stored paths; raw/archive/metadata/artifact controls; symlink directory and exact-file symlink target.
- Evidence planned: Direct migration execution and retry in an isolated memory root, plus generic runner continuation and GraphQL/service inspection.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`; the framework is a disposal ledger, not schema transformation.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-memory/run-memory-writer.test.ts` | Mixed writer writes raws plus external WorkingContext; sequence and lifecycle | AC-002/003/005/006; DS-002/008 | Replace | Import/producer removed; snapshot assertion is obsolete; raw/sequence/lifecycle intent remains | Rename to `external-runtime-memory-writer.test.ts`; assert raw fidelity, timestamp normalization, active+archive hydration, lifecycle, and no snapshot. |
| `tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | Raw ordering plus several WorkingContext projections | AC-002/005/007; DS-007/008/009 | Needs Update | Raw assertions match approved behavior; snapshot assertions are stale | Switch writer import/type and remove/replace snapshot expectations with raw-only/absence evidence. |
| `tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts` | Tool ordering/dedupe/compound identity/restart hydration | AC-002/003/006; DS-008 | Needs Update | Scenario behavior remains valid; only writer symbol is stale | Switch to `ExternalRuntimeMemoryWriter`; preserve all lifecycle assertions. |
| `tests/unit/agent-memory/agent-run-memory-recorder.test.ts` | Codex recording, AutoByteus exclusion, Claude attachment, raw tool shape | AC-002/005; DS-002/007 | Needs Update | Core assertions remain; exact future-runtime rejection and no-snapshot evidence missing | Add Codex+Claude raw-only matrix, snapshot absence, and future runtime exclusion. |
| `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Cross-runtime raw/persistence/projection/boundary behavior plus external snapshots | AC-002/003/004/005/006/007/011 | Needs Update | Broad real filesystem/manager/projection coverage is valuable; external snapshot assertions/imports are stale | Use renamed writer, assert external `workingContext === null` and physical absence; retain native and provider boundary controls. |
| `tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Live Codex raw plus snapshot from real app-server turn | AC-001/002/005 | Needs Update | Live raw/provider path is useful; snapshot existence/read is obsolete | Rename scenario/expectation to raw-only and assert snapshot absence. Run only if safe/live gate is selected. |
| `tests/e2e/memory/memory-view-graphql.e2e.test.ts` | Generic file-backed WorkingContext and raw GraphQL view | AC-004/012/013; DS-006/011 | Still Valid + Add | Generic native/file behavior remains approved; no runtime-specific external outcome exists | Preserve current case; add explicit external absent, failed-retained stale+raw, and native control. |
| `tests/e2e/memory/memory-explorer-graphql.e2e.test.ts` | Availability/listing BFF | AC-012 | Still Valid | Unchanged generic availability contract | Execute; no change unless external fixture materially improves coverage beyond memory-view test. |
| `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Imported memory stays read-only/file-backed | AC-008/009/013 exclusions | Still Valid | Imports are deliberately outside cleanup | Execute relevant E2E suite; no change planned. |
| `tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts` and native memory suites | Native WorkingContext ownership | AC-009/011/012 | Still Valid | Native snapshot APIs remain authoritative and unchanged | Execute focused native control; no compatibility-only change. |
| `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` non-live suite | Provider session ID continuation over real WebSocket/API with deterministic SDK harness | AC-001; DS-001 | Still Valid | Directly proves provider continuation semantics without snapshot dependency | Execute targeted non-live suite. |
| `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` live-gated Codex/Claude restore journey | Create, terminate, restore, continue via GraphQL/WebSocket | AC-001; DS-001 | Still Valid | Strongest live continuation evidence, but external provider/auth/time cost is material | Select targeted live mode only if repository evidence leaves a confidence gap and setup is safe. |
| App-data migration tests | No test for new cleanup definition | AC-008/009/013; DS-005/010/011 | Add Durable Coverage | Critical destructive boundary presently lacks durable coverage | Add `remove-external-runtime-working-context-snapshots-migration.test.ts`; augment runner continuation/retry evidence if needed. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-memory/run-memory-writer.test.ts` mixed `write({trace,snapshotUpdate})` | External writer persists WorkingContext | REQ-004/005/010 and AC-005/010 require clean removal | SR-004 / ARCH-REV-003 / CRR-003 | Raw-only external writer test | N/A |
| Accumulator/cross-runtime WorkingContext expectations | External events merge into snapshot messages/reasoning | Snapshot construction/maintenance is removed | REQ-004/005/011; AC-005/012 | Exact raw content/order plus null/physical absence | N/A |
| Live Codex snapshot read | Real Codex turn creates/contains snapshot transcript | Opposite of approved new behavior | REQ-004; AC-005 | Real Codex raw trace and physical snapshot absence | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | External writer raw field fidelity, timestamp normalization, active+archive sequence hydration, lifecycle grouping, snapshot absence | REQ-002/004/005; AC-002/003/005/006; DS-002/008 | `tests/unit/agent-memory/external-runtime-memory-writer.test.ts` | Direct owner regression after mixed writer deletion. |
| API-002 | Exact recorder eligibility: Codex+Claude yes; AutoByteus+future no; recording without subscriber; no snapshot | REQ-002/004/005; AC-002/005/010 | `tests/unit/agent-memory/agent-run-memory-recorder.test.ts` | Prevent future negative-predicate drift and duplicate writes. |
| API-003 | Exact startup cleanup of standalone and recursive team locations with all preservation controls and idempotence | REQ-007/008/012; AC-008/009/013; DS-005/010 | New cleanup migration unit test | Critical destructive boundary must be directly durable. |
| API-004 | Directory/exact-file symlink behavior and stored-`memoryDir` injection resistance | REQ-008/012; AC-008/009/013 | New cleanup migration unit test | Proves cleanup cannot escape metadata/layout-owned path. |
| API-005 | Non-`ENOENT` unlink failure -> warning/failure detail, retained file, stale generic inspection plus independent raws, retry success; later startup work continues | REQ-011/012; AC-012/013; DS-011 | New cleanup test plus migration-runner test | Encodes the final SR-004 tradeoff without defensive hiding. |
| API-006 | External absent/success state and failed-retained/native file-backed state over GraphQL | REQ-003/011/012; AC-004/012/013; DS-006/011 | `tests/e2e/memory/memory-view-graphql.e2e.test.ts` | Proves the public inspector boundary and independent raw availability. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-007 | Accumulator suite | Renamed writer and raw-only assertions | AC-002/005/007; DS-007/008/009 | Preserve reasoning/tool order and boundary retry. |
| API-008 | Tool sequencer suite | Renamed writer only; retain lifecycle assertions | AC-003/006; DS-008 | Direct restart hydration evidence. |
| API-009 | Cross-runtime persistence integration | Remove external snapshot expectations; assert null/absence; renamed writer | AC-002/003/004/005/006/007/011 | Real manager/filesystem/projection boundary for both external runtimes. |
| API-010 | Live Codex memory test | Assert raw-only/no snapshot; remove snapshot JSON read | AC-001/002/005 | Execute only under selected live decision. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `tests/unit/agent-memory/run-memory-writer.test.ts` | Obsolete owner/path and mixed snapshot contract | REQ-004/005/010; AC-005/010 | Replaced by renamed raw-only `external-runtime-memory-writer.test.ts`. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run` with the 10 changed writer, recorder, accumulator, sequencer, cleanup, runner, cross-runtime, projection, and memory-view files | worktree root / `.env.test` / isolated Prisma DB | API-001 through API-009; exact raws, restart hydration, rotation, cleanup, failure/retry, inspector, native controls | Pass — 10 files, 77 tests | `api-e2e-evidence/round-1/01-focused-tests.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree root | Repository TypeScript program | Blocked as a test-source signal — pre-existing `tsconfig.json` selects `tests` while `rootDir` is `src`, producing repository-wide TS6059 before task diagnostics | `api-e2e-evidence/round-1/02-typecheck.log` |
| 3 | Temporary targeted test `tsc` probe across all changed test families | worktree root / temporary config removed after run | Determine whether the global typecheck limitation hid task-local errors | Blocked by four already-present test-file diagnostics in unchanged statements/contracts; none originated in the new cleanup/writer assertions | `api-e2e-evidence/round-1/04-targeted-test-typecheck.log` |
| 4 | Targeted test `tsc` probe across eight clean changed durable test files | worktree root / temporary config removed after run | Direct compile check for new tests and principal updated unit/GraphQL tests | Pass — exit 0, no diagnostics | `api-e2e-evidence/round-1/10-targeted-clean-test-typecheck.log` |
| 5 | Relevant memory-store/projection, Codex manager/bootstrap, Claude session, Claude WebSocket continuation, Memory Explorer, and memory-sync suites | worktree root / live provider case gated off | Native/import preservation, public API, provider-ID continuation, raw-backed projection | Pass — 9 files; 63 passed, 1 live-only skipped | `api-e2e-evidence/round-1/05-relevant-regression-and-continuation.log` |
| 6 | `vitest run tests/unit/agent-memory tests/unit/app-data-migrations tests/unit/run-history tests/integration/agent-memory tests/integration/run-history tests/e2e/memory tests/e2e/memory-sync tests/e2e/run-history --no-watch` | worktree root / isolated Prisma DB | Broad affected memory/migration/history/API regression | Pass — 62 files passed, 1 live-gated file skipped; 293 tests passed, 1 skipped | `api-e2e-evidence/round-1/06-affected-suites.log` |
| 7 | `pnpm -C autobyteus-server-ts build` | worktree root | Production TypeScript build, shared packages, Prisma generation, sanitized bootstrap smoke | Pass | `api-e2e-evidence/round-1/07-build.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | API-001 through API-010 map AC-001 through AC-013; focused and affected suites passed | Provider fidelity still represented by deterministic harnesses at this point | One real external-provider turn and one live continuation |
| Changed-boundary execution directness | 99% | New owner-level writer and cleanup tests, real filesystem assertions, migration runner, GraphQL resolver/service/store | No material changed boundary remains indirect | None |
| Cross-boundary integration realism and mock gap | 95% | Real filesystem, metadata stores, GraphQL schema, Prisma setup, manager/projection paths, and deterministic WebSocket/provider-ID continuation | External account/transport not yet exercised in the post-repository score | Live Codex app-server checks |
| Environment, configuration, identity, and fixture fidelity | 97% | Locked pnpm environment, Node 22.23.1, isolated SQLite/Prisma, current standalone/team metadata, recursive paths and symlinks | Synthetic persisted corpus; repository-wide test typecheck config is unusable | Live CLI plus targeted clean test compile |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Forced EPERM, warning details, retention, independent raw write, retry, idempotence, invalid metadata, future/native/import/task exclusions, symlink safety, later-migration continuation | OS-specific error variants beyond representative non-ENOENT are not enumerated | None material |
| User-surface, browser, and desktop-shell confidence | 96% | Real GraphQL payload proves absent, stale-retained, native WorkingContext and independent raws; client/shell source unchanged | Renderer pixels not re-executed because no renderer contract or implementation changed | Browser would not materially improve backend boundary proof |
| Durable regression coverage quality and relevance | 98% | Obsolete mixed writer coverage replaced; destructive cleanup and approved residual encoded narrowly; 77 focused tests pass | Proportional independent test-code review still pending | Code reviewer review |

- Overall post-repository confidence: `97.4%`
- Calculation method: Simple average of the seven applicable category scores, rounded to one decimal; no weak category is hidden by the average.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: Repository-wide test typechecking is limited by a pre-existing `rootDir`/`include` mismatch, although the production build and an eight-file task-focused compile pass. Live evidence is still useful to remove the remaining external-provider mock gap. Unclassified or invalid historical metadata is intentionally preserved rather than guessed.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Lifecycle` + `Live API`
- Specific confidence gap or residual risk addressed: Confirm on an authenticated real Codex app-server that an external turn records current raws without creating WorkingContext, and confirm provider-owned restore/continue retains the same remote thread ID. Repository lifecycle/GraphQL checks already cover cleanup and inspector semantics.
- Why the selected mode can materially improve confidence: It crosses the actual external process, authenticated provider, model catalog, normalization, recorder, physical filesystem, thread termination, `thread/resume`, and follow-up turn boundaries that deterministic harnesses cannot fully represent.
- Expected confidence after the selected validation: Approximately `98%`, with no applicable category below `90%`.
- Browser-specific decision and rationale: `Not selected`; no frontend source, browser API, renderer state, routing, or shell boundary changed. The real GraphQL resolver/service/store result is the authoritative changed payload and existing UI already handles nullable WorkingContext and independent raws.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`; installed Codex CLI and current authentication were ready.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron/web client exists, but no desktop or frontend production file changed.
- Relevant README or development instructions: Server README reviewed; frontend instructions are not needed because no renderer validation gap is identified.
- Web-equivalent behavior: Memory Inspector receives nullable WorkingContext and independent raw traces through GraphQL.
- Shell-specific or lifecycle behavior: None.
- Chosen validation approach: Real GraphQL schema/service/store execution; no browser or Electron launch.
- Server/frontend setup when browser validation is used: `N/A`.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: Pixel/rendering unchanged and out of changed scope; no confidence deduction for a non-affected shell/renderer.

## Live Environment And Fixture Plan

- Startup order and commands: Focused Vitest -> typecheck probes -> relevant suites -> broad affected suite -> build -> live Codex raw-only turn -> live Codex terminate/restore/continue.
- Environment choices: `.env.test`, isolated Prisma SQLite, OS temp memory roots, loopback-only GraphQL/WebSocket harnesses.
- Health/readiness checks: Vitest global setup; schema creation; Fastify ephemeral port; installed CLI version for any live gate.
- Seed data / fixtures: Synthetic current run/team metadata and raw/snapshot/archive files only.
- Test identities/authentication/permissions: Synthetic run/team IDs for repository checks; current authenticated Codex CLI session for the explicit live gate; no credential values recorded.
- Requirement-linked journeys: API-001 through API-010, including real Codex raw-only persistence and live same-thread continuation.
- Evidence to capture: Command logs, Vitest summaries, file assertions, GraphQL results, migration result/status/details, provider session/thread assertions.
- Owned processes and temporary state to clean up: Test Fastify/WebSocket/provider subprocesses and all temp directories created by the test run.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| None initially | N/A | Critical behaviors belong in repository-resident durable coverage | N/A |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real user memory corpus deletion | Unsafe and unnecessary; upstream supplement already supplies content-safe aggregate evidence | None if isolated classification/path tests pass | Never mutate the user's corpus during validation. |
| Browser/Electron rendering | No changed client/shell boundary | Negligible | None unless repository evidence exposes a frontend contract change. |
| Every provider/model combination | Representative continuation is proportionate; change does not touch provider code | Bounded provider-specific environmental variance | Use current deterministic/live representative evidence and state residual honestly. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at initial investigation | N/A | SR-004 / ARCH-REV-003 / CRR-003 define the failed-retained outcome exactly | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Post-repository confidence: `97.4%`
- Broader validation decision: `Required` (lifecycle plus live API/provider; no browser/desktop)
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Stale snapshot assertions were replaced before judging implementation behavior. Repository checks passed; live broader validation is recorded in the execution report.
