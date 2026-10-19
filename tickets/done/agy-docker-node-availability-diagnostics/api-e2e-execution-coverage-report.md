# API/E2E Execution Coverage Report — agy-docker-node-availability-diagnostics

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/design-spec.md`
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/implementation-revision-record.md` (IR-001, `87b246c7d`)
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 3 (LIVE-006 only, after the provider quota reset)
- Trigger: implementation_engineer IR-002 (`56b11aeae`): shorter sign-in reason "Not signed in on this node. Run `agy` to sign in."
- Prior Round Reviewed: round 1 (API-REV-001, IR-001 `87b246c7d`)
- Latest Authoritative Round: 3. Rounds 1–2 results stand, except LIVE-006, which round 3 re-ran and passed

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (handoff rule "passes on the direct route … Small or Medium and Low")
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation completed before durable coverage changes and final execution: `Yes`
- Plan followed: `Yes`, with two probe-side corrections:
  - LIVE-006 was widened to try several models after the account's quota error.
  - LIVE-008 was corrected after I found that New chat preselects the last-used model only when its runtime is enabled (`chatDraftStore.resolveChatNavDefaultModel`). A lapsed AGY is therefore never the current runtime on New chat. The case now checks the lapsed row and that AGY is not preselected. The "current dot on an unavailable row" state is not reachable from New chat (see Not Tested).
