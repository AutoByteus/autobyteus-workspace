# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v2` (Round 1 re-entry: added UC-007, UC-008; clarified UC-005 idempotency)
- Requirements: `tickets/done/application-execution-resource-naming/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/done/application-execution-resource-naming/design-spec.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory: DS-001 through DS-005
  - Ownership map / File responsibility mapping / Decommission plan

## Future-State Modeling Rule

Model target design behavior even when current code diverges. If migration from as-is to to-be requires transition logic, describe that in Transition Notes. Every use case declares which spine(s) it exercises.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | Application execution resource configuration service | Requirement | FR-001, FR-003, FR-004 | N/A | Manifest execution resource slot clarity | Yes/Yes/Yes |
| UC-002 | DS-001, DS-002 | Primary End-to-End | Application orchestration host + execution resource configuration service | Requirement | FR-002, FR-005, FR-006 | N/A | Host setup selects and persists configured execution resource | Yes/Yes/Yes |
| UC-003 | DS-002, DS-003 | Primary End-to-End | Application run binding launch service + execution resource resolver | Requirement | FR-005, FR-006, FR-010 | N/A | App backend starts run using selected execution resource | Yes/Yes/Yes |
| UC-004 | DS-004 | Return/Event | Application run binding store / contracts | Requirement | FR-001, FR-003, FR-007 | N/A | Run binding summary exposes executionResourceRef terminology | Yes/N/A/Yes |
| UC-005 | DS-001,DS-004 | Bounded Local | Application execution resource configuration store + run binding store | Design-Risk | FR-008 | One-time idempotent migration from old owner/resourceRef JSON shape to new source/executionResourceRef shape without data loss | Storage migration from old to new JSON shape (idempotent) | Yes/Yes/Yes |
| UC-006 | DS-005 | Documentation/Positioning | SDK/docs owners | Requirement | FR-009 | N/A | Docs distinguish execution resources from runtime control and future runtime streams | Yes/N/A/N/A |
| UC-007 | DS-001,DS-002,DS-005 | Primary End-to-End | First-party app manifest + backend handler update | Requirement | FR-007 | N/A | First-party app manifest and backend handler migration to new execution-resource names | Yes/N/A/Yes |
| UC-008 | DS-005 | Bounded Local | Package build / dist regeneration | Design-Risk | FR-007 | Public SDK name change breaks first-party generated packages if dist is not regenerated — risk of stale old-name exports in built outputs | Package/dist regeneration succeeds with new execution-resource names | Yes/N/A/Yes |

## Transition Notes

- Current active public names (`ApplicationRuntimeResource*`, `owner`, `allowedResourceOwners`, `resourceRef`) are replaced by new names.
- One-time storage migration runs inside configuration store and run binding store initialization to transform old persisted JSON into new shape.
- After migration, only new in-memory/public shapes (`source`, `executionResourceRef`, `ApplicationExecutionResource*`) are active.
- No dual-shape/backward-compat paths remain after migration completes.

---

## Use Case: UC-001 — Manifest Execution Resource Slot Clarity

### Spine Context

- Spine ID(s): DS-001
- Spine Scope: Primary End-to-End
- Governing Owner: Application execution resource configuration service (manifest contract owned by SDK contracts)
- Why This Use Case Matters: The manifest slot is the public app-author entry point for declaring execution resource requirements. Wrong terminology here propagates to all downstream consumers.

### Goal

App author reads `application.json` and understands they are declaring required/optional execution resources (agent or agent team), not generic runtimes.

### Preconditions

- `autobyteus-application-sdk-contracts/src/execution-resources.ts` exports `ApplicationExecutionResourceKind`, `ApplicationExecutionResourceSource`, `ApplicationExecutionResourceRef`.
- `autobyteus-application-sdk-contracts/src/manifests.ts` defines `ApplicationExecutionResourceSlotDeclaration` using `executionResourceSlots`, `allowedExecutionResourceKinds`, `allowedExecutionResourceSources`, `defaultExecutionResourceRef`.

### Expected Outcome

TypeScript types and JSON fields clearly name the execution resource concept. `grep ApplicationRuntimeResource` finds no active source usage.

### Primary Runtime Call Stack

```text
# App bundle manifest is parsed by bundle manifest parser
[ENTRY] autobyteus-server-ts/src/application-bundles/services/application-bundle-manifest-service.ts:parseManifest(bundlePath)
├── autobyteus-application-sdk-contracts/src/manifests.ts:ApplicationManifest  # type check: executionResourceSlots[]
│   └── ApplicationExecutionResourceSlotDeclaration {
│         slotKey: string,
│         allowedExecutionResourceKinds: ApplicationExecutionResourceKind[],  # "AGENT" | "AGENT_TEAM"
│         allowedExecutionResourceSources: ApplicationExecutionResourceSource[],  # "bundle" | "shared"
│         defaultExecutionResourceRef?: ApplicationExecutionResourceRef
│       }
├── validates slot declarations against schema [IO]
└── returns ApplicationManifest with executionResourceSlots[] to caller
```

### Branching / Fallback Paths

```text
[ERROR] if manifest JSON uses old field names (allowedResourceOwners, resourceSlots)
autobyteus-server-ts/src/application-bundles/services/application-bundle-manifest-service.ts:parseManifest(...)
└── throws ManifestValidationError("Unknown field: allowedResourceOwners. Use allowedExecutionResourceSources.")
    # No fallback to old shape — clean-cut
