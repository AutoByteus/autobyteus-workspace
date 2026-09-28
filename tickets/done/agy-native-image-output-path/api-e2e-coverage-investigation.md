# API/E2E Coverage Investigation — agy-native-image-output-path

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/requirements-doc.md` (Approved SR-003; SR-004 current)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md`
- Supplemental Task Artifacts: `…/solution-result.md`, `…/probe-evidence/`, `…/implementation-evidence/`; Product/UI supplements `N/A — not applicable`
- Design Review Report: `…/design-review-report.md`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md`
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A (not a delivery re-entry)
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-001` (initial round)
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass from `/code_reviewer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path`

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the changed durable tests)
- Proportional test-code review decision: `Required` if durable tests change (planned: yes)

## Current Requirement And Design Basis

These must be proven:

- **REQ-001 / AC-001 / AC-005**: native `generate_image` DONE without a provider error produces the result `{provider_state:"DONE", output:<AGY output text>, file_path:<abs>}`.
  - `file_path` is the realpath of the image AGY saved inside `~/.gemini/antigravity-cli/brain/<conv>/`.
  - `output` contains that path.
  - STARTED arguments contain `ImageName` and `Prompt`.
- **REQ-002 / AC-003**: the reader performs one bounded (≤16 KiB), O_NOFOLLOW read confined to the conversation's brain directory. An image outside that directory, or a symlinked image, is not shown.
- **REQ-003 / AC-002 / SCN-002**: missing, unreadable or unrecognised output still gives SUCCESS with `output:null`. No user-facing error appears, the turn completes, and a content-free `AGY_NATIVE_IMAGE_PATH_UNRESOLVED` warning is logged.
- **REQ-004 / AC-004**: a resolved `file_path` yields exactly one `generated_output` Artifacts entry, which previews through `/rest/runs/:runId/file-change-content`.
- **REQ-005**: `generate_image` parameters are public. Error and denial redaction is unchanged (BEH-002).
- **SCN-001**: restore/reopen shows the same result from history.
- **Persisted data**: `Directly Usable — No Migration`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 native DONE result enrichment | Changed | REQ-001, design DS-001/DS-002 | Unit tests (converter and reader) plus live real-AGY e2e |
| `generate_image` STARTED arguments published | Changed | REQ-005 / DEC-002 | Unit, live e2e and fake-AGY e2e argument assertions |
| Unresolved fallback + warning | Added | REQ-003, AC-002 | Unit tests per reason; **new** server-level fake-AGY fallback case |
| Artifacts entry via existing `file_path` pipeline | Added (via unchanged shared code) | REQ-004, AC-004 | FCP unit test plus live FILE_CHANGE and content route |
| History replay of enriched result | Preserved mechanism, new data | SCN-001, persisted-data decision | **New** live e2e assertions on `getRunProjection` and `getRunFileChanges` after terminate |
| Error/denial redaction | Preserved | BEH-002 | Existing fake-AGY failure-transport e2e |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Converter plus new reader | Unit tests on a real temp filesystem | None material | — |
| API / transport / contract | Yes | WS `TOOL_EXECUTION_SUCCEEDED` payload; `FILE_CHANGE`; content route | Live app-chat e2e (GraphQL/WS/REST) | History projection not asserted before this round | Add a durable history assertion |
| Frontend component / state | No code change | Existing generic result and `file_path` rendering | None for this data shape | Rendered card and Artifacts preview are unverified | Browser |
| Browser integration / user journey | Indirect | Activity card and Artifacts tab | None | As above | Browser (decide after the repository round) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Indirect | Same as frontend | — | — | Browser, if required |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes (turn completion under fallback) | The converter must not throw inside the backend queue | Unit test with a throwing resolver | Real server turn completion on fallback | New fake-AGY case |
| Persisted-data transition | Yes (new fields in events) | Run history replay | Existing projection tests (generic) | Real AGY run replayed after terminate | New live e2e history assertion |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Undocumented AGY brain layout (agy 1.2.12) | Gated live e2e tests | Layout drift (accepted in SR-002) | Live run with real agy 1.2.12 |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path`
- Stack: Node/TypeScript (`autobyteus-server-ts`, Fastify, type-graphql, vitest 4). The frontend is `autobyteus-web` (Nuxt) and has no changes.
- Required secrets: none beyond the local logged-in `agy` CLI (`~/.local/bin/agy`, version 1.2.12, verified).

| Instruction / Configuration Path | Authority / Purpose | Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Test commands | `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` |
| `autobyteus-server-ts/README.md` §Tests | Test runtime | Tests use `.env.test` with a temporary SQLite database; live suites are env-gated |
| `implementation-handoff.md` §Environment | Gates | `RUN_AGY_CAPABILITY_E2E=1` for the live tests; `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` for the fake tests; worktree already prepared (`pnpm install`, `prisma generate`, `prepare:shared`) |

| Component / Dependency | Working Directory | Start / Setup | Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| In-process Fastify server (`startStudioE2eRuntimeServer`) | `autobyteus-server-ts` | Started by the e2e suite | Per-suite temporary app-data directory (`mkdtemp`) | Suite `beforeAll` | Suite `afterAll`: terminate runs, delete definitions, close app, remove temp dir |
| Real `agy` CLI | — | Spawned by the backend | Writes into the real `~/.gemini/antigravity-cli/brain/<new conv>` (AGY-owned) | — | AGY conversations are AGY-owned. Tests only read them; they are not deleted |
| Fake agy (`tests/fixtures/agy-failure-cli.mjs`) | — | `ANTIGRAVITY_CLI_COMMAND` | Needs no network or auth | — | — |

| Data / Fixture Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Agent definition | GraphQL `createAgentDefinition` | Temporary app-data directory | Deleted in `afterAll` |
| AGY brain step-output files (resolved, missing, outside, symlink) | New suite plants them under a test-owned temporary HOME (gated `vi.hoisted` HOME override, before server modules load); fake agy uses `AGY_FAKE_CONVERSATION_ID` | Real `~/.gemini` never written (verified by an mtime scan) | Temp HOME removed in `afterAll` |
| Browser run data | Documented `pnpm dev` stack; state under the worktree's ignored `.autobyteus/development/`; agent `agy-image-api-e2e` | Isolated from the user's desktop app (port 29695 untouched) | Stack stopped; `.autobyteus/development/` removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec § Persisted Data / State Transition Decision; implementation-handoff § Persisted Data Transition Check
- Evidence planned:
  - A new real run is replayed after terminate, through `getRunProjection` and `getRunFileChanges`, using the normal current reader.
  - Historical `output:null` rows use the unchanged generic projection. Existing projection e2e and unit coverage is generic, and the fallback case also exercises `output:null` replay.
- Reroute required: No

## Existing Durable Coverage Inventory

| Path / Scenario | Assertion | Related | Validity | Action |
| --- | --- | --- | --- | --- |
| `tests/unit/.../antigravity/agy-step-output-reader.test.ts` (17) | Reader policies on a real temp filesystem | REQ-002, AC-003 | Still Valid | Run |
| `tests/unit/.../antigravity/agy-stream-event-converter.test.ts` | Resolved result, 8 reasons, throwing resolver, parallel steps, MCP unaffected, denial redaction | REQ-001/003/005, AC-002/005 | Still Valid | Run |
| `tests/unit/.../antigravity/agy-turn-lifecycle.test.ts` | Backend wires `(conversationId, step)` | REQ-001 | Still Valid | Run |
| `tests/unit/agent-execution/events/file-change-event-processor.test.ts` | Exactly one `generated_output` entry for an AGY-shaped result | REQ-004 | Still Valid | Run |
| `tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts` (native image case) | Real reader, containment, output contains path, arguments | AC-001/005 | Still Valid | Run live |
| `tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` (native image) | Full server: path, FILE_CHANGE, preview bytes | AC-001/004/005 | Needs Update | Add SCN-001 history/reopen assertions |
| `tests/e2e/runtime/agy-failure-transport.e2e.test.ts` (2 cases) | Denial/terminal redaction; denial arguments public | BEH-002, REQ-005 | Still Valid | Run unchanged (an interim fallback case was moved to the new suite) |
| `tests/fixtures/agy-failure-cli.mjs` | Fake transport | — | Needs Update | Add the `image_done` case with an optional `AGY_FAKE_CONVERSATION_ID` |

## Stale Or Obsolete Coverage Decisions

None beyond the implementation's updates, which were reviewed in CRR-001 and are consistent with DEC-002 and REQ-001.

## Durable Coverage To Add

| Scenario ID | Behavior | Evidence | Path | Why |
| --- | --- | --- | --- | --- |
| API-E2E-007 | Server-level native image step output, using a fake AGY and a test-owned HOME. Cases: resolved (result, FILE_CHANGE, `getRunFileChanges`, preview bytes, history); missing (`OUTPUT_MISSING`); outside the conversation (`PATH_OUTSIDE_CONVERSATION`); symlinked image (`IMAGE_MISSING`) | REQ-001..005, AC-001..005 wiring, AC-002, AC-003, SCN-002 | `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` (new); `tests/fixtures/agy-failure-cli.mjs` (`image_done` case) | Deterministic, CI-runnable proof through the production backend wiring and the default brain root. Before this, AC-002/AC-003 were proven only in unit tests, and the resolved flow only by the env-gated real-agy test |

## Durable Coverage To Update

| Scenario ID | Path | Update | Evidence |
| --- | --- | --- | --- |
| API-E2E-003 | `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` | After the turn, and again after `terminateAgentRun`, assert that `getRunProjection` conversation/activities replay the identical arguments and result, that `getRunFileChanges` holds exactly one `generated_output` entry for the path and invocation, and that the preview route still serves identical bytes | SCN-001, REQ-004 |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

Case-level details are in `api-e2e-test-case-ledger.md`. Evidence directory: `…/api-e2e-evidence/`.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/agent-execution/backends/antigravity tests/unit/agent-execution/events/file-change-event-processor.test.ts --no-watch` | `autobyteus-server-ts` | Reader, converter, wiring, FCP (API-E2E-001) | Pass: 106 passed, 5 live-gated skipped | `api-e2e-001.log` |
| 2 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch` | same | API-E2E-007 plus BEH-002 redaction (API-E2E-004) | Pass: 6/6 | `api-e2e-007.log` (interim `api-e2e-004.log`) |
| 3 | `RUN_AGY_CAPABILITY_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts -t "native AGY image" --no-watch` (PATH includes `~/.local/bin`) | same; real agy 1.2.12 | API-E2E-002 | Pass | `api-e2e-002.log`, `real-native-image.json` |
| 4 | `RUN_AGY_CAPABILITY_E2E=1 pnpm exec vitest run tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts -t "native generate_image" --no-watch` | same; real agy 1.2.12 | API-E2E-003 including history/reopen | Pass | `api-e2e-003.log`, `app-native-image-chat.json` |
| 5 | `pnpm exec vitest run tests/unit/agent-execution tests/unit/run-history tests/unit/services/agent-streaming --no-watch`; `pnpm exec tsc -p tsconfig.build.json --noEmit` | same | Regression (API-E2E-005) | Pass: 1184 passed, 10 pre-existing failures, also failing with the base source. tsc exit 0 | `api-e2e-005-unit.log`, `api-e2e-005-baseline.log`, `api-e2e-005-tsc.log` |
| 6 | Gated-off check: `pnpm exec vitest run tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` without env | same | New suite has no side effects when skipped | Pass: 4 skipped, no temp dir | ledger seq 7 |

## Test-Case Ledger Plan

- Ledger required: Yes. There are multiple independent cases and the live AGY runs are long-running.
- Canonical path: `…/api-e2e-test-case-ledger.md`
- Initialized before execution: Yes. Cases API-E2E-001..007.

## Post-Repository Confidence Scorecard (Mandatory)

Scored after repository checks 1–5, before browser validation and before API-E2E-007 was added.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | AC-001/004/005 live over API; AC-002 through the server (interim fake case); AC-003 by reader unit tests on a real filesystem; SCN-001 over API | AC-001/AC-004 as the user sees them (rendered card, preview); AC-003 not through the server | Browser; server-level hostile-path cases |
| Changed-boundary execution directness | 95% | Real AGY, production reader, real server WS/REST/GraphQL | — | — |
| Cross-boundary integration realism and mock gap | 95% | Live AGY; only the fallback uses a fake transport | — | — |
| Environment, configuration, identity, and fixture fidelity | 95% | Real agy 1.2.12, real HOME brain root, isolated app data | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Fallback through the server; terminate/reopen; throwing resolver and hostile paths in unit tests | Hostile paths not through the production wiring/default root | Server-level outside/symlink cases |
| User-surface, browser, and desktop-shell confidence | 70% | None beyond API payloads | Rendered Activity card and Artifacts preview unverified; no frontend change | Browser journey |
| Durable regression coverage quality and relevance | 90% | Unit tests plus gated live e2e | Resolved server flow only in env-gated real-agy tests (skipped in CI) | Deterministic fake-transport suite |

- Overall post-repository confidence: 89.3% (simple average)
- Every critical acceptance criterion directly proven: No (UI view of AC-001/AC-004)
- Categories below 90%: User surface (70%)
- 95% target met: No
- Material residual risks: rendered UI and server-level hostile-path handling

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`, plus a deterministic server-level fake-transport suite (`Other`)
- Confidence gap addressed:
  - The rendered Activity card and Artifacts preview, live and after reopen (AC-001, AC-004, AC-005, SCN-001).
  - Hostile-path handling through the production wiring (AC-003).
