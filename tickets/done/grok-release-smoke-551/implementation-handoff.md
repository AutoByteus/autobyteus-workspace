# Implementation Handoff — grok-release-smoke-551

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-release-smoke-551`, branch `codex/grok-release-smoke-551`, base `origin/personal` @ `df00f97aaa`. Paths are relative to the worktree; server paths are relative to `autobyteus-server-ts/`.

## Upstream Artifact Package

- Upstream review and handoff rule: `task_size=Medium`, `architectural_risk=High`, so the package went through architecture review. ARCH-REV-001 passed on SR-001/SR-002. Implementation → `get_handoff_rules` → `/code_reviewer`.
- Requirements doc: `tickets/in-progress/grok-release-smoke-551/requirements-doc.md` (approved at SR-001)
- Investigation notes: `tickets/in-progress/grok-release-smoke-551/investigation-notes.md`
- Solution revision record: `tickets/in-progress/grok-release-smoke-551/solution-revision-record.md`
- Design spec: `tickets/in-progress/grok-release-smoke-551/design-spec.md` (SR-002)
- Supplemental task artifacts: `evidence/SD-probes-2026-11-22.md` and the probe scripts (P1–P17)
- Design review report: `design-review-report.md` (ARCH-REV-001); architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review, API/E2E and delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits:
  - `5054f97a17`: code, tests and module doc.
  - Then the documents commit: the SD/reviewer ticket documents (uncommitted until now) and these implementation documents with evidence.

### Intended Change 1: start-up bounds (REQ-001)

- `src/runtime-management/acp/acp-client-connection.ts`: `INITIALIZE_TIMEOUT_MS` is split into two names, with no alias:
  - `AGENT_START_TIMEOUT_MS = 90_000` (:32) for `initialize`;
  - `REQUEST_TIMEOUT_MS = 30_000` (:34) for `extension`, `session/set_config_option`, `session/list` and `session/close`.
  - All six uses are renamed. Session opens (120 s) and prompts (unbounded) are unchanged.
- `src/runtime-management/acp/acp-discovery-handshake.ts`: `DISCOVERY_TIMEOUT_MS = 90_000` (:12). A step deadline still cuts it.
- `src/runtime-management/grok/grok-build-capability.ts`: `PROBE_TIMEOUT_MS = 10_000` (:13).

### Intended Change 2: discovery reads Grok's announced catalog (REQ-002)

- Connection: `onConnectionNotification(listener)` (:158) returns the unsubscribe, like `onClose`.
  - `routeExt` sends a notification without a `sessionId` to `notifyConnectionListeners` (:281-285). This runs inside 517's per-frame try/catch.
  - Each listener has its own try/catch, which logs `ACP_FRAME_HANDLER_FAILED … connection listener`.
  - Runs register no listener, so connection-wide notifications are still dropped there.
  - The old drop comment is replaced.
- Discovery helper:
  - `withShortAcpProcess` passes `boundEndsAt` (`Date.now()` scale, :62) to `use`.
  - `runAcpDiscoveryHandshake(profile, { method, withinMs }, options)` (:91) returns `{ initialize, followUp }`.
  - The listener is attached before `initialize`, and the first matching notification is kept.
  - After the answer, the wait runs `min(withinMs, boundEndsAt − 250 − now)`. It returns at once when a notification has already come, and ends early when one comes. It never rejects: without a notification, `followUp` is `null`.
  - The shared files name no agent; the neutrality test is green.
- Grok capability: `GROK_MODELS_UPDATE_METHOD = "_x.ai/models/update"` and `GROK_MODELS_UPDATE_WAIT_MS = 3_000` (:112, :118), both module-private. It normalizes `followUp ?? modelStateOf(initialize)` (:134).
- `normalizeGrokBuildModels(modelState: unknown)` in `grok-build-launch-profile.ts` (:66) reads `{ availableModels }` from either source.

### Intended Change 3: workspace trust for Grok runs (REQ-003)

- `GROK_BUILD_RUN_TRUST_ENV = { GROK_FOLDER_TRUST: "0" }` (:34, module-private, beside `GROK_BUILD_DISABLED_TOOL_ENV`).
- `grokLaunch(model, effort, trustWorkspace)`: `runLaunch` passes `true` and `discoveryLaunch` passes `false` (:117-118). The billing request uses `discoveryLaunch`, so it stays untrusted. `--trust` is never passed.

### Doc

`docs/modules/grok_build_runtime.md` now covers:
- the probe bound of 10 s;
- the 90 s process bound and why;
- the 3 s `_x.ai/models/update` wait and why;
- the cost on every catalog read and every Grok run start (validation reads the full, uncached catalog; review note);
- that the wait never becomes a time-out;
- the run-only `GROK_FOLDER_TRUST=0`: what trust loads (hooks, MCP/LSP, instructions, permission rules, user hooks), that nothing is written, and that discovery and billing stay untrusted.

## Routing Classification (Mandatory)

- Task size: `Medium`. Architecture risk: `High`. From design-spec "Task Size And Architectural Risk".
- Classification: `Confirmed`. The change has five source files plus the doc in the two named subsystems. The security change (run trust) and the shared-contract changes (connection listener, a start-up bound shared with DeepSeek) are exactly as classified.
- Selected route: `Code Review`. Lightweight self-review: `Not Applicable` (High).
- New design impact or escalation trigger: `None`. No other runtime's trust changed, and nothing writes to the user's Grok settings (IMP-03 trust-list hash unchanged).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | discovery waits 90 s for `initialize`; a silent agent still fails with the time-out kind | `discoverGrokBuildModels` → probes (10 s) → `runAcpDiscoveryHandshake` → `withShortAcpProcess` (90 s) → `AcpClientConnection.initialize` (90 s) | unit: answer at 40 s taken; silent agent pending at 89.999 s, `AcpDiscoveryError kind timeout` at 90 s (IMP-01); error text unchanged |
| BEH-002 | run start waits 90 s for `initialize`; a silent agent still fails | `AcpSessionLauncher.open` → `connection.initialize()` (90 s) | unit at the connection: answer at 40 s taken; `ACP_REQUEST_TIMEOUT: initialize` at 90 s, not before; other requests still 30 s (IMP-01) |
| BEH-003 | discovery offers the announced list, otherwise the answer's list | listener before `initialize` → `followUp` → `normalizeGrokBuildModels(followUp ?? modelState)` | unit: built-in then announced → `grok-4.7`; announced before answer → `grok-4.7`; none → built-in list; the window ends early on the announcement (IMP-01). Live fresh case: `grok-4.7` in initialize + about 3.07 s (IMP-04) |
| BEH-004 | Grok runs load the workspace's own `.grok/skills`; nothing written to the user's trust list | `grokBuildLaunchProfile.runLaunch` env + `GROK_FOLDER_TRUST=0` → process with cwd = workspace | unit: run env has it, discovery env does not, no `--trust`. Live AC-104 ×3 pass; `trusted_folders.toml` shasum unchanged (IMP-03) |

- Changes stayed within the Scope Guardrail: `Yes`. The 8 s step deadline, `SESSION_OPEN_TIMEOUT_MS`, the skill materializer, `release_smoke.py`/the live suite, DeepSeek's discovery logic and other runtimes' trust are untouched.

## Key Files Or Areas

- `src/runtime-management/acp/acp-client-connection.ts` (317 effective lines)
- `src/runtime-management/acp/acp-discovery-handshake.ts` (148)
- `src/runtime-management/grok/grok-build-capability.ts` (131)
- `src/runtime-management/grok/grok-build-launch-profile.ts` (109)
- `docs/modules/grok_build_runtime.md`
- Tests:
  - `tests/unit/runtime-management/acp/acp-client-connection.test.ts` (+5 cases);
  - `tests/unit/runtime-management/acp/acp-discovery-handshake.test.ts` (new, 5 cases);
  - `tests/unit/runtime-management/grok/grok-build-capability.test.ts` (+3 cases, plus the no-announcement case now asserting the 3 s wait);
  - `tests/unit/runtime-management/grok/grok-build-launch-profile.test.ts` (+2 cases, normalizer calls updated).
- No new fixture files: the cases build fixtures from the `handshake` rows with `writeCustomFixture` and the fake agent's pause row.

## Important Assumptions

- The window starts at `initialize`'s answer, not at spawn, as the design specifies.
- `boundEndsAt` uses `Date.now()` while the bound's timer runs on the monotonic clock. A millisecond-scale skew only shifts where the 250 ms margin falls.

## Known Risks

- RSK-001 (design): an announcement later than 3 s under heavy load means one stale list. This was not seen live today, because the sign-in was fresh (IMP-04).
- **The two 90 s timers.** In a discovery without a deadline, the short-process bound and the connection's `initialize` bound are both 90 s. The process bound's timer is armed first, so it fires first and the result is the `timeout` kind. The fake-timer case asserts `kind: "timeout"`. If the `initialize` timer ever fired first, the result would read `failed` (`GROK_MODEL_DISCOVERY_FAILED`) rather than the time-out text.
- **Agent exit during the wait.** If the agent process exits during the follow-up wait (after a good answer), the existing `closed` race still rejects with `failed`. This is the same as before for any close after `initialize`. Grok does not exit by itself, so I did not add handling (supported-scenario gate).
- **Quota.** IMP-03 spent 3 Grok prompts, a share of the free tier's daily quota.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: bug fix (three causes) plus a provider-behaviour adaptation.
- Reviewed root-cause classification: Mode 1 Local Implementation Defect; Modes 2 and 3 Missing Invariant.
- Reviewed refactor decision: `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`. Each change sits in the owner the design names.
- If challenged, routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. `INITIALIZE_TIMEOUT_MS` is renamed with no alias, `normalizeGrokBuildModels` changed signature, and `followUp` is a required parameter.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files removed: `Yes`. No unused export was added. Every new export is a parameter or result type of a public function, or that function itself. The trust constant and the Grok method/window constants are module-private. The repo has no unused-export tool, so I checked each new export with a grep.
- Dead code found elsewhere: None.
- Shared structures remain tight: `Yes`. The result is `{ initialize, followUp }`.
- Deviations from a design principle: `None`.
- Size guardrails: `Yes`. All files are far below 500 effective lines; the largest delta is +49/−8 (`acp-discovery-handshake.ts`, `git diff --numstat`).

## Persisted Data Transition Check (When Applicable)

- `Not Affected` (design-spec "Persisted Data / State Transition Decision"). Nothing new is stored.

## Environment Or Dependency Notes

- macOS 26.5.2, Node v22.23.1, Grok Build 1.0.92 (host sign-in).
- Dependencies were installed in this worktree (`pnpm install`, `pnpm -C autobyteus-server-ts prebuild`).
- The untracked `autobyteus-application-*-sdk/dist/` folders are build output and are not committed.

## Checks Run

Evidence: `tickets/in-progress/grok-release-smoke-551/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `vitest run tests/unit/runtime-management tests/unit/agent-execution/backends/{acp,grok,deepseek} tests/unit/llm-management`; control: the new tests on base source, and on base `acp-client-connection.ts` | `5054f97a17` content | macOS, Node 22 | connection, discovery helper, Grok capability and launch profile; DeepSeek and catalog users | BEH-001..004; AC-001, 002, 003 (unit), 005 (unit) | Pass; controls fail as expected | `IMP-01-unit-tests.log` | `Tests  554 passed (554)`; base source `12 failed \| 9 passed`; base connection `4 failed \| 10 passed` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | `5054f97a17` content | macOS, Node 22 | all TS, incl. cross-package tests | — | Pass | `IMP-02-typechecks.log` | `(baseline 1000 in 313 files)` PASS; `(baseline 86 in 36 files)` PASS |
| IMP-03 | `RUN_GROK_E2E=1 … workspace-skill-links-live.e2e.test.ts -t "AC-104"` ×3 (clean env); `shasum ~/.grok/trusted_folders.toml` before and after | `5054f97a17` | live Grok 1.0.92, grok-4.7, load 33–41 | run trust (BEH-004) end to end | AC-005, QR-002 | Pass 3/3 | `IMP-03-live-ac005-workspace-skill.log` | each repeat ✓, all-installed reply contains `OWNCODE-*`; hash `5631cafe…` before = after |
| IMP-04 | temporary vitest file: real Grok discovery ×3, initialize-only vs with the 3 s wait vs `discoverGrokBuildModels`; Grok log fields | `5054f97a17` | live Grok 1.0.92, load ~33 | BEH-003 live, fresh sign-in | AC-003 (fresh case), QR-001 | Pass | `IMP-04-live-ac003-discovery-fresh.log` | `initializeOnlyMs 789`, `discoverGrokBuildModelsMs 3855`, `models ["grok-4.7"]`; `had_real_catalog: true` |

