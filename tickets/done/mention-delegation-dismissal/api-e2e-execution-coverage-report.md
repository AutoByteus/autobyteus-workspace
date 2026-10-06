# API/E2E Execution Coverage Report — mention-delegation-dismissal

## Execution Round Meta

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/`. Evidence is under `api-e2e-evidence/`.

- Requirements Doc: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-005)
- Supplemental Task Artifacts: None (`N/A — not applicable`)
- Design Review Report: `design-review-report.md` (ARCH-REV-002)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (plus per-run probe ledgers `api-e2e-evidence/L-*-ledger.md`)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass on `a2a7b37bc` (base `3c8e49ad5`)
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Two deviations were driven by evidence:
  - (1) Real agents close a reporting copy on their own after its report, as the note tells them. This is supported behavior (SCN-002). The probe now asserts it when it happens and uses a non-reporting Note Taker copy for the user-driven close.
  - (2) A small AutoByteus resolver case (R-07) was added, because no AutoByteus model is available for a live run.
- Existing coverage decisions revised during execution:
  - The live probe's old F01 premise ("`@` refused because the run's model is unavailable") is stale. `@` no longer checks runnability (implementation assumption, design SR-004). F01 was rewritten to the remaining real refusal: the definition is no longer eligible.
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes` (probe cases are appended by `--ledger-file` to `api-e2e-evidence/L-CLAUDE-run2-ledger.md` and `L-CODEX-ledger.md`)
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: L-CODEX completed; final gated rerun.
- Cases still running, interrupted, or not started: none. The aborted Claude run 1 (harness `pickModel` flake) was superseded by run 2.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-00 | Pass | Completed | `logs/R-00-typecheck.log` | — |
| R-01 | Pass (baseline failures only) | Completed | `logs/R-01-server-focused.log` | 2 files / 5 tests fail identically on base `3c8e49ad5` |
| R-02 | Pass | Completed | `logs/R-02-contracts.log`, `logs/R-02-web-specs.log` | — |
| R-03 | Pass | Completed | `logs/R-03-prebuild-build.log` | — |
| R-04 | Pass | Completed | `logs/R-04-projects-e2e.log` | — |
| R-05 | Pass | Completed | `logs/R-final-gated.log`, `R-05/` | — |
| R-06 | Pass | Completed | `logs/R-final-gated.log`, `R-06/ad-hoc-task-delegation.json` | — |
| R-07 | Pass | Completed | `logs/R-final-gated.log` | — |
| B-01 | Pass | Completed | `B-01-task-closure-tree/evidence.json` | — |
| B-02 | Pass | Completed | `B-02-projects-feature/` | — |
| L-CLAUDE | Pass (18 + F01 rerun; L01/L02 N/A) | Completed | `L-CLAUDE-run2/`, `L-CLAUDE-F01-rerun/` | F01 initial fail was a harness false positive, fixed and rerun |
| L-CODEX | Pass (19; L01/L02 N/A) | Completed | `L-CODEX/` | — |
| L-AUTOBYTEUS | Not Tested | — | — | No model available without the user's data; R-07 + exposure unit test cover AC-009's stated layer |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. `project_id` with `task_id` is rejected (`PROJECT_TOOL_ARGUMENT_INVALID`), not ignored. `@` admits nothing. Saved old note guidance is display-only (web specs).
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (additive `ad-hoc-tasks/`; existing Projects data unaffected — R-04, B-01, B-02)
- Durable coverage added or retained only for compatibility-only behavior: `No`. The AC-012 stored-collaborator cases cover the approved preserved behavior (REQ-011).

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| R-06 (3 roots) | AC-001, AC-002 | `@` → resolve, no tree write; stored note | real WS SEND_MESSAGE `mentions` → root → MCP → disk | Durable | Pass | `R-06/ad-hoc-task-delegation.json` |
| R-06 | AC-003, AC-015, REQ-013 | described `delegate_task` → ad-hoc Task, `task_id`; text-only folder (2 files, reference bytes not copied) | real scoped MCP tool call | Durable | Pass | same |
| R-06 | AC-003 alternate | unknown address → `target_agent_run_id: null`, no `task_id`, no Task | real MCP | Durable | Pass | same (`rejectedDelegation`) |
| R-06 | AC-004/005/006 | strict modes: DONE by id (`projectId: null` ack), `project_id`+`task_id` → `PROJECT_TOOL_ARGUMENT_INVALID`, unknown → `TASK_NOT_FOUND`, create w/o Project → `PROJECT_TOOL_ARGUMENT_INVALID`, Project Task patched by id | real MCP | Durable | Pass | same |
| R-06 | AC-007 | live closure of exactly copy + sub-copy; run-ID message → `TASK_AGENT_RESOURCE_CLOSED`; repeat DONE republishes | real WS frames | Durable | Pass | same |
| R-06 | AC-008 (stored) | closure in stored reads after Stop; fenced after restore | GraphQL + WS | Durable | Pass | same |
| R-06 | AC-009 (AGY), REQ-007 | hosts with `toolNames: []` call `create_or_update_task` | scripted AGY via MCP | Durable | Pass | same |
| R-06 | AC-010 | not in `projectTasks`/`projects`; permanent delete (agent/team/org) removes only own ad-hoc folders | GraphQL delete mutations + disk | Durable | Pass | same |
| R-06 | AC-011, REQ-010 | the copy's described sub-delegation: no `task_id`, no new Task, linked to the same ad-hoc Task, closed with it | real MCP | Durable | Pass | same |
| R-06 | AC-012, REQ-011 | bring-in collaborator → Stop → restore → message by address, same run ID | real MCP + restore | Durable | Pass | same |
| R-06 (agent) | AC-013, REQ-012 | `projects/projects.json` present: Projects reject; delegation + DONE work | real gate | Durable | Pass | same (`pendingTaskId`) |
| R-07 | AC-009 (AutoByteus) | native exposure → filter → real registry → tool instance | Vitest with real registry | Durable | Pass | `logs/R-final-gated.log` |
| R-05, R-04, B-01, B-02 | AC-014, preserved Projects | linked delegation, Project DONE, UI tree closure, Projects UI | gated E2E, browser probes | Durable | Pass | `R-05/`, `B-01-*/`, `B-02-*/` |
| L-* A01 | AC-001/002/003/015, SCN-001 | send → no collaborator, no Offline row; chip shown, note not visible; stored note; `delegate_task` card; ad-hoc Task; delegated row; copy reports "From Code Reviewer:"; Team copy | browser + real runtime | Live/Browser | Pass (Claude, Codex) | `L-CLAUDE-run2/A01-*.png`, `L-CODEX/A01-*.png` |
| L-* A01/T01/O01 | AC-007, SCN-002 (agent decides) | the agent marks a reporting copy DONE on its own; the row leaves | live | Live/Browser | Observed and asserted (Claude: A01, T01; Codex: A01, T01, O01) | evidence `observations` |
| L-* A02/T03/O03 | AC-007, AC-009 (Claude/Codex), SCN-002 (user asks) | the user says finished → `create_or_update_task` card → row leaves live and after reload; history kept | live | Live/Browser | Pass | `A02-*.png`, `T03-*.png`, `O03-*.png` |
| L-* A03 | AC-008, SCN-004 | Stop → reopen: closed hidden; a second `@` delegates a new copy, never the closed one | live | Live/Browser | Pass | `A03-*.png` |
| L-* A05 | AC-008 | real backend process restart: closed hidden, open listed, statuses kept; DONE after restart | live | Live/Browser | Pass | `A05-*.png`, `backend-restart.log` |
| L-* S01 | AC-012 | agent-initiated collaborator: no ad-hoc Task; Offline after reopen; direct chat restores the same run ID; host messages it by address again | live | Live/Browser | Pass | `S01-*.png` |
| L-* F01 | AC-001 alternate | ineligible mention refused: notice, draft + highlight kept, nothing stored, no row/Task | live | Live/Browser | Pass | `L-CLAUDE-F01-rerun/`, `L-CODEX/F01-*.png` |
| L-* N02/N03 | AC-001/003 first-send | a New chat first message with `@` → no collaborator, delegation, chip | live | Live/Browser | Pass | `N02-*.png`, `N03-*.png` |
| L-* D01 | AC-010, SCN-005 | UI "Delete run permanently" → the run's 4 ad-hoc Tasks removed; Team/Org runs' 4 kept | live | Live/Browser | Pass | evidence `D01` |
| L-* A04/A06/P01/N01 | prior features (AR-001, AC-016 old traces, old data, New chat) | unchanged behavior with delegated copies | live | Live/Browser | Pass | evidence |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 9 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fake> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-closure-root-visibility.e2e.test.ts tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts --no-watch` | worktree root | Final state of all changed server tests | Pass (3 files / 10 tests) | `logs/R-final-gated.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 96% | +8 | Every AC is directly proven at the wire and, for user-visible ACs, live on Claude and Codex in all three root kinds | AC-009 AutoByteus is proven at its stated unit/integration layer, not live |
| Changed-boundary execution directness | 92% | 96% | +4 | Renderer + stream + real CLIs + server + disk | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | +10 | Real Claude (`haiku`) and Codex (`gpt-5.6-luna`) followed the note: delegated, closed by `task_id`, reported | Model behavior is probabilistic; two runtimes agreed across all cases |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | +3 | Fresh dist, owned isolated roots, sanitized env, real gate file | Migration-pending state is created by the gate file, not by a real interrupted migration |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 94% | +6 | Real restart, Stop/reopen, fencing, repeat DONE, rejected delegation, ineligible mention, delete | Post-link activation failure (approved tradeoff) and a crash between create and link (out of scope) are unit-level/untested |
| User-surface, browser, and desktop-shell confidence | 70% | 97% | +27 | Real browser journeys on 2 runtimes plus a human-style journey in a freshly built packaged desktop app (UI-created agents/team, real app restart, UI delete) | Org not repeated in the desktop app |
| Durable regression coverage quality and relevance | 92% | 95% | +3 | Gated deterministic E2E (3 roots), resolver cases, rewritten probe tolerant of supported agent choices, TESTING.md section | The live probe depends on a real model and CLI login |

