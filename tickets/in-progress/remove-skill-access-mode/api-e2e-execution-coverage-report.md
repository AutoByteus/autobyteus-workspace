# API/E2E Execution Coverage Report — remove-skill-access-mode

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode/tickets/in-progress/remove-skill-access-mode/`. Evidence is under `api-e2e-evidence/`.

## Execution Round Meta

- Requirements Doc: `requirements-doc.md`
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (`SR-005`)
- Design Spec: `design-spec.md` (`SR-005`)
- Supplemental Task Artifacts: `implementation-design-impact-DI-001.md`, `solution-handoff.md`. Product Design: `N/A — not applicable`
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-003`)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (`IR-002`)
- Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md` (`CRR-002`)
- Delivery Revision Record / IDs: `N/A`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: `/code_reviewer` pass handoff `CRR-002`
- Prior Round Reviewed: None
- Latest Authoritative Round: 1
- Code under validation: branch `codex/remove-skill-access-mode` @ `1595b8b2c`, base `57df63f07`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`, with one order slip: the TC-09 test case was written into the E2E file a few minutes before the investigation file was saved. The decision recorded there is the one that was made; nothing else in the suite had changed.
- Investigation plan followed: `Yes`. Deviations: (1) the repository's gated live-runtime suite is stale on base, so AC-003 was proven through the running server instead; (2) a second durable test was added after the first confidence assessment; (3) the first live lifecycle probe used a state no user can produce and was replaced.
- Existing coverage decisions revised during execution: the gated live suite and the history / team-configuration E2Es moved from `Still Valid` to `Needs Update — outside this ticket` once their base failures were read.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes` from the base run of TC-03 onward; TC-01, TC-02 and the first branch run of TC-03 were executed during discovery and recorded when the ledger was created.
- Every completed case recorded immediately: `Yes`, except that TC-06 to TC-09 were recorded together after TC-08, and event times were first written as estimates and then corrected to the evidence file times.
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 23 (cleanup)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| TC-01 | Pass | 2 | session output | grep gate clean for current code |
| TC-02 | Pass | 4 | `03-upgrade-probe-*` | released data upgrades identically to base |
| TC-03 | Pass (no regression) | 5 | `02-upgrade-e2e-*` | same 3 failures on base; stale file, follow-up |
| TC-04 / TC-05 | Pass (no regression) | 10 | `04-server-full-*` | 0 branch-only failures |
| TC-06 | Pass | 7 | `06-autobyteus-ts.log` | — |
| TC-07 | Pass (no regression) | 8 | `07-*.log` | 7 collaboration-stream failures identical on base |
| TC-08 | Pass (no regression) | 9 | `08-*` | 4 failures identical on base |
| TC-09 | Pass | 6 | `09-daily-assistant-catalog.log` | durable case added |
| TC-10 | Pass | 11 | `10-*` | — |
| TC-11 | Pass | 14 | `11-*` | — |
| TC-12 | Pass | 16, 21 | `12-*`, `18-*` | durable file added |
| TC-13 | Pass | 12, 15 | session output, `12-dev-stack-run2.log` | — |
| TC-14 | Pass | 17, 22 | `14-*` | — |
| TC-15 | Pass | 18, 19 | `15-*` | gated suite stale on base, follow-up |
| TC-16 | Pass | 19 | `15-live-runtimes.json` | — |
| TC-17 | Pass | 10, 20 | `17-*` | two out-of-scope observations |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`. Reading a record that still holds an obsolete key, and ignoring it, is the approved general reader policy.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The key survives only under `app-data-migrations` (frozen released shapes).
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. The new history E2E proves the approved `Directly Usable — No Migration` outcome through the normal current reader.
- Reroute classification used: none.

## Changed Boundary And Evidence Matrix

