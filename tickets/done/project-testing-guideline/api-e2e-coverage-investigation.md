# API/E2E Coverage Investigation — project-testing-guideline

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/requirements-doc.md` (SR-007)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec (required on every route): `…/design-spec.md` (SR-007)
- Supplemental Task Artifacts: `…/evidence/` (`page.html`, `cdp2.mjs`; non-normative)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-001 Pass 9.3)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A — not applicable
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (created after the result)
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass (Medium/High reviewed route)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline`; evidence root `…/api-e2e-evidence/`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` if durable test code changes (planned: yes)

## Current Requirement And Design Basis

Prove REQ-006..REQ-011 through AC-006..AC-011 on macOS:
- **Workspace docs:** `TESTING.md` covers the listed layers, the path selection and the rules. Every named command exists and every link resolves; it is concise (QR-002) and discoverable from `README.md`, both `AGENTS.md` files, and the isolated-instance guide's back-link.
- **browser-automation, per DS-1:** dialogs are answered by the agent's decision on `run-script`/`navigate` (CLI `--dialog`/`--prompt-text`, MCP `dialog`/`prompt_text`). Without a decision the tool dismisses only to unblock and reports `DIALOG_DECISION_REQUIRED`. An `alert` is closed and reported. Other tabs' dialogs are untouched. Results carry `dialogs` (CLI: only when non-empty; MCP: `null` otherwise, an accepted deviation). The tool list is unchanged.
- **browser-automation, per DS-2:** `PAGE_BLOCKED` ≤ 10 s via an 8 s existing-browser connect bound, with remedies and recovery. Healthy connects are not misreported.

Design escalation triggers: Electron dialogs not delivered via the context event; healthy existing-browser connects > 8 s; recorder coexistence regressions.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-004/005 `TESTING.md` + links | Added | REQ-006/007 | Mechanical doc checks + agent dry run (AC-008) |
| BEH-006 dialog decisions/reporting (CLI + MCP) | Changed (implicit auto-dismiss removed) | REQ-008/009, DS-1 | Real Chrome suites + live Electron real AutoByteus confirm + MCP real stdio |
| BEH-007 `PAGE_BLOCKED` + 8 s connect bound | Changed | REQ-010, DS-2 | Real Chrome + Electron timing + healthy-connect false-positive check (many tabs) |
| REQ-011 docs | Added | SKILL/README/TESTING | Doc review + tool list |
| Preserved: CLI JSON byte-identical without dialogs; other commands; `close-tab`; recorder | Preserved | design guidance | Old-vs-new CLI output comparison; recorder coexistence |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | CLI/MCP options, `dialogs` field, 2 error codes | unit + in-memory MCP + CLI real-Chrome | MCP over real stdio; CLI byte-identity vs base | MCP stdio; base-vs-branch CLI diff |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Yes | CDP dialog events, page blocking | headless (+ headful opt-in) real Chrome | Real AutoByteus confirm flow in Electron | Live Electron isolated instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (as target) | Electron page dialogs | implementer live only | same | Live Electron |
| Desktop shell / Electron-specific | Yes (as target) | dialog delivery, attach blocking | implementer live only | same | Live Electron |
| Process / lifecycle | Yes | connect bound, blocked attach | real Chrome | healthy slow connects (many tabs) | Chrome with many tabs |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed | Yes (coexistence) | recorder worker + dialog listener | real Chrome test | Electron | Live Electron recording |
| External integration | No | — | — | — | — |
| Documentation | Yes | TESTING.md, links, SKILL/README | reviewer spot-check | full mechanical check; agent usability | Scripted checks + fresh agent dry run |

## Project Execution Discovery

- Assigned worktrees:
  - workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline` (`codex/project-testing-guideline`, HEAD `034013be4`);
  - mcps `/Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline` (`codex/project-testing-guideline`, `6b39562..b5fcdda`).
