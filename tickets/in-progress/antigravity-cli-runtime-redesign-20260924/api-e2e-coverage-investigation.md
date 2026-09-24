# API/E2E Coverage Investigation — AGY runtime

## Investigation Meta and route
- Round 1, triggered by Code Review CRR-002 Pass at `575520264`; no prior API/E2E result or record exists. Canonical package directory: this file's directory.
- Authorities read: `requirements-doc.md` (SR-021, REQ-001–011, AC-001–010), `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (DS-001–004, DR-001, direct-use persisted-data decision), `investigation-result.md`, `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-003), `implementation-handoff.md` and `implementation-revision-record.md` (IR-003), `code-review-report.md` and `code-review-revision-record.md` (CRR-002). Supplements: `agy-cli-experiment-report.md`, `agy-tool-event-capture-analysis.md`, raw capture and command matrix, implementation-local live JSON reports. Delivery revisions N/A.
- Classification: **Large / High**, Reviewed route. Successful validation returns to Code Reviewer for proportional test-code review; a failure returns for focused failure-origin review. No direct-route shortcut.
- Latest investigation: initial, preceding durable test edits and final execution. Test-case ledger: `api-e2e-test-case-ledger.md`.

## Current behavior and changed boundaries
| Behavior | Change | Boundary and required proof |
| --- | --- | --- |
| BEH-001/002 | Added | CLI availability/model, generated custom main-agent identity including team/org context before task; real AGY process. |
| BEH-003/005 | Added | CLI-generated exact conversation ID, separate run binding, fail-closed restore, distinct capsules in same selected real workspace; process + persistence. |
| BEH-004 | Changed | AGY-only draft default-on, effective team/org policy and explicit-off; UI store to API to CLI permission mode; denied step not green/actionable. |
| BEH-006 | Added/changed | AGY NDJSON to canonical events, normalized raw traces, WebSocket and browser live/reload; DONE->success without invented exit, ERROR/denial non-green. |
| SCN-005 | Preserved | AutoByteus, Codex, Claude launch/execution/restore, status/trace policy. |

Affected surfaces: backend domain, GraphQL/WebSocket API, web-equivalent Nuxt renderer, auth/permissions, external AGY CLI, process lifecycle, local persistence and team/org coordination. Electron shell-specific IPC/window/packaging is **not** changed; browser preview is the right UI boundary. No worker/queue change. Existing data are **Directly Usable — No Migration** using generic reader; no released AGY product runs, no compatibility shim. Representative existing-runtime metadata/history plus new AGY create/restore must be exercised. Implementation handoff reports no legacy mechanism and neutral IR-001 trace path removed; retain no tests for that obsolete path.

## Project execution discovery
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924`, branch `codex/antigravity-cli-runtime-redesign-20260924`; base `40b1783f4`, reviewed commit `575520264`. Pre-existing Code Reviewer report edits will not be overwritten.
- `autobyteus-server-ts/AGENTS.md`: single Vitest file via `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; integration path and all-tests commands documented.
- `autobyteus-server-ts/README.md` §§Install, Environment setup, Build and run, Tests: `pnpm dev` starts real server/web at 8000/3000 with isolated `.autobyteus/development/server-data`; deterministic E2E use test-owned Vitest runtime, not development DB; `pnpm test:e2e` broader suite. `autobyteus-web/AGENTS.md` and README §§Development/Testing: browser dev path, `pnpm test:nuxt <path> --run`; Electron only for shell-specific behavior.
- `package.json`, server/web package manifests, existing `tests/e2e/runtime/*team-inter-agent-roundtrip.e2e.test.ts`, `tests/e2e/helpers/studio-runtime-test-server.ts`: TypeScript/GraphQL/Fastify/WebSocket/Vitest, isolated app-data fixture, service starts in test process and is closed by `afterAll`; Live Codex/Claude tests opt in via env. Root `test:e2e:real` is a separate real-provider secret-management runner, not this Team parity test.
- AGY CLI 1.2.10 available. Existing local authentication is an environmental prerequisite, no secret value recorded. Tests will create temporary workspace/appdata/definitions/team runs, terminate/delete and remove only their own resources. Avoid global AGY settings/user data edits. AGY may retain provider-side conversations; record this residual.