| Scenario ID | Product Scenario / Behavior / REQ / AC | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | SCN-001, SCN-003 / BEH-001..005 / AC-001 | source, contracts | repository grep | Durable gate | Pass | ledger 2 |
| TC-10 | SCN-001 / BEH-003, BEH-004 / AC-001 | served GraphQL schema ↔ web documents and generated types | running built server over HTTP; web codegen | Live | Pass | `10-live-introspection.json`, `10-live-codegen.log`, `10-live-codegen-vs-committed.diff` |
| TC-09 | SCN-001, SCN-005 / BEH-001, BEH-006 / AC-002, AC-006 | bootstrap → definition → `SkillService` → backend factory → prompt; `read_file` | in-process E2E | Durable | Pass | `09-daily-assistant-catalog.log` |
| TC-11 | SCN-001 / BEH-001, BEH-003..005 / AC-002, AC-005 | GraphQL create / terminate / restore; websocket turns; records | running server, stub model | Live | Pass | `11-live-run-lifecycle-realistic.*`, `11-live-daily-assistant.json`, `11-stub-model-requests-summary.json` |
| TC-12 | SCN-002 / BEH-005 / REQ-003 / AC-004 | stored-key metadata, team tree, org tree → list, open, restore, continue | running server after restart; built-server E2E | Live + Durable | Pass | `12-*`, `18-stored-key-history-e2e.log` |
| TC-13 | SCN-005 / BEH-006 / AC-006, AC-007 | startup sync of built-in agents | real restart on an edited data root | Live | Pass | ledger 12, 15 |
| TC-14 | SCN-001, SCN-002 / BEH-003 | web client launch, history, restore, config editor, stop | browser on the dev stack | Browser | Pass | `14-browser-0{1..6}-*.png`, ledger 17, 22 |
| TC-15, TC-16 | SCN-001 / BEH-002 / AC-003 | Codex, Claude, AGY skill exposure | real runtimes through the running server | Live | Pass | `15-live-runtimes.json` |
| TC-17 | SCN-003 / BEH-004 / R-3 | application SDK launch | packed Brief Studio on the running server; integration tests | Live + Durable | Pass | `17-live-brief-studio-launch.json` |
| TC-02 | SCN-UPG / REQ-003 / R-1, AF-004, AF-015 | released migrations `20260814`, `20260824`, `20260901` | built server startup on released-shape data, branch vs base | Temporary | Pass | `03-upgrade-probe-*` |
| TC-04..TC-08 | all | whole repository suites | vitest / node test runners, branch vs base | Durable | Pass (no regression) | `04-*`, `06-*`, `07-*`, `08-*` |

## Additional Repository Coverage Execution

