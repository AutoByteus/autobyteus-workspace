# Update Notifications

## Scope

Tells the user that an imported GitHub agent package or GitHub skill source has
a newer default-branch revision, and, on the desktop's own node, that an
installed agent runtime (Codex, Claude, Antigravity, Grok) has a newer version.
The node checks them in the background at a configurable interval per kind
while its **Update checks** setting is on, keeps one notification per source
with its read and handled state, and announces changes to open windows. With a
kind's **automatic updates** switch on (off by default), the node also applies
the found updates of that kind itself, through the same update the user's
Update runs, and records what happened on the notification.

The desktop app's own update notification and its periodic check are kept by
the desktop shell (see `autobyteus-web/docs/settings.md`, Notification Center
and Settings → Updates); the web combines both. The app is never updated
automatically.

## TS Source

- `src/update-notifications/domain/update-notification.ts` — kinds, outcomes, record and view types
- `src/update-notifications/domain/settings.ts` — the setting keys, defaults and the interval range
- `src/update-notifications/stores/update-notification-store.ts` — the JSON file
- `src/update-notifications/services/update-notification-service.ts` — records, outcomes, candidates
- `src/update-notifications/services/update-notification-records.ts` — the record rules (pure)
- `src/update-notifications/services/runtime-update-source.ts` — agent runtimes as a source
- `src/update-notifications/services/update-pass.ts` — one background pass: checks, then automatic updates
- `src/update-notifications/services/update-check-scheduler.ts` — when passes run
- `src/update-notifications/services/update-automation-settings-service.ts` — intervals and switches
- `src/update-notifications/services/update-checks-capability-service.ts` — the Update checks setting
- `src/update-notifications/changes/update-notification-change-messages.ts` — feed contract and process hub
- `src/integrations/github/git-ls-refs.ts`, `github-repository-client.ts` — quota-free GitHub reads
- `src/integrations/github/github-rate-limit-gate.ts` — GitHub's limits per host family
- `src/config/desktop-embedded-node.ts` — whether this server is the desktop's own node
- `src/compositions/update-notifications-composition.ts` — wiring (studio server only)
- `src/api/graphql/types/update-notifications.ts`, `src/api/websocket/update-notifications.ts` — transport

## How A Notification Comes To Be

1. A check runs: the background pass, opening Settings → Agent Packages, Manage
   skill sources or Settings → Agent Runtimes, or a row's check or update. Every
   check goes through the source owner's own method (`AgentPackageService`,
   `SkillSourceService`, `AgentRuntimeStatusService`), which records the result.
2. When a check, update, import or removal settles, the owner calls its
   listener. The composition set that listener to
   `UpdateNotificationService.reconcile()`.
3. `reconcile()` reads the owners' update facts (`listUpdateStates()` of each
   source), applies the rules below, persists and broadcasts
   `update_notifications_changed` on `/ws/update-notifications` only when
   something changed.
4. Open windows re-read `updateNotifications` and show the Settings-row entry.

Records are derived from the owners' state plus the user's read and clear
actions and the automatic outcomes, so they cannot drift from the sources
themselves. When one owner cannot be read (for example an unreadable skill
source registry, which the Skills page reports), the other kinds keep working;
that kind's stored records are kept unchanged and hidden until its owner can be
read again, and a warning `UPDATE_NOTIFICATIONS_SOURCE_UNAVAILABLE:<kind>` is
logged.

## Agent Runtimes

Only the desktop's own node has the `AGENT_RUNTIME` kind: the desktop shell
starts its embedded server with `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1`, read once
by `isDesktopEmbeddedNode()`. Docker and standalone servers never check, list or
update runtimes. The source is the studio server's own
`AgentRuntimeStatusService`:

| Runtime state | Notification source |
| --- | --- |
| Not checked yet | Kept (its installed version is unknown, so a record is neither created nor removed) |
| Checked, not installed | None (its record is removed) |
| Checked, newer version known | `installed → newest` |
| Last check failed | Newest unknown (a waiting record stays) |