- Runtime stack: Python 3.13 via `uv` (browser-automation); Electron AutoByteus desktop.
- Instructions:
  - `TESTING.md` (under test);
  - `docs/isolated-app-instances.md`;
  - browser-automation `SKILL.md`/`README.md`;
  - mcps `tests/integration/conftest.py`: real suites need `BROWSER_AUTOMATION_REAL_TESTS=1`, and `BROWSER_AUTOMATION_TEST_HEADFUL=1` runs a visible Chrome.
- Unclear instructions: none.
- Secrets: AC-008 dry run uses the unchanged importer into an isolated DB (established practice); values never logged.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| mcps `browser-automation/tests/integration/conftest.py`, `support.py` | real-Chrome fixtures | `BROWSER_AUTOMATION_REAL_TESTS=1`; headful switch |
| `TESTING.md` rules 1–7 | project testing rules | separate control port, stop what you started, assertions first, dialogs answered by the agent |
| `docs/isolated-app-instances.md` | isolated instances | `pnpm --silent isolated-app start --app … --control-port <n>`; installed app must carry the marker |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated AutoByteus instance | workspace worktree | `pnpm --silent isolated-app start --control-port 9336` (installed 1.4.91-beta.6 carries the marker; this ticket changes no app code) | control 9336 to avoid other worktrees' 9333 | lifecycle readiness | `isolated-app stop <id>` |
| browser-automation CLI (branch) | evidence dir | `env CHROME_REMOTE_DEBUGGING_PORT=9336 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash <mcps worktree>/browser-automation/scripts/browser …` | uv frozen | JSON `ok` | stateless |
| browser-automation CLI (base `6b39562`) | temp git worktree | same launcher from `/tmp/…` | byte-identity comparison only | — | `git worktree remove` |
| Test Chrome (many tabs) | temp profile | pytest fixture or own launch | own port | `/json/version` | kill own group |

