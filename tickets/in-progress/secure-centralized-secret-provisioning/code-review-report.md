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
- Current Review Round: `1`
- Trigger: implementation commit `240d722070864e0ed960f552cdafc03d05d0ffeb` against reviewed base `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths: source paths cited below

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation handoff at `240d722` | N/A | `CR-001`–`CR-005` | Fail | Yes | One concrete supported behavior is missing from the approved basis; four bounded source/packaging defects also remain. |

## Prior Findings Resolution Check (Mandatory On Round >1)

Not applicable in round 1.

## Review Scope

- Changed implementation and behavior reviewed: encrypted Local/InMemory custody, secret catalog and lifecycle, migration, provider/search/media/metadata JIT provisioning, child environment and file-root hardening, Claude two-mode authentication, GraphQL/Settings projections, and related changed tests.
- Files / areas reviewed: the complete `534210b..240d722` diff; production paths in `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, and Electron; the cumulative artifact package; changed tests relevant to implemented contracts; unchanged production callers needed to prove reachability.
- Explicit exclusions: no real credential or secret-bearing Store was read; no live provider/API/desktop execution was performed. The implementation engineer's recorded builds and focused checks were treated as upstream evidence, while this review independently performed source tracing, a complete changed-source size/delta audit, `git diff --check`, and clean-worktree verification.
- Repository state at review: `HEAD=240d722070864e0ed960f552cdafc03d05d0ffeb`; worktree clean; `git diff --check 534210b..HEAD` passed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: yes, including BEH-001–012, REQ-001–018, AC-001–018, the exact five-state health contract, `LOCAL_HARDENED` limit, and the Claude two-mode decision.
- Design-spec behavior map verified against the implementation: partially. Most reviewed spines are recognizable and correctly owned, but three mapped behaviors are contradicted and one concrete supported provider behavior was omitted upstream.
- Design review report and round confirmed: architecture-review round 4 pass at reviewed base, including MP-001/MP-002 and mandatory `EXT-ANTHROPIC-AGENT-SDK-AUTH` carry-forward.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior: `BEH-PROV-013` records the existing AutoByteus remote LLM/audio/image discovery and construction behavior that the solution package omitted.
- Remaining material ambiguity: the approved solution does not decide how `AUTOBYTEUS_API_KEY` is catalogued, migrated, provisioned for discovery/construction, or exposed through lifecycle/coverage. That is a requirement/design gap, not an implementation detail the reviewer can invent.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Contradicted | Settings/GraphQL -> `LlmProviderService` -> management service -> backend is otherwise explicit and value-free. | `deleteCustomProvider` first requires metadata to exist, so a repeated delete returns `CUSTOM_PROVIDER_DELETE_REJECTED` rather than satisfying AC-011 idempotency (`CR-004`). |
| `BEH-002` | Contradicted | `buildAgentChildEnvironment` centralizes an empty base and generic operational allowlist; file-tool roots use realpath-aware checks. | `StdioManagedMcpServer` treats explicitly configured MCP `env` as the parent source, so every non-generic configured variable is discarded rather than being the server-specific addition (`CR-003`, `CR-MP-003`). |
| `BEH-003` | Confirmed for mapped providers | Server-owned LLM, metadata, search, and media provisioning resolve semantic consumers and pass ephemeral authentication contexts to core clients. | The mapped set was incomplete; see `BEH-PROV-013`. |
| `BEH-004` | Confirmed | The tracked live manifest and exact Store setup are secret-free and target-only; remaining durable live-suite migration is explicitly reserved for API/E2E. | None. |
| `BEH-005` | Confirmed | `SecretManagementService` owns catalog-bound save/remove/status/resolve; healthy-only definition state and value-free events are represented. | Whole custom-provider deletion, distinct from backend record removal, is contradicted under BEH-001/AC-011. |
| `BEH-006` | Confirmed | Migration -> typed backend configuration/bootstrap -> provider initialization is ordered in server startup; Electron and direct server construct in-process Local custody. | None. |
| `BEH-007` | Confirmed | Only Local/InMemory are registered; unregistered kinds fail value-free; assurance remains `LOCAL_HARDENED`. | None. |
| `BEH-008` | Confirmed | Migration alone understands historical aliases/schema; it scrubs recognized plaintext, preserves metadata, records reprovision, and normal runtime has no corresponding fallback. | The omitted AutoByteus credential alias must be decided under `BEH-PROV-013`. |
| `BEH-009` | Confirmed | `LLMFactory` composes config separately from required authentication, and concrete clients receive an ephemeral construction context. | None. |
| `BEH-010` | Confirmed | Local initialization authenticates the database/key pair, supports read-write/read-only modes, and has direct target-only provisioning/reset paths. | Broader realistic/conformance evidence remains an API/E2E obligation. |
| `BEH-011` | Confirmed | Typed configuration, backend registration, and discriminated lifecycle capabilities are implemented without a production enterprise placeholder. | None. |
| `BEH-012` | Contradicted | Exact mode parsing, zero management lookup for CLI, exact managed consumer resolution, exact-child key delivery, managed tools/settings restrictions, and redaction are present. | Default CLI redirects `HOME` and `CLAUDE_CONFIG_DIR` to a newly created app-data directory rather than the approved pre-existing external node-local account state (`CR-002`, `CR-MP-004`). |
| `BEH-PROV-013` | Newly Discovered | Existing Settings accepts `AUTOBYTEUS_LLM_SERVER_HOSTS`; server model/media catalogs initialize and refresh the core factories. The base implementation invoked AutoByteus LLM/audio/image discovery, which authenticated `AutobyteusClient` with `AUTOBYTEUS_API_KEY`. | The implementation removed all factory discovery calls and targeted AutoByteus reload support while changing provider discovery methods to require an explicit key. No production caller supplies it, and `SecretCatalog` has no AutoByteus definition/binding. Configured remote AutoByteus LLM/audio/image models therefore disappear. This supported path is absent from every upstream core/supplemental artifact (`CR-001`). |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Fail | The package contains a detailed health assessment, but it omitted the reachable AutoByteus provider behavior and its credential. | Revise the behavior inventory and design under `CR-001`. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Local Store contracts largely match; MCP configured environment delivery conflicts with the consumer mapping, and the implementation handoff overstates CLI restrictions. | Resolve `CR-003` and `CR-005`. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | Mapped custody/JIT spines are clear, but AutoByteus discovery has no current spine or provisioning owner. | Add the missing supported behavior and full discovery/construction lifecycle. |
| Ownership boundary preservation and clarity | Fail | Generic management/catalog ownership is sound for mapped consumers; AutoByteus discovery signatures require a key with no server provisioning owner/caller. | Solution design must assign the semantic consumer/owner before implementation resumes. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | crypto/filesystem/schema/migration/redaction remain owned helpers around the core management and launch spines. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | JIT services reuse `SecretManagementService`; Claude reuses the generic consumer boundary; Local uses the server secret subsystem. | Preserve this structure when adding AutoByteus coverage. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | authentication contexts, child environment composition, Local crypto/filesystem/schema, and frontend support types are factored into owned modules. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | closed auth unions, consumer identities, health/lifecycle unions, and construction contexts are narrow and compositional. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | management, catalog, configuration, migration, and child environment policy each have a clear owner. | Correct the MCP call into the environment owner; do not duplicate policy. |
| Empty indirection check (no pass-through-only boundary) | Pass | provisioning services add semantic consumer resolution/failure policy; backend/config owners add real behavior. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | new secret-management and launch-policy files are cohesive; near-threshold existing files remain subject-focused. | None beyond findings. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | core clients remain backend-agnostic; server provisioning owns backend access; UI sees value-free projections only. | Preserve for `CR-001`. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | subject services depend on management/configuration boundaries, not repositories or Local implementation internals. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | new Local, migration, provisioning, Claude, GraphQL, and frontend support files match their owning subsystems. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | the large delivery is split by real ownership boundaries without one-file-per-trivial-wrapper fragmentation. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Fail | AutoByteus discovery now requires an explicit key but no public/server command owns key resolution; reload still advertises AutoByteus at the server layer while core returns the current empty count. | Define and implement explicit discovery/reload provisioning; fix delete idempotency. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | names generally expose lifecycle, consumer, access mode, and runtime intent directly. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | repeated authentication/environment and Local Store mechanics use shared owned helpers. | None. |
| Patch-on-patch complexity control | Pass | no compatibility overloads or fallback ladders were added; the principal issue is an omitted supported path, not compensating complexity. | Do not repair `CR-001` with ambient fallback. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | AutoByteus LLM/audio/image provider discovery methods remain compiled but have no production caller, while server/UI still expose related host/reload behavior. | Reconnect them through the revised explicit provisioning spine or retire the behavior only after an approved decision. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Store/provider/Claude focused tests are mostly clear, but the stdio MCP unit test explicitly asserts configured `TEST_ENV` is absent, encoding `CR-003`; no default CLI external-account-path test catches `CR-002`. | Correct/add focused tests after the solution revision. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | synthetic secrets and focused subsystem helpers are used; real-secret setup remains separate. | API/E2E should finish the tracked Store-backed harness. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Fail | AutoByteus provider unit/integration files still call the pre-cutover no-argument discovery signatures, contributing to the acknowledged non-green test-tree typecheck. | Migrate them to the revised explicit Store-backed discovery contract; do not restore optional/env auth. |
| API/E2E readiness for the next workflow stage | Fail | Blocking source/behavior gaps precede execution; the full core test-tree typecheck also has 368 acknowledged errors and the broad server-unit run has no pass claim. | Revise design, implement fixes, repeat source review, then hand to API/E2E. |

