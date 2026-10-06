# Solution Revision Record

## Revision Index
| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Bug report relayed by /tutorial_video_producer (2026-10-06) + user decisions | N/A | N/A | Requirements Approved; design Ready (Medium / Low) | BEH-001..006, REQ-001..006, AC-001..008 | Routed per handoff rules |

## Revision Entries
### SR-001 — Show in-run agents in `@`; neutral in-run guidance; copy update
- Phase and classification: Mixed, Initial Baseline
- Trigger: user report that Agent Package Creator cannot be `@`-mentioned; investigation E-01..E-06 (it is a collaborator in the run; `@` excludes in-run definitions)
- Predecessor link: `tickets/done/mention-delegation-dismissal/` (BEH-001 there preserved the candidate list; handoff residual "UI copy is unchanged")
- User decisions: remove the in-run constraint; neutral choice for in-run mentions (option B); copy change; approved "Yes, approve" 2026-10-06
- Recorded clarification: the run's own definition stays excluded (as today and in `list_available_agents`)
- Intended behavior changed: Yes (new baseline)
- Design: design-spec.md Ready; task_size `Medium`, architectural_risk `Low`
- Remaining gaps: none blocking; residual: focused member may see its own definition
- Next action: route per handoff rules
