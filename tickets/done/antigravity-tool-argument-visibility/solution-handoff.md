# Architecture Design Complete — antigravity-tool-argument-visibility

## Classification And Expected Work
- Package: `antigravity-tool-argument-visibility`; current revision SR-003.
- Outcome: **Architecture Design Complete**.
- Completed design classification: **task_size Medium; architectural_risk High**. New native-input evidence mapping depends on an undocumented provider contract, and the async read before first canonical publication requires abort/same-turn correctness. No shared recorder/schema/API migration or frontend redesign is planned.
- Expected next work: independently review the approved cumulative solution, especially source association/truncation, bounded reverse scan, cancellation/ordered publication and first-event persisted parity. Then follow the reviewer's skill-defined route. This is design-ready, not implemented, validated, delivered or released.

## Original Request And User Decision
User reports Agent Package Creator on Antigravity showing only TargetFile for a successful replace_file_content, asks why and whether other tools are affected, including direct native probing. Screenshot reference: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c57fdd5438cd4fa18e8d7ea3a738750a/solution_designer_88d48b8de0b74a6faaf3d3e6e40ad701/context_files/ctx_06be0b068054__image.png`.

After the proposed future-only fix scope was presented, user replied: “Yeah, I mean for the past ones we don't care, right? And it is how it is. But for the future one we just fix for the future, you know. Of course, I mean if it's fixable, if it's not fixable, then I guess we have to keep it like it is.” Follow-up: “Do you think it's fixable based on your investigation?” Local approval reference USER-APPROVAL-2026-10-03-FUTURE-ONLY links that exact reply and context, captured at SR-002. Feasibility is positively established by typed actual inputs and an ACTIVE-timing snapshot, not a guess that the missing content exists.

Approved basis: SR-001 REQ-001–004 / AC-001–006 / UC-001–004 / BEH-001–004 / SCN-001–004, unchanged intended behavior; no behavior-defining supplements. Preserve past calls, execution, statuses/results, names, tool allowlist, MCP/image behavior and other runtimes. No result/diff recovery, historical backfill, native file rewrite or new UI product policy.

## Evidence And Proposed Realization
- Original snapshot: 684 actual canonical calls compared to native evidence; all 141 replacements omit their supplied original/replacement text/options, all 15 writes omit CodeContent, and range/search/shell inputs are also incomplete. The native AGY 1.2.16 direct probe reproduces summary-only input before any AutoByteus code.
- Full local transcript retains actual typed native planner input; standard logs contain serialized/mixed value encoding. A timing probe found full input already at ACTIVE.
- Later architecture snapshot: 681 native calls; 667 exact summary agreements and 14 run_command summaries shortened to a literal prefix plus Unicode ellipsis, corroborated by longer native inputs. No other mismatch.
- Backend event queue is already ordered/async; sequencer persists arguments only at first call-ready observation. Therefore resolve before STARTED and reuse the same native snapshot, not terminal-only enrichment.
- Design: async guarded reverse JSONL scan of the exact bound conversation's single full transcript, bounded chunk/row memory and abort, strict current structural/ordinal/single-call/name association plus summary corroboration, then synchronous converter first-snapshot selection. Unknown/unsafe detail yields the existing summary. No provider IO in history/UI or parallel archive.

## Workspace / Base / Finalization
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility`.
- Branch: `codex/antigravity-tool-argument-visibility`.
- Refreshed bootstrap base: origin/personal @ 98d8fb36a632ce0f46136cda20129d1fe1ee0ac8; target origin/personal. Upstream advanced after bootstrap; inspected relevant paths showed no intervening delta. No worktree rebase/merge/commit/release performed.
- Shared/default checkout and existing user Agent run were not modified. Only owned documents/diagnostic fixtures are written. Own native probe sessions stopped after SUCCESS; old production files were read only.

## Cumulative Canonical Artifacts (Absolute Paths)
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/requirements-doc.md`.
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/investigation-notes.md`.
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/design-spec.md`.
- Solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/solution-revision-record.md`.
- Current full handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/solution-handoff.md` (this file).
- Earlier intake result: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/investigation-result.md` (historical SR-001 approval hold; not the current approval authority).
- Exact supplement inventory: investigation-notes.md. All remain factual/non-normative; include selected production coverage/calls, native comparison/raw stdout/full and standard transcript, launch/summary/timing records, reproducibility scripts and architecture correlation evidence.
- Key new architecture supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/architecture-correlation-evidence.json`.
- Prior architecture/code review artifacts: N/A — no prior review exists. Current independent architecture review: Pending; implementation/API-E2E/delivery artifacts N/A — not applicable before downstream work. Product artifacts N/A — not requested.

## Risks / Validation Boundaries / Constraints
Internal file format is not a promised provider API. Ambiguous/multi-call/duplicate/changed records must remain unresolved, never matched by path alone. Check abort/same-turn behavior, bounded framing/UTF-8, lost/partial/oversized records, command truncation corroboration and unchanged native/MCP/image/error/background semantics. Existing tests with path-only fixtures are not proof of completeness.

No implementation tests or post-fix product acceptance have been run: native investigation evidence proves source feasibility only. Implementer owns source/test changes and self-checks, API/E2E owns canonical/saved/rendered validation, Delivery owns integrated gates and user verification. No release/deployment approval inferred from requirements approval.

## Handoff Rule Decision
`get_handoff_rules` succeeded after full package persistence. The most specific matching rule is Architecture Design Complete with architectural_risk=High and current explicit requirements approval; exact returned recipient: **/architecture_reviewer**. Medium/Low direct-implementation rule does not match High risk; no returned delivery receipt exists. Only architecture_reviewer receives this outcome, using send_message_to with this same absolute file path in content and reference_files. No delegated copy, duplicate implementation forwarding or polling.
