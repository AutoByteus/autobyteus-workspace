# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `proposal-critical-analysis.md`; `design-self-validation.md`; `sources/autobyteus-vertical-application-developer-experience-proposal.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-003`
- Design Review Report Reviewed As Context: `design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`–`IR-005`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-010`
- Current Review Round: `10`
- Trigger: follow-up product-contract clarification after the `CRR-009` fresh review. The user confirmed that a standalone-capable application must package complete application-owned model/runtime defaults, while Studio is an optional override/testing surface. No production source changed; the review classification and score remain unchanged, but the prescribed design direction is refined.
- Prior Review Round Reviewed: round `9`, `CRR-009`, `Fail — Design Impact`
- Latest Authoritative Round: `10`
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`–`API-REV-004`
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `APIE2E-BRIEF-003`, `APIE2E-F004`
- Exact Failing Commands / Execution Mode: from `applications/brief-studio`, `pnpm dev -- --port 43124 --no-open`; fresh `.autobyteus/dev/data`; real same-origin standalone host and system Chrome; supported Brief `Create brief` then `Generate draft` actions; correlated application API and SQLite evidence.
- Failure Evidence Paths: `evidence/api-e2e/api-rev-004-brief-dev-standalone.log`; `api-rev-004-brief-standalone-real-team.log`; `api-rev-004-brief-standalone-failure-api.json`; `api-rev-004-brief-standalone-configuration.log`; `api-rev-004-standalone-launch-profile-surface.log`; `api-rev-004-studio-root-dev.log`; `api-rev-004-studio-provider-artifact-excerpt.log`.

## Review Scope

