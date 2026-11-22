# API/E2E Execution Coverage Report — grok-release-smoke-551

## Round

- Coverage investigation: `tickets/in-progress/grok-release-smoke-551/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/grok-release-smoke-551/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/grok-release-smoke-551/api-e2e-test-progress.md`
- Round and trigger: round 1; code review pass CRR-001 (reviewed route, Medium/High)
- Prior round reviewed: None
- Deviations from the investigation's plan:
  - Smoke run 1 started at 13:20Z, not 14:20Z: the stale catalog depends on Grok's sign-in token expiring about 6 h after its last refresh (`auth.refresh.success` 07:11:47Z, the only one today), not on 6 h without any Grok use; another process used Grok at 09:50:37Z with a valid token (no refresh), which did not move the expiry. Run 1 did show the stale start.
  - Run 1's concurrent load (`test:unit` alone) ramped late: the 1-minute load was 10.5 when its Grok part started and 39–51 at its end. Run 2 used two concurrent loads (`test:unit` + web `test:nuxt`) and started only after the load held ≥ 40.
  - The concurrent load generators' own logs are not kept (load only, not evidence; they carry unrelated test output).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-release-smoke-551/tickets/in-progress/grok-release-smoke-551/evidence/` (API-* files and folders; IMP-* from implementation)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (on Pass)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `83488cecb9` (code `5054f97a17` + this round's test) | macOS 26.5.2 arm64, Node 22.23.1 | in-process studio server; scripted Grok CLI (`tests/fixtures/grok-acp/fake-grok-cli.mjs`); real `dsh` for DeepSeek | no real Grok (Grok's log unchanged during these runs) |
| ENV-2 | `83488cecb9` | same | `python3 scripts/release_smoke.py`: real `claude` (haiku), `codex` (gpt-5.6-luna), `grok` 1.0.92 (grok-4.7, host sign-in); scripted AGY; deterministic native LLM | concurrent load: run 1 `test:unit`; run 2 `test:unit` + `test:nuxt` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001, AC-002, AC-003, AC-005 (unit) | connection bounds and listener, discovery helper, Grok capability, launch profile | Reused: IMP-01, IMP-02 | — | Pass | (handoff) | (handoff) | same code; base controls in IMP-01 fail as expected |
| API-R2 | AC-005, QR-002 | live AC-104 ×3, trust-list hash | Reused: IMP-03 | — | Pass | (handoff) | (handoff) | — |
| API-R3 | AC-003 (fresh case), QR-001 | live discovery timing | Reused: IMP-04 | — | Pass | (handoff) | (handoff) | `discoverGrokBuildModelsMs 3855` |
| API-01 | AC-001, AC-002 | real server, scripted Grok answering `initialize` after 35 s | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts --no-watch`; negative control with the four changed source files from base | ENV-1 | Pass | `API-01-slow-initialize/vitest.log`, `negative-control-base-source.log`, `attempt2-negative-control-base-source.log`, `attempt1-reload-not-offered.log`, `attempt2-create-only.log` | branch `Tests  11 passed (11)`; base: `Grok Build model discovery timed out` at 15452 ms (model list read) and `ACP_REQUEST_TIMEOUT: initialize did not respond in time` at 30204 ms (run start); `grok log bytes before 4035226 after 4035226` | attempt 1 used a reload mutation Grok does not offer (`DYNAMIC_PROVIDER_NOT_AVAILABLE_FOR_RUNTIME`); attempt 2's control showed run creation does not wait for discovery (8 s step deadline), so the final case reads the model list itself |
| API-02 | BEH-002 preserved (shared connection and start bound) | Grok compaction replay; DeepSeek scripted provider (real dsh) | the two files (header of `API-02-acp-suites/vitest.log`) | ENV-1 | Pass | `API-02-acp-suites/vitest.log` | `Tests  3 passed (3)`; `Tests  6 passed (6)` | the `RELAY_KEY_NOT_SET` lines are the DeepSeek suite's own key cases |
| API-03 | — | typechecks after the test addition | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-03-typechecks.log` | `(baseline 1000 in 313 files)` `PASS`; `(baseline 86 in 36 files)` `PASS` | — |
| API-04 run 1 | AC-003 (stale case), AC-004, AC-005, AC-006 (partly) | release smoke, Grok's first start after its token expired | `evidence/API-04-smoke-run.sh <worktree> API-04-smoke-run1 <dir> <13:20Z>` | ENV-2 | Pass (all cases); AC-006's load not met | `API-04-smoke/API-04-smoke-run1.log`, `.grok-startups.jsonl`, `.load-samples.log` | `result    PASS`, 13 PASS, `models … "grok": "grok-4.7"`; pid 6299 (first Grok start, the model list read) `had_real_catalog: false`, `model_count: 2` → `fetch succeeded` → `notifying clients` `model_count: 1`; Grok start-ups 186–297 ms; load samples `10.50` at 13:26:26 → `39.01` → `51.09` | stale proof: Grok answered with its built-in two models, announced the real one, and AutoByteus offered and ran `grok-4.7` (before the change it would have offered grok-4.6/4.5) |
| API-04 run 2 | AC-005, AC-006 | release smoke at load ≥ 40 | `evidence/API-04-smoke-run.sh <worktree> API-04-smoke-run2 <dir> 0` | ENV-2 | Pass | `API-04-smoke/API-04-smoke-run2.log`, `.grok-startups.jsonl`, `.load-samples.log` | `result    PASS`, 13 PASS, `grok-4.7`; `load before smoke: 41.56`; samples `44.98` … `171.64`; Grok start-ups 213–441 ms | no Grok start-up near 30 s occurred (DEC-004) |
| API-05 | QR-002, QR-003 | trust list; evidence content | `shasum ~/.grok/trusted_folders.toml`; scan of the kept evidence | — | Pass | (this row) | `5631cafe35f6…` unchanged since IMP-03; no token/key fields in the extracts (allow-listed fields only: `API-04-grok-log-extract.py`) | Grok's `auth.json` never read |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R1, API-01 | Proven | — |
| AC-002 | Yes | API-R1, API-01 | Proven | — |
| AC-003 | Yes | API-R1, API-R3 (fresh), API-04 run 1 (stale, live) | Proven | — |
| AC-004 | Yes | API-04 runs 1 and 2 (`grok-4.7` offered and every Grok run started) | Proven | — |
| AC-005 | Yes | API-R1, API-R2, API-04 runs 1 and 2 (AC-104 "different same-named skill" PASS), API-05 | Proven | — |
| AC-006 | Yes | API-04 run 2 (load 42–172); run 1 passed but mostly below load 40 | Not Proven (pending evidence decision) | one of the two runs lacks the load condition; a third run needs a fresh Grok free-tier day (quota) — evidence decision requested from the Solution Designer |
| REQ-001 live > 30 s start-up | — | — | per DEC-004 (accepted untested scope) | did not occur: start-ups 186–441 ms in both runs, even at load 172 |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 90% | AC-001..005 proven; AC-006 one full run | AC-006's second loaded run | a third smoke at load |
| Changed-boundary execution directness | 90% | 97% | scripted late `initialize` through the real server with a base control; the stale catalog live | — | — |
| Cross-boundary integration realism and mock gap | 85% | 96% | real Grok in two smoke runs; real dsh | a live > 30 s start-up (DEC-004) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 92% | host sign-ins as users have them; load 42–172 in run 2 | run 1 mostly at low load | a third loaded run |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | never-answering agent (unit), late answer (E2E), base failures reproduced | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change | — | — |
| Durable regression coverage quality and relevance | 90% | 95% | units + the new E2E case that fails on base | — | — |

- Overall post-repository confidence: 87.5%
- Overall final confidence: 94.2%
- Calculation method: simple average of the six applicable final scores.
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `No` (AC-006 pending)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (pending the AC-006 decision)
- Confidence-limiting residual risks: AC-006's second loaded run; RSK-001 (announcement later than 3 s under load: not seen, the stale announcement came within the same second at low load).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed; one condition pending)
- Execution mode: `Live API` (release smoke with the real CLIs), `Other` (scripted Grok through the real server)
- Gap addressed: the release smoke's Grok failures (time-outs, stale models, workspace skills) under release-like load.
- Browser validation needed: No (no UI change).
- If `Blocked`: the missing evidence is a second smoke run fully at load ≥ 40; Grok's free tier allows about two runs per 24 h and both were used today (runs 1 and 2, plus IMP-03's three prompts). A third run now would most likely be refused (429). Evidence decision requested.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No` (`INITIALIZE_TIMEOUT_MS` renamed without alias); compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` ("waits for a Grok that answers initialize after 35 s …") | Added (`83488cecb9`) | API-01 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (with the Pass handoff)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Grok CLI (API-01/02) | scripted ACP agent replaying the recorded session, with a 35 s pause before the `initialize` answer | Grok's slow start-up cannot be produced on demand (DEC-004) | the delay is the script's; the live smokes show real start-ups (≤ 441 ms today) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Concurrent load (`test:unit`, `test:nuxt`) | Yes | stopped after each smoke (run 1's `vitest` was left running and stopped by pid; the runner now stops its processes by worktree path) | none left |
| Base source swapped for the negative controls | Yes | `git checkout HEAD -- <four files>` | restored; `git status` clean for them |
| Smoke temp folders | Yes (the smoke's own) | the smoke's cleanup | — |
| Sessions added to the host's Claude, Codex and Grok histories | Yes | not removable without touching the user's CLI data | recorded here |

## Latest Authoritative Result

- Result: `Blocked` (waiting for an evidence decision)
- Criteria not proven, parts only the user can check, or accepted as unverified risk: AC-006 (pending)
- Evidence decisions requested: AC-006 second loaded smoke run, sent to `/solution_designer` 2026-11-22
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: none until the decision arrives (then `/code_reviewer` for the test-code review on Pass)
- Notes: resumes with either a third smoke run at load ≥ 40 once Grok's quota allows (≈ 24 h after today's runs), or the decision's alternative.