## Existing durable coverage inventory and decisions
| Path/scenario | Decision | Reason/action |
| --- | --- | --- |
| `tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` | Still Valid | SR-021 DONE/error/denial fixture conversion; run. |
| `.../agy-run-capsule.test.ts`, `.../agy-production-live.test.ts`, `.../agy-restore-live.test.ts` | Still Valid | Capsule, selected workspace, standalone provider and restore; opt-in live checks needed, unit/mock boundary noted. |
| `.../agy-mcp-team-live.test.ts` | Still Valid, insufficient | Real AGY scoped MCP but **stub delivery**; cannot prove real member roundtrip. Keep and add distinct E2E. |
| `tests/e2e/runtime/{codex,claude}-team-inter-agent-roundtrip.e2e.test.ts` | Needs Update | Behavioral parity remains valid, but copied first-case GraphQL fixture uses removed `TeamMemberInput.refType`; new AGY test must omit it. Existing files are not changed in this round unless chosen for execution. |
| `tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts`, `mixed-team-runtime-graphql.e2e.test.ts`, `skill-access-mode-graphql.e2e.test.ts` | Still Valid/Needs Update if AGY not represented | API scope/contract; inspect and run affected tests. |
| Web draft/store/editor, streaming/hydration/tool-card tests in implementation handoff | Still Valid | Focused UI/state regression; rerun. |
| Obsolete neutral `TOOL_EXECUTION_COMPLETED` local IR-001 tests | Stale/Remove already completed upstream | SR-021 supersedes; no new deletion by API/E2E. |

## Coverage decisions
- **Add durable** `tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts`: real GraphQL Team creation, real WebSocket member input, AGY scoped `send_message_to` to a *real* second member, team communication and recipient response with exact run/member attribution, canonical tool lifecycle and persisted projection; opt-in `RUN_AGY_E2E=1` with live binary/auth guard. A stub-only probe is unacceptable.
- **Update** existing API capability/skill test only if its assertions fail valid new behavior; no speculative removal.
- **Temporary executable probes** may supplement live command outcome, denial/reload, exact mismatch, selected workspace, configured skills/collision and Org member context where durable live E2E is unwieldy; explanation/evidence required. No planned durable removal.

## Execution discovery update
- AGY-02 first attempt revealed stale copied `refType` fixture from otherwise-valid Codex/Claude parity tests; current GraphQL `TeamMemberInput` excludes that field. The new test was corrected before rerun.
- AGY-02 rerun reaches production Team creation and fails **before AGY process**: `validateLaunchConfiguration` in `src/run-history/store/run-execution-tree-shared-record-schemas.ts` permits only three prior runtime strings, not `antigravity_cli`. Both Team and Org current tree validators use it. This is a real AC-002 and mandatory parity-gate failure, preliminarily implementation Local Fix. No test-only workaround is acceptable.

## Planned cases (canonical ledger initialized before execution)
| ID | Case | Requirements/AC | Mode |
| --- | --- | --- | --- |
| AGY-01 | Focused converter/capsule/backend/trace + web draft/hydration | AC-001/002/006/008/009/010 | repository Vitest |
| AGY-02 | Real Team member→member scoped MCP roundtrip and trace | AC-002/006/008, user parity gate | new durable GraphQL/WebSocket E2E |
| AGY-03 | Exact create/restore/mismatch and selected workspace/capsules | AC-003/004 | opt-in live suites/probe |
| AGY-04 | Final-code DONE controls, denial with live/reloaded label/raw trace | AC-007/008/010 | live API + browser |
| AGY-05 | Org effective policy/execution and skills/collision | AC-002/009 | repository + live probe |
| AGY-06 | Non-AGY regression and existing-data reader | AC-005 | focused API/web E2E |

Repository command order: targeted AGY unit/integration first, then new Team E2E, web focused suites, broader affected API/E2E and non-AGY suites. Record exact commands/results after each. Broader validation is **Required**, not preempted by mocks: real team delivery, AGY process, browser final-code reload, and restore are critical. Selected modes live GraphQL/WebSocket, CLI-backed server test, browser preview if reachable; no Electron launch. Pre-execution post-repository confidence pending; calculate after repository runs across mandatory seven categories. Ambiguity/reroute: none now; if provider/tool identity or denied replay contradicts AC, classify and return through Code Reviewer. Proceed to execution: **Yes**.

