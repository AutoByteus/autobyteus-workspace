# Docs Sync Report

## Scope

- Ticket: `projects-concept-introduction` (`PROJ-CONCEPT-20260926-001`, slice 1: Projects only, behind `ENABLE_PROJECTS`)
- Trigger: cumulative delivery package from `code_reviewer` (CRR-004 Pass, CRR-003 Pass, API-REV-002 Pass); design-spec Change Sequence step 8
- Classification (preserved): `task_size=Large`, `architectural_risk=High`; route: full independent review (architecture review → implementation → source review → API/E2E → test-code review)
- Bootstrap base reference: `origin/personal@1676bede9d910ca40dc0331390a35f203206fd41`
- Integrated base reference used for docs sync: `origin/personal@fc2a6052725b3df5efca9c2b72c2a0942e74f07c`, merged into the ticket branch as `8ee41728b`
- Post-integration verification reference: `release-deployment-report.md` › Initial Delivery Integration Refresh; logs in `delivery-logs/`

## Why Docs Were Updated

- Summary: this change adds a new product module (Projects, on server and web), a new persisted subject (`<appDataDir>/projects/projects.json`), a new GraphQL surface, and a new per-node capability. It also replaces duplicated per-feature capability code with shared owned structures that Applications and Skill Improvement now use: a web store factory, a toggle card, a route-gate table, a settings-refresh table, and a generic server boolean accessor. Two shared components gained contracts: the opt-in `WorkspaceSelector.candidateWorkspaceIds` prop and `SearchableSelect` keyboard/combobox semantics.
- Why this should live in long-lived project docs: future features must extend the shared capability mechanism rather than copy it. The Projects/workspace boundary is architecturally enforced: workspace removal must never know about Projects. Neither rule is discoverable from the ticket once it is archived.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | New module | Updated (new) | Frontend module doc |
| `autobyteus-server-ts/docs/modules/projects.md` | New subsystem | Updated (new) | Server module doc |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | Updated | Added Projects row |
| `autobyteus-web/AGENTS.md` | Documentation catalog | Updated | Added Projects entry (Chapter 3) |
| `autobyteus-web/docs/settings.md` | Settings › Basics toggle cards; shared capability store | Updated | New "Server Settings: Feature Capability Toggles" section. The file was also changed by the incoming base (`1294927da`), and this edit was applied on top of that integrated content |
| `autobyteus-web/docs/applications.md` | Applications capability store/card/middleware were refactored | Updated | Factory, table-driven gate, card wrapper, refresh table |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical `WorkspaceSelector` contract | Updated | `candidateWorkspaceIds` opt-in prop; `SearchableSelect` keyboard contract |
| `autobyteus-server-ts/docs/modules/application_capability.md` | Removed feature-specific accessors | Updated | Generic boolean accessor; link to projects.md |
| `autobyteus-server-ts/docs/modules/skill_improvement.md` | Removed feature-specific accessors | Updated | Generic boolean accessor |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Projects read workspace registration | No change | Workspaces behavior and API are unchanged, and the dependency is one-way (Projects → `WorkspaceManager`). The rule is documented in `projects.md` and enforced by `tests/architecture/projects-boundaries.test.ts` |
| `autobyteus-web/docs/settings.md` › Editable Run Workspace Selection (duplicate of the canonical section) | Mentions `WorkspaceSelector` | No change | It remains accurate because run-config callers never pass the new prop. The canonical contract is in `agent_execution_architecture.md` |
| `autobyteus-web/docs/localization.md` | New catalogues | No change | The existing per-area catalogue convention was followed without any process change |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | New | Scope, files, capability gating (nav/route/mobile/Advanced table), `projectStore` binding semantics and error codes, pages, link dialog candidate policy and register-then-link, stale-candidate recovery, workspace-removal interaction, localization, tests and `pnpm test:e2e:projects` | New module |
| `autobyteus-server-ts/docs/modules/projects.md` | New | Persistence shape/location, `ProjectService` invariants (in-lock validation, uniqueness, link validation, read-time availability), error codes, workspace boundary rules, GraphQL surface, capability semantics, generic boolean accessor, tests | New subsystem |
| `autobyteus-server-ts/docs/modules/README.md` | Index | Projects row | Discoverability |
| `autobyteus-web/AGENTS.md` | Catalog | Projects entry | Requested in design step 8 |
| `autobyteus-web/docs/settings.md` | New section | `createBoundNodeCapabilityStore`, `FeatureCapabilityToggleCard` props/test ids, `CAPABILITY_STORE_BY_SETTING_KEY` (SI intentionally excluded), route gate table, "extend, don't copy" rule | Shared mechanism now has three consumers |
| `autobyteus-web/docs/applications.md` | Update | Main-files list and gating bullets now name the factory, table-driven middleware, card wrapper, refresh table | Previous text implied an Applications-only mechanism |
| `autobyteus-web/docs/agent_execution_architecture.md` | Update | `candidateWorkspaceIds` opt-in prop; `SearchableSelect` combobox keyboard contract (arrows/Home/End/Enter/Escape/Tab, focus return, Escape does not propagate) | Shared components gained contracts other callers depend on |
| `autobyteus-server-ts/docs/modules/application_capability.md`, `skill_improvement.md` | Update | Name `getBooleanSetting`/`setBooleanSetting` as the settings substrate | Four feature-specific accessors were removed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Shared bound-node capability mechanism | New per-node features are a factory instance plus a card wrapper, not copies | `design-spec.md` (Task Design Health, Reusable Owned Structures) | `autobyteus-web/docs/settings.md` |
| Project/workspace boundary | One-way dependency, read-time availability, removal never blocked, re-registration restores | `design-spec.md` (Ownership Boundaries, Dependency Rules) | `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md` |
| In-lock validation | Uniqueness/duplicate/registration checks inside `updateJsonArrayFile`; a throwing updater aborts the write | `design-spec.md` (Ownership Map, `QR-001`) | `autobyteus-server-ts/docs/modules/projects.md` |
| Link candidate policy | Client policy is presentation-only; `WorkspaceSelector` stays policy-free | `design-spec.md` (`AR-001`) | `autobyteus-web/docs/projects.md`, `agent_execution_architecture.md` |
| Advanced-table refresh parity | `ENABLE_APPLICATIONS`/`ENABLE_PROJECTS` refresh, `ENABLE_SKILL_IMPROVEMENT` intentionally not | `design-spec.md` (`AR-002`) | `autobyteus-web/docs/settings.md` |
| SearchableSelect keyboard contract | Combobox semantics and focus return for the teleported popover | `code-review-report.md` (CR-001), commit `63e6fb0e4` | `autobyteus-web/docs/agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Duplicated bodies of `applicationsCapabilityStore.ts` / `skillImprovementCapabilityStore.ts` | `stores/capabilities/createBoundNodeCapabilityStore.ts` (thin wrappers keep ids/API) | `autobyteus-web/docs/settings.md`, `applications.md` |
| Duplicated switch/status/error logic in `ApplicationsFeatureToggleCard.vue` / `SkillImprovementFeatureToggleCard.vue` | `components/settings/FeatureCapabilityToggleCard.vue` | `autobyteus-web/docs/settings.md` |
| `ServerSettingsService.get/setApplicationsEnabledSetting`, `get/setSkillImprovementEnabledSetting` | `getBooleanSetting` / `setBooleanSetting` | `autobyteus-server-ts/docs/modules/projects.md`, `application_capability.md`, `skill_improvement.md` |
| Applications-only branch in `middleware/feature-flags.global.ts` | `CAPABILITY_GATED_ROUTES` table | `autobyteus-web/docs/settings.md`, `applications.md` |
| `APPLICATIONS_SETTING_KEY` refresh branch in `stores/serverSettings.ts` | `CAPABILITY_STORE_BY_SETTING_KEY` table | `autobyteus-web/docs/settings.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary + release notes, then hold for explicit user verification.
- Notes: docs were written against the integrated branch `8ee41728b`, and each behavioral claim was checked against the source (`setEnabled` restores the previous state on failure and is not optimistic; the keyboard handlers; the link dialog's stale-candidate recovery).
