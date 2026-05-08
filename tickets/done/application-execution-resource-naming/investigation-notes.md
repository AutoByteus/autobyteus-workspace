# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Requirement/design correction applied after API/E2E reported a user clarification: no old-shape public or private persisted-data migration is allowed.
- Investigation Goal: Bootstrap a focused refactor ticket to replace confusing `ApplicationRuntimeResource*` naming with clearer application execution resource terminology.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: Public SDK contracts, manifests, orchestration services, stores, first-party apps, docs, tests, and generated outputs may all be touched.
- Scope Summary: Rename the app-selectable agent/team resource concept so it does not conflict with runtime control, application backend runtime, runtime kind, run lifecycle, or future runtime streams.
- Primary Questions To Resolve:
  - Is `ApplicationExecutionResource` the final target name, or should the design choose `ApplicationAgentResource`, `ApplicationAutomationResource`, or another more precise name?
  - Should `owner: "bundle" | "shared"` become `source` or `scope`?
  - Does changing manifest JSON fields require a manifest contract version bump?
  - Should runtime-control method names change too, or only types/services/docs?
  - What is the correct destructive/reset behavior for stale local platform state after rejecting migration?

## Request Context

The user inspected the current SDK contract:

```ts
export type ApplicationRuntimeResourceKind = "AGENT" | "AGENT_TEAM";
export type ApplicationRuntimeResourceOwner = "bundle" | "shared";
export type ApplicationRuntimeResourceRef = ...
```