```

```text
[ERROR] if slot declares unsupported kind
└── throws ManifestValidationError("Unsupported execution resource kind: ...")
```

### State And Data Transformations

- Raw `application.json` JSON → validated `ApplicationManifest` with `executionResourceSlots[]`
- `allowedExecutionResourceKinds` → `ApplicationExecutionResourceKind[]` (`"AGENT" | "AGENT_TEAM"`)
- `allowedExecutionResourceSources` → `ApplicationExecutionResourceSource[]` (`"bundle" | "shared"`)

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling or cyclic cross-subsystem dependency introduced? No
- Any naming-to-responsibility drift detected? No — `executionResourceSlots` names the concept precisely

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-002 — Host Setup Selects and Persists Configured Execution Resource

### Spine Context

- Spine ID(s): DS-001, DS-002
- Spine Scope: Primary End-to-End
- Governing Owner: Application execution resource configuration service
- Why This Use Case Matters: Host setup is where the bundle/shared discriminator (`source`) is used to identify the concrete execution resource. The old `owner` field was misleading here.

### Goal

Host administrator selects a bundle-local or shared agent/team execution resource for a slot. The selection is validated and persisted using `source` (not `owner`) terminology throughout.

### Preconditions

- `ApplicationExecutionResourceConfigurationService` accepts `ApplicationExecutionResourceRef` with `source` discriminator.
- Host setup API routes pass `executionResourceRef` in request body.

### Expected Outcome

Configured execution resource persisted in store with `source` field. No `owner` field anywhere in active code or persisted JSON.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/application-bundles/routes/application-resource-configuration-routes.ts:handleConfigureExecutionResource(req)
├── extracts { applicationId, slotKey, executionResourceRef: { source, kind, localId|definitionId } } from req.body
├── autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts:configureExecutionResource(applicationId, slotKey, executionResourceRef, launchProfile)
│   ├── validates slotKey against manifest executionResourceSlots[]  # ensure slot exists
│   ├── validates executionResourceRef.source is in allowedExecutionResourceSources
│   ├── validates executionResourceRef.kind is in allowedExecutionResourceKinds
│   ├── autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-launch-profile.ts:validateLaunchProfile(launchProfile, kind)
│   │   └── returns validated launch profile
│   ├── autobyteus-server-ts/src/application-orchestration/stores/application-execution-resource-configuration-store.ts:saveConfiguration(applicationId, slotKey, executionResourceRef, launchProfile) [IO]
│   │   └── serializes executionResourceRef as { source, kind, localId|definitionId } JSON [STATE]
│   └── returns ApplicationConfiguredExecutionResource
└── responds 200 OK with configured execution resource summary
```

### Branching / Fallback Paths

