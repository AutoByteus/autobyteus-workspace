# Design Spec — Project Testing Guideline + Agent-Answered Dialogs

## Solution And Approval Basis

- Current solution revision ID: `SR-007`
- Approved requirements baseline: `requirements-doc.md` at SR-007 — SR-004 user approval (DEC-001 `TESTING.md`); dialog model DEC-007 chosen by the Solution Designer under explicit user delegation 2026-09-29, superseding SR-006 (DEC-006).
- Behavior-defining supplements: None
- Design status: `Ready` (revision of SR-006, which passed ARCH-REV-003; implementation of the SR-006 dialog part was put on hold)
- Investigation notes: `investigation-notes.md` (Source Log; §SR-003 probes P-D1..P-D3; §SR-006 additions)

## Current-State Read

- Workspace: no root testing guideline before this ticket; `TESTING.md` has been authored (Solution Designer, user request) and awaits links/verification.
- browser-automation: every operation = `BrowserRuntime.session()` → `ChromeLauncher.ensure_available()` → `connect_over_cdp` (≤ 20 s establishment) → operation → disconnect. No dialog listener ⇒ Playwright auto-dismisses dialogs during an operation (P-D1). A dialog open while no operation is connected blocks page attach for every later client ⇒ `BROWSER_UNAVAILABLE` after 20 s (P-D2); a late client cannot answer it (P-D3). Recorder worker keeps dialogs open via a no-op listener. `close_tab` → `page.close()` without `beforeunload`; `navigate` (`page.goto`) does not raise `beforeunload`.
- Consequence for design: a dialog can only be answered by the connection attached when it opens, so the agent's decision must travel with the operation (DEC-007).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` — workspace docs; browser-automation: one runtime module, session wiring, options on two commands (CLI + MCP), result field, two error codes, connect bound split, tests, docs.
- Architectural risk: `High` — public CLI/MCP contract changes (new optional parameters, `dialogs` result field, `DIALOG_DECISION_REQUIRED`, `PAGE_BLOCKED`, shorter connect bound) in a separately released tool; changes default dialog semantics from silent dismiss to "dismiss-to-unblock + fail with decision request".
- Escalation triggers: Electron page dialogs not delivered via the context `dialog` event; healthy existing-browser connects exceeding 8 s; recorder coexistence regressions.

## Intended Change

