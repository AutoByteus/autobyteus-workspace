# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-007`
- Package identifier: `project-testing-guideline`
- Request: AutoByteus workspace root testing guideline (`TESTING.md`) and links to it; native JavaScript dialog handling in browser-automation (autobyteus-mcps)
- Requirements owner: Solution Designer
- Date: 2026-09-29
- Approval state and reference: Approved — SR-004 baseline approved by user 2026-09-29 ("Approved."); dialog model SR-007 (DEC-007) chosen by the Solution Designer under explicit user delegation 2026-09-29 ("Is it possible to enhance the browser automation tool so that the agent is able to answer … that would be the best"; "Which option do you choose?"), superseding SR-006 DEC-006. DEC-001 `TESTING.md` approved.
- Exact approved baseline: SR-007
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: The AutoByteus workspace has no single testing guideline. Testing knowledge is scattered across root README sections, sub-project READMEs and `AGENTS.md` files, package scripts, browser probes and the isolated-desktop-instance guide. The team's testing skills are being made project-neutral by their maintainers (separate request, SR-002) and will look for a project testing guideline at the repository root; the workspace has none.
- Desired outcome: One root `TESTING.md` tells humans and agents how this project is tested: layers, commands, which validation path to use when (including isolated desktop instances), and the safety rules — linking to the authoritative detailed docs.
- Success: An API/E2E agent (or a human) reading only `TESTING.md` can choose and run the right test path for a change, including a real desktop test through an isolated instance.

## Problem 2 (SR-003): native JavaScript dialogs in browser-automation

- Problem: `alert`/`confirm`/`prompt`/`beforeunload` dialogs are silently auto-dismissed during a browser-automation operation (P-D1: a "Delete?" confirm became Cancel with `ok:true`), and a dialog that opens between operations makes every later command fail after ~20 s with a misleading `BROWSER_UNAVAILABLE` (P-D2). A later connection cannot answer such a dialog (P-D3).
- Desired outcome: agents see every dialog their action raises and choose the answer; a tab blocked by a dialog is reported quickly and accurately with the remedies.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-004 | Doc | SCN-001, SCN-004 | No root testing guideline | Root `TESTING.md` covering layers, commands, path selection, rules | Existing README / sub-project docs / isolated-instance guide remain authoritative for their details |
| BEH-006 | Operational | SCN-005 | Dialogs raised during an operation are auto-dismissed silently (P-D1) | The agent answers dialogs through the tool: an optional per-command decision is applied and reported; without a decision the tool never guesses — it only unblocks the page and asks for a decision (`DIALOG_DECISION_REQUIRED`) | Existing commands, JSON contract (additive only), exit categories |
| BEH-007 | Operational | SCN-006 | Dialog open → every later command fails after ~20 s with misleading `BROWSER_UNAVAILABLE` (P-D2) | Fast (≤ 10 s) `PAGE_BLOCKED` naming the dialog situation and remedies | — |
| BEH-005 | Doc | SCN-004 | No entry point to testing guidance | README and `AGENTS.md` files link to `TESTING.md`; isolated-instance guide links back | Existing sections unchanged apart from links |

(BEH-001..003 — skill changes — moved out of scope in SR-002.)

## Scope Guardrail

### In-Scope Use Cases

- UC-001: An agent validating a change in this repository finds and follows `TESTING.md`.
- UC-004: A human or agent learns how the workspace is tested from one root document.
- UC-005: An agent's action raises a native page dialog; the agent answers it through browser-automation (decision passed with the action, or re-run after `DIALOG_DECISION_REQUIRED`).
- UC-006: An agent meets a browser blocked by an open dialog and gets an accurate error with remedies.

### Out Of Scope

- Team skills (`autobyteus-agents`) — handled by the agent-team maintainers via the user's separate request (SR-002).
- A background dialog-holding process or an `answer-dialog` command (option 2 rejected, SR-007); answering dialogs that opened between operations or in other tabs (left open; `PAGE_BLOCKED`, on-screen answering).
- OS dialogs (file pickers, print, permission prompts); new MCP tools; changing `close-tab` (it closes without running `beforeunload`, as today); a `/json/close` recovery for blocked headless tabs (separate ticket candidate).
- Runtime code, test code, CI.
- Testing guidelines for other repositories (autobyteus-mcps, autobyteus-agents).
- Rewriting existing README/testing sections beyond adding links.

### Non-Goals

- Duplicating detailed procedures that already live in other docs.

