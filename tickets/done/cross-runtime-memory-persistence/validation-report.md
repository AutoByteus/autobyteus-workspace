# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/review-report.md`
- Current Validation Round: 7
- Trigger: User requested explicit memory-restore / restore-from-memory confidence after Round 6 delivery handoff.
- Prior Round Reviewed: Round 6 pass plus latest Round 11 code-review pass.
- Latest Authoritative Round: 7

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Round 5 review passed and validation requested | N/A | No | Pass; durable validation updated | No | Added/updated repository-resident validation for baseline cross-runtime memory persistence, GraphQL exposure, and no-provider-compaction-mutation guardrails. |
| 2 | Round 6 review passed after CR-003 and segmented archive implementation | No unresolved Round 1 failures | No | Pass; durable validation updated | No | Added validation for provider boundary rotation, segmented archive corpus reads, retry/restore continuation, and projection over archive segments. |
| 3 | User requested live Codex E2E plus broader non-Claude regression coverage | Round 2 storage scenarios rerun; live Codex E2E added | Yes | Fail pending user triage of one live mixed AutoByteus+Codex team E2E | No | Memory-specific validation passed, live Codex memory passed, several stale/brittle test issues were fixed and rerun; one mixed-runtime LM Studio tool-call adherence failure remained for user triage. |
| 4 | User de-scoped the remaining LM Studio mixed-team output-adherence failure | Round 3 unresolved failure reviewed | No memory or code-blocking failures | Pass; durable validation updated | No | The remaining failure is explicitly not treated as a product/memory blocker. Latest result is pass with validation-code changes requiring code review. |
| 5 | Code review CR-004 local generated state artifact cleanup | Round 4 pass plus CR-004 | No | Pass; CR-004 fixed | No | Removed generated `autobyteus-server-ts/workspaces.json`, added `/workspaces.json` ignore under `autobyteus-server-ts/.gitignore`, and updated cleanup notes. |
| 6 | Round 11 source fixes for CR-005/CR-006/CR-007 landed after prior validation | Round 11 code-review pass and prior validation context | No | Pass | No | Focused validation passed for read-only no-mutation, Codex different-stable-id duplicate compaction surfaces, Claude same-uuid status/boundary behavior, live Codex memory persistence, and type checks. |
| 7 | User requested explicit memory restore coverage | Round 6 pass and AutoByteus restore evidence | Yes, stale test setup only | Pass; durable validation updated | Yes | Added focused restore validation for `autobyteus-ts` working-context snapshot restore and AutoByteus server agent/team restore/projection E2E. One stale test fixture was updated to create its direct-write parent directory explicitly under CR-005 no-mutation rules. |

## Validation Basis

Validation was derived from the approved requirements, latest Round 11 reviewed package, prior validation evidence, and the user's additional live/broad E2E request. Round 7 additionally focused on the user's explicit restore-from-memory concern.

Round 6 focused on the source fixes that landed after the prior validation pass:

- CR-005 read-only behavior: `RunMemoryFileStore` construction and complete-corpus/archive reads must not create a missing run directory; write paths must still create parent directories at write time.
- CR-005 GraphQL/API behavior: memory-view `includeArchive` reads must not mutate/create missing run directories.
- CR-006 Codex duplicate compaction surfaces: duplicate `thread/compacted` plus raw `type=compaction` events in the same thread/turn boundary window must be suppressed even when stable ids differ.
- CR-007 Claude same-uuid behavior: `claude.status_compacting` provenance remains distinct from `claude.compact_boundary`, and rotation occurs at the completed boundary marker even when provider uuid/operation id is reused.
- Prior live Codex no-WebSocket persistence confidence after the file-store no-mkdir source change.
- Type safety after the source fixes.

Round 7 focused on restore coverage:

