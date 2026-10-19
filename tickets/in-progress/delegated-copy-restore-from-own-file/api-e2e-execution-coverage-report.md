# API/E2E Execution Coverage Report

Ticket `delegated-copy-restore-from-own-file` (autobyteus-197). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`, branch `codex/delegated-copy-restore-from-own-file`.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code review CRR-002 Pass (IR-002, head `da1d7f5524`), message from `/software_engineering_team/code_reviewer`
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - DCR-003 (API-13) was split out of DCR-002 and changed during the trial runs. Antigravity locks auto-approve on, the Grok replay offers one model, and mounted-Team members have no workspace control of their own. The investigation's "DCR-003 steps" records the constraints and the resulting two-part proof.
  - The "+" prefill check of DCR-001 was replaced by the app's own per-agent context. "+" from any agent of a Team run opens a New chat for the whole Team (existing behavior), so it is no per-copy observable.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file/tickets/in-progress/delegated-copy-restore-from-own-file/evidence/` (the handoff message gives the commit that holds it)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (new durable probe module and its registration)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `da1d7f5524` (source `96de77efb3`) | macOS 26.5.2 | Node v22.23.1, pnpm 10.28.2; server `dist` built by API-08 and rebuilt from the same source by `test:integration:prepare` | in-process tests; repository test isolation |
| ENV-2 | same | macOS 26.5.2 | built server `dist/app.js`, vitest e2e | `env -i PATH HOME=<temp, resolved> TMPDIR`; test-owned data roots; synthesized released-shape fixtures |
| ENV-3 | `da1d7f5524` + the probe changes committed with this report | macOS 26.5.2 | headless Google Chrome (playwright-core) → probe-owned Nuxt dev → probe-owned built backend (`dist/app.js`, source `96de77efb3`); scripted AGY CLI (`agy-failure-cli.mjs`, argv log), Grok replay, missing Codex | owned temp data root, sqlite and HOME; free ports; viewport 1512×952 (screenshots at 1280/880); locale en-US; the user's running AutoByteus and `~/.autobyteus` untouched |

## Cases

