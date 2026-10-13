# Requirements Document — Retire Legacy Personal Docker Stack

## Document Status
- Package identifier: fix-legacy-docker-workspace-builds (stable identity retained despite changed outcome)
- Request: Project Task b2b611bb-9a5d-49da-b1dc-fc1c8f80d42a; delegator /project_task_manager, run project_task_manager_a5f6d9d306e54970bafdad895bdf731d
- Status: Approved
- Current requirements baseline: R2 / SR-005
- Owner/date: Solution Designer / 2026-10-12
- Approved by: User
- Exact approval reference: user message 2026-10-12, “I also think so let's remove both because I think the current like a mono mono rapport was already enough right for all the purposes.” This accepts the immediately preceding recommendation to retire both old Dockerfiles and their personal-test Compose setup while retaining monorepo releases/local builds/remote nodes.
- Scope notice reference: Solution Designer 2026-10-12, “The removal scope is approved: retire both legacy images and their personal-test wiring…”
- Behavior-defining supplement: None. usage-investigation.md is factual context, not a separate product specification.
- Prior R1 repair requirements/D1 proposal: Superseded; durably preserved at git commit a98df0fd3aa8baa3b9e407a4d051e35de2fa2f78 and indexed in solution-revision-record.md. Prior approval does not authorize repair implementation after this change.
- Authorities read: solution-designer/SKILL.md; references/requirements-engineering.md; requirements/investigation/solution-revision templates; task-worktree AGENTS.md, DESIGN.md, TESTING.md; autobyteus-server-ts/AGENTS.md (2026-10-12, current conversation).

## Problem And Desired Outcome
Two old source-built Docker recipes fail pnpm workspace resolution (BAS-001/UD-002). Investigation showed that they belong to a separate developer personal-test harness, not the released/public-launcher server pathway the user uses. The user explicitly chose removal over repair. Retire that harness cleanly, keeping the monorepo server image and its current release, local-source-build and multiple-remote-node workflows intact. Completion requires reviewed/validated delivery merged and pushed to origin/personal; no public release requested.

## Stakeholders, Actors, And Outcomes
User/operator: retain current monorepo-backed nodes and data unchanged. Developer: retain monorepo local source builds and ordinary local frontend development. Maintainer/open-source reader: one unambiguous supported main-product server Docker recipe; no dangling old-stack commands or source-check failures. Historical reviewers: retain original ticket evidence truthfully.