- Why it helps:
  - The browser exercises the real Nuxt frontend against the real server and real agy.
  - The server suite exercises the production default brain root without touching the user's `~/.gemini`.
- Expected confidence after: ≥95%
- Browser-specific rationale: there is no frontend change, but AC-001/AC-004 are user-visible. The web renderer is equivalent to the desktop renderer, and no Electron-shell behavior is affected.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt `autobyteus-web` frontend.
- Relevant instructions: `autobyteus-web/README.md` (Web Development: browser-based) and `autobyteus-server-ts/README.md` (Start the real backend and frontend).
- Web-equivalent behavior: the Activity card, the Artifacts tab, and preview through `/rest/runs/:runId/file-change-content`.
- Shell-specific behavior: none changed.
- Chosen approach: browser via the documented root `pnpm dev`.
- Effect on the already-running desktop app (port 29695): None.
- Not directly proven: the Electron shell itself. This is immaterial because nothing shell-specific changed.

## Live Environment And Fixture Plan

- Startup: `pnpm dev` in the worktree root. It builds the server and starts the backend on `127.0.0.1:8000` and the frontend on `127.0.0.1:3000`. Readiness signals: `DEV_SERVER_READY` / `DEV_WEB_READY`.
- Environment: state is under the worktree's ignored `.autobyteus/development/server-data`. The real agy is on PATH (`~/.local/bin`).
- Seed data: agent `agy-image-api-e2e`, created via GraphQL `createAgentDefinition`.
- Journey: Run → Antigravity CLI / Gemini 3.8 Flash (Low), auto-approve → send an image request → inspect the Activity card and Artifacts → `terminateAgentRun` → reload → reopen from workspace history → inspect again.
- Evidence: DOM text assertions, `<img>` natural size, on-disk file check, and screenshots.
- Cleanup: SIGINT to the launcher, confirm ports are released, remove `.autobyteus/development/`, and close the browser tab.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| API-E2E-006 | Browser journey against the `pnpm dev` stack with real agy | Rendered Activity card and Artifacts preview, live and reopened | Needs real logged-in agy and the Nuxt dev stack. The repository has no browser e2e harness for runtime-backed runs. The rendered data contract is covered durably at the API level (API-E2E-003/007) |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Resume with `--conversation` (E-012) and parallel `generate_image` in one real turn | Not required by the ACs. Parallel steps are unit-covered, and the reader is keyed per step | Low | None |
| Future AGY layout or wording drift | External; accepted in SR-002. The gated live tests act as detectors | Accepted | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| AC-001 "matches the path AGY's reply mentions": in both live runs the assistant reply did not mention a path, because AGY's own tool output tells the model not to output it. The path in the result equals AGY's own reported path (`Generated image is saved at …`) and the file on disk | Not a defect. The AC is satisfied through AGY's authoritative reported path, and no conflicting path appeared | `app-native-image-chat.json`, browser evidence | None (noted for Delivery/Solution awareness) |

## Investigation Decision

- Proceed to API/E2E execution: Yes (completed)
- Durable coverage added/updated: Yes (1 added, 2 updated; none removed)
- Post-repository confidence: 89.3%
- Broader validation decision: Required (Browser + server-level fake-transport suite). Executed. Final confidence 95.6%; see the execution report.
- Reroute required: No
