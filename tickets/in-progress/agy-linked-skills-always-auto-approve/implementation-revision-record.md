# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 1 (Pass) | AR-001 (non-blocking, applied) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001 | Implemented; local checks and live AGY probe pass |

## Revision Entries

### IR-001 — Linked AGY skills, always auto-approve, locked web control

- Triggering role, report path, and round: Architecture Reviewer pass, `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/design-review-report.md`, round 1.
- Triggering finding IDs: N/A for the baseline. AR-001 (non-blocking) is applied in this baseline.
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implementation complete for REQ-001..006 / AC-001..009. Ready for independent code review (Medium / High).
- Related solution revision IDs: SR-001 (approved requirements), SR-002 (design)
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: First implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..006; REQ-001..006; AC-001..009.
- Implementation delta:
  - Server skills: removed the AGY-only detailed resolution (`resolveConfiguredSkillBindingsForAgentDetailed`, `resolveForAgentDetailed`, `resolveInstalledRecordDetailed` and helpers), `configured-skill-source-fingerprint.ts`, `DetailedConfiguredSkillResolution`, `ConfiguredSkillSource`/`source`, `sourceFor`, and `InstalledSkillRecord.origin/trustedRoot/configuredRoot` plus their computation in `skill-discovery.ts`. The compiler found no consumer of `origin`, so it was removed.
  - AGY: `capsule/agy-configured-skill-materializer.ts` was replaced by `capsule/agy-configured-skill-linker.ts` (`linkAgyConfiguredSkills`, `AgySkillLink`). It creates one dir symlink per skill and checks only that the folder exists and has a `SKILL.md`. ALL_INSTALLED skips with a warning; CONFIGURED throws `AgentCreationError("Antigravity could not use skill '<name>': <reason>.")`. Per AR-001 this covers workspace collision, duplicate and unsafe names as well. `restoreAgyRunCapsule` unlinks a dangling skill link, warns and continues. The factory uses regular bindings and always requires `always-proceed`. `AgyStreamProcess.start` always passes `--dangerously-skip-permissions`, and `autoExecuteTools` was removed from its input.
  - Web: added `isAutoApproveLockedForRuntime` and `effectiveAutoExecuteTools` to `utils/agentRunRuntimeDraftPolicy.ts`. These are applied to the chat toggle, `AgentRunConfigForm` (new and existing run), `TeamScopeConfigEditor` (root and nested scopes, which covers the team, org-team and existing-run editors), `MemberOverrideItem`, the `AgentOrgRunConfigPanel` root and `MobileLaunchRunOptionsCard`. Chat and org launches submit `autoExecuteTools: true` for AGY. i18n: `workspace.runModelConfig.agyAutoApproveLocked`, `chat.approval.agyLockedTooltip` and `chat.approval.agyLockedAria` (en + zh-CN); the two `agy_auto_approve_tools_help` keys were removed.
  - Docs: `antigravity_cli_runtime.md`, `skills.md`, `agent_execution.md`, web `agent_execution_architecture.md`, `remote_access.md`.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: server AGY + skills + agent-execution unit tests pass (pre-existing unrelated failures confirmed at base `84224a58d`). Web related suites: 200 files pass. Localization/web-boundary guards pass. Server build passes. Live AGY probe L01–L04 passes, as does the `AGY_LIVE` linked-skill vitest.
- Next recipient or routing: per `get_handoff_rules` (Medium/High → code review).
- Remaining limitations or risks: RSK-001 (accepted); ASM-001 is verified only on the installed `agy`. The chat footer explanation is a tooltip plus a lock icon (see handoff). Repeated restore warnings for an unlinked skill.
