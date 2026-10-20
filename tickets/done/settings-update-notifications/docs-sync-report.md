# Docs Sync Report — settings-update-notifications

## Scope

- Ticket: `settings-update-notifications` (Project Task `autobyteus-209`), `task_size=Large`, `architectural_risk=High`, reviewed route (architecture review, code review CRR-002, API/E2E API-REV-001, test-code review CRR-003)
- Trigger: delivery after the code reviewer's test-code review pass (CRR-003)
- Bootstrap base reference: `origin/personal` `3d4d9d0a95`
- Integrated base reference used for docs sync: `origin/personal` `e0df0bfd05`, merged into the ticket branch as `6c34ce51d2`
- Post-integration verification reference: `evidence/DEL-01..06` (see `handoff-summary.md`, Integration)

## Why Docs Were Updated

- Summary: the ticket adds a server module (background update checks with one notification per imported GitHub package or skill source), a desktop app-update notification record, the web Notification Center with its sidebar entry, and the Settings → Server Settings → Basics → Update checks card. It also removes the self-opening app update card. The implementation updated the long-lived docs, and code review (CRR-002) found them consistent with the code. Delivery re-read them on the integrated state and found that they still match it. No further edit was needed.
- Why this should live in long-lived project docs: the server module, the persisted notification files, the network calls the checks make (a privacy statement, REQ-014) and the e2e test update feed are durable behavior that future work on updates, settings and isolated instances depends on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/update_notifications.md` | New server module | Updated (by implementation) | Scheduler, owners, store, rate-limit gate, `ENABLE_UPDATE_CHECKS`, GraphQL and `/ws/update-notifications`; matches the code after the CR-001 fix |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | Updated (by implementation) | Merge of base kept both the new Agent Runtimes row and this ticket's Update Notifications row |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Package update checks now also feed notifications | Updated (by implementation) | — |
| `autobyteus-server-ts/docs/modules/skills.md` | Skill source checks now also feed notifications | Updated (by implementation) | — |
| `autobyteus-web/docs/settings.md` | Notification Center, Update checks card, removed card | Updated (by implementation) | Auto-merged with base's Agent Runtimes section, no overlap |
| `autobyteus-web/docs/electron_packaging.md` | App update notification record, IPC intents, test update feed | Updated (by implementation) | Auto-merged with base, no overlap |
| `docs/isolated-app-instances.md` | `--test-update-feed` opt-in | Updated (by implementation) | Auto-merged with base, no overlap |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` (new on base) | Settings neighbour added by the base merge | No change | Separate Settings section; does not describe update notifications |
| `RELEASE.md`, `TESTING.md` (changed on base) | Delivery and validation rules after the merge | No change | Read for this delivery (Secret Gate added on base) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none in delivery) | — | — | The implementation's doc changes already describe the final integrated behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Background update checks | At most every 6 h per source, unauthenticated `api.github.com` only, rate-limit gate persisted, nothing downloaded until the user presses Update, switch `ENABLE_UPDATE_CHECKS` (on when absent) | `design-spec.md`, `requirements-doc.md` REQ-002/013/014/020 | `update_notifications.md` |
| Notification lifecycle | One record per source: waiting (unread/read) → handled → cleared. No dismiss or skip; read state and handled rows survive restarts | `design-spec.md`, AC-009..011 | `update_notifications.md`, `settings.md` |
| App update notification | Shell-owned record `app-update-notification.json`; release page link from the packaged config, `null` under the e2e test feed | `design-spec.md`, DEC-017 | `electron_packaging.md` |
| Isolated test update feed | `--test-update-feed` / `AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL`, loopback only, rejected in production | `design-spec.md`, REQ-019 | `isolated-app-instances.md`, `electron_packaging.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Self-opening app update card `components/app/AppUpdateNotice.vue` | The app row in the Notification Center; Settings → Updates keeps all controls | `autobyteus-web/docs/settings.md` (Notification Center), `electron_packaging.md` (Runtime Behavior) |
| Startup-check failure toasts | Quiet startup check; Settings → Updates shows the error | `electron_packaging.md` (renderer-visible update state) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: not applicable. The docs were changed, by the implementation, and are verified here.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification, archive, finalization
- Notes: follow-ups FU-001..FU-004 are recorded in `follow-ups.md`. Delivery found no further docs problems outside the ticket.
