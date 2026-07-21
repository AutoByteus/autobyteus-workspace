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
- Current Review Round: `3`
- Trigger: rework commit `863e4f4892ea4b2d2b05cff7087b0d35bf2223d5` against reviewed base `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`
- Prior Review Round Reviewed: `2`
- Latest Authoritative Round: `3`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: reviewer-rerun focused Vitest commands and a disposable built-source credential-replacement concurrency probe, recorded below
- Failure Evidence Paths: `autobyteus-remote-model-discovery-service.ts`, `llm-provider-service.ts`, `llmProviderConfig.ts`, and the focused discovery tests cited under `CR-007`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation handoff at `240d722` | N/A | `CR-001`–`CR-005` | Fail | No | Missing supported AutoByteus gateway behavior required solution revision; four bounded defects also remained. |
| 2 | Architecture-reviewed rework at `be1beb2` | `CR-001`–`CR-005` | `CR-006`–`CR-008` | Fail | No | Round-1 findings resolved; wrapped discovery auth, authoritative lifecycle fencing, and UI pending-state fixes remained. |
| 3 | Bounded rework at `863e4f4` | `CR-006`–`CR-008` | None | Fail | Yes | `CR-006` and `CR-008` are resolved. `CR-007` resolves removal/host-replacement races but remains open for the supported credential-replacement journey. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | `CR-006` | High | Resolved | `autobyteus-discovery-authentication.ts` defines the narrow `SecretValue` shape; the server coordinator passes it unchanged at `autobyteus-remote-model-discovery-service.ts:145-147,161-177`; raw reveal occurs only in the three core `new AutobyteusClient` expressions. Updated server/core tests passed. | No reveal remains in the server discovery owner or its ports. |
| 2 | `CR-007` | High | Partially resolved; still open | Per-kind generations, token-safe in-flight entries, serialized publication, and an authoritative clear barrier correctly fence credential removal and host replacement. However, successful `provider.autobyteus.api-key` replacement does not advance/invalidate that lifecycle, so the established post-save refresh reuses an older same-host operation (`CR-MP-006`). | Reuse `CR-007`; this is the same lifecycle finding, not a new issue ID. |
| 2 | `CR-008` | Medium | Resolved | `ProviderAPIKeyManager.vue:96-104` passes `removing`; `ProviderApiKeyEditor.vue:4-45,77-85` disables and guards input/reveal/save/remove; runtime save/remove guards are synchronous before the first await. Parent, editor, and runtime tests passed 17/17. | Source and handoff now support the claimed generic pending-state behavior. |

Round-1 `CR-001`–`CR-005` remain resolved under the full base-to-HEAD trace; no regression was found in the restored AutoByteus capability, Claude modes, MCP additions, custom delete, or handoff scoping.

## Review Scope

- Changed implementation and behavior reviewed: rework-first validation of `CR-006`–`CR-008`, followed by the complete centralized-secret implementation, restored AutoByteus LLM/audio/image Settings/discovery/reload/construction/invocation, Local/InMemory custody, migration, generic provisioning, launch hardening, Claude two-mode authentication, GraphQL/UI lifecycle, and relevant changed tests.
- Files / areas reviewed: the complete `534210b9e1dffff6c22855ae89ddb3d2afef5a9b..863e4f4892ea4b2d2b05cff7087b0d35bf2223d5` diff; every round-3 changed source/test file; relevant unchanged production callers; and the cumulative artifact package.
- Explicit exclusions: no real credential, credential file, secret-bearing Store, live provider/API, browser, or desktop execution. Implementation-engineer build/suite results remain upstream evidence rather than API/E2E sign-off.
- Independent reviewer checks:
  - core AutoByteus provider: 1 file / 3 tests passed;
  - server discovery service: 1 file / 6 tests passed;
  - Settings manager/editor/runtime: 3 files / 17 tests passed;
  - `git diff --check 534210b9..HEAD` passed; no Docker diff or normal production `AUTOBYTEUS_API_KEY` environment read was found;
  - a disposable built-source probe started an old-key discovery, modeled successful credential replacement, then invoked the established same-host refresh. Before completion it observed `resolves=1` and `discovers=1`, and after completion `syncs=1`, confirming reuse/publication of the pre-replacement operation rather than a new-key resolution.