- Overall post-repository confidence: 87%
- Overall final confidence: 95.4% (simple average: 96, 96, 95, 95, 94, 97, 95)
- Calculation method: simple average; no category is hidden below 90%
- Confidence change produced by broader validation: +8 points; closed the UI, real-runtime and restart gaps
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AutoByteus native model not run live; post-link activation failure path is unit-level only.

## Broader Validation Decision And Execution

- Decision and mode: `Required`; Browser against probe-owned real backend + real runtime CLIs.
- Material deviation: the probe accepts the agent's own DONE for reporting copies (supported, SCN-002). The user-driven DONE is asserted on a non-reporting copy.
- Gap addressed: UI outcomes, real-model behavior under the new note and tool contracts, real restart, UI delete.
- Startup: `prebuild` + `build` (fresh dist) → each probe run: `prisma migrate deploy` into an owned SQLite → `dist/app.js` on a free port (health `/rest/health`) → Nuxt dev on a free port → headless Chrome 154.
- Environment: sanitized env (HOME/PATH/USER/LANG/TMPDIR/SHELL/TERM), owned temp data root, CLI logins of the installed Claude 2.1.283 and Codex 0.160.0.
- Seed data: Agent/Team/Org definitions via GraphQL. Hosts have **no** Project tool selected.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| `@Code Reviewer` send (standalone) | no collaborator; no row from the send; chip; stored note | collaborators 0 throughout; first rows are the delegated copy; chip shown; stored note has the new guidance | A01 | Pass ×2 |
| Agent delegates | `delegate_task` card; ad-hoc Task (TODO, description, `referenceFiles: []`, 2 files) | as expected | A01 `delegation` | Pass ×2 |
| Copy reports, agent decides | DONE by `task_id`; row leaves | Claude/Codex both closed the reviewer on their own after the report | observations | Pass ×2 |
| User says Note Taker work finished | `create_or_update_task` card; Task DONE; row leaves; conversation kept | as expected | A02 | Pass ×2 |
| Stop → reopen → second `@Note Taker` | closed hidden; new copy, new Task | as expected | A03 | Pass ×2 |
| Real backend restart | closed hidden, statuses kept; DONE after restart works | as expected | A05 | Pass ×2 |
| Team / Org `@` | no collaborator; Team/Agent copies with Tasks; user-driven DONE; hidden after reload | as expected | T01–T03, O01–O03 | Pass ×2 |
| Stored bring-in collaborator | restore and message by address, same run ID | as expected | S01 | Pass ×2 |
| Ineligible mention | refused, nothing stored | as expected | F01 | Pass ×2 (Claude after harness fix) |
| Permanent delete from UI | own ad-hoc Tasks removed; others kept | 4 removed / 4 kept | D01 | Pass ×2 |