## Source File Size And Structure Audit

The audit covered all 142 changed hand-authored implementation-source files (`.ts/.js/.mjs/.vue/.py/.sql/.prisma` in implementation locations, excluding tests, fixtures, generated coverage, docs, tickets, and migrations directories). Effective lines count non-empty current lines; delta is additions plus deletions from `534210b..240d722`. No changed implementation file exceeds either threshold.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | 498 | Pass | Pass (6) | Pass; existing session coordinator | Pass | None | None |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | 498 | Pass | Pass (35) | Pass; declarative model catalog | Pass | None | None |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | 491 | Pass | Pass (184) | Pass locally; explicit auth conversion is cohesive | Pass | `CR-001` only through missing callers | Keep explicit auth; reconnect through server provisioning. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 485 | Pass | Pass (17) | Pass; existing factory responsibility | Pass | None | None |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | 484 | Pass | Pass (51) | Pass; UI coordination remains cohesive at current scope | Pass | None | None |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | 467 | Pass | Pass (96) | Pass; last-mile SDK policy owner | Pass | `CR-005` packaging mismatch only | Preserve source's managed-only restrictions; correct handoff text. |
| `autobyteus-ts/src/llm/llm-factory.ts` | 465 | Pass | Pass (38) | Fail behaviorally; AutoByteus initialization/reload is removed without replacement | Pass | `Requirement Gap` / `CR-001` | Implement the reviewed explicit discovery path after upstream revision. |
| `autobyteus-server-ts/src/config/app-config.ts` | 458 | Pass | Pass (26) | Pass; non-secret configuration owner | Pass | None | None |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | 409 | Pass | Pass (196) | Pass overall; one lifecycle command violates its contract | Pass | `Local Fix` / `CR-004` | Make repeated custom-provider delete successful and value-free. |
| `autobyteus-web/stores/llmProviderConfig.ts` | 404 | Pass | Pass (184) | Pass; provider state/API owner | Pass | None | Preserve behavior while server delete becomes idempotent. |
| `autobyteus-server-ts/src/secret-management/backends/local/local-secret-store-initializer.ts` | 195 | Pass | Pass (216) | Pass; cohesive pair/create/open validation | Pass | None | None |
| `autobyteus-server-ts/src/secret-management/migration/legacy-secret-cutover-migration.ts` | 153 | Pass | Pass (162) | Pass for mapped aliases; AutoByteus decision missing upstream | Pass | `CR-001` dependency | Extend only after the revised migration decision. |
| `autobyteus-server-ts/src/secret-management/backends/local/local-encrypted-secret-repository.ts` | 136 | Pass | Pass (152) | Pass; record crypto/transaction owner | Pass | None | None |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-launch-policy.ts` | 57 | Pass | Pass (62) | Fail on default CLI account-state lifecycle | Pass | `Local Fix` / `CR-002` | Point CLI at the approved explicit external account state without broad env inheritance. |
| `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts` | 63 | Pass | Pass (3) | Fail; explicit MCP env is passed in the wrong builder position | Pass | `Local Fix` / `CR-003` | Build from the operational base and apply authorized server-specific additions. |
| `autobyteus-ts/src/llm/autobyteus-provider.ts` | 292 | Pass | Pass (9) | Structurally cohesive but dormant | Pass | `Requirement Gap` / `CR-001` | Reconnect through explicit discovery provisioning. |
| `autobyteus-ts/src/multimedia/audio/autobyteus-audio-provider.ts` | 152 | Pass | Pass (9) | Structurally cohesive but dormant | Pass | `Requirement Gap` / `CR-001` | Reconnect through explicit discovery provisioning. |
| `autobyteus-ts/src/multimedia/image/autobyteus-image-provider.ts` | 152 | Pass | Pass (9) | Structurally cohesive but dormant | Pass | `Requirement Gap` / `CR-001` | Reconnect through explicit discovery provisioning. |
| `autobyteus-server-ts/src/secret-management/catalog/secret-catalog.ts` | 76 | Pass | Pass (89) | Pass for approved mappings; missing AutoByteus behavior is upstream | Pass | `Requirement Gap` / `CR-001` | Add only the solution-approved definition/consumer mapping. |
| `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | 203 | Pass | Pass (15) | Fail behaviorally; discovery removed with no replacement | Pass | `Requirement Gap` / `CR-001` | Restore explicit JIT discovery lifecycle. |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | 198 | Pass | Pass (20) | Fail behaviorally; discovery removed with no replacement | Pass | `Requirement Gap` / `CR-001` | Restore explicit JIT discovery lifecycle. |
| Remaining 121 changed implementation-source files | 1–374 | Pass | Pass (maximum 143) | Pass under subsystem review; no additional size/ownership finding | Pass | None | None beyond findings above. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No optional constructor fallback, ambient auth fallback, or current-runtime dual shape was added. |
| No legacy old-behavior retention in changed scope | Pass | Historical aliases and custom-provider v1 parsing are confined to migration. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | Explicit-key AutoByteus discovery methods and server/UI reload entry points are mutually disconnected (`CR-001`). |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Known mapped plaintext values are scrubbed/reprovisioned; no plaintext import or backup path exists. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Normal repositories/services use only current shapes. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Migration runs before normal consumers and is the sole legacy owner. The missing AutoByteus alias decision must be added upstream rather than guessed. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type (`DeadCode`/`ObsoleteFile`/`LegacyBranch`/`CompatWrapper`/`UnusedHelper`/`UnusedTest`/`UnusedFlag`/`ObsoleteAdapter`/`DormantPath`) | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| Disconnected AutoByteus discovery/reload state across `llm-factory.ts`, audio/image factories/providers, and `AutobyteusLlmModelProvider` | `DormantPath` | Providers require `apiKey`, no production caller invokes them, factories no longer initialize them, core targeted reload omits AutoByteus, while server/UI still expose hosts and reloadability. | The dormant mismatch must not ship: configured behavior silently yields no remote models and leaves misleading entry points. | Remove the dormancy by reconnecting all supported paths through the revised explicit provisioning design; retire entry points only if solution design and user approval intentionally remove the behavior. |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the delivery changes provider credential setup, Local Store operation/reset/health, test provisioning, child-environment guarantees, and Claude authentication modes. The newly discovered AutoByteus credential path also needs an explicit operator/product contract.
- Files or areas likely affected: server/provider setup docs, Local Store operations and recovery, live-E2E setup, deployment/security limits, Claude runtime configuration and `EXT-ANTHROPIC-AGENT-SDK-AUTH`, and AutoByteus remote provider setup.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| `MP-001` | Confirmed | N/A |
| `MP-002` | Confirmed | N/A. `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency, not legal clearance. |

### `CR-MP-003` — Explicitly configured stdio MCP environments are a supported runtime input

- Origin: `New`
- Related approved requirement or established contract: BEH-002 preserved authorized runtime capabilities; REQ-004 per-runtime allowlists; credential-consumer mapping row “MCP servers”; `StdioMcpServerConfigData.env` public configuration contract.
- Relevant behavior ID(s): `BEH-002`
- Product-supported initiating trigger or governing contract, with evidence: GraphQL and the Settings MCP form accept and persist a stdio `env` map; repository integration coverage configures Google MCP credentials and E2E persistence coverage stores `TEST_ENV`.
- Actual production caller/event path from that trigger to the claimed state: Settings/GraphQL config -> `McpConfigService`/persisted config -> `ServerInstanceManager` -> `StdioManagedMcpServer.createClientSession` -> `buildAgentChildEnvironment(config.env)` -> SDK transport spawn.
- Lifecycle preconditions and material consequence at the claimed point: a configured MCP command requires a non-generic server-specific variable. The builder reads only generic operational keys from the map and drops the configured variable, so the MCP process starts without its required configuration/credential and cannot provide its supported tools.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-003`; keep the empty parent base but apply the explicitly authorized server-specific environment through the additions/allowlist boundary, with tests for both required delivery and unrelated-parent exclusion.

