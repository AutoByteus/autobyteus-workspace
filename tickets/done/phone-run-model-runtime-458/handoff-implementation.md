# autobyteus-458 (with the build items of 506) — Architecture Design Complete (direct implementation route)

- Package: `phone-run-model-runtime-458`, SR-003; task_size `Medium`, architectural_risk `Low` → direct implementation (implementation self-checks, code review and API/E2E validation still apply)
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458`, `codex/phone-run-model-runtime-458`, `origin/personal` @ `3b59ef0be1` (1.5.13-beta.8); finalization target `origin/personal`. Documents uncommitted; no source changed.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the founder; Project Task `autobyteus-458` (its newest comment: the 506 build items join this Task).
- Approval: the founder approved the Product designer's specification (2026-11-17); DEC-001 (phone may stop and change) allowed; DEC-003 one-tap Stop; DEC-004 (stop icon for any live run) decided from the code.
- Classification rationale: web only, existing owners (store, stop action, New run rows, phone runtime gate); no server, contract, persistence or security change.

## Build

1. Phone conversation (506): 388 px column at 412 px, speaker line per turn, 17 px / 1.5, markdown and card values; another agent's message **unchanged** (arrow and type line kept, the founder's correction of 2026-11-17, overriding the specification's VIS-004 for this item); composer lower corners (shared) and 8 px below on the phone.
2. Text size: four steps in the ⋮ menu, phone-wide, `localStorage` `autobyteus.phone.textSize`.
3. Settings (458): ⋮ entry "Settings"; screen with name and status, New run's Runtime and Model rows, Save → back to the conversation; refusal card; live run → red stop icon, one tap, rows open after.
4. Translation keys `mobile.settings.*` (English and Chinese).

## Sources

- Specification and visual references: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/` (`ui-ux-spec.md`, `visual-references/VIS-001…019`, `ui-text-inventory.md`, `ui-reference-runbook.md`); runnable UI reference: `/Users/normy/autobyteus_org/autobyteus-web-design` (branch `personal` `fc68a7a4d2`).
- Ticket documents: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458/tickets/in-progress/phone-run-model-runtime-458/` (`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`).
- Designer's findings: (a) the reference's model sheet logs `llmStore.refreshCatalog is not a function` (a stand-in gap; the product's Refresh models is the spec); (b) answered by DEC-004.

## Validation intent

Isolated node and scripted runtimes; phone-bundle probe (layout at 412 and 360 px, Text size, Settings stopped / refused / live idle / working, Team member) and the Android emulator journey (AC-004, AC-006); desktop unchanged except the composer corner (AC-008). Release only on the founder's word.
