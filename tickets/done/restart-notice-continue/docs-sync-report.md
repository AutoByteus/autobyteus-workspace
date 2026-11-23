# Docs Sync Report

## Scope

- Ticket: `restart-notice-continue` (Project Task `autobyteus-585`). The founder dropped part 1, the notice wording (DEC-001), so this is part 2: every platform notice is its own light, labelled row on desktop and phone (DEC-002). `task_size: Small`, `architectural_risk: Low`, direct route (architecture, code and test-code review `Not Applicable`).
- Trigger: API/E2E handoff (API-REV-001 Pass, 95%), 2026-11-22.
- Bootstrap base reference: `origin/personal` @ `0da6bfbfc1`.
- Integrated base reference used for docs sync: `origin/personal` @ `a07d6fbac8` (77 commits), merged as `f2330b7f4e`.
- Post-integration verification reference: `evidence/delivery/` DEL-01..05 (`release-deployment-report.md`).

## Why Docs Were Updated

- The implementation rewrote the notice description in `autobyteus-web/docs/agent_execution_architecture.md`: own row, the row builder, the labels per sender, the header not repeated. Delivery confirmed it on the merged state.
- Two server module docs still called the notice a "card". DEC-002 makes it a light row and keeps the rejection of a heavy card. Delivery changed the word to "notice row".

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | how notices are drawn; also changed by the base | No change (updated by implementation; merged cleanly) | matches `recentEventMonitorWindow.ts` and `SystemTaskNotificationSegment.vue` |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | "the conversation card … shows it in the viewer's own time zone" | Updated | "notice row" |
| `autobyteus-server-ts/docs/modules/tool_list_updates.md` | "a 'Tools updated' card" (twice) | Updated | "notice row" |
| `autobyteus-server-ts/docs/modules/skill_update_notices.md` | "labelled **Skill updated** (zh-CN 技能已更新)" | No change | matches the label |
| `GLOSSARY.md` | Restart reminder, Background task notice | No change | no display wording |
| `DESIGN.md`, `TESTING.md`, `RELEASE.md` | project documents | No change | TESTING.md does not list individual desktop probes; no ticket report recorded a discrepancy |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | wording | "conversation card" → "conversation's notice row" | DEC-002 |
| `autobyteus-server-ts/docs/modules/tool_list_updates.md` | wording | "'Tools updated' card" → "notice row" (twice) | DEC-002 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| a notice drawn inside the agent's message, with a `[Platform notice — …]` header line | its own labelled row; the header line not repeated in the body | `agent_execution_architecture.md` |

## Delivery Continuation

- Result: `Pass`. Follow-ups FU-001 and FU-002 are recorded by API/E2E in `follow-ups.md`; delivery added none.
