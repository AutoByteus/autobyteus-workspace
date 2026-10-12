# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004` (requirements unchanged since SR-002; SR-004 adds a known-limitation note only)
- Package identifier: `remove-autobyteus-remote-provider`
- Request / ticket: Project Task `project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546`; brief `follow-up-autobyteus-provider-removal.md`; user correction 2026-10-11 (remove `LLMRuntime.AUTOBYTEUS`)
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-11
- Approval state and reference: Approved by the user on 2026-10-11 in the Solution Designer conversation ("approve"). This replies to the prompt "reply 'approve as recommended'" and covers DEC-001 option (a) and DEC-002 option (a).
- Exact approved requirements baseline / solution revision: SR-001 baseline, with DEC-001 = (a) include image/audio and DEC-002 = (a) no migration (recorded in SR-002)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: The remote AutoByteus LLM server no longer exists ("i dont have that remote server anymore"). The app still ships a provider integration for it: an "AutoByteus" provider in Settings, an "AutoByteus LLM Hosts" endpoint card, remote LLM/image/audio model discovery, an API-key credential path, and the `LLMRuntime.AUTOBYTEUS` backend kind. None of it can work for anyone.
- Affected actors or systems: users configuring providers in Settings; the server model catalog, discovery and credential vault; application launch credential readiness; media tools; Docker/dev environment scripts; tests and docs.
- Desired outcome: A clean-cut removal of the remote AutoByteus provider (LLM, image, audio) and every code path, setting, credential binding, enum value, test and doc that exists only for it. The native AutoByteus agent runtime stays exactly as it is.
- Observable definition of success: The Settings page no longer offers the AutoByteus provider or its hosts card. No remote discovery runs. A repository search finds no remote-provider symbol, enum member or setting outside tickets and historical records. All other providers, the native runtime and saved native runs work unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001 | Remote LLM models are discovered from `AUTOBYTEUS_LLM_SERVER_HOSTS` with the AutoByteus API key and offered under provider "AutoByteus". The server is gone, so nothing is offered. | No remote LLM discovery, adapter or provider exists. | Ollama, LM Studio, custom OpenAI-compatible and API-provider catalogs | investigation-notes BEH-001 |
| BEH-002 | User/System | SCN-001 | Remote image/audio models are discovered from the same hosts. | No remote image/audio discovery, client or provider exists (DEC-001 approved). | OpenAI/Gemini/Qwen media models and video models | BEH-002 |
| BEH-003 | User | SCN-002 | Settings → Provider API keys lists "AutoByteus" with a key editor and Reload. | "AutoByteus" no longer appears as a provider anywhere in Settings or model pickers. | All other providers' rows, keys and Reload | BEH-003 |
| BEH-004 | User | SCN-002 | Settings → Server settings shows an "AutoByteus LLM Hosts" card. | The card is gone. | LM Studio, Ollama and "AutoByteus VNC Hosts" cards | BEH-004 |
| BEH-005 | System | SCN-003 | Vault binding `provider.autobyteus.api-key`, model-discovery consumer, media consumer, `.env` import alias `AUTOBYTEUS_API_KEY`, app-launch readiness for `LLMRuntime.AUTOBYTEUS`. | All removed; `LLMRuntime`, `LLMProvider`, `MultimediaRuntime` and `MultimediaProvider` lose their `AUTOBYTEUS` members. | All other credential bindings and readiness checks | BEH-005 |
| BEH-006 | System | SCN-003 | A mandatory tool preprocessor normalizes media input paths only for AutoByteus-provider models (a no-op otherwise). | Removed with the provider. | Media tool behavior for every remaining provider (unchanged, since the preprocessor never acted for them) | BEH-006 |
| BEH-007 | User | SCN-004 | A saved definition, run, launch profile or media default that selects a remote model already shows as unavailable and blocks launch/resume/generation, because the server is gone. | Same outcome: shown as unavailable, user picks another model. No migration and no silent replacement (DEC-002 approved). | Saved selection text stays visible | BEH-007 |
| BEH-008 | Operational | SCN-005 | A saved host value stays in the server `.env`; a saved key stays encrypted in the vault. | Left in place and inert: the host value appears as an ordinary deletable custom setting; the key is never read (DEC-002 approved). | No startup lockout | BEH-008 |
| BEH-009 | User | SCN-004 | Token-usage history shows stored provider-name snapshots. | History is preserved and still displays. | All token-usage history | BEH-009 |
| BEH-010 | User/System | SCN-006 | Native agent runtime `RuntimeKind.AUTOBYTEUS`, its "AutoByteus" label, saved native runs, `AUTOBYTEUS_SERVER_HOST`, VNC hosts | Unchanged | Everything listed | BEH-010 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| App user (desktop/Docker) | Configure working providers and run agents | No dead provider in Settings; existing work unaffected | Native runtime and other providers unchanged |
| Server operator (Docker) | Start the server from env | Entrypoints no longer write the dead host key | Other env keys unchanged |
| Maintainers | Lean codebase | No dead remote-provider code, tests or docs | Generic test coverage kept |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Remove the remote AutoByteus LLM provider, its discovery, adapter, renderer, client and `LLMRuntime.AUTOBYTEUS`/`LLMProvider.AUTOBYTEUS` | SCN-001, SCN-003 |
| UC-002 | Remove the remote AutoByteus image and audio providers, clients and `MultimediaRuntime/MultimediaProvider.AUTOBYTEUS` (DEC-001 approved) | SCN-001, SCN-003 |
| UC-003 | Remove the provider's Settings surfaces (provider row, hosts card, post-save refresh, web enum member) | SCN-002 |
| UC-004 | Remove its credential paths (vault binding, discovery/media consumers, import alias, launch readiness) and the AutoByteus-only preprocessor | SCN-003 |
| UC-005 | Handle saved data as agreed (DEC-002) | SCN-004, SCN-005 |
| UC-006 | Update tests, Docker/dev scripts, live-E2E harness and docs | SCN-001..SCN-006 |