```text
[ERROR] if slotKey not found in manifest executionResourceSlots
application-execution-resource-configuration-service.ts:configureExecutionResource(...)
└── throws ExecutionResourceConfigurationError("Slot not declared in manifest: <slotKey>")
```

```text
[ERROR] if source not in allowedExecutionResourceSources
└── throws ExecutionResourceConfigurationError("Source 'shared' not allowed for slot <slotKey>")
```

```text
[FALLBACK] list available execution resources for host setup UI
[ENTRY] application-resource-configuration-routes.ts:handleListAvailableExecutionResources(req)
└── application-execution-resource-configuration-service.ts:listAvailableExecutionResources(applicationId, slotKey, filters?)
    └── application-execution-resource-resolver.ts:resolveAvailable(source?, kind?) [calls DS-003 bounded local spine]
        └── returns ApplicationExecutionResourceSummary[]
```

### State And Data Transformations

- `{ source, kind, localId }` (bundle ref) or `{ source, kind, definitionId }` (shared ref) → persisted as JSON in configuration store
- No `owner` field anywhere in active in-memory or stored shape

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling? No — config service owns slot validation, resolver owns listing
- Any naming drift? No — `source` correctly names `bundle`/`shared` discriminator

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-003 — App Backend Starts Run Using Selected Execution Resource

### Spine Context

- Spine ID(s): DS-002, DS-003
- Spine Scope: Primary End-to-End
- Governing Owner: Application run binding launch service + execution resource resolver
- Why This Use Case Matters: This is where `runtimeControl.startRun({ executionResourceRef })` triggers the full orchestration. Method naming and parameter naming must clearly say "execution resource," not "runtime resource."

### Goal

App backend handler calls `context.runtimeControl.startRun({ executionResourceRef, ... })`. Orchestration resolves the correct agent/team definition and creates an app-bound run binding.

### Preconditions

- `ApplicationRuntimeControl.listAvailableExecutionResources`, `getConfiguredExecutionResource`, `startRun` are available.
- `ApplicationStartRunInput.executionResourceRef` is typed as `ApplicationExecutionResourceRef`.
- Resolver and launch service use new names.

### Expected Outcome

Run binding created with `executionResourceRef` in summary. Agent/team run starts correctly. Old method names `listAvailableResources`/`getConfiguredResource` are gone.

### Primary Runtime Call Stack

```text
# App backend handler invokes runtime control
[ENTRY] applications/brief-studio/backend/src/handlers/some-handler.ts:handleRequest(context)
├── context.runtimeControl.getConfiguredExecutionResource("writing-team-slot")
│   └── autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts:getConfiguredExecutionResource(applicationId, slotKey)
│       └── application-execution-resource-configuration-service.ts:getConfiguredExecutionResource(applicationId, slotKey) [IO]
│           └── application-execution-resource-configuration-store.ts:loadConfiguration(applicationId, slotKey)
│               └── returns ApplicationConfiguredExecutionResource { executionResourceRef: { source, kind, localId|definitionId }, launchProfile }
├── context.runtimeControl.startRun({ bindingIntentId, executionResourceRef, launch, initialInput })
│   └── application-orchestration-host-service.ts:startRun(applicationId, input)
│       ├── application-run-binding-launch-service.ts:launch(applicationId, bindingIntentId, executionResourceRef, launchProfile, initialInput)
│       │   ├── application-execution-resource-resolver.ts:resolveExecutionResource(executionResourceRef) [DS-003 bounded local]
│       │   │   ├── if source === "bundle": queries bundle agent/team definition by localId [IO]
│       │   │   └── if source === "shared": queries shared agent/team definition by definitionId [IO]
│       │   │       └── returns ApplicationExecutionResourceSummary { source, kind, name, id }
│       │   ├── validates launch kind against executionResourceRef.kind
│       │   ├── if kind === "AGENT": AgentRunService.startRun(agentDefinitionId, launchProfile, initialInput) [ASYNC]
│       │   └── if kind === "AGENT_TEAM": TeamRunService.startRun(teamDefinitionId, launchProfile, initialInput) [ASYNC]
│       │       └── returns runId
│       └── application-run-binding-store.ts:saveBinding(applicationId, bindingIntentId, executionResourceRef, runId) [IO]
│           └── persists ApplicationRunBindingSummary { executionResourceRef, runId, ... } [STATE]
└── returns { bindingIntentId, runId } to handler
```

