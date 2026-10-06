# Product Design Request (Revision 3) — run-settings-ui-unification

- Result classification: `Product Design Requested`
- Purpose: `Result Correction` (a gap in the returned, user-approved package; same requested scope)
- Package identifier: `run-settings-ui-unification`
- Current SR: `SR-005`
- From: `/software_engineering_team/solution_designer`
- To: `/product_team/product_ui_ux_designer` (handoff rule "Product Design Requested")
- Date: 2026-10-05
- Original user request: `product-design-request.md` (SR-001); revision `product-design-request-r2.md` (SR-003)
- Returned package being corrected: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/`
  - `ui-ux-spec.md`, `VIS-001..019`
  - Design `origin/personal` = `a5b0eec`
- Approval state:
  - The requirements (SR-005) are user-approved, including the new REQ-022 behavior.
  - Only the visual presentation of REQ-022 waits for this revision.

## The Gap (found during architecture investigation)

The old run forms showed every model setting from the model's config schema, including settings that
are not about thinking. The approved design's **Thinking** control (`ChatThinkingControl`,
`components/chat/chatThinkingMenu.ts`) shows only thinking settings (`getThinkingParamKeys` in
`utils/llmThinkingConfigAdapter.ts`). As a result, Codex **Fast mode** cannot be set anywhere in the new
design: not in New chat, not on the Org launch page, not per member, and not on a saved run. The user's
own screenshot of the old Team Configuration shows it under Advanced
(`evidence/user-screenshots/01-team-existing-run-configuration.png`: Reasoning Effort, Fast mode).

Source of the setting: the Codex model schema parameter `service_tier`, labelled "Fast mode", enum
`["fast"]`, not required. "Default" means unset; Codex keeps its service tier. See
`autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts:55-66`.
Other runtimes may expose other non-thinking parameters in the future, so the solution should be
generic, not Codex-only.

## User Direction (2026-10-05)

- "This means we're not complete … I think that's a miss … Of course, we need to enable the faster
  mode. For example, when codex is selected … maybe the UI sent is not completely right."
- "fast mode should be able to be in the chat page as well right? because basically if we select
  codex, we should be able to select the fast mode right?"
- "Maybe you ask the product team to fix the UI. I think I feel more secure."

## Approved Behavior To Design (requirements REQ-022 / AC-019 / BEH-009)

- Wherever the model + thinking controls appear, the selected model's **other model settings**
  (non-thinking schema parameters, e.g. Codex Fast mode) can be set:
  - New chat composer (every target: Daily Assistant, agents, teams);
  - Org launch page card;
  - Member settings drawer rows;
  - saved-run settings (editable only when stopped, read-only while running, like thinking).
- A model without such settings shows nothing extra.
- A model with other settings but no thinking settings still offers them. Today the card row shows
  "Not available for this model" in that case, so a decision is needed.
- The current value must be visible at a glance. The provisional idea in requirements is to add it to
  the summary, e.g. "Medium · Fast". This is provisional; you decide.
- "+" copy and the heading switcher carry it like thinking. Saved runs keep the value.

## Focused Decision For Product

How Fast mode, and generically any other model setting, appears and is chosen within the approved
language. My provisional baseline is the Thinking menu's existing extra-settings section: a labelled
"Fast mode" group with Default / Fast below the thinking levels. You may choose otherwise, for
example a separate small control. Please cover:

- the menu state (Codex model, Fast off and on) in the New chat composer;
- the summary/trigger label;
- the member row summary line;
- the saved-run row (stopped editable, running read-only);
- a model with only other settings;
- phone 390 px.

Use a Codex model fixture with Fast mode support; the current fixture lacks it.

## Unchanged (user-approved; do not reopen)

Everything else in `ui-ux-spec.md` (UXJ-001..009, UIS-001..005) stays as approved, including
DEC-001..006 outcomes and the stop wording.

## Canonical Paths

- Requirements (SR-005): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/requirements-doc.md`
- Investigation notes (AF-012): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/solution-revision-record.md`
- Source base: `origin/personal@fc79fad14`

## Expected Output From Product

- An updated, user-confirmed `ui-ux-spec.md` with the "other model settings" presentation, exact copy
  (en and zh-CN) and states.
- Visual references for the states above.
- The design repository revision and the user-confirmation reference.

Return it to `/software_engineering_team/solution_designer`. Architecture design resumes then.

## Route Record

- `get_handoff_rules` (2026-10-05): matching rule → `/product_team/product_ui_ux_designer`
  ("Product Design Requested"). No other rule applies.