Evidence paths are in `evidence/`. The probe cases API-10..API-13 ran in one probe run (`API-10-13-browser-probe.log`, `API-10-13-probe-evidence.json` with every case's recorded details, `API-10-13-probe-ledger.md`). Before that run, DCR-001..003 were brought up in trial runs (`/tmp/ab197e2e/dcr*-try*`, not kept as evidence). Each failure there was in the probe itself: the avatar initials in a sidebar name, reopening Settings that was already open, "+" being Team-level, the AGY approval lock, a missing workspace control, and the source attribute on user-choice rows. None was a product failure.

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-009 | server typecheck | `Reused` IMP-01 | — | Pass | (IMP-01) | (IMP-01) | Ran on `96de77efb3` = current source; `da1d7f5524` changes only ticket files |
| API-02 | BEH-001..008; AC-001..AC-004, AC-011(a,b) at unit level | server unit | `Reused` IMP-02 | — | Pass | (IMP-02) | (IMP-02) | Same commit as the current source |
| API-03 | AC-004 (web), D-7 | web unit | `Reused` IMP-07 | — | Pass | (IMP-07) | (IMP-07) | Same commit as the current source |
| API-04 | BEH-004, BEH-007 | contracts and `dist/` | `Reused` IMP-04, IMP-05, IMP-06 | — | Pass | (IMP-04/05/06) | (IMP-04/05/06) | `git diff --name-only 7d689455ad HEAD` touches no contract package |
| API-05 | AC-005..AC-009, AC-011(c), D-8, D-9 | migration units (synthesized released shapes F-A1..F-X3c, combined 10-17 → 20261019 → current store) | `Reused` IMP-09 | — | Pass | (IMP-09) | (IMP-09) | No migration source or test change since `3b6f970cfa` |
| API-06 | — | web guards | `pnpm -C autobyteus-web guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | ENV-1 | Pass | `API-06-web-guards.log` | `[guard:web-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.`, `# Exit codes: 0 0 0` | Rerun: one web source file changed since IMP-08 |
| API-07 | BEH-001, 002, 004 | server integration | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-07-server-integration.excerpt.txt` (the full log stays in the worktree) | `Tests  419 passed \| 70 skipped (489)`, `# Exit code: 0` | Rerun: `standalone-root-tree-schema.ts` changed since IMP-03; same counts as IMP-03 |
| API-08 | — | server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-08-server-build.log` | `Built-in agents bootstrap smoke check passed.`, `# Exit code: 0` | The `dist` used before predated `96de77efb3` |
| API-09 | AC-005, AC-007, AC-008, D-9, BEH-008 | built server through its real entrypoint, startup migrations | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-09-e2e-startup-upgrade.log` | `Tests  9 passed (9)`; the `✓ TAU-2 a run that cannot be moved leaves the app working…` line; `# Exit code: 0` | Reruns IMP-11 and IMP-12 on the fresh build |
| API-10 | BEH-001, 004, 006, 007, 008 (regression; DLP-006 = upgrade conversion in the browser) | real Chrome → Nuxt dev → built backend | `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir /tmp/ab197e2e/probe-full-1 --ledger-file /tmp/ab197e2e/probe-full-1.ledger.md` (DLP-001..010, DCP-001..005) | ENV-3 | Pass | `API-10-13-browser-probe.log`, `API-10-13-probe-evidence.json`, `API-10-13-probe-ledger.md`, `API-10-DLP-006-team-run-settings-not-recorded-880.png` | `Summary: 18 Pass, 0 Fail`; each `DLP-*`/`DCP-*` line `Pass`; evidence JSON `"browserErrors": []`, the cleanup entry `removed` | Reruns IMP-14 on the current web and server build |
| API-11 | AC-001, AC-002, AC-003, AC-004 (Team root) | same; probe `DCR-001` | Same run. Team run (manager + worker) on `MODEL`; the manager delegates the Scribe (catalog copy W) and messages `/worker`; from W, `delegate_task /worker` → C1; stop the run in Settings; `/worker` → `ALT`, Save; the manager messages C1 by run id; W delegates `/worker` again → C2 | ENV-3 | Pass | `API-10-13-probe-evidence.json` → `cases["DCR-001"].details`; `API-11-DCR-001-*.png` | `c1OwnFile.json`: `"llmModelIdentifier": "gemini-3.8-flash-low"`, `"taskAgent": {… "address": "/worker", "launchSource": {"origin": "configured" …}}` and no `taskAgent.origin`; `slotAfterEdit: "dlc-alt-model"`, `c1AfterEdit: "gemini-3.8-flash-low"`; `c1Resumed: [["gemini-3.8-flash-low", "2bb5137c-…"]]` = `c1Session`, ≠ `slotSession "261d6064-…"`; `c2Launches: [["dlc-alt-model", null]]`; `contexts`: c1 `gemini…`, c2 and slot `dlc-alt-model`, all `"name": "worker"`; `runView: {c1HasOwn: true, c1HasSlot: false}`; `sidebar`: C1 `"name": "worker"`, W `"scribe …"`; screenshot `API-11-DCR-001-delegated-rows.png`: two `worker` rows, "Gemini test … As configured in this run" and "Alt test model … As configured in this run" | Team copies of configured members come from a copy (CM-1); Team roots have no Team members |
| API-12 | AC-001, AC-002, AC-003, AC-004 (Org root; agent and Team copies) | same; probe `DCR-002` | Same run. Org (manager, writer ALT, mounted pair ALT: lead + Grok engineer) on `MODEL`; the manager messages `/writer`, delegates `/writer` → CW and `/pair` → CP; stop the Org; `/writer` and `/pair` → `MODEL`, Save; the manager messages CW and CP's lead by run id; delegates both again → CW2, CP2 | ENV-3 | Pass | `cases["DCR-002"].details`; `API-12-DCR-002-*.png` | `cpOwnTreeExcerpt`: `taskAgent.launchSource.origin: "configured"`, no `taskAgent.origin`, members lead `followsTeam: true`, engineer `false`, each with 5 launch keys; `copiesAfterEdit: {cw: "dlc-alt-model", cp: "dlc-alt-model"}` while `slotsAfterEdit` all `gemini-3.8-flash-low`; `cwResumed: [["dlc-alt-model", "8b1296c0-…"]]` = CW's own `platformAgentRunId`, ≠ `writerSlotSession`; `cpLeadResumed: [["dlc-alt-model", "b673c0eb-…"]]` = `cpLeadSession`; `cw2Launches: [["gemini-3.8-flash-low", null]]`; `cp2Facts.default: "gemini-3.8-flash-low"`; `contexts`: cw `dlc-alt-model`, cw2 and slot `gemini…`, all `"writer"` | — |
| API-13 | AC-011(a), AC-002 | same; probe `DCR-003` | Same run. Org with `gpair` (Grok Team default; the lead's approval toggled to "Ask first" on the launch page) and `pair` (AGY ALT); delegate both; stop the `/pair` copy from its Settings row, Team model → `MODEL`, Save; message its lead by run id | ENV-3 | Pass | `cases["DCR-003"].details`; `API-13-DCR-003-*.png` | `slots.gpairLead: {runtime: "grok_build", model: "grok-4.7", auto: false}` vs `slots.gpair.auto: true`; `gcpFacts["/gpair/lead"]: {auto: false, followsTeam: true}`, `["/gpair/helper"].followsTeam: false`; `cpFacts["/pair/lead"].followsTeam: true`, `["/pair/engineer"].followsTeam: false`; `leadRowAfter: "Gemini test · Antigravity · Auto-approve"`, `engineerRowAfter: "Grok 4.7 · …"`; `leadResumed: [["gemini-3.8-flash-low", "52105a3d-…"]]` = `leadSession` | Two Teams because Antigravity locks auto-approve and the Grok replay offers one model (investigation, DCR-003 steps) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-11 (Team: agent copy), API-12 (Org: agent copy and Team copy), API-02 (unit) | Proven | — |
| AC-002 | Yes | API-11, API-12, API-13 (own files read from the data root after real delegations), API-02 | Proven | — |
| AC-003 | Yes | API-11 (C2 on the edited model), API-12 (CW2, CP2 from the edited slots) | Proven | — |
| AC-004 | Yes | API-11 (Settings rows, sidebar names, Team contexts, run-view projection, resume on its own runtime session), API-12 (Settings rows, Org contexts, own session), API-03 (web unit), API-02 | Proven | — |
| AC-005 | Yes | API-05 (F-A2/F-A2b/F-A3, restore after migration), API-09 (startup) | Proven | — |
| AC-006 | Yes | API-05 (F-T3*, follower set, handoffs incl. `→ /Teacher`), API-09 | Proven | — |
| AC-007 | Yes | API-05 (F-A4/F-A4b/F-T4: untouched, reported, not loaded), API-09 (the app starts and new work runs) | Proven | — |
| AC-008 | Yes | API-05 (catalog copies, second start writes nothing), API-09 (TAU-1 "a second start changes nothing"), API-10 DLP-006 (released shape converted on restart in the browser) | Proven | — |
| AC-009 | Yes | API-01, API-02 (code review sweep; released-migration tests in API-05) | Proven | — |
| AC-010 | Yes | — | Only The User Can Check | Delivery's. It needs the user's real data, converted only by the released app after his backup (REQ-011). Tests may not use real data or a copy of it (TESTING.md, REQ-010). Every released shape found read-only in his data has a synthesized fixture (API-05), and the upgrade path runs through the real entrypoint (API-09) and in the browser (DLP-006) |
| AC-011 | Yes | (a) API-13 (+ API-02 `collaborator-member-launch.test.ts`); (b) API-02, API-10 (DLP/DCP catalog Team copies follow by `followsTeam`); (c) API-05 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | API-01..05 (repository), API-11..13 (system boundary), API-09 | AC-011(a) is proven in two parts on one rule: the own-approval member's recorded `followsTeam` (Grok), and a configured-place follower taking a Team-level choice (AGY). Restore reads only `followsTeam`. Bounded by the runtime constraints | A runtime that has both an approval toggle and several models in the scripted harness |
| Changed-boundary execution directness | 80% | 96% | API-11..13 enter through the UI and `delegate_task`, and observe the restored launch in the runtime CLI argv, the own files on disk and the app's contexts | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | API-10..13: real server, GraphQL/WebSocket, contracts, Nuxt, Chrome; scripted AGY/Grok CLIs receive the same argv a real CLI would | No paid inference; the change is launch selection, fully visible at the CLI boundary | A gated live run (not needed for this change) |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | API-05/API-09 synthesized released shapes; API-10 DLP-006 released shape in a real data root; probe-owned roots | The user's own data (AC-010, user-only) | Delivery's check after the backup |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Root stop → reopen → restore (API-11, API-12); copy stop → Team choice → resume (API-13); backend restart (DCP-004, DLP-006); preserved/unreadable/second start/predecessor pending (API-05, API-09) | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | API-10..13 in Chrome: rendered "As configured in this run", names, Settings edit and Save; no shell code changed | Desktop shell not run (no shell change) | — |
| Durable regression coverage quality and relevance | 85% | 95% | New durable probe cases DCR-001..003 (`test:e2e:delegated-copy-own-file`), plus the existing suites | Probe cases are run on demand, not in CI | — |

- Overall post-repository confidence: 84% (simple average of the post-repository column)
- Overall final confidence: 95.1% (simple average: 95, 96, 95, 95, 95, 95, 95)
- Calculation method: simple average; no category below 95% in the final column
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` (AC-010 is user-only)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AC-011(a)'s two-part proof (above); AC-010 real data (delivery).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probe-owned real stack) + `Lifecycle` (startup e2e)
- Confidence gap or residual risk it addresses, and the expected gain: after the repository cases, the code reviewer's residual risks were still open: restore after a slot edit at the running system, the rendered "As configured in this run", names, contexts, the run view, and AC-011(a) end to end. The probe runs closed them (post-repository 84% → final 95.1%).
- Browser validation needed, and why or why not: yes. The behavior crosses server views, stream contracts and web contexts and rows, and the label had never been rendered.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: browser probe (web-equivalent renderer) against the real built backend; no deviation from the plan.
- Cases proving web-equivalent behavior: API-10..API-13. Cases proving shell-specific or lifecycle behavior: none needed (no Electron, preload or packaging code in the diff). The server startup migration that a packaged app runs is the same `dist`, proven through its real entrypoint by API-09.
- Effect on any already-running desktop application: `None`. The user's AutoByteus (`/Applications/AutoByteus.app`, data `~/.autobyteus/server-data`) kept running; every run used free ports, a temp data root and HOME, and a fresh headless Chrome.
- Behavior not directly proven and its confidence consequence: a packaged desktop upgrade from a hand-built released root. Low: no shell code changed, and the migration path is covered by API-05, API-09 and DLP-006.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required`
- Representative existing data used: synthesized released shapes (F-A1..F-X3c; API-05); released-shape trees through the real entrypoint (API-09); a browser data root whose Team copies were given the released shape while the backend was down (DLP-006 in API-10).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: API-05 (transformation, dispositions, second start, predecessor pending, D-9), API-09 (startup completion, TAU-2 retry, upgrade), API-10 DLP-006 (converted copies reopen and run on their values).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. The new copies' own files carry no `taskAgent.origin` (API-11..13), and restore never consulted the edited slot (API-11, API-12).
- Residual untested persisted-data risk: the user's real data (AC-010, delivery).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` | Added | API-11, API-12, API-13 | — |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (header lists DCR-001..003; registers the module; no existing case changed) | API-10..API-13 | — |
| `autobyteus-web/package.json` | Updated (`test:e2e:delegated-copy-own-file`) | API-11..API-13 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | `agy-failure-cli.mjs` via a probe-owned wrapper (`linked_skills` case, argv log, `agy models` from a probe file) | No inference or credentials needed; the changed behavior is which launch (`--model`, `--conversation`) a copy gets | No model output quality (not relevant) |
| Grok Build CLI | recorded ACP replay (`fake-grok-cli.mjs`, `prompt.jsonl`) | Same | One model offered (shaped DCR-003) |
| Codex | missing command path (unavailable runtime) | Existing probe design | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (backend, Nuxt dev, Chrome, temp data root/HOME) of the full run and the trial runs | Yes | The probe stops its processes and removes its root (`cleanup` in the evidence JSON); one trial run's `--keep` root was removed by hand | No `delegated-launch-defaults-*` temp root and no probe process left |
| `/tmp/ab197e2e/` (trial outputs, full probe output, ledger) | Yes | Evidence copied into `evidence/`; folder kept until delivery as a scratch area | Kept (not evidence of record) |
| Temp HOME of API-09 | Yes | removed after the run | Removed |
| Full logs `API-07-server-integration.log` (933 KB) and the IMP full logs | Yes / implementation's | Not committed (excerpts committed) | In the worktree |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-010 (only the user can check: his real data after his backup; delivery)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff (proportional test-code review requested)
- Notes:
  - Observations, not findings:
    - "+" from any agent of a Team run opens a New chat for the whole Team (existing behavior).
    - Catalog-copy Settings rows show the address basename (`scribe_5083`) while the sidebar shows the spaced name (`scribe 5083`). This branch does not change Settings row naming (`git diff origin/personal...HEAD -- autobyteus-web/utils/runSettings/ autobyteus-web/components/run-settings/` has no naming line), so it predates this ticket.
  - The accepted residual for mirrored F-X3b copies ("Unattributed runs" on the Memory page) stands for delivery.
