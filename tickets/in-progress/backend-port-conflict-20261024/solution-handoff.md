# Solution Handoff — Architecture Design Complete

## Identity / Outcome
- Package: backend-port-conflict-20261024
- Task: project_task_8a0359c2-3b8e-47f1-a14a-d18d1459d8ca
- Requested by: /project_task_manager; run project_task_manager_603e6a7849f24400a3fe9944205f235b
- Result: Architecture Design Complete. Current SR-002; R1 Approved, D1 Ready.
- task_size: Large; architectural_risk: High. Material process ownership/lifetime, OS signalling, shutdown concurrency and IPC/status boundary changes across core, server hosts and desktop. Not documentation-volume classification.
- No implementation, independent review, changed-build acceptance, merge or release has occurred yet.

## Original Request And User Clarification
Improve AutoByteus backend port-conflict diagnosis and safe restart recovery with regression tests. Historical installed1.5.9-beta.3 restart failed after backend29695 remained occupied5000ms; an unrelated Nuxt process returned426. User additionally asked to investigate and reproduce why shutdown leaves background work, then explicitly confirmed “we should have a mechanism to stop all those background processes, because the application will shut down”. Requirements distinguish AutoByteus-owned command cleanup from advisory external listener diagnosis. The historical process's ancestry/port choice remains unproven.

## Approval / Scope
R1 approval reference and exact user quote are in requirements-doc.md/SR-001. Solution Designer informed user that backend/application shutdown (including Restart Server) will stop owned backgrounds, not unrelated apps, while preserving ordinary agent/idle-stop preview lifetimes. No Needs user decision remains. No Product Design supplements. D1 implements R1, not a new product proposal.
UC-001 desktop conflict/retry and UC-002 application/backend owned-background shutdown only. No reset/data migration, external kills, installed binary patch, running app/preview disruption, automatic port change, daemon reclamation, release/publish/install, or provider-wide redesign. Preserve unrelated edits and data.

## Workspace / Base / Finalization
- Worktree: /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024
- Branch: task/backend-port-conflict-20261024
- Refreshed and verified remote default/base: origin/personal
- Base revision: 034bfe51ab697817773ff545d369e1cfc03a79c5
- Finalization target: personal/origin/personal under repository RELEASE.md and Delivery rules; user explicitly requires merged base verification and cleanup, no release.
- Shared checkout /Users/normy/autobyteus-org/autobyteus-workspace remains local personal46e94fdea and unrelated untracked task-plans/; do not reset or erase it. Other worktrees are not owned by this task.
- Authoring changes so far: this ticket's docs/probe evidence and docs/design-cases.md. No production code changed.

## Authoritative Documents (absolute paths)
- /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/requirements-doc.md
- /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/investigation-notes.md
- /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/design-spec.md
- /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/solution-revision-record.md
- This handoff: /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024/tickets/in-progress/backend-port-conflict-20261024/solution-handoff.md
- Reproduction supplements: same ticket/evidence/ (complete inventory in investigation notes).
- Original read-only report: /Users/normy/.autobyteus/server-data/projects/project_0b3edda8-91b4-4c0c-8a11-afed3bea2a05/tasks/project_task_8a0359c2-3b8e-47f1-a14a-d18d1459d8ca/context/ctx_04101b5094f8__autobyteus-restart-diagnosis-2026-10-24.txt

## Evidence / Design Summary
1. P-001 real port preflight blocks IPv6 wildcard426; no-child stop leaves external listener alive; after fixture removed preflight succeeds. Initial loopback fixture instead revealed a0.0.0.0-only guard gap. Preserve that failure evidence.
2. P-002/P-003 real native background tool and shutdown orchestrator return success, but detached HTTP child survives parentSIGTERM/exit0 and becomes PPID1. Missing host-lifetime cleanup connection demonstrated; NOT historical Nuxt causation or full Studio validation.
3. P-005 actual manager.stopAll returns1 after shell leader exits, yet TERM-resistant child remains alive/listening. Calling existing stopAll alone does not fix this.
4. P-004 current actual Codex0.164.0 standalone command/exec through production client does close its listener. No model call or universal provider assertion.
5. Electron source/dependency contract proves will-quit does not await void stop(); explicit updater is another exit entry requiring preserved continuation. Actual changed desktop quit verification remains downstream work.
6. D1: explicit runtime-only NativeCommandProcessScope injected through native factories/config, immediate tracking for both command entry forms, verified group drain with bounded failure, early host shutdown integration in Studio+standalone, awaited desktop quit/restart, and typed read-only port diagnostic with safe localized UI. Ordinary agent stop is not host shutdown.

## Environment / Reproduction
macOS, Node26.12.0, dependencies installed in task worktree with `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" npm exec --yes --package=pnpm@10.28.2 -- pnpm install --frozen-lockfile`; pnpm is not directly on PATH. Nuxt prepare succeeded from web directory; no lockfile change. All initial setup failures retained in logs. No app build claimed.
From worktree root: `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" autobyteus-ts/node_modules/.bin/vitest run --config tickets/in-progress/backend-port-conflict-20261024/evidence/probe.config.mjs`.
Probe assertions intentionally describe baseline defects; do NOT call their pass a fix. Convert into ordinary package regressions requiring absence and port release. Evidence/native-signal-child.ts is a narrow signal harness, not the real full server. No paid provider, user credentials or29695 used. All task probe processes and per-probe roots were cleaned; no test process currently retained.

## Expected Next Action / Risks
Independent review or implementation is selected only by handoff rules below. Read R1, investigation and D1 before acting. Focus especially on native group identity/leader-exit/admission races, retained ended-agent work, early drain plus all remaining cleanup on failure, actual Electron exit barrier/update continuation, and snapshot/fallback consumers. Keep ownership evidence distinct from read-only PID diagnosis. Refine through Solution Designer for material gaps rather than choose alternate product lifetimes.
Implementation, code review and API/E2E remain their specialist owners. Changed-build isolated desktop proof is required: initial isolated preflight refuses a busy port, so arrange a test-owned conflict after a clean launch for restart; do not weaken isolation. Actual full-server SIGTERM and desktop quit/restart, healthy recovery, data sentinel and unrelated process survival are acceptance, alongside deterministic failure tests. No production process interaction is needed.
Known limitations: historical ancestry unknown; arbitrary daemon escape/OS hard kill excluded; Linux/WSL live certification not performed; current Codex control not all providers/tools. No established blocker, prerequisite, or follow-up. Delivery must verify final merged base and remove only task-owned worktree/branch/processes; no release/install.

## Routing
Selected rule: Architecture Design Complete with task_size=Large or architectural_risk=High, approved aligned package ready for independent review. Exact recipient: /software_engineering_team/architecture_reviewer. Rule lookup performed after persistence, 2026-10-24. No prior review. This is the sole outcome route; no duplicate forwarding to implementation or delegator.
