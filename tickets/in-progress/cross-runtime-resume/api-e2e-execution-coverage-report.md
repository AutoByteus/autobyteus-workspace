# API/E2E Execution Coverage Report — autobyteus-316 (cross-runtime-resume)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after source review CRR-001 (Pass)
- Prior round reviewed: `N/A`
- Deviations from the plan: API-02 was split into the three cases RS-01…RS-03 of one file (planned API-02/03/04) after the first run; the settings case RS-02 was moved to a native-origin run switched to Antigravity because a native model-only edit hits the base's native-replacement rule (observation OBS-1); the existing 331 journal E2E needed a one-line update (API-07); API-08 (live) was run, not only cited.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/evidence/api-e2e/` (commit named in the handoff message)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed` (ARCH-REV-002, CRR-001)
- Successful-output route: not reached (`Fail`: failure-origin review)
- Proportional test-code review decision: `Required` (on the next `Pass`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `60c3ac4ec8` (production code unchanged since `3521ae05f1`; my tests at `b74f47c01d`) | macOS Darwin 25.5.0, Apple silicon, Node 22 via pnpm | vitest from source (unit, in-process E2E) | `env -i`, throwaway HOME, synthesized temp roots |
| ENV-2 | same | same | **built server** `autobyteus-server-ts/dist/app.js` (`pnpm -C autobyteus-server-ts build`, exit 0, at `60c3ac4ec8`) as a child process | `--data-dir` temp root, private HOME and sqlite database, ephemeral port; **native runtime on a test-owned LM Studio stand-in** (`LMSTUDIO_HOSTS`, model list + streamed chat completions; real native agent, memory recording and prompt); **Antigravity = the scripted CLI** `tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`, `AGY_FAKE_EXTRA_MODELS=rs-alt-model`) |
| ENV-3 | same | same | in-process server with the signed-in `claude` and `codex` CLIs and the scripted AGY (`auto_compaction`) | `RUN_RUNTIME_SWITCH_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1`, real HOME/USER/LOGNAME; models `claude-haiku-4-5-20251001`, `gpt-5.6-luna`; sessions land in the CLIs' own history |
| ENV-4 | same | same | built server for codegen only | throwaway data root; `BACKEND_GRAPHQL_BASE_URL` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…009 | unit suites of the changed parts | `env -i … pnpm exec vitest run tests/agent-work-journal tests/unit/runtime-handover-notices tests/unit/agent-memory tests/unit/standalone-agent-run-root tests/unit/run-history tests/unit/agent-execution/services tests/unit/memory-search tests/unit/api/graphql/types/agent-run.test.ts tests/architecture --no-watch` | ENV-1 | Pass | `API-01-focused-unit.log` | `Test Files  107 passed \| 1 skipped (108)`, `Tests  785 passed \| 2 skipped (787)` | Reused from the implementer: clean-clone typecheck (exit 0), full server unit (890 files / 7582 tests), web full (670 files / 4871 tests) in `evidence/implementation/clean-*.txt`; `git diff --name-only 3521ae05f1 HEAD -- autobyteus-server-ts autobyteus-web autobyteus-ts` is empty, so they still hold |
| API-02 (RS-01) | AC-002, REQ-010, REQ-011, BEH-005, I-3, I-5, I-7, I-8 | **built server**, scripted native model + scripted AGY: native → AGY → native on one run | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs RUNTIME_SWITCH_NATIVE_EVIDENCE_DIR=<evidence>/rs01 pnpm exec vitest run tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts --no-watch --reporter=verbose` | ENV-2 | **Fail** | `API-02-03-04-built-server-switch.log`, `rs01/runtime-switch-native/{raw_traces_000001,raw_traces_000002,raw_traces_active}.jsonl.types.txt`, `…/raw_traces_manifest.json`, `…/chat-projection.json`, `…/markers.json`, `…/work_journal/` | `AssertionError: I-7: segment 2 = Antigravity records: expected [ …(6) ] to deeply equal [ …(5) ]`; `I-7: the prepared native candidate wrote no record before the marker`; `the native agent's own system instruction is recorded in its file: expected 0 to be greater than 0`; `the reopened chat keeps the earlier conversation`; `...and shows the first marker`. In `raw_traces_000002.jsonl.types.txt` the last line is `… system_instruction  ## Agent Identity - Name: rs-native …`, 11 ms before the marker | **Native → Antigravity passes everything** (segment 1 = exactly the native records `[system_instruction, user, assistant]` — all of them the native agent's own, so I-7 holds; marker first, key per switch, notice then user's text in the AGY input, once, chat marker on the live WebSocket). **Antigravity → native fails I-7**: see F-1. **Reopened chat** fails: see F-2. Everything else in the case passes: marker first in the new file (the native record order is marker, notice, user, assistant), one marker per switch, manifest `[autobyteus, antigravity_cli]` with boundary type `runtime_switch`, journal manifest runtimes `[autobyteus, antigravity_cli, autobyteus]`, the native request body carries the notice before the user's text |
| API-03 (RS-02) | AC-001, REQ-001, REQ-013 | built server: settings of a stopped run | same file, case RS-02 | ENV-2 | Pass | `API-02-03-04-built-server-switch.log` (`✓ RS-02 …`) | `✓ RS-02: settings of a stopped run: running refused, save a switch, undo it, switch again, model-only edit keeps the switch, first message makes it` | A running run is refused and the refused save writes nothing; save a switch → `pendingRuntimeSwitch.from` names the native binding, session binding dropped, no raw trace changed, nothing archived; undo → metadata equals the original byte for byte (the original session ID returns, the field is cleared); switch again; model-only edit (AGY model → another AGY model) keeps the pending switch (`requestedAt` and `from` unchanged); first message: marker, segment 1 = the native agent's records, notice before the user's text in the AGY input, field removed from metadata; second message: no notice, one marker |
| API-04 (RS-03) | design Change Scope; REQ-001, REQ-013 | built server: host with a delegated copy | same file, case RS-03 | ENV-2 | Pass | same | `✓ RS-03: a host with a delegated copy saves its own runtime and the copy's model in one Save; the copy keeps its runtime and cannot switch` | The scripted AGY host delegates a real task; the copy is stopped; `updateStoppedAgentRunSelection` on the copy is refused and its `run_metadata.json` is byte-identical; after the host is stopped one `updateDelegatedLaunchSelections` carries the host's own runtime (`CONFIGURED_AGENT` `/` with `runtimeKind: autobyteus`) and the copy's model: `UPDATED`, host metadata has the pending switch, the copy keeps `antigravity_cli`, the stored tree records the copy's model; the host's first message makes the switch with the copy still registered |
| API-05 | AC-006, REQ-012 | never-switched runs with archived segments: base commit vs this branch; durable test | probe on a detached worktree of `a8d7c8756494` and on this branch, then `env -i … pnpm exec vitest run tests/agent-work-journal/services/work-journal-unswitched-identity.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass (with a measured corner, C-6) | `API-05-journal-identity-base-vs-new.txt`, `API-05-unswitched-identity-test.log` | `claude-value  3/3 byte-identical` (all five runtimes `…-value 3/3`); test: `Tests  6 passed (6)` | Five runtimes × two archived segments + open file, each segment recording the run's own `RuntimeKind` value: **byte-identical to the base commit's output (15 of 15 files)**. When a segment records `null` or an unconverted old label, the two archived files change (`Runtime unknown`, generic `Tool:` lines) and only the open file stays (1/3): the corner the review flagged (C-6); the 343 migration converted 825 of 825 real manifests and `null` was never seen, so it matters only for a manifest the migration excluded. The durable test also covers a journal manifest written by the previous release (run-level runtime, no per-file runtime): read once, no journal text changes, evidence hash unchanged (nothing re-indexed), run-level field gone. Mutation (archived segments rendered with no runtime) fails all 6 |
| API-06 | engineering contract | regenerate `autobyteus-web/generated/graphql.ts` against the built server | `BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:<port>/graphql NUXT_PUBLIC_GRAPHQL_BASE_URL= pnpm -C autobyteus-web codegen`; web specs `pnpm exec vitest run stores/__tests__/existingRunConfigStore.spec.ts services/runConfigEditing components/run-settings` | ENV-4 | Pass (drift fixed and committed) | `API-06-codegen-diff.txt`, `API-06-web-specs.log` | `+      runtimeKind` in `canonicalSelection {`; `- * __useUpdateStoppedAgentRunModelConfigMutation__` → `+ * __useUpdateStoppedAgentRunSelectionMutation__`; `Test Files  12 passed (12)`, `Tests  87 passed (87)` | Commit `ba0f2104d6`. Two real differences: the hand-edited generated document lacked `runtimeKind` in `canonicalSelection` (the client sends its own document from `graphql/mutations/runHistoryMutations.ts`, which has it, so the stale generated copy was not executed) and the old name in the doc comment. Codegen also removed three scalar description comment lines (`DateTime`, `JSON`, `SafeInt`); the server source still has the description, so this is the tool environment's introspection, not this ticket — committed as the tool produced it |
| API-07 | AC-007 preserved | existing server E2E suites, updated and neighbouring | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/run-history tests/e2e/memory tests/e2e/runtime/autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch` | ENV-1 | Pass after one stale-assertion fix | `API-07-updated-e2e-suites.log` (first run), `API-07-journal-e2e-after-update.log` | first run: `Test Files  1 failed \| 16 passed \| 1 skipped (18)`; `× build: every runtime's converted cases read …` (`work-journal-neutral-vocabulary.e2e.test.ts:145`); after: `Tests  5 passed (5)` | The failing assertion is mine (autobyteus-331): it expected `runtime_kind` at the top of `work_journal_manifest.json`. Cause: the approved design removes the run-level field and puts the runtime on each file entry (design-spec "Design response"; contract DS-003). Stale test, not a product defect; updated to the per-file form, commit `ea0f3400dc`. The delegated-copy suite (6 tests, scripted AGY) and the stopped-run suites pass with the renamed contract |
| API-08 | AC-008 | live Claude → Codex → scripted AGY, real CLIs | `env -i … RUN_RUNTIME_SWITCH_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 AGY_FAKE_CASE=auto_compaction ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs RUNTIME_SWITCH_E2E_EVIDENCE_DIR=<evidence>/API-08-live pnpm exec vitest run tests/e2e/runtime/runtime-switch-live.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-08-live-runtime-switch.log`, `API-08-live/runtime-switch-live/{summary.json,raw_traces_manifest.json,work_journal/}` | `✓ Claude Agent SDK, then Codex App Server, then a scripted Antigravity CLI: one run, one chat  20775ms`; summary segments `[claude_agent_sdk, 15 records]`, `[codex_app_server, 10]` | Same pass as the implementer's, repeated on this commit; I-7 holds on both switches, the Codex agent opened the journal files it was told about |
| OBS-1 | REQ-001 ("fresh selection") | built server: model-only edit while a switch TO the native runtime is pending | probe (not kept) `…zz-observe-pending-native.probe.test.ts` | ENV-2 | Observation (not scored as a failure) | `OBS-1-pending-native-model-edit.log` | `OBS-1 model-only edit (native A -> native B) with the switch pending: {"success":false,"outcome":"VALIDATION_FAILED",… "Both models need verified context capacities before replacement."` | `stopped-run-selection-context.ts:16` gives the validator a `currentModelIdentifier` whenever the chosen runtime equals the stored one; with a switch pending the stored model is the never-started candidate, so a native → native model edit goes through the base's replacement rule (both capacities must be verified, target ≥ current). The LM Studio stand-in's models are not "verified" in the capacity service, so the rule rejects here; I could not show the smaller-capacity rejection on a verified model. REQ-001 says the pair is validated as a fresh selection. For an Antigravity target there is no such rule and RS-02 passes |
| API-09 | rendered UI | Settings page, chat marker in a browser/desktop | not run | — | Not Tested | — | — | not requested; web specs cover the component and store (API-06 subset 87 tests; implementer's 4871) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 save, undo, member/delegated rejected | Yes | API-03 (RS-02), API-04 (RS-03), API-08, API-01 | Proven | — |
| AC-002 first input: archive, marker first, notice before the user's text, once, chat shows the marker | Yes | API-08 (Claude → Codex → AGY), API-02 first half (native → AGY), API-03 (RS-02), API-01 | **Not Proven** for a switch to the native runtime (F-1: the previous agent's archive holds the candidate's `system_instruction`, I-7) and for the chat after a reload (F-2) | — |
| AC-004 notice names the latest journal and lists the earlier ones | Yes | API-02 (`markers.json`: `work_journal_active.md` named as the place to start, `…000001.md`, `…000002.md` listed), API-01 | Proven | — |
| AC-006 per-file runtime; never-switched runs unchanged | Yes | API-05 (15/15 byte-identical to the base; durable test), API-02/API-08 (journal manifests `[autobyteus, antigravity_cli, autobyteus]`, `[claude_agent_sdk, codex_app_server, antigravity_cli]`) | Proven (corner C-6 measured) | — |
| AC-007 same-runtime restore, model-only edit unchanged | Yes | API-07, API-03 | Proven | — |
| AC-008 real run on isolated data | Yes | API-08 | Proven | — |
| AC-009 crash between marker and commit; retry | No | API-01 (recorder and lifecycle suites: failure at each step, retry) | Proven at unit level (a process crash is not supported by the design) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 70% | API-03/04/05/08; AC-002 fails for the native target and after a reload | F-1, F-2 | fixes + rerun of RS-01 |
| Changed-boundary execution directness | 90% | 92% | built server runs the changed activation, recorder, notice, metadata commit, journals | — | — |
| Cross-boundary integration realism and mock gap | 85% | 90% | built server, real native agent over a scripted model endpoint, real AGY adapter on a scripted CLI, live Claude/Codex | the native runtime on a real provider was not run | live native switch |
| Environment, configuration, identity, and fixture fidelity | 88% | 88% | isolated roots, `env -i`; LM Studio stand-in is a stand-in (capacities unverified, OBS-1) | | verified-capacity native models |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 85% | refused running save, undo, pending + model edit, delegated copy refused, previous-release journal manifest; crash/retry at unit level | | — |
| User-surface, browser, and desktop-shell confidence | 70% | 70% | reopened chat read through the same projection the app hydrates from (fails F-2); no rendered UI | | a browser run of the Settings page and chat after the fixes |
| Durable regression coverage quality and relevance | 90% | 92% | two new durable files, strict assertions that fail on the defects, mutation-checked identity test | RS-01 stays red until fixed | — |

- Overall post-repository confidence: 86.9%
- Overall final confidence: 83.9%
- Calculation method: simple average of the seven applicable categories, post (80+90+85+88+85+70+90)/7, final (70+92+90+88+85+70+92)/7
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-002)
- Any final applicable category below `90%`: `Yes` — requirement proof 70%, environment 88%, failure/recovery 85%, user surface 70%
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1, F-2, OBS-1, C-6 corner, the native runtime on a real provider not run, rendered UI not run

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (built-server stop, switch, restore, activate), `Live API` (Claude, Codex)
- Confidence gap it addresses: the native pair and the settings flow had no executable proof; the first run found F-1 and F-2
- Browser validation needed: Yes, after the fixes (the chat history on reload is a user-visible behavior); not run now
- Cases: API-02…API-04, API-08

## Desktop Application Validation

Not run. The reopened chat was read through GraphQL `getRunProjection`, the query the web app hydrates a run from (`runContextHydrationService`), not through a rendered page.

## Persisted-Data Transition Checks

- Approved persisted-data decision: no migration (optional `pendingRuntimeSwitch`, a new boundary-type value, journal manifest entries rebuilt)
- Representative existing data used: a run whose `run_metadata.json` has no pending field; a journal manifest in the previous release's shape (run-level runtime, entries without a runtime) — read once, no text changes, evidence hash unchanged (API-05); never-switched runs with archived segments (API-05)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-03 (field appears and is removed, undo restores the file byte for byte), API-05
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: C-6 corner (segments recording no runtime render with the no-runtime rules); a stored pending switch across a server restart before the first message (the metadata is on disk; not restarted here)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification / recipient: see Preliminary Classification

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` | Added (3 cases, gated on `RUN_AGY_FAILURE_E2E` + `dist/`; RS-01 is red until F-1 and F-2 are fixed) | API-02…API-04 | — |
| `autobyteus-server-ts/tests/agent-work-journal/services/work-journal-unswitched-identity.test.ts` | Added (6 tests) | API-05 | — |
| `autobyteus-server-ts/tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts` | Updated (journal manifest runtime per file) | API-07 | — |
| `autobyteus-web/generated/graphql.ts` | Regenerated by codegen (not a test) | API-06 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (this round is a `Fail`)
- Diff or repository evidence supplied for removed paths: no removals

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Native model provider | test-owned LM Studio stand-in (HTTP) | no paid provider; deterministic | model behavior and verified capacities not exercised (OBS-1) |
| Antigravity CLI | scripted `agy-failure-cli.mjs` (`linked_skills`, `auto_compaction`) | no paid model | provider behavior not exercised |
| Claude, Codex | real signed-in CLIs (API-08) | — | small task |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Detached base worktree `/tmp/crr-base` (symlinked `node_modules`), probe test copies | Yes | `git worktree remove --force`, probe files and dumps deleted | removed; the main `node_modules` untouched |
| Source mutations (journal service) | Yes | `git checkout` | `git status --short -- src` clean |
| Built server child processes, fake model server, temp roots, throwaway HOMEs | Yes | stopped/removed by the tests and by me | none left (`pgrep` checked) |
| Live Claude/Codex sessions | Yes (by the suite) | suite terminates its runs | their sessions remain in the CLIs' history |
| OBS-1 probe file | Yes | deleted | not in the repository |

## Preliminary Classification (On `Fail`)

- **F-1 — Antigravity → native: the native candidate's own record is written into the previous agent's archived raw-trace file (REQ-010, I-7, contract §3.3 step 3, AC-002).** Evidence: API-02, `raw_traces_000002.jsonl.types.txt` last line `system_instruction` (`## Agent Identity …`, the native agent's system prompt), written 11 ms before the marker; the new native `raw_traces_active.jsonl` then starts with the marker and holds no `system_instruction` of its own. Cause (read): the native bootstrap step `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts:39` calls `memoryManager.recordSystemInstructionSupply(...)`, which writes the record to the run's raw-trace file when the native agent is **prepared**; the lifecycle prepares the candidate (`beginActivation({kind:"new"}).prepare()`) before `memory.record` (marker and rotation). The design and review premise "a prepared native candidate writes no raw-trace record before the marker (system-instruction capture is pending until the first request)" holds for publishing the event (`pendingSystemInstructionCapture`), not for the file write. Claude and Codex targets keep their capture pending (live run, API-08: exact segments); native → AGY is clean. Classification: `Design Impact` (the activation order is the approved design; the premise about the native candidate is false; the fix touches the order or the native capture, not a bounded local edit). Recommended owner: Solution Designer. Symptoms to re-check after a fix: RS-01 soft assertions 1–3.
- **F-2 — The reopened chat of a switched run starts at the latest marker; the earlier conversation is not shown (BEH-005, REQ-011, the Task's observable success).** Evidence: API-02, `chat-projection.json` (starts with the Antigravity → AutoByteus marker and the notice; no `NATIVE-TURN-ONE`; the first marker is in the archive). Cause (read): `LocalMemoryRunViewProjectionProvider.buildProjection` reads `includeArchive: false` (the active file only); DEC-7 moves the previous agent's conversation into an archived segment at each switch. The same projection is deliberate after a compaction (BEH-A4 of the compaction ticket: "work since the compaction"), but the requirement for a switch says the chat shows the earlier conversation unchanged. The live chat on screen keeps its messages until the page is reloaded. Classification: `Design Impact` (design DS-002/BEH-005 relied on "history from raw traces (F-15)" without the rotation's effect on the projection); alternative `Requirement Gap` if the user accepts "since the switch" after a reload. Recommended owner: Solution Designer (decides with the user), then Implementation.
- OBS-1 and C-6 are not failures: OBS-1 `Unclear` (REQ-001 says "fresh selection"; the base's native replacement rule applies to a pending native candidate; owner: Solution Designer to decide), C-6 accepted in review.
- The failure-origin review confirms origin and owner.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): AC-002 (switch to the native runtime; chat after a reload)
- Preliminary classification and recommended owner (on `Fail`): F-1 `Design Impact`, F-2 `Design Impact` (or `Requirement Gap`), both Solution Designer
- Next recipient from `get_handoff_rules`: Code Reviewer (focused failure-origin review)
- Notes: everything else of the reviewer's list is covered and passes: native → AGY, the stopped-run settings (save, undo, pending + model-only edit, running refused, first message), the combined Save of a host with a delegated copy, codegen (committed), the byte-identity spot check (15/15 against the base commit), the live suite repeated. FU-009 is unchanged and not a blocker; the settings hint wording and the 500-line files were not scored.