| Data / Fixture / Identity Need | Mechanism | Safety Notes | Cleanup |
| --- | --- | --- | --- |
| Removable remote node | Settings → Nodes → add node with an unreachable URL (added as degraded) | isolated DB only | root deleted at stop |
| Dialog pages in Electron | `run-script` defining `confirm`/`prompt`/`alert` triggers in the renderer | isolated renderer only | reload/stop |
| Keys for AC-008 dry run | importer into the isolated DB | never production | root deleted |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`. No persisted data involved.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| mcps `tests/unit/test_dialogs.py`, `test_runtime.py` (dialog/connect parts), `test_application.py`, `test_cli_and_mcp.py` | rules matrix, scoping, connect split, `PAGE_BLOCKED` classification, contracts | REQ-008/009/010 | Still Valid | CRR-001 | Re-run |
| mcps `tests/integration/test_dialogs_real_chrome.py` (8 tests) | confirm decided/undecided, prompt, alert, beforeunload, navigate/open-tab load dialogs, other tabs untouched, recorder coexistence | AC-009 (a)–(f) | Still Valid | — | Re-run headless + headful |
| mcps `tests/integration/test_dialogs_mcp_real_chrome.py` | MCP decision parity (in-memory transport) | AC-009 "same via MCP" | Still Valid | — | Re-run; real stdio added |
| mcps `tests/integration/test_page_blocked_real_chrome.py` | `PAGE_BLOCKED` ≤ 10 s, targets, recovery | AC-010 | Still Valid | — | Re-run |
| mcps `tests/integration/test_mcp_transports_real.py` (incl. recording/attach-only stdio tests) | tool inventory = 11, stdio behavior | AC-011 tool list, QR-007 | Still Valid | — | Re-run |
| mcps remaining unit/integration suites | pre-existing behavior | preserved | Still Valid | — | Re-run |
| Workspace probes/tests | untouched (docs-only workspace change) | — | Out Of Scope | diff is docs only | — |

## Stale Or Obsolete Coverage Decisions

None. No test asserted the removed implicit auto-dismiss; the recorder MP-005 test still holds (recorder unchanged).

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DUR-MCP-DLG | MCP `run_script` dialog decision / `DIALOG_DECISION_REQUIRED` / `dialogs: null` over the real stdio launcher | AC-009 "same via MCP", reviewer focus 1/5 | mcps `tests/integration/test_mcp_transports_real.py` | Existing MCP parity test uses the in-memory transport; the production launcher/stdio serialization of the new optional parameters and nullable field is unproven |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-01 | `uv run --frozen --extra test pytest tests/unit -q` | mcps `browser-automation` | units | Planned | `repo/R-01-*.log` |
| R-02 | `BROWSER_AUTOMATION_REAL_TESTS=1 uv run --frozen --extra test pytest tests/integration -rA` | mcps | real Chrome headless (incl. DUR-MCP-DLG) | Planned | `repo/R-02-*.log` |
| R-03 | same + `BROWSER_AUTOMATION_TEST_HEADFUL=1`, dialog/PAGE_BLOCKED/MCP files | mcps | headful other-tab/blocked behavior | Planned | `repo/R-03-*.log` |
| R-04 | scripted doc check (scripts/links/anchors/layers/rules/length) | workspace | AC-006/007 | Planned | `repo/R-04-*` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — about 15 independent cases, live Electron plus an agent run; interruption risk.
- Canonical ledger path: `…/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| R-01..R-04 | repository suites and doc check | all | repo | above | 1 | logs |
| E-01 | Real AutoByteus confirm (remove node) without decision | AC-009 (a) | CLI → Electron | `run-script` helper click, no `--dialog` | 2 | `DIALOG_DECISION_REQUIRED` + message; node kept; next command works |
| E-02 | same with `--dialog dismiss` | AC-009 (c) | CLI → Electron | `--dialog dismiss` | 3 | dismissed/agent; node kept |
| E-03 | same with `--dialog accept` while recording | AC-009 (b), recorder coexistence | CLI → Electron | `--dialog accept` + recording | 4 | accepted/agent; node removed; recording ok |
| E-04 | prompt (text/default) and alert in the Electron renderer | AC-009 (d)(e) | CLI → Electron | `run-script` | 5 | text received; alert closed + reported, success |
| E-05 | MCP over real stdio on Electron: remove-node accept/none; `dialogs: null` without dialog; tool list | AC-009 MCP, AC-011 tool list, reviewer focus 5 | MCP stdio → Electron | Python MCP client | 6 | same outcomes as CLI |
| E-06 | Dialog raised between commands in Electron → `PAGE_BLOCKED` ≤ 10 s with targets; answered → recovery; healthy connects not blocked | AC-010 | CLI → Electron | `run-script` with delayed confirm; raw CDP fixture answers | 7 | timing, details, recovery |
| E-07 | CLI output byte-identical to base for no-dialog commands | design guidance / reviewer focus 5 | base vs branch CLI on the same Chrome tab | temp worktree at `6b39562` | 8 | diff empty |
| E-08 | Healthy connect with many tabs (40) stays below 8 s | escalation trigger (healthy connect > 8 s) | real Chrome | CLI timing | 9 | durations |
| E-09 | `open-tab` on a URL raising a dialog on load | MP-004, reviewer focus 4 | real Chrome | CLI | 10 | dialog not left open; hint names `run-script`/`navigate` |
| D-01 | `TESTING.md` coverage/scripts/links/length | AC-006, QR-002 | docs | R-04 output + review | 11 | checklist |
| D-02 | Discoverability links | AC-007 | docs | grep | 12 | links |
| D-03 | SKILL/README/TESTING dialog docs | AC-011 | docs | review | 13 | checklist |
| D-04 | Fresh agent given only `TESTING.md` plans a web-only and a desktop-shell change | AC-008 | AutoByteus agent in an isolated instance (no tools) | agent run | 14 | plan text citing TESTING.md |
| L-99 | Main app and other worktrees' instances untouched | TESTING rules 2/5 | process | checkpoints | throughout | pids/health |

