# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/requirements-doc.md` (Approved, SR-004)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: `evidence/page.html`, `evidence/cdp2.mjs` (probe P-D3 evidence, non-normative)
- Relevant Solution Revision IDs: SR-003, SR-004, SR-005
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4 (ARCH-REV-002 = withdrawn trigger, no result)
- Trigger: `Architecture Design Complete` from `/solution_designer` (SR-005)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 4
- Round-4 trigger: SR-007 (persisted 10:12–10:13). DEC-007 was chosen by the Solution Designer under explicit user delegation and supersedes SR-006's never-answer model:
  - optional `--dialog accept|dismiss` / `--prompt-text` on `run-script`/`navigate` (MCP parity);
  - session-level `DialogHandling` scoped by page identity: other pages untouched; `alert` closed and reported; decision applied and reported; no decision → dismiss only to unblock + `DIALOG_DECISION_REQUIRED` carrying the reports;
  - additive `dialogs` field.

  Unchanged: `PAGE_BLOCKED`/8 s, `close-tab` (option a), recorder, no new tools. `TESTING.md` rule 7 (l.92-98) matches. mcps `application.py` `open_tab` = `context.new_page()` → `page.goto` (so the new page is the operation's own tab).
- Round-4 supersession note: sections written for SR-006 (`DialogWatch`, `PAGE_DIALOG_OPEN`, race, MP-003 own-tab persistence) are superseded by the SR-007 verdict in §Review Decision.
- Round-3 trigger: SR-006 revised package (persisted 09:55–09:56). The dialog model is now DEC-006, never-answer, decided under explicit user delegation:
  - one context `dialog` listener that never calls accept/dismiss;
  - own-tab race → `PAGE_DIALOG_OPEN` ≤ 5 s, dialog left open;
  - 8 s connect bound → `PAGE_BLOCKED` naming dialog or hung page, with the headless note;
  - no new arguments or tools; DEC-004/005 superseded;
  - `close-tab` unchanged (ARCH-DR-001 option a);
  - ARCH-DR-002 artifact repairs.

  `TESTING.md` (119 lines, authored by the Solution Designer) exists and its dialog rule (l.92-93) matches DEC-006.
- Round-3 supersession note: the round-1 structural tables below were written against SR-005. Where they mention `--dialog`/`prompt_text`/`DialogHandling`/`dialogs[]`, read them as replaced by the SR-006 `DialogWatch` model; the SR-006 verdict is in §Review Decision.
- Round-2 trigger: message from `/solution_designer` announcing SR-006 (DEC-004 changed to accept-by-default; REQ-009, AC-009(a), SCN-005, design `DialogPolicy`/interface/guidance updated; SR-006 record). Verified on disk at 09:48+: `requirements-doc.md` (09:44), `design-spec.md` (09:45), `solution-revision-record.md` (09:45) are unchanged since round 1. No `SR-006` string exists in any ticket artifact; DEC-004 still reads "Dismiss"; design still says "default dismiss".
- Current-State Evidence Basis:
  - Workspace @ `39e512edd`: root/web/server/ts `package.json` scripts. Every command named in the TESTING.md outline exists: `test:e2e`, `test:e2e:real(:preflight)`, `secrets:import`, `isolated-app`; web `test`, `test:nuxt`, `test:electron`, `test:e2e:*` probes, `test:e2e:electron(:isolation)`, `test:e2e:isolated-app`; server/ts `test`.
  - Workspace docs: `autobyteus-web/tests/e2e/*-probe.mjs`, both `AGENTS.md`, `docs/isolated-app-instances.md`.
  - mcps @ `6b39562` (Playwright 1.55): `application.py:157-165` (`close_tab` = `page.close()` with default `run_before_unload=False`, returns `closed: True`); `navigate` = `page.goto(...)`; `recording/worker.py:164-167` (no-op context `dialog` listener); `presentation/demo_helper.js:306,369-374` (helper click dispatched synchronously inside the awaited `run_script` promise).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High` (public CLI/MCP contract of a separately released tool; default dialog semantics; new error code; connect-bound change)
- Classification rationale reviewed: confirmed
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (with one design gap on BEH-006 for `close-tab`; see ARCH-DR-001)
- Approved requirements / intended behavior understood: Yes.
  - Root `TESTING.md` plus links (REQ-006/007).
  - Every in-operation dialog is reported and answered per an optional per-command policy, default dismiss (REQ-008/009, DEC-004/005).
  - A between-operations blocked tab gets a fast, specific or dialog-naming error in ≤ 10 s (REQ-010).
  - Docs (REQ-011).
  - No new tools; existing commands, JSON contract and exit categories preserved (BEH-006 Preserved).
- Relevant existing behavior and evidence confirmed: Yes (P-D1..P-D3 are consistent with the session code: no dialog listener → Playwright auto-dismiss; a blocked page stalls `connect_over_cdp`).
- Scope guardrail confirmed: Yes (answering between-operation dialogs, OS dialogs and new tools are out of scope)
- Every prospective blocking `Design Impact` finding is traceable: `Yes`
- Remaining material ambiguity: `close-tab` dialog semantics (ARCH-DR-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-004 | Doc | Pass | Pass | Pass (outline covers every REQ-006 layer, path and rule; commands verified to exist) | Confirmed | — |
| BEH-005 | Doc | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass for `run-script`/`navigate`; `close-tab` unspecified | Pass | Fail for `close-tab`: the option has no dialog source unless `close_tab` changes to run `beforeunload`, which would alter an existing command's outcome | Needs Correction | ARCH-DR-001 |
| BEH-007 | Operational | Pass (REQ-010 fallback clause used explicitly) | Pass (P-D2/P-D3) | Pass (DS-2) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/page.html`, `evidence/cdp2.mjs` | Pass | Pass | Pass | Pass | Pass (evidence only) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | design-spec §Task Design Health Assessment | — |
| Root cause explicit and evidence-backed | Pass | `Missing Invariant`: no owner decides dialog answers. The connect bound conflates launch with attach. Evidence P-D1..P-D3, `session.py`. | — |
| Refactor decision explicit | Pass | No structural refactor; one owned concern added to the session boundary | — |
| Supported by design sections | Pass | `runtime/dialogs.py`, `session(dialog_policy)`, config split | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Governing Owner Clear? | Subject Naming Clear? | Ownership Clear? | Off-Spine Concerns Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-1 in-operation dialogs | Primary | Pass | Pass | Pass (CLI/MCP → `BrowserApplication` → `BrowserRuntime.session` → `DialogHandling`) | Pass | Pass | Pass | Pass (close-tab semantics: ARCH-DR-001) |
| DS-2 blocked tab | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear? | Internals Stay Internal? | Bypass Risk Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `BrowserRuntime.session(dialog_policy)` | Pass | Pass | Pass | Pass | Listener attach/detach owned by the session, never by commands |
| `BrowserApplication` | Pass | Pass | Pass | Pass | Commands pass a policy; results get `dialogs` |
| Recorder worker | Pass | Pass | Pass | Pass | Unchanged; keeps its own no-op listener |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| browser-automation runtime/application/tools | Pass | Pass | Pass | Pass | No new dependency (HTTP `/json/list` only) |

## Interface Boundary Verdict

| Interface | Subject Clear? | Responsibility Singular? | Identity Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `--dialog`/`--prompt-text` (CLI) and `dialog`/`prompt_text` (MCP) on `run-script`, `navigate` | Pass | Pass | Pass | Low | Pass |
| Same on `close-tab` | Fail (what it answers is undefined) | Pass | Pass | Medium | Fail (ARCH-DR-001) |
| Additive `dialogs[]` result field | Pass | Pass | Pass | Low | Pass (recommendation: include `tab_id`, see Residual Risks) |
| `PAGE_BLOCKED` error | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Area Checked? | Reuse / Extension Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Dialog events | Pass | Pass (Playwright context `dialog`, available in 1.55) | Pass (`runtime/dialogs.py`) | Pass | — |
| Target details | Pass | Pass (`/json/list`) | N/A | Pass | — |
| Argument mapping | Pass | Pass (`docs/mcp-to-cli-mapping.md`) | N/A | Pass | — |
| Testing knowledge | Pass | Pass (link, don't duplicate) | Pass (`TESTING.md`) | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Allocation Clear? | Decision Sound? | Supports Right Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `browser_automation/runtime` | Pass | Pass | Pass | Pass | — |
| Workspace root docs | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Dialog option validation | Pass | Pass (`policy.validate_dialog_option`) | Pass | Pass | One validator for three commands and both surfaces |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `DialogPolicy {answer, prompt_text}` | Pass | Pass | Pass | N/A | Pass | — |
| `DialogReport {type, message, default_value, answer, prompt_text_supplied}` | Pass | Pass | Pass | N/A | Pass | See the `tab_id` recommendation |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| mcps mapping (dialogs, session, config, launcher, application, policy, contracts/errors, cli, tools, tests, docs) | Pass | Pass | Pass | Pass | — |
| Workspace mapping (`TESTING.md`, README, two `AGENTS.md`, isolated-app guide) | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear? | Folder Matches Owner? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime/dialogs.py` | Pass | Pass | Low | Pass | — |
| Root `TESTING.md` | Pass | Pass | Low | Pass | Matches DEC-001 |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Implicit Playwright auto-dismiss | Pass | Pass (explicit policy, same default, reported) | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Dialog handling | No | Pass | Pass | `dialogs` field added only when non-empty (additive contract, not a legacy path) |

## Persisted-Data Transition Verdict (When Applicable)

N/A — no stored data (`Not Affected`, confirmed).

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| mcps then workspace | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Option shapes, result field, error message | Yes | Pass | Pass (rejection log) | Pass | — |
| `beforeunload` per command | Yes | Fail (only "accept = leave, dismiss = stay"; no command-level meaning for `close-tab`/`navigate`) | N/A | Fail | ARCH-DR-001 |

## Material Premise Validation (Only When Needed)

### `MP-001` — `beforeunload` raised by `close-tab` or `navigate`

- Related requirement: REQ-008/REQ-009 (`close-tab`, `navigate` listed), BEH-006 Preserved ("Existing commands, JSON contract")
- Initiating basis kind: `User`
- Independent trigger: an agent closes or navigates away from a tab whose page registers a `beforeunload` handler (common for editors and forms with unsaved changes), using `close-tab` / `navigate`.
- Forward path, current code:
  - `close_tab` calls `page.close()` with Playwright's default `run_before_unload=False`, so `beforeunload` never runs; the tab always closes and the result is `closed: true`.
  - `navigate` uses `page.goto`, whose CDP navigation does not dispatch `beforeunload` either.
  - `beforeunload` is reachable through `run-script`-initiated navigation (e.g., a helper click on a link, `location.reload()`).
- Consequence: the design attaches `--dialog` to `close-tab` and describes `beforeunload` "accept = leave, dismiss = stay" without saying whether `close-tab` starts running `beforeunload`.
  - If it does not, the `close-tab` option is inert, and the docs/ACs imply otherwise.
  - If it does (`run_before_unload=True`), the default `dismiss` makes an existing command stop closing such tabs. And because `page.close(run_before_unload=True)` does not wait for the close, `closed: true` would be reported while the tab stays open. That changes a preserved outcome and falsifies the result.
- Reachability: `Reachable` (the trigger exists; the consequence depends on the unspecified choice)
- Review consequence: ARCH-DR-001.

### `MP-002` — An unrelated tab raises a dialog during an operation that uses `--dialog accept`

- Initiating basis: timing coincidence. Another page in the user's browser raises a timer-driven `confirm` during the ~1 s operation window of a `run-script --dialog accept` on a different tab.
- Reachability: `Technically Possible but Unsupported/Contrived` (it depends on coincidental timing; no workflow targets it). Today such a dialog is silently dismissed.
- Review consequence: no finding. Recommendation (non-blocking): apply the caller's policy only to dialogs whose page is the operation's tab, answer others with the default, and include `tab_id` in each `DialogReport`. This costs little, and it keeps an explicit `accept` from reaching pages the agent did not target.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| `close-tab` dialog semantics | Affects an existing command's outcome and the truth of its result | ARCH-DR-001 | Open |

## Review Decision

- **`Pass`** (round 4, SR-007).
  - **Behavior basis.** REQ-008..011 and AC-009..011 are coherent with DEC-007, and the user's delegation and request are quoted, so they are not reopened.
  - **REQ-008.** "Never a hard-coded choice" is satisfied: without a decision, the dismissal only unblocks the page, the operation fails with `DIALOG_DECISION_REQUIRED`, and the agent re-runs with its decision.
  - **DS-1 needs no race.** The handler answers each own-tab dialog once inside the operation's connection, the awaited Playwright call resumes, and the result or error carries the reports. This removes SR-006's abandoned-evaluation handling, and own-tab dialogs no longer depend on surviving a disconnect.
  - **DS-2 and the rest are unchanged.** DS-2, ownership (session-owned `DialogHandling`, single `validate_dialog_option`, error taxonomy in `errors.py`), interfaces (two commands gain optional parameters; the tool list is unchanged; `dialogs` is additive; outputs are byte-identical when no dialog occurs) and the persisted-data decision (`Not Affected`) all pass.
- ARCH-DR-001/002 remain resolved (`close-tab` unchanged; artifacts consistent).

## Findings

None open.

## Classification

N/A (Pass)

## Recommended Recipient

`/implementation_engineer` (primary; the SR-006 dialog hold is lifted by this pass for the SR-007 model); informational notice to `/solution_designer`

## Material Premise Validation (Round 4)

### `MP-004` — A dialog raised by the page `open-tab` creates

- Trigger: an agent runs `open-tab <url>` for a page that shows `alert`/`confirm` on load (a supported command on arbitrary URLs).
- Path: `open_tab` → `context.new_page()` → `page.goto(url)`. The dialog fires on the new page during `goto`.
- Consequence if the new page is not treated as the operation's own target: the "other page" rule leaves the dialog open. The disconnect then leaves every later command `PAGE_BLOCKED`; in headless or owned Chrome there is no window to answer it, and `close-tab` cannot connect.
- Reachability: `Reachable`
- Review consequence: the approved rules already cover this, because the new tab is the operation's own tab (REQ-009). Implementation must set `DialogHandling`'s target to the page returned by `new_page()` before `goto`. This is recorded as mandatory implementation guidance; the design needs no change.

### `MP-005` — A dialog in another tab raised during an operation, then the operation disconnects

- The dialog is deliberately untouched (REQ-008), so its survival after disconnect only matters for other tabs. Headful Chrome and Electron keep it for the user. Headless Chrome may cancel it on detach (Chromium cancels pending dialogs when no dialog manager exists); that would be Chrome's behavior, not the tool's answer.
- Reachability: trigger `Reachable`; consequence `Unclear` (headless only; low impact)
- Review consequence: residual. Validate on headless and document if Chrome cancels it.

## Implementation Guidance (from this review)

- **Mandatory (MP-004):**
  - For `open-tab`, set the target to the new page before navigation.
  - For `navigate`/`run-script`, set it from the resolved `tab_id` page.
  - Compare page identity by object (`dialog.page is target_page`), or by target ids cached before any dialog. Do not open a new CDP session on a page whose dialog is open to compute its id (P-D3: such sessions hang).
- Keep the listener registered until the Playwright client has stopped; do not detach before disconnect. With no listener, Playwright auto-dismisses silently, contrary to REQ-008.
- For operations without the option (`read-page`, `screenshot`, `dom-snapshot`, `attach-tab`, `open-tab`), the `DIALOG_DECISION_REQUIRED` hint should not tell the agent to re-run that command with `--dialog`. Word it as "repeat the triggering action with a decision", or name `run-script`/`navigate`.
- An own-tab dialog raised after the operation's work completes but before disconnect should still appear in the returned `dialogs`/error. Build the result after the final report snapshot.

## Residual Risks

- Scope the explicit policy to the operation's tab and add `tab_id` to `DialogReport` (MP-002; recommendation).
- The listener must be attached as early as possible after connect. A dialog raised during Playwright's connect/attach phase, before the listener exists, would still be auto-dismissed unreported. That window is narrow; note it in tests if observable.
- `PAGE_BLOCKED` is heuristic. A user browser with many tabs whose connect legitimately exceeds 8 s would be misreported (escalation trigger present; the message names both causes and the error is retryable).
- Headless or owned Chrome has no window in which to answer a blocked dialog, so "close the tab" is the only remedy, but `close-tab` itself cannot connect. The docs should say so. A future recovery via CDP HTTP `/json/close/<id>` is a separate-ticket candidate: it is new behavior, not required by REQ-010.

## Latest Authoritative Result

- Review Decision: `Pass` (round 4, SR-007)
- Material-Premise Gate: `Pass` (MP-004 Reachable → mandatory implementation guidance within the approved rules; MP-005 residual; earlier premises resolved or superseded)
- Notes: The SR-006 dialog-part hold is lifted for the SR-007 model. `PAGE_BLOCKED`/connect-split and the `TESTING.md` links work continue unchanged.