- Reroute required: `No` (no product, requirement or design defect found)

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`. Every completed case was recorded: `Yes` (live cases also in `api-e2e-evidence/live/run-*/cases.jsonl`). Ledger reconciled: `Yes`.
- Cases unresolved: LIVE-006 is `Blocked` (external quota).

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| API-001 | Pass | Completed | `api-e2e-evidence/repo/api-001-agy-graphql-e2e.log`, `api-001-against-base-classifier.log` | — |
| REPO-001 | Pass | Completed | `api-e2e-evidence/repo/r1-server-unit-focused.log` | — |
| REPO-002 | Pass | Completed | `api-e2e-evidence/repo/r2-server-graphql-e2e.log` | — |
| REPO-003 | Pass | Completed | `api-e2e-evidence/repo/r3-web-menu-specs.log` | — |
| REPO-004 | Pass | Completed | `api-e2e-evidence/repo/r4-guards-typecheck.log` | — |
| LIVE-001 | Pass | Completed | `api-e2e-evidence/live/live-001-signed-out.txt` | — |
| LIVE-002 | Pass | Completed | `api-e2e-evidence/live/run-1/` | — |
| LIVE-003 | Pass | Completed | `api-e2e-evidence/live/run-1/` | — |
| LIVE-004 | Pass | Completed | `api-e2e-evidence/live/run-1/` | — |
| LIVE-005 | Pass | Completed | `api-e2e-evidence/live/run-1/` | — |
| LIVE-006 | Blocked | Completed (run-2) | `api-e2e-evidence/live/run-2/LIVE-006-*.png`, `results.json` | Rerun when the Antigravity account quota resets, or with another signed-in account |
| LIVE-007 | Pass | Completed | `api-e2e-evidence/live/run-1/results.json` | — |
| LIVE-008 | Pass | Completed (run-2) | `api-e2e-evidence/live/run-2/LIVE-008-*.png` | run-1 failure was a probe assumption, corrected |
| DOCS-001 | Pass | Completed | `git show 87b246c7d` docs diff | AC-008 |

## Compatibility / Legacy Scope Check

- Upstream backward compatibility in scope: `No`. Compatibility or legacy behavior in the implementation: `No`. The old key, data-test and title fallback are gone; `git grep` finds no chat-menu references.
- Persisted data: `N/A` (`Not Affected`). Compatibility-only durable coverage: `No`.
- GraphQL query document unchanged (SCN-X1 / DEC-002): `Yes` (no web query or server schema in the diff).

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC | Changed Boundary | Surface / Mode | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-001 | AC-001, AC-002, AC-007, QR-001/002 | Classifier + consumers | Server unit, scripted CLI | Durable | Pass | 24 files / 384 tests |
| API-001 | AC-001, AC-004 (server), QR-001 | GraphQL `runtimeAvailability.reason`, `providerModelCatalogSnapshots` | Server E2E (schema), scripted CLI | Durable | Pass | 3/3 pass; 2/3 fail against the base classifier |
| REPO-002 | DEC-002 contract | GraphQL availability inventory | Server E2E | Durable | Pass | 4/4 |
| REPO-003 | AC-003, AC-004, AC-005 | Menu row, `ensureAvailability` | Web component/composable | Durable | Pass | 17/17 |
| REPO-004 | REQ-003, legacy removal | Locale dictionaries, types | Guards, typecheck | Durable | Pass | exit 0 |
| LIVE-001 | AC-001 (SCN-001) | Real `agy` 1.3.3 → classifier → GraphQL | Test-owned Docker node, real CLI | Live | Pass | `agy models` exit 1 "Please sign in…" with both `HOME=/root` (fresh) and `HOME=<empty dir>`. GraphQL reason equals the sign-in text exactly; catalog error is also the sign-in text; other runtimes unaffected |
| LIVE-002 | AC-003 (en) | Menu row on real store | Browser → Docker node | Browser | Pass | "Unavailable" + reason (2 lines, clamped), `title` = reason, `aria-disabled=true`, arrow keys skip it, click opens no list, no "Not installed" |
| LIVE-003 | AC-003 (zh-CN), SCN-A3 | Menu row zh-CN | Browser (`locale: zh-CN`) | Browser | Pass | "不可用" + reason; no "not installed"/"未安装"; no page errors |
| LIVE-004 | AC-004 (SCN-003) | Re-check on reopen → real store → GraphQL → real `agy` | Browser + Docker | Live/Browser | Pass | After sign-in, reopening sent exactly one `GetRuntimeAvailability {runtimeKind: antigravity_cli}`. The row kept its last state (disabled + reason) at first paint and was enabled 2.1 s after opening. The flyout listed the 18 real models |
| LIVE-005 | AC-005 | No re-check when all available | Browser | Browser | Pass | 0 GraphQL requests on the third open |
| LIVE-006 | AC-006 (SCN-002) | Signed-in run path (unchanged code) | Browser + Docker + real `agy` + provider | Live | Blocked | Model picked from the menu; run created with `runtimeKind=antigravity_cli`; real `agy` launched and authenticated. The provider answered `RESOURCE_EXHAUSTED (429) Individual quota reached`; the UI showed "An Error Occurred …" with status Error. No successful reply possible on the only available account (4 model families tried) |
| LIVE-007 | AC-001 alternate (SCN-A2), AC-002 | Real `agy` via the mounted dist module | Container CLI/module | Live | Pass | Proxy failure: raw exit 1 with 0 sign-in-wording lines → `AGY_MODEL_DISCOVERY_FAILED` generic text. Empty HOME → `AGY_SIGN_IN_REQUIRED`. Missing command → new not-found text. Signed-in → 18 models |
| LIVE-008 | AC-003 on a lapsed node (SCN-A1) | Menu after sign-in lapses, app reopened | Browser | Browser | Pass | New chat fell back to AutoByteus (`claude-fable-5`, existing designed behavior); AGY row "Unavailable" + sign-in reason; label vertically aligned with the name (Δ 0.25 px) |
| DOCS-001 | AC-008 | Docker README, AGY module doc, web `chat.md` | Docs review | — | Pass | README "CLI Auth Model" names the in-app message, the Terminal `agy` fix, the reopen step and per-node `/root` persistence across image updates; matches the observed behavior |

## Additional Repository Coverage Execution

None beyond the investigation's plan (all executed; results above).

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 85% | +10 | AC-001..005, AC-007 (repo + live mapper input), AC-008 proven. AC-006 proven up to provider inference | AC-006 "streams and completes" not observed (external quota) |
| Changed-boundary execution directness | 85% | 97% | +12 | Real `agy` on the real image through the real GraphQL/store/menu | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | +20 | Store forced fetch, Nuxt → Docker node, real CLI, real sign-in state | Electron shell not used (no shell change) |
| Environment, configuration, identity, fixture fidelity | 75% | 96% | +21 | User nodes' image; `dist` differs only in the changed module; real sign-in copied, nothing else | — |
| Failure, edge-case, lifecycle, recovery evidence | 90% | 96% | +6 | Signed-out, empty HOME, network failure, missing CLI, recovery without reload, lapse after use, quota error surfaced | Future upstream wording (RSK-001, accepted) |
| User-surface, browser, desktop-shell confidence | 80% | 95% | +15 | en + zh-CN desktop, keyboard skip, alignment; narrow sheet by implementation r2 | Electron shell (no shell code changed) |
| Durable regression coverage quality and relevance | 92% | 96% | +4 | New GraphQL E2E shown to fail on the base classifier | — |

- Overall post-repository confidence: 81.7%
- Overall final confidence: 94.3%
- Calculation: simple average of the seven categories.
- Every critical acceptance criterion directly proven: `No`. AC-006's completed run is unproven.
- Final category below 90%: `Yes` — requirement and AC proof (85%), because of AC-006.
- 95% target met: `No`.
- Confidence-limiting residual risk: a successful AGY turn on a Docker node (streamed reply and completion) was not observed. This ticket does not change that code path (run factory success branch, AGY transport); the only signed-in Antigravity account has no quota left on any model.

## Broader Validation Decision And Execution

- Decision: `Required`; mode: Live API + Browser against a test-owned Docker node.
- Blocked part: LIVE-006 only. Exact unavailable dependency: an Antigravity account with remaining model quota.
  - The only signed-in account is the same on node 8001 and on this Mac (checked by comparing hashed account IDs; nothing printed).
  - Nodes 8002–8007 have no sign-in.
  - Quota reset times reported by the provider: Gemini models about 10 h from 2026-10-12 ~18:45 local (≈ 2026-10-13 04:50 local); Claude and GPT-OSS models about 113 h.
  - Tried: `gemini-3.6-flash-low`, `gemini-3.1-pro-low`, `claude-sonnet-5-5-low`, `gpt-oss-120b-medium`, `gemini-3.8-flash-low`. All got the same 429.
- Startup:
  - `docker run -d --name agy-api-e2e-node -p 127.0.0.1:<free>:8000 -v <worktree>/autobyteus-server-ts/dist:/app/autobyteus-server-ts/dist:ro autobyteus/autobyteus-server:beta`; healthy after about 10 s.
  - Nuxt dev with `BACKEND_NODE_BASE_URL`, then headless Chrome (playwright-core).
- Identity:
  - Signed out: a fresh container `/root`.
  - Signed in: only the `antigravity-oauth-token` file, streamed `docker exec autobyteus-server-0 tar … | docker exec -i agy-api-e2e-node tar -x`. It was never on host disk and never printed. Node 8001 was only read.
  - Sign-out: deleting that file in the test container.

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Signed-out node, GraphQL | `enabled:false`, sign-in text | exact | `live-001-signed-out.txt` | Pass |
| Open menu (en / zh-CN) | Unavailable/不可用 + reason | as expected | `LIVE-002-signed-out-en.png`, `LIVE-003-signed-out-zh-CN.png` | Pass |
| Sign in on node, reopen | 1 forced AGY request, enabled, models | 1 request; enabled at 2.1 s; 18 models | `LIVE-004-signed-in-reopened.png`, `results.json` | Pass |
| Third open | no availability request | 0 requests | `results.json` | Pass |
| Pick AGY model, send | streamed reply, run completes | provider 429 quota error shown in UI; run status Error | `run-2/LIVE-006-*.png` | Blocked |
| Sign-in lapses, reopen app | AGY Unavailable + reason; not preselected | as expected | `run-2/LIVE-008-lapsed-sign-in.png` | Pass |

## Desktop Application Validation

- Web-equivalent renderer in headless Chrome against the Nuxt dev build of this worktree. No shell, preload or IPC code changed; the Electron shell was not exercised (no confidence consequence for this change).
- Effect on the running desktop app and the user's nodes: `None`.

## Platform / Runtime Targets

- Host macOS (Darwin 25.5.0), Docker Desktop. Image `autobyteus/autobyteus-server:beta` (`sha256:62ee64827c53…`, 1.5.3-beta.1, Ubuntu 24.04), `agy` 1.3.3.
- Google Chrome (system) via playwright-core, headless. Viewport 1512×952; locales en-US and zh-CN.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- `Not Affected`; no compatibility branch observed. Recovery after sign-in needs no server restart (API-001, LIVE-004).

## Durable Coverage Changed In The Codebase

- Durable coverage added: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` | Added | AC-001 (signed-out reason, no CLI output, generic text for network failure), AC-004 server half (enabled and models after sign-in without restart), through the GraphQL schema | 3/3 Pass; fails 2/3 against the base classifier |

