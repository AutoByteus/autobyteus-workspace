# Handoff — autobyteus-627 SR-003: the Update checks card's privacy text

- Package: `private-github-packages-627`. Branch `codex/private-github-packages-627` in `/Users/normy/autobyteus_org/autobyteus-worktrees/private-github-packages-627` (delivery checkpoint 168f62bb88, merged base c2f21f18ba; nothing pushed)
- Result: `Architecture Design Complete` for revision SR-003. The revision is classified task_size `Small`, architectural_risk `Low`:
  - it changes two localization strings, one test assertion and one doc line;
  - no code path, contract or security behavior changes;
  - the reviewed SR-002 architecture (ARCH-REV-001 Pass) is unchanged.
  Route: `/implementation_engineer` (rule: Small/Medium and Low).
- Trigger: the Delivery Engineer's Requirement Gap (tickets/in-progress/private-github-packages-627/release-deployment-report.md). Settings → Server Settings → Basics → Update checks says "No account or token is used. Nothing is sent to AutoByteus." Since this ticket, a check of a private source sends the node's GitHub token to GitHub, so the text is false.
- Decision: fix it in this ticket, route (a). Approved by the Solution Designer within the direction (the founder's strict token custody); the founder is informed. Recorded as REQ-008 / AC-008 in requirements-doc.md, SR-003 in solution-revision-record.md, and the Change Scope addition in design-spec.md.

## The change (AC-008)

| File | Change |
| --- | --- |
| `autobyteus-web/localization/messages/en/updateNotifications.ts:107` `settings.notifications.setting.description` | `No account is used. This node's GitHub token is sent only to GitHub, and only for private repositories. Nothing is sent to AutoByteus.` |
| `autobyteus-web/localization/messages/zh-CN/updateNotifications.ts:107` (same key) | `不使用任何账号。此节点的 GitHub 令牌只会发送给 GitHub，且仅用于私有仓库。不会向 AutoByteus 发送任何内容。` |
| `autobyteus-web/components/settings/__tests__/UpdateChecksCard.spec.ts:56-58` | Assert the new English text. Name the test after REQ-008 of autobyteus-627 as well as REQ-016 |
| `autobyteus-web/docs/settings.md:589` | "no account or token" → "no account; the node's GitHub token goes only to GitHub, only for private repositories". The Delivery Engineer offered to mirror this line; either role may do it, once |

Leave alone: `AboutSettingsManager.autoCheck.description` (the app's own version check, not touched by this ticket).

## Checks

- The card's spec and the localization checks the web package runs (TESTING.md).
- No live GitHub run is needed: the test token expires 2026-11-25, and the Delivery Engineer already ran the live cases on the merged base.

## Next

Implementation, then code review and API/E2E as their rules decide, then back to `/delivery_engineer` to finish.