### Branching / Fallback Paths

```text
[ERROR] executionResourceRef.source === "bundle" but localId not found in bundle
application-execution-resource-resolver.ts:resolveExecutionResource(...)
└── throws ExecutionResourceResolutionError("Bundle execution resource not found: <localId>")
```

```text
[ERROR] launch kind mismatch (ref.kind = "AGENT" but launchProfile requires team)
application-run-binding-launch-service.ts:launch(...)
└── throws ExecutionResourceLaunchError("Launch profile kind mismatch for execution resource <id>")
```

```text
[FALLBACK] app backend lists available resources before selecting
context.runtimeControl.listAvailableExecutionResources({ source?: "bundle"|"shared", kind?: "AGENT"|"AGENT_TEAM" })
└── application-orchestration-host-service.ts:listAvailableExecutionResources(applicationId, filters)
    └── application-execution-resource-resolver.ts:listAvailable(filters)
        ├── lists bundle agents/teams matching source/kind filters [IO]
        └── lists shared agents/teams matching source/kind filters [IO]
            └── returns ApplicationExecutionResourceSummary[]
```

### State And Data Transformations

- `ApplicationExecutionResourceRef { source, kind, localId|definitionId }` → resolver fetches agent/team definition
- Agent/team definition → agent/team run binding with `executionResourceRef` in summary

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No — `listAvailableResources`/`getConfiguredResource` are gone
- Any tight coupling? No — resolver owns lookup; launch service owns binding
- Any naming drift? No

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-004 — Run Binding Summary Exposes executionResourceRef Terminology

### Spine Context

- Spine ID(s): DS-004
- Spine Scope: Return/Event
- Governing Owner: Application run binding store / contracts
- Why This Use Case Matters: Run binding summaries are surfaced via lifecycle callbacks and artifact queries. Old `resourceRef` wording must be gone from these payloads.

### Goal

When a run binding is created or queried, its summary exposes `executionResourceRef` (not `resourceRef`) with `source` (not `owner`) in the ref shape.

### Preconditions

- `ApplicationRunBindingSummary.executionResourceRef` typed as `ApplicationExecutionResourceRef`.
- Binding store serializes/deserializes `executionResourceRef`.

### Expected Outcome

Lifecycle event and artifact payloads contain `executionResourceRef: { source, kind, ... }`. Old `resourceRef` / `owner` fields absent.

### Primary Runtime Call Stack

```text
# Binding summary read (query or lifecycle callback)
[ENTRY] autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts:loadBindingSummary(applicationId, bindingIntentId) [IO]
├── reads persisted row: { execution_resource_source, execution_resource_kind, execution_resource_local_id | execution_resource_definition_id, run_id, ... }
├── hydrates ApplicationRunBindingSummary {
│     bindingIntentId,
│     executionResourceRef: { source, kind, localId|definitionId },  # ApplicationExecutionResourceRef
│     runId,
│     status,
│     ...
│   } [STATE]
└── returns ApplicationRunBindingSummary to caller (lifecycle observer / artifact resolver)
```

```text
# Lifecycle callback path
[ENTRY] autobyteus-server-ts/src/application-orchestration/services/application-run-lifecycle-observer.ts:onRunStateChange(runId, state)
├── application-run-binding-store.ts:findBindingByRunId(runId) [IO]
│   └── returns ApplicationRunBindingSummary with executionResourceRef
└── fires ApplicationRunBindingLifecycleEvent { bindingSummary: { executionResourceRef, ... } }
    └── [ASYNC] delivered to registered observers/stream handlers
```

### Branching / Fallback Paths

```text
[ERROR] binding not found for bindingIntentId
application-run-binding-store.ts:loadBindingSummary(...)
└── throws RunBindingNotFoundError("No binding for intent: <bindingIntentId>")
```

### State And Data Transformations

