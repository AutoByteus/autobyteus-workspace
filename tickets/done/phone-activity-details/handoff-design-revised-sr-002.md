# Handoff: Design Revised (SR-002) — autobyteus-590 (phone-activity-details)

- Result: `Architecture Design Complete` (revision), SR-002, task_size `Medium`, architectural_risk `Low` (unchanged) → implementation.
- Trigger: the user's review of the proposed row and detail mock-ups (2026-11-22); decisions DEC-006…DEC-008 are the user's.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details/tickets/in-progress/phone-activity-details`; branch `codex/phone-activity-details`.

## What changes from SR-001

1. **D-2a — shared summary (`utils/toolDisplaySummary.ts`):** `recipient_address` → "→ <address>"; `task_id` → the Task key (after command/file keys, before generic text keys). A command summary's `text` drops one leading `cd <path> &&` / `cd <path>;`; its `title` keeps the full command. The conversation's tool cards (desktop and phone) and event monitor page cards use the same rule and improve the same way: update their specs.
2. **D-3:** `toolActivityStatusPresentation` also returns an `icon`.
3. **D-5 — phone row status:** a success shows its check icon only (`aria-label` "Success"); every other status shows icon + word (Failed, Running, Review, Denied, Approved, Parsed). The detail screen spells the status out. Summary line up to two lines.
4. Tests: AC-001 (agent-tool summaries, `cd` prefix, conversation tool card specs) and AC-002 (icon-only success, icon + word otherwise) as revised.

Everything else (586 first, D-1; D-2…D-7) is unchanged.