## Relevant Scenarios And Journeys
| ID | Actor / kind | Goal / trigger / starting condition | Supported product-level sequence / outcome | Alternate/failure | Validity / independent evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-005 | User/maintainer / Operational | Approved retirement of unused personal harness on current personal source | Apply source retirement → consult current Docker docs → use monorepo public launcher or local-source helper, not removed recipes | Old test-stack entry commands no longer supported; no alias/fallback silently preserves them | Supported Normal Scenario, explicit user removal approval plus U-001..006 | REQ-005,008 / AC-007,010 |
| SCN-006 | Operator/developer / Operational | Build/publish/use a monorepo backend node, from local source or published image | Existing source helper builds monorepo; existing release pipeline publishes monorepo; public launcher can create multiple remotely accessed backend nodes | Ordinary build/registry errors retain existing behavior; no newly changed runtime/platform promise | Supported Normal Scenario, server Docker docs/build.sh/Compose/release workflow and seven current launcher nodes | REQ-006 / AC-008,011 |
| SCN-007 | Existing node owner / Operational | Repository cleanup while existing containers/volumes/workspaces may exist | Source-only deletion → existing launcher nodes/state remain untouched → normal management commands remain available | No automated container/volume/image/state deletion or migration is authorized | Supported Normal Scenario, current local nodes and user's always-monorepo direction | REQ-007 / AC-009 |
| SCN-008 | Maintainer / Operational | Run focused checks after retiring a packaging path | Current Docker-source checks target monorepo and current references; retired-only tests removed; new focused guards detect reintroduction/dangling supported references | Historical ticket/evidence mentions do not count as active references | Supported Normal Scenario, existing scripts/tests and repository TESTING.md | REQ-008 / AC-010,011 |

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current | Desired | Intentionally preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-005 | Operational / SCN-005 | Old personal wrapper/Compose exposes broken allinone + optional lightweight remote recipes | Retire both and their dedicated owned wiring, docs and unused test assumptions | Historical evidence remains; no deprecated command compatibility layer | U-001..004, R-001 |
| BEH-006 | Operational/Contract / SCN-006 | Monorepo recipe serves pipeline and local-source helper; public launcher handles multiple backend nodes; existing licensing artifacts/label present | Same supported paths, recipe, runtime payload and licenses | Monorepo build/run commands, Node/browser/CLI/mobile packaging, release platforms/tags and source helper | A-003, U-005/006, R-002 |
| BEH-007 | Operational / SCN-007 | Seven local launcher nodes use :beta; all current management/state is separately owned | Source cleanup does not operate on live resources or data | All current/past containers, images, volumes, saved runtime state and host-backed data left alone | U-002, R-003 |
| BEH-008 | Operational / SCN-008 | Copy-source test expects all three recipes and only team contract invariants; docs reference old wrapper | Current source tests/docs consistently describe retained pathways only | Meaningful monorepo source/contract/license checks remain; no global testing-policy rewrite | E-004, R-004 |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-004 | Retire unused personal developer Docker harness | SCN-005 |
| UC-005 | Preserve monorepo pipeline, source builds and remote-node use | SCN-006,007 |
| UC-006 | Keep current docs and packaging checks consistent after retirement | SCN-008 |
### Out Of Scope
Monorepo Dockerfile/runtime/application code redesign; removing server Docker Compose/source helpers/public launcher; deleting existing Docker resources or saved data; migration/import of old personal-stack data; changing provider removal, external messaging/gateway packaging, frontend behavior, CLI installation policy, release workflow behavior, bases/platforms/tags or security model. No updates to completed historical tickets/evidence to erase references.
### Non-Goals
Reproducing/repairing removed image builds; preserving the old Nuxt-in-Docker developer harness, automatic fixtures or ephemeral lightweight test-node variant; new dependency-packaging framework, full graph-check expansion, legacy-image smoke script or new CI job. Normal local frontend/isolated-desktop development remains unchanged, not reimplemented in monorepo.
### Preserved Behavior Boundary
BEH-006,007 / REQ-006,007 / AC-008,009,011. “Monorepo sufficient for current workflow” does not mean it contains the old port-3000 Nuxt development server; that retired-only capability was explained before user approval.
### Review Authority
Blocking findings cite approved REQ/AC/BEH. New behavior, compatibility promises, data-migration duties, security policy or unrelated Docker consolidation is a Requirement Gap needing renewed user approval. Recommendations outside this boundary are non-blocking follow-ups; reviewers cannot amend the basis.

## Requirements
| ID | Requirement | Behavior | Criticality / rationale |
| --- | --- | --- | --- |
| REQ-005 | Remove both legacy Dockerfiles and the dedicated personal-test harness that builds/starts them, including now-unused owned startup/configuration and fixture helpers after reference verification. Do not retain alternative recipe/command wrappers. | BEH-005 | Must; user's explicit removal choice |
| REQ-006 | Preserve the monorepo server recipe and its release pipeline, local source-build/helper/Compose and public-launcher multiple remote-node operation, including existing runtime license files/OCI label and application code/dependencies. | BEH-006 | Must; user states monorepo is the required/current path |
| REQ-007 | Perform source cleanup only. Do not start/stop/delete/upgrade existing containers, images, volumes, launcher profiles, saved ignored runtime configuration or user files; no data migration or reset. | BEH-007 | Must; removal is code/support retirement, not resource destruction |
| REQ-008 | Remove dangling active documentation and test expectations for retired paths; retain focused checks for supported monorepo wiring and cheap regression checks for retirement/preserved entrypaths. Historical tickets and evidence remain truthful and unchanged. | BEH-008 | Must; clean support boundary and retained validation |

## Acceptance Criteria
| ID | REQ / behavior / scenario | Observable success | Alternate/failure / verification intent |
| --- | --- | --- | --- |
| AC-007 | REQ-005 / BEH-005 / SCN-005 | Both Dockerfiles, old personal Compose/wrapper and reference-proven dedicated startup/supervisor/fixture assets absent from tracked current source | No compatibility aliases, alternate shipped recipes or orphan owned files; diff and reference audit |
| AC-008 | REQ-006 / BEH-006 / SCN-006 | Release default/zh builds, server source helper/build scripts and Compose still name existing monorepo recipe; public launcher/multiple-node pathways unchanged; recipe and runtime dependencies byte-unchanged versus base | Static path/link checks plus focused source/helper/launcher regressions. If shared build/runtime code must change, escalate and actually build/run affected image before pass |
| AC-009 | REQ-007 / BEH-007 / SCN-007 | No operational cleanup code/commands for existing Docker resources or user data; only explicit tracked source removals; no ignored state deletion | Review/diff/resource action ledger; owned validation cleanup only; never infer data permission from code removal |
| AC-010 | REQ-008 / BEH-008 / SCN-008 | Focused Python packaging/source/reference tests pass; current support docs have no obsolete commands/links; no stale “all server images” assertion about deleted recipes | Historical tickets/evidence, explicit absence guards and purposeful saved-state ignore exclusions are permitted mentions. Broken monorepo link/recipe or reinstated legacy asset is detected by guard/mutation |
| AC-011 | REQ-006,008 / BEH-006,008 / SCN-006,008 | Monorepo license directives/root files unchanged; licensing checker and artifact hygiene remain green; source checks still cover workspace contracts required by retained recipe | Not legal advice or new license policy. No declaration-only check falsely claimed as freshly built-image validation |