| Order | Command | Configuration | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts --no-watch` | built server at `1595b8b2c` | stored-key history through the served contract | Pass (1 of 1) | `18-stored-key-history-e2e.log` |
| 2 | `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 … vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "applies configured runtime skills\|creates a run, restores it"` on branch and base | live flags | none: fails at setup on both | Not counted | `15-live-codex-claude-skills{,-base}.log` |
| 3 | `pnpm exec tsc --noEmit -p tsconfig.json`, filtered to the two changed test files | — | no type error in the changed tests (only the repository-wide `TS6059` rootDir notice) | Pass | session output |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | Every AC has direct proof: AC-001 grep + served schema + codegen; AC-002 prompt received by the model for named skills, `ALL_INSTALLED` and no skills; AC-003 real Codex, Claude, AGY; AC-004 list/open/restore for three record kinds × two stored values; AC-005 written files; AC-006/007 fresh start and restart over edits | ACP runtime not run live |
| Changed-boundary execution directness | 85% | 96% | +11 | Each changed boundary was entered through its approved trigger on a running server | browser GraphQL bodies not captured; acceptance inferred from the server |
| Cross-boundary integration realism and mock gap | 72% | 95% | +23 | real web client ↔ real server ↔ real runtimes; bundled application ↔ real team run service | AutoByteus turns used a stub model endpoint (the prompt path is real) |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | +8 | documented dev stack with a built server; packed application; real CLIs | Nuxt dev frontend rather than the packaged app; stored-key records derived from current-written records, not from a released build |
| Failure, edge-case, lifecycle, and recovery evidence | 82% | 95% | +13 | restart, restore before and after restart, stored `NONE`, deleted built-in file, added `skills/` dir, released-data upgrade equal to base | upgrade warning/failure branches rest on base-equal behavior of the stale E2E plus unit tests |
| User-surface, browser, and desktop-shell confidence | 55% | 95% | +40 | four launch surfaces (chat entry, agent form, team form, org panel), history open and restore for three kinds, run config editor, stop; no page, console or socket errors | 400 px viewport only; desktop shell unchanged and not run |
| Durable regression coverage quality and relevance | 88% | 94% | +6 | two durable additions close the named gaps (`ALL_INSTALLED` → prompt; stored-key history through the server) | the upgrade, gated live-runtime and older history E2Es are stale on base and do not guard this change |

- Overall post-repository confidence: 79%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories (665 / 7 = 95.0)
- Confidence change produced by broader validation: +16
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: ACP not live; packaged desktop app not run; pre-existing stale E2E suites.

## Broader Validation Decision And Execution

- Decision and mode: `Required` — Live API, Browser, live runtimes, lifecycle, on the documented dev stack (`pnpm dev`).
- Material deviation: AC-003 through the running server instead of the gated repository suite (stale on base). Application launch added live.
- Gap addressed: client/server contract pairing, history through the server, real restart, runtime skill exposure, rendered journeys.
- Startup and readiness: `pnpm dev` from the worktree, six times (initial; restart over edited data; runtimes; two for the application; fresh root for the agent form). Each time `/rest/health` 200 and frontend 200. Data root `<worktree>/.autobyteus/development/server-data`, created and removed by this run.
- Environment choices: backend `127.0.0.1:8000`, frontend `127.0.0.1:3000` (both free beforehand); stub model on `127.0.0.1:18765` registered with `createCustomProvider`; Codex, Claude and AGY CLIs of this machine.
- Seed data: skills, agent / team / org definitions and runs created through GraphQL; stored-key records made by adding `skillAccessMode` to 25 record files the server had written (manifest saved), both values.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Served schema | no `skillAccess*` type or field; web documents validate; generated types match | 291 types, no match; codegen exit 0; diff = three scalar description comments only | `10-*` | Pass |
| Create → message → stop → restore → message, for agent, team, org | replies before and after restore; catalog in the received prompt; no field in responses, streams or files | 58 of 58 checks | `11-live-run-lifecycle-realistic.log` | Pass |
| Daily Assistant turn | catalog = enabled installed skills; disabled excluded; `read_file` offered | 83 entries equal to the enabled set; disabled one absent; `read_file` among 21 tools | `11-live-daily-assistant.json` | Pass |
| Restart over edited built-ins | files equal templates | identical for all three; `skills/` gone; deleted file recreated | ledger 15 | Pass |
| Stored-key history after restart | lists, opens, restores; stored `NONE` has no effect | 27 of 27 checks; catalog present for `NONE` runs | `12-live-stored-key-history.log` | Pass |
| Browser journeys (a)–(g) and agent form | replies rendered; histories open; no errors | as expected for every step | `14-*`, ledger 17, 22 | Pass |
| Codex, Claude, AGY with a configured skill | exact phrase from the skill; skill materialized | all three replied; `.codex/skills`, `.claude/skills`, capsule `.agents/skills` | `15-live-runtimes.json` | Pass |
| Brief Studio draft run | launch succeeds | binding `ATTACHED`, team run active | `17-live-brief-studio-launch.json` | Pass |

## Desktop Application Validation

- Approach: browser on the dev stack, as planned. No deviation.
- Web-equivalent behavior: all changed client behavior; evidence TC-10, TC-14.
- Shell-specific behavior: none changed; not run.
- Effect on any already-running desktop application: `None`. The user's app, `~/.autobyteus` and three isolated instances of other worktrees were not touched.
- Not directly proven: the packaged app bundle. Consequence: negligible for this change.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node v22; pnpm 10.28.2; Vitest 4.0.18.
- Browser: the team's automation tab (Chromium-based), 400 × 738, DPR 2.
- Runtimes: Codex App Server (`gpt-5.5`), Claude Agent SDK (`haiku`), Antigravity CLI (`gemini-3.6-flash-high`), AutoByteus (stub OpenAI-compatible model).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration` (agent metadata; team and org trees). `Discard or Rebuild` (Daily Assistant files).
- Existing data exercised: 11 agent metadata files, 7 team trees, 7 org trees holding the key (both values); AGY capsule manifest (unit test + a live manifest without the key); a released-shape data root (upgrade E2E seed) with `PRELOADED_ONLY` and `NONE`.
- Direct-use result: all list, open and restore; the value is ignored (catalog present for stored `NONE`). Agent metadata drops the key on its next save. Team and org tree files keep the key after restore and a turn, because those operations do not rewrite the tree; this matches the design ("old files keep the extra key until their next ordinary save").
- Discard/rebuild result: edited and extra Daily Assistant files are replaced; a deleted file is recreated.
- Released migrations: all 22 statuses, every file after startup and after restore, and every API result are identical on branch and base for the same seed.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: records written by an actual released build were not used (see Not Tested in the investigation).

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` — "catalogs every enabled installed skill for the built-in Daily Assistant and lets it read a cataloged SKILL.md" | Updated (one `it` added, two imports) | AC-002, AC-006 | Pass | uses the file's existing harness |
| `autobyteus-server-ts/tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts` | Added | AC-001, AC-004 | Pass | built-server harness; needs `dist/` like its neighbours. Its `withStoredMode` helper repeats about 15 lines of the unit test `removed-skill-access-mode-record-tolerance.test.ts`; I left the implementer's file untouched. |

## Tests Removed As Stale Or Obsolete

None by this round.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: the two paths above (uncommitted in the worktree).
- Paths removed: none.
- Added or updated paths attached for proportional test-code review: `Yes`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/` (2.4 MB, 57 entries) | logs, JSON results, screenshots | Retained | large JSON reports are gzipped |
| `api-e2e-evidence/probes/` | the probe scripts used for TC-02 and TC-10..TC-17 | Retained | not part of the test suite |
| `api-e2e-evidence/04-server-full-comparison.txt` | per-test base/branch comparison | Retained | |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `zz-rsam-upgrade-probe.e2e.test.ts` generated in both worktrees | upgrade outcome, branch vs base | `03-*` | deleted after each run |
| base worktree `/private/tmp/rsam-api-e2e-base` | per-test comparison | `02-*`, `04-*`, `07-*-base`, `08-*-base`, `15-*-base` | removed and pruned |
| stub OpenAI-compatible server | deterministic turns, prompt capture | `11-stub-model-requests-summary.json` | stopped |
| live scripts `live-{a,b,c,d,daily,app}.mjs`, `store-old-key.mjs` | live cases | `11-*`, `12-*`, `15-*`, `17-*` | archived under `probes/`; `/tmp/rsam-probe` removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| LLM provider for AutoByteus runs | local OpenAI-compatible stub through the product's custom-provider feature | no provider credentials in the dev vault; replies need to be deterministic | model behavior is not exercised; prompt construction, tools and streaming are real |
| — | Codex, Claude, AGY were real | — | — |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | TC-01..TC-17 | all acceptance criteria proven; no regression against base |
| Not Tested | ACP live; packaged desktop; items listed in the investigation | low risk, reasons recorded |
| Out Of Scope | stale E2E suites on base | follow-up candidates below |