They observed that `runtime resource` feels bizarre because it really means agent/team resources available to an application, while `runtime` elsewhere means many other things. This follows the earlier backend-notification naming cleanup that landed on `personal`; the user wants another ticket to keep application framework naming clear.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming`.
- Current Branch: `codex/application-execution-resource-naming`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-05-08; `origin/personal` resolved to `7738faa4956cd9925825e24baae77bb1a47a81a4` (`chore(release): bump workspace release version to 1.3.0`).
- Task Branch: `codex/application-execution-resource-naming` tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The worktree was created directly from latest `origin/personal`, not from another ticket branch. The previous backend notification stream rename is already present in this baseline.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-08 | Team Message / Requirement Clarification | API/E2E engineer message reporting user clarification that no migration/backward-compatible code should exist, including private persisted-store migration. | Resolve requirement gap after validation found migration code/tests based on earlier design. | Requirements and design must explicitly reject old-shape readers/rewriters/migrations; implementation must remove `migrateOwnerToSource`, `normalizeStoredExecutionResourceRef`, `migrateRunBindingSummaryJson`, and migration tests. | Yes — implementation rework and revalidation. |
| 2026-05-08 | Code Review Artifact | `tickets/done/application-execution-resource-naming/review-report.md` Round 4 | Read authoritative blocker classification. | Review decision is `Fail / Blocked`; classification `Requirement Gap` with `Design Impact`; old private migration behavior invalidates delivery. | Yes — upstream artifacts corrected and implementation rerouted. |
| 2026-05-08 | Delivery Artifact | `tickets/done/application-execution-resource-naming/delivery-blocker-reroute.md` | Confirm delivery state and required re-entry path. | Delivery is paused; no finalization performed; required flow is solution design -> implementation -> API/E2E -> code review -> delivery. | Yes — include blocker artifact in downstream package. |
| 2026-05-08 | Command | `rg -n "migrateOwnerToSource|normalizeStoredExecutionResourceRef|migrateRunBindingSummaryJson|resourceRef|owner" ...` | Verify incompatible implementation/test paths named by downstream reviewers. | Confirmed migration helpers/tests still exist in store files and `application-execution-resource-store-migrations.test.ts`; API/E2E report contains migration pass evidence that is now superseded. | Yes — implementation must remove/replace. |
| 2026-05-08 | Command | `pwd`; `git status --short --branch`; `git fetch origin personal`; `git rev-parse origin/personal`; `git log -1 --oneline origin/personal` | Resolve repo and latest base branch. | Main repo on `personal`; latest `origin/personal` at `7738faa4` release bump. | No |
| 2026-05-08 | Command | `git worktree add -b codex/application-execution-resource-naming /Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming origin/personal` | Create dedicated ticket worktree from latest base. | Worktree created and tracks `origin/personal`. | No |
| 2026-05-08 | Command | `git status --short --branch`; `git fetch origin personal`; `git rev-parse HEAD origin/personal`; `git log -1 --oneline HEAD` from the ticket worktree | Verify branch freshness before design. | Ticket branch still equals latest `origin/personal` at `7738faa4`; only untracked ticket artifacts are present. | No |
| 2026-05-08 | Code | `autobyteus-application-sdk-contracts/src/runtime-resources.ts:1-80` | Inspect current resource contract. | Defines `ApplicationRuntimeResourceKind`, `ApplicationRuntimeResourceOwner`, `ApplicationRuntimeResourceRef`, `ApplicationRuntimeResourceSummary`, configured launch profiles, and `ApplicationConfiguredResource`. Kinds are only `AGENT` / `AGENT_TEAM`. | Yes — design target naming. |
| 2026-05-08 | Code | `autobyteus-application-sdk-contracts/src/manifests.ts:1-60` | Inspect manifest resource slot contract. | `ApplicationResourceSlotDeclaration` uses `allowedResourceKinds`, `allowedResourceOwners`, and `defaultResourceRef`. | Yes — assess manifest version impact. |
| 2026-05-08 | Code | `autobyteus-application-sdk-contracts/src/index.ts:120-285` | Inspect start-run, run binding, runtime control, and handler context references. | `ApplicationStartRunInput.resourceRef`, `ApplicationRunBindingSummary.resourceRef`, and `ApplicationRuntimeControl.listAvailableResources` use runtime-resource types. | Yes |
| 2026-05-08 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts`; `application-run-binding-launch-service.ts`; `application-resource-configuration-service.ts`; `application-resource-configuration-launch-profile.ts`; stores | Identify internal owner/file blast radius. | Resolver/service/store naming and errors use `ApplicationRuntimeResource*`, `runtime resource`, `owner`, and `resourceRef`. | Yes |
| 2026-05-08 | Doc | `autobyteus-server-ts/docs/modules/applications.md`; `autobyteus-server-ts/docs/modules/application_orchestration.md` | Inspect current docs language. | Docs mention bundled runtime resources, runtime-control boundary, concrete `resourceRef`, and `resourceSlots[]`. | Yes — update docs in implementation. |
| 2026-05-08 | Code/Data | `applications/brief-studio/application.json`; `applications/socratic-math-teacher/application.json`; backend services | Inspect first-party app usage. | First-party manifests declare `resourceSlots`, `allowedResourceKinds`, `allowedResourceOwners`, and `defaultResourceRef`; backends pass configured `resourceRef` into start-run flows. | Yes |
| 2026-05-08 | Code | Search for backend notification rename baseline: `rg -n "ApplicationBackendNotificationStreamService|ApplicationNotificationStreamService|application-backend-notification-stream-service|application-notification-stream-service" ...` | Verify previous naming refactor has landed on `personal`. | Current baseline uses `ApplicationBackendNotificationStreamService`; no old service name found in active source search results. | No |

## Current Behavior / Current Flow

### Resource declaration and setup

1. Application bundle manifest may declare `resourceSlots[]`.
2. Each slot declares allowed resource kinds and allowed owners/sources.
3. Host setup can configure a concrete `resourceRef` for the slot.
4. Configurations are persisted by application resource configuration stores.

### Resource resolution and launch

1. App backend gets a configured resource through `context.runtimeControl.getConfiguredResource(slotKey)` or lists resources through `listAvailableResources(...)`.
2. App backend calls `context.runtimeControl.startRun({ bindingIntentId, resourceRef, launch, initialInput })`.
3. `ApplicationRunBindingLaunchService` resolves the resource through `ApplicationRuntimeResourceResolver`.
4. It validates launch kind against resource kind and creates an app-bound agent/team run binding.
5. `ApplicationRunBindingSummary` records `resourceRef` plus runtime run details.

