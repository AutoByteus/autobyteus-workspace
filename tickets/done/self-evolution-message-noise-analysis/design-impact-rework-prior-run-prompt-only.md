# Design Impact Rework: Prior-Run Prompt Cleanup Only

## Trigger

After an intermediate lifecycle concern, the user clarified the desired scope again:

- Restore the earlier companion lifecycle design.
- If an existing coach/evolver run cannot be restored, creating a replacement coach/evolver run is acceptable.
- The only required lifecycle-adjacent prompt change is to remove the redundant `Previous evolver run ids for continuity context` line.
- From the replacement coach's perspective, it should behave like a new coach and should not receive old coach/evolver run ids as prompt context.

This supersedes `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/design-impact-rework-companion-continuity.md`.

## Classification

- Type: Requirement Gap + Design Impact supersession.
- Root cause: Prompt contract leakage, not companion lifecycle policy.
- Required upstream action: Revise requirements/design to restore the accepted fallback lifecycle and keep only prior-run prompt suppression.

## Authoritative Decisions

1. Keep the earlier `single_agent` companion lifecycle fallback:
   - no stored session: create the initial companion run;
   - stored current run active: reuse it;
   - stored current run inactive: attempt restore/wake;
   - restore/wake fails: mark the old run unavailable/prior internally and create a replacement companion.
2. Do not surface restore failure as a new hard failure/blocked outcome as part of this ticket.
3. Do not remove or deprecate `priorEvolverRunIds` solely for this ticket. It may remain internal session/audit bookkeeping for replacement fallback behavior.
4. Remove `Previous evolver run ids for continuity context` from the runtime task packet.
5. Runtime prompt tests must prove previous/prior evolver run ids are not rendered even when internal session state contains `priorEvolverRunIds`.
6. Future `agent_team` evolver support remains out of scope. If a future team fallback policy records prior team/evolver ids internally, those ids must still not be sent in the prompt without a real inspection workflow.

## Updated Artifacts

- Requirements revised to `Refined`: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/requirements.md`
- Investigation notes updated with latest clarification: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/investigation-notes.md`
- Design spec updated with accepted lifecycle fallback and prior-run prompt suppression: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/design-spec.md`

## Implementation Implications

- `SelfEvolutionCompanionTriggerMessageBuilder` must no longer render prior/previous evolver run ids.
- Existing `SelfEvolutionCompanionSessionService.activateOrGet()` fallback behavior can remain: active reuse, restore/wake, and replacement after restore failure.
- Do not remove `createReplacementSession()` or force restore failure to fail the self-improve request for this ticket.
- Do not pass `priorEvolverRunIds` into prompt sections. If the builder still receives session state for other reasons, it must ignore prior run ids for content rendering.
- Update prompt-focused tests to assert forbidden prior-run wording and old run ids are absent.
- Keep lifecycle tests that prove replacement after restore failure, adding only prompt assertions that the replacement task packet contains no previous/prior run id line.
