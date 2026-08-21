# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/design-spec.md`
- Supplemental Task Artifacts: `system-prompt-activity-ux-spec.md`; `system-instruction-raw-trace-schema.md`; `activity-transparency-ux-spec.md` (context only); `data-migration-conventions-audit.md`; `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; `autobyteus-server-ts/README.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/solution-revision-record.md` (`SR-012`, `SR-014`, `SR-015`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/architecture-review-revision-record.md` (`ARCH-REV-002`)
- Implementation Handoff / Revision: `implementation-handoff.md`; `implementation-revision-record.md` (`IR-002`)
- Code Review Report / Revision: `code-review-report.md`; `code-review-revision-record.md` (`CRR-002`)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: CRR-002 pass plus the user's request for real backend/frontend, Codex GPT-5.6, Daily Assistant, imported AutoByteus agents, Classroom Simulation Team, and browser interaction.
- Prior Investigation Reviewed: N/A. This canonical artifact was created before durable coverage edits or final execution and then updated with actual results.
- Latest Authoritative Investigation: this file.

## Current Requirement And Design Basis

Prove REQ-SP-001–009 and AC-SP-001–011 without expanding scope. Native, Claude SDK, and Codex must capture the exact AutoByteus-supplied instruction at their real handoff, persist exactly `{id, ts, trace_type, content, source_event}`, publish the same identity, and converge on one provider-neutral live/reload Activity entry. Standalone and team-member paths must match. Normal restart/hydration must read only the active trace; rotation may remove the entry and must not cause archive lookup. Event Monitor and existing tool/compaction behavior remain unchanged. Desktop/mobile disclosure must be collapsed by default, exact, selectable, keyboard/pointer and screen-reader operable, and safe under long content. Existing data remains directly usable with no migration. `MP-CR-001` is not reachable and authorizes no retry implementation or retry-only coverage.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Native, Claude, Codex capture and persistence | Added | BEH-SP-002–004, REQ-SP-001–003/008–009 | Direct adapter tests plus live real-runtime evidence for all three. |
| Semantic live/reload contract | Added | BEH-SP-009–010, AC-SP-010–011 | GraphQL, WebSocket, JSONL, Memory Inspector, and DOM identity/content parity. |
| Activity typed trajectory and disclosure | Changed | BEH-SP-001/008, REQ-SP-005/007 | Durable browser probe and real full frontend desktop/mobile journey. |
| Active-only lifecycle | Preserved/extended | BEH-SP-005/006/010 | Production-store rotation plus actual server restart and explicit archive-only inspection. |
| Event Monitor / tool/compaction | Preserved | BEH-SP-007, REQ-SP-006 | Baseline equality in durable GraphQL E2E and normal real-run conversation/tool observations. |
| Persisted data | Added, forward-only | SR-015; approved `Directly Usable — No Migration` | Existing rows remain readable; no backfill/fallback/legacy test. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Boundary | Repository Evidence | Residual Before Broader Validation | Selected Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | capture, strict row, active projection | focused unit/integration | provider mocks | Live API |
| API / transport | Yes | standalone/team WS + GraphQL | AE2E-SI-001/002 | real process composition | Live WebSocket/GraphQL |
| Frontend component/state | Yes | typed admission/store/render | focused Nuxt tests | integrated persisted run | Browser |
| Browser journey | Yes | Activity drawer/card | BE2E-SI-001 | real history selection/backend | Browser |
| Auth/session | No new policy | existing selected-run boundary | existing behavior | none material | normal local session |
| Web-equivalent desktop renderer | Yes | Nuxt workspace | real Chrome probe | none after browser run | Browser preferred |
| Electron shell | No | no IPC/preload/window/package change | N/A | none material | no Electron launch |
| Process/lifecycle | Yes | restart/reopen/rotation | deterministic E2E | actual process restart | Lifecycle |
| Persisted-data transition | Yes | additive current JSONL model | disposable fixtures | actual production-store rotation | Lifecycle/API |
| Worker/team coordination | Yes | team event routing | unit/contract tests | real inter-member traffic | Live team |
| External integration | Yes | Native/Claude/Codex | one env-gated Codex durable test | real all-runtime equality | Live providers |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency`
- Stack: pnpm workspace; Node/TypeScript Fastify + GraphQL/WebSocket; Nuxt/Vue/Pinia; Electron wrapper; Vitest; Playwright Core/Chrome; Native, Claude SDK, and Codex app-server runtimes.
- Constraints: run Vitest once (`--no-watch` / `--run`); broad Nuxt semantic typecheck is known toolchain/baseline-noisy; production server TypeScript, Nuxt build, focused tests, browser probes, and real runtime execution are authoritative. Browser is preferred over Electron for renderer-equivalent behavior.
- Secrets available: Yes, imported from the user-specified source into a task-owned SQLite vault without printing values; the vault database and adjacent key were scrubbed after testing.

| Instruction / Configuration | Authority / Learned Constraint |
| --- | --- |
| root `README.md`, root/package manifests | full-stack, live E2E, build scripts |
| `autobyteus-server-ts/AGENTS.md`, `README.md` | focused Vitest, production build, disposable real-runtime state |
| `autobyteus-web/AGENTS.md`, `README.md`, `ARCHITECTURE.md` | `test:nuxt --run`; browser-first renderer validation |
| `production_data_migration_conventions.md` | one current model, safe disposable fixtures, no speculative fallback |
| `test-support/live-e2e/*` | sanitized external-runtime capability conventions |

| Component | Setup / Runtime | Readiness | Cleanup |
| --- | --- | --- | --- |
| Backend | built server, isolated data root, SQLite DB, port 54587 | `/rest/health`, GraphQL, WS | owned process terminated |
| Frontend | Nuxt dev, backend proxy, port 54588 | semantic `/agents`/`/workspace` DOM | owned process terminated |
| Browser bridge | real Chrome/Playwright, port 54589 | authenticated health and actual `/browser/open` | bridge/browser terminated |
| Provider identities | Native `gpt-5.6-luna`; Claude SDK `sonnet`; Codex `gpt-5.6-sol` | catalog plus exact-token turns | task DB/key scrubbed; raw fixtures retained |
| Agent/team package | `/Users/normy/autobyteus_org/autobyteus-agents` roots | Daily Assistant and Classroom Team visible/runnable | source unmodified |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Representative setup: existing user/reasoning/assistant/tool rows, new exact five-key run row, and a run where production `RunMemoryFileStore.archiveCompactedRawTraces` moves the system row into a completed segment.
- Result: normal current readers loaded existing rows; post-restart active projection/Memory Inspector returned no archived system row; explicit archive selection still found the preserved row. No migration, dual read/write, fallback, reconstruction, or version branch was used.
- Upstream ambiguity: None.

## Existing Durable Coverage Inventory And Decisions

| Coverage | Validity | Action / Result |
| --- | --- | --- |
| core `system-instruction-trace`, system-prompt processing, run-memory store | Still Valid | rerun: 3 files / 11 tests pass |
| Native/Claude/Codex backend capture tests | Still Valid | rerun within 12 server files / 83 tests pass |
| mapper/team/debug/parser/projection tests | Still Valid | rerun server/web focused suites pass |
| recent projection GraphQL E2E | Needs Update | AE2E-SI-001 added; 9 tests pass |
| Memory View GraphQL E2E | Needs Update | AE2E-SI-002 added; 6 tests pass |
| Codex live memory E2E | Needs Update | current manager/factory API plus exact system-row assertion and GPT-5.6 catalog choices; live `gpt-5.6-sol` pass |
| web component/store/hydration/parser tests | Still Valid | 8 files / 80 tests pass |
| prior browser probes | Out Of Scope for this card | BE2E-SI-001 added |
| Electron shell isolation | Out Of Scope | no shell-specific change; not run |

## Stale / Remove Decisions

None. No existing coverage was removed. No retry scenario was added for the withdrawn/unreachable MP-CR-001 premise.

## Durable Coverage Added Or Updated

| Scenario | Path | Decision |
| --- | --- | --- |
| AE2E-SI-001 | `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Updated: standalone/team raw-ID/content parity, Event Monitor invariant, active-only rotation absence. |
| AE2E-SI-002 | `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` | Updated: exact five-key run row and nullable turn/seq GraphQL scope. |
| LIVE-SI-CODEX | `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Updated stale test API; assert exact live row; prefer actual GPT-5.6 variants. |
| BE2E-SI-001 | `autobyteus-web/tests/e2e/fixtures/system-instruction-activity.page.vue`; `autobyteus-web/tests/e2e/system-instruction-activity-probe.mjs`; `autobyteus-web/package.json` | Added durable production-component browser probe and script. |

## Repository Coverage Execution Results

| Order | Command / Scope | Result | Evidence |
| --- | --- | --- | --- |
| 1 | core 3 focused files | Pass: 11 tests | `probes/api-e2e/repository/core-memory-focused.txt` |
| 2 | server 12 focused provider/transport/projection files | Pass: 83 tests | `probes/api-e2e/repository/server-focused-regression.txt` |
| 3 | GraphQL projection + Memory View E2E | Pass: 2 files / 15 tests | `probes/api-e2e/repository/server-graphql-e2e.txt` |
| 4 | web 8 focused component/store/streaming files | Pass: 80 tests | `probes/api-e2e/repository/web-focused-regression.txt` |
| 5 | `RUN_CODEX_E2E=1 CODEX_MEMORY_E2E_MODEL=gpt-5.6-sol ...` | Pass: 1 live / 1 skipped | `probes/api-e2e/codex-gpt-5.6-sol-live-memory.txt` |
| 6 | durable browser probe | Pass | `probes/api-e2e/system-instruction-browser/evidence.json` |
| 7 | server production `tsc --noEmit` | Pass | `probes/api-e2e/repository/server-production-tsc.txt` |
| 8 | Nuxt production build | Pass; 15 routes prerendered | `probes/api-e2e/repository/web-production-build.txt` |
| 9 | `git diff --check` | Pass | `probes/api-e2e/repository/git-diff-check.txt` |

## Post-Repository Confidence Scorecard

This checkpoint intentionally excludes the later full-stack/provider/team/lifecycle probes.

| Category | Score | Support | Remaining Uncertainty At Checkpoint |
| --- | ---: | --- | --- |
| Requirement and AC proof | 95% | direct core/API/browser assertions | all three real provider processes not yet proven |
| Changed-boundary directness | 94% | real GraphQL, production component, live Codex | Native/Claude still mocked |
| Cross-boundary realism | 90% | real schema/browser engine | no one full system journey yet |
| Environment/identity/fixture fidelity | 90% | test-owned storage and actual Codex | imported real package/secrets/team not yet exercised |
| Failure/edge/lifecycle | 94% | malformed/failure/rotation coverage | actual process restart pending |
| User/browser/desktop | 94% | production component, desktop/mobile/zoom | persisted real workspace pending |
| Durable regression quality | 98% | narrow, deterministic, requirement-linked | proportional test-code review pending |

- Overall post-repository confidence: **94%** (simple average 93.6%, rounded).
- Every critical criterion directly proven at this checkpoint: No; broader validation required.
- Any category below 90%: No.
- Default 95% target met: No.
- Material gap: realistic all-runtime, standalone/team, restart/rotation, and integrated browser state.

## Broader Validation Decision

- Decision: `Required`.
- Mode: Browser + Live API/WebSocket + Lifecycle + real provider/team execution.
- Expected gain: close the mocked provider, process restart, imported-package, team routing, and real persisted DOM gaps.
- Browser rationale: this is web-equivalent Electron renderer behavior; an Electron launch would add shell risk without material evidence gain.

## Live Environment And Fixture Plan / Actual Selection

- Isolated ports: backend 54587, frontend 54588, browser bridge 54589; unrelated 3000/8000 processes untouched.
- Isolated data/workspace under `tickets/.../probes/api-e2e/full-stack-runtime`.
- User-specified secret source imported through `pnpm secrets:import`; values never logged. User-specified agent package root configured and source left read-only.
- Journeys: real Native/Claude/Codex exact-token runs; Codex Daily Assistant invokes `open_tab`; Codex Classroom professor/student file-backed round; real desktop/mobile Activity; production-store rotation and server restart.
- Evidence: redacted hashes/IDs and compact JSON, semantic DOM assertions, screenshots, WS type counts, GraphQL/Memory results, retained raw fixtures, cleanup record.

## Temporary Executable Validation

| Scenario | Purpose | Why Temporary |
| --- | --- | --- |
| LIVE-SI-001 | Native/Claude/Codex real WS/raw/GraphQL parity | depends on external accounts/models |
| LIVE-SI-002 | Codex Daily Assistant `open_tab` against actual Nuxt | product/account/ports are environment-specific |
| LIVE-SI-003 | imported Classroom team inter-member/filesystem flow | externally generated runtime work |
| LIFE-SI-001 | production rotation + owned server restart | destructive only to isolated disposable fixture |
| FULL-BROWSER-SI-001 | actual history selection/card at desktop/mobile | durable component probe already owns deterministic CI coverage |

## Not Tested / Deferred

| Boundary | Reason | Risk / Follow-up |
| --- | --- | --- |
| provider-complete/effective hidden prompt | explicitly unavailable/out of scope | none to the truthful AutoByteus-supplied claim |
| archive Activity navigation | out of scope | explicit Memory Inspector archive selection used only to prove no normal archive scan |
| Electron shell | no changed shell boundary | none material; browser is authoritative for renderer behavior |
| arbitrary storage failure/retry | MP-CR-001 not reachable and out of scope | no retry-specific coverage permitted |

## Ambiguities Or Reroute Triggers

None. Initial harness issues (unsupported bare `gpt-5.6` alias, non-TTY import confirmation, one inherited-DB launch stopped before test mutation, and two temporary GraphQL query-shape mistakes) were environment/probe corrections, not product failures. Actual supported `gpt-5.6-sol`, isolated DB, confirmed import, and authoritative schema queries passed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Changed: `Yes` — three server E2E files, two web E2E files, one package script; no removals.
- Post-repository confidence: `94%`.
- Broader validation: `Required` — completed; final result is recorded in the execution report.
- Reroute before execution: `No`.
- Next recipient after completed pass: `/code_reviewer` for proportional review of durable coverage changes.
