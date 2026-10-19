# API/E2E Coverage Investigation — agy-docker-node-availability-diagnostics

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: none (user screenshots are evidence only)
- Design Review Report: `N/A — not applicable` (Small/Low direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/implementation-revision-record.md` (IR-001, commit `87b246c7d`)
- Code Review Report: `N/A — not applicable` (direct low-risk route; API/E2E precedes delivery)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/api-e2e-test-case-ledger.md`
- Current Investigation Round: 3 (LIVE-006 re-run only; plan unchanged)
- Trigger: round 1 — implementation_engineer IR-001 (`87b246c7d`); round 2 — IR-002 (`56b11aeae`): the sign-in reason was shortened to "Not signed in on this node. Run `agy` to sign in." at the user's request (only `DIAGNOSTICS.AGY_SIGN_IN_REQUIRED.message`, test expectations, docs)
- Round-2 coverage decision: plan unchanged; every case asserting the sign-in text (API-001, REPO-001/003, LIVE-001/002/003/004/007/008) re-run with the new text. Basis mismatch recorded below
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: per `get_handoff_rules` (expected Delivery)
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

- REQ-001 / AC-001 / AC-007: an installed `agy` whose `models` call fails with sign-in wording → `runtimeAvailability(antigravity_cli)` `enabled:false` with the fixed text "Antigravity CLI is not signed in. Run `agy` in this node's terminal and complete sign-in, then try again."; never echo CLI output; a non-sign-in failure keeps the generic text. Run start / model replacement / launch validation inherit it through `AgyDiscoveryError` / `toAgyDiscoveryDiagnostic`.
- REQ-002 / AC-002: reworded not-found and too-old texts (DEC-005).
- REQ-003 / AC-003: menu row "Unavailable" (en) / "不可用" (zh-CN), reason under the name (2-line clamp, full text in `title`), no "Not installed", non-selectable, `aria-disabled`, skipped by arrow keys; null reason → label only.
- REQ-004 / AC-004 / AC-005: each menu open re-checks only unavailable runtimes (forced per-kind request); a now-usable runtime becomes enabled with models, no reload; all-available → no forced request.
- REQ-005 / AC-006: signed-in Docker node lists AGY models; a run starts, streams and completes.
- REQ-006 / AC-008: Docker README "CLI Auth Model" covers the message, the fix and per-node `/root` sign-in.
- Unchanged GraphQL contract (DEC-002); no persisted data (`Not Affected`); no compatibility wrappers.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005 (repository level + live classification), SCN-006 (docs review).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 — sign-in lapses on a node after the user already used AGY there (the last-used model, i.e. the *current* runtime, is AGY, and AGY is now unavailable). Trigger: open New chat → open the model menu. The implementation did not render this state (current-runtime dot offset on an unavailable row).
  - SCN-A2 — real `agy` network failure while signed in (proxy unreachable) must stay the generic text, not the sign-in text. Trigger: AGY discovery on a node whose network to Google fails.
  - SCN-A3 — zh-CN user opens the menu on a signed-out node. Not rendered by implementation.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none. SCN-X1 (new app ↔ older node) is satisfied by design (no query change); verified here only by confirming the query document is unchanged.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 server classification (`runCommand` non-zero close) | Changed | design DS-001/DS-004 | Unit (scripted) exists; add GraphQL E2E; live real-`agy` proof on a Docker node |
| BEH-001/004 menu row | Changed | design DS-002 | Component spec exists; live browser on Docker-backed stack (en + zh-CN) |
| BEH-003 re-check on open | Added | design DS-003 | Composable spec (mocked store) exists; live browser proof of exactly-one forced request and recovery with real `agy` |
| BEH-002 signed-in happy path | Preserved | REQ-005 | Live Docker run (AC-006) |
| BEH-005 run start / model replacement | Changed (inherited) | design DS-001 | Unit tests exist (factory, run-model-selection); live classification proof covers the shared mapper input |
| BEH-007 not-found / too-old texts | Changed | DEC-005 | Unit exists; live not-found via the real container dist |
| `chat.model.notInstalled`, `chat-runtime-not-installed` | Removed | Legacy Removal Policy | `git grep` check; no probe references them |
| BEH-006 docs | Changed | REQ-006 | Docs review |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | AGY classifier | Unit with scripted CLI through real `RuntimeAvailabilityService` | Real `agy` 1.3.3 wording/exit on Linux in the image | Live (Docker node, real `agy`) |
| API / transport / contract | Yes (payload text only) | GraphQL `runtimeAvailability.reason` | Existing GraphQL e2e covers Grok rows only | Reason text through the schema; server-side freshness after recovery | New GraphQL E2E (scripted CLI) + live GraphQL on Docker |
| Frontend component / state | Yes | Menu row; `ensureAvailability` | Component + composable specs (store mocked) | Real store forced-fetch semantics, row replacement | Browser |
| Browser integration / user journey | Yes | Menu open → re-check → enabled → models → run | Implementation's ad-hoc probe with fake CLI | Real `agy`, real Docker node, real run | Browser against Docker-backed server |
| Authentication / session / permissions | Yes (CLI sign-in state, external) | `agy` OAuth state in `/root` | none (scripted) | Real signed-out/signed-in transitions | Live Docker |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | as above | as above | Browser (web-equivalent) |
| Desktop shell / Electron-specific integration | No | No shell code changed | — | — | None |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | `agy` CLI + Google backend | scripted | real CLI behaviour | Live Docker |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics` (branch `codex/agy-docker-node-availability-diagnostics`, HEAD `87b246c7d`)
- Project type: pnpm monorepo — Node/TypeScript server (`autobyteus-server-ts`, GraphQL), Nuxt 3 web renderer (`autobyteus-web`), Electron shell; Docker server image.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts/` or `autobyteus-web/`).
- Conflicts / gaps: TESTING.md has no Docker-node validation surface; I use the Docker image the user's nodes run, as the design's "Executable validation" requires, with a test-owned container (Rule 2: never the user's running nodes or data).
- Secrets: an `agy` sign-in exists only inside the user's node 8001 container. It is streamed container-to-container into the test-owned container (never written to the host, never printed). No other secrets needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Server E2E in `tests/e2e/` via `vitest run <file> --no-watch`; browser probes own their stack (free ports, Nuxt dev, headless Chrome), assert DOM/API, clean up; never touch the user's running AutoByteus or data; real-provider runs only when needed |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` |
| `autobyteus-web/AGENTS.md` | Web rules | Localization guards |
| `autobyteus-server-ts/docker/{Dockerfile.monorepo,docker-compose.yml,entrypoint.sh,supervisor-autobyteus-server.conf}` | Docker node layout | Server runs `node dist/app.js` from `/app/autobyteus-server-ts` as root with `HOME=/root`; `/root` is a named volume per user node; image has no declared `VOLUME` |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Existing live chat probe | Selectors and pick-model/send/reply helpers; Nuxt dev `BACKEND_NODE_BASE_URL` |
| implementation `implementation-evidence/scripts/check.mjs` | Ad-hoc implementation probe | Nuxt dev + playwright-core + GraphQL request capture pattern |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Test-owned Docker node `agy-api-e2e-node` | worktree | `docker run -d --name agy-api-e2e-node -p 127.0.0.1:<free>:8000 -v <worktree>/autobyteus-server-ts/dist:/app/autobyteus-server-ts/dist:ro autobyteus/autobyteus-server:beta` | Image = the user's nodes' image (`1.5.3-beta.1`, `62ee64827c53`). Whole image `dist` differs from this branch's build only in `runtime-management/antigravity-cli-capability.{js,d.ts,d.ts.map}` (`diff -rq`), so it equals an image built from this branch for the server. Fresh `/root` = never signed in | `GET /rest/health` | `docker rm -f -v agy-api-e2e-node` |
| Nuxt dev (this worktree) | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:<node port>` | Serialised (one dev server in this worktree) | `GET /chat` 200 + warm-up | kill owned process group |
| Headless Chrome | — | playwright-core `chromium.launch` | fresh contexts | — | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Signed-out `agy` | Fresh container `/root` (never signed in); `HOME=<empty dir>` for direct checks | No user data involved | Container removed |
| Signed-in `agy` | `docker exec autobyteus-server-0 tar -C /root/.gemini/antigravity-cli -cf - antigravity-oauth-token … \| docker exec -i agy-api-e2e-node tar -x …` (simulates the user signing in on that node) | Read-only on the user's node (tar read); never on the host disk; nothing printed; 8001 never modified | Removed with the container (`rm -v`) |
| Agent for the run | Product default (Daily Assistant seeded on a fresh data root) via New chat | Inside the test container's data dir | Removed with the container |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`. No coverage needed.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/runtime-management/antigravity-cli-capability.test.ts` | Scripted CLI modes incl. `signin-models`, `signin-models-stdout`, `network-models`, `signin-wording-success`; availability reason via real service; reworded texts | AC-001, AC-002, QR-001/002 | Still Valid | Read; re-run | Keep |
| `.../agent-execution/backends/antigravity/agy-agent-run-backend-factory.test.ts` | Run start throws sign-in text | AC-007 | Still Valid | diff | Keep |
| `.../llm-management/run-model-selection-service.test.ts` | `catalogDiagnostic` = sign-in code+text | AC-007 | Still Valid | diff | Keep |
| `.../application-platform/application-launch-host-capability-validator.test.ts` | Launch validation through same mapper | AC-007 | Still Valid | handoff | Keep |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts` | Five kinds; Grok rows through GraphQL | contract unchanged | Still Valid | read | Keep (AGY command is module-load-time; a separate file is cleaner for AGY) |
| `autobyteus-web/components/chat/__tests__/ChatModelMenu.spec.ts` | Unavailable row label/reason/title/aria/arrow keys | AC-003 | Still Valid | diff | Keep |
| `autobyteus-web/composables/chat/__tests__/useChatModelCatalog.spec.ts` | Forced re-check of unavailable kinds only; none on first/all-available | AC-004/005 | Still Valid (store mocked) | diff | Keep; live browser closes the store gap |
| `autobyteus-web/tests/e2e/chat-*-probe.mjs` | Menu selectors `chat-runtime-<kind>` | — | Still Valid | `grep`: none reference `chat-runtime-not-installed` | None |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | GraphQL `runtimeAvailability(antigravity_cli)` signed out → sign-in text, no CLI output; network failure → generic text; same server after sign-in → enabled and `providerModelCatalogSnapshots` lists the models (no server-side staleness) | AC-001, AC-004 (server half), QR-001, DEC-002 | `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` | No test proves the reason through the GraphQL schema, or that a recovered CLI is reported without a server restart; cheap, deterministic, no credentials |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

See the execution coverage report for results.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/antigravity-cli-capability.test.ts tests/unit/agent-execution/backends/antigravity tests/unit/llm-management/run-model-selection-service.test.ts tests/unit/application-platform/application-launch-host-capability-validator.test.ts --no-watch` | worktree root | Classifier + consumers | Planned | `api-e2e-evidence/repo/` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts --no-watch` (clean env) | worktree root | GraphQL boundary (API-001) + existing contract | Planned | same |
| 3 | `pnpm -C autobyteus-web exec vitest run components/chat/__tests__/ChatModelMenu.spec.ts composables/chat/__tests__/useChatModelCatalog.spec.ts` | worktree root | Menu + re-check | Planned | same |
| 4 | `pnpm -C autobyteus-web guard:localization-boundary && audit:localization-literals`; `pnpm -C autobyteus-server-ts typecheck` | worktree root | Guards, types | Planned | same |

Full `test:unit` (5364) and `test:nuxt` (4241) were run green by implementation on the same commit; I re-run only the affected files plus the new E2E.

## Test-Case Ledger Decision

- Ledger required: `Yes` — several independent live cases on a long-running Docker + browser stack with a real paid run.
- Canonical ledger path: `api-e2e-test-case-ledger.md` (same folder).

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | AC-001/002/003/005/007 at repository level; AC-004 composable + API-001 server half | AC-006 and live AC-004 owed by design | Docker node live run |
| Changed-boundary execution directness | 85% | Real `RuntimeAvailabilityService` + GraphQL schema with scripted CLI | Real `agy` wording on the image | Live real CLI |
| Cross-boundary integration realism and mock gap | 75% | Store mocked in composable spec | Real store forced fetch → menu | Browser on real stack |
| Environment, configuration, identity, fixture fidelity | 75% | Scripted CLI reproduces 1.3.3 text | Real sign-in state | Docker node with real sign-in |
| Failure, edge-case, lifecycle, recovery evidence | 90% | Many scripted modes; recovery without restart (API-001) | Real network failure wording | Live proxy failure |
| User-surface, browser, desktop-shell confidence | 80% | Component spec; implementation rendered en desktop/narrow with fake CLI | zh-CN, lapsed state, real backend | Browser |
| Durable regression coverage quality and relevance | 92% | API-001 fails on the base classifier | — | — |

- Overall post-repository confidence: 81.7% (simple average). Critical ACs all directly proven: `No` (AC-006). Categories below 90%: five. Target met: `No` → broader validation `Required`.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` + `Browser` against a test-owned Docker node running this branch's server build with the image's real `agy` 1.3.3.
- Confidence gap: repository proof uses a scripted CLI and a mocked store; AC-006 and live AC-004 are explicitly owed by the design; real `agy` wording, real recovery after sign-in, real run.
- Why it improves confidence: it exercises the exact product path of the bug (Docker node, real CLI, real sign-in state) end to end.
- Expected confidence after: ≥ 95%.
- Browser decision: required for AC-003/004/005 on the real store and AC-006 through the user's actual entry (New chat).

## Desktop Application Validation Decision

- Desktop framework: Electron. Web-equivalent behavior only (menu row, composable, store, GraphQL). No shell, preload, IPC or lifecycle code changed.
- Chosen approach: Nuxt dev renderer in headless Chrome (TESTING.md: renderer behavior that also runs in a browser → browser probe). Electron shell not exercised; no confidence consequence since no shell code changed.
- Effect on the user's running app or nodes: `None` (test-owned container, free ports, no user data).

## Live Environment And Fixture Plan

- Startup: (1) `docker run` test node with branch `dist` mounted read-only, bound to `127.0.0.1:<free>`; (2) health; (3) Nuxt dev → test node; (4) headless Chrome.
- Health: `/rest/health` 200; Nuxt `/chat` 200 + warm-up open.
- Identities: signed-out = fresh `/root`; signed-in = minimal `agy` state streamed from node 8001 container to the test container (no host copy).
- Journeys (ledger IDs): LIVE-001..LIVE-008 (see ledger).
- Evidence: GraphQL JSON, captured GraphQL operations, DOM state, screenshots, server log excerpts (no credentials).
- Cleanup: browser, Nuxt process group, `docker rm -f -v agy-api-e2e-node`; verify no `agy-api-e2e-*` container remains; temp dirs removed.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LIVE-001..008 | `api-e2e-evidence/scripts/docker-node-live.mjs` (ticket evidence) | Real `agy` on the Docker image: sign-in reason, alternates, menu, recovery, run | Needs Docker, the 9 GB image, and a real signed-in `agy` copied from a user's node, and spends Antigravity quota; not appropriate for a repository probe that others run unattended. API-001 is the durable counterpart |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron shell | No shell code changed | None | — |
| AC-006 successful AGY turn (LIVE-006) | **Resolved in round 3 (Pass after the quota reset).** Was blocked: the only signed-in Antigravity account (8001 = this Mac's account) returns 429 "Individual quota reached" on every model (Gemini resets ≈ 10 h, others ≈ 113 h) | Unchanged run path; proven up to provider inference | Rerun LIVE-006 after the quota reset or with another account; or user accepts the residual |
| Unavailable runtime that is also the current runtime (dot offset) | Not reachable from New chat: `chatDraftStore.resolveChatNavDefaultModel` preselects the last-used model only when its runtime is enabled; available runtimes are not re-checked on open, so an open draft keeps AGY enabled | Cosmetic, template-reviewed only | None |
| User verification on node 8003 | User-owned; never touch the user's nodes | — | Delivery / user after release |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| The approved requirements (REQ-001, SCN-001, DEC-005; SR-002) and the design (row example, SR-003) still fix the old sign-in text. IR-002 implements the user-chosen text "Not signed in on this node. Run `agy` to sign in.". No SR records this change (the uncommitted SR-004 covers only the AC-006 quota decision) | `Requirement Gap` (approval-record update only; the behavior is user-chosen) | `requirements-doc.md` L21/L93/L118/L178; `design-spec.md` L280; `git diff 87b246c7d 56b11aeae` | Solution Designer — **Resolved by SR-005** (requirements baseline SR-005: Desired outcome, REQ-001, SCN-001, DEC-005; design row example). Verified: new text present, old text absent in both |

None. The run-1 LIVE-008 failure was a probe assumption, not product behavior (see Not Tested). The LIVE-006 blocker is external.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage: `Yes` — add API-001
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
