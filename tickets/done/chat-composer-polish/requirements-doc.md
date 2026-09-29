# Requirements Document — chat-composer-polish

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `chat-composer-polish`
- Request / ticket: User chat request of 2026-09-29 (3 screenshots/notes about the new-chat composer)
- Requirements owner: Solution Designer
- Date: 2026-09-29
- Approval state and reference: Approved. The user replied "go" in chat on 2026-09-29 to the SR-002 baseline (designer-resolved DEC-001 = B, DEC-002 = Yes, DEC-003 = 14vh→~6vh)
- Exact approved requirements baseline / solution revision: SR-002 content (REQ-001–009 incl. REQ-001a, AC-001–010)
- Behavior-defining supplements and their approved versions: N/A — none

## Problem And Desired Outcome

- Problem: The new-chat composer has three rough edges. (1) Picking a reasoning effort does not turn
  thinking on, so the user has to make two selections. (2) The workspace picker cannot be searched.
  (3) The composer sits slightly too high on the page.
- Affected actors: A desktop/web user starting a new chat.
- Desired outcome: Picking an effort level turns thinking on in one step. The user can type to find a
  workspace. The composer sits a little lower.
- Observable definition of success: See AC-001…AC-009.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | For models with an on/off thinking switch plus effort/budget/display settings, picking an effort only stores the effort; thinking stays Off | Picking any dependent thinking setting also turns thinking On | The chosen effort value is exactly what the user picked | `ChatThinkingControl.vue:148-156` |
| BEH-002 | User | SCN-001 | While Off, the effort list still shows a check mark on the default ("Medium ✓") | While Off, no dependent setting shows as selected; while On, the active value is checked | — | `ChatThinkingControl.vue:112-131` |
| BEH-003 | User | SCN-001 | The trigger shows "Off"/"On" from the on/off key only | The trigger shows "Off" when thinking is off, and the active effort level (e.g. "Medium") when it is on and an effort exists; otherwise "On" | Models without an on/off key keep their current summary | `ChatThinkingControl.vue:133-137` |
| BEH-004 | User | SCN-002 | Choosing "Off" sets thinking off | Unchanged | Turning thinking off still works in one step | adapter `applyThinkingToggle` |
| BEH-005 | User | SCN-003 | The workspace menu has no search | A search box at the top filters the temp workspace and the user's workspaces by name or path as the user types | Selection, keyboard navigation, "Open another folder…" | `ChatWorkspaceMenu.vue` |
| BEH-006 | User | SCN-004 | The composer group has an upward bias (`pb-[14vh]`) | The composer sits noticeably but slightly lower | Heading/subtitle/hint order and centering | `ChatNewSurface.vue:3` |

## Scope Guardrail

### In-Scope Use Cases

- UC-001: Choose a thinking effort, budget or display setting in the new-chat composer's thinking menu.
- UC-002: Turn thinking on or off in the same menu.
- UC-003: Find and choose a workspace in the new-chat composer's workspace menu by typing.
- UC-004: View the new-chat page with the composer lower on the page.

### Out Of Scope

- Backend or runtime handling of thinking/effort (`claude-session-config.ts`, provider LLM classes).
- Model schemas themselves (defaults, enum values).
- Searching workspaces anywhere other than the new-chat composer menu.
- Layout of the running-conversation view.

### Non-Goals

- Changing which thinking parameters a model exposes.
- Server-side workspace search.

### Preserved Behavior Boundary

- BEH-004. Schemas without an on/off key (OpenAI, Grok, Gemini, GLM, Kimi, Opus 5.5 API) keep their
  current menu behavior. Existing workspace selection, "Open another folder…" and keyboard navigation
  keep working.

### Review Authority

