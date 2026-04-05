# Requirements

- Status: `Design-ready`
- Ticket: `temp-team-selection-metadata-error`
- Last Updated: `2026-04-05`

## Goal / Problem Statement

Starting a new team run creates a draft local team context immediately and auto-focuses the coordinator member before the first message is sent. If the user clicks that draft team row or draft coordinator member again before sending the first message, the frontend wrongly attempts to reopen the team through persisted-history hydration and surfaces the backend error `Team run metadata not found for 'temp-team-...'`.

Single-agent draft runs do not show the same failure. The issue appears specific to the team draft selection path.

## Confirmed User Intent

- Use the software engineering workflow rather than an ad hoc patch.
- Investigate the root cause before changing code.
- Fix the team draft selection flow so draft teams and members remain locally selectable before the first message.
- Team and team-member clicks should not surface avoidable selection/open errors in normal draft, live, or persisted-history states.
- Preserve the existing persisted-history hydration path for real stored team runs.
- Add regression coverage for the broken team draft interaction.

## Observed Reproduction Notes

- Open the team run configuration dialog.
- Configure a new team run and click `Run`.
- Observe that a local temporary team run is created and the coordinator is focused by default.
- Before sending any first message, click the team row or the coordinator/member entry again.
- The UI surfaces `Team run metadata not found for 'temp-team-...'`.
- Equivalent draft navigation for a single-agent run does not produce this error.

## Initial In-Scope Use Cases

- `UC-001`: A newly created draft team run (`temp-team-*`) can be reselected from the workspace history tree before the first message is sent.
- `UC-002`: A member inside that draft team can be selected before first send without requesting persisted team metadata.
- `UC-003`: Persisted non-temp team runs still hydrate through the existing backend-backed history open flow.
- `UC-004`: Live subscribed teams still keep the existing local focus-switch fast path.

## Initial Out Of Scope

- Backend persistence changes for team run metadata.
- Team-run creation semantics after the first message is sent.
- Unrelated run-history tree redesign or styling changes.

## Functional Requirements

- `R-001`: Team selection must resolve against the authoritative source of truth for the selected team state instead of blindly forcing persisted-history hydration.
- `R-002`: Draft team selections for `temp-team-*` IDs must resolve against the existing local `agentTeamContextsStore` context, even when the team is not yet subscribed/live.
- `R-003`: Draft team member selections must not call the persisted team history hydration path before the first send.
- `R-004`: Subscribed/live team selections must continue to use the existing local fast path.
- `R-005`: Persisted non-temp team member selections without an authoritative live local context must continue to reopen through the existing history hydration path.
- `R-006`: Team and team-member clicks must not surface avoidable errors caused only by choosing the wrong local-vs-history open path.
- `R-007`: The fix must remain scoped to frontend selection/open behavior unless investigation proves the backend is also wrong.
- `R-008`: Automated tests must cover the failing draft team selection case and protect the persisted-team reopen behavior.

## Acceptance Criteria

- `AC-001`: Clicking a draft team row before the first message does not produce `Team run metadata not found`.
- `AC-002`: Clicking a draft team member before the first message keeps the selection in local state and does not attempt backend hydration.
- `AC-003`: Clicking a subscribed/live team member continues to use the local focus-switch path.
- `AC-004`: Clicking a persisted inactive team member still routes through the existing history reopen path.
- `AC-005`: Team and team-member clicks no longer surface avoidable wrong-path selection errors for the in-scope states above.
- `AC-006`: Targeted tests fail before the fix and pass after the fix.

## Initial Constraints / Dependencies

- The likely fix area is `autobyteus-web`.
- The error is presented by the run-history UI, but the source decision may live in shared team selection logic used by multiple components.
- The frontend already distinguishes draft vs persisted agent runs; the team path should match that boundary instead of inventing new backend behavior.

## Scope Triage

- Initial classification: `Small`
- Rationale:
  - Current evidence points to one incorrect local-vs-history selection branch in the frontend.
  - The bug is narrow but needs regression coverage because it sits on shared team selection behavior.