- Changed implementation and behavior reviewed: the complete dual-host foundation from the approved base through IR-005, including package/build/dev/start, Studio and standalone compositions, lifecycle/readiness, selected-application ingress, resource configuration, application execution, graph-local definition/run authorities, mixed-team member prompt construction, current docs, and API/E2E readiness.
- Files / areas reviewed: all `807` base-to-HEAD changed paths; all `118` changed implementation-source/config candidates after excluding tests, generated output, ticket artifacts, dependency lock metadata, and deleted files; every composition-critical singleton/default seam in application platform/orchestration/engine/gateway/agent/team/API areas; the exact Brief manifest/UI/backend/SDK launch path; Studio setup REST/UI; standalone CLI/config/routes/bootstrap; readiness/configuration services; relevant durable tests and API-REV-004 live evidence.
- Explicit exclusions: no production/test fix was authored; no proportional successful-test review applies because API/E2E failed; no release/deployment/finalization work; uncommitted API/E2E-owned tests, reports, and evidence were preserved.
- Reviewer checks: canonical `design-principles.md` reread in full; Example 9 product-reachability rule reapplied; `git diff --check` passed; server build-config TypeScript no-emit passed; focused standalone/configuration/graph-authority selection passed `3` files / `7` tests; API-REV-004's broader `55` files / `236` tests and real browser evidence were reconciled with source; changed-source threshold audit and composition-default audit completed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: the package must run through both real hosts; AC-005/006 require the real Brief bundled team to execute in both hosts with the same selected resource/launch semantics; a standalone-capable package must provide complete application-owned runtime/model defaults for every effective leaf agent; Studio may persist separate overrides for model/runtime experimentation; native `dev`/`start` are supported clean standalone product paths.
- Design-spec behavior map verified against the implementation: `Contradicted`. DS-002 stops at mounted business UI, DS-003 begins at an already-issued backend operation, and DS-004 begins after the backend already has a launchable resource. No reviewed spine or owner requires, resolves, validates, or carries complete application-owned defaults into effective standalone launch configuration. The design self-validation nevertheless marked UC-009 complete and assumed the Brief bundled-team resource selection was a runnable launch default.
- Design review report and round confirmed: `ARCH-REV-003`, `Pass`, against `SR-003`; its readiness conclusion is superseded for the affected standalone execution path.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: the user clarified the governing configuration contract after `CRR-009`: complete package-owned defaults are the standalone baseline; Studio configuration is an optional non-mutating override. This resolves the earlier ambiguity about whether standalone required a normal setup surface.
- Remaining material ambiguity, if any: the detailed schema/owner mapping remains solution-design work, but a mandatory standalone setup UI is no longer an open product choice. The reviewed design is still inadequate because it did not specify or enforce the clarified package-default and effective-readiness invariant.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | One validated package can be imported into Studio or selected by standalone; API-REV-004 proves Studio iframe entry and standalone root/UI entry. | N/A |
| `BEH-002` | Confirmed | Both hosts normalize bootstrap into one `startApplication`/client path; no application host branch is introduced. | N/A |
| `BEH-003` | Confirmed | The same package entries remain immutable across exercised hosts and mutable state stays under host data roots. | N/A |
| `BEH-004` | Contradicted | Studio setup persists a launch profile and completes the real team run. Clean standalone resolves only the bundled resource, reports ready with `launchProfile: null`, then `Generate draft` fails before binding/provider invocation. The real member prompt path also reads team context through a process-global definition fallback and omits the package team's non-empty team instruction. | API-REV-004: `llmModelIdentifier is required`, zero standalone configuration rows, no binding/run/artifacts; final Studio system-prompt evidence contains Agent and Runtime sections but no `Team Instruction` section. |
| `BEH-005` | Confirmed | Explicit Studio and selected-app standalone compositions, route cardinality, storage roots, process prerequisites, and cleanup remain distinct and real. | N/A |
| `BEH-006` | Contradicted | The native commands start/build/watch real hosts, but the maintained package supplies only `runtimeKind` and no effective `llmModelIdentifier`; the toolchain does not reject that incomplete standalone package and startup does not resolve it as non-runnable. | API-REV-004 executes the documented command on a fresh data root and reaches the supported app action before failing on missing launch input. |
| `BEH-007` | Confirmed | Current schemas, migrations, app/platform databases, recovery owners, and package immutability work; F004 is absent configuration, not migration/storage corruption. | N/A |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Fail | `design-self-validation.md` marks UC-009/SV-C21 complete because Brief has a bundled-team default, but the manifest default selects only the resource and supplies no required model/profile. | Reopen the solution basis and correct the false completeness premise. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | The supplements promise both-host real execution and setup-required readiness; standalone reports ready and fails only after `Generate draft`. | Revise affected supplemental claims and implement the reviewed replacement. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | DS-002 ends at mounted UI; DS-003/004 assume configuration/launchability. The package-default -> optional host override -> effective profile -> host validation -> readiness -> execution path is absent, violating the Spine Span Sufficiency Rule. | Add that complete host-neutral resolution/execution spine and its real run outcome. |
| Ownership boundary preservation and clarity | Fail | No owner enforces complete package defaults or resolves them with optional host overrides before readiness. Separately, `MemberTeamContextBuilder` obtains `AgentTeamDefinitionService.getInstance()` instead of the graph-selected service. | Assign one effective-launch-configuration owner and remove the supported application path's definition-authority bypass. |
| Off-spine concern clarity | Fail | Effective launch-profile resolution is treated as incidental readiness detail even though it is a necessary main-line input for AC-005/006. | Put package-default resolution and validation on the primary path; keep override persistence as an optional host concern attached to the same contract. |
| Existing capability/subsystem reuse check | Pass | The current configuration service/store, launch-profile contracts, lifecycle readiness, and graph-local definition services are reusable; no parallel subsystem is justified. | Revised design must make application-owned defaults the baseline consumed by these owners; persistence is needed only for explicit overrides. |
| Reusable owned structures check | Pass | Current execution-resource and launch-profile structures are shared across hosts; no duplicate package-specific launch model was added. | Preserve shared contracts while tightening their readiness semantics. |
| Shared-structure/data-model tightness check | Fail | `ApplicationExecutionResourceConfigurationView.status = READY` with `launchProfile: null` is consumed by lifecycle as application-ready although the selected resource cannot produce the required launch. One status is serving resource selection and runnable readiness inconsistently. | Define a truthful authoritative runnable-configuration/readiness projection without overlapping meanings. |
| Repeated coordination ownership check | Fail | Studio UI gates required model input, lifecycle performs a weaker readiness check, and the SDK finally throws at launch. Runnable-configuration policy has no single owner. | Assign the invariant to one authoritative boundary and make UI/standalone/lifecycle consume it. |
| Empty indirection check | Pass | Composition, lifecycle, gateway, and SDK boundaries perform real work; no new pass-through-only layer was found. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Changed files are generally cohesive and paths match responsibilities; the architecture failure is missing ownership/wiring, not indiscriminate file mixing. | Preserve current file clarity in the redesign. |
| Ownership-driven dependency check | Fail | Standalone execution lacks the required configuration dependency; mixed-team prompt construction silently selects a process-global definition service outside the graph owner. | Make both dependencies explicit from their governing composition/owner. |
| Authoritative Boundary Rule check | Fail | The application graph owns the exact package definition services, yet member prompt construction bypasses that authority. Standalone runtime ingress is exposed without an authoritative effective-configuration resolver enforcing package completeness and host resolvability. | Keep callers on one graph/configuration authority; do not use hidden global, copied-database, or direct-store workarounds. |
| File placement check | Pass | Existing configuration, lifecycle, CLI, host, and team-context files are in their owning subsystems. | The revised design should map any new surface only after ownership is decided. |
| Flat-vs-over-split layout judgment | Pass | The implementation is navigable and not artificially fragmented; source threshold review found no oversized changed implementation file. | None. |
| Interface/API/query/command/service-method boundary clarity | Fail | Package validation does not require complete launch defaults, Studio override precedence is not the governing shared contract, and lifecycle accepts a resource-only `READY` view as runnable. | Specify the package-default schema, optional override precedence, and exact runnable/non-runnable readiness contract. |
| Naming quality and naming-to-responsibility alignment check | Fail | Most naming is strong, but `READY` is misleading at the lifecycle boundary when mandatory launch input is absent. | Make status names/meanings align with the chosen resource-ready versus run-ready ownership model. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Shared host-neutral SDK, gateway, orchestration, package, and runtime owners are reused. | Do not solve F004 with a package-specific profile copy or second config model. |
| Patch-on-patch complexity control | Pass | Prior fixes removed concrete bypasses without catalog merges, compatibility aliases, or ID special cases; the current defects are not caused by accumulated fallback machinery. | Re-enter architecture rather than applying another isolated workaround. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Hosted-only APIs, custom builders, generated mirrors, broad app registrars, and mock product paths remain removed. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Existing standalone integration proves routes/bootstrap/immutability but not clean-root launch configuration; the Brief integration seeds `gpt-test` and uses a fake run seam; no durable assertion verifies package team instruction reaches member prompts. | Add coverage only after the governing configuration/readiness design is approved; include clean-root both-host execution and prompt-authority proof. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The cumulative durable test package is organized by boundary and the new graph-local allocator regression is direct and valid. | Preserve fixture ownership. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | No removed contract is kept for compatibility; the current gap is missing coverage, not stale assertions. | None. |
| API/E2E readiness for the next workflow stage | Fail | API-REV-004 is a critical real-product failure at 89%; the fresh source audit also found silent package team-instruction loss. | Return through solution design and architecture review before implementation/API/E2E resumes. |