- Repository state at review: `HEAD=863e4f4892ea4b2d2b05cff7087b0d35bf2223d5`; worktree was clean before this reviewer-owned report update and remained otherwise clean after focused execution.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: yes, including BEH-001–013, REQ-001–019, AC-001–019, the five-state health contract, `LOCAL_HARDENED` limit, preserved AutoByteus behavior, and exact Claude two-mode decision.
- Design-spec behavior map verified against the implementation: mostly. Wrapped discovery authentication and UI pending-state behavior now match the reviewed package. The supported AutoByteus save/replace -> full-refresh lifecycle still does not invalidate an older same-host discovery.
- Design review report and round confirmed: architecture-review round 6 pass, exact construction target, MP-001/MP-002, and mandatory `EXT-ANTHROPIC-AGENT-SDK-AUTH` carry-forward.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: none. The remaining defect is within already approved BEH-013/REQ-019/AC-019 behavior.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Generic Settings save/remove/status is write-only and value-free; pending save/remove operations are mutually guarded in the component and runtime. | None. |
| `BEH-002` | Confirmed | Empty-base child construction, exact configured stdio MCP additions, file-root validation, and `LOCAL_HARDENED` constraints are preserved. | None. |
| `BEH-003` | Confirmed | Semantic consumers and narrow construction/discovery authentication contexts retain wrapped secrets until authorized client/SDK/request boundaries. | None. |
| `BEH-004` | Confirmed | The tracked live manifest remains secret-free and direct target-only provisioning is retained; durable live-suite migration remains assigned to API/E2E. | None. |
| `BEH-005` | Confirmed | Catalog-bound lifecycle/status/resolve and the five-state health union remain explicit and value-free. | None. |
| `BEH-006` | Confirmed | Early deployment-neutral bootstrap uses the selected backend below `serverDataDir`; Docker topology is unchanged. | None. |
| `BEH-007` | Confirmed | First delivery remains Local/InMemory with typed future registration boundaries and no enterprise placeholder. | None. |
| `BEH-008` | Confirmed | Migration scrubs mapped aliases, records reprovisioning, and leaves normal runtime free of ambient fallback. | None. |
| `BEH-009` | Confirmed | Factory config composition is preserved and authentication remains in exact tagged construction contexts. | None. |
| `BEH-010` | Confirmed | Default and real-E2E Local Stores remain separate pair-authenticated targets with read-only real-E2E runtime. | None. |
| `BEH-011` | Confirmed | Configuration/backend/capability contracts remain typed, neutral, and limited to approved implementations. | None. |
| `BEH-012` | Confirmed | CLI and managed-secret modes match the account, lookup, child-environment, settings/tools/MCP, redaction, and no-fallback contract. | None. |
| `BEH-013` | Contradicted | Settings, exact identities, wrapped auth, scoped registration, native coexistence, migration, removal fencing, host-change fencing, and invocation are present. | A successful credential replacement followed by its established full refresh can reuse and publish an in-flight discovery authenticated with the superseded key (`CR-007`, `CR-MP-006`). |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The package and implementation retain the intended owners, hardening scope, migration decision, and preserved behavior. | Keep the assessment intact. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | `credential-consumer-mapping.md:211` requires save/replace to retain the established full refresh; the refresh may reuse pre-replacement authentication (`CR-007`). | Invalidate/fence discovery on successful AutoByteus credential replacement. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | DS-UC018A is clear, but its save/replace -> full-refresh spine can complete with an older credential operation. | Connect credential replacement to the discovery lifecycle generation. |
| Ownership boundary preservation and clarity | Pass | Secret management, subject services, discovery, factories, launch security, and UI/runtime owners are explicit; wrapped reveal ownership is corrected. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Migration, health, crypto/persistence, diagnostics, and test setup stay under their owners. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | Existing management, provider service, discovery owner, registries, Settings store/runtime, and environment policy are reused. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | The shared discovery-authentication shape is narrow and reused across LLM/audio/image. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | Construction/authentication/status unions and the new discovery shape remain minimal and non-overlapping. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Fail | Discovery generations are centralized, but successful AutoByteus credential replacement is not connected to that owner, unlike removal. | Add one explicit lifecycle invalidation/fencing entry and call it from the successful replacement owner. |
| Empty indirection check (no pass-through-only boundary) | Pass | Services and shared pieces own identity, lifecycle, synchronization, storage, or launch policy. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Reveal is now at core client construction and UI/runtime concerns remain appropriately separated. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Core remains storage-neutral; server owners use public management/factory boundaries without adapter bypass. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | No caller uses an outer owner and its repository/backend internals in parallel. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | The auth shape, discovery lifecycle, provider clients, UI runtime, and tests are placed under their owning capabilities. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | The large change remains navigable by subsystem; the small shared auth shape is justified by cross-capability use. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Fail | Auth identities are exact, but in-flight/cache identity includes generation and hosts only; no credential-replacement revision/invalidation participates. | Extend the lifecycle boundary, not the raw secret, to represent successful replacement. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | Names accurately communicate discovery authentication, generation, host identity, pending state, runtime, and ownership. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Shared catalog, management, discovery, provisioning, environment, and UI helpers avoid meaningful policy duplication. | None. |
| Patch-on-patch complexity control | Pass | Round-3 rework replaces raw contracts and centralizes concurrency mechanics without compatibility layers. | Preserve this during the final bounded correction. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Restored gateway paths are connected; aliases remain migration-only; no new dormant path was found. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Wrapped-auth, removal, host replacement, and UI pending tests are good; no test covers credential replacement during in-flight discovery. | Add the deterministic old-key -> successful replacement -> new-key refresh scenario. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Deferred promises, typed ports, synthetic `SecretValue`, and Vue runtime fixtures are suitable for the missing case. | Reuse them. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The former raw-string expectation is removed and no compatibility-only test remains. | None. |
| API/E2E readiness for the next workflow stage | Fail | One high-severity supported lifecycle defect remains in the restored gateway path. | Fix and return through source review before API/E2E. |