The record's revisions hold versions (`0.164.0`) for this kind; its name is the
runtime kind (`codex_app_server`), which the web names as Settings → Agent
Runtimes does. A background check of a runtime reads only its installed and
newest versions (never its sign-in, which for Codex starts its app-server) and
keeps the page's finished update and sign-in results.

## Rules (per source)

| Source state | Result |
| --- | --- |
| Source removed | Its record is deleted. |
| Installed revision unknown | No record is created; an existing one is left as is. |
| Latest known ≠ installed | A waiting, unread record for the latest revision, unless one for that revision already waits. A newer revision replaces the record (and its outcome) and makes it unread again. |
| Up to date, and the installed revision moved since the update was found | Handled ("Updated to …"); any automatic outcome is cleared. |
| Up to date, and nothing was installed (upstream went back) | The record is deleted. |

- A failed check keeps the latest known revision, so a waiting notification
  stays (and the row keeps its Update).
- `markUpdateNotificationsRead` marks every waiting record and every unread
  automatic update read.
- `clearUpdateNotification(kind, sourceId)` deletes a handled record. A waiting
  one cannot be cleared: it goes only by an update or a newer revision. There is
  no dismiss or skip.

### Automatic outcomes

An automatic update's result is recorded on the record it was tried for
(`recordOutcome`); a record removed or replaced meanwhile is left unchanged
(`UPDATE_NOTIFICATIONS_OUTCOME_NOT_APPLIED` is logged).

| Outcome | Applied to | Effect |
| --- | --- | --- |
| `AUTO_UPDATED` | The handled record whose `fromRevision` is the one the pass picked | Unread ("Updated automatically to …") until seen |
| `AUTO_FAILED` | The waiting record of the revision the pass tried | The reason is kept; unread only the first time for that revision |
| `AUTO_WAITING` | The same (runtimes only: agents of that runtime run) | The reason is kept; an identical wait changes nothing |

The pass tries every waiting record of a kind whose switch is on, except a
record whose automatic update failed less than one interval of its kind ago.

## Background Pass

`UpdateCheckScheduler` runs a first pass 60 seconds (plus a random part of
another 60 seconds) after the server starts, never delaying startup, then one
pass a minute after the previous one finished, so passes never overlap. The
cheap ticks let a switch turned on act within about a minute. `UpdatePass`
owns the sequence:

1. **Checks.** For each kind (agent packages, skill sources, then agent
   runtimes on the desktop's own node), every source whose last check of any
   kind is missing, unreadable or older than the kind's interval plus this
   process's spreading delay (a random fraction, chosen once per process and
   kind, of a fifth of the interval, at most 5 minutes) is checked, one at a
   time, oldest first, through the owner's own check.
2. **Automatic updates.** For each kind whose switch is on, every candidate is
   updated, one at a time, through the owner's own update method (the same one a
   manual Update calls; a skill source's local edits are replaced as with the
   confirmed manual update, and a skill-name conflict fails it). Runtimes go
   through `AgentRuntimeStatusService.runUpdate`, which refuses while agents of
   that runtime run (`AUTO_WAITING`, tried again at the next tick), and while the
   runtime is busy or not installed (no outcome).

Before every source and every update, the pass reads again whether Update checks
is on, whether the kind's switch is on and, for GitHub kinds, GitHub's `web`
gate; any of them stops that step. Runtimes are not gated. A failed check is
logged and the pass goes on; no notification, toast or dialog is shown for a
check failure. A failed check counts as a check.

## Network Calls

- **Agent packages and skill sources:** per source and interval (default 30
  minutes, 15 minutes to 24 hours), one unauthenticated request to
  `github.com`: the git protocol v2 `ls-refs` request for the repository's
  `HEAD` (`POST https://github.com/<owner>/<repo>.git/git-upload-pack`), which
  answers its default branch and head commit. It costs no REST API quota. A
  `401` or `404` means the repository is missing or not public.