Standard: blocking findings must cite a REQ/AC/BEH ID above; new behavior is a Requirement Gap.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | In the chat thinking menu, choosing a value for a setting that only applies while thinking is on (Claude `reasoning_effort` / `thinking_budget_tokens` / `thinking_display` with a `thinking_enabled` switch; DeepSeek-style `reasoning_effort` with a `thinking_type` switch) turns thinking on and stores the chosen value in one action. | BEH-001 | Must | The user's main complaint | User report 1 |
| REQ-001a | (DEC-001 = B) When the model has an on/off switch **and** an effort list, the menu shows one "Thinking" list: `Off`, then each effort level (e.g. Off · Low · Medium · High · Xhigh · Max). There is no separate On row. When the switch has no effort list, the list is `Off · On`. Other dependent settings (budget, display) appear below a divider as a secondary section; changing one also turns thinking on. | BEH-001, BEH-002 | Must | Removes the "effort chosen but Off" state entirely | Designer recommendation, user delegated the choice |
| REQ-002 | Exactly one item in the primary list is checked, and it matches what will be sent: `Off` when thinking is off, otherwise the active effort (or `On`). | BEH-002 | Must | Avoids a misleading "Medium ✓" while Off | User report 1 |
| REQ-003 | The thinking trigger label reflects the real state: "Off" when off; the active effort level when on and the model has an effort setting; otherwise "On". The bulb icon is muted when thinking is off and uses the normal text color when on. | BEH-003 | Should | The label shows what will actually be sent | User report 1 |
| REQ-004 | Choosing "Off" still turns thinking off in one action. Picking an effort after Off turns thinking back on at that effort. | BEH-004 | Must | Preserve one-click off | — |
| REQ-008 | (DEC-002 = Yes) In the run-configuration form, changing a dependent thinking setting under "Advanced" while the Thinking toggle is off also turns the toggle on. The form layout is otherwise unchanged. | BEH-001 | Should | Same rule on both surfaces | Designer recommendation |
| REQ-005 | The workspace menu has a search box, focused when the menu opens, that filters the temp workspace and user workspaces by case-insensitive match on name or path. It shows an empty-state message when nothing matches. | BEH-005 | Must | User report 2 | User report 2 |
| REQ-006 | Keyboard use works with search: typing filters, ArrowDown moves from the search box into the results, Enter picks the highlighted/first match, Escape closes the menu. "Open another folder…" stays available. | BEH-005 | Must | Keyboard parity with the model menu | `ChatModelMenu.vue` pattern |
| REQ-007 | On the new-chat page, the composer sits slightly lower than today. (DEC-003) Reduce the upward bias from 14vh to about 6vh of bottom padding, so the block moves down ~4vh but stays at the optical center, slightly above the geometric middle. Nothing may overlap at small window heights. The agent/running conversation view does not move. | BEH-006 | Should | User report 3 | User report 3; SR-004 (proposal withdrawn, user accepted as is) |
| REQ-009 | The workspace search box uses the same visual treatment as the model menu search (magnifier icon, borderless input on a bottom divider). It is always shown, for consistency with the model menu. | BEH-005 | Should | Visual consistency across composer menus | Designer recommendation |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-001a | SCN-001 | Claude SDK model, thinking Off, open the menu and pick "High" | The menu shows one list "Off · Low · Medium · High · Xhigh · Max" (no separate On row). After the pick, the config has `thinking_enabled: true` and `reasoning_effort: 'high'`; the trigger shows "High" | — | Component test + manual |
| AC-002 | REQ-001 | SCN-001 | DeepSeek V4, `thinking_type: disabled`, pick effort "max" | `thinking_type: 'enabled'`, `reasoning_effort: 'max'` | — | Component/unit test |
| AC-003 | REQ-001 | SCN-001 | Anthropic API budget model, Off, enter a budget | `thinking_enabled: true` and the entered budget | — | Unit test |
| AC-004 | REQ-002, REQ-003 | SCN-001 | Thinking Off | Only `Off` is checked; the trigger shows "Off" with a muted bulb | — | Component test |
| AC-005 | REQ-004 | SCN-002 | Thinking On at High, pick "Off" | `thinking_enabled: false`; the trigger shows "Off"; picking "Medium" turns thinking on at medium | Model with a switch but no effort list: the list is Off · On | Component test |
| AC-010 | REQ-008 | SCN-001 | Run-config form, Thinking toggle off, change the Advanced effort | The toggle turns on and the chosen effort is kept | — | Component test |
| AC-006 | Preserved | SCN-001 | OpenAI/Gemini/GLM schemas | Menu behavior and stored values are unchanged from today | — | Existing + new tests |
| AC-007 | REQ-005 | SCN-003 | Open the workspace menu, type "mcps" | Only workspaces whose name/path contains "mcps" are listed; the temp workspace is hidden unless it matches; typing "zzz" shows the empty state | — | Component test + manual |
| AC-008 | REQ-006 | SCN-003 | Type a query, ArrowDown, Enter | The highlighted workspace is selected and the menu closes; Escape closes without changing the selection | — | Component test |
| AC-009 | REQ-007 | SCN-004 | Open the new-chat page | The composer is visibly lower than on `personal` today; nothing overlaps or is clipped at ~700px height; the agent/running view is unchanged | — | Manual user verification (user accepted the delivered position, 2026-09-29) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Entry | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Chat user | Run with a chosen thinking depth | New-chat composer thinking menu | Model with an on/off switch; thinking Off | Open menu → pick effort | Thinking On at the chosen effort | — | Supported Normal | Screenshot 1 | REQ-001–003, AC-001–004, 006 |
| SCN-002 | User | Chat user | Turn thinking off/on | Same | Thinking On | Pick Off / On | Off / On with defaults | — | Supported Normal | Existing behavior | REQ-004, AC-005 |
| SCN-003 | User | Chat user with many workspaces | Pick a workspace quickly | New-chat workspace menu | Menu closed | Open → type → pick | Workspace selected | No match → empty state; open folder still available | Supported Normal | Screenshot 2 | REQ-005–006, AC-007–008 |
| SCN-004 | User | Chat user | Comfortable composer placement | New-chat page | — | Open page | Composer lower | Small window heights | Supported Normal | User report 3 | REQ-007, AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes (small, in-place polish; no Product prototype requested)
- Linked prototype / UI spec / Product ticket: N/A — not applicable
- Normative details: thinking menu = one merged "Thinking" list (DEC-001 option B, REQ-001a), with the
  trigger showing the level and a muted bulb when off. The workspace search follows the model-menu search
  styling, with the placeholder "Search workspaces" (REQ-009). Composer bias is 14vh → ~6vh (REQ-007).