## Source File Size And Structure Audit (If Applicable)

The complete changed implementation-source set was audited. No file exceeds 500 effective non-empty lines and no effective non-empty delta exceeds 220 lines. Tests, fixtures, generated outputs, and coverage files were excluded from these thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | 499 | Pass | Pass (68) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | 498 | Pass | Pass (33) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | 498 | Pass | Pass (6) | Pass | Pass | None | None. |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | 491 | Pass | Pass (163) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/llm-factory.ts` | 486 | Pass | Pass (61) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | 467 | Pass | Pass (93) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | 435 | Pass | Pass (217) | Fail only at cross-owner replacement lifecycle (`CR-007`) | Pass | `Local Fix` | Notify/fence the discovery owner after successful AutoByteus replacement. |
| `autobyteus-web/stores/llmProviderConfig.ts` | 421 | Pass | Pass (184) | Pass; it invokes the established full refresh | Pass | None | None. |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | 385 | Pass | Pass (130) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | 208 | Pass | Pass (208) | Fail only for missing credential-replacement invalidation (`CR-007`) | Pass | `Local Fix` | Make lifecycle generation/cache identity replacement-aware without storing/comparing raw keys. |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | 178 | Pass | Pass (18) | Pass | Pass | None | None. |
| `autobyteus-ts/src/clients/autobyteus-discovery-authentication.ts` | 4 | Pass | Pass (4) | Pass | Pass | None | None. |
| Remaining audited changed implementation-source files | 1–374 | Pass | Pass (maximum below 220) | Pass under subsystem review | Pass | None | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No optional constructor fallback, ambient credential fallback, or current-runtime dual shape exists. |
| No legacy old-behavior retention in changed scope | Pass | Historical aliases and v1 custom-provider parsing are migration-only. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Previously dormant gateway paths are connected. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Mapped plaintext is scrubbed/reprovisioned; hosts remain non-secret; no plaintext copy/backup path exists. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Normal runtime uses only current shapes. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Migration runs before normal consumers and solely owns historical parsing. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: provider credential setup, Local Store lifecycle/health, real-test provisioning, execution hardening, Claude modes, and AutoByteus gateway credential behavior change materially.
- Files or areas likely affected: provider/server setup, Local Store operations/recovery, live-E2E setup, security/deployment limits, Claude runtime configuration and `EXT-ANTHROPIC-AGENT-SDK-AUTH`, and AutoByteus remote provider setup.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| `MP-001` | Confirmed | N/A. Empty/read-only Local Stores retain authenticated pair identity. |
| `MP-002` | Confirmed | N/A. `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck dependency, not legal clearance. |

