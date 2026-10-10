# Solution Handoff — compaction-prompt-cache-reuse

- Result: `Architecture Design Complete`
- Package identifier: `compaction-prompt-cache-reuse`
- Project Task: `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Current solution revision: `SR-004` (revised after ARCH-REV-001)
- Approval state: requirements Approved (SR-002, user 2026-10-09)
- Classification: `task_size = Large`, `architectural_risk = High` (see `design-spec.md`)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse`
- Branch: `codex/compaction-prompt-cache-reuse`
- Base: `origin/personal` @ `46e94fdea86ad9af7d8884e690721b373d754cea`. It includes the delivered `anthropic-prompt-caching` (v1.4.99-beta.9), which this Task depends on.
- Finalization target: `origin/personal`
- Dependencies installed.

## Request (summary)

Let native-runtime compaction reuse the conversation's prompt cache. Today a compaction re-reads the whole history at full price (about $3.20 per Opus 5.5 compaction); reusing the cache brings that to about $0.17.

User decisions (2026-10-09):
- always use the agent's own model, and remove the compaction-model setting;
- keep a same-model fallback for failed attempts;
- apply to all native providers;
- the summary covers the whole conversation, and the recent tail is still kept word for word;
- report compaction cost in the Token Meter.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/requirements-doc.md`
- Investigation notes: `…/investigation-notes.md`
- Design spec: `…/design-spec.md`
- Solution revision record: `…/solution-revision-record.md`
- Evidence (not behavior-defining): `…/probes/fork-summary-probe.mjs`, `…/probes/fork-summary-probe-result.json`, `…/probes/compaction-prompt.txt`
- Architecture review: ARCH-REV-001 Fail → resolved in SR-004 (see `solution-revision-record.md` § SR-004). Report: `…/design-review-report.md`; record: `…/architecture-review-revision-record.md`.

## Evidence Summary

Live Opus 5.5 probe:

| Summary request | Cache read | Full-price input | Result |
| --- | --- | --- | --- |
| Cached summary request (fork) | 9,423 | 4 | Valid summary, 0 tool calls, strict preserved-thinking check passed |
| Today's separate summarizer | 0 | 8,279 | Valid summary |

Summary quality was comparable. Compaction usage is currently unmetered.

## Open Risks

- Large-context forks near the window limit → budget check plus fallback.
- Non-Anthropic instruction following → parser plus fallback; validate one provider.
- Token-usage projection of the new ingestion kind with a null latest prompt → server tests.

## Expected Next Action

Architecture review (Large/High), then implementation per `design-spec.md` § Change / Refactor Sequence. Live validation through the test vault, then user verification in the desktop app.

## Routing

`get_handoff_rules` (2026-10-09) → `/software_engineering_team/architecture_reviewer`.