- Unresolved: none. The user delegated the aesthetic choices to the designer (2026-09-29). The final
  vertical offset will be confirmed during user verification.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005, REQ-006 | Accessibility | The search input has an accessible label; results stay `role="option"` inside a listbox; the menu can be used with the keyboard alone | Workspace menu | Component test |
| QR-002 | REQ-001–003 | Accessibility | Menu items keep correct `aria-checked` | Thinking menu | Component test |

## Data Continuity And Acceptable Loss

- Persisted data affected: No (draft config only; existing stored run configs remain valid).

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Server model config schemas | Read-only input; not changed | Investigation notes | None |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Effort/budget/display settings are only meaningful to the user while thinking is on (the product describes effort as "thinking depth") | Basis for REQ-001/002 | User approval | Accepted with approval |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Menu shape for the thinking control | Determines how much UI changes | A: keep two groups + auto-enable. **B (chosen):** one merged list, Off · efforts | Designer (delegated by user) | Approved: B |
| DEC-002 | Apply the auto-enable rule to the run-config form? | Consistency | **Yes (chosen)** | Designer (delegated) | Approved: Yes |
| DEC-003 | How much lower should the composer sit? | Visual target | 14vh → ~6vh bias (implemented). SR-004 proposed ~60% of height; the user declined the further move and accepted the delivered position ("that's fine for now … I can accept that", 2026-09-29) | User | Approved: 6vh (as delivered) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001, REQ-001a | UC-001 | BEH-001 | AC-001–003 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-004 | SCN-001 |
| REQ-003 | UC-001 | BEH-003 | AC-001, AC-004 | SCN-001 |
| REQ-004 | UC-002 | BEH-004 | AC-005 | SCN-002 |
| REQ-005 | UC-003 | BEH-005 | AC-007 | SCN-003 |
| REQ-006 | UC-003 | BEH-005 | AC-008 | SCN-003 |
| REQ-007 | UC-004 | BEH-006 | AC-009 | SCN-004 |
| REQ-008 | UC-001 | BEH-001 | AC-010 | SCN-001 |
| REQ-009 | UC-003 | BEH-005 | AC-007 | SCN-003 |

## Architecture Phase Input

- The dependent-key rule should come from the existing thinking adapter (`llmThinkingConfigAdapter.ts`),
  not a chat-only special case, so both surfaces can share it if DEC-002 is Yes.
- Verify the viewport behavior of the layout change at small heights.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: Yes
- Desired/preserved behavior explicit: Yes
- Scope/non-goals clear: Yes
- REQ/AC testable and traceable: Yes
- Scenarios covered: Yes
- Prototype evidence: N/A
- UI/UX approval basis: N/A
- Assumptions/decisions visible: Yes
- Content ready for user approval: Yes
- Remaining content blocker: none

### Approved Basis Ready For Design

- User approval received: Yes ("go", 2026-09-29)
- Exact requirements and supplement approval basis recorded: Yes
- Approved requirements package ready for architecture design: Yes
- Remaining blocker: None