### `CR-MP-004` — Default Claude CLI mode must consume pre-existing external node-local account state

- Origin: `New`
- Related approved requirement or established contract: BEH-012, REQ-018, AC-018(a), AR-007/MP-002 deployment distinction.
- Relevant behavior ID(s): `BEH-012`
- Product-supported initiating trigger or governing contract, with evidence: omitted mode defaults to `cli`; the approved contract says CLI uses external/pre-existing node-local Claude account state and preserves the working path without secret-management lookup.
- Actual production caller/event path from that trigger to the claimed state: Claude model discovery or run -> `ClaudeRuntimeAuthenticationService.resolve` returns `{kind:"cli"}` -> `ClaudeSdkClient` -> `buildClaudeSdkSpawnEnvironment` -> SDK query child.
- Lifecycle preconditions and material consequence at the claimed point: an existing user/node Claude login is stored in its normal external account location and `AUTOBYTEUS_CLAUDE_ACCOUNT_HOME` is unset (the default). The implementation instead creates `<appDataDir>/runtime/claude-account` and sets both `HOME` and `CLAUDE_CONFIG_DIR` there, so the child cannot observe the pre-existing account and the default mode loses authentication.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-002`; explicitly map the permitted existing account state into the empty-base child without inheriting the broad parent environment, and cover default plus configured account-location cases.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `7.6`
- Overall score (`/100`): `75.8`
- Score calculation note: simple average of the ten category scores, rounded for the `/10` summary. The fail decision is driven by findings and sub-9 categories, not the average.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 6.5 | The mapped custody/JIT/Claude/launch spines are generally explicit. | A supported AutoByteus LLM/audio/image discovery spine and credential were omitted, then its callers were removed. | Add `BEH-PROV-013` to the authoritative package with complete discovery, construction, lifecycle, migration, and coverage paths. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 7.0 | Management/catalog/configuration/backend owners are strong for mapped consumers. | No owner resolves AutoByteus discovery auth; MCP explicit additions are misapplied as a parent source. | Assign AutoByteus provisioning ownership and correct the environment boundary use. |
| `3` | `API / Interface / Query / Command Clarity` | 7.5 | Consumer identities and construction contexts are narrow and explicit. | AutoByteus methods require a key with no production command/caller; targeted reload advertises unsupported behavior; delete is not idempotent. | Define explicit discovery/reload APIs and honor AC-011. |
| `4` | `Separation of Concerns and File Placement` | 9.0 | New modules are placed by real concern and near-threshold files remain cohesive. | Findings are behavioral/ownership defects rather than file-boundary sprawl. | Preserve current factoring during rework. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.1 | Closed unions, semantic identities, shared environment builder, and Local helpers are appropriately narrow/reused. | The shared environment API is called incorrectly for MCP, but its model is sound. | Use the existing source/additions split correctly. |
| `6` | `Naming Quality and Local Readability` | 9.2 | Names communicate consumer, lifecycle, access mode, runtime, and policy intent well. | No material naming defect; dormant AutoByteus entry points make runtime support misleading. | Reconcile behavior so names again match reachable capability. |
| `7` | `API/E2E Readiness` | 6.0 | Focused implementation checks and synthetic fixtures are useful. | Blocking behavior gaps remain; MCP test encodes the wrong assertion; AutoByteus tests retain old signatures; core test-tree typecheck has 368 errors and broad server unit has no pass claim. | Fix/re-review source, then let API/E2E migrate durable suites and run realistic coverage. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 5.5 | Most secret Store and managed Claude mechanics align closely with the approved contracts. | Configured AutoByteus remote models disappear; default CLI account state is hidden; configured MCP env is dropped; repeated custom delete fails. | Resolve `CR-001`–`CR-004` with regression coverage. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.0 | Normal runtime has no credential-env fallback or version-specific dual path; historical parsing is migration-only. | The omitted AutoByteus migration decision prevents a stronger score, but no compatibility mechanism was added. | Make the alias transition explicit upstream and keep it migration-only. |
| `10` | `Cleanup Completeness` | 7.0 | Most legacy aliases, constructors, and plaintext fields were removed. | AutoByteus providers are left dormant while UI/server entry points remain; stale test signatures and a misleading handoff claim remain. | Reconnect or intentionally retire the path, update tests, and correct handoff evidence. |

## Findings

### `CR-001` — Supported AutoByteus remote LLM/audio/image discovery is omitted from the solution basis and disabled

- Severity: `High`
- Classification: `Requirement Gap` (with design impact)
- Affected behavior/contracts: `BEH-003`, REQ-001/005/011/014, AC-005/006/010, preserved provider behavior; provisional `BEH-PROV-013`.
- Evidence:
  - The reviewed base called `AutobyteusModelProvider.discoverAndRegister()` from `LLMFactory.initializeRegistry`, included it in `reloadModels`, and invoked audio/image `ensureDiscovered()` from their factories.
  - Current `autobyteus-ts/src/llm/llm-factory.ts:155-164,495-507` removes AutoByteus initialization and targeted reload.
  - Current audio/image factories end initialization after static registration (`audio-client-factory.ts:186-191`, `image-client-factory.ts:173-186`).
  - The three provider implementations now require `apiKey: string`, but repository search finds no production caller; only their internal/self calls remain.
  - `autobyteus-server-ts/src/secret-management/catalog/secret-catalog.ts:8-19,62-70` has no AutoByteus binding and media allows only OpenAI.
  - `ServerSettingsService` and the web Settings endpoint card still support `AUTOBYTEUS_LLM_SERVER_HOSTS`; `AutobyteusLlmModelProvider` still declares AutoByteus reloadable, proving this is a supported product path rather than dead technical possibility.
  - None of the requirements, investigation/design core documents, or supplements mentions `AUTOBYTEUS_API_KEY` or this provider discovery lifecycle.
- Material consequence: users with configured AutoByteus remote hosts receive no discovered remote LLM, audio, or image models; targeted reload reports no real refresh. The explicit-auth cutover avoids ambient reads by removing behavior rather than provisioning it.
- Required action: `solution_designer` must add the supported behavior provisionally, decide its product-owned definition/bindings, discovery versus construction consumers, migration/reprovision semantics, Settings/status surface, and Store-backed live coverage. The revised package must pass architecture review before implementation reconnects all LLM/audio/image discovery and runtime construction without ambient fallback.

### `CR-002` — Default Claude CLI mode cannot see the approved pre-existing external account state

- Severity: `High`
- Classification: `Local Fix`
- Affected behavior/contracts: `BEH-012`, REQ-018, AC-018(a), AR-007/MP-002; `CR-MP-004`.
- Evidence: `claude-sdk-launch-policy.ts:18-32` defaults CLI `accountHome` to `<appDataDir>/runtime/claude-account`, creates it, and sets both `HOME` and `CLAUDE_CONFIG_DIR` to it. `AUTOBYTEUS_CLAUDE_ACCOUNT_HOME` has no other source registration, setup flow, or coverage. The reviewed contract says default CLI consumes pre-existing external node-local account state and preserves the working CLI path while doing zero secret lookup.
- Material consequence: on the default/upgrade path, an existing Claude CLI login in the normal node-local account location is invisible, so model discovery/run fails despite valid external authentication.
- Required action: preserve the empty-base/no-secret-lookup rule while explicitly selecting the permitted existing external account location (and any approved explicit override), then test default and override behavior without broad environment inheritance or mode fallback.

### `CR-003` — Stdio MCP launch drops every explicitly configured server-specific environment variable

- Severity: `Medium`
- Classification: `Local Fix`
- Affected behavior/contracts: `BEH-002`, REQ-004, AC-003, preserved authorized MCP capability; `CR-MP-003`.
- Evidence: `stdio-managed-mcp-server.ts:48-53` calls `buildAgentChildEnvironment(config.env)`. The builder treats its first argument as a parent source and copies only generic operational keys; server-specific values belong in its second `additions` argument. `StdioMcpServerConfig.env`, GraphQL/Settings, persistence coverage, and real MCP integration fixtures all establish explicit env as a supported input. The changed unit test at `tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts:64-74` incorrectly asserts `TEST_ENV` is absent.
- Material consequence: configured MCPs that require a server-specific non-secret setting or separately authorized credential start without it and fail, while the product continues to accept/persist the configuration.
- Required action: start from the sanitized operational base and add only the explicitly authorized server-specific map through the intended allowlist/additions boundary. Tests must prove configured delivery and unrelated parent/Store/provider credential exclusion.

### `CR-004` — Custom-provider delete is not idempotent

- Severity: `Medium`
- Classification: `Local Fix`
- Affected behavior/contracts: AC-011 and the custom-provider lifecycle under BEH-001/BEH-005.
- Evidence: `LlmProviderService.deleteCustomProvider` calls `getCustomProviderOrThrow` before removal (`llm-provider-service.ts:172-179`); a second delete reaches `getProviderById` and throws `Unknown provider` (`:325-338`). The resolver catches it and returns `CUSTOM_PROVIDER_DELETE_REJECTED` (`api/graphql/types/llm-provider.ts:350-357`).
- Material consequence: a repeated/retried delete reports failure even after the desired absent state has already been reached, contrary to AC-011.
- Required action: make repeated deletion of an already absent custom provider a value-free success without weakening the built-in-provider guard or reintroducing secret lookup/value return; add service/API retry coverage.

### `CR-005` — The implementation handoff misstates Claude CLI settings/tools behavior and gives downstream a false scenario

- Severity: `Medium`
- Classification: `Local Fix` (packaging/evidence)
- Affected behavior/contracts: BEH-012, REQ-018, AC-018, reviewed design sections 41/289/922.
- Evidence: `implementation-handoff.md:24,45,158` claims both modes use `tools: []`, empty setting sources, and strict explicit MCP. Actual `ClaudeSdkClient.buildQueryOptions` applies those controls only when `authentication.kind === "managedApiKey"`; CLI uses the approved CLI setting sources and caller-provided MCP config (`claude-sdk-client.ts:396-438,471-488`). The detailed reviewed requirements/design constrain those controls to managed mode.
- Material consequence: API/E2E would be instructed to assert behavior that contradicts both source and the approved two-mode contract, creating a likely stale-test failure or an accidental CLI behavior change.
- Required action: correct the canonical implementation handoff's summary, BEH-012 trace, and downstream scenario to say the empty child environment applies to both modes, while `tools: []`/empty setting sources/strict explicit AutoByteus MCP are managed-mode restrictions.

## Classification

- Primary package classification: `Requirement Gap`
- Additional bounded findings: `Local Fix`
- Reason: `CR-001` is a concrete newly discovered supported behavior absent from the approved behavior basis, so implementation review cannot define the missing product contract or pass. `CR-002`–`CR-005` are bounded implementation/packaging corrections but should be addressed after the revised solution package is architecture-reviewed.

## Recommended Recipient

- `solution_designer`
- Routing: revise the solution package for `BEH-PROV-013`, carry all five findings and every upstream artifact through architecture re-review, then return implementation-owned fixes through implementation engineering and a new full source-review round before API/E2E.

## Residual Risks

- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a mandatory delivery/release recheck dependency. It is not legal clearance, and neither Claude authentication mode may be silently changed.
- Only `LOCAL_HARDENED` is claimed; arbitrary same-user filesystem/process inspection and strong identity/container isolation remain deferred.
- Cross-platform Local ACL/owner behavior, restart/reopen, contention, staged interruption, all pair/format faults, unchanged Docker persistence, and single-Pod/PVC behavior still require realistic API/E2E evidence.
- The core test-tree TypeScript check remains non-green with 368 errors, including stale explicit-auth test callers; the full Nuxt typecheck has broad baseline errors; a broad server-unit run was stopped without a pass claim.
- The implementation engineer did not execute a live backend UI matrix; rich healthy/degraded Settings states still need browser-equivalent/live verification.
- No real credential, secret-bearing Store, or credential file was accessed during this review.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Fail`
- Score Summary: `7.6/10` (`75.8/100`); Data-Flow Spine, Ownership, API Clarity, API/E2E Readiness, Runtime Correctness, and Cleanup are below the clean-pass target.
- Failure Origin (when applicable): `N/A` (not an API/E2E failure-origin entry point)
- Recommended Recipient (when applicable): `solution_designer`
- Notes: `CR-001` requires upstream behavior/design revision and architecture re-review. `CR-002`–`CR-005` remain implementation-owned corrections. Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` through every downstream handoff.
