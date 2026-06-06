# Release Notes — Self-Evolving Harness Feasibility

## Summary

Adds an experimental, disabled-by-default manual skill self-evolution capability for AutoByteus runs.

## User-Facing Changes

- Settings → Server Settings → Basics now includes a **Self-evolution** capability toggle for the current node.
- When the global capability is enabled, visible run-launch forms can mark new runs eligible:
  - standalone agent launches expose **Self-evolution eligibility** default-off;
  - team launches expose a team-level default and member override controls.
- Eligible active runs/members expose a concise composer-adjacent **Self improve** CTA after backend eligibility has been checked.
- Run-history rows intentionally do not expose a separate self-evolution row action.
- Ineligible, old/pre-snapshot, helper/temp, and global-disabled contexts hide the chat CTA rather than exposing technical backend reasons.
- Starting self-evolution shows at most a transient toast/status; the composer does not render a persistent started card, evolution record id, or open-helper button.
- The separate Skill Self-Evolver helper run remains visible through normal history/sidebar surfaces.
- Active standalone target completion messages render as concise **System Task Notification** segments through a runtime-neutral local server event. The notification is not injected into the target runtime conversation.

## Backend/API Changes

- Added typed GraphQL capability, strategy catalog, eligibility, start, and minimal run-record surfaces.
- Added run-launch `selfEvolution` config placement for standalone and team/member launches with `selfEvolutionEffective` metadata snapshots.
- Added member-scoped team self-evolution targeting: the record target uses `team_member_run` with both `teamRunId` and `memberRunId`, and source run ids contain the selected member run id only.
- Added the built-in `autobyteus-skill-evolver` helper agent and setting key `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`.
- Added anonymized work-history evidence projection with explicit durable-update signal handling, including `DURABLE_SKILL_UPDATE:` / `SKILL_UPDATE:` markers.
- Added standalone active-target notification dispatch via local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` emission and the existing websocket `SYSTEM_TASK_NOTIFICATION` / `SystemTaskNotificationSegment` path.
- Removed reliance on runtime `postUserMessage` / `SenderType.SYSTEM` injection to render the standalone active-target UI notification.
- Definition-owned self-evolution config is intentionally not supported.

## Safety And Validation Notes

- The feature is globally disabled by default through `ENABLE_SELF_EVOLUTION`.
- MVP execution is manual-only and single-agent-evolver only; scheduled/signal triggers and evolver-team strategy are placeholders.
- Direct edits are limited by prompt/tool contract to configured writable skill roots, with `SKILL.md` as the primary guidance file. The simplified MVP records minimal provenance and notification outcome, but does not expose changed-path audit, policy-violation, or benefit-metrics reports.
- Changed files are not proof of downstream benefit; users should inspect/revert Git-backed skill packages manually when needed.
- Latest live browser/API validation passed for the normal UI-created standalone loop through **Self improve**: enable global setting, turn on visible launch eligibility, verify the run snapshot, verify V1 behavior, click **Self improve**, verify no old row action/old labels/persistent started card/record/open-helper button, verify the concise local-event system-task notification, verify no notification text was injected into the target runtime raw trace, verify helper prompt durable-update signal and redaction, verify the target `SKILL.md` changed from `CALIBRATION_MARKER_R11_V1` to `CALIBRATION_MARKER_R11_V2` without copying the canary, and verify the next normal UI-created run answered V2.
- Latest live browser/API validation also passed the team/member composer CTA identity check: target kind `team_member_run`, `teamRunId=team_calibration-di001-team-r11-di001-local-e_fd743947`, `memberRunId=calibrator_f23d90ffc402d5ec`, selected member run id only in `sourceRunIds`, and MVP `next_run_only` notification status.
- Full project-wide web `nuxi typecheck` remains blocked by pre-existing unrelated TypeScript errors; focused server/web validation, guards, server build, Electron build, and live browser/API E2E passed.
- Standalone active notifications are live local UI events; durable persisted notification history remains a separate future design question if needed.

## Release / Packaging Status

- User verified the local build and requested finalization with no new version/release.
- A local macOS Electron DMG/ZIP was built from the round11 ticket worktree for manual verification.
- Current local DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.dmg` (SHA-256 `a48033c9c3d20fbecf0f0f9ea7613d64c68c79fe2025ac2e97b122f6d5c23003`).
- Current local ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.43.zip` (SHA-256 `93c9b59bddba4dccc8ffbe0b1d867ebeea7ed6334b8122b734de19044cd88c46`).
- The local build is unsigned and not notarized unless the release owner runs the signing/notarization path after repository finalization.
- Public release, tags, version bump, notarization, and deployment are skipped by user instruction. Ticket archival and repository finalization are handled by delivery finalization.
