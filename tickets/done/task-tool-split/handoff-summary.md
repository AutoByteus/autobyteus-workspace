# Handoff Summary — task-tool-split

- Task size / architectural risk / route: Medium / High / Code Review (reviewed route)
- Change: `create_or_update_task` split into `create_task` and `update_task`; no auto-added task tool; closing guidance moved onto the `update_task` description; `@` note and closed-Task errors name no task tool; previous-release notes still parse.
- Branch: `codex/task-tool-split`; base `35eacddb25` (current with `origin/personal`, no merge needed); implementation commit `0f89e845f0`.
- Validation: API/E2E 94% confidence, no category below 90%; code review CRR-001 9.4/10, test-code review CRR-002 pass.
- Docs: three stale anchors/counts fixed (docs-sync-report.md).
- Release: none requested; ships with the next release. Release notes: release-notes.md.
- Release coordination (FU-1): the Project Task Manager package in `autobyteus-agents` must switch `toolNames` to `create_task`/`update_task` in the same release, or that agent loses its task tools.
- Rebase note: Project Task 259ddae7 edits the same llm-contract file; the second to land rebases and re-pins the hashes.
- Residual risks (accepted): AC-007 proven at session/unit level only; AutoByteus-native runtime at unit level only; real-AGY host-crash cases L01/L02 blocked by quota; intermittent `task-copy-idle-lifetime` e2e judged pre-existing (base 2/11 vs branch 4/10).
- Follow-ups FU-T1..FU-T3 (pre-existing failures) were sent to /project_task_manager.