- DB columns `execution_resource_source`, `execution_resource_kind`, `execution_resource_local_id|definition_id` → `ApplicationExecutionResourceRef`
- Old columns (`resource_ref_owner`, `resource_ref_json`) absent after migration

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No — storage migration ensures old columns are gone or isolated as private storage detail
- Any tight coupling? No
- Any naming drift? No

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-005 — Storage Migration from Old to New JSON Shape

### Spine Context

- Spine ID(s): DS-001 (config store), DS-004 (binding store)
- Spine Scope: Bounded Local
- Governing Owner: Application execution resource configuration store + application run binding store
- Why This Use Case Matters: Existing local DBs may contain persisted `{ owner: "bundle", ... }` JSON. Without migration, old and new shapes coexist, which is forbidden by the design (no dual-shape paths). This migration must complete before the store exposes any data through the new public API.

### Goal

On store initialization, detect and migrate any persisted `resourceRef.owner` / `allowedResourceOwners` JSON to `executionResourceRef.source` / `allowedExecutionResourceSources` shape. After migration, only new shapes exist in the active in-memory/public layer.

### Preconditions

- Store initialization runs before any read/write of configuration or binding data.
- Migration helper can parse old JSON shape and emit new shape.

### Expected Outcome

After store init, all rows expose `source`-based refs. No `owner` field in any active store output. Migration is idempotent (safe to run twice).

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/application-orchestration/stores/application-execution-resource-configuration-store.ts:initialize() [IO]
├── ensureTablesExist() [IO]
├── detectOldSchemaRows() → count of rows with old JSON shape
│   └── SELECT COUNT(*) WHERE json_column LIKE '%"owner"%' [IO]
├── if count > 0:
│   └── migrateOldExecutionResourceRows()
│       ├── SELECT all rows with old shape [IO]
│       ├── for each row:
│       │   ├── parseOldResourceRefJson(row) → { owner, kind, localId|definitionId }
│       │   ├── transformToNewShape({ source: owner, kind, localId|definitionId }) [STATE]
│       │   └── UPDATE row with new shape JSON [IO]
│       └── logs migration summary (N rows migrated)
└── store ready — all future reads return { source, kind, ... }
```

```text
[ENTRY] autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts:initialize() [IO]
├── ensureTablesExist() [IO]
├── detectOldBindingColumns() → checks if old resource_ref_owner column exists
├── if old columns exist:
│   └── migrateOldBindingRows()
│       ├── SELECT all rows with old columns [IO]
│       ├── for each row:
│       │   ├── maps resource_ref_owner -> execution_resource_source [STATE]
│       │   └── UPDATE or INSERT into new columns [IO]
│       └── logs migration summary
└── store ready — all future reads return executionResourceRef with source
```

### Branching / Fallback Paths

```text
[FALLBACK] no old-shape rows found — migration is idempotent no-op
# Idempotency guarantee: migration uses count-based detection;
# if rows already migrated (count = 0), no UPDATE is performed.
# Safe to call multiple times.
detectOldSchemaRows() → count = 0
└── skip migration block, proceed to ready state immediately
```

```text
[ERROR] row parse failure during migration
migrateOldExecutionResourceRows()
└── throws StorageMigrationError("Failed to migrate row <id>: <detail>")
    # Transaction rolled back — store initialization fails with clear error
    # Caller must investigate and repair before store can be used
```

### State And Data Transformations

- Old: `{ owner: "bundle", kind: "AGENT_TEAM", localId: "drafting-team" }` stored JSON
- New: `{ source: "bundle", kind: "AGENT_TEAM", localId: "drafting-team" }` stored JSON
- Migration is a field rename only — no behavior change

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No — migration transforms old to new; no dual-path runtime support
- Any tight coupling? No — migration is store-local
- Any naming drift? No

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered` (no-op when no old rows)
- Error Path: `Covered`

---

## Use Case: UC-006 — Docs Distinguish Execution Resources from Runtime Control and Future Streams

### Spine Context

- Spine ID(s): DS-005
- Spine Scope: Documentation/Positioning
- Governing Owner: SDK/docs owners
- Why This Use Case Matters: Without explicit docs separation, developers will continue conflating execution resources with runtime control operations and future runtime streaming.