### Naming observations

- The concept called `ApplicationRuntimeResource` is a selectable agent/team definition, not a generic runtime.
- The discriminator called `owner` is `bundle` or `shared`; these values describe source/scope more naturally than architectural ownership.
- `runtimeKind` is also used inside launch profiles to mean provider/runtime backend kind, increasing ambiguity.
- Future runtime-stream work will add another runtime concept, so leaving this name broad increases confusion.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Naming Refactor / Cleanup.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Shared Structure Looseness.
- Refactor posture evidence summary: The name `ApplicationRuntimeResource` does not match its concrete subject (`AGENT` / `AGENT_TEAM` selectable execution resources). `owner` does not match `bundle`/`shared` semantics. A clean naming refactor should happen before more runtime-related APIs are added.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `runtime-resources.ts` | Kind union is only `AGENT` / `AGENT_TEAM`. | `ExecutionResource` or agent/team resource wording would better match the subject. | Choose target name. |
| `manifests.ts` | Slots use `allowedResourceOwners` with `bundle` / `shared`. | `owner` likely should become `source` or `scope`. | Decide manifest replacement/versioning with old-shape rejection. |
| `index.ts` runtime control | `listAvailableResources` returns runtime-resource summary. | Method names may remain generic or be renamed for clarity. | Design decision. |
| Orchestration services | Resolver and errors use runtime resource wording. | Internal file/class names should align with public concept. | Rename across services/tests. |
| Docs | Applications docs say bundled runtime resources and runtime-control boundary. | Docs need terminology cleanup and distinction from runtime stream. | Update docs. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/runtime-resources.ts` | Public resource/launch configuration contract. | Main source of confusing `ApplicationRuntimeResource*` types. | Primary public rename target. |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Public app manifest contract. | Uses runtime-resource types and owner fields. | Requires manifest field rename/version decision with old-shape rejection/reset behavior, not compatibility. |
| `autobyteus-application-sdk-contracts/src/index.ts` | Public exported app SDK contract aggregation. | Exports runtime-resource types and uses them in start-run/runtime-control/run-binding types. | Update exports and dependent types. |
| `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts` | Resolves bundle/shared agent/team resources. | Internal service name mirrors confusing public concept. | Rename to execution-resource resolver. |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Starts app-bound runs using selected resource. | Uses runtime-resource ref and resolver. | Update naming while preserving behavior. |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | Validates/persists resource slot selections. | Uses `allowedResourceOwners`, `resourceRef.owner`, and error text “runtime resource.” | Update naming and error text. |
| `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts` | Persists configured resource refs. | Stores serialized `resource_ref_json`. | No storage migration allowed; stale old JSON must be reset/rejected/dropped. |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts` | Persists run binding selected resource columns. | Normalizes `owner`, `kind`, `localId`, `definitionId`. | DB/private storage must not migrate old JSON; physical column renames are optional but old public shapes are rejected. |
| `applications/brief-studio/application.json` | First-party app manifest. | Uses current resource slot fields. | Update if manifest JSON changes. |
| `applications/socratic-math-teacher/application.json` | First-party app manifest. | Uses current resource slot fields. | Update if manifest JSON changes. |
| `autobyteus-server-ts/docs/modules/applications.md` | Application bundle docs. | Uses “runtime resources.” | Update terminology. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Orchestration docs. | Describes runtime resources and resource refs. | Update terminology and clarify runtime-control relation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-08 | Probe | `sed -n '1,130p' autobyteus-application-sdk-contracts/src/runtime-resources.ts` | `ApplicationRuntimeResourceKind` only allows `AGENT` / `AGENT_TEAM`; `owner` only allows `bundle` / `shared`. | Confirms naming mismatch. |
| 2026-05-08 | Probe | `sed -n '1,80p' autobyteus-application-sdk-contracts/src/manifests.ts` | Manifest resource slots use runtime-resource types and owner/default resource ref fields. | Public manifest old-shape rejection/version handling is in scope; migration is not allowed. |
| 2026-05-08 | Probe | `sed -n '120,285p' autobyteus-application-sdk-contracts/src/index.ts` | Start-run input, run binding summary, and runtime-control list methods expose current names. | Public SDK rename blast radius. |
| 2026-05-08 | Probe | `rg -n "ApplicationRuntimeResource|RuntimeResource|runtime resource|runtime resources|resourceSlots|allowedResourceKinds|allowedResourceOwners|defaultResourceRef|resourceRef" ...` | Active usages span SDK, orchestration, docs, and first-party apps. | Scope is large naming refactor. |

