# API/E2E Execution Coverage Report — project-testing-guideline

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/requirements-doc.md` (SR-007)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec (required on every route): `…/design-spec.md` (SR-007)
- Supplemental Task Artifacts: `…/evidence/` (non-normative)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A — not applicable
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass (reviewed Medium/High route)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline`; evidence root `…/api-e2e-evidence/`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (one durable test added)

## Investigation And Execution Basis

- Coverage investigation artifact: `…/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations:
  - E-04 prompt on Electron is impossible (Electron throws "prompt() is not supported."), so AC-009(d) is proven on real Chrome.
  - E-06 "answered on screen" was emulated by a raw CDP client attached before the dialog opened. A late client cannot answer (confirmed live), and native macOS clicking would need Accessibility permission.
  - E-08 grew into a base-vs-branch latency investigation after an intermittent 228 s command.
- Existing coverage decisions revised during execution: the new stdio test first asserted `dialogs: null` for `run_script` (as stated in the handoff and the review). The real stdio transport omits the key for `run_script`, `read_page`, `dom_snapshot` and `screenshot`; only `navigate_to` carries `null`. The assertion was changed to "no dialogs reported (absent or null)".
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `…/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (R-02 checkpoint for the final clean-run attempt)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: L-99 Completed
- Cases still running, interrupted, or not started: none
- Interruption note: two user questions about test duration; no case lost state

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-01 | Pass | Completed | `repo/R-01-mcps-unit.log` | 163/163 |
| R-02 | Pass | Completed + Checkpoint | `repo/R-02-mcps-integration-headless.log`, `repo/R-02b-durations.log`, `repo/R-02-final-clean.log`, `repo/R-02-rerun-mp005-*.log` | 35/35 twice; third run 34/35, where one host-overload timeout passed 3/3 on rerun (not a regression) |
| R-03 | Pass | Completed | `repo/R-03-headful.log` | 2/2 headful |
| R-04 | Pass | Completed | `repo/R-04-doc-check.json` | scripts/links/anchors |
| E-01..E-09 | Pass | Completed | `live/E-0*/` | see matrix |
| D-01..D-04 | Pass | Completed | ledger, `live/D-04/` | — |
| L-99 | Pass | Completed | `live/L-99-main-app-{before,after}.txt` | main app untouched |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (implicit auto-dismiss removed, no switch)
- Approved persisted-data transition followed: `N/A` (`Not Affected`)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| E-01 | REQ-008/009, AC-009 (a) | own-tab dialog, no decision | CLI → isolated AutoByteus (real "Remove node" confirm) | Live | Pass | `DIALOG_DECISION_REQUIRED` exit 5 in 2.2 s with the app's message; node kept; next command ok |
| E-02 | AC-009 (c) | `--dialog dismiss` | same | Live | Pass | reported dismissed/agent; node kept |
| E-03 | AC-009 (b); recorder coexistence | `--dialog accept` during a recording | same | Live | Pass | accepted/agent; node removed; recording stopped normally |
| E-04 | AC-009 (d)(e); `INVALID_ARGUMENT` | alert/prompt | CLI → Electron | Live | Pass | alert closed + reported (`decided_by: null`), success; prompt N/A on Electron (Electron has no `prompt()`); invalid option rejected |
| R-02 + stdio test | AC-009 (a)–(e) | all dialog types | real Chrome headless (CLI, in-memory MCP, real stdio MCP) | Durable | Pass | prompt text/default, beforeunload, load dialogs |
| R-02/R-03 | AC-009 (f) | other tab untouched | headless + headful Chrome | Durable | Pass | dialog left open for its owner, unreported |
| E-05 | AC-009 "same via MCP", AC-011 tool list | MCP stdio → Electron | Python MCP client | Live | Pass | 11 tools; new params; same three outcomes |
| E-06 | REQ-010, AC-010 | 8 s connect bound, `PAGE_BLOCKED` | CLI → Electron | Live | Pass | 8.25–8.26 s, retryable, remedies, `details.targets`; recovery after answer; base gave `BROWSER_UNAVAILABLE` after 20.36 s; 20/20 healthy commands ok |
| R-02/R-03 | AC-010 | same | real Chrome headless + headful | Durable | Pass | ≤ 10 s + recovery |
| E-07 | preserved CLI contract | output shape without dialogs | base `6b39562` vs branch CLI | Live | Pass | 7/7 byte-identical |
| E-08 | escalation trigger "healthy connect > 8 s" | connect bound vs slow pages | 40–160 tab Chrome; base vs branch harness | Live | Pass | connect ≤ 1.5 s at 160 tabs; no false `PAGE_BLOCKED`; slow per-page listing identical on base |
| E-09 | MP-004 | `open-tab` load dialog | CLI → Chrome | Live | Pass | fails fast with hint to `run-script`/`navigate`; not left open |
| D-01/R-04 | REQ-006, AC-006, QR-002 | `TESTING.md` | mechanical + review | Doc | Pass | 24 scripts exist; 12 links / 8 anchors resolve; 124 lines |
| D-02 | REQ-007, AC-007 | links | grep | Doc | Pass | 7 links resolve |
| D-03 | REQ-011, AC-011 | SKILL/README/TESTING | review | Doc | Pass | all items present (two nits, OBS-A/B) |
| D-04 | REQ-006, AC-008 | agent usability | fresh AutoByteus agent (no tools), real model | Live | Pass | web-only → unit + browser probe; desktop-shell → Electron tests + isolated worktree build; `TESTING.md` quoted |
| L-99 | TESTING rules 2/5 | safety | checkpoints | Live | Pass | main app pids/start/health unchanged; foreign instance `iso-9333-b35d` untouched |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-02a | `pytest tests/integration/test_mcp_transports_real.py -k page_dialogs` | mcps | new durable stdio test | Pass | `repo/R-02a-new-stdio-dialog-test.log` |
| R-02b | full integration with `--durations=0` | mcps | timing investigation | Pass (35/35) | `repo/R-02b-durations.log` |
| R-02-final | full integration, no own load | mcps (host load 252–263 from a foreign VM) | regression check | 34/35; failure classified environment | `repo/R-02-final-clean.log` |
| R-02-rerun | MP-005 + recorder coexistence × 3 | mcps | failure classification | Pass 3/3 | `repo/R-02-rerun-mp005-*.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | Every AC proven on its real target; AC-008 by a fresh agent | AC-009(d) cannot exist on Electron (proven on Chrome) |
| Changed-boundary execution directness | 85% | 96% | +11 | Real AutoByteus confirm; real stdio MCP; base-vs-branch comparisons | — |
| Cross-boundary integration realism and mock gap | 82% | 95% | +13 | Electron dialog delivery, recorder coexistence, model-backed agent | "On-screen answer" emulated by a raw CDP client |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | +8 | Real installed app isolated; real key source; headful run | Host overloaded by a foreign VM caused timing variance and one timeout |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | +10 | Undecided/decided/alert/invalid option, blocked + recovery, late-answer impossibility, load dialogs, many tabs | Connect-window residual (dialog before listener) not reproducible deliberately |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Electron renderer via CLI/MCP; headful Chrome | — |
| Durable regression coverage quality and relevance | 90% | 94% | +4 | New real-stdio MCP dialog test (page state, prompt text, alert, invalid option, field shape) | Electron checks remain temporary (mcps is app-independent) |

- Overall post-repository confidence: 84%
- Overall final confidence: 95.0% (simple average: 97, 96, 95, 93, 95, 95, 94)
- Calculation method: simple average
- Confidence change produced by broader validation: +11
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: host-load timing variance; `PAGE_BLOCKED` heuristic; the connect-window residual accepted in review

## Broader Validation Decision And Execution

- Decision and mode: `Required` — live isolated AutoByteus (installed 1.4.91-beta.6 carrying the isolated-launch marker; this ticket changes no app code) via the branch CLI and MCP stdio; own headless Chrome for comparisons; fresh agent run
- Startup:
  - `pnpm --silent isolated-app start --control-port 9336` → `iso-9336-d523`, ready;
  - keys: unchanged importer via `script` into the reported `databaseUrl` (CONFIGURED 10), then `restart`;
  - own headless Chrome on port 19444 with a local page server on 18765;
  - base CLI from a temporary worktree at `6b39562`.
- Environment choices:
  - control port 9336, because another worktree's instance record uses 9333;
  - workspace worktree dependencies installed from the local pnpm store (needed for the importer build);
  - the host carried a foreign VM at about 585 % CPU (load average up to 263).
- Seed data: a disposable remote node (unreachable URL, added as degraded) for the real confirm flow, and a "Test Planner" agent; both deleted with the data root.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Remove node without decision | `DIALOG_DECISION_REQUIRED` with message; node kept | as expected, 2.2 s | `live/E-01/` | Pass |
| Remove node dismiss / accept | reported by agent; kept / removed | as expected; recording unaffected | `live/E-02/`, `live/E-03/` | Pass |
| MCP stdio same flow | same outcomes | as expected | `live/E-05/report.json` | Pass |
| Dialog between commands | `PAGE_BLOCKED` ≤ 10 s; recovery | 8.25 s; recovery after answer | `live/E-06/` | Pass |
| Agent with only `TESTING.md` | right path per change | as expected | `live/D-04/agent-transcript.txt` | Pass |

## Desktop Application Validation

- Approach: isolated installed app driven by the changed tool; no app code under test
- Shell-specific evidence: Electron delivers page dialogs through the context event; attach blocks while a dialog is open; a late CDP client cannot answer (`Page.enable` hangs; "No dialog is showing"); Electron has no `prompt()`
- Effect on the running desktop app: `None`
- Not directly proven: another-tab dialog inside Electron (single window; covered on Chrome)

## Platform / Runtime Targets

- macOS 26.5.2 arm64
- Python 3.13.12 (uv, frozen); Playwright as locked
- Google Chrome 154.0.8037.58 (headless and headful); Electron app 1.4.91-beta.6

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Persisted-data decision `Not Affected`; isolated root and the imported keys were removed at stop.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline/browser-automation/tests/integration/test_mcp_transports_real.py::test_stdio_mcp_page_dialogs_follow_the_agent_decision_and_are_reported` | Added | AC-009 via the production MCP launcher over stdio; field shape without dialogs; `INVALID_ARGUMENT` | Pass (standalone and in 3 full runs) | reuses `stdio_mcp_session`/`error_text` helpers; asserts page-side state (`window.answer`, prompt text) |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: `/Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline/browser-automation/tests/integration/test_mcp_transports_real.py` (one test added)
- Paths removed: none
- Attached for proportional test-code review: `Yes`
- Uncommitted working-tree change (no commit was requested)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `…/api-e2e-evidence/repo/` | suite logs, doc check | Retained | — |
| `…/api-e2e-evidence/live/` | JSON outputs, timings, protocol/harness logs, agent transcript, one recording | Retained | no secret values |
| `…/api-e2e-evidence/scripts/` | `ledger.py`, `br.sh`, `doc_check.py`, `dialog-fixture.mjs`, `mcp_electron_dialogs.py`, `stall_harness.py` | Retained as evidence tooling | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Base worktree `/tmp/abdlg-base` @ `6b39562` | byte-identity and latency comparison | E-06, E-07, E-08 | `git worktree remove` done |
| Own headless Chrome :19444 + page server :18765 | comparisons, many-tab timing | E-05 shape, E-07..E-09 | killed; temp profile deleted |
| Raw CDP dialog fixture | emulate the on-screen answer | E-06 | exited |
| Phase harness (monkeypatched timings) | localize the intermittent stall | E-08 | n/a |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A person answering a native dialog on screen | raw CDP client attached before the dialog | macOS clicking needs Accessibility permission; a late client cannot answer | the recovery path after the answer is the same; the human click itself is not exercised |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-01..R-04, E-01..E-09, D-01..D-04, L-99 | All ACs proven |
| Not Tested | other-tab dialog inside Electron; prompt inside Electron | single-window app; Electron has no `prompt()` |
| Out Of Scope | OBS-A..OBS-D | non-blocking observations below |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| `iso-9336-d523` (+ root, imported keys) | this run | `isolated-app stop` | stopped; root removed; ports released |
| Base worktree, test Chrome, page server, temp files | this run | removed/killed | done |
| Workspace worktree `node_modules` | this run (installed for the importer build) | kept (gitignored; normal worktree state) | no tracked changes |
| Foreign instance record `iso-9333-b35d` (chat-interface-entry) | not owned | untouched | — |
| Main AutoByteus app | user | never touched | unchanged |

