# API/E2E Execution Coverage Report

autobyteus-348 (runtime switch of Team members, Org members and delegated copies). The coverage investigation is the plan (`api-e2e-coverage-investigation.md`); the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2; code reviewer's request after Source review CRR-004 Pass (review commit `d7e63493e7`) following my round-1 Fail (`API-REV-001`, commit `1269820159`) and the rework IR-002 and IR-003
- Prior round reviewed: round 1 (Fail: F-1 Org Save shows a raw schema error, F-2 stale copy row after Save)
- Deviations from the investigation's plan, and why: added RSM-06 (model-only copy Save, for comparison), RSM-07 (Org undo with a non-null original session) and EX-05 (Team double save and undo) as the reviewer asked and to close AC-003; replaced the contract test API-07 (it asserted the opposite of the approved wire decision)
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/evidence/api-e2e/` (round-2 files carry the suffix `r2`; round-1 files stay as the record of the failure)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `d7e63493e7` + the test changes committed with this round; server rebuilt (`pnpm -C autobyteus-server-ts build` exit 0) | macOS arm64 (Darwin 25.5) | Node 22.23.1; built server `dist/app.js` in-process by vitest 4.1.12 | `env -i`, fresh temp HOME, owned `runtimeRoot` and database; LM Studio stand-in, scripted Antigravity CLI, fake Grok CLI |
| ENV-2 | same | same | built server as ENV-1; `claude` 2.1.316, `codex-cli` 0.166.0 | real HOME/USER/LOGNAME for the signed-in CLIs; test-owned data root and database; models `claude-haiku-4-5-20251001`, `gpt-5.6-luna`; scripted Antigravity host for the copy |
| ENV-3 | same | same | built backend + Nuxt dev (this worktree's web code, including IR-002/IR-003) + headless Google Chrome 156 (playwright-core), free ports | owned temp root and HOME; LM Studio stand-in (two native models) and scripted Antigravity (`AGY_FAKE_EXTRA_MODELS=rsw-alt-model`); 1512×952, en-US |
| ENV-4 | same | same | `autobyteus-collaboration-stream-contracts` built `dist/`, node:test | none |

## Cases

Evidence paths are inside the evidence folder. Commands are run from the named directory.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | AC-001/002/005, REQ-009 | built server | `autobyteus-server-ts`: `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts --no-watch` (rerun on the rebuilt server) | ENV-1 | Pass | `R0r2-baseline-members-built-server.log` (round 1: `R0-baseline-members-built-server.log`) | `Tests  4 passed (4)` | existing MS-01..04 |
| EX-01 | AC-002, 005, 006 | built server, Org | same env, `tests/e2e/runtime/runtime-switch-members-extended-built-server.e2e.test.ts` | ENV-1 | Pass | `API-02r2-extended-built-server.log` | `✓ EX-01: Org members: a native target whose start fails after its instruction was written and is retried, and a Grok target; I-7 on both archived segments` | failure injection (EISDIR in the real archive step) then retry; byte-identical previous file; one marker, one segment; Grok and native targets I-7 |
| EX-02 | AC-004, 005, 006 | built server, copy, restart | same file | ENV-1 | Pass | `API-02r2-extended-built-server.log` | `✓ EX-02: an agent copy AGY -> native: the server restarts after the save, ...` | restart between save and first message; failed start; retry |
| EX-03 | AC-004, 005, 007 | built server, Team copies | same file | ENV-1 | Pass | same | `✓ EX-03: Team copies with a Team-level choice ...` | opposite wake orders; a member that never ran starts plainly |
| EX-04 | AC-001, 005, SCN-004 | built server, Team default | same file | ENV-1 | Pass | same | `✓ EX-04: a configured Team's default runtime edit ...` | woken lead-first and worker-first |
| EX-05 | AC-003 | built server, Team member | same file (new case) | ENV-1 | Pass | same; mutation in `X-mutations-extended.log` (X-D) | `✓ EX-05: a Team member's saves before its first input: ...`; `Tests  5 passed (5)` | second save keeps the first previous binding, session and switch id; undo restores binding and session, no pending; the next message gives no marker and no segment |
| LV-01 | AC-005 | live Claude Agent SDK ↔ Codex App Server, Team member | `autobyteus-server-ts`: `env -i PATH HOME USER LOGNAME TMPDIR RUN_RUNTIME_SWITCH_MEMBERS_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 RUNTIME_SWITCH_MEMBERS_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-members-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-03r2-live-claude-codex.log`, `API-03r2-live-segments/team-member/` | `✓ LV-01: a Team member, Claude -> Codex -> Claude`; manifest segments `claude_agent_sdk` then `codex_app_server` | I-7 by exact id equality on both segments; I-3, I-5, I-8; the other member never ran |
| LV-02 | AC-002, 005 | live pair, Org direct and nested | same | ENV-2 | Pass | `API-03r2-live-claude-codex.log`, `API-03r2-live-segments/org-member__direct/`, `.../org-member__crew_worker/` | `✓ LV-02: Org members, ...` | same assertions per member |
| LV-03 | AC-004, 005 | live pair, delegated copy | same | ENV-2 | Pass | `API-03r2-live-claude-codex.log`, `API-03r2-live-segments/delegated-copy/` | `✓ LV-03: a delegated copy (started by a scripted host), Claude -> Codex -> Claude` | |
| RSM-01 | AC-001, 008 | browser, Team | `autobyteus-web`: `pnpm test:e2e:runtime-switch-members --output-dir <dir>` | ENV-3 | Pass | `API-04r2-browser-probe.log`, `API-04r2-browser-probe-evidence.json`, `API-04r2-screens/RSM-01-saved.png` | `RSM-01 Pass`; saved row `Customized · Gemini test · Antigravity CLI · Auto-approve`; one marker in the live and the reopened chat | stop, Edit config, nested runtime menu (unlocked), Save, message the worker, reopen |
| RSM-02 | AC-002, 008 | browser, Org direct Agent | same | ENV-3 | Pass | same; `API-04r2-screens/rsm02-direct-saved.png`, `rsm02-direct-settings-after.png` | `RSM-02 Pass`; `saveNote: null` (round 1: `RSM-02 Fail — saving the switch shows an error … "pendingRuntimeSwitch"`, `API-04-browser-probe.log`) | F-1 resolved: no schema error after Save; pending on the server for that member only; first message switches (one segment); reopened chat shows the earlier turn and one marker |
| RSM-03 | AC-002, 008 | browser, Org nested Agent | same | ENV-3 | Pass | same; `API-04r2-screens/rsm03-nested-runtime-menu-antigravity_cli.png`, `rsm03-nested-saved.png`, `rsm03-nested-settings-after.png` | `RSM-03 Pass`; `saveNote: null`; runtime menu on the nested row lists all five runtimes | F-1 resolved for the nested row |
| RSM-04 | AC-004, REQ-002 | browser, delegated copy | same | ENV-3 | Pass | same; `API-04r2-screens/rsm04-copy-saved.png`, `rsm04-copy-settings-reopened.png`, `rsm04-copy-chat-after.png`, `rsm04-copy-runtime-menu-antigravity_cli.png` | `RSM-04 Pass`; `savedSummary: Gemini test · Antigravity CLI · Auto-approve` (round 1: `rsw-native… · AutoByteus · Agent default` after Save) | F-2 resolved: the saved row shows the choice at once; the copy switches at the host's wake; one segment; one marker in the copy chat |
| RSM-05 | REQ-001 | browser, Team root | same | ENV-3 | Pass | `API-04r2-browser-probe-evidence.json`, `API-04r2-screens/rsm05-team-root-menu.png` | `rootLockedBanner: 1`, `rootRuntimeRows: []` | a Team root's own runtime is locked in the UI by design |
| RSM-06 | AC-010 | browser, copy, comparison | same | ENV-3 | Pass | same; `API-04r2-screens/rsm06-copy-model-saved.png` | `saved: Retiring test model · Antigravity CLI · Auto-approve`, `hint: 0`, `saveNote: null` | a model-only Save of a stopped copy shows the new model at once, shows no runtime-change hint, writes no marker |
| RSM-07 | AC-003, AC-002 | browser, Org undo | same | ENV-3 | Pass | same; `API-04r2-screens/rsm07-undo-switch-saved.png`, `rsm07-undo-saved.png`; `API-04r2-mutation-undo-guard.log` | `undone: {runtime: antigravity_cli, model: gemini-3.8-flash-low, session: f236ae78-9626-458d-93cb-343cf262ba3e, hasPending: false}`, equal to `originalSession` | an Org member on Antigravity with an external session is switched to native and saved (pending, session dropped), then switched back and saved: binding and session return, no hint, no note; the next message writes no marker and no segment. With the IR-003 change to `agentOrgRunConfigAdoption.ts` reverted the same case fails: `the undo Save shows a note … Org configuration changed topology, identity, or locked fields.` (restored with `git checkout`) |
| DCP-001..005 | AC-010 | browser, existing copy probes | `autobyteus-web`: `pnpm test:e2e:delegated-copy-model-change --output-dir <dir>` | ENV-3 | Pass | `API-05r2-delegated-copy-probe.log` | five `DCP-00N Pass`, `exit 0` | the web stores changed in IR-002; round 1 failed these on an obsolete wait (`API-05a`), fixed and passing since (`API-05b`) |
| API-06 | REQ-009 | browser, existing probe | `autobyteus-web`: `pnpm test:e2e:existing-run-model-config --output-dir <dir>` | ENV-3 | Fail (pre-existing) | `API-06r2-existing-run-probe.log` | `failed with 4 failure(s)`: `API-E2E-004-A`, `-D`, `-E`, `BROWSER-PAGE-ERRORS` | unchanged from the base commit (FU-C2), out of scope |
| API-07 | AC-002 | contract schema | `autobyteus-collaboration-stream-contracts`: `pnpm build && node --test tests/org-member-pending-runtime-switch.test.mjs` | ENV-4 | Pass | `API-07r2-contracts-org-pending.log` | `# pass 3`, `# fail 0` | rewritten: asserts a tree carrying `pendingRuntimeSwitch` is not a wire tree (the approved wire decision); the proof that the server keeps it off the wire is `agent-org-run-config-wire.test.ts` (reviewer's reference), which I ran: 4 passed |
| X-A..X-D | AC-003, 005, 006 | mutations of `dist/` | see `X-mutations-extended.log` | ENV-1/2 | Fail (expected) | `X-mutations-extended.log` | X-D: `AssertionError: the original session is back: expected null to be '03bbd8cb-…'` | X-A..X-C from round 1; X-D new (EX-05); every mutation restored with `cmp` |

Round-1 results kept for history: `API-02`, `API-03`, `API-04`, `API-05a`, `API-05b`, `API-06`, `API-07` and `R0` files in the evidence folder.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | EX-04, R0, RSM-01, LV-01 | Proven | |
| AC-002 | Yes | EX-01, R0, LV-02, RSM-02, RSM-03, API-07 | Proven | |
| AC-003 | No | EX-05 (Team member: double save, undo), RSM-07 (Org undo, rendered, non-null session) | Proven for Team members and Org members; an agent copy's undo is covered by implementation unit tests only | |
| AC-004 | Yes | EX-02, EX-03, LV-03, RSM-04, RSM-06 | Proven | |
| AC-005 | Yes | LV-01..03, EX-01..04, R0, X-B | Proven | |
| AC-006 | Yes | EX-01, EX-02, X-A, X-B | Proven | |
| AC-007 | Yes | EX-03 | Proven | |
| AC-008 | Yes | RSM-01..04 (live and reopened chats) | Proven for the chat; journal and memory-search reads were not exercised by me | |
| AC-009 | No | IMP-07 (implementation check, not repeated) | Not Proven by me | |
| AC-010 | Yes | R0, DCP-001..005, RSM-06 | Proven (`existing-run-model-config` still fails 4 checks as at the base: FU-C2) | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 94% | all critical criteria directly proven; AC-003 by EX-05 and RSM-07 | AC-009 and a copy's undo not exercised by me | repeat codegen check; a copy-undo case |
| Changed-boundary execution directness | 93% | 93% | EX-*, LV-*, RSM-* | | |
| Cross-boundary integration realism and mock gap | 88% | 90% | live Claude/Codex; real backend + browser | Grok, Antigravity and native are scripted | real accounts for those runtimes (not provided) |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | ENV-1..4 | live runs use the user's CLI sign-ins | |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 93% | EX-01, EX-02, EX-03, EX-05, X-A..X-D | no live failed start | a live failure injection |
| User-surface, browser, and desktop-shell confidence | 70% | 94% | RSM-01..07, DCP-001..005 | no shell-specific change; one browser (Chrome) | |
| Durable regression coverage quality and relevance | 90% | 93% | EX-*, LV-*, RSM-*, API-07 (3 mutation proofs, one fail-first proof on RSM-07) | the browser probe takes about 5 minutes | |

- Overall post-repository confidence: 88%
- Overall final confidence: 92%
- Calculation method: simple average of the seven category scores (final: 94+93+90+90+93+94+93 = 647/7 = 92.4%; post-repository: 92+93+88+90+92+70+90 = 615/7 = 87.9%)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (92%)
- Confidence-limiting residual risks: Grok, Antigravity and native runtimes are scripted (their real streams are not exercised); a copy's undo and AC-009 are covered by implementation checks only; journal and memory-search reads of a switched member were not exercised beyond the chat.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Browser` and `Live API`
- Confidence gap or residual risk it addresses, and the expected gain: after rework, the rendered Org and copy rows, the Org undo, and the live pair on the rebuilt server; the gain was F-1 and F-2 closed with direct rendered proof and the new undo coverage
- Browser validation needed, and why or why not: yes, the defects were visible only in the rendered Settings
- Remaining gap to the 95% default: external runtimes other than Claude and Codex are scripted. The surface that would close it needs real Grok and Antigravity accounts, which were not provided; the switch logic is runtime-neutral and the live pair covers external↔external, so the residual risk is judged small.

## Desktop Application Validation

Not applicable (no shell code changed).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: runs that never switched and members without a pending field (R0r2, EX-03's member that never ran)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: R0r2, EX-03
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none beyond the above

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (cumulative with round 1)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-extended-built-server.e2e.test.ts` | Added (round 1: EX-01..04; round 2: EX-05) | EX-01..05 | |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-live.e2e.test.ts` | Added (gated) | LV-01..03 | |
| `autobyteus-web/tests/e2e/runtime-switch-members-probe.mjs` | Added (round 2: RSM-06, RSM-07, a second native model in the stand-in, an extra Antigravity model) | RSM-01..07 | |
| `autobyteus-web/package.json` (script `test:e2e:runtime-switch-members`) | Updated | RSM-01..07 | |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (two waits, round 1) | DCP-001..005 | |
| `autobyteus-collaboration-stream-contracts/tests/org-member-pending-runtime-switch.test.mjs` | Added in round 1, rewritten in round 2 (asserts the opposite: the field is not on the wire) | API-07 | the round-1 assertions (the schema accepts `pendingRuntimeSwitch`) contradicted the approved wire decision (CRR-004); replacement is this file |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: no removals; the rewritten contract test's diff is in the commit

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Native model | LM Studio stand-in (two models) | deterministic replies | native model behavior not exercised |
| Antigravity CLI | scripted CLI `tests/fixtures/agy-failure-cli.mjs` | no real account provided | its real stream not exercised |
| Grok Build | fake CLI `tests/fixtures/grok-acp/fake-grok-cli.mjs` | no real account | same |
| Claude Agent SDK, Codex App Server | none (real signed-in CLIs) | | cost and nondeterminism; assertions use structure, not wording |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| vitest runtime roots and databases | Yes | `removeOwnedTestRuntime` in `afterAll` | removed |
| Probe stacks (backend, Nuxt, Chrome) and temp roots | Yes | SIGTERM of owned PIDs; root removed (`cleanup` in `API-04r2-browser-probe-evidence.json`) | removed |
| `dist/` mutation X-D and the reverted web file for the RSM-07 mutation | Yes | restored (`cmp`, `git checkout`) | identical to the commit (`git status` shows only my test files) |
| Server `dist/` | Yes | rebuilt from this commit for the round | current |
| Claude/Codex sessions created by the live runs | Yes | not removable by me | remain in the user's CLI histories (synthetic `ls` task); disclosed |
| `/tmp` logs and screenshots | Yes | kept as working copies; the evidence folder holds the committed copies | |

## Preliminary Classification (On `Fail`)

Not applicable: the round result is `Pass`. The one failing case, API-06, is the pre-existing FU-C2 (the same 4 checks fail at the base commit), out of scope.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-009 (implementation check IMP-07, not repeated by me); a copy's undo (unit tests only); no user-only parts
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `code_reviewer` for proportional test-code review
- Notes: F-1, F-2 and the Org undo (F-3) are proven resolved in the rendered surface; the final confidence is 92%, below the default 95% only for the scripted Grok, Antigravity and native runtimes.