`CR-MP-005` remains a reachable supported overlap. Its credential-removal variant is now correctly fenced and covered; it no longer drives an unresolved defect.

### `CR-MP-006` — Successful AutoByteus credential replacement can overlap an older same-host discovery

- Origin: `New`
- Related approved requirement or established contract: BEH-013; REQ-019; AC-019(a)–(c); `credential-consumer-mapping.md:211`; DS-UC018A in `use-case-spine-validation.md:556-567`.
- Relevant behavior ID(s): `BEH-013`
- Product-supported initiating trigger or governing contract, with evidence: the existing Settings row and public GraphQL API support write-only create-or-replace; successful AutoByteus save/replace must retain the established full remote-catalog refresh. Model list/reload is also a normal public operation, so two browser/API clients can overlap them.
- Actual production caller/event path from that trigger to the claimed state: client A list/reload -> singleton discovery `run(llm, sameHosts)` resolves old key and waits on remote; client B Settings save -> `setLlmProviderApiKey` -> `LlmProviderService.setProviderApiKey` atomically stores the new key -> web `setLLMProviderApiKey` invokes full `reloadModels` -> GraphQL `reloadLlmModels` -> model catalog -> discovery `refresh(llm)` -> `run` returns the existing same-generation/same-host promise without resolving the new key.
- Lifecycle preconditions and material consequence at the claimed point: the old request remains pending when replacement succeeds. Because replacement does not advance generation or invalidate in-flight/completed state, the old-key result publishes and marks the current host complete. The save/full-refresh journey can therefore report success with the old credential's catalog, and subsequent `ensureDiscovered` can keep returning that cached state without new-key resolution. If the superseded key now fails, the UI can instead report save/reload failure even though the new credential was already stored.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-007` remains open. Add a credential-replacement lifecycle revision/invalidation at the discovery owner, invoked after successful AutoByteus storage replacement and before its refresh. It must fence older publication and invalidate same-host completion without comparing, serializing, or retaining raw key material. Add a deterministic two-key deferred test.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `9.0`
- Overall score (`/100`): `89.6`
- Score calculation note: simple average of the ten category scores, rounded for the `/10` summary. The fail decision is driven by `CR-007` and sub-9 categories; the rounded average does not override the clean-pass rule.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.7 | All approved spines are recognizable and prior removal/clear/host races are restored or fenced. | DS-UC018A replacement can finish its refresh on the old discovery generation (`CR-007`). | Join successful replacement to the discovery lifecycle. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | Wrapped auth now remains inside exact owners; management, discovery, registry, and UI boundaries are explicit. | No material ownership bypass remains. | Preserve the boundary while adding a non-secret lifecycle signal. |
| `3` | `API / Interface / Query / Command Clarity` | 8.7 | Semantic identities and auth shapes are exact and fallback-free. | The discovery lifecycle API has authoritative clear but no successful-replacement invalidation command. | Add one explicit bounded lifecycle entry. |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Reveal, lifecycle, registry, UI, and storage responsibilities are correctly placed. | No file-placement issue drives the remaining defect. | Keep the correction within provider/discovery owners. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | Closed unions, construction targets, health states, and the new auth shape are minimal and reused. | No material shared-model issue. | Do not use raw-key equality as a revision mechanism. |
| `6` | `Naming Quality and Local Readability` | 9.3 | Names accurately expose runtime, consumer, authentication, generation, hosts, and pending state. | No material naming defect. | Preserve naming. |
| `7` | `API/E2E Readiness` | 8.6 | Focused builds/tests and race fixtures are strong. | The supported replacement race is untested and currently fails source inspection/probe. | Add the deterministic two-key lifecycle test, then re-review. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.2 | Critical functionality, security reveal, removal/host races, and UI overlap are fixed. | Save/replace can publish/cache the superseded key's catalog or report a false save failure (`CR-007`). | Fence old-key discovery and force the post-save refresh to resolve the new key. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.3 | Runtime has no ambient fallback, dual shape, or version-specific path. | No material legacy issue. | Preserve the clean cutover. |
| `10` | `Cleanup Completeness` | 8.9 | Dormant paths and stale raw-auth tests are corrected. | Handoff says lifecycle reuse is configuration-aware but does not disclose that credential replacement is not part of that identity. | Fix source/test and update the handoff evidence. |