## Human-Style Desktop Journey (Isolated Electron Instance)

Run on request of the user, after the probe runs: a fresh packaged build of this worktree (`pnpm --silent isolated-app start --build`, instance `iso-55746-779d`, own ports/data root), driven through its window with the browser-automation presentation helper (visible cursor, paced typing, real clicks) like a person. Everything was created through the UI; agent instructions were plain (no test rules); no tools selected; runtime Claude Agent SDK `haiku`. Evidence: `api-e2e-evidence/H-desktop/` (screenshots 00–18, `journey.mp4` 241 s, `journey-after-restart.mp4` 251 s).

| Step (as a user) | Observed | AC | Result |
| --- | --- | --- | --- |
| Agents page → Create Agent ×3 (Research Assistant, Code Reviewer, Note Taker) | created, 0 tools | — | Pass |
| New chat, heading → Research Assistant, model menu → Claude `haiku`, "Hi!" | real reply | — | Pass |
| Type `@code`, pick Code Reviewer from the menu, write a request, Enter | tree sampled every 250 ms: no row from the send; after ~3.8 s a "Temporary task agent, code reviewer … Started by research assistant" row; chip shown; `delegate_task` card; server: `collaborators: []`, one `taskExecution`; disk: `ad-hoc-tasks/<id>/{task.json, agent_run_resources.json}`, text-only, `TODO` | AC-001/002/003/015 | Pass |
| Click the "code reviewer" row | its conversation shows the review | — | Pass |
| Back to the host: "the review is finished. Please close that task." | `create_or_update_task` card; row left the tree in ~3.5 s; server: Task `DONE`, copy in `closed_task_executions`, status `offline` | AC-007, AC-009 (Claude, no selection) | Pass |
| `@Note Taker …` | open delegated row | AC-003 | Pass |
| Quit and relaunch the app (`isolated-app restart`) | closed code reviewer still absent; open note taker listed (Offline) | AC-008 | Pass |
| "That's all I needed from the Note Taker. Please close it." | `create_or_update_task`; row left; Task `DONE` | AC-007 after restart | Pass |
| Agent Teams → Create Team (Research Assistant coordinator + Note Taker), chat with it, `@Code Reviewer …` from the coordinator | delegated "code reviewer" row under the team; `collaborators: []`; ad-hoc Task | AC-001/003 (Team) | Pass |
| "that's done. Please close that task." | `create_or_update_task`; row left; team members unchanged; Task `DONE` | AC-007 (Team) | Pass |
| Stop the standalone run, then "Delete run permanently" → confirm "Delete" | run row gone; its 2 ad-hoc Tasks removed from disk; the Team run's ad-hoc Task kept | AC-010 | Pass |
| `isolated-app stop` | `dataRootRemoved: true`, both ports released | cleanup | Pass |

