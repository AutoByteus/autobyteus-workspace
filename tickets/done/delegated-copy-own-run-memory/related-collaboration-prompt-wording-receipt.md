# Finalized Delivery Receipt — `collaboration-prompt-wording`

Verified by `/software_engineering_team/solution_designer`, 2026-10-16. The ticket was started by
the user directly (no Project Task). Finalized artifacts are read-only at
`origin/personal:tickets/done/collaboration-prompt-wording/`.

## Verification

| Check | Evidence | Result |
| --- | --- | --- |
| Integration | `origin/personal` at `cf348d6dd6`; `--no-ff` merge `d91298416e` (parents `3712cd9bf0`, `e6fc0898a8`); ticket commits `4ce592a084`, `e6fc0898a8`; record `cf348d6dd6` | OK |
| Cumulative package | archived folder: requirements (incl. SR-017 / DEC-018 and Codex follow-up Task ID), investigation, design, revision records SR-001..SR-017, wording authority, complete views and generator, implementation, API/E2E, code review, delivery artifacts, evidence with `TRACES-NOT-COMMITTED.md` | OK |
| Durable test fixture | `tests/e2e/fixtures/collaboration-prompt-complete-views.md` holds the six approved prompt blocks; all six are identical to the archived views | OK |
| Validation | API-REV-005 proves AC-001..AC-008 on the judging runtimes (Claude Sonnet, DeepSeek flash; DEC-018); confidence 93% (Codex excluded, unit-only catalogue entries); CRR-005 9.3/10, CRR-007 pass | OK |
| Docs sync | 10 server docs changed (`agent_communication`, `agent_tools`, `projects`, `prompt_engineering`, `collaboration_model`, …) | OK |
| Credential check | no secret values or prefixes in delivery files, evidence, patches or tracked files; test roots with imported keys deleted | OK |
| Release | none (the user's decision); beta blocked by FU-1 (`autobyteus-agents` PTM package still lists `create_or_update_task`) | OK (Not required) |
| Cleanup | worktree, local and remote ticket branches removed; traces archived locally in `_delivery-reports/collaboration-prompt-wording-traces/` | OK |

Classification: `Terminal`.

## Open after delivery

- Codex rerun of AC-008 after 2026-10-22 09:16: Project Task `project_task_55107203-f674-488c-8a3c-00c2920ccf04` (TODO).
- FU-1 (PTM agent package task tools) blocks any release containing task-tool-split.
- Carry-forward: native-runtime live prompt read-back and role-on-restore not live-proven; 26 catalogue entries unit-only; M-27 ends with a period in the wording but not in the product (cosmetic); duplicate "You" bubble after `delegate_task` (pre-existing); PMU-008/PMU-021/TMV-002 with the Project Task Manager (Task a1dfb6dc part 3).
- Suggestion from delivery: promote the wording authority and complete views from the archived ticket into `autobyteus-server-ts/docs/design/`.
