# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/use-case-spine-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-architecture.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-backend-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/credential-consumer-mapping.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/live-test-secret-provisioning.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/threat-model-and-option-analysis.md`
- Current Review Round: `2`
- Trigger: reworked implementation commit `be1beb2f69d8f9a6f80c521a9febb187624bfee6` against reviewed base `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`
- Prior Review Round Reviewed: `1`
- Latest Authoritative Round: `2`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths: source and test paths cited in `CR-006`–`CR-008`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation handoff at `240d722` | N/A | `CR-001`–`CR-005` | Fail | No | Missing supported AutoByteus gateway behavior required solution revision; four bounded defects also remained. |
| 2 | Architecture-reviewed rework at `be1beb2` | `CR-001`–`CR-005` | `CR-006`–`CR-008` | Fail | Yes | All prior findings are resolved. Three bounded implementation defects remain before API/E2E. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `CR-001` | High | Resolved | Architecture round 6 approved BEH-013/REQ-019/AC-019/UC-018. The implementation restores AutoByteus Settings, startup/list/full/provider reload, LLM/audio/image discovery and invocation, target-owner construction, runtime-scoped replacement, native coexistence, migration, and Store-backed coverage hooks. | The critical removal of existing functionality identified in round 1 is substantively restored. New lifecycle/security defects in that restored path are tracked separately below. |
| 1 | `CR-002` | High | Resolved | `claude-sdk-launch-policy.ts` now maps the actual node-local OS home or a validated existing absolute override into the empty-base CLI child while the CLI mode performs zero secret lookup. | No broad parent-environment inheritance or mode fallback was added. |
| 1 | `CR-003` | Medium | Resolved | `stdio-managed-mcp-server.ts` now calls `buildAgentChildEnvironment(process.env, config.env ?? {})`, preserving the sanitized operational base plus exact configured additions. | The changed focused tests cover configured delivery and parent exclusion. |
| 1 | `CR-004` | Medium | Resolved | `llm-provider-service.ts:180-192` treats an absent custom provider as successful deletion while retaining the built-in rejection at `:175-179`. | Idempotency is restored without weakening the built-in boundary. |
| 1 | `CR-005` | Medium | Resolved | `implementation-handoff.md` now scopes empty-base/no-fallback to both Claude modes and scopes `tools: []`, empty settings, and strict explicit MCP to `managed-secret` only. | Downstream no longer receives the false CLI assertion. |

## Review Scope

