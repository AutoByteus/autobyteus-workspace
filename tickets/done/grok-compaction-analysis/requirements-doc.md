# Grok Build compaction detection and raw-trace rotation — requirements

## Status
Package grok-compaction-analysis; SR-002; **Approved** (user, 2026-10-07, U02: "Then let's do it! … let's go"). Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/grok-compaction-analysis; branch codex/grok-compaction-analysis; base origin/personal @ ea826a5e4; finalization target origin/personal. Evidence: investigation-notes.md G01–G18; probes/.

## Problem
Grok compacts (manual `/compact` and automatic) and reports it via `_x.ai/session_notification` (auto_compact_started for auto, auto_compact_completed for both, with tokens and duration). AutoByteus drops these, so Grok raw traces never rotate and the UI never shows a compaction (G03, G05).

## Requirements and acceptance
| ID | Outcome | Acceptance |
|---|---|---|
| REQ-G1 | Each Grok `auto_compact_completed` produces exactly one rotation-eligible boundary and one archive segment, with tokens before/after and duration recorded. | Replay of probes/grok-manualreal-raw.jsonl and probes/grok-auto-raw.jsonl through the ACP/Grok path → one marker and one archive per completed; idempotent on duplicates. |
| REQ-G2 | Automatic compaction shows started → completed as one activity (paired in order within the session); manual compaction shows a single completed activity. | UI/history show one activity per compaction; no orphan rows. |
| REQ-G3 | A compaction that started but whose turn ends first (cancel, failure, process exit), or that reports failed/cancelled, closes as failed with no rotation. | Replay of probes/grok-cancelauto-raw.jsonl → started then failed for the same activity; the next compaction pairs correctly. |
| REQ-G4 | `/compact` keeps working natively (no interception); replayed notifications on session load are not re-recorded; Claude/Codex/AGY unchanged. | Existing suites pass; restore test shows no duplicate rotation. |

## Decisions (approved)
DEC-G1 scope as above (detect, rotate, close abandoned; mirror the Codex fix). DEC-G2 no version gate: unknown or absent notifications keep today's behavior; tested on Grok 1.0.46. DEC-G3 replay tests plus a gated live E2E (RUN_GROK_E2E=1) using a temporary GROK_HOME low threshold, plus `/compact` through AutoByteus.

## Out of scope
Changing Grok's compaction behavior; intercepting `/compact` (it already works); historical Grok raw traces; showing archived content in the UI.
