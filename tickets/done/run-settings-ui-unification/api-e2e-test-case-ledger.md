# API/E2E Test-Case Ledger — run-settings-ui-unification

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`.
  - Round 3 head: **`a92004c9e`** (IR-005).
  - Round 2 head: `83ab477e4` (IR-004).
  - Round 1 head: `81f9ff178` (IR-003).
  - The round-0 partial at `c37b81de5` was put on hold.
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md` (API-REV-001..003)
- Ledger scope and reason it is required: many independent live cases with real-model turns and long probe runs, so there is an interruption risk.
- Last updated: 2026-10-06 00:50 (round 3 complete)

Evidence paths below are relative to `evidence/api-e2e/` unless noted.

## Planned Cases

The slices follow SR-010 DI-005: S1 Agent/Team start, S2 Org launch, S3 Saved runs, S4 Mentions, S5 Fast mode, S6 Tools + visuals.

| Case ID | Slice | Case / Journey | Requirement / AC IDs | Boundary / Surface | Command Or Entry Point | Order |
| --- | --- | --- | --- | --- | --- | --- |
| WEB | all | Full web unit/component suite vs baseline | all; AC-012, AC-015 | Repository | `pnpm -C autobyteus-web test:nuxt --run` | 1 |
| N01 | S4 | New chat switcher; `@` excludes the target | REQ-011, AC-007 | Live (Claude haiku) | `pnpm -C autobyteus-web test:e2e:cross-scope-agent-mentions --cases N01,N02,N03` | 2 |
| N02 | S4 | Agent New chat first send with `@Team` → server admits it | REQ-012, AC-007, AF-009 | Live | same | 3 |
| N03 | S4 | Team New chat `@` list = server rule; first send with `@Agent` → team root admits it | REQ-011/012, AF-009, AR-001, DI-002 | Live | same | 4 |
| R01 | S1/S5 | Team Run → New chat; member customized (Codex, Fast, Ask first) → server member config; others inherit | REQ-009/010/022, AC-004/006/019 | Live (Claude haiku + Codex) | `pnpm -C autobyteus-web test:e2e:run-settings-live` | 5 |
| R11 | S1 | Chat nav and pencil → fresh plain New chat | DI-001 | Live | same | 6 |
| R09 | S5 | Agent Run → New chat, Codex + Thinking Low + Fast; independence; run llmConfig; first-send `@` | REQ-022, AC-019, AC-007 | Live | same | 7 |
| R04 | S1 | Agent "+" from the host run and from an `@` collaborator view | REQ-013, AC-008, SR-009 | Live | same | 8 |
| R05 | S1 | Team "+" with member overrides | REQ-013, AC-008 | Live | same | 9 |
| R02 | S2 | Org launch page: member override + placed-team folder workspace → active Org config | REQ-007/009/010, AC-003 | Live | same | 10 |
| R03 | S2 | Org launch rejected by the server → spec copy, values kept, Run enabled | AC-003 | Live | same | 11 |
| R06 | S2 | Org "+" with overrides and placed-team workspace | REQ-013, AC-008 | Live | same | 12 |
| R07 | S3/S5 | Saved Team: locks incl. Fast → Terminate team → locked-runtime menu → change/Cancel/change/Save → readback → resume | REQ-014..017/022, AC-009..011/019 | Live | same | 13 |
| R08 | S3 | Saved Org: Stop Agent Org → change model → Save → readback | AC-009/010 | Live | same | 14 |
| R10 | S1/S2 | DI-004: Codex unavailable → Team "+" / Org "+" copies with a Codex member are blocked | DI-004, AC-002 | Live (backend restarted without Codex) | same | 15 |
| P-FRA | S1 | Migrated mocked probe `fresh-run-auto-approval` | REQ-021, REQ-009 | Mocked renderer | `pnpm -C autobyteus-web test:e2e:fresh-run-auto-approval` | 16 |
| P-ERMC | S3 | Migrated mocked probe `existing-run-model-config` | REQ-004/015..017 | Mocked renderer | `…:existing-run-model-config` | 17 |
| P-POL | S5/S6 | Migrated live probe `chat-composer-polish` T01–T07 | REQ-001/022 | Live | `…:chat-composer-polish` | 18 |
| P-UP | S6 | Migrated live probe `chat-composer-menus-open-upward` U01–U06 | REQ-001 | Live | `…:chat-composer-menus-open-upward` | 19 |
| P-A01 | S4 | Migrated live probe cross-scope A01 | REQ-011 | Live | `…:cross-scope-agent-mentions --cases A01` | 20 |
| P-AGY | S2 | Migrated live probe `agy-large-org-launch-health` | REQ-007 | Live (AGY) | `RUN_AGY_E2E=1 node tests/e2e/agy-large-org-launch-health-probe.mjs` | 21 |
| P-CE | S1/S3 | Migrated live probe `chat-entry-live` C01–C23 | REQ-005/013, BEH-004 | Live (Codex) | `…:chat-entry-live` | 22 |
| VIS | S6 | Screenshots vs VIS-001..042 at 804/880/390 | AC-014 | Screenshots from R* | — | 23 |
| R13 | S6 | Start-surface tools open (VIS-017); Org card Fast mode row (VIS-023/028); Org unavailable (VIS-014) (added in round 3) | AC-017, REQ-022, UIS-004 | Live | `test:e2e:run-settings-live` | 25 |
| R12 | S6 | New chat footer with a long Codex model name, Thinking and Fast: no overlapping controls at 1512/880/804/390 (added in round 2) | REQ-001/022, VIS-020/021/027/042 | Live, DOM geometry | `test:e2e:run-settings-live` | 24 |

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | WEB | 21:25 | Completed | `test:nuxt --run` @ `c37b81de5` | No new failing files | 11 files fail, all on the baseline list | Pass (superseded by seq 6) | `web-suite.log` | — |
| 2–4 | N01–N03 | ~21:35 | Completed | @ `c37b81de5` | Admission | 3/3 Pass | Pass (superseded by seq 7) | `cross-scope-mentions-N/` | — |
| 5 | — | 21:40 | Checkpoint | — | — | Held by the Code Reviewer (CRR-004) | — | — | Resumed on CRR-005 |
| 6 | WEB | 22:00 | Completed | `test:nuxt --run` @ `81f9ff178` | No new failing files | 11 failed files (36 tests), all on the baseline list; 548 files / 3,622 tests pass; new specs `launchReadiness`, `builtInAgentDefinitionIds.contract`, `OrgLaunchPage`, `AppLeftPanel_v2` pass | Pass | `web-suite-81f9ff178.log` | — |
| 7 | N01–N03 | 22:05 | Completed | @ `81f9ff178` | Admission | 3/3 Pass | Pass | `cross-scope-mentions-N-81f9ff178/` | — |
| 8 | R01..R10 | 22:10–23:05 | Checkpoint | Probe development runs (owned temp roots) | — | Fixed probe issues: model-row selection, camelCase Org tree reader, locked-menu allowed set, flyout pointer path | — | dev outputs removed | Final run |
| 9 | R01 | 23:05 | Completed | final `test:e2e:run-settings-live` | drafter Codex + Fast + Ask first; others inherit | drafter `codex_app_server/gpt-5.6-luna {reasoning_effort: medium, service_tier: fast}`, auto false; planner/checker `claude_agent_sdk/haiku`, auto true | Pass | `run-settings-live/` | — |
| 10 | R11 | 23:05 | Completed | same | Fresh plain New chat from nav and pencil | Daily Assistant, empty composer, no members line | Pass | same | — |
| 11 | R09 | 23:05 | Completed | same | llmConfig `{low, fast}`; independence | `{reasoning_effort: low, service_tier: fast}`; Fast toggles kept Low; Thinking changes kept Fast; `@Scout` admitted with the root settings | Pass | same | — |
| 12 | R04 | 23:05 | Completed | same | New chat for the agent on screen, showing the copied settings | Heading/runtime/approval copied; the launched copy carries `{low, fast}`. **The Thinking and Fast chips are not rendered and the model shows the raw id `gpt-5.6-luna` (30 s wait).** The collaborator "+" opens New chat for Scout. | **Fail** | `R04-failure.png`, `VIS-042-…` | Failure-origin review |
| 13 | R05 | 23:05 | Completed | same | Line "1 of 3 customized"; drafter summary "… · Codex · Fast · Ask first" | Copy is correct (Fast chip on when opened). **The collapsed summary reads "gpt-5.6-luna · Codex · Ask first" (no Fast, raw id) until the row is opened.** | **Fail** | `R05-team-copy-drawer-804.png` | Failure-origin review |
| 14 | R02 | 23:05 | Completed | same | Active Org config matches | Root haiku/auto true; Scout Codex/auto false; docs team + members on `docs-team-folder`, inheriting haiku | Pass | same | — |
| 15 | R03 | 23:05 | Completed | same | Spec copy; values kept | "Couldn't start this Agent Org. Try again."; model/approval kept; Run enabled; still `mode=configuration` | Pass | `VIS-013-…` | — |
| 16 | R06 | 23:05 | Completed | same | Prefilled | `sourceOrgRunId` route; Scout Codex + Ask first; docs workspace copied | Pass | `VIS-033-…` | — |
| 17 | R07 | 23:05 | Completed | same | Locks, stop, locked menu, Cancel, Save, resume | Running locks (3 root + Fast 🔒); "Terminate team"; menu lists only allowed Claude replacements; Cancel restored haiku; Save → planner/checker `sonnet`, drafter `{low, fast}` Ask first; resume kept the saved config | Pass | `VIS-006/007/008/025/026` | — |
| 18 | R08 | 23:05 | Completed | same | Saved Org model applied | "Stop Agent Org" → Stopped; root + docs members `sonnet`; Scout kept Codex/Ask first | Pass | `VIS-009-…` | — |
| 19 | R10 | 23:05 | Completed | same, backend restarted with `CODEX_APP_SERVER_COMMAND` → missing path | Send/Run blocked with "{Runtime} is unavailable…" | Server reports Codex disabled. **Team "+": Send enabled. Org "+": Run enabled, no status.** After the model menu is opened (availability fetched), Team Send is blocked with "Codex App Server is unavailable. Choose another runtime." | **Fail** | `R10-*.png` | Failure-origin review |
| 20 | P-FRA | 22:30 / 22:49 | Completed | twice | 8/8 | B01, B08 Pass; B02 disrupted by Nuxt "optimized dependencies changed. reloading" on both runs (the vite config changes every run); B03–B07 not reached | Not Tested (infra) | `fresh-run-auto-approval*/` | Rerun next round |
| 21 | P-ERMC | 22:30 | Completed | — | 6/6 | Passed | Pass | `existing-run-model-config/` | — |
| 22 | P-POL | 22:31 / 22:50 | Completed | twice | T01–T07 | Run 1: T01/T03 fail (diagonal pointer path through the enabled Grok Build flyout). After the sideways-entry fix (run 2): T01, T04, T05, T06 Pass; T02, T03, T07 click timeouts | Not passing (harness/env) | `chat-composer-polish*/` | API/E2E follow-up |
| 23 | P-UP | 22:33 / 22:53 | Completed | twice | U01–U06 | U01 Pass after the stale heading reference was updated to the VIS-001 layout; U05, U06 Pass; U02/U04 "positioned against null" (stale anchor assertion: the menu anchors on the composer input area, as in VIS-030); U03 flyout wait timeout (env) | Not passing (stale/env) | `chat-composer-menus-open-upward*/` | API/E2E follow-up |
| 24 | P-A01 | 22:36 / 22:55 / 23:10 | Completed | three runs | A01 full | Runs 1–2: host on Grok (the probe's model pick took the Grok flyout). Run 3 (fixed pick): passes root-settings admission and briefing, then fails **F-04: the collaborator-view placeholder is "Ask anything · @ for an agent or team"**, not "Message code reviewer…" | **Fail (Unclear)** | `cross-scope-mentions-A01*/` | Failure-origin review |
| 25 | P-AGY | 22:36 | Completed | `RUN_AGY_E2E=1` | No failures | `failures: []`; spec failure copy rendered; tree persisted across restart | Pass | `agy-large-org-launch-health/` | — |
| 26 | P-CE | 22:37 | Completed | Codex default | C01–C23 | 13 Pass. C05/C08/C16/C18 assert removed UI (old forms, always-on ⚙ Save) → stale. C03 model search stuck "Searching all runtimes…" (env; search code unchanged) and C04/C06/C11/C23 cascade from it. C19 needs a recheck. | Not passing (stale/env) | `chat-entry-live/` | API/E2E update next round |
| 27 | VIS | 23:00 | Completed | Eye comparison | Match within the fidelity boundary | VIS-001/002/004/007/008/011/012/013/027 match. **VIS-042 deviates** (copied Thinking/Fast missing; R04). Observation: "All 1 members use these settings". | Mixed | `run-settings-live/VIS-*.png` | — |
| 28 | R* | 2026-10-05 23:20 | Completed | Round 2: full `run-settings-live` @ `83ab477e4` | CR-004 fixed | 11/11 Pass (R04 chips + display name; R05 summary "… · Fast · Ask first"; R10 Team and Org blocked with "Codex App Server is unavailable. Choose another runtime."). **The VIS-042/VIS-021 captures show the model chip overlapping Thinking/Fast at 804 px** (also present in round 1's VIS-021, missed then) | Pass (superseded by seq 33) | `run-settings-live-round1-81f9ff178/` → see seq 33 | Add a durable geometry check |
| 29 | R09/R04 | 23:25 | Completed | Footer-geometry check added; `--cases R04` | No overlap | 804: model [356–676] × Thinking [596–670] and × Fast [672–732]; 880: model × Thinking; 1512/390: none | **Fail (F-3)** | evidence JSON | Separate case R12 |
| 30 | WEB | 23:30 | Completed | `test:nuxt --run` @ `83ab477e4` | No new failing files | The same 11 baseline files; 549 files / 3,629 tests pass (incl. `chatCopiedStartReadiness`, the contract pin) | Pass | `web-suite-83ab477e4.log` | — |
| 31 | N01–N03, P-A01 | 23:34 | Completed | `--cases N01,N02,N03,A01` | Pass | 4/4 Pass (A01 F-04 aligned with base's mention-placeholder precedence) | Pass | `round2-83ab477e4/cross-scope-mentions/` | — |
| 32 | P-POL, P-UP, P-ERMC, P-FRA, P-AGY | 23:36–23:41 | Completed | repaired probes | Pass | polish 7/7; menus-open-upward 6/6; existing-run 6/6; fresh-run 8/8 (B02 retried once after a recorded dev reload); AGY `failures: []` | Pass | `round2-83ab477e4/*` | — |
| 33 | P-CE | 23:42 / 23:55 | Completed | full, then `--cases C03,C04,C05,C06,C11,C18,C23` after the C03 producer fix | Pass | Full: 16 Pass incl. migrated C08/C16/C19; C03 search stalled → cascade. Subset after the fix: C03, C04, C06 (migrated saved-run menu), C11, C18 (migrated AR-003), C23 Pass. **C05: migrated live-lock assertions pass, then the probe's oracle GraphQL `providerModelCatalogSnapshots(codex)` fails server-side ("Codex client generation … has unresolved cleanup")** | Pass except C05 (pre-existing server residual) | `round2-83ab477e4/chat-entry-live*/` | Residual |
| 34 | R01–R12 | 2026-10-06 00:10 | Completed | final full `test:e2e:run-settings-live` @ `83ab477e4` | All pass | 10 Pass; **R12 and R04 Fail only on the footer overlap (F-3)**; R04's chips, data copy and collaborator "+" pass | **Fail (F-3)** | `run-settings-live/` | Failure-origin review |
| 35 | R01–R12 | 2026-10-06 00:05 | Completed | Round 3 full `run-settings-live` @ `a92004c9e`, with the new settings-card geometry checks (drawer rows, Org card, saved-run root/member cards) | All pass | R12/R04 pass (footer clean at 1512/880/804/390). R07 initially failed on saved-run cards at 390 px only (locked values extend past the card edge by up to 19 px) | Checkpoint | — | Scope check: UIS-003 is specified at 880 (no phone row in the spec's matrix) |
| 36 | R07 | 00:12 | Completed | `--cases R07` with geometry details and a 390 shot | — | Root "Auto-approve 🔒" 187–326 vs card 83–307; member "Medium 🔒" / "Ask first 🔒" 223–329 vs 119–311; not related to the long model name | Observation | `R07-saved-run-running-long-model-390.png` (run-settings-live) | Saved-run card asserted at 880/804; 390 recorded as an observation |
| 37 | R01–R12 | 00:18 | Completed | Final full run | All pass | **12/12 Pass**; saved-run long-name card clean at 880/804 (VIS-026 capture: "GPT-5.6-Luna (default reasoning: … Co…" truncates inside the card); the 390 observation is noted | Pass | `run-settings-live/` | — |
| 38 | WEB, N01–N03, P-POL, P-UP, P-CE C03/C04/C12/C16 | 00:22–00:30 | Completed | @ `a92004c9e` | Pass | Web: same 11 baseline files (549 files / 3,629 tests pass); N 3/3; polish 7/7; menus 6/6; chat-entry C03, C04, C12, C16 Pass | Pass | `web-suite-a92004c9e.log`, `round3-a92004c9e/` | — |
| 39 | R13 | 00:45 | Completed | `--cases R13` | Tools docked; Fast row; unavailable copy | Pass. Observation: the unavailable page for an unknown/deleted Org shows an empty heading switcher (chevron only); VIS-014 shows a known Org's name | Pass | `run-settings-live-R13/` | Observation |

## Re-entry And Reconciliation

- Last durably recorded event: seq 39.
- Last completed case and result: R13, Pass.
- Cases still running, interrupted, or not started: none.
- Next case or recovery action: none for this round. Proportional test-code review follows.
- Interruption, context-compression, or rerun note: rounds ran at `c37b81de5` (held), `81f9ff178`, `83ab477e4` and `a92004c9e`.
- Reconciled into execution coverage report: `Yes`.
- Reconciliation note: none missing a terminal result.