- Changed implementation and behavior reviewed: the complete reworked centralized-secret delivery, with rework-first tracing of `CR-001`–`CR-005`, restored AutoByteus LLM/audio/image Settings/discovery/reload/construction/invocation, exact credential ownership, Local/InMemory custody, migration, generic provisioning, process launch hardening, Claude two-mode authentication, GraphQL/UI lifecycle, and changed tests.
- Files / areas reviewed: the complete `534210b9e1dffff6c22855ae89ddb3d2afef5a9b..be1beb2f69d8f9a6f80c521a9febb187624bfee6` implementation diff; relevant production callers in `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, and Electron; all cumulative artifacts; and changed tests needed to assess contract alignment and next-stage readiness.
- Explicit exclusions: no real credential, credential file, or secret-bearing Store was read; no live provider/API/browser/desktop execution was performed. Implementation-engineer commands are upstream evidence rather than independent API/E2E sign-off. This review independently performed source tracing, a full changed-source size/delta audit, `git diff --check`, and repository-state verification.
- Repository state at review: `HEAD=be1beb2f69d8f9a6f80c521a9febb187624bfee6`; implementation worktree was clean before this reviewer-owned report update; `git diff --check 534210b9e1dffff6c22855ae89ddb3d2afef5a9b..HEAD` passed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: yes, including BEH-001–013, REQ-001–019, AC-001–019, the exact five-state health contract, `LOCAL_HARDENED` limit, preserved AutoByteus gateway behavior, and exact Claude two-mode decision.
- Design-spec behavior map verified against the implementation: mostly. All prior source-review findings are resolved, but the restored AutoByteus discovery path contradicts its approved secret-reveal and authoritative-removal lifecycle, and the generic provider editor contradicts its pending-operation lifecycle.
- Design review report and round confirmed: architecture-review round 6 pass, including the exact `{credentialProviderId, authenticationRequirement}` construction target, MP-001/MP-002, and mandatory `EXT-ANTHROPIC-AGENT-SDK-AUTH` carry-forward.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: none. `CR-006`–`CR-008` are bounded defects against already approved behavior and contracts.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Contradicted | Settings/GraphQL -> provider service -> secret management/backend is write-only and value-free; save/remove refresh the relevant state. | The generic provider editor is not passed `removing` and does not disable save/input while removal is pending (`CR-008`). |
| `BEH-002` | Confirmed | Empty-base child construction, exact configured stdio MCP additions, file-root validation, and `LOCAL_HARDENED` constraints are preserved. | None. |
| `BEH-003` | Contradicted | Server provisioning uses semantic consumers and narrow construction contexts for LLM/search/media/metadata. | AutoByteus discovery reveals the raw key in the server coordination service rather than at the authorized core client-construction boundary (`CR-006`). |
| `BEH-004` | Confirmed | The tracked live manifest remains secret-free and direct target-only provisioning is retained; durable live-suite migration remains assigned to API/E2E. | None. |
| `BEH-005` | Confirmed | Catalog-bound lifecycle/status/resolve and the five-state health union remain explicit and value-free. | None. |
| `BEH-006` | Confirmed | Early deployment-neutral bootstrap uses the selected backend below `serverDataDir`; Docker topology is unchanged. | None. |
| `BEH-007` | Confirmed | First delivery remains Local/InMemory with typed future registration boundaries and no enterprise placeholder. | None. |
| `BEH-008` | Confirmed | Migration scrubs mapped aliases, including `AUTOBYTEUS_API_KEY`, records reprovisioning, and leaves normal runtime free of ambient fallback. | None. |
| `BEH-009` | Confirmed | Factory config composition is preserved and authentication remains in the exact tagged construction context. | None. |
| `BEH-010` | Confirmed | Default and real-E2E Local Stores remain separate pair-authenticated targets with read-only real-E2E runtime. | None. |
| `BEH-011` | Confirmed | Configuration/backend/capability contracts remain typed, neutral, and limited to approved implementations. | None. |
| `BEH-012` | Confirmed | CLI and managed-secret modes now match the reviewed account, lookup, child-environment, settings/tools/MCP, redaction, and no-fallback contract. | None. |
| `BEH-013` | Contradicted | AutoByteus Settings, exact discovery/construction identities, scoped registration, native coexistence, migration, and invocation are restored. | Raw authentication is exposed above the authorized core boundary (`CR-006`); an older in-flight discovery can republish after authoritative removal (`CR-007`, `CR-MP-005`); generic Settings pending state permits overlapping removal/save (`CR-008`). |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The current package identifies custody, ambient resolution, launch inheritance, migration, preserved gateway behavior, and deferred isolation accurately; the implementation follows its overall ownership layout. | Keep the assessment and stated scope intact during local rework. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | `credential-consumer-mapping.md:184-186` requires wrapped discovery authentication and authoritative removal; source contradicts both (`CR-006`, `CR-007`). | Correct the discovery authentication and lifecycle mechanics without changing the reviewed behavior. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | The 28-spine inventory is clear, but DS-UC018 discovery/removal can publish stale results after its authoritative lifecycle boundary (`CR-007`). | Fence or serialize discovery publication against clear/replacement. |
| Ownership boundary preservation and clarity | Fail | Most owners are explicit; AutoByteus discovery unwraps a secret inside a server coordinator instead of the authorized client-construction owner (`CR-006`). | Pass a narrow wrapped authentication shape to core discovery. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Migration, launch policy, health projection, crypto/persistence, and test provisioning remain separately owned. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | Existing secret management, factories, registries, launch environment owner, Settings runtime, and provider services are reused. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Fail | Three discovery ports accept the same raw string because the reviewed dedicated discovery-authentication shape is absent (`CR-006`). | Introduce the narrow shared shape at the core discovery boundary. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Fail | Construction targets and other unions are tight, but the AutoByteus discovery boundary collapses protected authentication to an untyped raw string across coordinator and ports (`CR-006`). | Preserve `SecretValue` in a purpose-specific authentication shape until client construction. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Remote discovery/reload/clear coordination is centralized in one service; provisioning and child-environment policy also have clear owners. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | New services own real policy, identity mapping, lifecycle, or construction rather than forwarding only. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Fail | File placement is coherent, but secret revelation occurs in the discovery lifecycle coordinator rather than the request-auth/client construction concern (`CR-006`). | Move raw reveal to the narrow authorized core boundary. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Fail | Core remains storage-neutral, but the server discovery owner depends on and distributes a raw secret through injectable application ports (`CR-006`). | Depend on the protected authentication shape and keep reveal in core client creation. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | Callers use secret management/configuration and subject provisioning public entries; no caller simultaneously bypasses into repositories/backend internals. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | Secret, discovery, provisioning, factory, migration, launch, GraphQL, and Settings files reside under their owning capability areas. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | The change is large but divided by established subsystem; no artificial one-method file proliferation was found. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Fail | Generic construction identities are exact, but discovery exposes raw `string` authentication and in-flight reuse is not lifecycle/configuration aware (`CR-006`, `CR-007`). | Tighten the discovery interface and add epoch/config-aware publication. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | Names consistently expose provider, runtime, consumer, storage, health, and lifecycle intent. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Shared catalog, management, provisioning, launch policy, and runtime synchronization eliminate meaningful policy duplication. | None. |
| Patch-on-patch complexity control | Pass | Rework integrates with existing owners rather than layering compatibility adapters or ambient fallbacks. | Preserve this posture during fixes. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Round-1 dormant AutoByteus paths are reconnected; legacy aliases are migration-only; no additional dead path was found. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | The discovery test explicitly expects a raw string at the server port and has no clear-vs-in-flight race; the UI tests do not verify pending-state propagation/overlap (`CR-006`–`CR-008`). | Replace the stale assertion and add deterministic lifecycle/UI concurrency tests. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Existing service ports, synthetic `SecretValue`, Vue runtime fixtures, and focused component mounts are reusable and localized. | Reuse them for the missing cases. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Fail | `autobyteus-remote-model-discovery-service.test.ts:54-56` codifies the boundary the approved supplement forbids. | Assert the wrapped authentication shape instead. |
| API/E2E readiness for the next workflow stage | Fail | Three source defects remain; advancing would ask API/E2E to validate a known security-boundary breach, lifecycle race, and UI overlap. | Fix and return through full source review first. |

## Source File Size And Structure Audit (If Applicable)

The audit covered all 152 changed implementation-source files. No file exceeds 500 effective non-empty lines and no effective non-empty delta exceeds 220 lines. Representative highest-pressure files and finding-bearing files follow; tests, fixtures, generated outputs, and coverage files were excluded from these thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | 498 | Pass | Pass (65) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | 498 | Pass | Pass (33) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | 498 | Pass | Pass (6) | Pass | Pass | None | None. |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | 491 | Pass | Pass (163) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/llm-factory.ts` | 486 | Pass | Pass (61) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | 467 | Pass | Pass (93) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | 435 | Pass | Pass (217) | Pass | Pass | None | None. |
| `autobyteus-web/stores/llmProviderConfig.ts` | 421 | Pass | Pass (184) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | 385 | Pass | Pass (130) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | 133 | Pass | Pass (133) | Fail (`CR-006`, `CR-007`) | Pass | `Local Fix` | Keep the file cohesive while tightening auth ownership and stale-publication fencing. |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | 177 | Pass | Pass (17) | Fail (`CR-008`) | Pass | `Local Fix` | Bind pending state to the editor and prohibit overlapping actions. |
| Remaining 141 changed implementation-source files | 1–374 | Pass | Pass (maximum 143) | Pass under subsystem review | Pass | None | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No optional constructor fallback, ambient credential fallback, or current-runtime dual shape was added. |
| No legacy old-behavior retention in changed scope | Pass | Historical aliases and custom-provider v1 parsing remain confined to migration. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Previously dormant AutoByteus discovery/reload/construction paths are now reconnected. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Mapped plaintext is scrubbed and recorded for reprovision; hosts remain non-secret; no plaintext import or backup path exists. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Normal repositories/services use only current shapes. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Migration occurs pre-runtime and is the sole historical-data owner. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the delivery changes provider credential setup, Local Store operation/reset/health, real-test provisioning, child-environment guarantees, Claude authentication modes, and AutoByteus remote gateway credential lifecycle.
- Files or areas likely affected: provider/server setup, Local Store operations/recovery, live-E2E setup, deployment/security limits, Claude runtime configuration and `EXT-ANTHROPIC-AGENT-SDK-AUTH`, and AutoByteus remote provider setup.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| `MP-001` | Confirmed | N/A. Empty/read-only Local Stores still require authenticated pair identity and the implementation retains that contract. |
| `MP-002` | Confirmed | N/A. `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency, not legal clearance. |

Prior round premises `CR-MP-003` and `CR-MP-004` remain reachable supported scenarios, and their corresponding implementation defects are resolved in this round.

### `CR-MP-005` — Authoritative credential removal can overlap an ordinary in-flight remote discovery

- Origin: `New`
- Related approved requirement or established contract: BEH-013; REQ-019; AC-019(a)–(c); `credential-consumer-mapping.md:186`, which makes successful credential removal authoritative and requires all AutoByteus runtime subsets to clear without lookup.
- Relevant behavior ID(s): `BEH-013`
- Product-supported initiating trigger or governing contract, with evidence: model list/reload operations and Settings credential removal are public GraphQL/UI operations. They may be initiated concurrently by ordinary API callers or separate browser tabs; the server's async resolver/service model does not serialize them.
- Actual production caller/event path from that trigger to the claimed state: list or reload -> singleton `AutobyteusRemoteModelDiscoveryService.run` -> remote discovery pending; overlapping Settings remove -> `LlmProviderService.removeProviderApiKey` -> Store removal -> `clearAutobyteusRemoteModels` -> `clearAllWithoutLookup`; the older remote promise then resolves -> `discoverAndSync` publishes models and overwrites its completed/count cache.
- Lifecycle preconditions and material consequence at the claimed point: a configured AutoByteus host responds slowly enough for removal to complete first. `clearAllWithoutLookup()` clears registries but neither awaits, invalidates, nor fences `inFlightByKind`; `discoverAndSync()` later unconditionally synchronizes results. Removed remote models therefore reappear after the authoritative clear, and cache state can again report a completed nonzero discovery. Construction still fails closed on the missing key, but the approved catalog-removal outcome is violated.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-007`. Add per-kind generation/epoch or equivalent serialization so an operation begun before authoritative clear/replacement cannot publish or update state afterward. Cover it with a deterministic deferred-promise test.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.6`
- Overall score (`/100`): `86.2`
- Score calculation note: simple average of the ten category scores, rounded for the `/10` summary. The fail decision follows the findings and sub-9 categories, not the average.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.6 | All approved spines, including the restored gateway and prior fixes, are recognizable and mostly complete. | AutoByteus authoritative removal is not preserved against an older in-flight discovery (`CR-007`). | Fence publication/cache updates by lifecycle generation. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 8.2 | Secret management, subject provisioning, registries, launch security, and UI/runtime owners are generally explicit. | Server discovery unwraps and distributes a raw secret above the approved client-construction boundary (`CR-006`). | Pass a dedicated wrapped authentication shape to core. |
| `3` | `API / Interface / Query / Command Clarity` | 8.3 | Construction targets and semantic consumers are exact and fallback-free. | Discovery ports accept raw strings and in-flight reuse has no lifecycle/config identity (`CR-006`, `CR-007`). | Tighten authentication and publication interfaces. |
| `4` | `Separation of Concerns and File Placement` | 8.7 | Files reside under clear capabilities and the rework avoids compatibility layers. | Secret revelation is placed in lifecycle coordination instead of core request-auth/client construction (`CR-006`). | Move only the reveal responsibility; retain current layout. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.0 | Closed unions, exact construction targets, catalog identities, health states, and shared launch policy are tight. | The reviewed discovery-auth shape is missing, but this is localized. | Add the purpose-specific wrapped shape without a kitchen-sink abstraction. |
| `6` | `Naming Quality and Local Readability` | 9.2 | Names communicate runtime, credential owner, consumer, storage, health, and lifecycle intent consistently. | No material naming defect. | Preserve naming during rework. |
| `7` | `API/E2E Readiness` | 8.2 | Builds and focused tests are strong and the remaining live-harness migration is explicitly scoped. | Current tests encode the raw boundary and omit the removal race and pending UI propagation (`CR-006`–`CR-008`). | Fix source/tests, then return for source review before API/E2E. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.0 | Prior critical behavior removal and all prior bounded defects are fixed. | Removal can be undone by stale discovery, and generic save/remove can overlap (`CR-007`, `CR-008`). | Make authoritative lifecycle and pending controls deterministic. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.2 | Normal runtime has no credential-env fallback or dual shape; history is migration-only. | No material legacy issue. | Preserve the current cutover boundary. |
| `10` | `Cleanup Completeness` | 8.8 | Dormant gateway paths and prior stale handoff assertions are corrected. | The handoff now overstates the generic editor's pending-state behavior, and tests retain one stale auth-boundary assertion (`CR-006`, `CR-008`). | Correct source, tests, and handoff evidence together. |

## Findings

### `CR-006` — AutoByteus discovery unwraps the secret above its explicitly authorized core client boundary

- Severity: `High`
- Classification: `Local Fix`
- Affected behavior/contracts: BEH-003, BEH-013, REQ-005, REQ-019, AC-005, AC-019(b)/(d), and `credential-consumer-mapping.md:184`.
- Evidence:
  - `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts:100-118` resolves `SecretValue`, immediately calls `revealToTrustedConsumer()`, and sends `apiKey: string` through its discovery method and injectable ports.
  - `autobyteus-ts/src/llm/autobyteus-provider.ts:101,117`, `multimedia/audio/autobyteus-audio-provider.ts:27,39`, and `multimedia/image/autobyteus-image-provider.ts:27,39` accept the raw string and construct `AutobyteusClient` later.
  - The authoritative mapping at `credential-consumer-mapping.md:184` requires the server service to pass `SecretValue` through an explicit discovery-authentication shape and requires the core provider to unwrap only while constructing `AutobyteusClient`. The architecture sequence at `secret-storage-architecture.md:406-410` likewise keeps `SecretValue` through management/discovery before remote request authentication. AC-005 authorizes raw reveal only at the SDK/request-auth/child-environment boundary.
  - `autobyteus-server-ts/tests/unit/llm-management/autobyteus-remote-model-discovery-service.test.ts:54-56` currently codifies the incorrect raw-string port contract.
- Material consequence: raw credential lifetime and exposure expand into a server application coordinator, a local variable, and three injectable discovery ports rather than remaining inside the narrow client/request-auth boundary. That violates the task's central security invariant even though logs and serialized state remain value-free.
- Required action: define the reviewed narrow discovery-authentication shape containing `SecretValue`; pass it unchanged from the server discovery owner; unwrap only at each `new AutobyteusClient` call in core; and update focused tests to prove the wrapped boundary without exposing the value.

### `CR-007` — An older in-flight discovery can republish AutoByteus models after authoritative credential removal

- Severity: `High`
- Classification: `Local Fix`
- Affected behavior/contracts: BEH-013, REQ-019, AC-019(a)–(c), authoritative successful removal in `credential-consumer-mapping.md:186`; `CR-MP-005`.
- Evidence:
  - `autobyteus-remote-model-discovery-service.ts:35-37,72-79` reuses one in-flight promise per model kind with no configuration or lifecycle generation.
  - `clearAllWithoutLookup()` at `:63-69` clears registries and records zero state but does not await, cancel, or invalidate those promises.
  - `discoverAndSync()` at `:82-107` later synchronizes discovered models and updates completion/count state unconditionally.
  - `llm-provider-service.ts:195-205` first removes the managed AutoByteus credential, then calls the authoritative all-kind clear. As established in `CR-MP-005`, ordinary public list/reload and Settings removal operations can overlap.
- Material consequence: after successful credential removal reports an authoritative empty state, the older request can restore remote registry entries and nonzero discovery cache state. Later construction still fails closed because the credential is gone, but the model catalog and Settings lifecycle no longer reflect the authoritative removal.
- Required action: serialize or fence the lifecycle with a per-kind generation/epoch (or equivalent) so stale operations cannot publish or update cache after authoritative clear/replacement; make in-flight reuse configuration/generation aware; add a deterministic deferred-promise test proving final registry/cache state remains empty after the overlap.

### `CR-008` — Generic provider removal state is not propagated and does not prevent conflicting save/remove actions

- Severity: `Medium`
- Classification: `Local Fix`
- Affected behavior/contracts: BEH-001, BEH-013, provider Settings lifecycle under REQ-001/REQ-019 and AC-001/AC-019(a), plus the implementation handoff's claimed interaction behavior.
- Evidence:
  - `autobyteus-web/components/settings/ProviderAPIKeyManager.vue:96-104` renders `ProviderApiKeyEditor` with configured/saving/disabled/reset state but omits `:removing="removing"`, although the parent runtime exposes `removing` at `:139-143`.
  - `providerApiKey/ProviderApiKeyEditor.vue:53-58` declares `removing` as required. It uses it only to disable/label the remove button at `:36-45`; the input, reveal control, and save button at `:4-26` ignore it. Even after prop wiring, a save remains possible while removal is pending.
  - `ProviderAPIKeyManager.spec.ts:132-140` stubs the editor without declaring or asserting the pending prop. `ProviderApiKeyEditor.spec.ts:49-55` checks only remove emission, not pending-state blocking.
  - `implementation-handoff.md:143-149` states that removing-state binding prevents save/remove overlap; the current source does not support that claim.
- Material consequence: the generic editor never presents its actual “Removing…” state, duplicate removal remains clickable in the rendered parent, and a conflicting replacement save can be submitted while removal is pending. The final result becomes timing-dependent and contradicts the claimed lifecycle guard.
- Required action: bind `:removing="removing"` from the manager; treat removal as disabling conflicting input/reveal/save as well as remove; add parent-child pending-propagation and editor overlap-guard tests; and keep the handoff wording only once source and tests support it.

## Classification

- Primary package classification: `Local Fix`
- Reason: `CR-006`–`CR-008` are bounded implementation/test/handoff corrections within the architecture-reviewed design. They do not require a new behavior, requirement, or structural design decision.

## Recommended Recipient

- `implementation_engineer`
- Routing: correct all three findings, update focused tests and the canonical implementation handoff, then return the complete package for another full implementation-source review before API/E2E.

## Residual Risks

- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency. It is not legal clearance, and neither Claude authentication mode may be silently changed.
- Only `LOCAL_HARDENED` is claimed; arbitrary same-user filesystem/process inspection and strong identity/container isolation remain deferred.
- Cross-platform Local ACL/owner behavior, restart/reopen, contention, staged interruption, pair/format faults, unchanged Docker persistence, single-Pod/PVC behavior, and real AutoByteus LLM/audio/image execution still require realistic API/E2E evidence.
- The core test-tree TypeScript check remains non-green with 365 broader errors, including eight old live AutoByteus audio/image suites that API/E2E must migrate to the Store-backed harness. The broad core unit run remains 1,718/1,719 on one unchanged event-enum count mismatch. Full Nuxt typecheck remains broadly baseline-non-green.
- Rich configured/removal Settings behavior still needs browser-equivalent/live-backend verification after `CR-008` is fixed.
- No real credential, secret-bearing Store, or credential file was accessed during this review.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Score Summary: `8.6/10` (`86.2/100`); Ownership, API Clarity, API/E2E Readiness, Runtime Correctness, and related structural categories remain below the clean-pass target.
- Failure Origin (when applicable): `N/A` (not an API/E2E failure-origin entry point)
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: the round-1 critical functionality-removal finding and all four accompanying defects are resolved. `CR-006`–`CR-008` must be corrected and re-reviewed before API/E2E. Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` through every downstream handoff.
