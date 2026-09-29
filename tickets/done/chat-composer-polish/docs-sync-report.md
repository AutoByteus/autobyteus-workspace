# Docs Sync Report — chat-composer-polish

## Scope

- Ticket: `chat-composer-polish` (IR-001, SR-003). Classification preserved: `task_size=Medium`, `architectural_risk=Low`, route `Direct` (no independent architecture, source or test-code review).
- Trigger: API/E2E Pass (API-REV-001, round 1) from `api_e2e_engineer`.
- Bootstrap base reference: `origin/personal@c8c7351e5`.
- Integrated base reference used for docs sync: `origin/personal@50c05b45f`, merged into the ticket branch as `b72dbea87`.
- Post-integration verification reference: `delivery-evidence/post-integration-focused-vitest.log` (6 files, 57/57 pass).

## Why Docs Were Updated

- Summary: the Chat doc did not describe the thinking menu, workspace search or composer placement. The settings doc did not describe the new rule in the run-configuration form: an Advanced edit to a thinking-dependent setting turns Thinking on.
- Why this should live in long-lived project docs: the rule has one owner, `llmThinkingConfigAdapter`, and two surfaces use it. Future work on either surface must know about it, and must know that automatic default and sanitize writes do not trigger it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | Owns the New chat composer: footer menus and surface | Updated | Workspace search, thinking menu, placement, tests |
| `autobyteus-web/docs/settings.md` | Owns the model-config / Thinking / Advanced behavior | Updated | Dependent-edit rule added after the Advanced open/collapse paragraph |
| `autobyteus-web/docs/agent_management.md` | Mentions `reasoning_effort` in the launch config | No change | Describes schema-driven params only; still accurate |
| `autobyteus-web/README.md` | Test script listing | No change | Does not list per-ticket e2e probes |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | Behavior + ownership | Workspace menu: search box, `filterWorkspaceOptions`, empty state, keyboard and IME rules, query reset. New "Thinking menu" section: the merged Off · levels list, trigger label and bulb, per-parameter fallback, adapter owners. New "New chat placement" section (`pb-[6vh]`). New tests and the browser probe. | REQ-001–009 |
| `autobyteus-web/docs/settings.md` | Behavior + ownership | The dependent-edit auto-enable rule through `applyThinkingDependentEdit`; automatic writes are excluded | REQ-008 / AC-010 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Thinking dependent-setting invariant | Choosing or editing a setting that applies only while thinking is on turns the switch on. `llmThinkingConfigAdapter` owns this rule; UI surfaces must not reimplement it. | `design-spec.md`, `implementation-handoff.md` | `chat.md`, `settings.md` |
| Chat thinking menu model | `buildChatThinkingMenu` is the pure model. Schemas with a switch get the merged list; other schemas keep the per-parameter menu. | `design-spec.md` | `chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Separate "Thinking enabled: On/Off" and "Reasoning effort" menu groups in `ChatThinkingControl.vue` (for schemas with a switch) | One merged "Thinking" list built by `chatThinkingMenu.ts` | `autobyteus-web/docs/chat.md` → Thinking menu |
| New chat bias `pb-[14vh]` | `pb-[6vh]` | `autobyteus-web/docs/chat.md` → New chat placement |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, local test build, then the user-verification hold.
- Notes: the docs were committed on the ticket branch as `641bacc03`.