- `autobyteus-ts` working-context snapshot restore, bootstrap restore step, and agent factory restore behavior.
- AutoByteus single-agent GraphQL runtime restore/continue and run-history projection after terminate/restore/continue.
- AutoByteus team GraphQL runtime restore/continue and team-member projection after terminate/restore/continue.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Round 3 retained the no-legacy stance for old monolithic `raw_traces_archive.jsonl`. The new live/broad failures were not compatibility-wrapper or legacy-retention failures.

## Validation Surfaces / Modes

- Live Codex app-server E2E through `AgentRunManager`, `CodexAgentRunBackendFactory`, and `AgentRunMemoryRecorder`, with no websocket attached, followed by filesystem assertions against memory files.
- Live Codex runtime GraphQL/WebSocket E2E for MCP `speak` approval and auto-execution.
- Live Codex app-server client/thread/bootstrap/team integration suites.
- AutoByteus server E2E GraphQL suites excluding Claude E2E files.
- AutoByteus backend/factory unit/integration/live LM Studio suites.
- `autobyteus-ts` LM Studio agent and agent-team flow suites after copying `.env.test` from the main repo.
- In-process deterministic integration/unit suites retained from Round 2 for memory recorder, converter, archive, projection, and GraphQL memory view behavior.
- TypeScript/build checks.
- Focused `autobyteus-ts` working-context snapshot restore and AutoByteus server agent/team restore/projection E2E.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence`
- OS/runtime observed in test output: macOS/Darwin, Node `v22.21.1`, Vitest `4.0.18`, pnpm `10.28.2`
- Codex CLI: present; live Codex E2E run with `RUN_CODEX_E2E=1`
- LM Studio: available at `http://127.0.0.1:1234`; AutoByteus flow/backend tests used live LM Studio models.
- Claude E2E: intentionally not run per user request.
- Copied env: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test` to `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-ts/.env.test`.

## Lifecycle / Upgrade / Restart / Migration Checks

- Live Codex memory E2E verified a standalone run can persist memory without a websocket subscriber.
- Codex backend factory restore/approval tests were rerun with `CODEX_APP_SERVER_SANDBOX=workspace-write` to exercise approval semantics; the same test fails under `danger-full-access` because approval is bypassed by environment, not by implementation.
- Managed messaging install/start/update/rollback E2E was rerun after isolating `AUTOBYTEUS_SERVER_HOST`; passed.
- Mixed AutoByteus+Codex team lifecycle create/terminate/restore/continue was rerun and remains failing after restore at the AutoByteus coordinator `send_message_to` execution step.
- Round 7 AutoByteus-only runtime restore/continue and projection E2E passed for both single-agent and team-member flows.
- Historical migration/read compatibility for old `raw_traces_archive.jsonl` remains out of scope by approved no-compatibility stance.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-001 | REQ-001, REQ-002, REQ-008, AC-001, AC-007 | Standalone Codex deterministic integration through `AgentRunManager` without WebSocket subscriber | Pass | `cross-runtime-memory-persistence.integration.test.ts`; prior Round 2 rerun passed. |
| VAL-001-LIVE | User live-E2E request; REQ-001/002/008 | Live Codex app-server run through `AgentRunManager` without WebSocket subscriber, then filesystem assertions | Pass | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` passed (`1` file, `1` test). |
| VAL-002 | REQ-003, REQ-004, REQ-008, AC-002, AC-007 | Standalone Claude deterministic integration | Pass | Prior Round 2 deterministic suite passed; Claude live E2E skipped by explicit user scope. |
| VAL-003 | REQ-005, AC-005 | Claude team backend/member deterministic integration | Pass | Prior Round 2 suite passed; Claude live E2E skipped. |
| VAL-004 | REQ-006, AC-006, AC-015 | Native AutoByteus validation | Pass | Shared/server memory suites and AutoByteus backend/factory suites passed. |
| VAL-005 | REQ-007, AC-003 | Tool lifecycle integration + accumulator unit tests | Pass | Server combined memory suite passed; Codex unit batch passed after stale expectations were updated. |
| VAL-006 | OQ-001, AC-003 | Accumulator tests | Pass | Active-turn fallback and deterministic fallback-turn coverage pass. |
| VAL-007 | AC-004 | Integration + accumulator tests | Pass | Reasoning raw trace and assistant snapshot reasoning field verified. |
| VAL-008 | REQ-009, AC-008 | Projection unit/integration tests | Pass | Explicit `memoryDir` basename fallback plus active/archive segmented corpus projection pass. |
| VAL-009 | GraphQL/API visibility | GraphQL memory view E2E | Pass | Query returns raw trace `id` and `sourceEvent` for archive plus active traces. |
| VAL-010 | REQ-013, REQ-014, AC-012 | Codex converter + recorder integration | Pass | `thread/compacted` emits one marker and one complete archive segment; duplicate raw `type: "compaction"` in same boundary window emits no extra marker. |
| VAL-011 | REQ-013, REQ-014, AC-013 | Claude converter + recorder integration | Pass | `status_compacting` writes non-rotating provenance; `compact_boundary` rotates prior active traces into one complete segment. |
| VAL-012 | REQ-015, AC-014 | Integration assertions + guardrail searches | Pass | Provider rotation created no semantic/episodic files and did not invoke native `MemoryManager`/semantic compaction paths. |
| VAL-013 | REQ-016 | Shared segmented archive manager tests | Pass | `RunMemoryFileStore` and `RawTraceArchiveManager` suites cover manifest, pending/complete handling, idempotent retry, active-plus-archive reads. |
| VAL-014 | Round 6 retry/restore focus | Accumulator + writer integration | Pass | Marker-only/pending replay covered by unit tests; restored writer continued sequence over archive plus active marker. |
| VAL-015 | User broad Codex-regression request | Codex unit/integration/live GraphQL suites | Pass | Codex unit batch passed (`14` files, `58` tests); live/integration batch passed (`8` files, `19` tests); backend factory passed with `CODEX_APP_SERVER_SANDBOX=workspace-write`; Codex MCP GraphQL speak tests passed after updating TOOL_LOG predicate. |
| VAL-016 | User broad AutoByteus-regression request | AutoByteus backend/factory and `autobyteus-ts` flows | Pass | Backend/factory batch passed (`7` files, `26` tests); core `autobyteus-ts` single/team flows passed; broader non-Ollama/non-benchmark flow failures passed when rerun isolated with longer timeouts. |
| VAL-017 | User broad server E2E request except Claude | `autobyteus-server-ts/tests/e2e` non-Claude | Fail | Initial all-non-Claude server E2E run found failures; stale/env/tool-log failures were fixed and rerun pass; mixed AutoByteus+Codex team runtime E2E remains failing. |
| VAL-018 | User explicit memory-restore concern | `autobyteus-ts` working-context restore plus AutoByteus GraphQL runtime restore/projection E2E | Pass | Working-context snapshot restore suite passed (`4` files, `15` tests); AutoByteus agent runtime restore/projection E2E passed (`2` tests); AutoByteus team runtime restore/projection E2E passed (`2` tests). |

