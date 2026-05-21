# Design Impact Rework: Mobile Configure-Then-Chat Flow

## Status

Ready for architecture review on 2026-05-21.

## Trigger

The user reviewed the delivered mobile Start new run experience and found two concepts redundant/incorrect:

- the full `Launch summary` repeats values already selected in the setup form;
- the `First message` belongs in Chat after the run is created, not inside run configuration.

The user explicitly asked to improve the experience and remove redundant elements.

## Refined Product Direction

Mobile should match desktop/web:

1. Configure the run.
2. Create/start the run.
3. Hide setup and open Chat.
4. Send the first message from the normal Chat composer.

For team runs, focused member selection for messaging should happen on the opened Chat/team focus surface, not as `First message target` inside pre-run configuration.

## Required UX Changes

- Remove `Launch summary` from mobile Start new.
- Remove `First message` textarea from mobile Start new.
- Remove `First message target` from mobile Start new.
- Replace the full summary with one compact readiness/action area near the button.
- Change the action copy from prompt-launch language to create/start language.
- After successful create, close setup and open Chat with an empty composer.
- Preserve draft context files for the new Chat: agent files transfer to the created agent context; team files remain pending by `teamRunId` until first send.

## Required Boundary Changes

- Mobile setup must not call or indirectly trigger `activeContextStore.send()`.
- Mobile creation coordinator should create/select the run using the same store boundaries desktop uses.
- Chat composer remains the owner of the first message and all subsequent sends.
- Team focus remains an opened-run concern handled by the mobile team focus bar.

## Desktop/Web Isolation

No desktop/web UX change is intended. Desktop already follows configure -> run -> chat and should remain the reference behavior.

## Expected Validation

- Mobile setup no longer renders `mobile-run-prompt` or `mobile-launch-summary`.
- Mobile create action can enable with valid config and no prompt.
- Creating an agent/team run does not call `activeContextStore.send()`.
- New run opens on Chat with composer ready.
- Team Chat focus can be changed before the first message and the first send targets that member.
- Draft attached files appear in the new run's composer context tray; team files remain visible across focus changes and flush to the selected focused member at first send.
- Desktop `RunConfigPanel` tests remain green.

## Architecture Review Round 1 Refinement: DRI-001

Architecture review approved the configure-then-chat direction but found that team draft attachment transfer was not identity-safe.

Refined decision:

- Agent draft attachments transfer directly to the created agent context.
- Team draft attachments do **not** transfer to `activeContextStore` at creation time because `activeContextStore` is focused-member scoped for teams.
- Team draft attachments move to an explicit pending mobile owner keyed by `teamRunId`, for example `mobileWorkStore.pendingTeamRunAttachmentsByTeamRunId`.
- The mobile composer context tray displays pending team-run attachments while they are pending, independent of which team member is currently focused.
- If the user changes focus before the first message, pending attachments remain visible and are not rebound to the old member.
- Immediately before the first team Chat send, a mobile pre-send bridge validates the currently focused leaf member and flushes pending attachments to that explicit `teamRunId + memberRouteKey` context.
- If focus is non-leaf or invalid, send is blocked with an actionable message and pending attachments remain pending.
- Mobile team creation should select a deterministic valid leaf focus when the default/coordinator focus is non-leaf, so Chat opens with a usable composer when possible.

Additional required validation:

- Attach files in a draft/non-run context.
- Create a team run.
- Change focus in Chat before the first message.
- Confirm pending attachments remain visible.
- Send the first message.
- Confirm the message targets the selected focused member and includes those attachments.

## User Scope Guardrail: Keep This Out Of Core

The user explicitly raised concern after seeing implementation activity in store and shared composer files. This design is now tightened as follows:

- This remains a mobile-shell UX/session change.
- `mobileWorkStore` may be extended only because it already owns mobile current context and draft attachments; pending team-run attachments are mobile session state, not core execution state.
- Do not change `activeContextStore.send()` semantics, agent/team run store lifecycle semantics, runtime/model store semantics, backend/API contracts, or desktop `RunConfigPanel`.
- Shared composer/monitor files should remain unchanged unless mobile-only interception is not feasible.
- If shared composer/monitor files are touched, the only allowed shape is an optional no-op callback/slot seam with no mobile imports, no mobile store dependency, and identical desktop/web behavior when absent.
- Code review and validation must explicitly treat shared composer changes as a no-regression hot spot.