## External / Public Source Findings

No external/public sources consulted. This is an internal platform naming/refactor ticket based on repository evidence and user architectural feedback.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for bootstrap.
- Required config, feature flags, env vars, or accounts: None for bootstrap.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add -b codex/application-execution-resource-naming /Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming origin/personal`
- Cleanup notes for temporary investigation-only setup: No temporary setup created beyond the dedicated worktree.

## Findings From Code / Docs / Data / Logs

- The current `ApplicationRuntimeResource*` naming is broader than the represented subject.
- The represented subject is a selectable app execution resource whose current kinds are `AGENT` and `AGENT_TEAM`.
- The `owner` discriminator likely conflates source/scope with ownership.
- Current resource selection participates in manifest setup, configuration persistence, run binding launch, and runtime-control APIs.
- This naming should be clarified before future application runtime streaming work adds more runtime terminology.
- API/E2E found implementation-level migration code that accepted old persisted shapes; this is now explicitly out of scope and must be removed.

## Constraints / Dependencies / Compatibility Facts

- Public SDK and manifest changes are breaking and must be clean-cut.
- Stored resource refs may exist in app configuration DBs and run binding stores as serialized JSON/columns, but old shapes must not be migrated or accepted by active code; stale local state should be rejected/reset/reconfigured.
- First-party apps and packaged/generated outputs likely need updates.
- No runtime behavior changes should be introduced.
- No runtime stream behavior should be introduced.

## Requirement Correction / Stale State Policy

After API/E2E and code review escalations, the upstream requirement is corrected: no migration means no public compatibility and no private persisted-store compatibility. The authoritative stale-state behavior for downstream implementation is:

- old manifest/API shapes fail validation;
- stale configured execution-resource rows are reset/removed and the slot becomes not configured;
- stale run-binding summary rows are dropped/ignored as unrecoverable old local state, or fail with an explicit stale-state reset error where deletion cannot safely occur;
- migration helpers such as `migrateOwnerToSource`, `normalizeStoredExecutionResourceRef`, and `migrateRunBindingSummaryJson` are invalid;
- migration tests must be removed or replaced with stale-state rejection/reset/drop tests.

## Open Unknowns / Risks

- Whether to rename manifest JSON fields in the current manifest version or bump manifest version.
- Whether `source` or `scope` is the correct replacement for `owner`.
- Whether runtime-control method names should be renamed, or whether type-level naming is sufficient.
- What explicit stale-state/reset behavior stores should use after old persisted shapes are rejected rather than migrated.
- Whether external SDK consumers need a release breakage/reset note.

## Notes For Architecture Reviewer

The main design decision is naming boundary, not behavior. My current recommendation is:

- `ApplicationRuntimeResource*` -> `ApplicationExecutionResource*`.
- `ApplicationRuntimeResourceOwner` -> `ApplicationExecutionResourceSource`.
- `owner` field -> `source`, if the team accepts a public manifest/SDK shape change.
- Keep `kind: "AGENT" | "AGENT_TEAM"`.
- Keep runtime-control behavior unchanged.
- Decide explicitly whether public manifest contract versioning is required.

This ticket is intentionally separate from application runtime streaming. It should reduce confusion before that future ticket proceeds.