## Test Scope

Round 3 intentionally broadened beyond the memory-specific storage boundary. The memory-specific implementation passed live Codex and deterministic recorder/archive validation. The broad regression run found unrelated stale/brittle validation issues, all resolved except a live mixed-runtime team LM Studio output-adherence failure. In Round 4, the user explicitly de-scoped that remaining LM Studio output issue as non-blocking for this validation.

## Validation Setup / Environment

Commands were run from:

`/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence`

Environment setup performed:

- Copied `.env.test` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test` to `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-ts/.env.test`.
- Used `RUN_CODEX_E2E=1` for live Codex suites.
- Used `RUN_LMSTUDIO_E2E=1` for live AutoByteus/LM Studio suites.
- Used `CODEX_APP_SERVER_SANDBOX=workspace-write` for approval-sensitive Codex tests.

## Tests Implemented Or Updated

Round 7 durable validation/test update:

- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-ts/tests/integration/memory/working-context-snapshot-restore.test.ts`
  - The stale schema-reset fixture now creates the direct-write parent directory explicitly before writing `semantic.jsonl`.
  - This aligns the test with CR-005 no-mutation behavior: store/snapshot constructors and read-only paths must not create missing run directories.

Round 3 durable validation/test updates:

- Added `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts`
  - Gated by `RUN_CODEX_E2E=1`.
  - Runs live Codex app-server backend without WebSocket attachment.
  - Asserts `raw_traces.jsonl`, `working_context_snapshot.json`, no monolithic `raw_traces_archive.jsonl`, persisted user/assistant ids and turn ids, and a response token in both raw traces and snapshot.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/.gitignore`
  - Added exceptions so new durable tests under `tests/e2e/memory` are not ignored by the broad `memory` ignore pattern.
  - Added `/workspaces.json` so validation/runtime-generated server-root workspace registries do not appear as repository changes.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
  - Current `postUserMessage` expectations include `turnId`.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts`
  - Current Codex dynamic-tool spec uses `inputSchema`.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts`
  - Expected current non-shared deletion message.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`
  - Added `getBundledSourceRootPath` to the test materializer mock required by current package registry code.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts`
  - Isolated `AUTOBYTEUS_SERVER_HOST` so runtime-only internal URL tests do not inherit the shell's internal server URL as the public URL.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - Made Codex MCP `TOOL_LOG` success predicate accept the current structured output shape instead of only exact `{"ok":true}`.

Round 2 durable validation retained:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts`

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated in Round 7:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-ts/tests/integration/memory/working-context-snapshot-restore.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Pending — this Round 7 handoff returns the cumulative package to code_reviewer.`
- Previously added/updated durable validation paths retained from earlier validation rounds:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/.gitignore`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - Round 2 paths listed above remain changed.
- Post-validation code review artifact: Pending follow-up code review for the Round 7 validation-test update. Previous code review artifact remains `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/review-report.md`.