## Source File Size And Structure Audit

An automated base-to-HEAD audit checked all `118` changed implementation-source/config files after excluding tests, generated output, tickets, deleted files, dependency lock metadata, and vendor output. No changed implementation source exceeds `500` effective non-empty lines. Only `server-runtime.ts` exceeds the `220`-line delta trigger; it is a net reduction from 259 physical lines to 158 and now delegates the Studio composition instead of owning route/runtime internals, so no split is required. `pnpm-lock.yaml` is dependency metadata and is not implementation source.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/server-runtime.ts` | 154 | Pass | Triggered (`+101/-202`) | Net simplification; process bootstrap/shutdown facade delegates composition | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | 492 | Pass | Pass (`42`) | Large but cohesive engine/worker lifecycle owner; no new responsibility pressure | Pass | Accept | Monitor, no forced split. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | 463 | Pass | Pass (`96`) | Cohesive application orchestration boundary | Pass | Accept | Preserve as authority. |
| `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts` | 440 | Pass | Pass (`14`) | Current strict manifest parser/normalizer | Pass | Accept | None. |
| `applications/socratic-math-teacher/frontend-src/socratic-renderer.js` | 404 | Pass | Pass (`34`) | One application presentation concern | Pass | Accept | None. |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | 398 | Pass | Pass (`28`) | One definition-provider concern | Pass | Accept | None. |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | 397 | Pass | Pass (`24`) | One team-definition-provider concern | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-platform/runtime/application-definition-runtime-readiness.ts` | 100 | Pass | Pass (`+111/-0`) | Correct owner location, but its run-readiness invariant is incomplete (`CR-007`) | Pass | Design Impact | Redesign invariant before local correction. |
| Remaining `110` audited changed implementation-source/config files | `<397` each | Pass | Pass | No additional size/placement trigger; full ownership/default audit applied | Pass | Accept except findings below | Address `CR-006`–`CR-008`; no size-driven split. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No version alias, dual host branch, old package reader, or compatibility wrapper was introduced. |
| No legacy old-behavior retention in changed scope | Pass | Mock product paths, hosted-only APIs, broad implicit app registrars, custom builders, and generated source mirrors remain removed. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Base-to-HEAD deletion/removal inventory remains complete. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration` remains correct; F004 is absent current configuration, not old data. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | None found. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Current schemas and host-specific roots are used directly. |

## Dead / Obsolete / Legacy Items Requiring Removal

None. The process-global defaults identified by the dependency audit are not automatically legacy mechanisms. `CR-008` is a reachable authority bypass; other default seams cannot drive findings without an independently supported caller/path.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: current devkit/custom-application/Brief documentation says `dev`/`start` are real standalone flows, but the package does not declare a complete model launch default and the documentation does not establish complete package-owned defaults as the standalone contract or Studio configuration as an override.
- Files or areas likely affected: `autobyteus-application-devkit/README.md`; `applications/brief-studio/README.md`; `docs/custom-application-development.md`; package/agent/team configuration documentation; Studio override/reset documentation.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-AR-001` | Confirmed | Core database/protected-path/Prisma/vault/tool/runtime startup order remains preserved. F004 concerns missing application launch input after those prerequisites, not their order. |
| `MP-AR-005` | Confirmed | Maintained roots enter the real pack/dev/start paths. The resulting standalone host is real but not sufficiently configured to execute the required team. |