### Preserved Behavior Boundary

- Existing docs keep their content; only links are added.

### Review Authority

- Standard: blocking findings must cite a REQ/AC/preserved-behavior ID; scope changes are Requirement Gaps needing user approval.

## Requirements

| ID | Requirement | BEH | Priority |
| --- | --- | --- | --- |
| REQ-006 | A root `TESTING.md` in the AutoByteus workspace describes: (a) the test layers and their commands — package unit/integration suites (e.g., Vitest in `autobyteus-web`, server tests), server E2E and live/real-provider E2E including credential import, browser dev-path probes (`autobyteus-web/tests/e2e/*-probe.mjs`), packaged Electron E2E harness, isolated desktop instances driven by the browser-automation skill (actions, screenshots, recordings); (b) when to use which path — at least web-only renderer/client-server behavior, desktop-shell/lifecycle/packaging behavior, and full real-product journeys; (c) rules — unreleased changes are tested on worktree builds (the installed app does not contain them), never test against the user's running AutoByteus, separate control ports for parallel runs, keys via the existing importer, clean up what you started, screenshots/recordings support but do not replace assertions. It links to the authoritative detailed sources instead of duplicating them. | BEH-004 | Must |
| REQ-007 | `TESTING.md` is discoverable: linked from the root `README.md` (testing-related sections), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`; `docs/isolated-app-instances.md` links back to it. | BEH-005 | Must |

| REQ-008 | browser-automation never answers a native page dialog silently or by a hard-coded choice for the agent: every dialog raised in the operation's own tab during an operation is reported in that operation's JSON (tab id, type, message, default prompt value, outcome). Dialogs in other tabs are never touched. | BEH-006 | Must |
| REQ-009 | `run-script` and `navigate` accept an optional decision — `--dialog accept\|dismiss` and `--prompt-text <text>` (only with accept) in the CLI; optional `dialog`/`prompt_text` in MCP — applied to `confirm`, `prompt` and `beforeunload` dialogs raised in the operation's own tab. Without a decision, such a dialog is dismissed only to unblock the page and the operation fails with `DIALOG_DECISION_REQUIRED` (type, message, default value, hint to re-run with `--dialog`). `alert` (OK only) is closed and reported without failing. Operations without the option (`read-page`, `screenshot`, …) follow the no-decision rule. No new tools; `close-tab` unchanged. | BEH-006 | Must |
| REQ-010 | When the browser is blocked by an open page dialog (opened between operations or left from REQ-009), commands fail within ≤ 10 s with `PAGE_BLOCKED` explaining the likely open page dialog and remedies (answer it in the window — user or OS-level tools; otherwise close the tab) instead of `BROWSER_UNAVAILABLE`. If a reliable distinction from a hung page is impossible, the message names both (design decides; evidence recorded). Headless/owned Chrome has no window to answer in — documented. | BEH-007 | Must |
| REQ-011 | browser-automation `SKILL.md`/README document the decision option, `DIALOG_DECISION_REQUIRED`, reporting, `PAGE_BLOCKED` and remedies (dialogs left open between operations or in other tabs are answered on screen by the user or OS-level tools), headless limitation, `close-tab` unchanged, recorder unchanged. `TESTING.md` summarizes the same. | BEH-006/007 | Must |

(REQ-001..REQ-005 — skill changes — withdrawn from this ticket in SR-002.)

## Acceptance Criteria

| AC ID | REQ | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-006 | REQ-006 | Read `TESTING.md` | Covers every listed layer, the path-selection guidance and every rule; every named command/script exists in the repository; every link resolves; no large duplicated passages | Doc review against repository (script existence, link check) |
| AC-007 | REQ-007 | Open README / both `AGENTS.md` / isolated-instance guide | Each links to `TESTING.md` | Doc review |
| AC-009 | REQ-008, REQ-009 | `run-script` click raising (a) `confirm` with no option, (b) `--dialog accept`, (c) `--dialog dismiss`, (d) `prompt` with accept + text, (e) `alert`; (f) a `confirm` open in another tab | (a) `DIALOG_DECISION_REQUIRED` with message, page saw cancel; (b) page sees `true`, result lists the dialog as accepted; (c) `false`, reported; (d) prompt receives the text; (e) success with the alert reported; (f) untouched. Same via MCP. Tool list unchanged. | Real-Chrome integration tests + Electron check |
| AC-010 | REQ-010 | Dialog open (between operations or after AC-009), then `list-tabs`/`read-page` | `PAGE_BLOCKED` within ≤ 10 s with remedies; after the dialog is answered, commands work again | Real-Chrome integration test |
| AC-011 | REQ-011 | Read SKILL.md/README/TESTING.md | Decision option, codes, reporting, remedies, headless and close-tab notes documented | Doc review + tool list check |
| AC-008 | REQ-006 | An agent given only `TESTING.md` plans validation for (1) a web-only UI change and (2) a desktop-shell change | Plans pick the browser dev path for (1) and an isolated desktop instance on a worktree build for (2), citing `TESTING.md` | Reviewer walk-through (agent dry run optional) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Steps | Outcome | Validity | Related |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | API/E2E agent | Validate a change with the right surface | find root `TESTING.md` → plan per guideline → execute | Correct surface, guideline cited | Supported Normal | REQ-006; AC-006, AC-008 |
| SCN-005 | Operational | Agent | Delete an item that asks for confirmation | helper click with `--dialog accept` → result reports the accepted dialog (or: click without option → `DIALOG_DECISION_REQUIRED` → re-run with the decision) | Item deleted per the agent's decision | Supported Normal | REQ-008/009; AC-009 |
| SCN-006 | Operational | Agent | Continue after a dialog blocked the browser | next command → `PAGE_BLOCKED` → dialog answered on screen → continue | Accurate error, recovery | Supported Explicit Edge (dialogs raised asynchronously or left open) | REQ-010; AC-010 |
| SCN-004 | User | Human / agent | Learn how the workspace is tested | README / AGENTS.md → `TESTING.md` | One entry point | Supported Normal | REQ-006/007; AC-006/007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`

