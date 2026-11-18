# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/tickets/in-progress/agent-settings-focused/` unless absolute.

## Investigation Meta

- Requirements: `requirements-doc.md` (SR-002; DEC-001…DEC-006). Investigation: `investigation-notes.md`. Solution history: `solution-revision-record.md`. Design: `design-spec.md` (SR-002, `Medium` / `Low`). Supplement: `storage-analysis.md`.
- Design review, code review: N/A (direct route). Implementation: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001).
- Revision record: `api-e2e-revision-record.md`; current `API-REV-003`. Round 3; trigger: IR-003 (`38f5a1eb1c`) and IR-004 (the merge of `personal` with autobyteus-348). Prior investigation: rounds 1–2 (this file).
- Code: `cba2e085e7`, on autobyteus-348's `3261712e06`. Head `243baa36ca`.

## Current Requirement And Design Basis

- REQ-001, REQ-002 / AC-001, AC-002: Settings show the focused agent as one card, with no list of copies or members. A hub shows its card and a one-line hint.
- REQ-003 / AC-003: a stopped copy's and member's model and runtime change there, and the next message uses them; a running one shows today's stop rule, and the header stops it.
- REQ-004 / AC-004: Team-wide and Org-wide settings are one switch away, and a Team-wide change reaches followers.
- REQ-005 / AC-005: edits stay pending across focus changes; the save bar names them; Save commits exactly those; Cancel discards.
- Implementation additions to exercise: D-IMP-1 (Settings stay open within a run; another run opens at its chat; the selected run's row no longer closes Settings, the back arrow does), D-IMP-2 (an Org's copies open their own Settings, a stopped Org's too, with "+"), D-IMP-3 (a Save on a stopped hub re-reads its view, so the copy's card shows the saved model).
- Legacy check: the list and its strings are removed with no wrapper; persisted data `Not Affected`. Both match the summary.

## Supported Scenarios And Real Usage

- UC-001…UC-003. Added from investigation: the user edits two agents across focus changes, then saves (AC-005 on the real stack); a stopped Org's copy reached only through the tree (D-IMP-2); a remote copy's read-only card (design rule table; MRD-04 has one).
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Risk Not Exercised | Candidate Validation |
| --- | --- | --- | --- | --- | --- |
| Frontend | Yes | resolver, editor, view, save bar, `selectRun`, Org view | web specs with stubs; IMP-08 (hub, Team copy, Team root) | Org; running states; Team-wide Save; real next-message launch; remote copy | browser probes on a probe-owned stack |
| API / persistence | No change, used by the Save | the existing save mutations; re-read after Save | specs mock `viewFor` | the re-read against a real server (D-IMP-3) | browser probe with server readback |
| Server, contracts, persisted data, desktop shell | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/TESTING.md`. Renderer → web specs and a browser probe on a probe-owned stack; one heavy run at a time; clean env; scripted AGY; never the user's app or data.
- Stack: `delegated-launch-defaults-probe.mjs` (real Chrome → Nuxt dev → `dist/app.js` → scripted AGY with an argv log per launch; case modules). No credentials.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related AC | Validity | Action |
| --- | --- | --- | --- | --- |
| web specs of the change | resolver, view, editor, stores | AC-001…AC-005 | Still Valid (stubs) | Reuse |
| `delegated-launch-defaults-probe.mjs` `delegatedRows`, DLP-003/004/006/007, DCP-001…005 | read a copy's launch values and stop it from the list | AC-001, AC-003 | Needs Update: the list is gone | Rework to focus each copy and read its card |
| `delegated-copy-own-file-cases.mjs` (DCR-001…003), `settings-saved-model-refresh-cases.mjs` (SSR-*) | a copy's edits and restores through the list | AC-003 | Needs Update | Rework |
| `model-routing-decisions-probe.mjs` MRD-04 | routing facts, remote copy, through the list | AC-001, remote copy | Needs Update | Rework |
| `run-settings-live-probe.mjs` R07, R08; `workspace-folder-picker-probe.mjs` | Team and Org saved runs; Org workspaces | AC-004 | Updated by implementation, not run | Run |
| `chat-entry-live-probe.mjs`, `existing-run-model-config-probe.mjs` | root card | — | Check they still hold | Read; run if affected |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-006 (suites; merge is delivery's), all at repository layer | web | Reused | IMP-01…IMP-07 at `cba2e085e7` | Nothing after it touches code |
| API-02 | AC-001, AC-005, D-IMP-1, D-IMP-3 | browser, hub | Durable (AFS-001) | Stopped hub with an Agent copy and a Team copy: hub card and hint, no list; each copy's card; a member's switch; edit A, focus B, the bar names A; Save commits only A (server readback), the card shows it; Cancel discards; the selected run's row keeps Settings; back arrow leaves; another run opens at its chat | Real-stack AC-005; the stale-view fix against a real server |
| API-03 | AC-002, AC-003, REQ-004, D-IMP-2 | browser, Org | Durable (AFS-002) | Running Org, then stopped: a direct agent, a placed team's member, a copy; "Organization settings"; group view; running locks and stop; a stopped member's and copy's edit and Save; next message on the new model | Org was never rendered |
| API-04 | AC-004, AC-005 (Team) | browser, Team | Durable (AFS-003) | Stopped Team: edit one member, Save, others unchanged; "Team settings", change the Team model, Save; followers and the customized member; next messages launch on the expected models | Team-wide Save not driven |
| API-05 | AC-003 (running copy, stop, edit, next message), regression of the old journeys | browser, hub/Team/Org | Existing (reworked) | DLP-003/004/006/007, DCP-001…005, DCR-001…003, SSR-* after rework | The list's journeys per focused copy |
| API-06 | Remote copy; routing facts on the card | browser | Existing (reworked) | MRD-04 | Remote copy read-only with its chip |
| API-07 | AC-002, AC-004, Org workspaces | browser | Existing | `run-settings-live-probe.mjs` R07, R08; `workspace-folder-picker-probe.mjs` | Updated, never run |

- Test progress log: `Yes`.

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| API-02…API-04 | `autobyteus-web/tests/e2e/agent-settings-focused-cases.mjs`, registered in `delegated-launch-defaults-probe.mjs`, script `test:e2e:agent-settings-focused` | Real-stack proof of the focused card, Org and Team saves |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only? | Follow-Up |
| --- | --- | --- | --- | --- |
| Narrow viewports; zh-CN text | Strings are spec-checked; no layout change beyond the existing card | Low | No | Residual |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes`
- Reroute Required Before Validation Execution: `No`

## Round 2 Note

- Recheck AFS-002 first. Then rework the four probes that read the removed list: a shared `delegatedRows(page, root)` walks a root's copies in the left tree and reads each card, or a Team copy's group view; the DCP, DCR, SSR and MRD-04 steps act on the focused card. Run them in one stack with AFS-001…003.
- R07 and R08 are not run (provider runs; no provider proof is needed for this web-only change).

## Round 3 Note

- Validate the merged head as a whole: the 20-case launch-defaults set (SSR-003 first), the model-routing probe, the folder picker (the merge changed the Org adoption check).
- The merge brought `runtime-switch-members-probe.mjs`, which read the removed list. It is reworked (group view for members, the focused card for copies) and run.
