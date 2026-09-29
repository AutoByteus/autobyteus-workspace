# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-007)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (P-D1..P-D3, via design and review)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-007)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: `evidence/page.html`, `evidence/cdp2.mjs` (non-normative)
- Relevant Solution Revision IDs: SR-006 (superseded), SR-007
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004, Pass, incl. mandatory MP-004 guidance)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003 (superseded), ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Trigger: implementation complete (IR-001), Medium/High → source review
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage / Execution / API-E2E / Delivery artifacts: N/A — not applicable (implementation review)

Reviewed code:

- mcps `/Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline`, branch `codex/project-testing-guideline`, `6b39562..b5fcdda` (commits `38df813`, `b5fcdda`).
- Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline`, branch `codex/project-testing-guideline`, `39e512edd..cd86a0461` (docs commit `1a035ed15`).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required: `Yes`
- Classification evidence or correction required: None. The public CLI/MCP contract of a separately released tool changes, and default dialog semantics change. Confirmed.

## Review Scope

- Changed behavior reviewed:
  - DS-1: own-tab dialog handling, decisions, reporting, `DIALOG_DECISION_REQUIRED`.
  - DS-2: connect-bound split and `PAGE_BLOCKED`.
  - CLI/MCP options; contracts and errors.
  - `TESTING.md` and its links (REQ-006/007).
  - SKILL/README dialog documentation (REQ-011; consistency only).
- Files reviewed:
  - mcps `runtime/{dialogs,session,config}.py`, `application.py`, `policy.py`, `errors.py`, `contracts.py`, `cli.py`, `mcp/tools/{run_script,navigate_to,open_tab}.py`, `SKILL.md`, `README.md`.
  - mcps test diffs (unit + integration), reviewed for readiness only.
  - Workspace `TESTING.md`, `README.md`, both `AGENTS.md`, `docs/isolated-app-instances.md`.
- Reviewer checks:
  - mcps unit suite (`uv run --frozen --extra test pytest tests/unit`): all pass.
  - `TESTING.md` spot-check: every named root/web/ts script exists; README, web README, server README and guide anchors resolve.
  - Real-Chrome, headful and Electron runs not repeated; they are API/E2E's.
- Explicit exclusions: real AutoByteus confirm flows (API/E2E), AC-008 agent walk-through (API/E2E).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-006..REQ-011; DEC-007).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-004 Pass; mandatory MP-004 guidance implemented.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-004 | Confirmed | `TESTING.md` (124 lines): layers/commands, path selection, rules 1–8, links to authoritative docs | — |
| BEH-005 | Confirmed | Links in `README.md` (3 sections), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`; back-link and "Page dialogs" in `docs/isolated-app-instances.md` | — |
| BEH-006 | Confirmed | CLI/MCP → `policy.validate_dialog_option` → `BrowserApplication.<op>` → `_tab_operation` → `BrowserRuntime.session(decision)`. `DialogHandling.attach` runs on every context right after `connect_over_cdp`. `resolve_target`/`open_target` set the page, and the listener compares page identity at event time. Answers are settled before disconnect; reports are read after disconnect. `DIALOG_DECISION_REQUIRED` or an additive `dialogs` field follows (`application.py:463-489`, `dialogs.py`, `session.py:119-132, 168-226`) | — |
| BEH-007 | Confirmed | Existing browser: `connect_timeout_seconds = 8.0`; owned launch keeps 20 s. A timeout while `/json/version` answers → `PAGE_BLOCKED` (exit 3, retryable, `details.targets` from `/json/list`); endpoint down → `BROWSER_UNAVAILABLE` unchanged (`session.py:180-219`) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005 | REQ-008/009, AC-009 | Operational | Agent | Act on a page that asks for confirmation | `run-script`/`navigate` with or without `--dialog` (MCP parity) | Normal | DS-1 | decision applied and reported, or `DIALOG_DECISION_REQUIRED` after an unblock dismissal; alert closed and reported; other tabs untouched | requirements SCN-005, DEC-007 | Supported Normal Scenario | Use |
| SCN-005-E1 | MP-004 | Operational | Agent | Open a URL that raises a dialog on load | `open-tab --url` | Explicit Edge | `open_target()` sets the new page as target before `goto` | dismissed to unblock + `DIALOG_DECISION_REQUIRED`, never left open | ARCH-REV-004 MP-004 | Supported Explicit Edge Scenario | Use |
| SCN-006 | REQ-010, AC-010 | Operational | Agent | Continue after a dialog blocked the browser | any command | Explicit Edge | DS-2 | `PAGE_BLOCKED` ≤ 10 s with remedies; recovery after answering | requirements SCN-006 | Supported Explicit Edge Scenario | Use |
| SCN-001 / SCN-004 | REQ-006/007, AC-006..008 | Operational/User | Agent or human | Learn and choose the test path | `TESTING.md` via README/AGENTS | Normal | docs | correct path, rules, working links | requirements | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C-01 | Listener never detached before disconnect (deviation from DS-1 "detach") | ARCH-REV-004 guidance | every tab operation | detaching would re-enable Playwright's silent auto-dismiss | `session.py:189-191`; review guidance | Reject (no defect) | Required by the governing review guidance and REQ-008 |
| CR-C-02 | MCP structured results carry `"dialogs": null` when no dialog occurred; CLI byte-identical. *Factual correction (CRR-002, API/E2E OBS-A): over real stdio only `navigate_to` returns `null`; the other tab tools omit the key. Both are additive; the disposition is unchanged.* | BEH-006 preserved boundary ("JSON contract additive only"); design guidance "byte-identical" | any MCP tab operation | extra null key in MCP output | `contracts.py` docstring; handoff deviation; SKILL.md documents it | Reject (as finding) | An additive null key satisfies the approved "additive only" contract. The byte-identical guidance cannot be met without changing the tools' declared output types (a larger contract change). The deviation is disclosed and documented |
| CR-C-03 | `from __future__ import annotations` removed from `contracts.py` | engineering contract (TypedDict correctness) | — | with postponed annotations, `NotRequired` was invisible, so every key was required | Python ≥ 3.11; unit + MCP tests pass | Reject (correct fix) | Also makes the pre-existing `ErrorPayload.details` optional as originally intended |
| CR-C-04 | `DIALOG_DECISION_REQUIRED` takes precedence over a failure the unblock dismissal caused | SCN-005 | undecided dialog interrupts the operation | agent is told the actionable cause | `application.py:474-480` | Reject (sound) | The dialog is the cause the agent can act on; the original error stays chained |
| CR-C-05 | `open-tab` failure path closes the new tab while `DIALOG_DECISION_REQUIRED.details.tab_id` still names it | SCN-005-E1 | a dismissed load-time dialog that also makes `goto` fail | agent gets a stale tab id; next use → `TAB_NOT_FOUND` | `application.py:141-165` | Reject | No evidence that a dismissed load-time dialog breaks `goto`. The integration test shows the ordinary path keeps the tab, and the consequence is self-correcting |
| CR-C-06 | Dialog raised on the target page before `set_target` is held; `resolve_page` opens CDP sessions per page (P-D3 hang risk) | SCN-006 class | asynchronous page dialog in the ms window between connect and target resolution | could stall resolution | `dialogs.py:76-92`, `session.py:BrowserSession.resolve_page` | Reject | Artificial timing. Dialogs raised between operations are the approved `PAGE_BLOCKED` class; the review listed the attach window as a residual |
| CR-C-07 | `PAGE_BLOCKED` path chooses the bound by float equality (`connect_timeout == config.connect_timeout_seconds`) rather than the `is_pending_owned` flag | engineering contract (readability) | — | would misclassify only if both bounds were configured equal (not configurable today) | `session.py:210-213` | Reject (as finding) | Readability nit; optional cleanup |
| CR-C-08 | `policy.py` imports `runtime.dialogs.DialogDecision` | dependency direction | — | validator builds a runtime value type; no cycle (runtime imports only `errors`/`contracts`) | import check | Reject | Acceptable: single validation owner returning the owned value type, as the design specifies |
| CR-C-09 | `application.py` at 467 effective lines | size contract | — | under 500; +49 this change | line count | Reject (as finding) | Within limits; note future growth should extract the tab-operation wrapper or per-command groups |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Missing invariant fixed at the session boundary; connect bound split; no broader refactor | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None behavior-defining | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-1 and DS-2 map directly to `_tab_operation` → `session()` → `DialogHandling`, and to the connect phase | — |
| Ownership boundary preservation and clarity | Pass | Session owns the listener lifecycle; commands only set their target through `resolve_target`/`open_target`; one validator; error taxonomy in `errors.py` | — |
| Off-spine concern clarity | Pass | `list_page_targets` serves `PAGE_BLOCKED` details only | — |
| Existing capability/subsystem reuse check | Pass | Reuses `probe_cdp_endpoint`, `resolve_page`, `target_id_for_page` | — |
| Reusable owned structures check | Pass | `DialogReport.to_payload` is the single report shape; `DialogReportPayload` is the single contract type | — |
| Shared-structure/data-model tightness check | Pass | `OpenTabResult` specializes `TabSummary`, so `list-tabs`/`attach-tab` are unchanged | — |
| Repeated coordination ownership check | Pass | `_tab_operation` centralizes report/decision handling for all seven tab operations | — |
| Empty indirection check | Pass | `resolve_target`/`open_target` add target binding | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | `dialogs.py` holds dialog rules only; `session.py` holds connection and blocked classification | — |
| Ownership-driven dependency check | Pass | CR-C-08 acceptable; no cycles | — |
| Authoritative Boundary Rule check | Pass | MCP tools and CLI call only `BrowserApplication`; no caller touches `DialogHandling` directly except through the session | — |
| File placement check | Pass | `runtime/dialogs.py` as designed | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Optional `dialog` (`Literal` in MCP, `choices` in CLI) and `prompt_text`, argument-isomorphic; the error hint differs for commands that cannot decide (review guidance) | — |
| Naming quality and naming-to-responsibility alignment | Pass | `DialogDecision`, `DialogHandling`, `decision_required`, `page_blocked` | — |
| No unjustified duplication in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | SR-006 partial code removed before commit; `settle()` busy-loop fixed properly | — |
| Dead/obsolete code cleanup completeness | Pass | Implicit auto-dismiss removed with no switch | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Unit rules matrix (`test_dialogs.py`), runtime connect-split tests; real-Chrome matrix, `PAGE_BLOCKED` + recovery, MCP parity | — |
| Test fixtures/helpers reasonably reusable, structure coherent | Pass | Dialog fixture pages in `conftest.py`; headful switch in `support.py` | — |
| No stale, duplicated, or compatibility-only tests retained | Pass | `test_application.py`/`test_presentation.py` adapted to the `session(decision)` signature | — |
| API/E2E readiness | Pass | Coverage hints for real AutoByteus confirm flows, AC-010, AC-008 walk-through, stdio MCP | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `application.py` | 467 (+49) | Pass | Pass | Pass | Pass | Accepted (CR-C-09 watch) | None |
| `runtime/session.py` | 230 (+66) | Pass | Pass | Pass | Pass | Accepted | None |
| `runtime/dialogs.py` (new) | 101 | Pass | Pass | Pass | Pass | Accepted | None |
| `policy.py`, `errors.py`, `contracts.py`, `cli.py`, `config.py`, MCP tools | small deltas | Pass | Pass | Pass | Pass | Accepted | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No switch for the old auto-dismiss |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | — |
| Approved persisted-data transition decision is followed | Pass | `Not Affected` |
| No version-specific dual reads/writes or old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (delivered)
- Files: workspace `TESTING.md`, `README.md`, both `AGENTS.md`, `docs/isolated-app-instances.md`; mcps `SKILL.md`, `README.md`. Command names, codes, exit categories, the 8 s bound and the MCP `dialogs: null` note match the implementation.

