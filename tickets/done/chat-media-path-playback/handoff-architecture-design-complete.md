# Handoff: Architecture Design Complete — autobyteus-572 (chat-media-path-playback)

- Result: `Architecture Design Complete`, SR-002, task_size `Medium`, architectural_risk `Low` → direct implementation.
- Package: `chat-media-path-playback` (Project Task autobyteus-572); requested by `/project_task_manager` (founder's report, 2026-11-20).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback/tickets/in-progress/chat-media-path-playback`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback`, `codex/chat-media-path-playback` (see `git log -1`); base `origin/personal` `bfd95f73a9`; finalization target `origin/personal`. Release only on the founder's word.
- Approval: requirements approved by the **user** (2026-11-20): DEC-001 = A (keep today's security rules; show the download honestly); streaming without keys in links is FU-001.

## Root cause (reproduced on the phone bundle)

The phone downloads a protected media file whole before playing it (a media element cannot send the phone's key; the node's file routes serve no parts). During that download the player shows "Video URL is not available." (its "no URL" text): 9.6 s for a 9.7 MB video at 8 Mbit/s, then it plays. Audio the same ("Audio URL is not available."). Outside the run's folder the phone shows "Opening…" instead. The desktop never shows it.

## Design (D-1…D-6)

Progress-reading download helper used by both phone download owners; the players show loading (one `MediaLoadingState` with "4.1 of 9.7 MB") and never "not available" while loading; the phone's node-file view shows the same; the node declares `Content-Length` (`sendUserFile` gets a required `size: number | null`); audio failure becomes plain + Retry. No authentication, permission or path-rule change.

## Classification rationale

Medium: ~10 web files + a mechanical server type change across 13 callers + tests. Low: no security, credential, persistence or ownership-boundary change.

## Reproduction

`cd autobyteus-web && SD572_THROTTLE_KBPS=8000 node tests/e2e/mobile-shell-probe.mjs --cases=MSP-572 --output-dir=<dir>` (after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`). Replace the scratch case with durable ones (design, Change Sequence 3).

## Route record

`get_handoff_rules` (2026-11-20): Medium / Low → `/implementation_engineer`.