- Test-code review: `Not Required — direct low-risk route`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/repo/*.log` | Repository command logs | Retained | |
| `api-e2e-evidence/live/live-001-signed-out.txt` | Real CLI + GraphQL on signed-out node | Retained | |
| `api-e2e-evidence/live/run-1/`, `run-2/` | Probe results, case logs, screenshots, Nuxt log | Retained | Scanned: no credentials or account identifiers |
| `api-e2e-evidence/scripts/docker-node-live.mjs` | Temporary live probe | Retained as evidence | `CASES=` and `AGY_MODELS=` select the cases and models for the LIVE-006 rerun |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Test-owned container `agy-api-e2e-node` | Real image + real `agy` without touching user nodes | LIVE-001..008 | Removed (`docker rm -f -v`); no `agy-api-e2e-*` container remains |
| Streamed sign-in token copy | Signed-in state without altering 8001 | LIVE-004/006/007 | Gone with the container |
| `/tmp/agy-api-e2e-cmp` (image `dist` copy for diff) | Prove the image differs only in the changed module | `diff -rq`: 3 files, all `antigravity-cli-capability.*` | Removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| `agy` (durable tests only) | Scripted CLI reproducing 1.3.3 output | Deterministic, credential-free regression | Covered live by LIVE-001/007 |
| Image built from this branch | Released image + this branch's `dist` mounted read-only | Whole-`dist` diff shows only the changed module differs; avoids a 9 GB rebuild | None material |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-001, REPO-001..004, LIVE-001..005, LIVE-007, LIVE-008, DOCS-001 | All changed behavior proven, live on a Docker node with the real CLI |
| Blocked | LIVE-006 (AC-006) | Antigravity account quota exhausted for every model; external dependency |

## Cleanup Performed

| Resource | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Container `agy-api-e2e-node` (incl. token copy) | Mine | `docker rm -f -v` | Removed |
| Nuxt dev process groups (2 runs) | Mine | SIGTERM | Stopped |
| Headless Chrome (2 runs) | Mine | `browser.close()` | Closed; the remaining headless Chrome processes date from 2026-10-10 and are not mine (left alone) |
| `/tmp/agy-api-e2e-cmp`, scripted-CLI temp dirs | Mine | `rm -rf` / test `afterAll` | Removed |
| User nodes `autobyteus-server-0..6` and volumes | User | None (8001 only read) | Untouched, still running |

## Preliminary Classification

No `Fail`. No defect found in the implementation, requirements or design. The open item is an external dependency (Antigravity quota), not a product issue.

## Round 2 (IR-002) Delta

The change in IR-002 is only the `AGY_SIGN_IN_REQUIRED` message text: "Not signed in on this node. Run `agy` to sign in." (was "Antigravity CLI is not signed in. Run `agy` in this node's terminal and complete sign-in, then try again."). Pattern, other texts, UI and re-check are unchanged (`git diff 87b246c7d 56b11aeae -- autobyteus-server-ts/src autobyteus-web/{components,composables,localization}`: one line in the classifier, plus one test constant). Every case that asserts the sign-in text was re-run against `56b11aeae`.

| Case ID | Round-2 Execution | Result | Evidence |
| --- | --- | --- | --- |
| API-001 + REPO-002 | Clean-env GraphQL E2E. The implementation updated the expected string in my test; I re-checked it | Pass (7/7) | `api-e2e-evidence/repo-r2/api-001-and-repo-002.log` |
| REPO-001 | `tests/unit/runtime-management` + AGY consumers | Pass: 474 passed. One unrelated timeout in `grok/grok-build-capability.test.ts`: 938,972 ms against a 5 s limit while the machine's load average was 97–141 (other agents' vitest runs plus Discord). That points to a paused process. Re-run alone: 5/5 pass | `repo-r2/r1-server-unit-focused.log`, `repo-r2/grok-capability-rerun.log` |
| REPO-003 | Web menu specs | Pass (17/17) | `repo-r2/r3-web-menu-specs.log` |
| REPO-004 | Guards, typecheck, `git grep` for the old text | Pass; old text absent from server/web source | `repo-r2/r4-guards-typecheck.log` |
| LIVE-001 | Fresh test node with `56b11aeae` dist (classifier text verified in the container), real agy 1.3.3 signed out | Pass: GraphQL reason and catalog error equal the new text exactly | `live-r2/live-001-signed-out.txt` |
| LIVE-002 | en menu | Pass: "Unavailable" + full reason in 2 lines, not clamped (no ellipsis); `title` = reason; `aria-disabled`; arrow keys skip it | `live-r2/run-1/LIVE-002-signed-out-en.png` |
| LIVE-003 | zh-CN menu | Pass: "不可用" + reason | `live-r2/run-1/LIVE-003-signed-out-zh-CN.png` |
| LIVE-004 | Sign-in streamed from 8001, reopen | Pass: exactly 1 `GetRuntimeAvailability(antigravity_cli)`; last state kept at first paint; enabled after 2.4 s; 18 models | `live-r2/run-1/LIVE-004-signed-in-reopened.png` |
| LIVE-005 | Third open | Pass: 0 availability requests (only unrelated history queries) | `live-r2/run-1/results.json` |
| LIVE-007 | Real agy alternates via mounted dist | Pass: empty HOME → new sign-in text; proxy → generic; missing → not-found text | `live-r2/run-1/results.json` |
| LIVE-008 | Lapsed sign-in, app reopened | Pass: AGY row shows new text; New chat on AutoByteus; label aligned | `live-r2/run-1/LIVE-008-lapsed-sign-in.png` |
| LIVE-006 | Not re-run (no quota) | Still Blocked | round-1 evidence |

Basis mismatch: the approved requirements (REQ-001, SCN-001, DEC-005) and the design's row example still fix the old text. No solution revision records the user's chosen wording yet. This needs only a Requirement Gap record update by the Solution Designer; the code and tests follow the user's choice. My validation asserts the new text. If the old text were restored, it would be a one-string change in five test files.

Isolated desktop instance `iso-58079-eeac`, which I started for the user's own test, still runs the IR-001 build, so it shows the old text. It is left running for the user and stopped on request (`pnpm --silent isolated-app stop iso-58079-eeac`).

Round-2 cleanup: test container `agy-api-e2e-node` (with its token copy) removed; Nuxt and Chrome stopped; `/tmp/agy-api-e2e-r2` removed; evidence scanned with no credentials found; user nodes untouched (7 running).

Scorecard after round 2: unchanged from round 1. Requirement and AC proof is 85% (AC-006 completion leg); the others are 95–97%; overall 94.3%.

## Round 3 Delta — LIVE-006 (AC-006) after the quota reset

- 2026-10-13 04:5x local, just after the provider's reported Gemini quota reset. Fresh test-owned Docker node, same image, `56b11aeae` server dist mounted read-only (classifier text verified in the container). The sign-in token was streamed from node 8001's container only.
- Journey (real user path): New chat → model menu → Antigravity CLI (enabled, 10 models offered by the provider now) → `gemini-3.8-flash-low` → send "Reply with exactly the word PONG-7731 and nothing else. Do not use any tools."
- Observed: URL moved to the run; the assistant reply `PONG-7731` streamed into the run view 5.2 s after send; status `Agent Status: Idle`; `getRunProjection` conversation = `user: …`, `assistant: PONG-7731`; `getAgentRunResumeConfig.metadataConfig` = `runtimeKind: antigravity_cli`, `llmModelIdentifier: gemini-3.8-flash-low`. The first preference (`gemini-3.6-flash-low`) is no longer offered by the provider and was skipped.
- Result: **Pass**. Evidence: `api-e2e-evidence/live-r3/run-1/` (`results.json`, `cases.jsonl`, `LIVE-006-gemini-3.8-flash-low.png`).
- User verification (2026-10-13): the user tested the rebuilt isolated desktop app (`iso-64845-37b5`, commit `56b11aeae`). Signed out, it showed the new reason; after `agy` sign-in it showed Antigravity enabled with its models. The user reported "it works … its working great" and "I verified the task is working". The instance has since been stopped, with its data root removed.
- Cleanup: container `agy-api-e2e-node` with its token copy removed; `/tmp/agy-api-e2e-r3` removed; Nuxt and Chrome stopped; no isolated instance of mine running; user nodes untouched (7 running); evidence scanned, no credentials.

### Final Validation Confidence Scorecard

| Confidence Category | Round 1/2 Final | Final (Round 3) | Change | Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | AC-001..AC-008 all directly proven; AC-006 by a real streamed reply on a Docker node; user verification | — |
| Changed-boundary execution directness | 97% | 97% | 0 | | — |
| Cross-boundary integration realism and mock gap | 95% | 96% | +1 | Real run end-to-end through browser → server → real agy → provider | Electron shell exercised only by the user's manual check |
| Environment, configuration, identity, fixture fidelity | 96% | 96% | 0 | | — |
| Failure, edge-case, lifecycle, recovery evidence | 96% | 96% | 0 | | RSK-001 upstream wording drift (accepted) |
| User-surface, browser, desktop-shell confidence | 95% | 96% | +1 | User's own check in the isolated desktop app | — |
| Durable regression coverage quality and relevance | 96% | 96% | 0 | | — |

- Overall final confidence: 96.1% (simple average). Every critical acceptance criterion directly proven: `Yes`. No category below 90%. 95% target met: `Yes`.

## Latest Authoritative Result

- Result: `Pass` (round 3)
- Final validation confidence: 96.1%
- 95% target met: `Yes`
- Final category below 90%: `No`
- Broader validation decision: `Required`, executed in full (Docker node, real agy, browser, real run)
- Critical acceptance criteria lacking direct proof: none
- Requirement Gap: resolved by SR-005 (new sign-in text recorded and approved)
- Durable coverage: added `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` (uncommitted, ready for delivery)
- Test-code review decision: `Not Required — direct low-risk route`
- Next recipient (`get_handoff_rules`, direct-route Pass, Small/Low): `/software_engineering_team/delivery_engineer`
- Notes:
  - SR-004's user decision is superseded by direct evidence: LIVE-006 passed after the quota reset, so no residual risk had to be accepted.
  - The user's TESTING.md addition (agy sign-in isolation, Docker test nodes) is drafted in the worktree, uncommitted, with the user's confirmation of the wording pending. If the user approves, commit it separately as `docs(testing): …`.