## Preliminary Classification

N/A — Pass. Non-blocking observations:

- **OBS-A (docs accuracy):** `SKILL.md`, the handoff and the review say MCP results carry `dialogs: null` when no dialog occurred. Over the real stdio transport this is true only for `navigate_to`; `run_script`, `read_page`, `dom_snapshot` and `screenshot` omit the key. Either behavior satisfies "additive only"; the doc sentence could say "absent or null". Evidence: `live/E-05/mcp-dialogs-field-shape.txt`.
- **OBS-B (docs completeness):** Electron renderers do not implement `window.prompt()` ("prompt() is not supported."). Prompt handling is therefore browser-only; a one-line note in `SKILL.md`/`TESTING.md` would prevent confusion. Evidence: `live/E-04/prompt-native.json`.
- **OBS-C (pre-existing):** a connect that times out prints a Python "Future exception was never retrieved / TargetClosedError" traceback to stderr. The base prints it too; stdout JSON is correct.
- **OBS-D (pre-existing):** with very many tabs on a loaded host, `list-tabs` (per-page `summarize_page`) can take tens of seconds or longer (branch 228 s ×2; base 59.6 s in the harness). The connect phase stays around 1 s, so the new 8 s bound does not misfire.
- **Environment:** a foreign VM (Apple Virtualization, about 585 % CPU) kept load at 160–263. It caused the long suite times and one test-harness timeout (MP-005 test; 3/3 reruns pass; recorder code unchanged).

## Recommended Recipient

`/code_reviewer` — proportional review of the one added durable test.

## Evidence / Notes

- Improvement quantified: a blocked browser is now reported as `PAGE_BLOCKED` in about 8.3 s, versus `BROWSER_UNAVAILABLE` after 20.4 s on base (same live Electron instance).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.0%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed
- Critical acceptance criteria lacking direct proof: None
- Required next recipient: `/code_reviewer` for proportional test-code review
- Notes: OBS-A/B are cheap doc follow-ups for the owners to decide.
