# Docs Sync Report

## Scope

- Ticket: `application-launch-setup-immersive-flow`
- Trigger: Review round `9` and API/E2E validation round `5` are the authoritative `Pass` state on `2026-04-23`; round `5` reran the previously failing embedded Brief Studio post-bootstrap route against the real frontend/backend, reproduced the persisted-ledger empty-app-DB shape under the live backend, and supersedes the earlier validation evidence.
- Bootstrap base reference: `origin/personal` from `tickets/done/application-launch-setup-immersive-flow/investigation-notes.md`
- Integrated base reference used for docs sync: `origin/personal @ 9e4c3434c8d85159098efe16eafdfffa6836d9f5` (`codex/application-launch-setup-immersive-flow` remained current with the latest tracked remote base, so no base-into-ticket merge/rebase was required before docs sync.)
- Post-integration verification reference: No extra delivery-stage rerun was needed because no new base commits were integrated; `review-report.md` round `9` and `api-e2e-testing.md` round `5` already validate the current candidate state on top of `origin/personal @ 9e4c3434c8d85159098efe16eafdfffa6836d9f5`.

## Why Docs Were Updated

- Summary: The Applications route now has a durable two-phase flow: users always begin in setup, explicitly enter the application into an immersive host-suppressed phase, manage details/setup through a light top-right trigger plus right-side resizable immersive panel, and rely on explicit reload/exit semantics instead of the old host-heavy stacked page. The final reviewed package also confirms the platform storage lifecycle self-heals a destructively emptied app database before reusing a ready runtime, which is durable server-runtime knowledge that belongs in canonical storage docs rather than only in ticket artifacts.
- Why this should live in long-lived project docs: This ticket landed durable product behavior and durable runtime-repair behavior. Future readers working on Applications UX or application-storage lifecycle need these facts in canonical project docs, not just in review/validation artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | This is the canonical durable doc for the Applications route and had to reflect the final setup-first plus immersive-post-entry behavior. | `Updated` | The doc now describes the light top-right trigger, right-side resizable panel, and current host-launch lifetime contract. |
| `autobyteus-server-ts/docs/modules/application_storage.md` | This is the canonical durable doc for per-app storage preparation and had to reflect the new empty-app-DB / preserved-ledger repair behavior. | `Updated` | The doc now records that `ensureStoragePrepared()` clears stale migration-ledger rows only when `app.sqlite` is empty and deterministically replays app migrations before reuse. |
| `applications/brief-studio/README.md` | Reviewed to confirm the Brief Studio homepage cleanup did not invalidate the durable sample-app architecture description. | `No change` | The README describes Brief Studio as an app-owned sample over one business record and remains accurate without homepage-layout wording. |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Reviewed to confirm the ready-runtime reuse ownership description remained accurate after the storage-repair fix. | `No change` | Engine ownership still correctly points runtime reuse through the storage lifecycle boundary. |
| `autobyteus-web/docs/settings.md` | Reviewed to confirm the ticket did not change Applications capability/settings behavior or Settings ownership. | `No change` | Settings still documents capability management accurately; this ticket only changes the application route experience after entry. |
| `README.md` | Reviewed to confirm repo-level release workflow docs were unaffected by this frontend/server behavior change. | `No change` | Release/version workflow documentation remains accurate and does not need an Applications UX update. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | Frontend module behavior update | Documented the setup-first route phase, immersive post-entry phase, light top-right trigger, right-side resizable immersive panel, and route-visit-scoped host-launch lifetime contract. | Future readers need the final reviewed+validated Applications behavior and ownership model in the canonical doc. |
| `autobyteus-server-ts/docs/modules/application_storage.md` | Server runtime lifecycle update | Documented that `ensureStoragePrepared()` repairs the destructively emptied `app.sqlite` + preserved migration-ledger shape by clearing stale app-migration ledger rows only in that case and replaying app migrations before worker startup or ready-runtime reuse. | Future readers need the final durable storage-repair contract in the canonical storage doc instead of rediscovering it from ticket history. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Two-phase application route flow | `/applications/:id` now always starts in setup and enters a separate immersive phase only after explicit user intent. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-testing.md` | `autobyteus-web/docs/applications.md` |
| Route-visit-scoped host-launch lifetime | `Enter application` and `Reload application` create fresh host launches, while `Exit application` and route leave clear launch state so stale async completions do not revive old launches. | `design-spec.md`, `review-report.md`, `api-e2e-testing.md` | `autobyteus-web/docs/applications.md` |
| Immersive control-panel ownership | `ApplicationImmersiveControlPanel.vue` owns the light top-right trigger, right-side resizable side panel, inline details/configure disclosures, and emitter-only reload/exit actions. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-testing.md` | `autobyteus-web/docs/applications.md` |
| Preserved iframe/bootstrap ownership | `ApplicationSurface.vue` remains the authoritative iframe/bootstrap owner once a `launchInstanceId` exists, even though the shell presentation changed. | `requirements.md`, `design-spec.md`, `review-report.md`, `api-e2e-testing.md` | `autobyteus-web/docs/applications.md` |
| Empty-app-DB ready-runtime repair | If `app.sqlite` has been destructively emptied while `platform.sqlite` still says app migrations were applied, the storage lifecycle clears only the stale app-migration ledger rows and deterministically replays migrations before a ready runtime is reused. | `implementation-handoff.md`, `review-report.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/modules/application_storage.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| One long host-heavy Applications page that mixed metadata, setup, gate, and live app viewing in the same stacked route | Setup-first route phase plus immersive post-entry presentation | `autobyteus-web/docs/applications.md` |
| Dark/orb-like collapsed immersive trigger plus heavier left-side presenter styling | Light top-right trigger plus right-side resizable immersive panel with app-matched chrome | `autobyteus-web/docs/applications.md` |
| Post-entry configuration through the full host page layout | Tiny immersive trigger plus resizable side panel with inline `Details` and `Configure` disclosures | `autobyteus-web/docs/applications.md` |
| Stale app-migration ledger rows surviving after destructive `app.sqlite` emptying and blocking schema recreation on ready-runtime reuse | Empty-DB-aware ledger reset plus deterministic migration replay before runtime reuse | `autobyteus-server-ts/docs/modules/application_storage.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the final reviewed and validated candidate state. Repository finalization, ticket archival, push/merge, and any release/deployment work remain on hold until explicit user verification.