### Prior Code-Review Material-Premise Decisions

| Premise ID | Current Status | Re-review Evidence |
| --- | --- | --- |
| `MP-CR-001` | Confirmed | Controlled standalone browser/restart behavior remains valid. |
| `MP-CR-002` | Confirmed | Current manifest/config/package identity refresh remains valid. |
| `MP-CR-003` | Confirmed | API-REV-002/003/004 retain successful repeated Studio package refresh. |
| `MP-CR-004` | Confirmed | API-REV-003/004 retain exact package-team visibility and Studio entry. |
| `MP-CR-005` | Confirmed | API-REV-004 proves the corrected graph-local allocator and complete real Studio team run. |

### `MP-CR-006` — Clean standalone reaches a required team launch without a complete effective package-owned profile

- Origin: `New`
- Related approved requirement or established contract: `BEH-004`, `BEH-006`; `UC-004`, `UC-009`, `UC-015`, `UC-018`; `AC-005`, `AC-006`, `AC-011`, `AC-013`.
- Relevant behavior ID(s): `BEH-004`, `BEH-006`.
- Initiating basis kind: `Operational` plus the supported user action on the resulting surface.
- Independent product-supported initiating trigger or applicable governing contract: a developer/operator runs the documented `pnpm dev` from the Brief application folder with a fresh writable data root; the user opens the exposed standalone Brief UI, creates a brief, and clicks `Generate draft`.
- Support evidence: the command and root UI/actions are documented product surfaces; API-REV-004 used the exact command, real host, real Chrome, and application API without hidden-state mutation.
- Forward current production path: `pnpm dev -> devkit pack -> startStandaloneApplicationHost(package/id/data/network) -> selected standalone composition -> / -> Brief UI -> Create brief -> Generate draft -> backend resolveDraftingTeamConfiguration -> configuration service returns bundled resource with launchProfile null/status READY -> buildConfiguredTeamRunLaunch -> require llmModelIdentifier`.
- Lifecycle preconditions and material consequence: the package agents declare `runtimeKind` but no `llmModelIdentifier`; the new data root appropriately has no Studio override. The application reports ready and accepts business input, then becomes blocked before binding, run, provider, notification continuation, or artifacts.
- Reachability: `Reachable`
- Review consequence / proportionate response: drives `CR-006` and `CR-007`; the missing package-default/effective-resolution spine and owner require solution redesign. Complete portable runtime/model selection belongs in the package, while credentials, secrets, machine-local endpoints, hidden database copying, silent provider selection, and test-only seeds do not.

