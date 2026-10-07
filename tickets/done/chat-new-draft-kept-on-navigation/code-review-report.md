# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/chat-new-draft-kept-on-navigation/requirements-doc.md` (REQ-006, REQ-008, AC-005, AC-007, AC-009, SCN-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (context only; not needed for the classification)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (current SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (DS-002, DS-004, DS-006, launch order D-04, the "follow the UI/UX spec for every visible detail" rule)
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` (UXJ-003, UXJ-005, TR-004, TR-008, TR-009, VIS-005)
- Relevant Solution Revision IDs: SR-005
- Design Review Report Reviewed As Context: `N/A — not applicable` (direct route)
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable`
- Relevant Architecture Review Revision IDs: `N/A`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md` (created by this result)
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): `N/A`
- Trigger: API/E2E failure F-001 from `/api_e2e_engineer`, API-REV-001, round 1
- Prior Review Round Reviewed: None. No prior code review exists on this direct route.
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: D00, D07 (failing); D09 (passes, but shows the same symptom)
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build`, then `pnpm -C autobyteus-web test:e2e:chat-draft-rows-live --output-dir <fresh> --ledger-file <ledger>`. `--cases D00` reproduces the failure alone. The run uses real headless Chrome, Nuxt dev, the real server `dist`, and the real Codex runtime.
- Failure Evidence Paths: `api-e2e-evidence/live-run-3/chat-draft-rows-live-evidence.json` (D00 `samples`, D07), `api-e2e-evidence/send-row-sampling/chat-draft-rows-live-evidence.json` (D00 `sendRowSamples`), `api-e2e-evidence/live-run-2/chat-draft-rows-live-evidence.json` (D09 `during`)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review` (direct route; no source review before this)
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None. The defect is local to one row-projection rule. It does not show that the size or risk was misjudged.

## Review Scope

- Changed implementation and behavior reviewed: how a Draft row looks during and after a successful agent-addressed first send (REQ-006 / AC-005 / TR-004), and how the "Empty draft" state is decided (REQ-008 / DS-006).
- Files / areas reviewed:
  - `autobyteus-web/services/chat/chatLaunchService.ts` (`launchAgentChat`, `launchTeamChat`)
  - `autobyteus-web/services/runSubmission/localUserSubmission.ts` (`beginLocalUserSubmission`, `showSubmittedMessage`, `acceptLocalSubmission`)
  - `autobyteus-web/stores/chatDraftStore.ts` (`chatDraftHasText`, `listed`, `starting`, `markStarting`, `leaveOpenDraft`, `finishSentDraft`)
  - `autobyteus-web/composables/chat/useChatDraftRows.ts` (row filter and `toRow`)
  - The relevant probe steps in `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` (D00 sampling, D09 `during`)
- Explicit exclusions: no full source audit and no scorecard (this is a failure-origin round). No general review of the test suite. The 10 files with base-line web-suite failures, which `cfeda548b` already had, are out of scope. So is the 800 px model-flyout observation, which this change did not cause.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-006 / AC-005 say: "Run opens; that row disappears; other rows stay." UI/UX spec TR-004 / UXJ-003 say: "Run opens; that row fades out (150 ms)." "Empty draft" is defined only for an open draft whose text the **user** cleared: REQ-008 / AC-007 / TR-008 / UXJ-005 / VIS-005.
- Design-spec behavior map verified against the implementation: DS-006 is implemented as written. `listed` stays set, and the open draft on `/chat` is shown even with no text. However, DS-006 bases "Empty draft" only on `context.requirement` being empty. It does not cover the composer clear that the existing send path performs at send start. The design also says to "Follow the UI/UX spec for every visible detail". TR-004 is one of those details, so the approved target is clear.
- Design review report and round confirmed: `N/A — not applicable` (direct route)
- Behavior-basis status: `Confirmed` (the failing assertion represents approved behavior)
- Changed or newly discovered behavior, if any: None
- Remaining material ambiguity, if any: None for F-001. See the D09 note in Residual Risks.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| BEH-004 (REQ-006, AC-005, TR-004) | Confirmed (requirement); implementation deviates | Send → `launchAgentChat`: `markStarting` → `registerDraftRun` → `await sendUserInputAndSubscribe()` → `beginLocalUserSubmission` → `showSubmittedMessage` sets `context.requirement = ''` (`localUserSubmission.ts:131`) while the route is still `/chat` and the draft is still open → `useChatDraftRows` keeps it (`shownOpen`) and `toRow` gives an empty preview, so the row reads "Empty draft" → `deps.navigate(...)` → `finishSentDraft` removes the row. | — |
| BEH-007 (REQ-008, AC-007, TR-008) | Confirmed | Clearing the text leads to "Empty draft"; leaving drops the draft (D05 passes) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-003 (agent target) | REQ-006, AC-005, AC-009, TR-004, UXJ-003 | User | Desktop user | Send the message they wrote in a New chat to an agent | Composer Send on New chat (fresh draft or re-entered Draft row) | Normal | The `launchAgentChat` path traced above | Run opens; the row keeps its text and fades out. Observed instead: the row reads italic grey "Empty draft" for about 200–300 ms, and for the whole send when the send is slow. | Requirements SCN-003; UI/UX spec TR-004 and TR-008; code trace; live-run-3 and send-row-sampling D00 samples (`t=47 "Empty draft"` → `t=340` removed after navigation); D07 201 ms | Supported Normal Scenario | Use |
| SCN-003 (team target) | same | User | Desktop user | Same, to a Team | Same | Normal | `launchTeamChat` passes `context.requirement` to `sendMessageToFocusedMember` and never clears the draft context before `navigate` | Row keeps its text until navigation (0 ms "Empty draft") | Code trace; D07 Team observation | Supported Normal Scenario | Use (confirms the defect is specific to the agent path) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | The sent agent draft's row reads "Empty draft" while the first send is in flight | SCN-003 (agent), TR-004 / TR-008 | The user presses Send | The composer clear in `showSubmittedMessage` empties the still-open draft's `requirement`. The row projection treats that the same as a user clear (TR-008) and shows "Empty draft" until `navigate` → `finishSentDraft`. Every agent send shows a wrong state label. A slow first send shows it for the whole wait, which reads as if the message was lost. | Code lines cited above; live and sampling evidence for D00 and D07; D09 `during[0] = "Empty draft"` | Promote | This is a contradiction of TR-004 on every ordinary agent send. Proportionate response: a bounded fix inside `chatDraftStore` / `useChatDraftRows`, so that a draft being sent (`starting`) keeps its sent text as its row label. |
| C-002 | Should the probe's TR-004 assertion be wrong or too strict? | TR-004 | — | The assertion checks that the row never reads "Empty draft" between Send and removal. That matches TR-004 and TR-008 exactly. | Probe D00 sampling; UI/UX spec | Reject (as a test defect) | The test is valid and matches approved behavior. No fixture, environment or timing artifact is involved: the samples come from the real stack, and the result reproduces across runs. |
| C-003 | DS-006 needs a design revision | DS-006 | — | DS-006 left out the send-time composer clear. However, the design already requires following the UI/UX spec for every visible detail. The fix stays within the same owners and does not change any boundary, interface or the data-flow spine. | design-spec DS-006 and line 359 | Reject (as `Design Impact`) | No design revision is needed to route this. Solution Designer may add a one-line clarification to DS-006 at its discretion ("a `starting` draft is not 'Empty draft'; it keeps its sent text until removed"). |

## Findings

### F-001 (CR) — A sent agent draft's row reads "Empty draft" during the first send

- Linked candidate: C-001. Scenario: SCN-003 (agent), Supported Normal Scenario.
- Approved behavior: TR-004 / UXJ-003 / AC-005 say the run opens and the row fades out (150 ms) **with its text**. "Empty draft" exists only for TR-008, when the user clears the text.
- Origin: an implementation defect in the row projection. `useChatDraftRows` (the `toRow` preview, and the filter's `chatDraftHasText` / `shownOpen`) derives the label only from `draft.context.requirement`. In the agent launch, that same context is the composer context that the existing `showSubmittedMessage` clears at the start of the send (or when a held mention send is accepted). The draft is still open and the route is still `/chat` until `deps.navigate`, so the row shows the user-cleared state.
- Why the Team path is unaffected: `launchTeamChat` reads `context.requirement` and passes it on. It does not run `showSubmittedMessage` on the draft context.
- Required action (implementation_engineer), bounded:
  - A draft with `starting === true` must not present as "Empty draft". Its row keeps the text that was sent until `finishSentDraft` removes it with the existing 150 ms leave.
  - The row must also return to normal when a failed send runs `clearStarting`. The pre-registration failure path keeps the text today (D06), and that must stay true.
  - One fitting approach is for `chatDraftStore.markStarting` to record the sent preview text on the draft, and for `useChatDraftRows` to use it while `starting`. Keep this inside `chatDraftStore` / `useChatDraftRows`. Do not change `localUserSubmission` composer-clear behavior, which existing runs rely on.
  - Add a unit or component test where a `starting` draft whose context text has been cleared still shows its sent text and is not "Empty draft".
  - Re-run D00, D07 and D09 of the live probe.
- Detectability: there was no source review on this direct route. The cross-module coupling (the launch reuses the composer context that the submission path clears) can be found by reading the code, but only by tracing into `localUserSubmission`. No unit test covered rows during `starting`.

## Classification

- `Local Fix`

## Recommended Recipient

- `implementation_engineer`
- Routing note: after the fix, the implementation returns to API/E2E. The task is direct-route (Medium / Low), so no independent source review is required.

## Residual Risks

- D09 (DS-005, opening another draft during an in-flight send): once the user opens Q, the sent draft is no longer open and its context text is already empty, so its row disappears before the run opens (`opened.rows` lists only Q). Requirements and the UI/UX spec do not say explicitly how the sent row should look while another draft is open, so this is not a separate finding. The F-001 fix (a `starting` draft keeps its sent text) also makes that row stay until the launch finishes, which matches TR-004. API/E2E should look at D09 rows after the fix.
- A held (mention) agent send clears the composer on acceptance rather than at send start. The window is shorter but still present (D07: 201 ms). The fix must cover both moments. A fix keyed on `starting` does.

## Latest Authoritative Result

- Review Decision: `Fail` — failure origin confirmed
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-003 agent send is a Supported Normal Scenario; C-001 promoted)
- Material-Premise Gate: `Pass` (no additional premise)
- Score Summary: `N/A` (failure-origin round; no scorecard)
- Failure Origin: Implementation defect. The row projection treats the send path's composer clear as the user-cleared "Empty draft" state (TR-008), which breaks TR-004. The test is valid. Not an environment issue. No requirement gap. A DS-006 clarification is optional and not routing-relevant.
- Recommended Recipient: `/implementation_engineer`
- Notes: Everything else in API-REV-001 passes (13/15). After the fix, re-validate through API/E2E at minimum D00, D07, D09 and D06 (failure keeps text).
