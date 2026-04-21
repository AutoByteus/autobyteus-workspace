# Docs Sync Report

## Scope

- Ticket: `run-config-runtime-model-fields-regression`
- Trigger: authoritative implementation review round `2` and API/E2E validation round `1` both passed on `2026-04-21`, so delivery rechecked the final integrated state for durable docs impact.
- Bootstrap base reference: `origin/personal` (recorded in `requirements.md`)
- Integrated base reference used for docs sync: `origin/personal @ a327c68c17bddcc9d58a2a974d8f6ea24eb0b75f`
- Post-integration verification reference: no additional delivery-stage rerun was required because `git fetch origin personal` confirmed the tracked base had not advanced beyond the already-reviewed and already-validated branch base (`a327c68c17bddcc9d58a2a974d8f6ea24eb0b75f`).

## Why Docs Were Updated

- Summary: the canonical Applications frontend doc now records that application-specific launch-default field presence is owned by `ApplicationLaunchDefaultsFields.vue`, while the shared `RuntimeModelConfigFields.vue` returns to stable native run/definition semantics.
- Why this should live in long-lived project docs: this ownership split is the durable prevention mechanism for the regression. Future app-setup reuse should not reintroduce wrapper-level `show*` visibility toggles on the shared run-config surface.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | Canonical frontend doc for the Applications launch/setup flow and the application-owned setup boundary. | `Updated` | Added `ApplicationLaunchDefaultsFields.vue` to the main-files list and documented the app-owned launch-defaults boundary plus the stable native run-config separation. |
| `autobyteus-web/docs/agent_management.md` | Reviewed because it references the shared `RuntimeModelConfigFields.vue` surface used by native agent flows. | `No change` | The doc already accurately describes definition-launch defaults and does not claim any application-owned visibility policy. |
| `autobyteus-web/docs/agent_teams.md` | Reviewed because it references the shared `RuntimeModelConfigFields.vue` surface used by native team flows. | `No change` | The doc remains accurate; the ticket did not change native team definition-launch semantics. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | Ownership-boundary clarification | Documented `ApplicationLaunchDefaultsFields.vue` as the slot-specific launch-defaults owner and clarified that application-specific field-presence policy no longer extends the shared run-config wrapper. | Keeps long-lived docs aligned with the implemented regression fix and prevents future readers from repeating the same boundary mistake. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Shared vs app-owned field-presence policy | Native agent/team run configuration must keep stable runtime/model field semantics; application-specific slot visibility belongs in an app-owned boundary. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `validation-report.md` | `autobyteus-web/docs/applications.md` |
| Application launch-defaults boundary | `ApplicationLaunchSetupPanel.vue` remains the orchestration owner, while `ApplicationLaunchDefaultsFields.vue` owns slot-specific runtime/model/workspace launch-default presentation and updates. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-web/docs/applications.md` |
| Removed shared visibility API | The old shared `showRuntimeField`, `showModelField`, and `showModelConfigSection` wrapper policy was intentionally removed and should stay removed. | `requirements.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-web/docs/applications.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Shared `showRuntimeField` / `showModelField` / `showModelConfigSection` visibility props on `components/launch-config/RuntimeModelConfigFields.vue` | App-owned slot-specific launch-default rendering in `components/applications/ApplicationLaunchDefaultsFields.vue` plus stable shared runtime/model semantics for native flows | `autobyteus-web/docs/applications.md` |
| Mixed wrapper-level field-presence policy leaking from application setup into native run forms | Clear ownership split: `ApplicationLaunchSetupPanel.vue` orchestrates app setup, `ApplicationLaunchDefaultsFields.vue` owns app-only launch-default policy, and native agent/team run flows keep the shared run-config contract | `autobyteus-web/docs/applications.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete on the latest tracked-base state and the ticket is ready for user verification hold.