### `MP-CR-008` — A real package-owned team run silently loses its team instruction through a global definition lookup

- Origin: `New`
- Related approved requirement or established contract: `BEH-004`; `UC-009`; `AC-005`, `AC-006`; approved exact graph-authority rule.
- Relevant behavior ID(s): `BEH-004`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: in Studio's supported application surface, the user saves the model through Launch setup, enters Brief, creates a brief, and clicks `Generate draft`.
- Support evidence: API-REV-004 executed that real product journey with the current package and provider; the package's `agent-teams/brief-studio-team/team.md` contains a non-empty team instruction.
- Forward current production path: `Studio Brief action -> app backend -> application orchestration -> graph-local TeamRunService/MixedTeamManager -> MixedAgentMemberHandle -> getMemberTeamContextBuilder() -> AgentTeamDefinitionService.getInstance() -> package team not found -> teamInstruction null -> member system-prompt composer`.
- Lifecycle preconditions and material consequence: the graph-local catalog contains 29 definitions including the package team while the process-global catalog used by the fallback does not. The real final system-prompt log has Agent and Runtime sections but no Team Instruction section, so package-owned team semantics are silently omitted even though the run happened to finish using duplicated agent/application instructions.
- Reachability: `Reachable`
- Review consequence / proportionate response: drives `CR-008`; inject the selected graph authority through the team backend/member-context construction path and protect the prompt semantic with durable coverage. This does not justify a repository-wide singleton rewrite.

## Review Scorecard

- Overall score (`/10`): `8.1`
- Overall score (`/100`): `81`
- Score calculation note: simple average of the ten mandatory categories, rounded; categories below 9.0 are real blockers and the average does not override them.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 7.2 | Host/package/backend/event spines are otherwise detailed. | The required package defaults -> effective resolution -> host validation -> readiness spine is absent and UC-009 was incorrectly marked complete. | Add the complete authoritative configuration -> readiness -> real run/result spine. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 7.4 | Composition and graph owners are explicit in most changed code. | Effective launch configuration has no single owner; member prompt construction bypasses the graph definition authority. | Assign one resolver/validator authority and inject exact graph authority throughout reachable team construction. |
| `3` | `API / Interface / Query / Command Clarity` | 7.5 | Existing host-neutral SDK and selected-app ingress are narrow. | Package completeness and override precedence are unspecified; lifecycle treats resource-only readiness as runnable. | Define the package-default, optional-override, and explicit non-runnable contracts. |
| `4` | `Separation of Concerns and File Placement` | 9.1 | Changed files and folders remain cohesive and appropriately placed. | The redesign must refine existing definition/configuration/readiness owners. | Preserve responsibility-led placement; do not add a mandatory standalone setup subsystem. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 8.0 | Shared resource/profile structures avoid host-specific copies. | `READY` is consumed with two meanings and runnable policy is split across UI/lifecycle/SDK. | Define one tight readiness projection/invariant used by both hosts. |
| `6` | `Naming Quality and Local Readability` | 8.8 | Most names and local code are clear. | `READY` materially overstates the lifecycle state when mandatory launch input is absent. | Align status terminology with its exact responsibility. |
| `7` | `API/E2E Readiness` | 7.0 | Repository tests, Studio live execution, cleanup, and integrity are strong. | A critical documented standalone journey fails; prompt authority lacks durable proof. | Re-enter design/architecture, implement, then rerun both exact scenarios before the remaining matrix. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 7.2 | Studio now creates real bindings/runs/provider calls/artifacts. | Standalone cannot launch; package team instructions are silently omitted from real member prompts. | Make configuration and definition semantics faithful in both hosts. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Clean-cut removal remains excellent; no compatibility machinery was added. | General default seams remain but are not legacy by themselves. | Remove only supported-path bypasses proven by reachability. |
| `10` | `Cleanup Completeness` | 9.3 | Removed paths stay removed; API/E2E cleanup and diff guards pass. | API/E2E-owned tests/reports/evidence remain intentionally uncommitted. | Preserve them through the reroute and finalize only in their owning stages. |

