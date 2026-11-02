# API/E2E Execution Coverage Report

autobyteus-348 (runtime switch of Team members, Org members and delegated copies). The coverage investigation is the plan (`api-e2e-coverage-investigation.md`); the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code reviewer's request after Source review CRR-001 Pass (review commit `3261712e06`; code unchanged since `d3463e0a7e`)
- Prior round reviewed: none for this ticket
- Deviations from the investigation's plan, and why: one addition: the contract test API-07 (found by RSM-02/03). One update: the DCP probe waits (D-1).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` (result is `Fail`; failure-origin review requested instead)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `3261712e06` + uncommitted API/E2E tests (committed with this report) | macOS 15 arm64 (Darwin 25.5) | Node 22.23.1; built server `dist/app.js` run in-process by vitest 4.1.12 | `env -i`, fresh temp HOME, owned `runtimeRoot` and database; LM Studio stand-in, scripted Antigravity CLI, fake Grok CLI |
| ENV-2 | same | same | built server as ENV-1; `claude` 2.1.316, `codex-cli` 0.166.0 | real HOME/USER/LOGNAME so the signed-in CLIs work; test-owned data root and database; models `claude-haiku-4-5-20251001` and `gpt-5.6-luna`; scripted Antigravity host for the copy |
| ENV-3 | same | same | built backend + Nuxt dev + headless Google Chrome 156 (playwright-core), free ports | owned temp root and HOME; LM Studio stand-in for native; scripted Antigravity; viewport 1512×952, locale en-US |
| ENV-4 | same | same | `autobyteus-collaboration-stream-contracts` built `dist/`, node:test | none |

## Cases