### Goal

Updated docs clearly define: (1) execution resources = app-selectable agent/team definitions used as input to runs; (2) runtime control = backend capability for starting/monitoring runs; (3) runtime streams = future separate concept for live agent output subscription.

### Preconditions

- `autobyteus-server-ts/docs/modules/applications.md` updated.
- `autobyteus-server-ts/docs/modules/application_orchestration.md` updated.
- `autobyteus-application-sdk-contracts` README updated (if applicable).

### Expected Outcome

A developer reading docs can distinguish these three concepts without confusion. No doc uses "runtime resource" to mean execution resource.

### Primary Runtime Call Stack

```text
# Documentation update — no runtime call stack; modeled as a content update sequence
[Docs Update] autobyteus-server-ts/docs/modules/applications.md
├── Renames "runtime resources" section to "Execution Resources"
├── Adds terminology table:
│   ├── "Execution resource" = agent/team definition an app can select for a run
│   ├── "Runtime control" = backend API to start/monitor app-bound runs
│   └── "Runtime stream" = future concept for live agent output (out of scope, separate ticket)
└── Updates all field name references to executionResourceSlots, allowedExecutionResourceKinds, allowedExecutionResourceSources

[Docs Update] autobyteus-server-ts/docs/modules/application_orchestration.md
├── Renames "runtime resource resolver" section to "Execution Resource Resolver"
├── Explicitly notes: runtime control methods listAvailableExecutionResources / getConfiguredExecutionResource
└── Notes: execution resources are inputs to runs, not the run runtime itself

[SDK README Update] autobyteus-application-sdk-contracts/README.md (if applicable)
└── Adds migration note: ApplicationRuntimeResource* renamed to ApplicationExecutionResource*
    └── owner field renamed to source
```

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any naming drift? No — docs use new terminology throughout

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

---

## Use Case: UC-007 — First-Party App Manifest and Backend Handler Migration

### Spine Context

- Spine ID(s): DS-001, DS-002, DS-005
- Spine Scope: Primary End-to-End
- Governing Owner: First-party app manifest + backend handler update
- Why This Use Case Matters: FR-007 explicitly requires first-party applications to be updated. Without this use case, there is no verified call stack showing that brief-studio and socratic-math-teacher correctly adopt the new manifest fields and backend method names.

### Goal

`brief-studio` and `socratic-math-teacher` application.json manifests are updated to use `executionResourceSlots`, `allowedExecutionResourceKinds`, `allowedExecutionResourceSources`, `defaultExecutionResourceRef`. Their backend handlers use `context.runtimeControl.getConfiguredExecutionResource` and `startRun({ executionResourceRef, ... })`.

### Preconditions

- SDK contracts (`execution-resources.ts`, `manifests.ts`, `index.ts`) are already updated.
- First-party backends depend on the SDK package.

### Expected Outcome

- `applications/brief-studio/application.json` and `applications/socratic-math-teacher/application.json` contain no old field names.
- Backend handler code uses new method and field names.
- TypeScript compilation succeeds with no references to removed types.

### Primary Runtime Call Stack

```text
# Manifest update (static file change — modeled as a diff sequence)
[Update] applications/brief-studio/application.json
├── "resourceSlots" → "executionResourceSlots"
├── "allowedResourceKinds" → "allowedExecutionResourceKinds"
├── "allowedResourceOwners" → "allowedExecutionResourceSources"
└── "defaultResourceRef.owner" → "defaultExecutionResourceRef.source"

[Update] applications/socratic-math-teacher/application.json
└── (same field renames as brief-studio)

# Backend handler update (TypeScript source change)
[Update] applications/brief-studio/backend/src/handlers/*.ts
├── context.runtimeControl.getConfiguredResource(slotKey)
│   → context.runtimeControl.getConfiguredExecutionResource(slotKey)
├── context.runtimeControl.listAvailableResources(filters)
│   → context.runtimeControl.listAvailableExecutionResources(filters)
├── startRun({ resourceRef, ... })
│   → startRun({ executionResourceRef, ... })
└── TypeScript compile: no ApplicationRuntimeResource* references remain [IO]
```

