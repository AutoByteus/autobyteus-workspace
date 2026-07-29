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
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: implementation handoff at `6fcb46a57c2c531d5e43dc90e254b39507bce195`; production implementation commit `247795f5f4fd9fda2e45347b7a9680b4c385e0a7`; approved baseline `6caf809303294252c109420b238588f0c68aca6a`.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- API/E2E Revision Record Reviewed (failure-origin entry point): `N/A`
- Relevant API/E2E Revision IDs: `N/A`
- Delivery Revision Record Reviewed (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `N/A` — this is a source-review result, not an API/E2E failure-origin review.
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths: source evidence is recorded in `CR-001` and `CR-002` below.

## Review Scope

- Changed implementation and behavior reviewed: universal application startup/bootstrap, Studio and standalone providers, graph-local runtime authorities and lifecycle, Studio/standalone compositions and public server boundary, native devkit `dev`/`dev:studio`/`build`/`validate`/`start`, maintained application migrations, clean contract-symbol replacement, removal/cleanup, and next-stage readiness.
- Files / areas reviewed: full production diff `6caf8093..247795f5` across contracts, frontend SDK, server, Studio web, devkit, starter templates, Brief Studio, and Socratic; all changed implementation-source files were included in the structural/size scan. The approved artifact chain and reported implementation checks were also reviewed.
- Explicit exclusions: API/E2E environment setup and broad execution; durable API/E2E test correction; deployment/docs finalization. The six acknowledged obsolete assertions in two unchanged REST unit files remain an API/E2E validity decision rather than an implementation-source finding.
- Reviewer checks: `git diff --check 6caf8093..247795f5`; `pnpm -C autobyteus-application-sdk-contracts test` (6 passed); `pnpm -C autobyteus-application-frontend-sdk test` (12 passed, including type tests); `pnpm -C autobyteus-application-devkit test` (16 passed). Reviewer-generated `dist`/`.tmp-tests` outputs were removed; the worktree was clean before report authoring.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Requirements define one current manifest-v4 package and host-neutral app startup, two real host compositions, explicit graph-local platform lifecycle, clean removal of hosted-only/legacy paths, and a native real-host application command surface.
- Design-spec behavior map verified against the implementation: Yes, as the governing map. The implementation realizes the mapped paths except for the two bounded DS-006 fidelity defects recorded below.
- Design review report and round confirmed: `ARCH-REV-003`, `Pass`, against `SR-003`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None. `CR-001` and `CR-002` are implementation defects on approved `BEH-006`, not new behavior.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Shared pack/validation feeds current package roots; Studio and standalone composition/provider paths consume those packages without a host-specific app build. | N/A |
| `BEH-002` | Confirmed | `startApplication` delegates through the runtime-bootstrap/startup coordinator to an installed Studio-iframe or standalone-same-origin provider; app code carries no host selection. | N/A |
| `BEH-003` | Confirmed | Current manifest parser/validator and explicit standalone `{packageRoot, localApplicationId}` selection remain authoritative; no package-vNext or first-entry inference was added. | N/A |
| `BEH-004` | Confirmed | Each composition constructs graph-local orchestration authorities, selected runtime adapters, execution resources, and application engine lifecycle behind one host composition. | N/A |
| `BEH-005` | Confirmed | Studio builds the all-app composition; standalone builds the selected-app composition and exposes bootstrap/static/SPA/WebSocket-origin paths through its public host handle. | N/A |
| `BEH-006` | Confirmed | Maintained project scripts and devkit command/config/pack/session owners establish the approved real-host path. The terminal standalone reload and live config/input re-resolution are incomplete; see `CR-001`, `CR-002`, `MP-CR-001`, and `MP-CR-002`. | N/A |
| `BEH-007` | Confirmed | Graph-local lifecycle and current storage/migration owners are preserved; standalone selects a distinct data root and no schema migration/compatibility path was introduced. | N/A |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Approved package classifies a larger behavior/refactor change and names explicit owners/spines; implementation preserves that architecture. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Most proposal/validation constraints are implemented, but DS-006/AC-011 requires deterministic standalone browser reload and current resolved-input watching. | Resolve `CR-001` and `CR-002`. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | DS-001 through DS-005 and DS-007 through DS-010 remain clear; the DS-006 standalone spine stops at OS URL dispatch instead of browser full reload, and its watch lifecycle freezes initial resolution. | Complete the approved DS-006 terminal/lifecycle steps. |
| Ownership boundary preservation and clarity | Pass | Providers own host adaptation; compositions own graph lifecycle; devkit sessions delegate to real host owners. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Selection, bootstrap, readiness, atomic packing, browser interaction, and Studio client concerns attach to named spine owners. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | Current package parser, validation, Studio reload APIs, runtime services, and server startup owners are reused. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | Bootstrap types, platform authorities, selected runtime adapters, process lifetime, and atomic pack utilities have coherent owners. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | Host-neutral bootstrap is tight; host-specific providers adapt to it without parallel application models or new manifest flags. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Composition, readiness, lifecycle, and development-session coordination each has a single owner. The two findings are incomplete local lifecycle policy, not duplicated ownership. | Complete those owners per `CR-001`/`CR-002`. |
| Empty indirection check (no pass-through-only boundary) | Pass | New coordinator/provider/composition boundaries own selection, normalization, lifecycle, or host translation. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Frontend bootstrap, server composition, selection, readiness, CLI, packing, and process lifetime stay separated. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | App source imports the frontend SDK only; devkit calls the narrow public server host surface; routes depend on composition-owned services. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | No changed caller was found depending simultaneously on a public composition/service boundary and one of its owned internals. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | Changed files are placed under contracts/bootstrap, server composition/readiness, devkit development/commands, or maintained application sources according to ownership. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | New folders correspond to real composition, startup, selection, readiness, or development concerns; no artificial one-line layer chain was found. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | Public `startStandaloneApplicationHost`, runtime bootstrap, explicit selection, and command inputs have narrow subjects and explicit IDs/roots. | None. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | Current symbols are natural and unversioned; provider/session/composition names describe concrete roles. A few narrow composition port casts are locally less expressive but not ambiguous. | Prefer typed port adapters over casts when next touching those seams. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Shared startup/runtime contracts and authorities replace hosted/standalone duplication; maintained apps use the common pack owner. | None. |
| Patch-on-patch complexity control | Pass | The implementation is a clean-cut replacement with explicit composition roots rather than layers of compatibility patches. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Hosted-only APIs, mock product paths, custom builders, vendor/source mirrors, and suffixed current-contract identifiers are absent from production scope. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Existing focused tests prove contracts, SDK providers, pack/config, and much server behavior, but no durable scenario proves the two new DS-006 lifecycle obligations exposed by `CR-001`/`CR-002`. | Implementation fixes source; API/E2E later owns durable scenario validity and additions. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Changed unit fixtures are boundary-focused and no incoherent test-only framework was added. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | No new compatibility-only tests were added. Two unchanged REST files with six obsolete registrar expectations are explicitly identified for downstream API/E2E validity handling. | API/E2E must decide and durably update/remove those assertions before pass. |
| API/E2E readiness for the next workflow stage | Fail | The production-reachable `pnpm dev`/`dev:studio` paths cannot yet satisfy AC-011 under supported changes. | Resolve `CR-001` and `CR-002`, then repeat source review before API/E2E. |

## Source File Size And Structure Audit (If Applicable)

Mechanical scan covered 106 changed implementation-source files (`.ts`, `.js`, `.mjs`, `.vue`), excluding tests, fixtures, generated `dist`, dependencies, and ticket artifacts. No changed implementation source exceeds 500 effective non-empty lines. The rows below include every file over 220 effective lines plus every file whose changed-line delta exceeds 220; the remaining 91 files are summarized in the final row.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | 492 | Pass | Pass (42 delta) | Cohesive existing application-engine host owner | Pass | Accept; close to limit but this patch reduces/churns little | Avoid unrelated growth. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | 463 | Pass | Pass (96 delta) | Cohesive existing orchestration owner | Pass | Accept; net simplification | None. |
| `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts` | 440 | Pass | Pass (14 delta) | Current manifest validation subject remains coherent | Pass | Accept | None. |
| `applications/socratic-math-teacher/frontend-src/socratic-renderer.js` | 404 | Pass | Pass (34 delta) | Application renderer concern | Pass | Accept; maintained app source | None. |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | 398 | Pass | Pass (28 delta) | File-provider owner | Pass | Accept | None. |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | 397 | Pass | Pass (24 delta) | File-provider owner | Pass | Accept | None. |
| `applications/socratic-math-teacher/frontend-src/socratic-runtime.js` | 395 | Pass | Pass (10 delta) | Application runtime concern | Pass | Accept | None. |
| `autobyteus-application-sdk-contracts/src/index.ts` | 339 | Pass | Pass (18 delta) | Public contract barrel | Pass | Accept for current package scale | None. |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-observer-service.ts` | 314 | Pass | Pass (6 delta) | Run observation owner | Pass | Accept | None. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | 294 | Pass | Pass (8 delta) | Application presentation/mount surface | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-orchestration/services/application-availability-service.ts` | 286 | Pass | Pass (34 delta) | Availability policy owner | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-agent-communication/services/application-agent-communication-session.ts` | 276 | Pass | Pass (4 delta) | Communication session owner | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-dispatch-service.ts` | 223 | Pass | Pass (15 delta) | Execution-event dispatch owner | Pass | Accept | None. |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | 222 | Pass | Pass (74 delta) | One iframe contract subject | Pass | Accept | None. |
| `autobyteus-server-ts/src/server-runtime.ts` | 154 | Pass | Triggered (303 delta) | Now a smaller composition facade rather than a mixed runtime container | Pass | Pass after manual review; refactor reduces responsibility | None. |
| Remaining 91 changed implementation-source files | <=220 each | Pass | Pass (<=220 delta each) | No responsibility overload found | Pass | Accept | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Clean current-contract replacements; no aliases, dual parsing, or compatibility wrapper. |
| No legacy old-behavior retention in changed scope | Pass | Hosted startup and product mock/custom-builder paths are removed. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Searches found no production occurrences of removed hosted APIs, version-suffixed current symbols, custom app builders, or generated SDK mirrors. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Existing current data/package formats remain directly usable; isolated roots use current migrations only. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Serialized version values remain current protocol data; runtime code identifiers are unversioned. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Design decision was no new migration; implementation adds none. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: public application startup and native command semantics changed, hosted/mock instructions were removed, and real standalone/Studio development plus build-free start must remain accurately documented.
- Files or areas likely affected: devkit README/starter README and scripts, server/frontend SDK documentation, custom-app guide, Studio iframe contract documentation, and Brief/Socratic project documentation. Implementation changed these areas; delivery must verify final integrated documentation after source fixes.

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| `MP-AR-001` | Confirmed | Both compositions preserve the refreshed-base runtime prerequisites and explicit lifecycle owners. |
| `MP-AR-005` | Confirmed | Starter, Brief, and Socratic now enter the shared devkit pack/config command path. |

### `MP-CR-001` — standalone development must reload the active browser document after a successful watched restart

- Origin: `New`
- Related approved requirement or established contract: `REQ-006`, `AC-011`, and the explicit DS-006 standalone terminal path.
- Relevant behavior ID(s): `BEH-006`; `UC-015`.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a developer uses the application-folder `pnpm dev` product surface and saves a watched application source file.
- Support evidence: `requirements.md` AC-011 and `design-spec.md` DS-006 explicitly define watched standalone rebuild/restart followed by browser full reload.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `pnpm dev` -> `runStandaloneDevelopmentSession` -> `watchApplicationProject` change callback -> close current host -> atomic pack -> start new real host -> `openDevelopmentBrowser(url)`.
- Lifecycle preconditions and material consequence at the claimed point: the old browser document was loaded from the just-closed host. After the new host is ready, no implementation owner instructs that document to reload; OS URL dispatch is not an explicit document-reload lifecycle. The active app is therefore not deterministically remounted on the rebuilt host, and repeated changes can dispatch repeated opens.
- Reachability: `Reachable`
- Review consequence / proportionate response: source-review finding `CR-001`; bounded implementation correction in the devkit development session/browser interaction owner.

### `MP-CR-002` — explicitly watched project configuration and manifest changes must update the live development session's resolved inputs and identity

- Origin: `New`
- Related approved requirement or established contract: `REQ-006`, `AC-011`, and DS-006's resolved-input/config watch contract.
- Relevant behavior ID(s): `BEH-006`; `UC-015`.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: while `pnpm dev` or `pnpm dev:studio` is running, a developer edits the checked-in `autobyteus-app.config.mjs` source mapping or the explicitly watched `application.json`, then edits/uses the newly resolved application input.
- Support evidence: `design-spec.md` lines 231-232 and 279 name resolved-input/config watching; AC-011 requires both commands to watch resolved application inputs. These are application-project authoring surfaces, not hidden runtime state.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: command -> session's one-time config/manifest resolution -> `watchApplicationProject` one-time `watchPaths` -> config/manifest change callback -> atomic pack reloads current config/manifest -> session continues with the initial watcher subscriptions and initial manifest/package selection values -> later newly mapped input change is not observed, or host/Studio reload uses the old application identity/package root.
- Lifecycle preconditions and material consequence at the claimed point: the long-running session remains alive after the explicitly watched configuration change, but its watch and selection state no longer represents the current project. Supported edits can silently stop rebuilding the current inputs or fail/reload the wrong selection.
- Reachability: `Reachable`
- Review consequence / proportionate response: source-review finding `CR-002`; bounded re-resolution/resubscription correction inside devkit development-session/watch ownership.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.9`
- Overall score (`/100`): `89`
- Score calculation note: simple average of the ten mandatory categories; the failing categories and findings control the decision.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.8 | Major host/runtime spines are explicit and preserved. | DS-006's standalone terminal reload and long-running resolved-input lifecycle are missing (`MP-CR-001`, `MP-CR-002`). | Complete those two approved spine segments. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.2 | Composition, provider, selection, readiness, pack, and session owners are distinct; no boundary bypass found. | The development session owners do not yet own their full promised lifecycle. | Make reload and dynamic resolution explicit session-owned policy. |
| `3` | `API / Interface / Query / Command Clarity` | 9.0 | Startup/bootstrap, host, selection, and CLI inputs have narrow subjects and explicit identities. | A few narrow composition-port casts reduce type-level clarity. | Prefer typed adapters when revisiting those seams. |
| `4` | `Separation of Concerns and File Placement` | 9.1 | Files align with bootstrap, composition, readiness, command, packing, and application concerns. | Development lifecycle behavior is split across a session and stateless OS opener without a full reload owner. | Put deterministic reload coordination behind the development-session-owned boundary. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.0 | Host-neutral contracts and graph authorities are tight and reused; no parallel manifest/application model. | No material defect; score reflects a large new public contract surface requiring downstream proof. | Preserve the current tight shapes during fixes. |
| `6` | `Naming Quality and Local Readability` | 9.0 | Names generally identify concrete provider, composition, readiness, selection, and session roles. | Local casts and a stateless `openDevelopmentBrowser` name obscure that it does not reload an existing document. | Make the browser lifecycle contract explicit in naming/API. |
| `7` | `API/E2E Readiness` | 7.8 | Focused packages pass and the handoff clearly names broad remaining coverage. | Two reachable DS-006 product paths are incomplete, and no durable test currently proves them. | Fix source, re-review, then exercise live development/config/reload scenarios in API/E2E. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.4 | Dual-host startup/composition/readiness and production start closely match approved behavior. | Standalone reload is not deterministic and live sessions freeze initial config/manifest resolution (`CR-001`, `CR-002`). | Implement the exact AC-011 lifecycle. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Clean replacement removed hosted APIs, product mocks, custom builders, mirrors, vendor trees, and suffixed current symbols. | Only unchanged obsolete REST assertions remain for downstream test validity; no production legacy remains. | API/E2E should remove/update invalid assertions. |
| `10` | `Cleanup Completeness` | 9.1 | Production cleanup and regenerated package outputs are comprehensive; diff check is clean. | Docs/final integrated coverage still need downstream verification. | Preserve cleanup during local fixes and complete downstream verification. |

## Findings

### `CR-001` — Standalone watch rebuild dispatches the URL but never owns the required browser full reload

- Status: `Open`
- Severity: `Major`
- Confidence: `High`
- Classification: `Local Fix`
- Affected behavior/requirement: `BEH-006`, `UC-015`, `REQ-006`, `AC-011`, DS-006.
- Material premise: `MP-CR-001` (`Reachable`).
- Evidence: `autobyteus-application-devkit/src/development/standalone-development-session.ts:27-50` closes, repacks, starts, then calls `openDevelopmentBrowser` after both the initial start and every change. `autobyteus-application-devkit/src/development/open-development-browser.ts:3-14` only spawns the platform URL opener (`open`, `xdg-open`, or `cmd start`) and retains no browser/document session or reload channel.
- Consequence: the supported save/rebuild path cannot guarantee AC-011's browser full reload after the new host is ready; the old document remains stale unless external browser heuristics happen to reload/reuse it, and repeated rebuilds can dispatch repeated opens.
- Required action: open/establish the development browser once, then make the standalone development-session owner explicitly trigger a full reload of the active application document only after successful host restart (or use another design-compliant deterministic reload boundary). Do not add host-specific application-source behavior or a mock path. Add implementation-scoped evidence suitable for source re-review; durable broad scenario coverage remains API/E2E-owned.

### `CR-002` — Development sessions freeze initial watch/config/manifest resolution despite watching those files

- Status: `Open`
- Severity: `Moderate`
- Confidence: `High`
- Classification: `Local Fix`
- Affected behavior/requirement: `BEH-006`, `UC-015`, `REQ-006`, `AC-011`, DS-006.
- Material premise: `MP-CR-002` (`Reachable`).
- Evidence: `autobyteus-application-devkit/src/development/application-project-watch.ts:9-19,47-48` loads config once and creates a fixed watch subscription. `standalone-development-session.ts:25,35` freezes the initial manifest ID. `studio-development-session.ts:14-20,27-28` freezes the initial configured package root, manifest ID, and selected application across subsequent rebuilds. Atomic packing reloads current config/manifest, so the package can change while session subscriptions/selection remain stale.
- Consequence: an explicitly watched config or manifest edit can leave the long-running session observing old directories or restarting/reloading an old identity/root; a subsequent edit under a newly mapped source directory is not observed.
- Required action: when config/manifest changes, re-resolve the effective input set and dependent session values, safely replace/update watcher subscriptions (or restart the session under one owner), and update standalone/Studio package/selection state as required. Preserve atomic pack, real host delegation, and current explicit Studio reload authority. Add focused implementation-scoped checks; API/E2E owns durable live coverage after source review passes.

## Classification

- `Local Fix` — both findings are bounded defects in implementation-owned devkit source. Approved behavior, owners, and architecture remain sufficient; no solution-design or requirements change is required.

## Recommended Recipient

- `implementation_engineer`
- After correction: return through implementation-source review, then API/E2E.

## Residual Risks

- Two unchanged REST test files contain six assertions for the removed broad implicit registrar and currently report old-boundary 404/500 results. API/E2E must perform the recorded current-behavior validity decision and durable update/removal after source review passes.
- Concurrent graph isolation, live `dev:studio`, immutable dual-host digest proof, real Brief team execution, worker recovery, and long-running leak/cleanup coverage remain appropriately assigned to API/E2E.
- These residuals do not change the current failure classification; `CR-001` and `CR-002` independently block next-stage readiness.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — both finding premises have independent supported triggers and complete forward production paths.
- Score Summary: `8.9/10` (`89/100`); categories 1, 7, and 8 are below the clean-pass threshold.
- Failure Origin (when applicable): `N/A` — source-review defects, not API/E2E failure-origin analysis.
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: resolve `CR-001` and `CR-002`, append a new implementation revision, and return the cumulative package for source re-review. Do not advance to API/E2E yet.
