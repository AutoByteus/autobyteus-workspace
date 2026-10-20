# API/E2E Execution Coverage Report

Ticket `remove-skill-improvement` (autobyteus-205). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`, branch `codex/remove-skill-improvement`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. Code review CRR-003 passed the INT-001 merge (`5cfccd66c7`, merging `origin/personal` @ `3b2c86ca9e`) and the Secret Gate entry `bda3731947` (IR-002); head `2147206408`. Round 1: CRR-001 (IR-001, head `46c1c6b83d`).
- Prior round reviewed: round 1 (API-REV-001, Pass 95.0%, validated head `4b12567b9a`).
- Rerun-by-impact plan (TESTING.md), round 2:
  - Validated commit: `4b12567b9a`. `git diff --name-only 4b12567b9a 2147206408` holds base's update notifications: server `update-notifications`, schema, settings service, websocket API; web Settings Basics (`UpdateChecksCard`), layout, notifications, stores; the Electron updater. It also holds skills/github and the version bump in the web `package.json`. There is no lockfile, `autobyteus-ts`, contract or migration change; `generated/graphql.ts` is unchanged.
  - After the merge, the head adds only `.gitleaks.toml`.
  - **Reused:** the implementation's integration round on `5cfccd66c7`, IMP-14..IMP-22: typecheck, server unit 6314, integration 421, build and smoke, startup e2e, web unit 4617, guards, the AC-001 sweep, and SIR-001/SIR-002 (IMP-22, 2 Pass).
  - **Rerun:** API-07 (the edited server e2e suites; the settings service and schema changed), and the browser cases API-13..API-17, because their journeys pass through the changed layout, websocket and Settings code.
  - API-10 and API-12 still hold: no line they cover changed.
  - No durable test changed this round.
- Deviations from the investigation's plan, and why:
  - API-13 ran the eight fixture probes; six fail on stale fixtures outside this ticket (FU-004). Their recorded traffic still gives this ticket's signal. `task-agent-peer-sidebar` has no package script, so it ran with `node` directly.
  - SIR-001/SIR-002 were brought up in trial runs (`/tmp/ab205e2e/sir-try1..5`, not evidence of record). Every failure there was in the probe itself:
    - a running AGY run takes a delivered message in its live process, so delivery is read from the target's own stored traces, not from a new launch;
    - the probe's `.env` has no final newline;
    - Settings navigation uses `data-testid`;
    - the Advanced table is outside `main`;
    - the page shows the refusal as the code `SERVER_SETTING_UPDATE_REJECTED`.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement/tickets/in-progress/remove-skill-improvement/evidence/` (the handoff gives the commit that holds it)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (new probe module, its registration and package script)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `46c1c6b83d` (server source `fc46a7b5fc` + two unit tests in `a71e93a7f2`; web source `fc46a7b5fc`) | macOS 26.5.2 | Node v22.23.1; headless Google Chrome; probe-owned Nuxt dev and fixture routes | fixture-page probes: mocked GraphQL/WebSocket, private browser profile |
| ENV-3 (round 2) | `2147206408` (source = merge `5cfccd66c7` + `.gitleaks.toml`) | macOS 26.5.2 | as ENV-1/ENV-2; backend `dist` from IMP-17 on `5cfccd66c7` | as ENV-1/ENV-2 |
| ENV-2 | same + the SIR probe changes committed with this report | macOS 26.5.2 | headless Chrome → probe-owned Nuxt dev → probe-owned built backend (`dist/app.js` from IMP-05, = current server source); scripted AGY CLI (argv log), Grok replay, missing Codex | owned temp data root, sqlite and HOME; free ports; locale en-US; viewport 1512×952 (screenshots 1280); the user's running AutoByteus and `~/.autobyteus` untouched |

## Cases