Not repeated in the desktop journey (covered by the probes and the server E2E): Org runs, update-mode rejections, migration-pending, stored bring-in collaborators, ineligible mentions.

## Desktop Application Validation

- Approach: browser dev-path probes (TESTING.md) and, additionally, a human-style journey in a freshly built isolated desktop instance (section above).
- Effect on the already-running desktop application: `None`. The user's AutoByteus (port 29695, `~/.autobyteus`) was never touched. All probes used owned temp roots and free ports.
- Packaged Electron: proven by the isolated-instance journey (standalone and Team, Claude runtime, real app restart, UI delete).

## Platform / Runtime Targets

- macOS 26.5.2 (arm64); Node 22.23.1 (probes), pnpm workspace
- Claude Code CLI 2.1.283 (model `haiku`); Codex CLI 0.160.0 (model `gpt-5.6-luna`); AGY scripted fake CLI (deterministic E2E)
- Google Chrome 154.0.8037.98 headless; viewport 1512×952 (plus 1024×640 menu check); locale en-US

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected` (additive `ad-hoc-tasks/`).
- Representative existing data: existing Projects/Tasks/run-resource files in R-04 (incl. the startup migration and the two-node dist suite), B-01 and B-02.
- Direct-use result: Pass. Missing `ad-hoc-tasks/` = no ad-hoc Tasks (every fresh root). Restart reloads both roots (A05).
- Version-specific runtime branch / dual read-write / fallback observed: `No`.
- Residual: none material.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary, Or Obsolete Assertion And Upstream Evidence | Execution Result, Or Replacement / No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Added | AC-001..013, AC-015 for 3 roots at the real wire/MCP/disk (gated like its sibling) | Pass 3/3 (skips cleanly when ungated) |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | Updated (+2 cases) | AC-009 AutoByteus | Pass 4/4 |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Updated (rewritten outcomes) | Obsolete: "`@` adds an Offline collaborator", "briefing via `send_message_to`, never `delegate_task`", "first-send mention admitted as collaborator", "collaborator woken after Stop/restart", F01 "model unavailable refuses `@`" (REQ-001/002; design Removal Plan; CR C-09; implementation assumption on runnability) | Replaced in place by delegation/ad-hoc/DONE/restart/delete assertions, AC-012 via an agent-initiated bring-in, F01 via an ineligible definition. Pass on Claude and Codex |
| `TESTING.md` (Projects section) | Updated | Documents the new gated suite and the live probe | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: no files removed; the obsolete probe assertions are visible in `git diff a2a7b37bc -- autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/logs/*.log` | command logs | Retained | — |
| `api-e2e-evidence/R-05/`, `R-06/` | JSON receipts with cleanup | Retained | — |
| `api-e2e-evidence/B-01-*/`, `B-02-*/` | browser probe evidence | Retained | — |
| `api-e2e-evidence/L-CLAUDE-run2/`, `L-CLAUDE-F01-rerun/`, `L-CODEX/` | live evidence JSON, screenshots, backend/frontend logs | Retained | — |
| `api-e2e-evidence/L-CLAUDE/`, `L-CLAUDE-shakedown-1..3/` | aborted run and shakedowns | Retained | Shows the probe adjustments (agent self-close; `pickModel` flake) |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `git worktree add --detach /tmp/mdd-base-3c8e49ad5 3c8e49ad5` (with symlinked deps) | Prove the 2 R-01 failures are baseline | Same 5 failures on base | Symlinks unlinked; worktree removed (`git worktree list` clean) |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI / model (R-05, R-06, B-01) | repository fake CLI `agy-failure-cli.mjs` (`linked_skills`) calls the real MCP tools | Deterministic; no inference | Model choice not proven there; covered by the live Claude/Codex runs |
| AutoByteus native model | none (not run live) | No model available without the user's data | AC-009 AutoByteus at the unit/registry layer only |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-00..R-07, B-01, B-02, L-CLAUDE, L-CODEX | All required behavior proven |
| Not Tested | L-AUTOBYTEUS; L01/L02 (AGY-only crash cases) | No AutoByteus model without the user's data; the crash cases need AGY by design |
| Out Of Scope | crash between ad-hoc create and link | Interrupted execution (design) |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process Studio servers + temp app data (R-05/R-06) | owned | `app.close()`, `rm` | `dataRemoved: true`, `serverClosed: true`, 0 roots |
| Isolated desktop instance `iso-55746-779d` | owned | `isolated-app stop` | data root removed, ports released |
| Probe backends, Nuxt dev, Chrome, temp roots (B-01, B-02, L-*) | owned | probe `finally` | receipts: SIGTERM/exit 0, roots removed, no browser errors |
| Aborted Claude run 1 | owned | probe and its backend/Nuxt/Chrome process groups terminated by exact PID | temp root gone; no orphaned CLI |
| Temp base worktree | owned | unlink symlinks; `git worktree remove` | removed |
| User's AutoByteus app and data | not owned | untouched | — |

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.4%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed (Browser + real Claude and Codex runtimes; human-style journey in an isolated packaged desktop app)
- Critical acceptance criteria lacking direct proof: None. AC-009 for AutoByteus is proven at its stated unit/integration layer.
- Next recipient from `get_handoff_rules`: see handoff.
- Notes:
  - Residual risks carried from upstream:
    - the breaking update mode for the external Project Task Manager skill;
    - cross-Task copy messaging;
    - orphan `task.json` on a crash;
    - a failed-assignment ad-hoc Task until its run is deleted;
    - UI copy.
  - Observed: agents close reporting copies on their own (supported).
  - The F01 notice shows a deleted definition's ID as its name (existing copy).
