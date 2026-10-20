# Update Notifications

## Scope

Tells the user that an imported GitHub agent package or GitHub skill source has
a newer default-branch revision. The node checks them in the background while
its **Update checks** setting is on, keeps one notification per source with its
read and handled state, and announces changes to open windows. It never
updates anything: the user's Update runs the existing explicit update of the
source's kind.

The desktop app's own update notification is kept by the desktop shell (see
`autobyteus-web/docs/settings.md`, Notification Center); the web combines both.

## TS Source

- `src/update-notifications/domain/update-notification.ts` — kinds, record and view types
- `src/update-notifications/domain/settings.ts` — `ENABLE_UPDATE_CHECKS`
- `src/update-notifications/stores/update-notification-store.ts` — the JSON file
- `src/update-notifications/services/update-notification-service.ts` — records and their rules
- `src/update-notifications/services/update-check-scheduler.ts` — when background checks run
- `src/update-notifications/services/update-checks-capability-service.ts` — the setting
- `src/update-notifications/changes/update-notification-change-messages.ts` — feed contract and process hub
- `src/integrations/github/github-rate-limit-gate.ts` — GitHub's rate limits
- `src/compositions/update-notifications-composition.ts` — wiring (studio server only)
- `src/api/graphql/types/update-notifications.ts`, `src/api/websocket/update-notifications.ts` — transport

## How A Notification Comes To Be

1. A check runs: the background checker, opening Settings → Agent Packages or
   Manage skill sources, or a row's check or update. Every check goes through
   the source owner's own method (`AgentPackageService`, `SkillSourceService`),
   which records the result as before.
2. When the check, update, import or removal settles, the owner calls its
   listener. The composition set that listener to
   `UpdateNotificationService.reconcile()`.
3. `reconcile()` reads the owners' update facts
   (`listGitHubSourceUpdateStates()`), applies the rules below, persists and
   broadcasts `update_notifications_changed` on `/ws/update-notifications` only
   when something changed.
4. Open windows re-read `updateNotifications` and show the Settings-row pill.

Records are derived from the owners' state plus the user's read and clear
actions, so they cannot drift from the packages and skill sources themselves.

## Rules (per source)

| Source state | Result |
| --- | --- |
| Source removed | Its record is deleted. |
| Installed revision unknown | No record is created; an existing one is left as is. |
| Latest known ≠ installed | A waiting, unread record for the latest revision, unless one for that revision already waits. A newer revision replaces the record and makes it unread again. |
| Up to date, and the installed revision moved since the update was found | Handled ("Updated to …"). |
| Up to date, and nothing was installed (upstream went back) | The record is deleted. |

- A failed check keeps the latest known revision, so a waiting notification
  stays (and the row keeps its Update).
- `markUpdateNotificationsRead` marks every waiting record read.
- `clearUpdateNotification(kind, sourceId)` deletes a handled record. A waiting
  one cannot be cleared: it goes only by an update or a newer revision. There is
  no dismiss or skip.

## Background Checks

`UpdateCheckScheduler` runs a first pass 60 seconds after the server starts
(never delaying startup), then a tick every 30 minutes. A pass:

- does nothing while the setting is off or GitHub rate-limits this node;
- checks every source whose last check of any kind is missing or at least 6
  hours old, one at a time: agent packages, then skill sources, oldest check
  first;
- reads the setting and the rate-limit gate again before every source, so
  turning the setting off or reaching a limit stops the pass;
- logs a failed check and goes on; never shows a notification, toast or dialog
  for a failure.

A failed check counts as a check: a node that starts offline waits up to 6
hours for its next automatic check of that source. Manual checks are not
affected.

## Network Calls

For each imported GitHub package and skill source, at most every 6 hours, two
unauthenticated requests to `api.github.com`: the repository and its default
branch's latest commit. No account or token is used. GitHub sees the node's IP
address and the repository names; nothing is sent to AutoByteus. Nothing is
downloaded until the user presses Update. The desktop app also checks GitHub
releases for its own update when it starts.

## GitHub Rate Limits

`publicGitHubRequest` consults `GitHubRateLimitGate` for every `api.github.com`
request (archive downloads from `codeload.github.com` are not gated):

- A `403` or `429` with `retry-after`, or with `x-ratelimit-remaining: 0` and
  `x-ratelimit-reset`, blocks the node until that time, taken as GitHub sends
  it. A `429` without these headers blocks for 60 seconds.
- Before that time every `api.github.com` request, automatic or manual, fails at
  once with `GitHub rate limit reached; try again after HH:MM.` and no request
  is made.
- The time is kept in `<app-data>/github/rate-limit.json`, so the stop survives
  a restart. A missing, unreadable or past time means not blocked.

## Setting

`ENABLE_UPDATE_CHECKS` (app config, absent = on) is exposed as
`updateChecksCapability { enabled settingKey source }` and
`setUpdateChecksEnabled(enabled)`; `source` is `DEFAULT_ENABLED` while the key
is absent. The scheduler reads it on every tick, so a change applies without a
restart. Turning it off keeps existing notifications, and manual and on-open
checks still create them.

## Persistence

- `<app-data>/update-notifications/notifications.json`: a JSON array of
  `{ kind, sourceId, latestRevision, fromRevision, foundAt, read, handledRevision, handledAt }`.
  Tolerant read (rows of an unknown kind or shape are skipped with a warning;
  unknown fields are ignored), exact atomic write. A missing or unreadable file
  reads as empty; the next reconcile recreates waiting records as unread.
- `<app-data>/github/rate-limit.json`: `{ blockedUntil }`.

Neither file is read at startup or needed by any other feature.

## Adding A Kind

A new kind (for example application packages) adds a value to
`UPDATE_NOTIFICATION_KINDS` and the GraphQL `UpdateNotificationKind` enum, a source with `listGitHubSourceUpdateStates()` in
`UpdateNotificationService.getInstance()` (and, for background checks, an owner
in the composition), and the web's icon and strings. The rules, the store, the
feed and the panel stay as they are.