- Not run, and why:
  - AC-003's stale case: it needs Grok's first start after at least 6 h unused, and Grok had been used minutes earlier. The requirements put it in AC-006's first smoke run (DEC-004 otherwise).
  - AC-006, the two release-smoke runs at load ≥ 40: owned by API/E2E and the release smoke.
  - A live Grok start-up above 30 s: it cannot be produced on demand (DEC-004).
  - Live DeepSeek: unchanged apart from the shared 90 s start-up bound, which is covered by unit tests.
  - A base control of the live AC-104 case: not run, to save Grok quota. The cause is established by the SD's P12.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: server-only. The model picker shows whatever the catalog offers, with no UI change.

## Downstream Coverage Hints / Suggested Scenarios

- AC-006: two `python3 scripts/release_smoke.py` runs at load ≥ 40, with Grok start-up times from Grok's log (fields `phase`, `elapsed_ms` only). Start the first after at least 6 h of Grok idle for AC-003's stale case; check the discovery pid's `had_real_catalog: false` and capture the `_x.ai/models/update` frame (review note).
- A live start-up above 30 s, if one happens during the smoke, is the live proof of REQ-001.
- The org `ROOT_LIFECYCLE` 15 s wait (`grok-build-live-runtime.e2e.test.ts`) predates this change. Flag it if it fails under load (review note).

## API / E2E / Executable Coverage Investigation And Execution Still Required

AC-006 (release smoke ×2 at load), AC-003's stale live case, and AC-004 (covered by AC-003 plus the smoke).