## Repository plan/results and broader decision — round 1 update
| Order | Command / surface | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prepare:shared`; focused converter/capsule + new E2E with live opt-in off | 13 pass, E2E skipped | `/tmp/agy-prepare-shared.log`, `/tmp/agy-api-01-server-rerun.log` |
| 2 | Focused web Org editor, tool card, hydration | 42 pass | `/tmp/agy-api-01-web.log` |
| 3 | `RUN_AGY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts --no-watch` | **Fail** after fixture repair; final corrected test rerun same failure | `/tmp/agy-api-02-team-final.log` |
| 4 | Runtime capability/current GraphQL | 2 pass, 21 opt-in live-agent tests skipped | `/tmp/agy-api-06-server.log` |
| 5 | Codex/Claude/manager/trace-focused server units | 73 pass | `/tmp/agy-api-06-server-focused.log` |
| 6 | Non-AGY launch/store/form web suites | 55 pass | `/tmp/agy-api-06-web.log` |

The first test import failed because documented shared packages had not been built; `prepare:shared` fixed the environment. The first new Team E2E call used legacy copied `refType` omitted by current `TeamMemberInput`; the test fixture was corrected. The final AGY-aware test uses AGY `call_mcp_tool`/nested Arguments rather than Codex's direct tool/segment convention, as proven by real AGY scoped-MCP event capture. The continuing failure is production: current shared run-tree validator omits `antigravity_cli`. `tsc -p tsconfig.json --noEmit` cannot give a useful suite verdict because existing `rootDir=src` conflicts with included `tests` (TS6059); the `--rootDir .` attempt exposed thousands of unrelated pre-existing errors. No typecheck pass is claimed.

## Post-repository confidence scorecard
| Category | Score | Evidence and uncertainty / needed validation |
| --- | ---: | --- |
| Requirement/AC proof | 45% | Standalone and UI tests exist, but critical real Team/Org member launch and delivery fail; fix runtime-kind reader then rerun. |
| Changed-boundary directness | 65% | Real GraphQL Team creation directly rejected; backend converter/capsule tests pass; no post-launch Team path. |
| Cross-boundary realism/mock gap | 35% | Stub MCP delivery is not real member roundtrip; new real test cannot reach it. |
| Environment/config/identity/fixture fidelity | 75% | AGY 1.2.10/auth available and isolated GraphQL fixture; copied fixture corrected; live run not yet completed. |
| Failure/edge/lifecycle/recovery | 50% | Fixture converter and standalone restore exist; no independent live reload or Team continuation yet. |
| User surface/browser/shell | 75% | Focused Nuxt tests and prior implementation UI evidence; final-code fresh browser not yet exercised at this score point; Electron shell N/A. |
| Durable regression quality | 70% | Existing focused suites and new real Team E2E, but Team gate fails before post-launch assertions. |
- Overall: **59%** (simple average rounded). Critical AC-002 and user real-Team parity gate directly **failed**, not merely untested. Categories below 90%: all seven. Clean 95% target not met.
- Broader validation: **Required** despite repository failure, to narrow remaining unknowns and distinguish local standalone/UX behavior from Team launch defect. Modes: live AGY process/API, browser dev preview for web-equivalent UI. Browser not a desktop-shell claim. No external blocker; the Team/Org launch is an implementation failure. Expected gain: final-code denial/DONE, exact restore, selected workspace, skill and scoped MCP evidence. Broader validation cannot turn this round into Pass while Team/Org remain rejected.

## Broader evidence and revised validity
- Independent live standalone tests passed exact provider-ID restore, immutable run-start identity and changed-workspace/nonexistent-ID rejection; selected real workspace file/shell targets (not capsule), configured PRELOADED_ONLY skill. These tests are provider-real but below GraphQL.
- Fresh final-code Chrome 127.0.0.1:3000/workspace runs proved explicit-off denial is **DENIED** live **and after reload**, with `provider_state=ERROR` in normalized raw trace; default-on exit0/exit8/command-not-found are green **SUCCESS** live/reloaded with `provider_state=DONE`, exposed output/error and no shell exit field. No `AGENT_SEGMENT_LIFECYCLE_INVALID` banner. `api-e2e-browser-live-evidence.json` contains run IDs and trace extraction.
- Real AGY scoped AutoByteus MCP calls passed for both Team and Org context when `deliverLogicalMessage` is stubbed; this **does not** satisfy real Team/Org execution. The current Org run-tree validator calls the same shared `validateLaunchConfiguration`; real Org AGY launch has not been executed and is predicted to fail for the same explicit whitelist. It must be directly rerun after source repair.
- Capsule tests prove NONE omits AutoByteus-configured skill and collisions preserve user-owned files. Real `PRELOADED_ONLY` skill passed; provider-native skill discovery is outside `NONE` guarantee.
- Existing Codex/Claude Team parity test fixtures are `Needs Update` for removed `TeamMemberInput.refType`; do not interpret their unexecuted old fixture as AGY failure. New AGY test omits that field. No stale coverage deleted this round.

## Final investigation decision
- Final broader execution improved local evidence but did not close critical integration failure. Preliminary classification: **Local Fix — implementation-owned shared current run-tree validator excludes AGY**; Code Reviewer must confirm failure origin. AC-002/SCN-002 and real Team parity gate fail. Team restore/continuation and Org execution remain not tested because launch cannot complete. Proceed to failure report and focused review; no user/environment dependency prevents progress after repair.