## Other Validation Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/done/cross-runtime-memory-persistence/validation-report.md`

## Temporary Validation Methods / Scaffolding

- No repository-external temporary validation harness was retained.
- Per-test temporary directories were created by tests.
- Live Codex/LM Studio validation used normal repository test harnesses.

## Dependencies Mocked Or Emulated

- Deterministic memory recorder/converter suites use backend doubles for storage-boundary coverage.
- Live Codex E2E used the real Codex app-server backend and filesystem persistence.
- Live AutoByteus/LM Studio suites used the available LM Studio server and selected live models.
- GraphQL was executed in-process against the built schema.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | No unresolved storage-boundary failures | N/A | Baseline storage scenarios remained passing; live Codex E2E added and passed | `codex-live-memory-persistence.e2e.test.ts` passed; deterministic memory suites remained passing. | User requested live Codex to make the E2E claim real. |
| 3 initial broad run | Agent definitions message mismatch | Stale durable validation expectation | Fixed and rerun passed | `agent-definitions-graphql.e2e.test.ts` passed (`5` tests). | Test expected old “team-owned” wording; implementation returns current “non-shared” wording. |
| 3 initial broad run | Agent-team definitions missing mock method | Stale durable validation mock | Fixed and rerun passed | `agent-team-definitions-graphql.e2e.test.ts` passed (`4` tests). | Test mock now matches current `BuiltInMaterializerLike`. |
| 3 initial broad run | Managed messaging inherited public URL env | Test environment isolation issue | Fixed and rerun passed | Managed messaging GraphQL/update E2E passed (`4` files batch included `18` tests). | Public URL is explicitly isolated from runtime-only internal URL. |
| 3 initial broad run | Codex MCP `TOOL_LOG` predicate mismatch | Stale durable validation predicate | Fixed and rerun passed | `CODEX_APP_SERVER_SANDBOX=workspace-write RUN_CODEX_E2E=1 ... agent-runtime-graphql.e2e.test.ts -t "Codex.*speak"` passed (`2` tests). | Current `TOOL_LOG` carries structured output shape. |
| 3 initial broad run | `autobyteus-ts` broad flow timeouts/XML miss under parallel load | Live/parallel LM Studio timing and non-determinism | Isolated reruns passed | `handler-memory-flow`, `memory-llm-flow`, `agent-team-streaming-flow`, and `agent-single-flow-xml` each passed isolated with longer timeout. | Initial broad batch had `4` failed / `32` passed; isolated failures all passed. |
| 3 initial broad run and isolated rerun | Mixed AutoByteus+Codex team restore continuation | Initially Local Fix candidate | De-scoped by user as non-blocking LM Studio output adherence | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 CODEX_APP_SERVER_SANDBOX=workspace-write ... mixed-team-runtime-graphql.e2e.test.ts` failed only because LM Studio emitted textual `[TOOL_CALL] send_message_to {...}` instead of a structured tool call. | User explicitly stated this is an LM Studio output problem and does not need to be cared about for this validation. |
| Code review Round 8 CR-004 | Generated `autobyteus-server-ts/workspaces.json` visible as untracked local state | Local Fix | Fixed | `rm -f autobyteus-server-ts/workspaces.json`; `/workspaces.json` added to `autobyteus-server-ts/.gitignore`; `git check-ignore -v autobyteus-server-ts/workspaces.json` confirms ignore. | Cleanup section updated. |
| Code review Round 11 CR-005 | Read-only complete-corpus/archive reads could create missing run directories | Local Fix in source | Fixed and validated | Shared memory unit suite passed (`3` files, `15` tests); server memory/GraphQL focused suite passed (`6` files, `49` tests). | Includes direct complete-corpus no-mutation and GraphQL memory-view includeArchive no-mutation coverage. |
| Code review Round 11 CR-006 | Codex same-window de-dupe did not suppress duplicate compaction surfaces with different stable ids | Local Fix in source | Fixed and validated | Server focused suite passed, including `codex-thread-event-converter.test.ts` and cross-runtime integration. | Covers thread-first and raw-first different-stable-id duplicate cases. |
| Code review Round 11 CR-007 | Claude status/boundary boundary keys could collide when uuid/operation id was reused | Local Fix in source | Fixed and validated | Server focused suite passed, including `claude-session-event-converter.test.ts` and cross-runtime integration. | Covers same uuid for status provenance and completed compact boundary rotation. |
| Round 7 restore focus | `working-context-snapshot-restore.test.ts` schema-reset fixture wrote `semantic.jsonl` without creating the parent directory | Stale durable validation setup | Fixed and rerun passed | Restore-focused `autobyteus-ts` suite passed (`4` files, `15` tests). | The fixture now explicitly creates the direct-write parent directory instead of relying on constructors to mutate the filesystem, matching CR-005 behavior. |

## Scenarios Checked

- Live standalone Codex memory persistence to active raw traces and working-context snapshot without WebSocket attachment.
- Codex app-server client, thread, bootstrap, team backend, and backend factory approval/restore coverage.
- Codex GraphQL MCP approval/auto-execution over WebSocket.
- Standalone deterministic Codex/Claude memory persistence without WebSocket attachment.
- Claude team member memoryDir construction and member memory writes (deterministic; live Claude E2E skipped).
- Tool call/result and denial de-duplication, turn-id fallback, lifecycle-before-command ordering, segment/reasoning flush.
- Native AutoByteus server-recorder skip and native compaction/store behavior.
- Codex `thread/compacted` and raw `type: "compaction"` duplicate-window de-dupe.
- Claude `status_compacting` non-rotating provenance and `compact_boundary` rotation.
- Provider boundary marker-only, pending/no-complete, complete-replay retry states.
- Active plus segmented archive memory view/projection ordering/dedupe.
- Restore sequence continuation over archive plus active records.
- GraphQL raw trace `id` and `sourceEvent` exposure.
- Server non-Claude E2E broad sweep; stale/brittle failures fixed where clearly validation-side.
- AutoByteus backend/factory and `autobyteus-ts` agent/team flow regression coverage.
- Explicit working-context snapshot restore, AutoByteus single-agent restore/continue, and AutoByteus team restore/continue projection coverage.
- Build/type checks.

## Passed

Memory-specific and focused commands passed:

Round 7 memory-restore focused validation passed:

- Initial command exposed one stale test setup failure:
  - `pnpm -C autobyteus-ts exec vitest run tests/integration/memory/working-context-snapshot-restore.test.ts tests/integration/agent/working-context-snapshot-restore-flow.test.ts tests/unit/agent/bootstrap-steps/working-context-snapshot-restore-step.test.ts tests/unit/agent/factory/agent-factory.test.ts --reporter=dot`
  - Result before fix: failed (`1` failed, `14` passed) because the schema-reset fixture wrote `agents/agent_schema_reset/semantic.jsonl` without creating its parent directory.
  - Classification: stale validation fixture under CR-005 no-mutation semantics, not a product source failure.
- After fixture fix, the same `autobyteus-ts` restore-focused command passed (`4` files, `15` tests).
- `RUN_LMSTUDIO_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "creates a run, restores it, and continues streaming on the same websocket|serves run history and projection after terminate, restore, and continue" --testTimeout=240000 --hookTimeout=60000 --reporter=dot` — passed (`1` file, `2` tests, `13` skipped).
- `RUN_LMSTUDIO_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --testTimeout=240000 --hookTimeout=60000 --reporter=dot` — passed (`1` file, `2` tests).

Round 6 focused validation after CR-005/CR-006/CR-007 source fixes passed:

- `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/run-memory-file-store.test.ts tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/file-store.test.ts --reporter=dot` — passed (`3` files, `15` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/e2e/memory/memory-view-graphql.e2e.test.ts --reporter=dot` — passed (`6` files, `49` tests).
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts --testTimeout=180000 --hookTimeout=60000 --reporter=dot` — passed (`1` file, `1` test).
- `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `git status --short --untracked-files=all | grep 'workspaces.json' || true` — no generated workspace artifact visible after validation reruns.


- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` — passed (`1` file, `1` test).
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` — passed (`1` file, `7` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/run-history/memory-layout-and-projection.integration.test.ts` — passed (`1` file, `8` tests).
- `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/run-memory-file-store.test.ts tests/unit/memory/raw-trace-archive-manager.test.ts tests/unit/memory/file-store.test.ts tests/unit/memory/compactor.test.ts tests/unit/memory/working-context-snapshot-store.test.ts tests/unit/memory/memory-manager.test.ts tests/unit/memory/memory-manager-working-context-snapshot-persistence.test.ts tests/unit/memory/compaction-policy.test.ts tests/unit/memory/compaction-window-planner.test.ts tests/unit/memory/compaction-snapshot-builder.test.ts tests/unit/memory/compaction-result-normalizer.test.ts tests/unit/memory/compacted-memory-schema-gate.test.ts` — passed (`12` files, `40` tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/unit/agent-memory/run-memory-writer.test.ts tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/agent-memory/memory-file-store.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts tests/unit/run-history/projection/run-projection-provider-registry.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts tests/integration/agent-team-execution/claude-team-run-backend-factory.integration.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/e2e/memory/memory-view-graphql.e2e.test.ts` — passed (`15` files, `79` tests).

Codex-related commands passed:

- Codex unit batch — passed (`14` files, `58` tests) after updating two stale expectations.
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-management/codex/client/codex-app-server-client-manager.integration.test.ts tests/integration/runtime-management/codex/client/codex-app-server-client.integration.test.ts tests/integration/services/codex-model-catalog.integration.test.ts tests/integration/runtime-execution/codex-app-server/thread/codex-thread-manager.integration.test.ts tests/integration/runtime-execution/codex-app-server/thread/codex-thread.integration.test.ts tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/codex-team-run-backend.integration.test.ts` — passed (`8` files, `19` tests).
- `CODEX_APP_SERVER_SANDBOX=workspace-write RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` — passed (`1` file, `11` tests). Note: same file failed under inherited `danger-full-access` because approval prompts are intentionally bypassed there.
- `CODEX_APP_SERVER_SANDBOX=workspace-write RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "Codex.*speak" --testTimeout=180000 --hookTimeout=60000` — passed (`2` tests, `13` skipped by filter).

Broader AutoByteus/server/client regression commands passed or were resolved:

- `RUN_LMSTUDIO_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend-factory.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend-factory.lmstudio.integration.test.ts tests/integration/agent-team-execution/autobyteus-team-run-backend.integration.test.ts` — passed (`7` files, `26` tests).
- `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts` — passed (`2` files, `2` tests) after copying `.env.test`.
- Broader `autobyteus-ts` non-Ollama/non-benchmark flow batch initially reported `4` failed / `32` passed under parallel LM Studio load. The four failures were rerun isolated and passed:
  - `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/handler-memory-flow.test.ts --testTimeout=60000 --hookTimeout=30000` — passed.
  - `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/memory-llm-flow.test.ts --testTimeout=60000 --hookTimeout=30000` — passed.
  - `pnpm -C autobyteus-ts exec vitest run tests/integration/agent-team/streaming/agent-team-streaming-flow.test.ts --testTimeout=60000 --hookTimeout=30000` — passed.
  - `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/agent-single-flow-xml.test.ts --testTimeout=60000 --hookTimeout=30000` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts` — passed (`4` files, `18` tests) after validation-side fixes.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts run build` — passed.

Guardrail searches from Round 2 remained valid:

- No old monolithic `raw_traces_archive.jsonl` active source/test references outside approved archive manager internals.
- No server recorder/native `MemoryManager` references in Codex/Claude provider memory paths.
- No raw Codex compaction parsing in `agent-memory` recorder services.
- No destructive provider compaction/status/boundary behavior (delete/prune/archive movement outside approved rotation/rewrite/retention/windowing/runtime injection) observed.

## Failed

None blocking after user clarification and the Round 7 stale restore-test fixture fix.

Round 7 initially found a stale validation fixture: `working-context-snapshot-restore.test.ts` wrote a direct legacy `semantic.jsonl` without creating its parent directory. This was fixed in the test fixture and rerun passing; it is not classified as a product source failure.

The following live broad E2E failure was observed but is explicitly de-scoped by the user as an LM Studio output-adherence issue, not a memory-persistence or product blocker:

- Command:
  - `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 CODEX_APP_SERVER_SANDBOX=workspace-write pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts --testTimeout=240000 --hookTimeout=60000`
- Result:
  - Failed (`1` file, `1` test), duration about `211s`.
- Failure:
  - `Timed out waiting for team websocket message 'coordinator send_message_to execution'.`
- Observed behavior:
  - After team restore, the AutoByteus/LM Studio coordinator received the direct instruction to call `send_message_to` exactly once.
  - Instead of emitting a structured tool call that the runtime executed, it emitted assistant text:
    - `[TOOL_CALL] send_message_to {"recipient_name":"specialist", ...}`
  - Because no structured `send_message_to` execution occurred, the expected coordinator-to-specialist inter-agent delivery after restore never happened.
- Classification:
  - De-scoped/non-blocking for this validation after user clarification. The storage-memory implementation passed, and this failure is attributable to LM Studio output adherence in a live test.

Initial all-non-Claude server E2E sweep before fixes:

- Command shape:
  - `CODEX_APP_SERVER_SANDBOX=workspace-write RUN_CODEX_E2E=1 RUN_LMSTUDIO_E2E=1 pnpm -C autobyteus-server-ts exec vitest run $(find autobyteus-server-ts/tests/e2e -type f -name '*.test.ts' ! -name '*claude*' ...)`
- Result:
  - `6 failed | 23 passed | 1 skipped (30)` files; `9 failed | 83 passed | 5 skipped (97)` tests.
- Resolution:
  - Five failure groups were stale/env/tool-log/live-parallel issues and were either fixed/rerun passing or rerun isolated passing.
  - The mixed AutoByteus+Codex team E2E above is de-scoped by user clarification as LM Studio output adherence.

## Not Tested / Out Of Scope

- Claude live E2E was intentionally not run because the user asked to run all other E2E except Claude E2E.
- `autobyteus-ts` Ollama-specific and benchmark flow tests were not run as part of the broadened flow pass; Ollama was not available at `127.0.0.1:11434`, and benchmark tests are explicitly gated.
- A full all-non-Claude server E2E rerun after validation-side fixes was not attempted because the known mixed-team LM Studio output-adherence failure would still fail the sweep but is now explicitly de-scoped.
- Forcing a real provider auto-compaction event through long live Codex/Claude token pressure was not attempted; converter-realistic payloads plus live Codex normal memory persistence covered the approved storage boundary.
- Future append-only provider compaction marker persistence beyond the approved converter-owned marker path remains out of scope unless separately approved.

## Blocked

Not blocked. The only remaining observed failure was explicitly de-scoped by the user as LM Studio output adherence.

## Cleanup Performed

- No external temporary validation harness was retained.
- Test-created temp directories are owned by test cleanup hooks.
- CR-004 cleanup: removed generated `autobyteus-server-ts/workspaces.json` from the worktree and added `/workspaces.json` to `autobyteus-server-ts/.gitignore` so reruns do not expose server-root workspace registry state as a repository change.
- The copied `autobyteus-ts/.env.test` remains in the worktree as requested for complete flow tests.

## Classification

- Pass, with repository-resident durable validation updated in Round 7.
- Memory-restore validation status: passed, including `autobyteus-ts` working-context snapshot restore, AutoByteus single-agent restore/continue, and AutoByteus team restore/continue projection E2E.
- Because Round 7 updated a durable validation test, the package must return through `code_reviewer` before delivery.
- The mixed-runtime team LM Studio output-adherence failure remains explicitly removed from the blocking gate by user clarification.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- The user's concern was valid: the earlier deterministic Codex integration was not a live E2E. Round 3 added a live Codex memory persistence E2E and it passed.
- The main cross-runtime memory functionality under review passed: live Codex file creation, deterministic Codex/Claude/AutoByteus recorder behavior, segmented archives, projection, GraphQL memory fields, and guardrails all passed.
- Broader non-Claude testing found and corrected several stale/brittle validation issues earlier; those durable validation changes have since returned through code review, and the latest Round 11 review passed before this focused validation round.
- CR-004 generated local state artifact remained absent after validation reruns.
- Round 11 CR-005/CR-006/CR-007 focused validation passed.
- Round 7 explicit restore validation passed after a stale fixture fix.
- The only remaining observed failure is outside the storage file assertion and was explicitly de-scoped by the user as LM Studio output adherence, not a blocker.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round 7 explicit restore validation passed after updating one stale durable test fixture. Live Codex memory E2E passed, memory-specific validation passed, AutoByteus restore/projection E2E passed, broad non-Claude regression issues were either fixed/rerun passing or explicitly de-scoped by the user as LM Studio output adherence, and CR-004 generated workspace state cleanup remains fixed. Repository-resident durable validation changed in Round 7, so route to `code_reviewer` before delivery.
