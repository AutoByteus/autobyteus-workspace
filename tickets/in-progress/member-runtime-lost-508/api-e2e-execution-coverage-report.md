# API/E2E Execution Coverage Report — autobyteus-508

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md` (this folder)
- Round and trigger: Round 1; Implementation Complete IR-001 (code `e0b58997f3`, docs `4ea7826b87`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: one added case, API-07R. It runs the new durable case DRO-4 against a build of the conversion before the fix, to show that the durable case catches the defect.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | source `e0b58997f3` (HEAD `4ea7826b87`, ticket docs only since), plus this round's test edit (committed with this report) | macOS 26.5.2 | Node v22.23.1, pnpm 10.28.2; in-process vitest | Hand-built released shapes in temp folders (`released-delegation-shape-fixtures.ts`) |
| ENV-2 | as ENV-1 | macOS 26.5.2 | Built server `autobyteus-server-ts/dist/app.js` (fresh `pnpm -C autobyteus-server-ts build` from `e0b58997f3` source, 08:37Z); spawned per start on 127.0.0.1, port 0; scripted AGY CLI | `env -i` with a resolved temp HOME; test-owned data root per case (`/tmp/delegated-runs-own-runs-*`, removed); install prepared by a first start (all migrations SUCCEEDED), then 461's ledger row removed; released files written by hand; Task entries (`role: "assigned"`, `assignedBy` the manager) as a Project Task Manager's delegation recorded them |
| ENV-3 | tests as ENV-1; `run-file-conversion.ts` from `298bd7a60a` (before the fix) | macOS 26.5.2 | Built server from that source (temporary; source restored and dist rebuilt after) | as ENV-2 |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-006, QR-001 | conversion via migration and follow-ups; registry | Reused IMP-01 | — | Pass | (IMP-01 row of the handoff) `IMP-01-461-folder-and-registry-order.log` | `Tests  29 passed (29)` | Ran on `e0b58997f3`; `git diff --name-only e0b58997f3 4ea7826b87` lists only ticket docs and evidence |
| API-02 | QR-001, preserved behavior | all app-data migrations | Reused IMP-02 | — | Pass | `IMP-02-app-data-migrations-folder.log` | `Tests  602 passed (602)` | same reason |
| API-03 | — | server typecheck | Reused IMP-03 | — | Pass | `IMP-03-server-typecheck.log` | `production errors: 0` | Superseded for the new test code by API-09 |
| API-04 | — | web typecheck | Reused IMP-04 | — | Pass | `IMP-04-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` | This round changed only a server E2E file, which the web typecheck does not compile; the fixture file it compiles is unchanged since IMP-04 |
| API-05 | AC-001…AC-006 (regression proof) | migration tests against the old conversion | Reused IMP-05 | — | Pass (red as expected) | `IMP-05-new-tests-red-on-old-conversion.log` | `Tests  6 failed \| 20 passed (26)` | same tests, same old source |
| API-08 | AC-005 (next input), REQ-001, REQ-002 | converted records vs the live Settings save rule and the activation's switch commit | `pnpm -C autobyteus-server-ts exec vitest run tests/app-data-migrations/delegated-runs-own-runs-v1/api08-probe-508-live-save-equivalence.test.ts --no-watch` (probe copied in for the run, then moved out) | ENV-1 | Pass | `API-08-live-save-equivalence-probe.log`; probe source `../probes/api08-probe-508-live-save-equivalence.test.ts` | `Tests  3 passed (3)` | Each converted edited member and agent run `toEqual`s what `applySelectionToConfiguredMember` / `buildRuntimeSwitchMetadata` write from the same started launch, followed by the commit (`commitRuntimeSwitchOnRecord`) when the switch was made real. The converted pending switch is `committed` by the switch commit with its `switchId`, ending on `codex_app_server` with no pending switch. So the next input makes it real by the unchanged activation path |
| API-06 | SCN-001, REQ-003, preserved behavior | built server upgrade start (existing DRO-1/2/3) | in `autobyteus-server-ts`: `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" USER="$USER" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs DRO_E2E_EVIDENCE_DIR=<evidence>/API-06-07-startup pnpm exec vitest run tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-06-07-startup-e2e.log`; `API-06-07-startup/API-E03-delegated-runs-own-runs-startup.json` (`migration`, `secondStart`); `API-06-server-build.log` | `✓ DRO-3 DS-15 …`, `✓ DRO-1 converts every stored shape at startup …`; JSON `"summary": "Scanned 14; migrated 14; skipped 0; failed 0."`, `secondStart.changed: []` | Same run as API-07. The edited members of the main scenario (now with the Settings source) load and open on the built server |
| API-07 | AC-001, AC-002, AC-003, AC-005, REQ-001, REQ-002, REQ-003 (second start) | built server upgrade start; `runTree` GraphQL rows the delegator's view and Settings show | same command and run as API-06 (new `it` DRO-4) | ENV-2 | Pass | `API-06-07-startup-e2e.log`; `API-06-07-startup/API-E03-delegated-runs-own-runs-startup.json` (`dro4`) | `✓ DRO-4 (autobyteus-508): …`, `Tests  3 passed (3)`; JSON `dro4.migration.summary` `"Scanned 24; migrated 24; skipped 0; failed 0."`; `dro4.managerRows.support_team_a100.members["/operator"]` = `codex_app_server` / `gpt-6.1-terra` / `{"reasoning_effort":"high"}` / source `settings` / `ownSource: true`; `review_team_b200` `/lead` the team edit (codex), `/checker` `autobyteus`/`opus` settings, `/scribe` `agent_default` kept; `summarizer_d400`, `summarizer_e500` `codex_app_server` settings; `dro4.secondStart.changed: []` | Pending switches stay in the files (`platformAgentRunId: null`, `pendingRuntimeSwitch` from the started binding); every run opens (`getTeamRunResumeConfig` / `getRunProjection`) and stays stopped |
| API-07R | AC-001 (regression proof of the durable case) | as API-07, old conversion | old `run-file-conversion.ts` from `298bd7a60a`, `pnpm -C autobyteus-server-ts build`, the suite with `-t DRO-4`, then source restored and rebuilt (steps in the log header) | ENV-3 | Pass (red as expected) | `API-07R-dro4-red-on-old-conversion.log` | `Tests  1 failed \| 2 skipped (3)`; diff `- "runtimeKind": "codex_app_server"` `+ "runtimeKind": "claude_agent_sdk"`, `+ "source": null`, `+ "ownSource": false` | The founder's exact symptom (Claude Agent SDK + gpt-6.1-terra, no own source, so the team's "Inherited from the run" is shown) appears through the built server's rows. Last log line records the restore |
| API-09 | — | server typecheck incl. the edited E2E file | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-09-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `[typecheck] PASS` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-05, API-07, API-07R, API-08 | Proven | — |
| AC-002 | Yes | API-01, API-05, API-07, API-08 | Proven | — |
| AC-003 | Yes | API-01, API-05, API-07, API-08 | Proven | — |
| AC-004 | Yes | API-01 (main scenario: `autobyteus` kept, model + settings, Settings source), API-05, API-06 | Proven | — |
| AC-005 | Yes | API-01, API-07 (new runtime shown; pending switch kept), API-08 (the activation's commit accepts the converted switch) | Proven | — |
| AC-006 | Yes | API-01 (registry order test unchanged; follow-up case), API-02, API-06/API-07 (no new ledger ID; `SUCCEEDED`; second start changes nothing) | Proven | — |
| REQ-004 | Yes (release gate) | — | Not Proven (not testable here) | Release gate for delivery: ship before 461 reaches a stable release; release only on the founder's word |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 97% | API-01, API-05, API-07, API-07R, API-08 | REQ-004 is a release gate, not a test | — |
| Changed-boundary execution directness | 95% | 98% | the real conversion, the real runner on the built server, and the server's own row projection (API-07) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 96% | API-07: built `dist/app.js`, real ledger and DB, real GraphQL reads; API-08 ties the shape to the live save and commit | Waking a converted run on a real Codex App Server was not run (TESTING.md: never wake a converted run against real runtime sessions); the commit path itself is unchanged code | A live Codex wake on synthesized data (provider spend, real login); not needed |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | key shapes checked against `v1.5.13-beta.6` source (`run-execution-tree-shared-records.ts`, `task-agent-own-records.ts`); an install where every earlier migration completed; released Task entries | Hand-built data, by rule (never real data) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 96% | model-only edit (AC-004), own edit vs team edit, unedited member, pending and made-real switches, follow-up late item, terminal ledger skip (API-01), second start (API-07, API-06), red on old code (API-05, API-07R) | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | 95% | API-07 asserts the exact row data the Settings and delegator views render (`source.origin`, `ownSource`); the web maps `settings` to the run's own edit by existing, unchanged code (`useRunMemberFacts.ts` `SOURCE_LABEL_KEY.settings: null`) | No browser run: no UI change, and the rows are asserted at the GraphQL boundary the UI reads | A browser probe; it would only re-prove unchanged mapping |
| Durable regression coverage quality and relevance | 93% | 97% | migration tests (IMP), new DRO-4 in the startup suite, which fails on the old conversion (API-07R) | — | — |

- Overall post-repository confidence: 91.5% (simple average of 6 applicable categories)
- Overall final confidence: 96.3% (simple average of 7 categories)
- Calculation method: simple average of the applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` (REQ-004 is a release gate owned by delivery, not a behavior criterion)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: no live wake of a converted Codex run (see the mock-gap row); REQ-004 timing.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle`. The built server's startup upgrade on a test-owned data root, read through its GraphQL API.
- Confidence gap or residual risk it addresses, and the expected gain: whether the real runner on the built server writes the corrected shape, and whether the server then presents each edited run with its chosen runtime and as the user's own Settings edit, not as "Inherited from the run". It also checks that a second start changes nothing. Closed by API-06/API-07, and API-07R shows the case would catch the defect.
- Browser validation needed, and why or why not: Not needed. There is no UI change, and the rows the UI renders are asserted at the server boundary that feeds them; the `settings` label mapping is existing, unchanged code.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (same-ID correction of `20261111_delegated_runs_own_runs_v1`, reused by the `20261114_*` follow-ups)
- Representative existing data used: hand-built ≤ beta.6 shapes: the main scenario (model-only edits) plus `writeReleasedRuntimeEdits` (member own edit made real; team edit with follower, own edit on another runtime, unedited member; pending switch in a team and an agent run; agent run edit made real), with released Task entries
- Approved transition followed without an unnecessary migration: `Yes` (no new ID; registry order test unchanged)
- Cases proving the migration outcome: API-01 (incl. terminal-ledger skip and follow-up), API-02, API-06, API-07 (completion `SUCCEEDED`, `failed 0`; second start changes nothing), API-08
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No` (no runtime or reader change; released shapes stay in the migration folder; the source constant is local to the migration)
- Residual untested persisted-data risk: already-converted installations are skipped by design (out of scope, DEC-003)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No` (DRO-4 covers the required migration)
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts`: new `it("DRO-4 (autobyteus-508): …")`, header lists DRO-4, imports the 508 fixtures | Added | API-07, API-07R | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `tests/fixtures/agy-failure-cli.mjs` (the suite's gate) | The suite needs one available runtime; no run is woken | None for this change |
| Codex App Server / Claude Agent SDK sessions | none: no converted run is woken (TESTING.md) | Never wake a converted run against real runtime sessions; provider spend | The next-input commit is proven on the shape (API-08), not live |
| Migration ledger (unit level) | the 461 tests' terminal-predecessor ledger stub (IMP) | existing test design | Covered for real in API-06/API-07 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| API-08 probe file in `tests/app-data-migrations/delegated-runs-own-runs-v1/` | Yes | moved to `tickets/…/probes/api08-probe-508-live-save-equivalence.test.ts` | Not under `tests/` (git status clean there) |
| Temporary old `run-file-conversion.ts` and its `dist/` (API-07R) | Yes | `git checkout --` the file; `git diff 4ea7826b87 -- autobyteus-server-ts/src` empty; `pnpm -C autobyteus-server-ts build` again (`withEdit` present in dist) | Restored |
| Built server processes, temp data roots `/tmp/delegated-runs-own-runs-*`, temp HOMEs | Yes | the suite's `stop()`, `killBuiltStudios`, `fs.rm` roots; temp HOME removed | no `dist/app.js` process of this worktree left; no such temp root left |
| `autobyteus-server-ts/dist/` | Yes (build output, untracked) | left built from the fixed source | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): REQ-004 (release gate for delivery; release before 461 reaches stable, only on the founder's word). Repair of the founder's already-converted data is out of scope (DEC-003); he does it himself.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff message (delivery)
- Notes: Released shapes were checked against `v1.5.13-beta.6` source, not against user data. No founder data was read.
