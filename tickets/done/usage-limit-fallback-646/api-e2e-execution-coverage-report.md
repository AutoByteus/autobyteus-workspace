# API/E2E Execution Coverage Report — usage-limit-fallback-646 (autobyteus-646)

## Round

- Coverage investigation `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md`, `API-REV-001`; progress log `api-e2e-test-progress.md`
- Round 1; trigger: the code reviewer's CRR-002 Pass (code `1bc523124e`)
- Deviations from the plan:
  - **UL-10 ("not quiet") was reworked.** Its first form held Codex's turn end 4 s after Codex's `error`. The server ends a Codex turn at its `error`, so the run was idle at once: the switch came 0.6 s after the event and stopped the scripted process before the delayed end. Codex's own ending order never makes the run "not quiet". The real-use case that does is a person's next message still running when the switch arrives, which UL-10 now drives.
  - **The local delegation's node fallback (UL-11) needs a delegator that can act while its own launch is exhausted.** The native runtime never reports a usage limit, and the scripted Codex can't call tools. So the scripted AGY's `runtime_error` case now serves a `CALL_TOOL` message as an ordinary turn. No other suite sends one in that case, and both other suites that use it pass.
  - **Live runtimes at a real limit:** Not Tested (below).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646/tickets/in-progress/usage-limit-fallback-646/evidence/API/`

## Routing Classification

- As carried (reviewed route: code review selected); test-code review: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Runtime / Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `1bc523124e`; tests `b5e56fcc50` | macOS 26 (Darwin 25.5.0), arm64 | Node 22.23.1; this worktree's `dist` (rebuilt) | `env -i`, test-owned data roots; the scripted Codex app-server, the scripted AGY CLI, an LM Studio-compatible scripted model; two built servers paired for the peer suite; no real provider |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 … AC-004, R-17 … R-19, the not-quiet retry | built server: Codex, AGY, AutoByteus (scripted) | `env -i … RUN_USAGE_LIMIT_SWITCH_E2E=1 … vitest run tests/e2e/run-events/usage-limit-switch-built-server.e2e.test.ts` | ENV-1 | Pass | `API-01-built-server.log`, `API-01-ul-receipt.json` | `Tests  12 passed (12)`. UL-10 `{"heldTurnEndedAt":"…:15.717Z","switchedAt":"…:16.133Z"}`, one switch. UL-11 copy launch `{"origin":"node_fallback","fallbacks":[{"layer":"agent_default",…"detail":"gpt-e2e is exhausted until …"}]}`, the result "it runs on AutoByteus / … (chosen by the node)". UL-12 `chosenBy: node_fallback`, the tree's new launch | UL-01 … UL-09 are the implementation's cases; UL-10/11/12 are new. The development runs are listed in the log |
| API-02 | AC-002, R-11, R-17 on a peer | two built servers | `env -i … RUN_USAGE_LIMIT_PEER_E2E=1 … usage-limit-switch-peer-run.e2e.test.ts` | ENV-1 | Pass | `API-02-peer.log`, `ULP-01.json`, `ULP-02.json` | `Tests  2 passed (2)`. ULP-02 on beta `launchSource.origin: node_fallback`, the skipped Codex default recorded, no Codex turn; alpha's result says "chosen by the node" | ULP-02 is new: a peer-started run has no inherited launch |
| API-03 | — | whole ungated server E2E | `env -i … pnpm test:e2e`; then the failed file alone ×3 | ENV-1 | Pass (one teardown race, FU-646-05) | `API-03-e2e.log`, `API-03-e2e-full.log.gz` | `Tests  575 passed`; one file, `search-files-through-gate`, failed in its teardown (`ENOTEMPTY … remote-access`) at load 44–54; alone ×3: `1 passed` | Untouched by this ticket; plus the other `runtime_error` suites: `26 passed` |
| API-04 | the Settings switch (C-6) | browser, two nodes | `pnpm -C autobyteus-web test:e2e:model-routing-decisions --output-dir=<dir>` | ENV-1 | Pass except MRD-04 (FU-646-04, before this ticket) | `API-04-probe.log`, `API-04-probe/` | `Pass MRD-01 …` (the switch under the router settings), MRD-02/03/05/06/07/08 Pass; `Fail MRD-04 … writer card: undefined` | MRD-04 looks for `/studio/writer`; the tree's address is `/writer` |
| API-05 | — | fresh clone (the contract package's `dist`) | clone `b5e56fcc50`, `pnpm install --frozen-lockfile`, both typechecks | ENV-1 | Pass | `API-05-fresh-start.log` | `install exit 0`; server `972 …` PASS; web `86 …` PASS | — |
| API-06 | — | tracked imports; server typecheck after the tests | checker; typecheck | ENV-1 | Pass | `API-06-imports.log` | `Tracked-import check passed`; `972 in 299 files (baseline …)` | — |
| API-07 | AC-001 live (an exhausted account), Claude's SDK signal | real runtimes at a real limit | — | — | Not Tested | — | — | No account is exhausted now (the host Codex login's limit reset at 07:43 today), and exhausting one would spend the user's credits. AC-001's stated other method (unit with recorded payloads, IMP-11) and the scripted app-server cover it |
| Reused | AC-001 (recorded payloads), AC-004, the rest | unit, integration, web, contracts | IMP-11 (server unit), IMP-12 (integration), IMP-13 (web, contracts) | — | Pass | (handoff) | — | code unchanged since |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result | Note |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | Reused unit (recorded payloads), API-01 (the scripted app-server sends Codex's three terminal errors; one event; reset from the limits read) | Proven (by its stated method) | The gated live case "when an account is exhausted": Not Tested (API-07) |
| AC-002 | Yes | API-01 (UL-06 history, UL-11 node fallback), API-02 (ULP-01, ULP-02) | Proven | — |
| AC-003 | Yes | API-01 (UL-01, UL-02, UL-04, UL-08, UL-09, UL-10, UL-12) | Proven | — |
| AC-004 | Yes | Reused (server test), API-01 (UL-05, nothing usable) | Proven | — |

## Observations For Review

- The not-quiet retry is reached in real use when the person's next message is still running when the switch arrives. Codex's own ending order (its `error` ends the turn) never produces it, so UL-10 drives the former.

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | API-01, API-02 | AC-001 live |
| Changed-boundary execution directness | 85% | 95% | built servers, two nodes | — |
| Cross-boundary integration realism and mock gap | 75% | 92% | real server flow end to end | the runtimes are scripted (Codex's payload as documented; Claude has no recorded payload) |
| Environment, configuration, identity, fixture fidelity | 85% | 95% | `env -i`, test-owned roots, fresh clone | — |
| Failure, edge-case, lifecycle, recovery | 80% | 95% | not quiet, nothing usable, setting off, restart (UL-04) | — |
| User-surface / browser | 90% | 93% | MRD-01 | MRD-04 stale (FU-646-04) |
| Durable regression coverage | 85% | 95% | UL-10/11/12, ULP-02 | — |

- Overall final confidence: 94%. Every critical criterion is proven by its stated method; no category is below 90%. The 95% default target is not met: the remaining gap is a real runtime at a real usage limit, which can't be produced here without spending credits.
- Residual risks:
  - Codex's live payload could drift from the recorded one.
  - Claude classifies by its limits read until an SDK payload is recorded.
  - R-6 (release condition, the founder): with Model Routing on, the router can't answer a switch request yet, so up to 40 s pass before history decides (UL-03).

## Broader Validation Decision (Mandatory)

- Decision: `Required`. Executed: built servers and a two-node pair. Blocked only for a live exhausted account (no account is exhausted; making one costs credits).

## Persisted-Data Transition Checks

- New logs only (`run-events/events_*.jsonl`, `model-routing/switches_*.jsonl`). Their contents are checked in API-01 and API-02. No migration.

## Compatibility / Legacy Scope Check

- None introduced, observed or covered.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-events/usage-limit-switch-built-server.e2e.test.ts` | Updated: UL-10, UL-11, UL-12 | API-01 |
| `autobyteus-server-ts/tests/e2e/run-events/usage-limit-switch-peer-run.e2e.test.ts` | Updated: ULP-02 | API-02 |
| `autobyteus-server-ts/tests/fixtures/codex-usage-limit-app-server.mjs` | Updated: `HOLD_LIMIT:<ms>` holds a turn; its end time is logged | API-01 |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: in `runtime_error`, a `CALL_TOOL` message is an ordinary turn | API-01, API-03 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Codex | the scripted app-server (this ticket's) | no exhausted account; no credits spent | its payload is the recorded one |
| AGY, AutoByteus models | scripted CLI, scripted LM Studio | deterministic | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Data roots, homes, the fresh clone | Yes | removed by the suites / by hand | removed |
| UL-10/11 diagnostics | Yes | removed from the test before the commit | removed |

## Latest Authoritative Result

- Result: `Pass`. All four ACs are proven by their stated methods. Not Tested: AC-001's gated live case and Claude's SDK signal (no exhausted account; exhausting one spends credits).
- Evidence decisions requested: `None` (AC-001's own method is met; the live case is conditional, "when an account is exhausted").
- Next recipient from `get_handoff_rules`: `/code_reviewer` (test-code review).