## Quality And Non-Functional Requirements

| ID | REQ/AC | Area | Constraint |
| --- | --- | --- | --- |
| QR-002 | REQ-006 | Operability | Concise (target ≤ ~200 lines); links instead of copies |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`

## External Contracts And Dependencies

| Dependency | Constraint |
| --- | --- |
| autobyteus-mcps repository (browser-automation) | Separate branch/finalization (`origin/main`); CLI+MCP share `BrowserApplication` |
| Project-neutral team skills (maintained separately) | Expect a root `TESTING.md` (name aligned with the user's request to the maintainers) |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-002 | Maintainers' skill change looks for root `TESTING.md` / `TESTING*.md` | Per the request text sent by the user |

## Open Decisions And Questions

| ID | Question | Recommendation | Status |
| --- | --- | --- | --- |
| DEC-001 | File name | `TESTING.md` at repository root (matches the request sent to the skill maintainers) | Decided — approved |
| DEC-004 | Default answer when the agent gives no dialog option | Superseded (SR-006): the tool never answers dialogs | Superseded |
| DEC-005 | How the agent chooses the answer | Reinstated in SR-007 as part of DEC-007 (optional `--dialog`/`--prompt-text` on `run-script`/`navigate`; not on `close-tab`) | Decided (SR-007) |
| DEC-006 | Dialog model (SR-006) | Never answer / `PAGE_DIALOG_OPEN` | Superseded by DEC-007 |
| DEC-007 | Dialog model (SR-007) | Option 1: agent decides via optional `--dialog`/`--prompt-text` on `run-script`/`navigate`; without a decision → unblock (dismiss) + `DIALOG_DECISION_REQUIRED`; alert closed + reported; other tabs untouched; `PAGE_BLOCKED` kept. Rationale: agent answers through the tool on every platform (incl. macOS, headless, Electron), deterministic, no extra process; X tools remain for OS dialogs. Rejected option 2 (dialog keeper + `answer-dialog`): extra background process and tools | Decided — Solution Designer under user delegation (SR-007) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-006 | UC-001, UC-004 | BEH-004 | AC-006, AC-008 | SCN-001, SCN-004 |
| REQ-007 | UC-004 | BEH-005 | AC-007 | SCN-004 |
| REQ-008 | UC-005 | BEH-006 | AC-009 | SCN-005 |
| REQ-009 | UC-005 | BEH-006 | AC-009 | SCN-005 |
| REQ-010 | UC-006 | BEH-007 | AC-010 | SCN-006 |
| REQ-011 | UC-005, UC-006 | BEH-006/007 | AC-011 | SCN-005/006 |

## Readiness Check

- Content ready for user approval: `Yes`
- User approval received: `Yes` (SR-004; SR-007 under explicit user delegation)