### Out Of Scope

- The native AutoByteus agent runtime (`RuntimeKind`), its label, run history and anything named "autobyteus" that is not the remote LLM server (for example `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_VNC_SERVER_HOSTS`, the message gateway's `autobyteus-server-client`, the `autobyteus-*` package names).
- Changing how unavailable models are presented in general.
- Rewriting historical ticket folders, release notes or UI prototypes that mention the provider (historical records stay as they are).
- The anthropic-incomplete-content-block ticket's work.

- Known pre-existing limitation (recorded in SR-004, from API/E2E OBS-001): for a **stopped native run** whose saved model is no longer offered, the existing resume flow refuses any replacement model (`run-model-selection-service.ts`: "Both models need verified context capacities before replacement."). So SCN-004's "picks another model" does not currently work for that surface. The same happens for any unavailable model, not only removed remote ones. Fixing it is a separate-ticket candidate and is not part of this change. AC-004 (unavailable state shown, launch/resume blocked, value not cleared or replaced) still holds.

### Non-Goals

- No replacement provider or migration path to another provider.
- No compatibility alias, legacy reader or deprecation period.

### Preserved Behavior Boundary

BEH-010 in full, plus the preserved columns of BEH-001..BEH-009. Cross-cutting invariant: application startup and new work never depend on the removed provider's saved data.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The remote AutoByteus LLM integration is removed: discovery, adapter, conversation payload, usage normalizer, prompt renderer, client, cert utilities, and the `AUTOBYTEUS` members of `LLMRuntime` and `LLMProvider` with every branch that uses them. | BEH-001, BEH-005 | Must | Server no longer exists | User 2026-10-10/11 |
| REQ-002 | The remote AutoByteus image and audio integration is removed: providers, clients, and the `AUTOBYTEUS` members of `MultimediaRuntime` and `MultimediaProvider` with every branch that uses them. | BEH-002, BEH-005 | Must | Depends on the same server | DEC-001 (approved: include) |
| REQ-003 | The app no longer offers an "AutoByteus" model provider in Settings, model catalogs or model pickers, and no longer shows an "AutoByteus LLM Hosts" setting card. `AUTOBYTEUS_LLM_SERVER_HOSTS` is no longer a predefined server setting. | BEH-003, BEH-004 | Must | Dead UI | Brief |
| REQ-004 | No credential path remains for the provider: vault binding, model-discovery consumer kind, media consumer allowance, `.env` import alias `AUTOBYTEUS_API_KEY`, and application-launch credential readiness for the removed runtime. | BEH-005 | Must | Clean cut | Brief |
| REQ-005 | The tool-invocation preprocessor that acts only for AutoByteus-provider models is removed. | BEH-006 | Must | Becomes permanently dead | Investigation |
| REQ-006 | Saved model selections that reference a remote AutoByteus model are not migrated or silently replaced. They show the existing "unavailable" state and block launch/resume/generation until the user picks another model. | BEH-007 | Must | Matches established product convention | DEC-002 (approved: no migration) |
| REQ-007 | A saved host value stays in the server `.env` and appears as an ordinary deletable custom setting. A saved AutoByteus API key stays encrypted in the vault and is never read. No migration (DEC-002). Their presence never blocks startup or new work. | BEH-008 | Must | Data Migration Guideline §1, §3 | DEC-002 (approved) |
| REQ-008 | Token-usage history is preserved and keeps displaying. Released app-data migrations keep their released behavior. | BEH-009 | Must | Guideline §4 | Investigation RSK-002 |
| REQ-009 | The native AutoByteus agent runtime (`RuntimeKind.AUTOBYTEUS`), its UI label, saved runs that use it, and all other providers, settings and credentials behave exactly as before. | BEH-010 | Must | User constraint | User 2026-10-11 |
| REQ-010 | Tests, Docker/dev scripts, the live-E2E harness and current docs no longer reference the remote provider. Generic behavior those tests covered stays covered using a remaining provider. | All | Must | Done-when | Brief |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-004, REQ-005, REQ-010 | BEH-001, BEH-002, BEH-005, BEH-006 | Repository at the delivered revision | A search for the remote-provider symbols, files, enum members and env keys (`LLMRuntime.AUTOBYTEUS`, `LLMProvider.AUTOBYTEUS`, `MultimediaRuntime.AUTOBYTEUS`, `MultimediaProvider.AUTOBYTEUS`, `AutobyteusLLM`, `AutobyteusClient`, `AutobyteusImage*`, `AutobyteusAudio*`, `AutobyteusModelProvider`, `AutobyteusRemoteModelDiscovery*`, `AutobyteusPromptRenderer`, `AUTOBYTEUS_LLM_SERVER_HOSTS`, `AUTOBYTEUS_API_KEY`, `AUTOBYTEUS_SSL_CERT_FILE`, `AUTOBYTEUS_CERT_FINGERPRINT`, `provider.autobyteus.api-key`) finds nothing outside tickets and historical records (and any frozen migration-owned copy the design justifies) | — | Static search |
| AC-002 | REQ-003 | BEH-003, BEH-004, SCN-002 | Open Settings in the app | The Provider API keys list has no "AutoByteus" provider; Server settings has no "AutoByteus LLM Hosts" card; LM Studio, Ollama, AutoByteus VNC Hosts and every other provider still appear and work | — | Web tests + user verification in app |
| AC-003 | REQ-001, REQ-002 | SCN-001 | Server starts; model catalogs are listed or reloaded | No remote discovery runs; the GraphQL provider catalog has no `AUTOBYTEUS` entry; requesting it is rejected as an unknown provider | — | Server unit/e2e tests |
| AC-004 | REQ-006 | BEH-007, SCN-004 | A saved definition/run/launch profile/media default references a former remote model identifier | It shows as unavailable; launch, resume or generation is blocked with the existing unavailable-model outcome; the app does not crash, clear the value or substitute another model | — | Server/web tests with a remote-style identifier fixture |
| AC-005 | REQ-007 | BEH-008, SCN-005 | Server `.env` contains `AUTOBYTEUS_LLM_SERVER_HOSTS=…` and the vault contains `provider.autobyteus.api-key` | The server starts normally and all other providers work; the host value appears as an ordinary custom setting the user can delete; the key is never read | — | Server integration test |
| AC-006 | REQ-008 | BEH-009 | Token-usage history includes rows recorded with the removed provider | History lists and displays them; the released backfill migration yields the same result as before for the same input | — | Server tests |
| AC-007 | REQ-009 | BEH-010, SCN-006 | Start, resume and view native AutoByteus runtime runs with an API/Ollama/LM Studio/custom model | Unchanged behavior; the runtime is still labeled "AutoByteus" | — | Existing suites + user verification |
| AC-008 | REQ-010 | All | Build and test the three packages | Type-check, builds and the affected test suites pass; Docker entrypoints no longer write the host key | — | CI-equivalent runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Server model catalog | Build the model catalog | Server start; catalog list/reload | Any install | Catalog lists built-in and custom providers and runs dynamic discovery for Ollama/LM Studio/custom | No remote AutoByteus source exists | — | Supported Normal Scenario | catalog service | REQ-001, REQ-002, AC-003 |
| SCN-002 | User | App user | Configure providers | Settings page | Any install | Open Provider API keys and Server settings | No AutoByteus provider row or hosts card; others unchanged | — | Supported Normal Scenario | Settings UI | REQ-003, AC-002 |
| SCN-003 | System | Credential vault / launch readiness / tool preprocessing | Resolve credentials and preprocess tools | Run launch, media tool call, `.env` import | Any install | Readiness and resolution use only remaining providers | No AutoByteus path remains | — | Supported Normal Scenario | secret-management, readiness adapter | REQ-004, REQ-005, AC-001 |
| SCN-004 | User | App user with old saved selections | Open or launch saved work | Definition editor, run resume, app launch, media tools | A saved selection references a remote model | User opens it, sees "unavailable", picks another model | Work proceeds with the new model | Launch blocked until reselection | Supported Normal Scenario (established convention) | web docs/settings.md; runSettings locale | REQ-006, REQ-008, AC-004, AC-006 |
| SCN-005 | Operational | Upgrading install | Start the upgraded server | App/server start | `.env` host key and/or vault key exist | Server starts | Normal start; leftover values inert per DEC-002 | — | Supported Normal Scenario | settings service, vault | REQ-007, AC-005 |
| SCN-006 | User | App user | Use the native runtime | Run launch/resume | Native runs exist | Launch/resume/view | Unchanged | — | Supported Normal Scenario | runtime-kind-enum | REQ-009, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (removal only)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: The "AutoByteus LLM Hosts" card and the "AutoByteus" provider row disappear; the remaining cards and rows keep their current layout and order.
- Explicitly illustrative fixture content or permitted implementation variation: N/A
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Existing unavailable-model states (REQ-006) are reused unchanged.
- Product decisions that need the user (with reasoning and recommendation): None beyond DEC-001/DEC-002.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-007, AC-005 | Reliability | Startup succeeds with leftover provider data present | Upgrade from a release with the provider configured | Integration test |
| QR-002 | REQ-009, AC-007 | Compatibility | No change to native runtime behavior or saved native runs | All | Existing suites |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data or state that must be preserved: native runtime runs and definitions; token-usage history; all other providers' settings and credentials; saved model selection text (visible as unavailable).
- Loss, reset, rebuild, or regeneration that is acceptable: the remote provider's model selections, host value and API key stop having any effect (already the case in practice).
- Retention, privacy, compliance, volume, downtime, or operational constraints: no startup lockout; no deletion of user history.
- Unknowns requiring downstream investigation: per-surface unavailable wording; the released backfill migration freeze (architecture).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Remote AutoByteus LLM server | None (decommissioned) | User | None |
| Data Migration Guideline | Tolerant readers; freeze released migrations; no lockout | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | — |
| GraphQL provider catalog consumers (web) | Provider list is server-driven; `AUTOBYTEUS` disappears | Investigation | Low |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` (same folder) | Evidence | All | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | No user has a reachable remote AutoByteus server | Justifies removing without a deprecation period | User statement | Confirmed by user |
| ASM-002 | `autobyteus-ts` has no consumers outside this repository that import `AutobyteusClient`/`CertificateError` | Root export removal | Repo search found none; architecture re-checks | Open (low risk) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Are the AutoByteus image and audio providers included? | Scope | (a) include; (b) LLM only. Both discover from the same `AUTOBYTEUS_LLM_SERVER_HOSTS` with the same API key (`AUTOBYTEUS_KINDS = llm, audio, image`). | Without the server they cannot return a single model. Keeping them would also keep the hosts setting, key binding and `MultimediaRuntime.AUTOBYTEUS` alive. **Recommend (a) include.** User approved (a) on 2026-10-11. | User | Decided |
| DEC-002 | Saved data: remote model selections, saved host value, saved API key | Data handling | (a) **No migration.** Selections show the existing "unavailable" state; the host value stays in `.env` and appears as an ordinary custom setting the user can delete; the encrypted key stays inert in the vault and is never read. (b) Add a startup cleanup that deletes the `.env` key and the vault row (selections still unavailable). (c) Migrate selections to another model. | Today these are already dead: the server is gone, so selections are already unavailable. The repo's guideline allows a migration only for a change of meaning or a new required fact; neither applies. The settings reader and vault are tolerant, so leftovers can't break startup. (b) adds migration machinery to the `.env` file and the vault for a cosmetic gain. (c) would silently change users' choices, which the product convention forbids ("saved selectors remain visible as unavailable … instead of silently clearing or falling back"). **Recommend (a).** User approved (a) on 2026-10-11. | User | Decided |
| DEC-003 | Delete or retarget tests that use AUTOBYTEUS as a sample discovered provider? | Coverage | Delete all vs retarget generic ones | Tests that only cover the remote provider are deleted. Tests of generic catalog/settings/credential behavior are retargeted to a remaining provider (Ollama, LM Studio or custom), so coverage isn't lost. | Solution Designer | Decided |
| DEC-004 | Historical tickets, release notes and UI prototypes mentioning the provider | Clean-cut scope | Edit vs leave | They are historical records, not current docs. Rewriting them falsifies history. Leave them. Current docs are updated. | Solution Designer | Decided |
| DEC-005 | Token-usage history rows recorded with the provider | History | Keep the display-name entry vs rely on snapshots | Rows store a provider-name snapshot (backfill migration), so history keeps showing "AutoByteus" without keeping the enum. The released backfill migration gets a frozen copy of its display-name table so its result doesn't change (guideline §4). | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-005 | AC-001, AC-003 | SCN-001, SCN-003 | — |
| REQ-002 | UC-002 | BEH-002, BEH-005 | AC-001, AC-003 | SCN-001, SCN-003 | — |
| REQ-003 | UC-003 | BEH-003, BEH-004 | AC-002 | SCN-002 | — |
| REQ-004 | UC-004 | BEH-005 | AC-001 | SCN-003 | — |
| REQ-005 | UC-004 | BEH-006 | AC-001 | SCN-003 | — |
| REQ-006 | UC-005 | BEH-007 | AC-004 | SCN-004 | — |
| REQ-007 | UC-005 | BEH-008 | AC-005 | SCN-005 | — |
| REQ-008 | UC-005 | BEH-009 | AC-006 | SCN-004 | — |
| REQ-009 | — (preserved) | BEH-010 | AC-007 | SCN-006 | — |
| REQ-010 | UC-006 | All | AC-001, AC-008 | All | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-006.
- Product and system constraints architecture must preserve: BEH-010; no startup lockout; released migrations unchanged in effect.
- Decisions intentionally deferred to architecture design: exact deletion set per package; dead-code follow-through (multimedia source-model registry, `model-identifier.ts`); preprocessor unregistration; frozen copy for the backfill migration; test retargeting.
- Technical facts architecture should verify: UNK-001, UNK-002, RSK-001, RSK-002, ASM-002; per-surface unavailable-model behavior for a remote identifier.
- Known feasibility or integration risks: coordination with anthropic-incomplete-content-block (`autobyteus-llm.ts` compile-only edit).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-11, "approve")
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001 + DEC-001(a), DEC-002(a); SR-002)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