## Additional Material Premise Validation (When Required)

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-004 | Confirmed | `open_target()` binds the new page before `goto`; tab id read while dialog-free |
| MP-005 | Confirmed (residual) | Headless may cancel other-tab dialogs; documented in SKILL.md |
| MP-003 (SR-006 probe) | No Longer Relevant | Own-tab dialogs are answered inside the connection under SR-007; the probe result is kept as evidence |

No new premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-1/DS-2 traceable end to end, incl. settle-before-disconnect and reports-after-disconnect | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | Session owns listener lifecycle; commands bind only their target; single validator and error owner | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Optional argument-isomorphic options; distinct hints for commands without the option | MCP `dialogs: null` departs from the byte-identical guidance (CR-C-02, accepted) | — |
| `4` | `Separation of Concerns and File Placement` | 9.2 | `dialogs.py` focused; `_tab_operation` removes repetition | `application.py` nearing the size limit (CR-C-09) | Extract on next growth |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | One report shape; `OpenTabResult` specialization keeps other results unchanged | `dialogs` repeated on each result TypedDict (inherent to TypedDict) | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Clear names; docstrings state rules | Float-equality bound selection (CR-C-07) | Use the ownership flag |
| `7` | `API/E2E Readiness` | 9.3 | Rules matrix, `PAGE_BLOCKED`, MCP parity and headful switch in place; Electron checked | Real AutoByteus confirm flows pending | API/E2E |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | Exactly-once answers; other pages untouched; late own-tab dialogs included; blocked classification bounded | Heuristic `PAGE_BLOCKED` (approved residual) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Clean removal of implicit auto-dismiss | — | — |
| `10` | `Cleanup Completeness` | 9.4 | SR-006 partial code removed; no leftovers | — | — |

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

`/api_e2e_engineer`

## Residual Risks

- `PAGE_BLOCKED` is heuristic: a slow healthy connect over 8 s is misreported. The message names both causes and the error is retryable.
- Headless Chrome may cancel other-tab dialogs on disconnect; this is documented.
- A dialog raised in the brief connect/attach window before the listener exists is still auto-dismissed unreported. This was a design-review residual.
- Without a decision, side effects before a dialog may repeat on re-run. This is documented.
- Optional cleanups: CR-C-07 bound selection by flag; CR-C-09 watch `application.py` size.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10 (93/100); all categories ≥ 9.2
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: Classification Medium/High preserved. The six disclosed deviations were each checked: CR-C-01..04 are sound; `decided_by: null` for alert matches the design's alert report; the `settle()` fix is correct.