All commands are run from the named directory. Evidence paths are inside the evidence folder.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | AC-001/002/005, REQ-009 | built server | `autobyteus-server-ts`: `vitest run tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts` (as in `R0-baseline-members-built-server.log` header) | ENV-1 | Pass | `R0-baseline-members-built-server.log` | `Tests  4 passed (4)` | the existing MS-01..04; unchanged by me |
| EX-01 | AC-002, AC-005, AC-006 | built server, Org | `autobyteus-server-ts`: `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-members-extended-built-server.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-02-extended-built-server.log` | `✓ EX-01: Org members: a native target whose start fails after its instruction was written and is retried, and a Grok target; I-7 on both archived segments` | direct Agent AGY→native: the real archive step fails (EISDIR) after the native instruction was written; ack `rejected` with a code; the previous file is byte-identical; no marker, no complete segment; the retry gives one marker, one segment, the native instruction once; nested Agent AGY→Grok: I-7, I-3, I-5; the unrelated member never moved; native member has no external session, Grok member has one |
| EX-02 | AC-004, AC-005, AC-006 | built server, copy, restart | same file and command | ENV-1 | Pass | `API-02-extended-built-server.log` | `✓ EX-02: an agent copy AGY -> native: the server restarts after the save, ...` | save does not change the copy's raw trace; the server restarts before the first message; failed start leaves the file byte-identical; the retry: one marker, one segment (I-7 equality of ids) |
| EX-03 | AC-004, AC-005, AC-007 | built server, Team copies | same | ENV-1 | Pass | `API-02-extended-built-server.log` | `✓ EX-03: Team copies with a Team-level choice ...` | two copies woken in opposite orders; each member has its own segment and marker; a member that never ran starts plainly (REQ-005) |
| EX-04 | AC-001, AC-005, SCN-004 | built server, Team default | same | ENV-1 | Pass | `API-02-extended-built-server.log` | `✓ EX-04: a configured Team's default runtime edit ...`; `Tests  4 passed (4)` | `CONFIGURED_TEAM` plus per-member patches in one save; woken lead-first and worker-first; the member not yet woken stays pending and untouched |
| LV-01 | AC-005 | live Claude Agent SDK ↔ Codex App Server, Team member | `autobyteus-server-ts`: `env -i PATH HOME USER LOGNAME TMPDIR RUN_RUNTIME_SWITCH_MEMBERS_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 RUNTIME_SWITCH_MEMBERS_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-members-live.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-03-live-claude-codex.log`, `API-03-live-segments/team-member/` | `✓ LV-01: a Team member, Claude -> Codex -> Claude`; manifest has two `runtime_switch` segments with `runtime_kind` `claude_agent_sdk` then `codex_app_server` | Claude does a shell task; stop; save Codex; message; stop; save Claude; message. Asserted: segment 1 ids equal exactly the Claude agent's records, segment 2 ids equal exactly the first marker plus the Codex agent's records, segment 1 unchanged after the second switch, marker first (I-3), one marker (I-5); the other member never ran |
| LV-02 | AC-002, AC-005 | live pair, Org (direct and nested) | same | ENV-2 | Pass | `API-03-live-claude-codex.log`, `API-03-live-segments/org-member__direct/`, `API-03-live-segments/org-member__crew_worker/` | `✓ LV-02: Org members, a direct Agent and an Agent of a mounted Team, Claude -> Codex -> Claude` | same assertions per member; the stopped Org is restored (`restoreAgentOrgRun`) before each message as the Settings page does |
| LV-03 | AC-004, AC-005 | live pair, delegated copy | same (needs the scripted Antigravity host) | ENV-2 | Pass | `API-03-live-claude-codex.log`, `API-03-live-segments/delegated-copy/` | `✓ LV-03: a delegated copy (started by a scripted host), Claude -> Codex -> Claude`; segments `(1, claude_agent_sdk, 7 records)`, `(2, codex_app_server, 8 records)` | the copy starts on Claude (its definition's default), is stopped through `stopDelegatedExecution`, switched with `updateDelegatedLaunchSelections`, woken by the host's `send_message_to` |
| RSM-01 | AC-001, AC-008 | browser, Team | `autobyteus-web`: `pnpm test:e2e:runtime-switch-members --output-dir <dir>` (RSM-01 part) | ENV-3 | Pass | `API-04-browser-probe.log`, `API-04-browser-probe-evidence.json`, `API-04-screens/RSM-01-runtime-menu.png`, `RSM-01-unsaved-switch.png`, `RSM-01-saved.png`, `RSM-01-after-reload.png`, `RSM-01-settings-after.png` | log `RSM-01 Pass`; runtime menu lists `autobyteus, codex_app_server, claude_agent_sdk, grok_build, antigravity_cli` with no locked-runtime banner on the nested worker row; saved row `Customized · Gemini test · Antigravity CLI · Auto-approve`; after the first message the chat shows "Agent runtime changed from AutoByteus (rsw-native…) to Antigravity CLI (gemini-3.8-flash-low)." once, also after a fresh load; the lead never started | the hint "An agent that changes its agent runtime keeps its run and chat…" shows when the choice is unsaved |
| RSM-02 | AC-002, AC-008 | browser, Org direct Agent | same (RSM-02 part) | ENV-3 | Fail | `API-04-browser-probe.log`, `API-04-screens/RSM-02-failure.png`, `rsm02-direct-saved.png`, `rsm02-direct-settings-after.png` | `RSM-02 Fail — saving the switch shows an error in the Settings: [ { "code": "invalid_union", ... "keys": [ "pendingRuntimeSwitch" ] ... "Unrecognized key: \"pendingRuntimeSwitch\""` | one finding only: the Save writes the pending switch on the server (checked), but the Settings show the raw schema error and the Save bar stays on "Unsaved changes"; everything after it works: first message switches (one segment), reopened chat shows the earlier turn and one marker, Settings after the switch show Antigravity with no note |
| RSM-03 | AC-002, AC-008 | browser, Org nested Agent | same (RSM-03 part) | ENV-3 | Fail | `API-04-browser-probe.log`, `API-04-screens/RSM-03-failure.png`, `rsm03-nested-runtime-menu.png`, `rsm03-nested-row-open.png`, `rsm03-nested-saved.png` | `RSM-03 Fail — saving the switch shows an error in the Settings: [ { "code": "invalid_union", ...` | same single finding for the nested row (Org → Team → Agent); the open runtime menu on the nested row is rendered (screenshot) |
| RSM-04 | AC-004, REQ-002 | browser, delegated copy | same (RSM-04 part) | ENV-3 | Fail | `API-04-browser-probe.log`, `API-04-screens/rsm04-copy-saved.png`, `rsm04-copy-settings-reopened.png`, `rsm04-copy-chat-after.png`, `rsm04-copy-runtime-menu.png` | `RSM-04 Fail — the saved copy row does not show Antigravity: rsw-native:lmstudio@127.0.0.1:… · AutoByteus · Auto-approve · Agent default`; reopened row: `Gemini test · Antigravity CLI · Auto-approve` | the Save succeeds ("Saved. Changes apply when this run resumes."), the host wakes the copy, one native segment, the copy chat shows the earlier turn and one marker; the only finding is the stale row immediately after Save (still stale after 10 s; correct after reopening Settings) |
| RSM-05 | REQ-001, SCN-004 | browser, Team root | same (RSM-05 part) | ENV-3 | Pass | `API-04-browser-probe-evidence.json`, `API-04-screens/rsm05-team-root-menu.png` | `rootLockedBanner: 1`, `rootRuntimeRows: []`, banner text `AutoByteus` | observation: a Team root's own runtime is locked in the UI, as designed; the default-runtime cascade is reachable only through the server API (EX-04) |
| DCP-001..005 (before) | AC-010 | browser, copy model edits (existing probe) | `autobyteus-web`: `pnpm test:e2e:delegated-copy-model-change --output-dir <dir>` | ENV-3 | Fail | `API-05a-delegated-copy-probe-before-update.log`, `API-04-screens/DCP-001-failure-before-update.png` | five lines `DCP-00N Fail … locator.waitFor: Timeout 60000ms exceeded.`; screenshot shows the stopped copy's open runtime menu | obsolete assertion (waits for `chat-model-locked-runtime`); not a product defect |
| DCP-001..005 (after) | AC-010 | same | same command after the probe update | ENV-3 | Pass | `API-05b-delegated-copy-probe-after-update.log` | five `DCP-00N Pass`, `exit 0` | updated waits in `delegated-launch-defaults-probe.mjs` |
| API-06 | REQ-009 | browser, existing probe | `autobyteus-web`: `pnpm test:e2e:existing-run-model-config --output-dir <dir>` | ENV-3 | Fail (pre-existing) | `API-06-existing-run-probe.log` | `failed with 4 failure(s)`: `API-E2E-004-A`, `-D`, `-E`, `BROWSER-PAGE-ERRORS` | the same 4 checks fail at the base commit (IMP-13); recorded as FU-C2, out of scope |
| API-07 | AC-002 | contract schema | `autobyteus-collaboration-stream-contracts`: `pnpm build && node --test tests/org-member-pending-runtime-switch.test.mjs` | ENV-4 | Fail | `API-07-contracts-org-pending.log` | `not ok 1 - an Org's direct Agent with a pending runtime switch is a valid Org tree`, `not ok 2 - an Agent of a mounted Team ...`, `"code": "unrecognized_keys"` | red by design until the Org tree DTO accepts the field; test 3 (malformed pending still rejected) passes |
| X-A | AC-006 | mutation | `dist/…/configured-agent-switch-attempt.js`: a failed attempt discards nothing; extended file | ENV-1 | Fail (expected) | `X-mutations-extended.log` | `the previous agent's file is byte-identical after the failure: expected …` | `dist/` restored with cmp |
| X-B | AC-005, AC-006 | mutation | `dist/…/runtime-switch-recorder.js`: the archive ignores the watermark | ENV-1 | Fail (expected) | `X-mutations-extended.log` | `Tests  2 failed | 1 skipped (3)` | restored with cmp |
| X-C | AC-005 | mutation, live | recorder given no watermark; `-t LV-01` | ENV-2 | Fail (expected) | `X-mutations-extended.log` | `× LV-01 …` | breaks the switch with a server error on the live pair; does not isolate I-7 (X-B does) |

Reviewer's bullets: (a) LV-01..03; (b) RSM-01..04 (the new rows and the open runtime menu on nested rows are rendered: `RSM-01-runtime-menu.png`, `rsm03-nested-runtime-menu.png`, `rsm04-copy-runtime-menu.png`); (c) EX-01 (Org member) and EX-02 (copy): byte-identical file after the failed start, one marker and one segment after the retry; (d) EX-02 (copy restart), EX-04 and EX-03 (orders), RSM-05; (e) EX-01 (Grok target and native target inside an Org member).

## Findings

- **F-1 (Fail, critical path, AC-002 in the rendered surface):** Saving a switch for an Org member (direct, or nested in a mounted Team) shows a raw Zod error in the Settings and leaves the Save bar on "Unsaved changes". Cause (observed): `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` `configuredAgent` is `.strict()` and has no `pendingRuntimeSwitch`; the server's `getAgentOrgRunConfig.executionTree` carries it on the member; the web parses that tree with `agentOrgExecutionTreeDtoSchema.parse` (`autobyteus-web/services/runConfigEditing/agentOrgRunConfigClient.ts`). The same parse fails for any fresh read of an Org with a pending member (confirmed by parsing a real server tree with the built schema). The server state is correct; the first message still switches (RSM-02/03 remaining steps pass). The Team path is unaffected (RSM-01).
- **F-2 (Fail, user-visible, lower severity, AC-004):** After a successful Save of a stopped copy's runtime change, the copy row keeps showing the previous runtime until the Settings are reopened (RSM-04; still stale after 10 s). The server record is right (reopened row, switch at the wake).
- **D-1 (stale existing test, fixed):** `delegated-launch-defaults-probe.mjs` DCP-001..005 waited for the locked-runtime banner that copies no longer show. Updated; 5/5 pass.
- **P-1 (pre-existing, out of scope):** API-06, FU-C2.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | EX-04, R0 (MS-01), RSM-01, LV-01 | Proven | |
| AC-002 | Yes | EX-01, R0 (MS-04), LV-02 | Not Proven (rendered surface) | server side proven; the rendered Org journeys RSM-02/03 and API-07 fail (F-1) |
| AC-003 | No | not run by me | Not Proven | undo and double save are covered by implementation unit tests (IMP-03); I did not re-run them as a separate case |
| AC-004 | Yes | EX-02, EX-03, LV-03 | Proven (server); rendered row display Not Proven (F-2, RSM-04) | |
| AC-005 | Yes | LV-01..03, EX-01..04, R0, X-B | Proven | |
| AC-006 | Yes | EX-01, EX-02, X-A, X-B | Proven | |
| AC-007 | Yes | EX-03 | Proven | |
| AC-008 | Yes | RSM-01 (Team), RSM-02/03/04 (reopened chats show earlier turn and one marker, the findings above are about Save, not about the chat) | Proven | the journal and memory-search reads were not exercised by me beyond the chat; covered by IMP checks |
| AC-009 | No | IMP-07 (implementation check, not repeated) | Not Proven by me | |
| AC-010 | Yes | R0, DCP-001..005 (after update) | Proven | `existing-run-model-config` still fails 4 checks as at the base (FU-C2) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 75% | EX-01..04, LV-01..03, R0 | AC-002/AC-004 rendered surface fails; AC-003/009 not re-run | fix F-1/F-2, rerun RSM-02..04 and API-07 |
| Changed-boundary execution directness | 92% | 92% | built server, live pair, real archive step | | |
| Cross-boundary integration realism and mock gap | 85% | 88% | live Claude/Codex; browser with real backend | Grok, Antigravity and native are scripted | real accounts (not needed for the change) |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | ENV-1..4 | live runs use the user's CLI sign-ins | |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 92% | EX-01, EX-02, EX-03, EX-04, X-A, X-B | a live failed start was not injected | |
| User-surface, browser, and desktop-shell confidence | 50% | 55% | RSM-01, RSM-05, DCP after update | Org and copy journeys fail on F-1/F-2 | fix and rerun |
| Durable regression coverage quality and relevance | 85% | 85% | EX-*, LV-*, RSM-*, API-07 | API-07 is red until fixed; the probe takes about 4 minutes | |

- Overall post-repository confidence: 83%
- Overall final confidence: 82%
- Calculation method: simple average of the seven category scores (582/7 and 577/7)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-002 and AC-004 in the rendered surface)
- Any final applicable category below `90%`: `Yes` — requirement proof 75%, integration realism 88%, user-surface 55%, durable coverage 85%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2; scripted (not live) Grok/Antigravity/native.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Browser` and `Live API`
- Confidence gap or residual risk it addresses, and the expected gain: the rows, the open runtime menu on nested and copy rows and the live pair were never exercised; the gain was the two findings above
- Browser validation needed, and why or why not: yes; both findings are visible only in the rendered Settings
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

Not applicable (no shell code changed).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: runs that never switched and members without a pending field (R0, EX-03's member that never ran)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: R0, EX-03
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: old Org trees read by the strict DTO are fine (no new field); F-1 concerns only trees that carry the new field

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-extended-built-server.e2e.test.ts` | Added | EX-01..04 | |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-live.e2e.test.ts` | Added (gated) | LV-01..03 | |
| `autobyteus-web/tests/e2e/runtime-switch-members-probe.mjs` | Added | RSM-01..05 | |
| `autobyteus-web/package.json` (script `test:e2e:runtime-switch-members`) | Updated | RSM-01..05 | |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated (two waits) | DCP-001..005 | |
| `autobyteus-collaboration-stream-contracts/tests/org-member-pending-runtime-switch.test.mjs` | Added (red until F-1 is fixed) | API-07 | |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (failure-origin review requested)
- Diff or repository evidence supplied for removed paths: no removals

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Native model | LM Studio stand-in (`LMSTUDIO_HOSTS`) | deterministic replies | native model behavior not exercised |
| Antigravity CLI | scripted CLI `tests/fixtures/agy-failure-cli.mjs` | no real account provided | its real stream not exercised |
| Grok Build | fake CLI `tests/fixtures/grok-acp/fake-grok-cli.mjs` | no real account | same |
| Claude Agent SDK, Codex App Server | none (real signed-in CLIs) | | cost and nondeterminism; assertions use structure, not wording |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| vitest runtime roots and databases | Yes | `removeOwnedTestRuntime` in `afterAll` | removed |
| Probe stacks (backend, Nuxt, Chrome) and temp roots | Yes | SIGTERM of owned PIDs, root removed (`cleanup` in the evidence JSON) | removed; the held exploration stack's root was removed by hand |
| `dist/` mutations X-A, X-B, X-C | Yes | restored from saved copies | `cmp` identical |
| Claude/Codex sessions created by the live runs | Yes | not removable by me | remain in the user's CLI histories (synthetic `ls` task); disclosed |
| `/tmp` logs and screenshots | Yes | kept as working copies; the evidence folder holds the committed copies | |

## Preliminary Classification (On `Fail`)

- F-1: `Local Fix`, recommended owner `implementation_engineer` (add the optional, shape-checked `pendingRuntimeSwitch` to the Org tree DTO's configured Agent in `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`; check the other strict tree schemas that can carry a pending switch; rebuild the contracts; rerun API-07 and RSM-02/03).
- F-2: `Local Fix`, recommended owner `implementation_engineer` (the web's delegated draft/reconcile after a copy's runtime Save); rerun RSM-04.
- D-1 and the new tests are mine and done.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-002 (rendered Org surface), AC-004 (rendered copy row), AC-003 and AC-009 (not re-run by me); no user-only parts
- Preliminary classification and recommended owner (on `Fail`): `Local Fix` / `implementation_engineer`
- Next recipient from `get_handoff_rules` (`Blocked` -> user request): `code_reviewer` for failure-origin review
- Notes: everything the reviewer asked for on the server and live surfaces passes (a, c, d, e). The two failures are in the rendered surface.