## Post-Repository Confidence Scorecard

Repository results: R-01 163/163; R-02 35/35 (plus 2 more full runs, see report); R-03 headful 2/2; R-04 doc check clean; new durable stdio test passes.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | AC-006/007/009/010/011 on real Chrome and docs | Electron target, real app confirm, AC-008 | E-01..E-06, D-04 |
| Changed-boundary execution directness | 85% | real Chrome CLI + MCP stdio | Electron | E-01..E-06 |
| Cross-boundary integration realism and mock gap | 82% | real processes | Electron dialog delivery, recorder on Electron | E-03, E-06 |
| Environment, configuration, identity, and fixture fidelity | 85% | own Chrome fixtures | installed-app isolated target | E-00..E-06 |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | undecided/decided/blocked/recovery on Chrome | healthy-connect false positives; load dialogs | E-08, E-09 |
| User-surface, browser, and desktop-shell confidence | 75% | Chrome only | Electron renderer | E-01..E-06 |
| Durable regression coverage quality and relevance | 90% | rules matrix + real suites + new stdio test | Electron checks not durable by nature | — |

- Overall post-repository confidence: 84% (simple average)
- Every critical AC directly proven: `No` (Electron/agent pending) → broader validation required
- Final (execution report): 95.0%, no category below 90%

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: live Electron (isolated instance) via CLI and MCP stdio; real Chrome timing probes; agent dry run
- Specific confidence gap: implementer-only evidence for Electron dialogs; real AutoByteus confirm flow; MCP stdio serialization; false `PAGE_BLOCKED` on healthy but slow connects; agent usability of `TESTING.md`
- Why the selected mode can materially improve confidence: exercises the actual targets named in the requirements (AutoByteus Electron, agent reading the guideline)
- Expected confidence after: ≥ 95%
- Browser-specific decision: real Chrome covered by repository suites; Electron is a distinct target that the repository cannot hold

## Desktop Application Validation Decision

- Desktop framework: Electron (installed 1.4.91-beta.6, isolated). This ticket changes no app code; the changed component (browser-automation) runs from the mcps worktree.
- Effect on the running desktop app: `None` — isolated instance on port 9336; main app and other worktrees' instances are never touched.

## Live Environment And Fixture Plan

- Start: `pnpm --silent isolated-app start --control-port 9336` from the workspace worktree (installed app)
- Evidence: JSON outputs, DOM checks, screenshots (supporting), timing
- Cleanup: stop the instance; remove the temp base worktree; kill own test Chrome

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| E-01..E-06 | live CLI/MCP against an isolated AutoByteus instance | Electron target behavior | needs a packaged AutoByteus app; the mcps repo is app-independent |
| E-07 | base worktree CLI vs branch CLI | byte-identity to the pre-change release | one-off comparison against a historical revision |
| E-08 | 40-tab Chrome timing | healthy connect below the bound | host-performance dependent |
| D-04 | model-backed agent run | AC-008 usability | needs credentials and a model |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Other-tab dialog in Electron | the Electron instance has one window/tab | low: covered on headless + headful Chrome | none |
| Linux / X tools answering dialogs | macOS host | low (docs only) | user |
| `prompt()` inside Electron | Electron does not implement `prompt()` (verified) | none for AutoByteus (no prompt usage) | doc note OBS-B |

## Ambiguities Or Reroute Triggers

No reroute. Non-blocking observations OBS-A..OBS-D and the host-load environment note are recorded in the execution report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (DUR-MCP-DLG)
- Post-repository confidence: 84% → final 95.0%
- Broader validation decision: `Required` — executed, all cases Pass
- Reroute Required Before Validation Execution: `No`