## Findings

### `CR-001` — Resolved: standalone development owns deterministic full-document reload

- Status: `Remains Resolved`; API-REV-004 reaches the real standalone UI through the retained browser/session path.

### `CR-002` — Resolved: live development sessions refresh current project inputs and selection state

- Status: `Remains Resolved`; current package/config identity reaches both API-REV-004 hosts.

### `CR-003` — Resolved: repeated Studio edits refresh the registered package instead of re-importing it

- Status: `Resolved and API/E2E-confirmed` since API-REV-002.

### `CR-004` — Resolved: Studio GraphQL uses composition-owned application definition authorities

- Status: `Resolved and API/E2E-confirmed`; API-REV-004 setup sees the exact package team and completes the real Studio run.

### `CR-005` — Resolved: application team-member identity allocation uses graph-local authorities

- Status: `Resolved and API/E2E-confirmed`.
- Verification: API-REV-004's direct non-fake regression passes and the real package researcher/writer allocate, invoke `LMStudioLLM`, publish two artifacts, and reach `in_review`.

### `CR-006` — Incomplete standalone package-default/effective-configuration spine and owner

- Status: `Open`
- Severity / confidence: `Major` / `High`
- Classification: `Design Impact`
- Affected approved behavior: `BEH-004`, `BEH-006`; `UC-004`, `UC-009`, `UC-015`, `UC-018`; `AC-005`, `AC-006`, `AC-011`, `AC-013`.
- Material premise: `MP-CR-006` (`Reachable`).
- Evidence: the Brief manifest selects a default bundled team; its researcher/writer `defaultLaunchConfig` values contain only `runtimeKind: autobyteus` and omit `llmModelIdentifier`; Studio persists a working override; clean standalone has no override and the real action fails with `llmModelIdentifier is required`.
- Why this is architectural: the reviewed package contract does not require complete application-owned launch defaults, and no single owner resolves package defaults plus optional host overrides and validates the result before readiness. The reviewed design incorrectly equated resource selection with runnable launch semantics.
- Required action: `solution_designer` must specify complete package-owned launch defaults for every effective leaf agent, precedence (`host/Studio override > application team/member default > agent default` or an equally explicit reviewed rule), one effective-configuration resolver/validator, and the complete build/start/readiness/execution spine. A mandatory standalone setup UI is not required. Do not patch by copying Studio data, pre-seeding SQLite, embedding credentials/secrets/machine-local endpoints, or silently choosing a provider.

### `CR-007` — Standalone readiness reports success without required runnable launch input

- Status: `Open`
- Severity / confidence: `Major` / `High`
- Classification: `Design Impact` coupled to `CR-006`
- Affected approved behavior: `BEH-004`, `BEH-006`; `UC-009`, `UC-012`; `AC-005`, `AC-006`.
- Material premise: `MP-CR-006` (`Reachable`).
- Evidence: `ApplicationExecutionResourceConfigurationService` returns `READY` with `launchProfile: null`; `ApplicationRuntimeDefinitionValidator.validateLaunchProfile()` returns immediately for null; lifecycle therefore reports ready and serves the business UI. Studio separately knows a model is required, while the SDK throws only after the business action.
- Why this is not safely isolated as a local fix: changing readiness alone would truthfully reject the current package but still would not satisfy AC-005/006 until CR-006 defines and enforces complete package defaults and their override semantics.
- Required action: the revised design must define one authoritative runnable-configuration invariant, reject incomplete standalone-capable packages during build/validation, reject unavailable declared model/runtime or missing credentials before business execution, and align Studio overrides, standalone startup, lifecycle readiness, and launch validation to it. Prefer distinct `INVALID_PACKAGE`, `HOST_REQUIREMENT_MISSING`, and `RUNNABLE` meanings rather than overloading `READY`.