Evidence paths are in `evidence/`. API-15..API-17 ran in one probe run: `API-15-17-browser-probe.log`, `API-15-17-probe-evidence.json` (every case's recorded details) and `API-15-17-probe-ledger.md`.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | server typecheck | `Reused` IMP-01 | — | Pass | (IMP-01) | (IMP-01) | `fc46a7b5fc`; the server source is unchanged since (only two unit tests in `a71e93a7f2`) Round 2: Reused IMP-14 (`5cfccd66c7`, `# Exit code: 0`). |
| API-02 | AC-002 | server unit | `Reused` IMP-02 | — | Pass | (IMP-02) | (IMP-02) | `a71e93a7f2` = current source Round 2: Reused IMP-15 (`Tests  6314 passed | 7 skipped (6321)`). |
| API-03 | AC-002 | server integration | `Reused` IMP-03 | — | Pass | (IMP-03) | (IMP-03) | as API-01 Round 2: Reused IMP-16 (`Tests  421 passed | 69 skipped (490)`). |
| API-04 | AC-002..AC-004, BEH-003..005 | focused unit: migration F-1..F-8b, router (8 non-grant cases unchanged), built-ins, config F-7 | `Reused` IMP-04 | — | Pass | (IMP-04) | (IMP-04) | as API-01 Round 2: inside IMP-15 (the whole unit suite). |
| API-05 | BEH-004 | build and built-in smoke | `Reused` IMP-05 | — | Pass | (IMP-05) | (IMP-05) | The `dist` every backend in API-14..API-17 ran Round 2: Reused IMP-17 (`Built-in agents bootstrap smoke check passed.`); the `dist` of every round-2 backend. |
| API-06 | AC-003, AC-004 | built-server startup e2e SID-1..3 (fresh, old data and second start, injected failure and retry) | `Reused` IMP-06 | — | Pass | (IMP-06) | (IMP-06) | as API-01 Round 2: Reused IMP-18 (`Tests  4 passed (4)`). |
| API-07 | AC-002 | edited server e2e | `Reused` IMP-07 | — | Pass | (IMP-07) | (IMP-07) | as API-01 **Round 2 (ENV-3): rerun, Pass**: `API-07-r2-edited-e2e.log`, `Tests  19 passed (19)`, `# Exit code: 0`. |
| API-08 | AC-002, BEH-001/002 | web unit | `Reused` IMP-08 | — | Pass | (IMP-08) | (IMP-08) | web source unchanged since `fc46a7b5fc` Round 2: Reused IMP-19 (`Tests  4617 passed | 5 skipped (4622)`). |
| API-09 | — | web guards | `Reused` IMP-09 | — | Pass | (IMP-09) | (IMP-09) | same Round 2: Reused IMP-20 (`[guard:web-boundary] Passed.`). |
| API-10 | AC-001 | web `tsc` on changed lines | `Reused` IMP-10 | — | Pass | (IMP-10) | (IMP-10) | `a71e93a7f2` Round 2: still holds (this ticket's changed lines unchanged by the merge; `ServerSettingsBasicsPanel.vue` resolution covered by IMP-19 and API-17). |
| API-11 | AC-001 | sweep | `Reused` IMP-11 | — | Pass | (IMP-11) | (IMP-11) | rerun by the code reviewer with the same result Round 2: Reused IMP-21 (`result: PASS`). |
| API-12 | AC-001 | generated GraphQL proof | `Reused` IMP-12 | — | Pass | (IMP-12) | (IMP-12) | same Round 2: still holds (`generated/graphql.ts` not changed by the merge). |
| API-13 | BEH-001/002 (no component requests the removed query), REQ-003 | 8 edited fixture-page probes | `pnpm -C autobyteus-web test:e2e:<name> --output-dir /tmp/ab205e2e/api13-<name>` sequentially; `task-agent-peer-sidebar` via `node tests/e2e/task-agent-peer-sidebar-probe.mjs` (no package script); agent-org-draft-retention rerun warm | ENV-1 | Fail (out of scope; FU-004) | `API-13-summary.txt`, `API-13-<name>.log`, `API-13-<name>-evidence.json` | `API-13-summary.txt`: `exit=0 composer-mention-discoverability`, `exit=0 workspaces-sidebar-dock`, six `exit=1`; the operation counts list no Skill Improvement operation; `grep -i skillImprovement over all API-13 outputs: 0 files` | The six failures come from stale fixtures in code this ticket does not touch, each cause pinned (FU-004). This ticket's signal holds: no rendered component requests the removed query. Their failures are outside this ticket and do not count against it **Round 2 (ENV-3)**: `API-13-r2-summary.txt`. Three pass (`standalone-agent-error-stop` now too), five fail for the same causes, plus fixtures without base's `/ws/update-notifications` (FU-004). `grep -i skillImprovement … 0 files`. |
| API-14 | REQ-003 | `projects-feature-probe` (owned backend nodes; capability query edited) | `pnpm -C autobyteus-web test:e2e:projects --skip-server-build --output-dir=/tmp/ab205e2e/api14-projects` | ENV-2 | Pass | `API-14-projects-probe.log` | `[PT-E2E-015] Pass`, last line `{"result":"Pass",…}` | 17 of 17 cases **Round 2 (ENV-3): Fail, out of scope (FU-006)**: `API-14-r2-projects-probe.log` `[PT-E2E-013] Fail`, the other 16 pass; `API-14-r2-PT-E2E-013-failure.png`. The meaning tier of Projects task search answered "unmatched" with 20 similar Tasks. Untouched by this ticket. |
| API-15 | BEH-003, REQ-003 (regression) | real Chrome → Nuxt → built backend: DLP-001..010, DCP-001..005, DCR-001..003 | `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir /tmp/ab205e2e/probe-full-1 --ledger-file /tmp/ab205e2e/probe-full-1.ledger.md` | ENV-2 | Pass, except DCP-003 (out of scope; FU-005) | `API-15-17-browser-probe.log`, `API-15-17-probe-evidence.json`, `API-15-DCP-003-failure.png`, `API-15-DCP-003-reproduction.txt` | `Summary: 19 Pass, 1 Fail`; `DCP-003 Fail … Timed out waiting for saved`; `API-15-DCP-003-reproduction.txt`: three later runs `DCP-003 Pass`, with no GraphQL error lines in the diagnostics | DCP-003 failed once, on the web's re-read of Org settings after a Save ("Settings were saved, but could not be refreshed"). No production code on that path is in this diff. It passed in three reproduction attempts, two with temporary diagnostics, which were removed afterwards. The root cause is not established (FU-005) **Round 2 (ENV-3)**: `API-15-17-r2-browser-probe.log` `Summary: 18 Pass, 2 Fail`: DCP-003 and DCR-003, both `Timed out waiting for saved` (FU-005). Cause reproduced in `API-15-r2-org-save-reread-cause.txt`: 3 of 6 looped Org saves, each failing with "Org configuration read is stale; refresh required." while the Org stream reconnected (`CONNECTED`, `ROOT_EXECUTION_VIEW_SNAPSHOT`) during the post-save `AgentOrgRunConfig` read. That code is not in this diff, and the Save itself succeeds. |
| API-16 (probe `SIR-001`) | BEH-003, AC-002 | `send_message_to` by run id through real tool calls (scripted AGY) | Same run. A and B standalone chats; from A: B by run id; an unknown run id; a delegated Pair copy's team run id; its coordinator by run id. A Team run: the lead to the member by run id | ENV-2 | Pass | `cases["SIR-001"].details`, `API-16-SIR-001-team-lead-to-member-1280.png` | `toB`: `"accepted":true,"code":"DELIVERED"` and `bReceived: true`; `toUnknown`: `"code":"TARGET_AGENT_RUN_NOT_ACTIVE"`; `toCopyTeam`: `"code":"TARGET_IS_TEAM_RUN"` naming the coordinator; `toCopyLeadCode: "DELIVERED"`, `copyLeadReceived: true`; `toMemberCode: "DELIVERED"`, `memberReceived: true` | Delivery is read from the target's own stored traces (a live AGY run takes the message in its running process) **Round 2: Pass** (`API-15-17-r2-probe-evidence.json`: `DELIVERED`, `TARGET_AGENT_RUN_NOT_ACTIVE`, `TARGET_IS_TEAM_RUN`, delivered to copy lead and member, each received); also IMP-22. |
| API-17 (probe `SIR-002`) | AC-003, AC-004, BEH-001, 002, 004, 005 | upgrade around real runs; backend restarts; browser | Same run. Steps in the investigation (SIR-002 steps) | ENV-2 | Pass | `cases["SIR-002"].details`, `API-17-SIR-002-data-root-after.json`, `API-17-SIR-002-*.png` | `freshRecord.summary: "Scanned 0; migrated 0…"`; `firstRecord: {status: "SUCCEEDED", attempts: 1, summary: "Scanned 11; migrated 11; skipped 0; failed 0."}`; `stillThere: []` (10 feature paths); `changed: []` over `keptFiles: 1201`; `rowsChanged: []`, `helperRowsLeft: []`; `.env` equal to its pre-feature bytes; `secondRecord.attempts: 1`, `secondChanged: []`, `secondAdded: []`; `history` lists the real runs and no helper; `agentsPage.selfEvolver: 1`; `memoryPage.helperIds: []`; `basics.cards: ["applications-feature-toggle-card"]`; `advancedKeys` without the three keys; `refusal: "Error updating server setting: SERVER_SETTING_UPDATE_REJECTED"`, `settingsAfterRefusal: []`; `agentComposer` and `memberComposer` `traces: {text: false, hooks: 0}`; `agentResumed` = `[["gemini-3.8-flash-low", <agentSession>]]`, `memberResumed` = `[["gemini-3.8-flash-low", <memberSession>]]` | The feature data used the fixture module's shapes and ids. `.env` held `ENABLE_SKILL_IMPROVEMENT=true`, the state in which the released composer showed "Improve skills". The page shows the refusal as a code; the server's own wording is not surfaced (existing Settings behavior) **Round 2: Pass** (same values: `Scanned 11; migrated 11`, `stillThere: []`, `changed: []` over 1201, second start unchanged; Basics without any Skill Improvement trace next to base's Update checks card, `API-17-r2-SIR-002-settings-basics-1280.png`; both runs resumed on their own sessions); also IMP-22. |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-10, API-11, API-12; at runtime: API-13's recorded traffic (no request for the removed query), API-17 (no feature UI, no hooks) | Proven | — |
| AC-002 | Yes | API-02, API-03, API-07, API-08 (suites); API-04 (router); API-16 (`send_message_to` codes through real tool calls); API-14, API-15 (preserved journeys) | Proven | — |
| AC-003 | Yes | API-06 (SID-1 fresh, SID-2 old data, SID-3 a failed step leaves startup working); API-17 (upgrade around real runs: runs list, open and resume) | Proven | — |
| AC-004 | Yes | API-04, API-06 (all shapes, byte identity, second start); API-17 (exact deletion around product-made runs, 1201 kept files byte-identical, `.env` exact, second start unchanged) | Proven, except the user's own check | The user checks his own data after his backup, through delivery. Tests may not run on his data or a copy of it (TESTING.md, REQ-005); every shape found read-only in his data has a fixture (F-1..F-8b) |
| AC-005 | No | — | Not Proven here | Delivery's (release notes) |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | API-01..12, API-16, API-17 | The user's own data (user-only) | — |
| Changed-boundary execution directness | 80% | 96% | API-16: real tool calls through the router's every path; API-17: the real startup, migration, config and UI | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | Real server, GraphQL/WebSocket, Nuxt, Chrome; scripted AGY CLI | No paid inference; the change is not in model behavior | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Fixture-module shapes; feature data around runs the product made; `.env` with interleaved keys | Real data shapes beyond the inventory (user-only) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | SID-3 (failed step, retry); second start; restarts; resume after upgrade; refused re-add | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | Composers of an existing run and a Team member; Settings Basics and Advanced; Agents and Memory pages; no shell change | Desktop shell not run (no shell change) | — |
| Durable regression coverage quality and relevance | 85% | 93% | New durable SIR-001/002; SID-1..3; the router test | Six edited fixture probes are red for causes outside this ticket (FU-004); DCP-003 is intermittent (FU-005) | FU-004, FU-005 |

- Overall post-repository confidence: 83% (simple average)
- Overall final confidence: 95.0% (simple average: 96, 96, 95, 95, 95, 95, 93). Round 2 on the merged build: unchanged. SIR-001/002, the reused merge suites and API-07 pass, and the regression failures have causes outside this ticket (FU-004, FU-005 cause established, FU-006).
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-004 and FU-005 (outside this ticket); the user's own data check (AC-004, delivery).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probe-owned real stack, including backend restarts as an upgrade)
- Gap and gain: after the repository cases, four things had never run against a running system:
  - the upgrade around runs the product made, including resume;
  - `send_message_to` through real tool calls;
  - the composers of existing runs;
  - Settings Advanced.

  API-16 and API-17 close them (post-repository 83% → final 95.0%).
- Browser validation needed: yes. The removed UI surfaces and the upgrade's user-visible results are web behavior.

## Desktop Application Validation

- Approach: browser probes against the real built backend. No shell code changed; the migration runs in the same server `dist` that the desktop embeds.
- Effect on any running desktop application: `None`. The user's AutoByteus and `~/.autobyteus` were untouched; every run used free ports, a temp data root and HOME, and a fresh headless Chrome.
- Not directly proven: a packaged desktop upgrade (low risk; no shell change).

## Persisted-Data Transition Checks

- Approved decision: `Migration Required` (deletion, DEC-001 C); settings through `retiredSettingNames`.
- Representative existing data: F-1..F-8b (API-04, API-06); the same shapes around product-made runs (API-17).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome:
  - API-04 and API-06: transformation, dispositions, a second start, an injected failure and retry;
  - API-17: exact deletion, byte identity, a second start, then resume.
- Version-specific runtime branch, dual read/write or compatibility fallback observed: `No`. After the upgrade, no feature UI and no retired key remains, and re-adding a retired key is refused.
- Residual: the user's real data (AC-004, delivery).

## Compatibility / Legacy Scope Check

- Compatibility in scope: `No`. Compatibility-only behavior observed: `No`. Coverage kept only for compatibility: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: round 2 `No` (round 1 `Yes`, below; reviewed in CRR-002, Pass)

| Path / Test | Change | Case IDs | Removal Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` | Added | API-16, API-17 | — |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (registers the module with a restart hook; header lines; no existing case changed) | API-15..API-17 | — |
| `autobyteus-web/package.json` | Updated (`test:e2e:skill-improvement-removal`) | API-16, API-17 | — |

- Attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | `agy-failure-cli.mjs` via the probe's wrapper (argv log) | No inference needed; the change is not in model behavior | — |
| Grok / Codex | replay / missing command (existing probe design) | Same | — |
| GraphQL/WebSocket in API-13 | each fixture probe's own mocks | The probes' design | Their stale mocks (FU-004) |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks (Nuxt, backends, Chrome, temp roots) of every run | Yes | each probe's cleanup (the evidence JSONs record `removed` / terminated) | No probe process or temp root left |
| Temporary diagnostics in `delegated-launch-defaults-probe.mjs` (DCP-003 reproduction: console errors, GraphQL error responses, failed GraphQL requests → `diag.log`) | Yes | restored from the copy taken before the edit; not committed | `grep -c TEMP-DIAG` = 0 |
| `/tmp/ab205e2e/` (scratch outputs, trial runs) | Yes | evidence copied into `evidence/`; kept as scratch | Kept |

## Latest Authoritative Result

Round 2 (API-REV-002), head `2147206408` (merge `5cfccd66c7`).

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-004's user check after his backup (only the user can check; delivery); AC-005 (delivery)
- Preliminary classification: N/A
- Next recipient: per `get_handoff_rules` (proportional test-code review)
- Notes:
  - Follow-ups found outside this ticket are in `follow-ups.md`:
    - FU-004: stale fixture probes.
    - FU-005: the Org post-save re-read race. Round 2 established the cause: a stream reconnect snapshot replaces the Org view during the re-read.
    - FU-006 (round 2): PT-E2E-013's no-match expectation versus meaning search.
  - Round 2 temporary diagnostics (a `console.error` in `existingRunConfigStore.ts`, probe listeners) were removed and never committed: `grep -c DIAG` = 0 in both files.
  - The page shows a retired-key refusal as `SERVER_SETTING_UPDATE_REJECTED` without the server's reason. This is existing Settings behavior and not a finding.
