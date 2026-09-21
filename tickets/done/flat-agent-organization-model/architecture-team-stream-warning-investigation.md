# Team Stream Warning — Read-Only Investigation

## Status

- Package: AORG-FLAT-TEAM-001.
- Inquiry: TEAM-STREAM-WARN-001, 2026-09-12.
- Trigger: user screenshot of the standalone Team workspace showing “Live Team
  updates are out of sync” and asking whether this was absent from origin/personal.
- Current source pin: b3de58a24bcfc0173ae414924b5079e1f7ead838.
- Earlier Team baseline: 5fb16658e7bd2aefd750f99eb596a17382e161ac.
- Local origin/personal: 5645b49d6f51faa60bd3545bc8e3f0e7e3f96793.
- Result: existing warning and trigger explained; the follow-up below establishes
  the first browser rejection and publication stack. Corrective attribution remains
  with Code Reviewer. This is not a new completed AD revision,
  implementation assignment, Requirements gap or expanded validation pass.
- No fetch, source/test edit, browser command, runtime mutation or restart.

## Established Source Evidence

1. `git grep` at both historical pins finds the exact warning under
   `workspace.components.workspace.team.TeamWorkspaceView.stream_recovery_required`
   in `autobyteus-web/localization/messages/en/workspace.ts` (line 30 at 5fb16658).
   The earlier `TeamWorkspaceView.vue:49–55` conditionally renders that localized
   warning as an amber alert. Earlier component tests also assert the text.
   It is therefore not a newly introduced AgentOrg warning or AD-REV-023 policy.
2. Current `components/workspace/team/TeamWorkspaceView.vue:42–45` supplies the same
   text to the shared `TeamWorkspaceSurface` recovery-notice slot. The extraction
   changed component composition, not the condition's intended meaning. The
   current string is hard-coded there despite the existing localization key;
   that incidental source fact does not explain the stream failure.
3. `services/teamExecution/teamExecutionViewState.ts:239–253,307–320` compares an
   incoming sequenced event with the last applied sequence plus one. Mismatch
   emits `TEAM_EXECUTION_CHANGE_SEQUENCE_GAP` and the
   `team_stream_recovery_required` effect. This detects inconsistency, not simply
   a running Agent. Missing, repeated or otherwise unadvanced events can cause it.
4. `services/agentStreaming/TeamStreamingService.ts:365–370,407–423` consumes that
   effect, marks the stream `reopen_required`, disconnects it, and reports the
   root-scoped recovery notice. `stores/agentTeamRunStore.ts:88–110` retains the
   notice for the selected Team workspace. Existing conversation is retained;
   new events from that failed stream are no longer applied.
5. `services/runHydration/teamRunContextHydrationService.ts:322–341` explains the
   “wait” instruction: explicit recovery requires no open execution work before
   exact history hydration and an unchanged/no-open-work checkpoint afterward.
   `services/runOpen/teamRunOpenCoordinator.ts:82–113` then replaces the failed
   stream only after the candidate snapshot is ready. The same checkpoint guard
   exists in the earlier Team baseline and local origin/personal.

The message is a recovery instruction after loss of frontend state consistency,
not a general instruction to stop using the UI whenever an Agent is busy. Waiting
alone is not claimed to repair the stream. Its presence also does not prove that
the server stopped working or that the communication was not delivered.

## Correlated Existing Runtime Evidence And Limits

The screenshot's `API28-TEAM-MSG-001` scenario matches the saved validation file:

`api-e2e-evidence/API-REV-028/live/TEAM-task-initial-interruption.json`

That file records the warning in the rendered body at 2026-09-12T00:25:34.672Z,
plus a timeout waiting for the transient task row. Its captured Team frames have
consecutive change sequences 1–41, ending with `TURN_STARTED` 39,
`TASK_AGENT_ACTIVATED` 40, and the new task's `AGENT_STATUS` 41. Thus these captured
frames do not establish a missing network event. The `errors` array is empty and
does not identify the first browser rejection.

The reducer advances its sequence only after successful application
(`teamExecutionViewState.ts:384–390`); a rejected event can therefore cause a later
consecutive network frame to encounter an application-level gap. That is a
possible explanation, not attribution of this incident. Parser rejection,
context lifecycle or another earlier failure must not be ruled out from this
capture alone. Repository test-log gap warnings are synthetic test evidence and
are not evidence of this live incident's origin.

A bounded evidence question was delivered to the existing API/E2E execution for
its original console warning/adjudication. No new task, retry, source fix, runtime
intervention or hold was assigned. Existing validation and failure-origin ownership
remain intact. Do not hide the banner or weaken sequence checks to erase the symptom.

## Follow-Up — First Rejection Established By API/E2E

API/E2E subsequently answered the bounded evidence question and supplied
`API-REV-028/live/TEAM-first-failure-current.json`,
`API-FIND-030-wire-boundary.json`, `TEAM-activation-confirmation.json`,
`API-FIND-030-compiled-correlation.json`, and
`API-FIND-030-standalone-task-activation-context-publication.md`.
The earlier uncertainty above records the initial inquiry, not the current evidence.

The original retained Chromium console contains, in order:

1. `TEAM_EXECUTION_EVENT_INVALID: TypeError: Cannot read properties of undefined (reading 'memberAddress')`.
2. `TEAM_EXECUTION_CHANGE_SEQUENCE_GAP: Expected change sequence 40, received 41.`

The original empty errors array listened to `pageerror`, not caught reducer
console warnings. It therefore did not establish absence of a browser failure.
Activation event 40 failed application; status event 41 encountered the unadvanced
client sequence. Network frame loss is not established.

A second independent normal standalone Team reproduced the same exception and
expected-23/received-24 gap with only delegation, without the message precursor.
The promptly resumed caught-exception debugger retained the production stack:
`applyMessage -> commitContextAssociations -> reactive Map.set -> synchronous
reactive dependency evaluation -> activeContextStore standalone Team view ->
listAgentContextEntries -> locations.value.get(id).memberAddress`.
The current source associates new contexts before publishing the corresponding
next locations/tree. The captured consumer consequently sees an incomplete
context/location pair. This is concrete publication evidence, not justification
for weakening sequence checks or adding recovery retries.

Both delegations and initial provider replies succeeded. No submission/review
was attempted, and intentionally active tasks kept the root checkpoint's task-work
condition true. Healthy server/GraphQL responses and cleanup SIGTERM exit 0 do
not convert the failed UI scenario into a pass or prove the held lifecycle matrix.

API/E2E completed API-REV-028 as Fail (reported 74.0%) and successfully routed
API-FIND-030 to Code Reviewer for failure-origin classification. Full remaining
matrix/VAL-054–058 remained Not Tested. Architecture does not duplicate that
handoff, assign a competing fix, infer the final source owner, or reopen Requirements
from this informational answer. No new design revision or source/test change.

## Checks

- Read-only comparison pins and source paths recorded; existing runtime evidence
  inspected without modification.
- `git diff --check` applies to this note; no application or upstream artifact change.
- No source-defect classification or successful delivery claim follows from this inquiry.