## UI / Product Design
N/A — no new UI/UX work or Product artifact; removal ends an unused developer frontend-in-Docker harness, not application/frontend functionality.

## Quality / External Contracts
QR-003 Operability/reliability: REQ-005,006,008 / AC-007,008,010; current build/support entrypoints remain consistent and tests need no provider keys. QR-004 Data safety: REQ-007 / AC-009; exact source-only retirement. QR-005 License payload continuity: REQ-006 / AC-011; existing monorepo license files/label. Existing Node/pnpm/VNC/platform contracts stay as-is; no new external library/standard decision.

## Data Continuity And Acceptable Loss
Persisted data/schema/semantics affected: No. Existing containers/volumes/browser profiles/workspaces and even any ignored personal docker/.runtime files must be preserved untouched. Only source/versioned support assets are retired. Users are not promised migration of old test-stack state; none is required by the approved direction. Disposable test-owned fixture directories may be cleaned by their owner.

## Decisions / Assumptions
| ID | Question / reasoning | Owner / status |
| --- | --- | --- |
| DEC-004 | Keep/repair or retire old harness? Monorepo already handles current release/local-source/remote-node uses; user says they always use monorepo and explicitly chooses removal. | User / Decided: retire, approval quote above |
| DEC-005 | Dedicated seed helper: only nonhistorical caller is personal-docker.sh; no independent docs/test/other owner references found. Remove as part of dead harness-owned assets, not preserve a misleading fixture tool. | Solution Designer / Decided within approved cleanup direction; recheck references on refreshed base |
| DEC-006 | New graph framework/legacy Docker smoke/CI? Removed builds no longer need proof; existing focused source/helper/launcher checks plus retirement/preservation guards suffice for source-only deletion. Do not add superseded R1 machinery. | Solution Designer / Decided within direction |
| DEC-007 | Saved legacy .runtime files remain user-owned after source removal; preserve their Git/Docker exclusion without retaining any executable legacy path. | Solution Designer / Decided within REQ-007 preservation direction |
| ASM-002 | New references may appear on moving personal | Downstream owners re-audit/integrate before finalization; material new consumer returns for recovery |

## Traceability / Architecture Phase Input
UC-004 → REQ-005 → AC-007 → SCN-005.
UC-005 → REQ-006,007 → AC-008,009,011 → SCN-006,007.
UC-006 → REQ-008 → AC-010,011 → SCN-008.
Architecture maps the now-approved deletion closure, exact retained production paths, reference/doc/test amendments and data non-effect. R1 IDs BEH-001..004, SCN-001..004, UC-001..003, REQ-001..004, AC-001..006 are superseded, not reused or still-active repair obligations.

## Supplements / Readiness
Canonical investigation-notes.md and usage-investigation.md contain historic/factual support and current removal inventory. Prior R1/D1 is git-pinned; no competing current spec. No behavior supplement or Product approval applicable. Current/desired/preserved behavior, scope, scenarios, data policy, decisions and measurable ACs: ready. User approval applies to exact R2 retirement direction above; implementation details are within it. Remaining Needs user decisions: None. Approved basis ready for replacement architecture: Yes. Final user verification/merge remains Delivery-owned.

## SR-007 Evidence / Verification Clarification (R2 Unchanged)
IR-001 uncovered an unchanged public installer quoting product defect and small test-owned interpreter/host-port fixture causes. The product issue is separately registered TODO project_task_9599b2a7-3ae6-4e7f-9875-1e039f4db2e6; it does not authorize a launcher patch or global success claim under this retirement. TESTING Rule9's local test corrections preserve existing intended behavior and are covered by D3; R2 REQ/AC text, user approval and byte-identical public runtime boundary remain unchanged. Source-review/API/Delivery gates still apply; known non-regression product risk must be carried explicitly. No new product decision or behavior-defining supplement; baseline-disposition.md is technical recovery evidence, not relaxed acceptance criteria.
