# Design Impact Rework: Self-Evolver Companion Continuity (Superseded)

## Supersession Status

This rework note is superseded by the latest user clarification on 2026-06-24 and by:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/design-impact-rework-prior-run-prompt-only.md`

Do not implement this note's former strict-continuity decisions. The authoritative latest direction is: restore the earlier companion lifecycle fallback and remove only the previous/prior evolver run id line from the runtime prompt.

## Superseded Trigger

During implementation, an intermediate clarification suggested the intended self-evolution companion lifecycle might be strict original-run continuity:

- Once a target has an original self-evolver coach/evolver run, that run would have to be reused when active or restored/woken when inactive.
- If the original coach/evolver run could not be restored, the self-improve request would fail/surface an unavailable state rather than creating a replacement coach.
- `Previous evolver run ids for continuity context` was still prompt noise and should not be sent to the coach/evolver.
- Future `agent_team` evolver support would have followed the same strict invariant.

## Superseded Classification

- Type: Requirement Gap + Design Impact, now superseded.
- Former root cause: Boundary/ownership issue in companion lifecycle.
- Current status: Replaced by a narrower prompt-only rework. The latest user clarification accepts the earlier restore-failure replacement fallback.

## Superseded Decisions, Not Authoritative

The following decisions are explicitly no longer authoritative for this ticket:

1. Existing stored `currentEvolverRunId` as a hard no-replacement invariant.
2. Restore/wake failure failing the self-improve request instead of creating a replacement companion.
3. Removal or deprecation of `priorEvolverRunIds` as internal replacement-history bookkeeping.
4. Future `agent_team` support requiring strict no-replacement behavior as part of this ticket.

## Current Authoritative Direction

1. Keep the earlier `single_agent` companion lifecycle fallback:
   - no stored session: create the initial companion run;
   - stored current run active: reuse it;
   - stored current run inactive: attempt restore/wake;
   - restore/wake fails: mark the old run unavailable/prior internally and create a replacement companion.
2. Remove `Previous evolver run ids for continuity context` and any equivalent previous/prior run id prompt line from the runtime task packet.
3. Keep `priorEvolverRunIds` only as internal session/audit bookkeeping if useful. It must not be rendered to the coach/evolver prompt unless a future design adds a real prior-run inspection workflow.
4. A replacement coach should behave like a new coach from the prompt perspective.
5. Future `agent_team` evolver support is out of scope except for the prompt principle: do not send previous/prior team run ids without a concrete inspection workflow.

## Updated Artifacts

- Requirements revised to `Refined`: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/requirements.md`
- Investigation notes updated with superseding clarification: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/investigation-notes.md`
- Design spec updated with accepted lifecycle fallback and prior-run prompt suppression: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/design-spec.md`
- Superseding rework note: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/done/self-evolution-message-noise-analysis/design-impact-rework-prior-run-prompt-only.md`