1. Root `TESTING.md` + links (REQ-006/007).
2. browser-automation: session-level `DialogHandling` applying the operation's decision to own-tab dialogs, reporting every own-tab dialog (REQ-008); optional `--dialog`/`--prompt-text` on `run-script`/`navigate`; without a decision → dismiss to unblock + `DIALOG_DECISION_REQUIRED`; `alert` closed + reported (REQ-009); `PAGE_BLOCKED` ≤ 10 s (REQ-010); docs (REQ-011).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-004/005 | REQ-006/007; AC-006..008 | Testing guidance | `TESTING.md` + links | docs |
| BEH-006 | REQ-008/009; AC-009 | Own-tab dialog during an operation | Decision applied or decision requested; always reported | DS-1 |
| BEH-007 | REQ-010; AC-010 | Browser blocked by a dialog left open | `PAGE_BLOCKED` ≤ 10 s | DS-2 |
| — | REQ-011; AC-011 | Docs | Dialog section | docs |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` + error-behavior fix
- Current design issue found: `Yes` — `Missing Invariant`: dialogs answered by an implicit library default invisible to callers; connect bound conflates launch and attach.
- Refactor needed now: `No` structural refactor; add `DialogHandling` at the session boundary and split the connect bound.
- Evidence: P-D1..P-D3; `runtime/session.py`; `chrome_launcher.py:262-292`; `application.py:157-165, 330-360`; `recording/worker.py:165-167`.
- Residual risk: `PAGE_BLOCKED` heuristic (REQ-010 fallback).

## Legacy Removal Policy

- Implicit auto-dismiss removed (listener always registered). No compatibility switch.

## Persisted Data / State Transition Decision

- `Not Affected`.

## Data-Flow Spines

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-1 | Primary | CLI/MCP tab operation (+ optional decision) | Result with `dialogs`, or `DIALOG_DECISION_REQUIRED` | `BrowserApplication` → `BrowserRuntime.session(decision)` → `DialogHandling` |
| DS-2 | Primary | Operation against a browser blocked by a dialog | `PAGE_BLOCKED` ≤ 10 s | `BrowserRuntime.session()` connect phase |

- DS-1: `CLI/MCP → validate_dialog_option → BrowserApplication.<op>(…, decision) → BrowserRuntime.session(decision) → connect → DialogHandling.attach(context) (immediately after connect) → resolve target page → operation → Playwright 'dialog' on page P:`
  - `P ≠ target page` → do nothing (dialog stays open for its owner); not reported.
  - `alert` on target → `accept()`; report `{outcome: "closed"}`.
  - `confirm|prompt|beforeunload` on target with decision → `accept(prompt_text or default_value)` / `dismiss()`; report `{outcome: "accepted"|"dismissed", decided_by: "agent"}`.
  - same without decision → `dismiss()` to unblock; report `{outcome: "dismissed", decided_by: "unblock"}`; mark `decision_required`.
  - `→ operation completes (the page continues with the answer) → if decision_required: raise DIALOG_DECISION_REQUIRED {tab_id, dialogs:[…]} else result + dialogs (field only when non-empty) → detach → disconnect`
- DS-2: `session() → ensure_available (HTTP) → existing browser: connect_over_cdp bounded by connect_timeout_seconds = 8 s (newly launched owned Chrome keeps 20 s) → timeout while /json/version answers → PAGE_BLOCKED (exit 3, retryable; details: page targets id/url/title) ; endpoint down → BROWSER_UNAVAILABLE (unchanged)`

## Ownership Map

- `runtime/dialogs.py` (new) — `DialogDecision` {answer: accept|dismiss, prompt_text?} (absent = no decision); `DialogHandling` (attach/detach one context listener; target-page scoping; apply rules above; answer each own-tab dialog exactly once; record `DialogReport` {tab_id, type, message, default_value, outcome, decided_by}; expose `decision_required`).
- `BrowserRuntime.session(decision=None, target=None)` — attaches `DialogHandling` right after connect; target set once the page is resolved (dialogs before target resolution on the target page are handled by the same rule once the page is known — listener checks page identity at event time); connect bound split; `PAGE_BLOCKED`.
- `BrowserApplication` — passes decisions for `run_script`/`navigate`; all tab operations use the session's `DialogHandling` (no decision) and surface `dialogs` / `DIALOG_DECISION_REQUIRED`.
- `policy.py` — `validate_dialog_option(dialog, prompt_text)`: `dialog ∈ {accept, dismiss}`; `prompt_text` only with `accept`; ≤ 10 000 chars → else `INVALID_ARGUMENT`.
- `errors.py`/`contracts.py` — `DialogReport`; `NotRequired[dialogs]` on tab-operation results; `DIALOG_DECISION_REQUIRED` (exit 5, not retryable as-is; details carry the reports; message: "The page opened a <type> dialog: \"<message>\". It was dismissed only to unblock the page. Re-run the action with --dialog accept or --dialog dismiss (and --prompt-text for prompts)."); `PAGE_BLOCKED` (exit 3, retryable).
- `close_tab` — unchanged (no `beforeunload`; truthful `closed:true`). Recorder worker — unchanged.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| CLI `run-script`, `navigate` | `--dialog {accept,dismiss}`, `--prompt-text TEXT` (optional) |
| MCP `run_script`, `navigate_to` | optional `dialog: "accept"\|"dismiss"\|null`, `prompt_text: str\|null` (argument-isomorphic) |
| All tab-operation results | additive `dialogs` (only when ≥ 1 own-tab dialog) |
| Errors | `DIALOG_DECISION_REQUIRED`; `PAGE_BLOCKED`; `INVALID_ARGUMENT` for bad options; `BROWSER_UNAVAILABLE` unchanged when the endpoint is down |
| Tool list / other commands | unchanged |

## Final File Responsibility Mapping

autobyteus-mcps (`browser-automation/`):

| File | Change |
| --- | --- |
| `src/browser_automation/runtime/dialogs.py` | Add — `DialogDecision`, `DialogHandling`, `DialogReport` |
| `src/browser_automation/runtime/session.py`, `runtime/config.py` | Modify — attach/detach, target scoping, connect split (`connect_timeout_seconds = 8.0`), `PAGE_BLOCKED` |
| `src/browser_automation/application.py` | Modify — decisions for `run_script`/`navigate`; `dialogs` / `DIALOG_DECISION_REQUIRED` for all tab operations |
| `src/browser_automation/policy.py`, `errors.py`, `contracts.py` | Modify |
| `src/browser_automation/cli.py`; `mcp/tools/run_script.py`, `mcp/tools/navigate_to.py` | Modify — options |
| `tests/unit/*`, `tests/integration/*` | Add — rules matrix (alert/confirm/prompt/beforeunload × decision/none), own-tab scoping (other tab untouched), reporting shape, `PAGE_BLOCKED` ≤ 10 s + recovery, recorder coexistence, MCP parity, Electron check (a `window.confirm` in an isolated AutoByteus instance) |
| `SKILL.md`, `README.md` | Modify — dialog section |

autobyteus-workspace: `TESTING.md` (authored; rule 7 updated to the SR-007 model), links in `README.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`, back-link + dialog note in `docs/isolated-app-instances.md`.

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| Implicit auto-dismiss | Rejected (silent) |
| Hard-coded default answer (accept or dismiss as the outcome) | Rejected (user: agent decides) |
| Never answer / `PAGE_DIALOG_OPEN` (SR-006) | Superseded — agent cannot answer through the tool; on-screen only |
| Dialog keeper process + `answer-dialog` (option 2) | Rejected — extra background process and tools |
| `close-tab` running `beforeunload` | Rejected (ARCH-DR-001 option a) |
| WebSocket dependency for per-tab blocked detection | Rejected (REQ-010 fallback) |

## Change Sequence

mcps: `dialogs.py` → session wiring + connect split + `PAGE_BLOCKED` → application/contracts/policy/errors → CLI/MCP options → tests → docs. Workspace: `TESTING.md` rule 7 (done) → links.

## Key Tradeoffs / Risks

- Without a decision the action is performed with a cancelled dialog and must be repeated with the decision; side effects before the dialog may repeat — documented; agents should pass `--dialog` when an action is expected to confirm.
- `PAGE_BLOCKED` is heuristic; dialogs left open (other tabs, between operations) need on-screen answering.

## Guidance For Implementation

- Register the listener immediately after connect; decide per event using page identity; answer each own-tab dialog exactly once; never touch other pages' dialogs.
- `prompt` accept without `--prompt-text` uses the dialog's default value.
- `beforeunload` arises only via page-initiated navigation (e.g., `run-script` setting `location`); same rules.
- Keep outputs byte-identical when no dialog occurred.