### `CR-008` — Mixed-team member prompts bypass the graph-local team-definition authority

- Status: `Open`
- Severity / confidence: `Moderate` / `High`
- Classification: bounded implementation defect discovered by the full review; it must be carried through the upstream Design Impact reroute.
- Affected approved behavior: `BEH-004`; `UC-009`; `AC-005`, `AC-006`; exact graph-authority design contract.
- Material premise: `MP-CR-008` (`Reachable`).
- Evidence: `createApplicationRunAuthorities()` injects graph services into run creation, but `MixedAgentMemberHandle` uses `getMemberTeamContextBuilder()`, whose builder defaults to `AgentTeamDefinitionService.getInstance()`. The package team has non-empty `team.md`; API-REV-004's real final prompt contains no `## Team Instruction`, confirming silent semantic loss on the supported path.
- Required action: propagate a `MemberTeamContextBuilder` constructed with the exact graph-local team-definition service through the application team backend/manager/member registries; add a durable real-boundary assertion that the package team instruction reaches member prompt composition. Do not merge catalogs or add a package-ID special case.

The broader composition-default audit found no additional finding that meets the product-reachability gate. Other `getInstance()`/default seams exist, but the supported application compositions inject the exact critical services on currently established paths, or no independent in-scope trigger was proven. Technical possibility alone does not justify a repository-wide DI rewrite.

## Classification

- `Design Impact`
- The API/E2E failure is not a stale test, fixture, environment, or provider problem. It exposes a missing reviewed product spine and ownership decision. `CR-008` is a bounded implementation defect, but the current package must route upstream because `CR-006`/`CR-007` block a valid local implementation prescription.

## Recommended Recipient

- `solution_designer`
- Revise the mandatory solution package and relevant supplements, then route through `architecture_reviewer`. Implementation resumes only after architecture Pass.

## Residual Risks

- The user has now fixed the product direction: complete application-owned defaults are foundational, and Studio is an optional override/testing surface. Exact schema and owner mapping still require solution and architecture review.
- After redesign and implementation, API/E2E must rerun clean standalone `APIE2E-BRIEF-003` from a fresh data root and prove a real run from package defaults without a setup UI or preseeded configuration row; it must also prove Studio override and reset-to-default behavior plus negative incomplete-package/host-requirement outcomes.
- The package team-instruction boundary needs direct durable coverage and a live prompt-semantic recheck.
- Remaining starter/Socratic/full command matrix and fresh explicit Studio remount repetition remain downstream after the blockers resolve.
- General singleton/default seams remain an audit watchlist, not findings absent a supported initiating path. The effective-configuration path and every override adapter must consume exact graph authorities and be reviewed against the Authoritative Boundary Rule.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — both material premises are independently product-reachable and forward-traced.
- Score Summary: `8.1/10` (`81/100`); data-flow, ownership, API, data-model, naming, API/E2E, and runtime categories are below the clean-pass threshold.
- Failure Origin: `APIE2E-F004` is `Design Impact`: the reviewed standalone architecture does not require or resolve complete application-owned launch defaults and its readiness invariant is incomplete. The full audit also found `CR-008`, a separate reachable graph-authority bypass in team prompt construction.
- Recommended Recipient: `solution_designer`
- Notes: `CRR-010` preserves the requested fresh review result while superseding its earlier mandatory-setup-oriented remedy. There is a confirmed architecture issue, but the revised solution should simplify around complete package defaults plus optional Studio overrides rather than add a second mandatory setup surface.
