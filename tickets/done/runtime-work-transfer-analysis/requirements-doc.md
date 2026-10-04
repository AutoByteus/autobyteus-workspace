# Claude Agent SDK compaction detection and raw-trace rotation — requirements

## Status and authority
- Stable package: runtime-work-transfer-analysis; revision SR-013.
- Status: **Approved (user, 2026-10-04: scope E57; CONF-001 and handoff E63)**.
- Owner: Solution Designer. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis; branch codex/runtime-work-transfer-analysis; base origin/personal @ 39f2dd008c3e4d90d85312f046df13a58172c236; finalization target origin/personal.
- Approval evidence: after the Claude experiment was presented (defects 1–4, E53–E56), the user said "For the current ticket, let's first fix the Claude compaction rotation bug. Let's do that." This approves REQ-022–025 as instantiated for Claude below, plus DEC-018. It does not approve other runtimes, the Work Journal or later memory steps.
- Program context (not in this ticket): Step 1A for other runtimes (Codex verification, Antigravity, Grok), Step 1B Work Journal, Step 2 work notes. See requirements-doc-SR-011-snapshot.md and requirements-doc-SR-008-snapshot.md.
- Evidence: investigation-notes.md E52–E70; probe artifacts in probes/.

## Problem
Claude Agent SDK runs never rotate raw traces at compaction. The compaction boundary frame is never recognized (frame-shape mismatch), so every Claude run stays one ever-growing active file (E54). Claude repeats the "compacting" status about every 30 s during a long compaction, and each repeat is recorded and shown as a separate compaction (E55). Compaction metadata is lost, and a failed compaction is ignored (E56).

## Current / desired / preserved behavior
| ID | Current | Desired | Preserved |
|---|---|---|---|
| BEH-008 | 0 boundary markers and 0 archive files across 8 compacting Claude runs | One boundary marker and one archive segment per Claude compaction | Existing archive format and rotation mechanism (shared with Codex/AutoByteus) |
| BEH-009 | 2–4 "compaction" activities per real compaction, each left in "started" | One activity per compaction: started → completed or failed | Codex and AutoByteus compaction display |
| BEH-010 | trigger/pre_tokens always null; failure result ignored | Trigger, tokens before/after, duration and result recorded | Marker remains a provider_compaction_boundary raw trace |
| BEH-011 | Reopened Claude run history shows the whole run (no rotation ever happened) | After rotation, reopened history shows work since the latest compaction; earlier work is in the archive, like Codex/AutoByteus (CONF-001) | Raw traces never deleted; archives available via memory API and work-trace export |

## Scenarios
| ID | Trigger / sequence / outcome | Validity |
|---|---|---|
| SCN-017 | Claude auto-compacts during a long turn: status "compacting" (repeated every ~30 s), then success status, then compact_boundary. Outcome: one started activity, one completed activity, one boundary marker, one archive segment. | Supported Normal |
| SCN-018 | User triggers manual compaction (`/compact` sent as a normal message). Same outcome with trigger "manual". | Supported Normal (verified via streaming input, E64) |
| SCN-019 | Claude reports compact_result "failed" (observed: "too_few_groups" on auto, "API Error: Request was aborted." on interrupt). Outcome: the activity ends failed with the error; no rotation; the turn continues normally. | Supported Explicit Edge (E65, E66) |
| SCN-020 | The turn ends, is interrupted or the process exits while a compaction is in progress with no boundary. Outcome: the operation is closed as failed/interrupted; no rotation; no lingering "compacting". | Supported Explicit Edge |
| SCN-021 | compact_boundary arrives with no preceding status frame. Outcome: still one completed compaction and rotation. | Supported Explicit Edge |

## Requirements and acceptance criteria
| REQ | Required outcome | Acceptance criteria |
|---|---|---|
| REQ-022 (Claude) | Each Claude compaction boundary produces exactly one rotation-eligible boundary marker, and active raw traces rotate into one new archive segment. | AC-022a: feeding the real frame sequence (probe fixture) through the Claude session path yields one rotation-eligible marker and one archive segment. AC-022b: tests use real SDK frame shapes (`type:"system", subtype:"compact_boundary"`), not only pre-classified events. AC-022c: a live RUN_CLAUDE_E2E run that sends `/compact` through AutoByteus creates one archive segment and one marker with trigger "manual". |
| REQ-023 (Claude) | One Claude compaction is one operation: one start, and one completion or failure. Repeated "compacting" statuses add no markers or activities. | AC-023: replaying 4 "compacting" statuses 30 s apart, then success and boundary, yields exactly one started and one completed COMPACTION_STATUS event sharing one provider_event_id, and one non-rotating start marker. |
| REQ-024 (Claude) | Record Claude compaction metadata from compact_metadata: trigger, pre_tokens, post_tokens, duration_ms, result. | AC-024: the boundary marker and event carry trigger "manual"/"auto", pre_tokens and post_tokens from the fixture. |
| REQ-025 (Claude) | A failed or abandoned Claude compaction closes as failed, with the error when supplied, and never rotates. | AC-025: compact_result "failed" + compact_error yields a failed event with error_message and no archive; turn settlement with an open operation yields a failed/interrupted close and no lingering started state. |
| REQ-014 | Codex, AutoByteus and native compaction behavior, raw-trace format and history readers unchanged. | AC-014: existing compaction/rotation/history test suites pass unchanged. |

## Decisions
- DEC-018 (approved with scope): existing Claude raw traces are not rewritten. Old runs keep one file and their historical duplicate "compacting" markers.
- DEC-020: no frontend change. Live and history pairing work through a shared provider_event_id (E59).
- CONF-001 (confirmed by user, E63): accept BEH-011. After the fix, reopening a Claude run shows history since its latest compaction, consistent with Codex/AutoByteus. Archived Claude work is not viewable in the web UI today (same limit as Codex; Memory inspector shows only an "archive" badge, E60).

## Out of scope
Other runtimes; Work Journal; showing archived content in the UI; cleaning historical duplicate markers; changing how Claude itself compacts; retaining the compaction summary text.