## Findings

### `CR-007` — Successful credential replacement still reuses and publishes an older same-host discovery

- Severity: `High`
- Classification: `Local Fix`
- Current status: `Partially resolved; open`
- Affected behavior/contracts: BEH-013, REQ-019, AC-019(a)–(c), Settings save/replace plus full-refresh contract in `credential-consumer-mapping.md:211` and DS-UC018A; `CR-MP-006`.
- Resolved portion: `autobyteus-remote-model-discovery-service.ts:79-125,182-215` now correctly uses generations, host-aware tokens, serialized publication, and an authoritative clear barrier. The deterministic removal and host-replacement tests pass.
- Remaining evidence:
  - `run()` at `autobyteus-remote-model-discovery-service.ts:107-125` reuses an operation when only `generation` and `hostsKey` match. Successful credential replacement changes neither value.
  - The only cross-kind generation invalidation occurs inside `performAuthoritativeClear()` at `:94-105`. `LlmProviderService.setProviderApiKey` at `llm-provider-service.ts:209-221` saves the replacement but does not signal the discovery lifecycle or invalidate completed-host state.
  - `llmProviderConfig.ts:279-309` performs the approved sequence: mutation succeeds, then AutoByteus runs full reload. That refresh reaches the same singleton operation. The reviewer probe observed only one secret resolve, one discovery, and one sync across pre-replacement discovery plus post-replacement refresh.
  - Current tests at `autobyteus-remote-model-discovery-service.test.ts:90-137` cover removal and host replacement only; there is no successful key-replacement case.
- Material consequence: the save/full-refresh journey can publish/cache models authorized by the superseded key and never resolve the newly stored key for that host. If the old key fails, the UI can report a failed save even though storage replacement already succeeded. Either outcome contradicts preserved replacement/refresh behavior.
- Required action: after successful AutoByteus credential storage replacement and before its established refresh, advance/invalidate the relevant discovery lifecycle so pre-replacement operations cannot publish or satisfy same-host cache/reuse. Do not compare or retain raw secrets to do this. Add a deterministic test with old-key discovery pending, successful replacement, new-key refresh, both completions, and assertions that only the new generation publishes/caches and the new consumer is resolved.

## Classification

- Primary package classification: `Local Fix`
- Reason: the remaining `CR-007` work is a bounded provider/discovery lifecycle correction within the architecture-reviewed behavior. No requirement or design decision is missing.

## Recommended Recipient

- `implementation_engineer`
- Routing: complete the remaining credential-replacement fencing/test/handoff correction, run focused checks, commit, and return the complete package for another full source review before API/E2E.

## Residual Risks

- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency. It is not legal clearance, and neither Claude authentication mode may be silently changed.
- Only `LOCAL_HARDENED` is claimed; arbitrary same-user filesystem/process inspection and strong identity/container isolation remain deferred.
- Cross-platform Local ACL/owner behavior, restart/reopen, contention, staged interruption, pair/format faults, unchanged Docker persistence, single-Pod/PVC behavior, and real AutoByteus LLM/audio/image execution still require realistic API/E2E evidence.
- The core test-tree TypeScript check remains non-green with 365 broader errors, including eight old live AutoByteus audio/image suites assigned to API/E2E Store-backed migration. The broad core suite retains one unchanged event-enum count mismatch; full Nuxt typecheck remains broadly baseline-non-green.
- Rich configured/removal Settings behavior still needs browser-equivalent/live-backend validation downstream.
- No real credential, secret-bearing Store, or credential file was accessed during this review or its disposable probe.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Score Summary: `9.0/10` (`89.6/100`); the rounded average does not override the high-severity runtime defect and sub-9 spine/API/readiness/correctness categories.
- Failure Origin (when applicable): `N/A` (not an API/E2E failure-origin entry point)
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: `CR-006` and `CR-008` pass. `CR-007` remains open only for credential replacement; removal and host-replacement fencing pass. Do not advance to API/E2E. Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` through every downstream handoff.
