# API/E2E Execution Coverage Report — autobyteus-331 (Work Journal: neutral vocabulary)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route, `Medium` + `Low`)
- Prior round reviewed: `N/A`
- Deviations from the plan: API-05 changed from `CALL_TOOL` turns to the scripted case `mcp_calls`, because a `CALL_TOOL` turn of the `linked_skills` case records only the reply text, not a tool call (no converter is reached). API-06/07 (live Claude and Codex through the repository's gated suite) were added after the post-repository score came out at 93–94% to close the real-record gap. The planned reuse of IMP-01/02 stayed; the full unit suite was not rerun (no server file changed since `32cb0034e4`).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary/tickets/in-progress/work-journal-neutral-vocabulary/evidence/` (files start with `API-`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `40fb8233d5` source; tests of `fe29990e84` (no server `src` change between the two) | macOS Darwin 25.5.0, Apple silicon, Node 22 via pnpm | vitest from source; real `WorkJournalService`, real `MemorySearch` pipeline, real GraphQL schema; deterministic stand-in embedding model; test-owned temp memory root | `env -i`, throwaway HOME, synthetic raw traces (contract §11) |
| ENV-2 | same | same | real server (`startStudioE2eRuntimeServer`), real AGY runtime adapter, scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (case `mcp_calls` / `auto_compaction`) | `RUN_AGY_FAILURE_E2E=1`, throwaway HOME, test-owned data dir |
| ENV-3 | same | same | real server with the signed-in `claude` and `codex` CLIs (live, small task) | `RUN_CLAUDE_E2E=1` / `RUN_CODEX_E2E=1`, real HOME/USER/LOGNAME as TESTING.md requires, test-owned data dir; the runs add sessions to the CLIs' own history |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…012 | unit + server E2E: journal rendering, service, memory search, memory GraphQL | `pnpm -C autobyteus-server-ts exec vitest run tests/agent-work-journal tests/unit/memory-search tests/e2e/memory --no-watch` (env -i) | ENV-1 | Pass | `API-01-journal-memory-suites.log` | `Test Files  25 passed \| 2 skipped (27)`, `Tests  236 passed \| 5 skipped (241)` | Existing tests are Still Valid; includes the new E2E file. The 2 skipped files are the gated live suites (run as API-04…07) |
| API-02 | AC-001…006, 010, 012 | real service + pipeline over raw-trace files of five runtimes, read through the Memory page reader and `memorySearch` GraphQL | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts --no-watch --reporter=verbose` (env -i) | ENV-1 | Pass | `API-02-03-neutral-vocabulary-e2e.log`, `API-02-entry-heads/{claude,codex,antigravity,grok,autobyteus}-entry-heads.txt`, `API-02-03-mutation-checks.md` | build cases ✓; in `codex-entry-heads.txt`: `Load skill: python-style → ok`, `Message to /nobody → failed: No agent matches that recipient.`; only `Tool:` heads left are user-installed/unknown tools or `(via <server>)` | Every `expected` head of the contract's synthetic trace (25–30 per runtime) is found in the journal read back; no converted tool name; no `{"accepted"`; search finds `Spawn sub-agent …` / `Load skill code-review` by the neutral words. Mutations C and D fail these cases |
| API-03 | AC-008, AC-009, REQ-007 (no repeat), SCN-A1…A3 | real pipeline: update from an earlier revision, restart, Rebuild | same file, cases under "an update" | ENV-1 | Pass | `API-02-03-neutral-vocabulary-e2e.log`, `API-02-03-mutation-checks.md` | `✓ the first catch-up pass replaces every journal in place, leaves the raw traces untouched; a second start renders nothing`; `✓ Rebuild regenerates a closed file whose manifest already has the current revision; Index now leaves it` | Earlier node = manifests at revision 1, old wording, fingerprint without the renderer part. After catch-up: manifest revision 2, new wording, only `work_journal_active.md` + manifest in the folder, raw traces byte-identical (sha256), second start leaves journal mtimes unchanged. Mutations A and B fail these cases |
| API-04 | preserved behavior; AC-008 on a real runtime path | scripted AGY, real server, rotation and rebuild on restore | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts --no-watch` | ENV-2 | Pass (after a baseline test fix) | `API-04-scripted-agy-restore-transport.log` | header line `# FIRST RUN (before fix) failed: … received "Runtime Antigravity CLI · file active (open)"`; then `Tests  1 passed (1)` | The first run failed at the suite's header assertion: it expected `Runtime Antigravity ·`, the header reads `Runtime Antigravity CLI ·`. Cause: the label comes from `agentRuntimeName` since autobyteus-320 (`2b53fd8ad3`); the renderer header is unchanged by this ticket (DEC-006). A stale assertion in a gated test, not a product defect; fixed in commit `1706b45870` as a baseline fix (TESTING.md Rule 9) |
| API-05 | AC-001, AC-004, AC-006 on a real runtime path | scripted AGY with AGY 1.2.14 `call_mcp_tool` steps, real server, real renderer | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs WORK_JOURNAL_E2E_EVIDENCE_DIR=<evidence>/API-05-scripted-agy pnpm exec vitest run tests/e2e/runtime/work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-05-scripted-agy-neutral.log`, `API-05-scripted-agy/antigravity-scripted-journal.md`, `API-05-scripted-agy/antigravity-scripted-raw-tool-records.jsonl` | `Delegate task to /researcher → ok`; `Message to (recipient not recorded) → delivered`; `Browser: open about:blank → failed: BROWSER-PROBE: navigation failed`; `Tool: open_tab (via shape-test) url="about:blank" reuse_existing=false → ok`; raw file still holds `delegate_task` | Platform tools neutral on a real adapter path; a platform-named tool of another server stays a `Tool: … (via …)` line. Observation: a message with no recorded recipient prints `Message to (recipient not recorded)` (a design fallback; see Latest Result notes) |
| API-06 | preserved built-in lines on real records; revision 2 on a real run | live Claude through the gated suite | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1 WORK_JOURNAL_E2E_EVIDENCE_DIR=<evidence>/API-06-live-claude pnpm exec vitest run tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-06-live-claude.log`, `API-06-live-claude/claude/work_journal/work_journal_active.md`, `…/summary.json` | `✓ Claude: journal current; /compact closes a journal file written once`; `Command: ls → ok`, `Write file: … → ok`, `Edit file: … (+1 −1) → ok` | The task is built-ins only (command, read, write, edit); it proves the changed `commandLine` and lookup chain on real Claude records and the closed file after `/compact`. The model's plain `cat -n` read of notes.txt stays a `Command:` (not a skill) |
| API-07 | same, Codex | live Codex | same with `RUN_CODEX_E2E=1`, evidence `API-07-live-codex` | ENV-3 | Pass | `API-07-live-codex.log`, `API-07-live-codex/codex/work_journal/work_journal_active.md` | `✓ Codex: journal current after the turn`; `Command: cat notes.txt (in …) → ok` | same limits |
| API-08 | type correctness of the new tests | `tsc -p tsconfig.json --noEmit` filtered to the new and changed test files | see log | ENV-1 | Pass | `API-08-test-files-typecheck.log` | no error line for the three test files | The production typecheck is reused as IMP-01 |
| IMP-01 (reused) | all | `pnpm -C autobyteus-server-ts typecheck` | see handoff row IMP-01 | — | Pass (reused) | handoff row IMP-01 | `EXIT 0` | Ran on `32cb0034e4`; `git diff --name-only 32cb0034e4 HEAD -- autobyteus-server-ts autobyteus-ts` lists no production or shared file (only the tests I added/fixed came later), so it still holds. Header has command, commit, date |
| IMP-02 (reused) | all | full server unit suite | see handoff row IMP-02 | — | Pass (reused) | handoff row IMP-02 | `Test Files  877 passed \| 5 skipped (882)`, `Tests  7438 passed \| 9 skipped (7447)` | Same reason; the new tests are E2E files outside `test:unit` |
| IMP-04 (reused) | AC-007…010, AC-013 | shadow render on an isolated copy of the node's memory | see handoff row IMP-04 / `evidence/IMP-04-shadow-render-report.md` | — | Pass (reused; gate-2 finding open) | `IMP-04-shadow-render-report.md` | `6,171` files changed (82.0%), `Entries 647,649 before and after`, gate 1 `31 of 31` | I reviewed the report; I did not repeat it (TESTING.md: no conversion on real data or a copy; the design required it once). It is the evidence for the recorded real shapes of all runtimes and for AC-013 |
| API-09 | AC-001…003 on live AutoByteus-native, Antigravity (host login), Grok | live runtimes | not run | — | Not Tested | — | — | Credits / local compute / host `agy` history; see Not Tested below |
| API-10 | contract §9.5 reading test | an agent on another runtime reads a rendered journal | not run | — | Not Tested | — | — | needs a model and a human judgment of comprehension |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 platform tools neutral on every runtime | Yes | API-02 (all five runtimes through the pipeline), API-05 (real AGY adapter), API-01 (`platform-tool-converters`, `platform-completeness`) | Proven | — |
| AC-002 runtime-only tools | Yes | API-02 (group-4 heads per runtime), API-01 (`runtime-translations`) | Proven | — |
| AC-003 skill load incl. negatives | Yes | API-02 (skill heads on four runtimes; mutation C), API-01 (`skill-load` 37 cases incl. negatives) | Proven | — |
| AC-004 `delivered` / `failed: <msg>` | Yes | API-02 (`Message to /nobody → failed: …` on all five runtimes; mutation D), API-05 (`delivered`), API-01 | Proven | — |
| AC-005 history names | No | API-01 (`platform-tool-converters`, `neutral-vocabulary`) | Proven (unit level; no pipeline case) | — |
| AC-006 qualified names | Yes | API-02, API-05 (`Tool: open_tab (via shape-test)`), API-01 (`tool-call-line`) | Proven | — |
| AC-007 unchanged lines byte-identical | Yes | API-01 (`unchanged-lines` golden of the base output), IMP-04 (1,356 of 7,527 files byte-identical, 0 entry-count mismatches), API-06/07 (real built-in lines) | Proven | — |
| AC-008 first catch-up pass regenerates | Yes | API-03 (mutation B), API-01 (service + pipeline tests) | Proven | — |
| AC-009 Rebuild regenerates | Yes | API-03 (mutation A) | Proven | — |
| AC-010 consumers read regenerated journals | Yes | API-02 (Memory-page reader, `memorySearch` through GraphQL), API-01 (`memory-search-index-units`) | Proven | — |
| AC-011 completeness test | No | API-01 (`platform-completeness`: reads the real registry; allow-list empty) | Proven | — |
| AC-012 neutrality across runtimes | Yes | API-02 (same job, same words, five runtimes), API-01 (`neutral-vocabulary`) | Proven | — |
| AC-013 measured cost report | Yes | IMP-04 (reused, reviewed) | Proven (by the implementation's measurement; gate 2 lower by 1 of 31 is open for the Solution Designer) | — |
| AC-014 module doc | No | — | Not Proven here: delivery's docs sync (REQ-014) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 95% | all critical AC proven by ≥2 independent cases; mutations A–D each fail the matching case | AC-013's gate-2 result is a judgment for the owner; FU-003 (old native results print `ok`) is accepted-by-design | Designer decision on FU-003 / gate 2 |
| Changed-boundary execution directness | 95% | 95% | API-02/03 run the changed code (renderer, service, Journals step, pipeline, Rebuild) with no mock of any of them | embedding model is a stand-in (not changed by this ticket) | — |
| Cross-boundary integration realism and mock gap | 91% | 94% | real pipeline + GraphQL + server; AGY adapter on AGY 1.2.14 step shapes (API-05); live Claude and Codex records (API-06/07); real-data shape evidence IMP-04 | platform-tool and skill calls were not recorded by a live Claude/Codex/native run; native live and Grok live not run | A live platform-tool + skill run per runtime (model-driven, credits) |
| Environment, configuration, identity, and fixture fidelity | 92% | 94% | synthetic traces from contract §11 shaped after measured real data; isolated roots, `env -i`, throwaway HOME | synthetic traces cannot show shapes never seen (FU-003 and two Antigravity `Bash` calls with only `display` were found only by IMP-04's real data) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 95% | refusal, failed tool, old-revision node, restart idempotence, Rebuild of a current-revision closed file, rotation + rebuild on restore (API-04), `/compact` live | concurrent live update during regeneration is the existing pipeline behavior, not re-tested | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change; the Memory page component and its Rebuild button are untouched; their server side is exercised through the same GraphQL and reader functions | a rendered Memory page was not looked at (text in an untouched component) | — |
| Durable regression coverage quality and relevance | 94% | 95% | two new durable files; mutation-checked; gated scripted file skips without its gate; fixed a stale gated test | the live suites stay gated | — |

- Overall post-repository confidence: 93.3%
- Overall final confidence: 94.7%
- Calculation method: simple average of the applicable categories (six): (95+95+94+94+95+95)/6
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.7%, 0.3 points under). The gap is the bounded real-runtime uncertainty named above; the targeted surface for it (live Claude and Codex, API-06/07) was run and raised the score from 93.3%; the remaining step needs a model-driven platform-tool/skill live run per runtime, which I judge disproportionate (credits, model-dependent outcome) given IMP-04's check against 7,527 real journals
- Confidence-limiting residual risks: (1) platform tools and skill loads not seen live on Claude, Codex, native AutoByteus and Grok (mitigated by the shadow render over real recorded shapes of all of them); (2) FU-003: 5,782 older native message results print `→ ok`, not `→ delivered` (design decision pending); (3) gate 2 of the evaluation 26→25 of 31, MRR 0.625→0.616 on the shadow render (owner decision); (4) `Message to (recipient not recorded)` for a message call that records no recipient

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond what ran
- Execution mode: `Other` (the lifecycle and live runs above were the broader validation)
- Confidence gap it addresses: real runtime records; the live Claude/Codex and scripted AGY runs closed 2.5 points of it.
- Browser validation needed: No. No UI change; text is shown by an untouched component through the same reader the E2E uses. An isolated desktop instance would add only a view of that text.
- Cases that already exercise the real changed boundary: API-02, API-03 (real service + pipeline), API-04/05 (real server and runtime adapter), API-06/07 (real runtimes).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Discard or Rebuild`
- Representative existing data used: a synthetic node with manifests at revision 1, old wording, and the earlier fingerprint format (API-03); IMP-04's copy of 3,734 real runs (reviewed, reused)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving it: API-03 (catch-up replacement in place, raw traces byte-identical, no extra files, second start writes nothing; Rebuild of a current-revision closed file), IMP-04
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No` (reading `ensureCurrent`, `reconcile`, `rawTraceFingerprint`: one revision constant; history-name rows are current rendering of recorded data)
- Residual untested persisted-data risk: the real node's 1.79 GB is not touched by me; IMP-04 measured the scale on a copy

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used / recipient notified: `N/A`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts` | Added (5 tests) | API-02, API-03 | — |
| `autobyteus-server-ts/tests/e2e/runtime/work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts` | Added (1 gated test) | API-05 | — |
| `autobyteus-server-ts/tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts` | Updated (one assertion: header label `Antigravity CLI`) | API-04 | — (baseline fix, commit `1706b45870`) |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: no removals

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Embedding model | `createFakeEmbeddingIndex` (deterministic stand-in, the repository's own) | model download and CPU cost; not changed by this ticket | meaning-search ranking is not exercised (gate 2 came from IMP-04 with the real model) |
| Run discovery metadata | stubbed `readMetadata` returning the runtime kind, as the existing memory E2E does | the metadata store needs a running run history | runtime kind is the one input the journal needs; the real store is not part of this change |
| AGY CLI | scripted `agy-failure-cli.mjs` (case `mcp_calls`) | no paid model; deterministic | step shapes follow AGY 1.2.14, not a live AGY |
| Raw traces of Grok / native / Codex / Claude platform tools | synthetic (contract §11) | TESTING.md: never copy real records into a test | shapes verified against real data by IMP-04 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Source mutations A–D | Yes | `git checkout` of each file right after its run | `git status --short -- src` clean |
| Temp memory roots, server data dirs, throwaway HOMEs | Yes | removed by the tests / by me | none left (checked `ps` for vitest: none after the runs) |
| Live Claude/Codex sessions | Yes (created by the suite) | the suite terminates its runs and removes its data dir; the CLIs' own history keeps the sessions (TESTING.md notes this) | recorded here |
| Raw trace copies in the live evidence | Yes | removed from `API-06-live-claude`/`API-07-live-codex` (journals, manifests and summary kept) | done |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-014 (delivery's docs sync). Contract §9.5 reading test (needs a model and a reader's judgment) is `Not Tested`; delivery may take it to the user.
- Next recipient: Delivery (direct route; `get_handoff_rules`)
- Notes for the Solution Designer / delivery: (1) FU-003 and gate 2 are still open, as the implementation handoff said; I found nothing that changes them. (2) `Message to (recipient not recorded) → delivered` appears for a platform `send_message_to` call recorded with no recipient (AGY `mcp_calls` step 6); it is true and rare, say so if the wording should be different. (3) The baseline fix in `work-journal-restore-transport.e2e.test.ts` is outside this ticket's behavior; it is its own commit. (4) Evidence caveat: IMP-04 ran with the implementation's `32cb0034e4`; no production file changed after it.