- **Agent runtimes** (desktop's own node, default every 60 minutes): each
  vendor's own version source. Codex: the tag
  `github.com/openai/codex/releases/latest` redirects to (no REST quota);
  Claude: `downloads.claude.ai`; Antigravity: its updater; Grok: xAI.
- **Automatic updates:** a package or skill source downloads its archive from
  GitHub (`codeload.github.com`); a runtime runs its own update command.
- Imports still read the REST API (`api.github.com`) for the repository's
  identity and visibility.

No account or token is used. GitHub sees the node's IP address and the
repository names; nothing is sent to AutoByteus.

## GitHub Rate Limits

`publicGitHubRequest` consults `GitHubRateLimitGate` for every request, per host
family:

- `api` (`api.github.com`, the REST API): a `403` or `429` with `retry-after`,
  or with `x-ratelimit-remaining: 0` and `x-ratelimit-reset`, blocks the family
  until that time, taken as GitHub sends it; a bare `429` blocks for 60 seconds.
- `web` (`github.com`'s git service and release redirect, `codeload.github.com`):
  a `429` or `503` blocks it until `retry-after`, else for 60 seconds.
- Before that time every request of the family, automatic or manual, fails at
  once with `GitHub rate limit reached; try again after HH:MM.` and no request
  is made. The Update checks card shows the later of the two times.
- `github.com` serves only those two paths; any other host or path is refused.
- The agent package installer's archive download does not go through
  `publicGitHubRequest` (it is not gated).

## Settings

All are app config keys; absent means the default. A stored value that is not
valid reads as the default, with one warning `UPDATE_AUTOMATION_SETTING_INVALID`.

| Key | Default | GraphQL |
| --- | --- | --- |
| `ENABLE_UPDATE_CHECKS` | on | `updateChecksCapability`, `setUpdateChecksEnabled(enabled)` |
| `UPDATE_CHECK_INTERVAL_AGENT_PACKAGES_MINUTES` | 30 | `updateAutomationSettings.intervals`, `setUpdateCheckInterval(kind, minutes)` |
| `UPDATE_CHECK_INTERVAL_SKILL_SOURCES_MINUTES` | 30 | same |
| `UPDATE_CHECK_INTERVAL_AGENT_RUNTIMES_MINUTES` | 60 | same |
| `AUTO_UPDATE_AGENT_PACKAGES` | off | `updateAutomationSettings.automaticUpdates`, `setAutomaticUpdates(kind, enabled)` |
| `AUTO_UPDATE_SKILL_SOURCES` | off | same |
| `AUTO_UPDATE_AGENT_RUNTIMES` | off | same |

- An interval is a whole number of minutes from 15 to 1440;
  `setUpdateCheckInterval` refuses others with `UPDATE_CHECK_INTERVAL_OUT_OF_RANGE`
  ("Enter a whole number from 15 minutes to 24 hours.").
- `updateAutomationSettings` also reports `githubWaitUntil` (the gate) and
  `desktopEmbeddedNode`.
- A change is broadcast as `update_settings_changed` on
  `/ws/update-notifications`; every window of the node re-reads the settings.
  The pass reads them on every tick, so a change applies without a restart.
- Turning Update checks off stops the background checks and the automatic
  updates; existing notifications stay, and manual and on-open checks still
  create them.

## Persistence

- `<app-data>/update-notifications/notifications.json`: a JSON array of
  `{ kind, sourceId, latestRevision, fromRevision, foundAt, read, handledRevision, handledAt, outcome, outcomeReason, outcomeAt }`.
  Tolerant read (rows of an unknown kind or shape are skipped with a warning;
  unknown fields are ignored; an absent or unknown outcome reads as none),
  exact atomic write. A missing or unreadable file reads as empty; the next
  reconcile recreates waiting records as unread.
- `<app-data>/github/rate-limit.json`: `{ api, web }` (ISO times or null). A
  file of another shape reads as not blocked.

Neither file is read at startup or needed by any other feature.

## Adding A Kind

A new kind adds a value to `UPDATE_NOTIFICATION_KINDS` and the GraphQL
`UpdateNotificationKind` enum, a source with `listUpdateStates()` in
`UpdateNotificationService`, its check and update in `UpdatePass`, its interval
and switch keys in `domain/settings.ts`, and the web's icon and strings. The
rules, the store, the feed and the panel stay as they are.