## Cleanup Performed

| Resource | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| dev stack processes (6 starts), stub server | this run | SIGINT / kill | ports 8000, 3000, 18765 free |
| `<worktree>/.autobyteus` | this run | removed | gone |
| `/private/tmp/rsam-api-e2e-base` | this run | `git worktree remove --force`, `prune` | gone |
| `/tmp/rsam-probe`, setup log | this run | removed | gone |
| two browser tabs | this run | closed | closed |
| `autobyteus-web/generated/graphql.ts` | tracked file changed by my codegen check | `git checkout --` | restored |
| Codex / Claude / AGY sessions from five live runtime runs | created by this run inside the user's CLI session stores | left in place | disclosed |
| four orphaned vitest processes (started 08:13–09:09), one `vitest --outputFile=/tmp/rsam-base-vitest.json` pair, three isolated app instances | not this run | none | untouched; two of the vitest workers sit at about 100% CPU |

## Out-Of-Scope Observations (no action in this ticket)

1. `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`: three tests fail on base because migration `20260901_agent_org_flat_team_families_v1` moves the converted package to `agent_orgs/` and two later migrations were registered; the assertions predate that.
2. `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` with live flags: fails at setup on base (`Studio application API services are not configured`).
3. `tests/e2e/run-history/*` (16 of 19) and `hierarchical-team-run-config-graphql` (7 of 10) fail on base.
4. Restoring a standalone AutoByteus run that never received a message fails with `Explicit WorkingContext restore requires a strict v5 snapshot`. Not reachable from the client as far as I could see; not checked on base.
5. A freshly imported application package stays `QUARANTINED` until the server restarts; re-importing an imported package puts it back into that state. Not checked on base.
6. `read_file` is already part of the AutoByteus native tool baseline for an agent whose `toolNames` is empty (the existing E2E asserts this), so the template change matters for the definition and for other runtimes rather than for the AutoByteus tool set.
7. Code review point 1 stands: the design's persisted-data list does not name the AGY capsule manifest.

## Preliminary Classification

`N/A` — Pass.

## Recommended Recipient

`/code_reviewer` for proportional test-code review (from `get_handoff_rules`).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (live API, browser, live runtimes, lifecycle)
- Critical acceptance criteria lacking direct proof: none
- Next recipient from `get_handoff_rules`: see "Recommended Recipient"
- Notes: two durable test changes are uncommitted in the worktree, as are the ticket documents.