```text
# TypeScript compilation verification
[ENTRY] tsc --noEmit (or equivalent build step) in applications/brief-studio/backend
├── resolves ApplicationExecutionResource* from updated SDK package
├── validates startRun({ executionResourceRef }) matches ApplicationStartRunInput type
└── exits 0 — compilation succeeds [IO]
```

### Branching / Fallback Paths

```text
[ERROR] backend handler still references old ApplicationRuntimeResourceRef type
tsc compile
└── TS2339: Property 'resourceRef' does not exist on ApplicationStartRunInput
    # Forces fix — no silent fallback
```

```text
[ERROR] application.json still uses old field names after update
autobyteus-server-ts/src/application-bundles/services/application-bundle-manifest-service.ts:parseManifest(...)
└── throws ManifestValidationError("Unknown field: allowedResourceOwners. Use allowedExecutionResourceSources.")
```

### State And Data Transformations

- `application.json` static JSON fields: old names → new names (field rename only, values unchanged)
- Backend handler imports: `ApplicationRuntimeResourceRef` → `ApplicationExecutionResourceRef`

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling? No
- Any naming drift? No

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-008 — Package/Dist Regeneration Succeeds with New Execution-Resource Names

### Spine Context

- Spine ID(s): DS-005
- Spine Scope: Bounded Local
- Governing Owner: Package build / dist regeneration
- Why This Use Case Matters (Design-Risk Objective): The SDK package is a published artifact. If generated/dist outputs are not regenerated after the rename, downstream consumers see stale `ApplicationRuntimeResource*` names even though source was updated. This risk must be explicitly proven.

### Goal

After SDK contract source changes, the build/dist regeneration step produces outputs containing only `ApplicationExecutionResource*` names. No stale old-name exports remain in generated outputs.

### Preconditions

- `autobyteus-application-sdk-contracts/src/execution-resources.ts` is the source (renamed from `runtime-resources.ts`).
- Build/package script generates `dist/` or equivalent outputs.

### Expected Outcome

- `dist/` output contains `ApplicationExecutionResourceKind`, `ApplicationExecutionResourceSource`, `ApplicationExecutionResourceRef`, etc.
- `grep -r "ApplicationRuntimeResource" dist/` returns no results.
- First-party package builds that depend on the SDK succeed.

### Primary Runtime Call Stack

```text
# Package build sequence (bounded local — no server runtime involved)
[ENTRY] pnpm build (or equivalent workspace build script) in autobyteus-application-sdk-contracts
├── tsc: compiles execution-resources.ts, manifests.ts, index.ts → dist/*.d.ts, dist/*.js [IO]
│   ├── no references to runtime-resources.ts (file deleted/renamed)
│   └── exports ApplicationExecutionResource* types in dist/index.d.ts
└── dist/ ready for consumption [STATE]

# Verification step
[ENTRY] rg "ApplicationRuntimeResource" autobyteus-application-sdk-contracts/dist/ [IO]
└── returns 0 matches — old names fully absent from generated outputs

# First-party package rebuild
[ENTRY] pnpm build (or equivalent) in applications/brief-studio/backend
├── resolves updated SDK package from workspace
├── compiles against ApplicationExecutionResource* types
└── exits 0 — build succeeds [IO]
```

### Branching / Fallback Paths

```text
[ERROR] dist/ not regenerated — stale ApplicationRuntimeResource* in output
rg "ApplicationRuntimeResource" dist/
└── returns matches → FAIL — implementation is incomplete until dist is regenerated
```

```text
[ERROR] runtime-resources.ts still exists alongside execution-resources.ts and is still exported
autobyteus-application-sdk-contracts/src/index.ts
└── exports both → TS compiler error or accidental backward-compat exposure
    → Fix: delete runtime-resources.ts and update index.ts to import only execution-resources.ts
```

### State And Data Transformations

- `src/runtime-resources.ts` (deleted) → `src/execution-resources.ts` (new file, same content renamed)
- `dist/` output: old type names replaced by new type names

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No — `runtime-resources.ts` must be deleted, not kept alongside `execution-resources.ts`
- Any naming drift? No

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
