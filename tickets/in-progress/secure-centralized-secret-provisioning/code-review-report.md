# Code Review Report

> Latest authoritative result: **Round 41 — Pass**
> for the bounded `CR-030` source/test delta
> `5994a622b71533b064910db4da0449505578ebb3..3dbe351ee78fbc39f1a1d1f1d2dfc59400fd6672`
> at final handoff HEAD `dd1d37f90d00331d427bad1b36e4401a3a733038`.
> `CR-030` is resolved: only positive safe integers are PID-bearing owners,
> aged zero-byte/non-positive legacy locks use bounded stale recovery, and an
> equally aged lock owned by a live positive PID remains mutually exclusive.
> The reviewed Round-33 migration package is ready to return to API/E2E.

## Historical Post-Review Supersession — User-Approved Explicit Google Metadata Separation

- After the Round 26 source-review Pass and Round 11 API/E2E Pass, the user approved a small explicit separation of Gemini metadata responsibilities so the implementation follows the product boundaries documented by Google.
- Current Google documentation distinguishes the Gemini Developer API / AI Studio `models.list` contract (`https://ai.google.dev/api/models`) from the Preview Gemini Enterprise Agent Platform Express overview and REST surface (`https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/express-mode/overview`, `https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/express-mode/api-reference`), which establish Express generation but do not establish model listing.
- Current LLM/audio/image construction already follows those exact modes and remains correct.
- At the time of this supersession, metadata did not preserve that separation: both selected AI Studio and Vertex Express keys were sent to the Gemini Developer API models endpoint. Round 11 observed HTTP 403 for the Vertex Express request, after which curated metadata made the catalog usable. That prior result remains truthful, but it was not live Vertex metadata success.
- Approved target direction:
  - AI Studio metadata owns the Gemini Developer API request and may use curated fallback.
  - Vertex Express metadata must use a verified official Vertex route, or be explicitly curated-only until that route is established; it must not send its key to the AI Studio metadata endpoint.
  - Vertex Project remains a separate explicit strategy.
  - Curated fallback is a shared resolver concern, and metadata provenance must distinguish `LIVE`, `CURATED_FALLBACK`, and `CURATED_ONLY`.
- Classification: `Design Impact`.
- Recommended Recipient: `solution_designer`.
- Delivery authorization from Round 26 / API-E2E test-review Round 3 is paused. The earlier Pass results remain valid for the previously approved contract but do not authorize final delivery of the newly requested target behavior.

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
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/repository-prisma-1.0.8-assessment.md`
- Current Review Round: `27`
- Trigger: architecture round 22 passed the user-approved explicit Gemini metadata service separation; implementation source is `ab82847e987646aadb8c38e2400270196f00dbb3`.
- Prior Review Round Reviewed: `26` plus the post-review CR-021 Design Impact supersession
- Latest Authoritative Round: `27`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture round 22 Pass)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: N/A for this implementation-review entry point; retained only as downstream context.
- Execution Coverage Report Reviewed: N/A for this implementation-review entry point; retained only as historical execution context.
- Failing Scenario IDs: N/A.
- Exact Failing Commands / Execution Mode: N/A.
- Failure Evidence Paths: N/A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation at `240d722` | N/A | `CR-001`–`CR-005` | Fail | No | Missing supported AutoByteus behavior and bounded defects. |
| 2 | Rework at `be1beb2` | `CR-001`–`CR-005` | `CR-006`–`CR-008` | Fail | No | Authentication, discovery lifecycle, and pending-state defects. |
| 3 | Rework at `863e4f4` | `CR-006`–`CR-008` | None | Fail | No | Credential replacement lifecycle remained open. |
| 4 | Rework at `69d5442` | `CR-007` | None | Pass | No | API/E2E later found the restart defect. |
| 5 | Restart API/E2E failure | None | `CR-009` | Fail | No | Operational database URL was not delivered to Prisma. |
| 6 | Rework at `3068d0f` | `CR-009` | None | Pass | No | Docker later found import-time acquisition. |
| 7 | Docker build API/E2E failure | `CR-009` | `CR-010` | Fail | No | Clean build failed before runtime configuration. |
| 8 | Rework at `71e922a` | `CR-010` | `CR-011` | Fail | No | Per-request Prisma client accumulation. |
| 9 | Rework at `62417e8` | `CR-011` | None | Pass | No | Shared lazy token-usage Prisma ownership passed. |
| 10 | Real OpenAI LLM/agent-flow failure | None | `FR-001` | Fail | No | API/E2E fixture used an unregistered model. |
| 11 | Importer/no-automatic-update implementation at `6693846` | Prior findings | `CR-012`–`CR-014` | Fail | No | Projection, non-mutating inspection, and exact status defects. |
| 12 | Architecture-round-13 rework at `3fdaf0c` | `CR-012`–`CR-014` | `CR-015` | Fail | No | Parser-leading-form gap and stale nested lock. |
| 13 | Rework at `96fb1a8` | `CR-012`, `CR-015` | None | Fail | No | CR-015 resolved; multiline assignment gap remained. |
| 14 | Rework at `5b3c1b5` | `CR-012` | None | Pass | No | Complete dotenv assignment masking passed source review. |
| 15 | Round 6 restart API/E2E failure | None | `CR-016` | Fail | No | Built-in default initialization automatically appended to `.env`. |
| 16 | CR-016 rework at `977948f` | `CR-016` | None | Pass | No | Runtime default became non-persistent. |
| 17 | Round 7 Docker API/E2E failure | None | `CR-017` | Fail | No | Initial evidence attributed a stale local base to packaging. |
| 18 | Current-image refresh evidence | `CR-017` | None | Fail | No | Reclassified to API/E2E environment state pending rerun. |
| 19 | Recognize-first importer rework at `5db1385` | `CR-017` | `CR-018` | Fail | No | Docker issue resolved; importer selection-order defect remained. |
| 20 | CR-018 rework at `4c9f017` | `CR-018` | None | Pass | No | Selected-assignment validation follows positive alias recognition. |
| 21 | Empty-as-absent implementation at `9e9315d` | None | None | Pass | No | Approved importer correction passed source review. |
| 22 | User-raised Codex authentication review at unchanged `9e9315d` | None | `CR-019` | Fail | No | Codex target authentication contract was unresolved. |
| 23 | Round 10 real-provider failure at unchanged `9e9315d` | `CR-019` | `CR-020` | Fail | No | Vertex Express LLM/media mode was lost; AutoByteus endpoint was unavailable. |
| 24 | Architecture-round-18 rework at `ad629bc` | `CR-019`, `CR-020` | `CR-021` | Fail | No | Codex and LLM/media corrections were sound; review incorrectly inferred a metadata failure from the endpoint difference. |
| 25 | User clarification and direct reviewed-base comparison | `CR-021` | None | Fail — Requirement Gap only | No | Source-defect inference withdrawn; artifacts required reconciliation. |
| 26 | Architecture-round-19 artifact reconciliation at unchanged `ad629bc` | `CR-021` and all preserved findings | None | Pass | No | Cumulative source matches the now-explicit distinct LLM/media and metadata contracts. |
| 27 | Architecture-round-22 CR-021 implementation at `ab82847` | Post-review CR-021 Design Impact and all preserved findings | None | Pass | Yes | AI Studio-only live metadata, Vertex curated-only strategies, exact provenance propagation, and clean provider rename pass full source review. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 25 | `CR-021` | Medium / Requirement Gap | Resolved | Architecture round 19 passed after requirements, design, consumer mapping, backend contract, test plan, and threat model were reconciled to the original dual-key metadata contract. Current metadata source is unchanged from the previously inspected implementation. | No metadata source redesign, mode DTO, endpoint change, alias, retry, or fallback is authorized or needed. |
| 23 | `CR-019` | High | Remains resolved | `CodexAppServerClient.start()` is identical to reviewed base and uses `env: this.options.env ?? process.env`; no Store/account owner exists under Codex source. | Codex remains explicitly outside the child-environment portion of `LOCAL_HARDENED`. |
| 23 | `CR-020` | High | Remains resolved | Exact `geminiAiStudio`, `geminiVertexExpress`, and `geminiVertexProject` variants reach the Google SDK as `{apiKey}`, `{vertexai:true,apiKey}`, and `{vertexai:true,project,location}` for LLM/media. | The metadata contract is deliberately separate and recorded under `CR-MP-022`. |
| 1–20 | `CR-001`–`CR-018`, `FR-001` | Mixed | Remain resolved | Round-18/19 scope does not alter their owned paths; focused preservation checks and production build are green. | No prior finding reopened. |

## Review Scope

- Changed implementation and behavior reviewed: the cumulative source at `ad629bc`, emphasizing exact Codex pre-ticket launch preservation and exact Gemini authentication-mode propagation through LLM/media construction.
- Preserved behavior reviewed: exact Store-backed Gemini metadata consumer selection, the established Generative Language request/mapping, live-over-curated merge, and zero metadata secret lookup for Vertex Project.
- Files / areas reviewed: all nine Round-18 changed implementation files; the three metadata production files; affected focused tests; requirements/design/supplements; architecture round-19 report; implementation handoff; diff, ownership, residue, target-shape, and source-size evidence.
- Explicit exclusions: no real Codex account, provider credential, Store value, secret-bearing source, browser, Docker runtime, external provider request, or database value was accessed. Dirty downstream-owned tests/reports/evidence were preserved and not reset.
- Independent checks: 9 core files / 55 tests passed; 3 server files / 15 tests passed; production server build passed including shared/core builds, Prisma 5.22 generation, built-in bootstrap, and sanitized no-`DATABASE_URL` smoke; `git diff --check`, source-size, stale-mode, Codex-base-equality, metadata-round-equality, and two-field construction-target checks passed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Codex retains external `codex login` environment/home ownership; LLM/media preserve exact Gemini SDK modes; metadata retains its separate selected-key Generative Language contract; no ambient alias, cross-definition retry, Store fallback, or Vertex Project key inference exists.
- Design-spec behavior map verified against the implementation: yes. The previously conflicting metadata wording is now reconciled across all behavior-defining artifacts.
- Design review report and round confirmed: architecture round 19 `Pass`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior, if any: none.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-002` | Confirmed | User selects Codex runtime -> client manager -> `CodexAppServerClient.start()` -> `options.env ?? process.env` -> real HOME/CODEX_HOME -> external Codex account state -> model/thread/turn result or sanitized failure. | None. Source is identical to reviewed base for this path. |
| `BEH-003` — LLM/media | Confirmed | Gemini LLM/media action -> provisioning reads explicit setup mode -> exact Store consumer or project/location -> closed resolved variant -> factory/client -> `initializeGeminiClientWithRuntime` -> exact Google SDK options -> provider result/failure. | None. Official Google documentation independently confirms `vertexai:true` plus `apiKey` for Vertex Express; source and focused tests implement that shape. |
| `BEH-003` — metadata / `DS-UC008C` | Confirmed | Model-list/reload -> model catalog -> metadata provisioning -> exact AI Studio or Vertex Express Store consumer -> trusted reveal -> existing Generative Language request/mapping -> resolver live-over-curated merge -> returned catalog. Vertex Project builds no live provider and performs zero metadata secret lookup. | None. This is the explicit round-19 contract and the direct origin/personal behavior. |
| `BEH-004` | Confirmed | Canonical Store-backed API/E2E path can execute configured exact capabilities without value readback; execution results must distinguish Pass/Fail/Unavailable. | Downstream execution remains required; source is ready for it. |
| `BEH-013` | Confirmed | Declared AutoByteus host plus exact Store consumer reaches discovery/construction; external DNS unavailability remains an allowed exact result under AC-019(f). | No alternate endpoint or ambient fallback is authorized. |
| `BEH-014`, `BEH-015` | Confirmed | Recognize-first/empty-as-absent importer and exact unpatched `repository_prisma@1.0.8` remain unchanged. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Architecture round 19 reconciles the prior artifact gap and retains a complete behavior/risk/test posture. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Source matches the exact LLM/media mode contract, separate metadata contract, Codex exclusion, Store mapping, and assurance boundaries. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Codex, Gemini LLM/media, metadata, importer, Store, and external-capability spines have supported triggers, owners, and outcomes. | None. |
| Ownership boundary preservation and clarity | Pass | Provisioning owns secret/mode resolution; factories/providers own client/request construction; Codex owns its external auth state. | None. |
| Off-spine concern clarity | Pass | Store resolution, metadata enrichment, curated merge, and SDK adaptation serve explicit spine owners. | None. |
| Existing capability/subsystem reuse check | Pass | Existing provisioning, factory, metadata-provider, and resolver owners are reused; no parallel subsystem was added. | None. |
| Reusable owned structures check | Pass | LLM/media share one tight resolved-authentication union and one Gemini client initializer. | None. |
| Shared-structure/data-model tightness check | Pass | Construction targets retain exactly `credentialProviderId` and `authenticationRequirement`; `modelIdentifier` remains separate. | None. |
| Repeated coordination ownership check | Pass | Gemini option mapping is centralized; metadata selection/request/merge each have a single owner. | None. |
| Empty indirection check | Pass | No pass-through-only boundary was introduced. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Runtime launch, provisioning, factory construction, metadata request, and merge concerns remain distinct. | None. |
| Ownership-driven dependency check | Pass | Server orchestration depends on public provisioning/contracts; core construction remains storage-neutral. | None. |
| Authoritative Boundary Rule check | Pass | No caller combines `SecretManagementService` with its backend internals or bypasses its authority. | None. |
| File placement check | Pass | Runtime, server provisioning, core construction, and metadata files remain under their owning subsystems. | None. |
| Flat-vs-over-split layout judgment | Pass | The existing layout expresses the distinct contracts without artificial new folders or wrappers. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | Closed mode variants are explicit for LLM/media; metadata accepts one already-selected key at its request boundary. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | `geminiAuthenticationMode` and exact resolved variants communicate their purpose; metadata names remain accurate for its separate contract. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | One shared helper maps Gemini construction modes; metadata intentionally retains its different adapter rather than duplicating SDK construction. | None. |
| Patch-on-patch complexity control | Pass | Codex uses one restored expression; Gemini uses one closed switch; no compatibility or inference branches exist. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Ticket-added Codex helper use and stale Google mode names are absent. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Focused tests prove exact modes, invalid/generic rejection, two-field targets, provisioning selection, and Codex environment preservation. | API/E2E must prove the prescribed real paths. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Constructor captures and synthetic environment fixtures are focused and reused. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | No compatibility-only fixture or alternate mode path is present. | None. |
| API/E2E readiness for the next workflow stage | Pass | Source, focused tests, build, structure, and artifact contract are green; remaining obligations are executable validation, not source gaps. | Resume API/E2E. |

## Source File Size And Structure Audit

Round-18 deltas are measured from `9e9315d58dbd164dc080b1270ef8b7fc9de4ba1c` to `ad629bc55ed5c653db957ce46bdbc5092c7738ac`. Tests, reports, manifests, locks, and evidence are excluded.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/media/media-client-provisioning-service.ts` | 81 | Pass | Pass (`8+/4-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/services/llm-provisioning-service.ts` | 74 | Pass | Pass (`5+/3-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | 338 | Pass | Pass (`1+/2-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/llm-construction-context.ts` | 48 | Pass | Pass (`5+/6-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | 498 | Pass | Pass (`4+/4-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/multimedia/audio/audio-client-factory.ts` | 227 | Pass | Pass (`1+/1-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/multimedia/image/image-client-factory.ts` | 227 | Pass | Pass (`5+/5-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/multimedia/video/video-client-factory.ts` | 122 | Pass | Pass (`1+/1-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/utils/gemini-helper.ts` | 37 | Pass | Pass (`24+/18-`) | Pass | Pass | None | None. |

Inspected unchanged participant files also pass ownership/placement review: `model-metadata-provisioning-service.ts` (86 effective non-empty lines), `gemini-model-metadata-provider.ts` (46), and `model-metadata-resolver.ts` (126).

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Codex is the one preserved current path; Gemini has no alternate-mode fallback. |
| No legacy old-behavior retention in changed scope | Pass | No stale Google mode names, ambient credential aliases, or former Codex helper path remains. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Obsolete imports and ticket-added Codex launch helper use are removed. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Round-18/19 changes do not alter persisted data; approved importer/no-automatic-update decisions remain intact. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | None found. |
| Approved transition mechanics match the reviewed design | Pass | No migration or compatibility mechanism was added. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: operator/release documentation must retain the exact Gemini mode distinction, separate metadata behavior, Codex assurance exclusion, capability-result semantics, and `EXT-ANTHROPIC-AGENT-SDK-AUTH` recheck.
- Files or areas likely affected: existing delivery docs/release notes and operator secret-provisioning guidance; no new source-review blocker.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-001`–`MP-005` | Confirmed | Store integrity, Claude release recheck, no automatic update, exact dependency, and empty-as-absent decisions remain unchanged. |
| `MP-006` | Confirmed and satisfied | The exact pre-ticket Codex environment/home path is restored without a new auth owner. |
| `MP-007` | Confirmed and satisfied | Exact AI Studio, Vertex Express, and Vertex Project modes reach LLM/media SDK construction. |
| `CR-MP-021` | Confirmed / no defect effect | AutoByteus endpoint unavailability remains an allowed exact external capability result under AC-019(f). |
| `CR-MP-022` | Reclassified and satisfied | Architecture round 19 establishes the reachable model-list/reload path while withdrawing the unsupported necessary-failure inference. Current source matches the preserved dual-key metadata contract. |

### `CR-MP-022` — configured Vertex Express model listing reaches the preserved dual-key metadata endpoint

- Origin: reclassified from code-review round 24 and architecture round 19.
- Related approved requirement or established contract: `BEH-003`, `REQ-005`, `REQ-011`, `AC-005`, `AC-006`, `AC-010`, UC-008 / DS-UC008C.
- Relevant behavior ID(s): `BEH-003`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: the provider Settings surface selects Vertex Express and the user opens a supported model selector/provider view or invokes model reload.
- Support evidence: web model-list/reload reaches `LlmProviderService` and `ModelCatalogService`; direct reviewed-base comparison establishes the original dual-key Generative Language provider/resolver behavior; current source replaces ambient precedence with exact Store consumer selection; the user confirms the original product path works.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Settings/model selector or reload -> GraphQL / `LlmProviderService` -> `ModelCatalogService` -> `ModelMetadataProvisioningService` -> explicit setup mode -> exact AI Studio or Vertex Express Store consumer -> trusted reveal -> `GeminiModelMetadataProvider` -> established Generative Language models request/mapping -> `ModelMetadataResolver` live-over-curated merge -> returned catalog.
- Lifecycle preconditions and material consequence at the claimed point: Store ready and selected definition configured. The endpoint differs from LLM/media SDK construction, but that difference does not establish failure and cannot justify its own redesign. Vertex Project deliberately creates no live provider and performs zero metadata secret lookup.
- Reachability: `Reachable`.
- Review consequence / proportionate response: preserve the current metadata owner/request/merge path; do not add SDK-mode DTOs, alternate definitions, inference, retry, aliases, Store fallback, or endpoint redesign. Validate the real path downstream without treating absence of a live response as proof of a source-mode defect.

## Review Scorecard

- Overall score (`/10`): `9.44`
- Overall score (`/100`): `94.4`
- Score calculation note: simple average across the mandatory categories; the decision follows the checks/findings, not the average.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Supported Codex, Gemini LLM/media, and metadata paths are now distinct and complete from trigger to consequence. | Runtime evidence for all paths is downstream rather than source-review evidence. | Execute the prescribed matrix and record exact outcomes. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Secret selection, SDK construction, metadata request/merge, and external Codex state each have one owner. | Several owners participate in the full provider journey, increasing review surface. | Preserve the existing boundaries and avoid cross-owner shortcuts. |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | LLM/media use a closed semantic union and two-field target; metadata accepts one selected key at its established request boundary. | Metadata's distinct contract requires careful documentation to prevent future conflation. | Keep tests and docs explicit about the distinction. |
| `4` | `Separation of Concerns and File Placement` | 9.5 | Runtime, provisioning, client factories, provider adapter, and resolver concerns are well placed. | The catalog flow spans server and core packages. | Keep integration tests at the boundary and avoid moving ownership into callers. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | The exact shared mode union is tight and not forced onto the intentionally different metadata contract. | Future Gemini modes would require coordinated updates. | Retain exhaustive switches and registry tests. |
| `6` | `Naming Quality and Local Readability` | 9.5 | Exact variant and requirement names make authentication intent explicit. | Provider-specific semantics are necessarily verbose. | Preserve explicit names rather than generic aliases. |
| `7` | `API/E2E Readiness` | 9.1 | Focused tests and production build are green, and artifacts name the remaining real checks precisely. | Real Vertex LLM/media, dual-key metadata, Vertex Project zero lookup, and Codex account/turn remain unclaimed. | Run those checks and report Pass/Fail/Unavailable truthfully. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.3 | Source matches the approved original Codex and metadata behavior and exact corrected LLM/media modes. | External provider behavior cannot be fully established by source review. | Confirm through value-safe real execution. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | No fallback, alias, dual path, or version-specific runtime machinery was introduced. | Historical context remains extensive in review artifacts. | Keep production source free of historical branches. |
| `10` | `Cleanup Completeness` | 9.5 | Stale mode names/helper use are absent; source/deltas satisfy guardrails. | Downstream dirty test/report state still awaits its later workflow stages. | Preserve it until API/E2E and proportional review complete. |

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- Real Vertex Express LLM/audio/image, the separate dual-key metadata request/catalog path, Vertex Project metadata zero-lookup/curated behavior, and Codex account/model/turn continuity remain downstream API/E2E obligations and are not claimed by this source review.
- AutoByteus remote LLM/audio/image may remain externally unavailable at the declared endpoint; AC-019(f) permits that exact result and no alternate host is authorized.
- Serper and other unconfigured capabilities remain unclaimed.
- Downstream durable test changes require the separate proportional test-code review only after API/E2E passes.
- Claims remain `LOCAL_HARDENED`; Codex is excluded from its child-environment portion, and `STRONG_AGENT_ISOLATION` remains deferred.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains mandatory in every later handoff as a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Exact unpatched `repository_prisma@1.0.8`, no automatic update, unchanged Docker topology, target isolation, source immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass`
- Score Summary: `9.44/10` (`94.4/100`); every mandatory category is at or above `9.0`.
- Failure Origin: N/A.
- Recommended Recipient: `api_e2e_engineer`
- Notes: `CR-021` is resolved as an artifact-only Requirement Gap with no metadata source redesign. Source at `ad629bc55ed5c653db957ce46bdbc5092c7738ac` is ready for API/E2E. Preserve the explicit Codex assurance exclusion, exact Gemini LLM/media modes, separate metadata contract, and all mandatory downstream dependencies.


---

# Review Round 27 — CR-021 Gemini Metadata Strategy / Provenance Refactor

This section supersedes the historical Round 26 result and the later post-review Design Impact for the current implementation source. Earlier rounds remain evidence history.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Current Review Round: `27`
- Trigger: architecture round 22 passed the user-approved explicit Gemini metadata service separation after AR-015's official-source correction; implementation changed from `ec4c64a1c27805a0781f98c7915fcd60f649326d` to `ab82847e987646aadb8c38e2400270196f00dbb3`.
- Prior Review Round Reviewed: round 26 plus the post-review `CR-021` Design Impact supersession.
- Latest Authoritative Round: `27`
- Requirements, investigation, design, all still-relevant supplements, architecture round 22, and the current implementation handoff were reviewed from their canonical ticket paths.
- Coverage / execution reports: retained as historical context only; this is a full source-review entry point.
- Failing Scenario IDs / commands / evidence: N/A.

## Prior Findings Resolution Check

| Prior Round / State | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Post-review supersession after round 26 | `CR-021` | Design Impact | Resolved | Architecture round 22 confirms AI Studio `LIVE_WITH_CURATED_FALLBACK`, Vertex Express/Project `CURATED_ONLY`, exact provenance, and unchanged LLM/media. Source at `ab82847e` implements those owners and contracts. | The historical round-19 artifact-only preservation is superseded; the current user-approved refactor is authoritative. |
| Architecture round 21 | `AR-015` / `MP-008` | Medium source-validity gap | Resolved upstream and confirmed | Architecture round 22 uses the current Preview Express overview/API reference and keeps the Developer API `models.list` contract separate. | No implementation mechanism depends on the deprecated source. |
| Rounds 1–26 | `CR-001`–`CR-020`, `FR-001` | Mixed | Remain resolved | CR-021 source does not alter importer, Store, Prisma, Docker, Claude, Codex, AutoByteus, or LLM/media construction paths; focused preservation tests and production builds pass. | No prior source defect reopened. |

## Review Scope

- Changed implementation and behavior reviewed: the bounded Gemini metadata strategy/provider/provenance refactor at `ab82847e987646aadb8c38e2400270196f00dbb3`.
- Files / areas reviewed: core metadata strategy/resolver/provider/model contract; server metadata provisioning and GraphQL projection; generated/query/web store propagation; all changed focused tests; current requirements, design, supplements, architecture report, and implementation handoff.
- Explicit exclusions: API/E2E, real AI Studio/Vertex requests, browser, Docker, canonical Store, provider credentials, secret-bearing sources, and real Codex state were not accessed. Generated GraphQL output and tests were inspected but excluded from source-size thresholds. Pre-existing downstream-owned dirty artifacts were preserved.
- Independent checks: core metadata/helper `3 files / 17 tests` passed; server metadata/GraphQL plus LLM/media preservation `4 files / 32 tests` passed; web store `1 file / 9 tests` passed; server production build passed including Prisma generation and sanitized no-`DATABASE_URL` smoke; web Nuxt production build passed with 15 prerendered routes; `git diff --check` passed; HEAD remained exact.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: user-visible model list/reload must distinguish verified live metadata from shared curated fallback and intentional curated-only behavior without exposing credentials or raw failures. Exact LLM/media Google SDK construction remains unchanged.
- Design-spec behavior map verified against implementation: yes. `DS-UC008C` is implemented from the supported model-list/reload surface through GraphQL/catalog/provisioning, exact strategy, optional AI Studio provider or zero-operation Vertex branch, resolver, `ModelInfo`, GraphQL, and web model-list state.
- Design review report and round confirmed: architecture round 22 `Pass`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: none beyond the approved CR-021 target.
- Remaining material ambiguity: none for first delivery; any future live Vertex listing remains a separate evidence/design decision.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-003` / `DS-UC008C` | Confirmed | Web model list/reload -> GraphQL / `LlmProviderService` -> `ModelCatalogService` -> `ModelMetadataProvisioningService` -> explicit setup-mode strategy -> AI Studio exact metadata consumer and `GeminiDeveloperApiModelMetadataProvider`, or Vertex zero-lookup/zero-HTTP `CURATED_ONLY` -> `ModelMetadataResolver` merge/failure containment -> provenance -> `ModelInfo` -> GraphQL -> web store. | None. |
| `BEH-003` — LLM/media | Confirmed unchanged | The CR-020 provisioning/helper/factory files have no round-22 source delta; exact AI Studio, Vertex Express, and Vertex Project SDK option shapes remain intact. | None. |
| `BEH-004` | Confirmed | The returned provenance is a closed value-free enum; no key, endpoint selector, definition ID, or raw provider failure crosses the model-list contract. | Real execution remains downstream evidence. |
| `BEH-002`, `BEH-012`–`BEH-015` | Confirmed unchanged | Codex, Claude, AutoByteus, importer, dependency, Store, and Docker owners are outside the bounded diff and retain the reviewed contracts. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Architecture round 22 records the observed 403/fallback path, current official service contracts, bounded refactor, and deferred future Vertex listing decision. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Exact AI Studio consumer/provider, both Vertex curated-only branches, resolver provenance, and GraphQL/web projection match all current supplements. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | `DS-UC008C` spans the supported web trigger through the authoritative owners to returned provenance; unchanged LLM/media remains a separate spine. | None. |
| Ownership boundary preservation and clarity | Pass | Provisioning selects/caches strategy; the narrowed provider owns one Developer API request/mapping; resolver owns load cache, merge, containment, and provenance. | None. |
| Off-spine concern clarity | Pass | Secret resolution and the provider adapter serve provisioning; curated lookup and timeout handling serve the resolver without competing for orchestration. | None. |
| Existing capability/subsystem reuse check | Pass | Existing provisioning, resolver, model-list GraphQL, and web store owners are extended rather than duplicated. | None. |
| Reusable owned structures check | Pass | One closed strategy union and one resolution/provenance result are reused across providers and transport projection. | None. |
| Shared-structure/data-model tightness check | Pass | Strategy has only live-with-provider/null or curated-only; result carries only resolved limits plus one enum. No endpoint/key option bag or LLM/media union leakage exists. | None. |
| Repeated coordination ownership check | Pass | Mode selection exists once in server metadata provisioning; live load/merge/provenance policy exists once in the resolver. | None. |
| Empty indirection check | Pass | Every changed boundary owns selection, request mapping, resolution policy, or transport projection. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | AI Studio request mapping, Store/mode provisioning, resolution policy, model contract, GraphQL, and web typing are separated by responsibility. | None. |
| Ownership-driven dependency check | Pass | Core remains storage-neutral; server provisioning alone accesses secret management; GraphQL depends on returned model state, not storage/provider internals. | None. |
| Authoritative Boundary Rule check | Pass | No caller reaches both `SecretManagementService` and a backend/internal repository; provider and resolver cannot select or bypass storage. | None. |
| File placement check | Pass | Renamed provider stays in core metadata, orchestration in server LLM management, transport in GraphQL, and client typing in web store/query paths. | None. |
| Flat-vs-over-split layout judgment | Pass | The bounded existing layout makes the three metadata responsibilities explicit without introducing placeholder modules or artificial depth. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | `ProviderModelMetadataStrategy`, `ModelMetadataResolution`, and nullable `metadataProvenance` each represent one subject with closed identity/semantics. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | `GeminiDeveloperApiModelMetadataProvider`, `LIVE`, `CURATED_FALLBACK`, and `CURATED_ONLY` remove the former cross-service ambiguity. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | One shared resolver retains merge/containment; no Vertex adapter, alternate endpoint, or duplicate fallback owner was added. | None. |
| Patch-on-patch complexity control | Pass | The change is a clean strategy extension and atomic provider rename, not a compatibility wrapper or conditional retry stack. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | `gemini-model-metadata-provider.ts`, `GeminiModelMetadataProvider`, and stale imports/exports are absent; no wrapper remains. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests prove AI Studio exact consumer and live/fallback causes, Vertex zero lookup/HTTP, resolver caching/timeout/no-match, GraphQL propagation, web preservation, and unchanged LLM/media. | API/E2E must independently prove the real/assembled paths. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Synthetic lookup/model fixtures and Store bootstrap helpers are localized and reused across coherent scenario groups. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Old ambiguous provider test was replaced by the renamed provider test; no compatibility-only path remains. | None. |
| API/E2E readiness for the next workflow stage | Pass | Focused tests, both production builds, generated contract, clean diff checks, and complete downstream obligations are present. | Resume API/E2E at exact HEAD. |

## Source File Size And Structure Audit

Round-22 deltas are measured from `ec4c64a1c27805a0781f98c7915fcd60f649326d` to `ab82847e987646aadb8c38e2400270196f00dbb3`. Tests and generated GraphQL are excluded from thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | 401 | Pass | Pass (`19+/1-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` | 107 | Pass | Pass (`51+/31-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/metadata/gemini-developer-api-model-metadata-provider.ts` | 45 | Pass | Pass (`57+/0-`; rename-aware content delta is smaller) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | 172 | Pass | Pass (`46+/10-`) | Pass | Pass | None | None. |
| `autobyteus-ts/src/llm/models.ts` | 146 | Pass | Pass (`2+/0-`) | Pass | Pass | None | None. |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | 167 | Pass | Pass (`1+/0-`) | Pass | Pass | None | None. |
| `autobyteus-web/stores/llmProviderConfigSupport.ts` | 117 | Pass | Pass (`2+/0-`) | Pass | Pass | None | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The old provider is renamed/removed with no wrapper or re-export. |
| No legacy old-behavior retention in changed scope | Pass | Vertex keys cannot reach the Developer API metadata provider; no dual metadata path remains. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Old file/class/import names and configurable endpoint constructor are absent. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Provenance is ephemeral returned model data; Store/schema/persisted setup data are unaffected. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | None found. Curated fallback is current source policy, not compatibility behavior. |
| Approved transition mechanics match the reviewed design | Pass | Atomic rename and direct strategy replacement match the change/removal map. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: operator/developer documentation should explain AI Studio live-or-fallback versus Vertex curated-only provenance and must not imply curated results are live provider metadata.
- Files or areas likely affected: existing LLM-management/operator documentation, delivery handoff, and release notes; refresh belongs to delivery after API/E2E and proportional test review.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-001`–`MP-007` | Confirmed | CR-021 does not alter the previously reviewed Store, Claude, legacy-source, dependency, importer, Codex, or exact LLM/media premises. |
| `MP-008` / `AR-015` | Confirmed and satisfied | Architecture round 22 uses the current Preview Express overview/API reference and the separate Developer API list contract; source implements that exact bounded separation. |
| `CR-MP-022` | Confirmed and satisfied by current target | Supported model list/reload previously sent a Vertex Express key to the Developer API and observed HTTP 403 plus curated fallback. The user-approved target now prevents that cross-service request and reports exact provenance. |

No new or reclassified material premise arose during implementation review.

## Review Scorecard

- Overall score (`/10`): `9.58`
- Overall score (`/100`): `95.8`
- Score calculation note: simple average across the ten mandatory categories; decision follows the actual checks and findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.6 | The supported model-list/reload path is complete from web trigger through strategy/provider/resolver to returned provenance. | Real execution evidence is downstream rather than source-review evidence. | Execute the prescribed assembled/real matrix. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.7 | Strategy, request mapping, resolution policy, storage, transport, and client state have explicit non-bypassed owners. | The flow necessarily crosses core/server/web packages. | Preserve these boundaries in downstream fixes. |
| `3` | `API / Interface / Query / Command Clarity` | 9.6 | Closed strategy/result contracts and nullable value-free provenance have singular meanings. | Client-facing provenance is intentionally optional for non-enriched model categories. | Keep null semantics explicit in docs/tests. |
| `4` | `Separation of Concerns and File Placement` | 9.7 | The small refactor separates Google service contract, server selection, shared fallback, and projection without touching LLM/media. | Cross-package codegen remains a coordination point. | Keep schema/codegen validation in the workflow. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.6 | No option bag or mostly-optional union exists; one tight strategy and one result enum are reused. | Future live Vertex listing would require a separately approved strategy extension. | Do not add a placeholder before that contract exists. |
| `6` | `Naming Quality and Local Readability` | 9.7 | The renamed Developer API provider and exact provenance values remove the prior ambiguity. | Provider-specific names are necessarily explicit. | Preserve explicit service-boundary names. |
| `7` | `API/E2E Readiness` | 9.2 | Focused tests and both production builds pass; downstream scenarios are precise. | Real AI Studio availability may be missing; assembled zero-lookup and provenance still require execution evidence. | Run all applicable scenarios and report Pass/Unavailable exactly. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | Source enforces exact AI Studio and Vertex behavior and preserves CR-020 construction. | External provider responses and real catalog behavior are not established by source review. | Validate AI Studio live/fallback and Vertex curated-only paths independently. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.7 | Old provider naming/contract is removed with no wrapper, retry, or dual path. | Historical artifacts remain extensive but are not production machinery. | Keep future changes clean-cut. |
| `10` | `Cleanup Completeness` | 9.6 | Stale names and cross-service bindings are absent; diffs and size guardrails pass. | Delivery docs must be refreshed after validation. | Complete downstream test review and docs sync. |

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- API/E2E must prove: AI Studio exact-consumer Developer API live match when available and `CURATED_FALLBACK` for unavailable/failure/timeout/no-match; Vertex Express and Vertex Project `CURATED_ONLY` with zero Gemini metadata lookup/request; provenance through assembled GraphQL/web state; and unchanged real Vertex Express LLM/audio/image behavior. Curated availability must not be counted as `LIVE`.
- Existing broader obligations remain: applicable importer, restart, unchanged-Docker, configured real-provider, external Codex, AutoByteus exact capability, cleanup, and evidence-safety matrix.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, no automatic update, unchanged Docker topology, target isolation, source immutability, and `DASHSCOPE_API_KEY` as sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass`
- Score Summary: `9.58/10` (`95.8/100`); every mandatory category is at or above `9.0`.
- Failure Origin: N/A.
- Recommended Recipient: `api_e2e_engineer`
- Notes: Full source review passes at exact HEAD `ab82847e987646aadb8c38e2400270196f00dbb3`. CR-021 now implements the user-approved explicit Google metadata separation with no LLM/media change. Earlier API/E2E and proportional-test Passes are historical; the changed implementation requires a new API/E2E run and a later proportional durable-test review before delivery.

---

# Review Round 28 — Provider-Owned Point-of-Use API-Key Resolver Clean Cut

This section is the latest authoritative implementation-source review. Earlier rounds remain historical evidence.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Supplemental Task Artifacts Reviewed As Context: `use-case-spine-validation.md`, `secret-storage-architecture.md`, `secret-storage-backend-contract.md`, `credential-consumer-mapping.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, and `repository-prisma-1.0.8-assessment.md` at the canonical ticket path.
- Current Review Round: `28`
- Trigger: architecture round 24 passed the provider-owned resolver clean-cut design; implementation source/test changed from `ab82847e987646aadb8c38e2400270196f00dbb3` to `62b4c2c3e4b032eab1bd8c7cfb78d2d4cdeaf88a`, with final handoff HEAD `63c57237c5ad63afc9ff126ca7a1f01e3d7f2192`.
- Prior Review Round Reviewed: round 27 and all prior findings.
- Latest Authoritative Round: `28`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture round 24 `Pass`).
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation / Execution Coverage Report: historical downstream context only for this implementation-review entry point.
- Failing Scenario IDs / Commands / Evidence: N/A.

## Round History

Add this row to the cumulative history above:

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 28 | Architecture-round-24 implementation at `62b4c2c` / handoff `63c5723` | `CR-001`–`CR-021`, `FR-001` | `CR-022` | Fail | Yes | Provider-owned lazy resolution is structurally sound, but Gemini Settings can report success without durable cross-resource reconciliation or the required stable mismatch outcome. |

## Prior Findings Resolution Check

| Prior Round / State | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Round 27 / architecture round 22 | `CR-021` | Design Impact, then resolved | Remains resolved | AI Studio live/fallback and Vertex curated-only metadata owners/provenance remain separated; the round-24 refactor retains those contracts while changing only runtime credential delivery ownership. | No metadata endpoint, fallback, or provenance regression found. |
| Rounds 1–26 | `CR-001`–`CR-020`, `FR-001` | Mixed | Remain resolved | Importer, Store custody, no automatic update, Prisma ownership, exact `repository_prisma@1.0.8`, Docker, Codex, Claude, AutoByteus discovery, restart, and previous provider-mode corrections either have no round-24 delta or pass focused preservation scans/builds. | No prior finding reopened. |

## Review Scope

- Changed implementation and behavior reviewed: the complete provider-owned resolver clean cut, subject-scoped server adapters, every changed native/gateway/custom LLM and media construction path, Gemini derived selection and Settings configuration owner, catalog/metadata containment, removed construction/provisioning machinery, and Electron `tmp` lifecycle.
- Files / areas reviewed: all 55 changed implementation-source files plus removed implementation files, affected public exports, all 36 changed/focused unit-test files, and downstream stale-harness residue recorded in the handoff.
- Explicit exclusions: no API/E2E, browser, Docker runtime, packaged Electron launch, canonical Store, credential source/value, real provider, or external account was accessed. Preserved downstream-owned dirty reports, tests, and evidence were not reset or incorporated into implementation source.
- Independent checks: core changed-unit suite `27 files / 159 tests` passed; server focused suite `8 files / 53 tests` passed; Electron AppData suite `1 file / 14 tests` passed; core build, server production build (including Prisma generation, built-in bootstrap, and sanitized no-`DATABASE_URL` smoke), and Electron transpile passed; `git diff --check`, old-construction residue, provider-secret environment-read, source-size, and Docker-delta checks passed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: model/config/catalog state carries no credential routing; one storage-neutral resolver crosses core/server composition; concrete provider clients resolve their intrinsic provider/slot lazily and reveal only at SDK construction; Gemini derives exact priority from status/non-secret facts; Settings commands reconcile inactive facts without persisting a mode; catalogs remain credential-independent; Electron owns `tmp`.
- Design-spec behavior map verified against implementation: substantially yes, except the supported Gemini Settings save/restart lifecycle contradicts the approved reconciliation result described under `CR-022`.
- Design review report and round confirmed: architecture round 24 `Pass`.
- Behavior-basis status: `Contradicted` for the bounded Settings reconciliation outcome; otherwise `Confirmed`.
- Changed or newly discovered behavior: none. `CR-022` concerns an already-approved supported Settings action and failure contract, not a new behavior.
- Remaining material ambiguity: none; the approved artifacts explicitly require stable reconciliation-required failure and retry safety without claiming a cross-resource transaction.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-003`, `AC-005` — LLM/media invocation | Confirmed | Agent/media action -> server subject-scoped resolver -> model/config-only factory -> concrete provider lazy client -> exact provider/slot resolve -> trusted reveal -> provider SDK. Gemini applies `Vertex Express > complete Vertex Project > AI Studio > unconfigured`, resolves only the selected slot, and uses exact Google SDK shapes. | None. |
| `BEH-003`, `AC-005` — Gemini Settings reconciliation | Contradicted | Settings/API Key Management save -> GraphQL `setGeminiSetupConfig` -> `LlmProviderService.setGeminiSetup` -> `GeminiConfigurationService.setSetup` -> selected Store write + inactive Store/AppConfig cleanup -> returned setup status. | `setSetup` neither verifies that the derived selection matches command intent nor emits `GEMINI_SETUP_RECONCILIATION_REQUIRED`. `AppConfig.set/delete` intentionally swallow `.env` persistence errors and apply only session state, so GraphQL can return success although restart selects stale/partial configuration. See `CR-MP-023` and `CR-022`. |
| `BEH-003` — metadata/catalog | Confirmed | Built-in/base catalog -> total optional metadata provisioning -> AI Studio exact metadata consumer or Vertex/unconfigured curated-only -> provenance projection. Optional custom/remote source failures are independently contained. | None. |
| `BEH-006`, `REQ-012` | Confirmed | Electron app-data initialize/first-run/validate/reset uses the same required `db/logs/download/tmp` set; reset preserves only `secret-store` and recreates required directories. | Packaged execution remains downstream evidence. |
| `BEH-009`, `REQ-011` | Confirmed | Core `ProviderApiKeyResolver` is storage-neutral; server adapters bind `llm`, `llmMetadata`, or exact media kind and delegate only through `SecretManagementService`; no global resolver or construction-auth DTO remains. | None. |
| `BEH-013` | Confirmed | AutoByteus discovery retains its model-kind consumer; remote invocation clients intrinsically request `AUTOBYTEUS` regardless of displayed downstream provider. | None. |
| `BEH-002`, `BEH-012`, `BEH-014`, `BEH-015` | Confirmed unchanged | Codex, both Claude modes, recognize-first/empty-as-absent importer, and exact unpatched package policy have no conflicting round-24 implementation delta. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Architecture round 24 defines the clean cut, removal map, exact Gemini policy, catalog separation, and Electron lifecycle. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Resolver/provider/catalog/Electron contracts match, but `credential-consumer-mapping.md` and design require verified Settings reconciliation and stable `GEMINI_SETUP_RECONCILIATION_REQUIRED`; source omits both. | Resolve `CR-022`. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Invocation, Settings, catalog, metadata, AutoByteus, and Electron spines retain supported triggers and clear owners. | None. |
| Ownership boundary preservation and clarity | Pass | Concrete providers own provider/slot and SDK initialization; server owns subject binding; management owns custody. | None. |
| Off-spine concern clarity | Pass | Status selection, metadata enrichment, discovery, and cleanup serve explicit main-line owners. | None. |
| Existing capability/subsystem reuse check | Pass | Existing `SecretManagementService`, factories, provider clients, AppConfig, and AppData owners are reused. | None. |
| Reusable owned structures check | Pass | One narrow resolver port and one pure Gemini selector replace repeated authentication coordination. | None. |
| Shared-structure/data-model tightness check | Pass | Models/config/GraphQL carry no credential owner, resolver result, auth requirement, or construction target. | None. |
| Repeated coordination ownership check | Pass | Gemini priority/options and provider/slot identity each have one owner; Settings sequencing is centralized in `GeminiConfigurationService`. | Complete that owner's required verification/error outcome. |
| Empty indirection check | Pass | Ownerless LLM/media provisioning services were removed and composition was inlined into existing owners. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Port, adapter, factory, provider, configuration, metadata, and Electron responsibilities are distinct. | None. |
| Ownership-driven dependency check | Pass | Core has no server/Store import; server adapters use the authoritative service rather than backend internals. | None. |
| Authoritative Boundary Rule check | Pass | No changed caller combines `SecretManagementService` with backend/repository internals. | None. |
| File placement check | Pass | Added resolver/configuration files sit under their owning core secret/server LLM-management areas. | None. |
| Flat-vs-over-split layout judgment | Pass | The clean cut removes rather than adds wrapper depth. | None. |
| Interface/API/query/command/service-method boundary clarity | Fail | Runtime resolver APIs are narrow, but the Gemini Settings command success contract is not truthful when persistence/cleanup is incomplete. | Verify the derived durable state and emit the approved stable mismatch outcome. |
| Naming quality and naming-to-responsibility alignment check | Pass | Resolver, slot, selection, provider, and configuration names state their subjects accurately. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No duplicated provider switch, auth DTO, mode persistence, or parallel resolver exists. | None. |
| Patch-on-patch complexity control | Pass | Construction machinery is deleted cleanly; no compatibility wrapper or fallback stack remains. | Keep `CR-022` bounded to the existing configuration owner. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Construction contexts/targets/auth unions, old service shells, exports, helpers, and implementation-owned obsolete tests are removed. Downstream E2E residue is explicitly owned by the next stage but cannot resume yet. | None for implementation source. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Provider laziness/identity, selector/options, catalog containment, resolver authorization, and Electron tests are strong; Gemini configuration tests cover only successful reconciliation and do not exercise cleanup/persistence failure, mismatch, or stable code. | Add deterministic `CR-022` regressions. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Resolver and provider fixtures are focused and reused; no test-size concern applies. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed implementation scope | Pass | Removed implementation units have no compatibility replacement; negative absence assertions are current-contract tests. | API/E2E later owns its preserved stale imports. |
| API/E2E readiness for the next workflow stage | Fail | Builds and focused suites pass, but an approved supported Settings/restart outcome is still contradicted. | Full source re-review is required after the bounded fix; only then resume API/E2E. |

## Source File Size And Structure Audit

All 55 changed implementation-source files were measured from `ab82847e` to `62b4c2c3`. No file exceeds 500 effective non-empty lines and no changed-source delta exceeds 220 lines. Tests/generated files are excluded.

| Source File / Group | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Placement | Classification / Action |
| --- | ---: | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 489 | Pass | Pass (`12+/8-`) | Pass | None. |
| `autobyteus-ts/src/llm/llm-factory.ts` | 472 | Pass | Pass (`6+/21-`) | Pass | None. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | 472 | Pass | Pass (`0+/26-`) | Pass | None. |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | 450 | Pass | Pass (`57+/44-`) | Pass | None. |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | 401 | Pass | Pass (`8+/8-`) | Pass | None. |
| Changed concrete LLM implementations (19 files) | 10–366 each | Pass | Pass (maximum 59) | Pass | None. |
| Changed media factories/models/clients (17 files) | 62–344 each | Pass | Pass (maximum 43) | Pass | None. |
| `autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.ts` | 111 | Pass | Pass (`119+/0-`) | Correct owner and placement; behavior incomplete | `CR-022` Local Fix. |
| `autobyteus-server-ts/src/secret-management/resolution/secret-management-provider-api-key-resolver.ts` | 81 | Pass | Pass (`89+/0-`) | Pass | None. |
| `autobyteus-ts/src/utils/gemini-helper.ts` | 93 | Pass | Pass (`78+/18-`) | Pass | None. |
| Remaining changed server/core/Electron implementation files (12 files) | 2–268 each | Pass | Pass (maximum 81) | Pass | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Removed construction interfaces have no wrapper, re-export, dual constructor, or fallback. |
| No legacy old-behavior retention in changed scope | Pass | No ambient provider credential read or persisted Gemini selector remains. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Ownerless services, contexts, auth unions, helpers, and obsolete implementation tests are deleted. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | No schema/Store/importer/Docker/package migration was introduced. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | None found. |
| Approved transition mechanics match the reviewed design | Pass | The only exception is current Settings reconciliation correctness, not legacy retention. |

## Dead / Obsolete / Legacy Items Requiring Removal

None in implementation-owned source. Preserved stale API/E2E imports are downstream-owned and already recorded for later reconciliation after source review passes.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: developer/operator documentation must describe provider-owned point-of-use resolution, credential-independent catalogs, non-persisted Gemini mode, exact reconciliation failure, and Electron temp ownership accurately.
- Files or areas likely affected: existing secret-management/LLM-management/Codex module documentation, delivery handoff, and release notes. Final sync remains delivery-owned after validation.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-001`–`MP-008`, `CR-MP-022` | Confirmed | Store, Claude, importer, dependency, Codex, Google mode, and metadata premises remain applicable and are preserved by the round-24 source except for the separate Settings reconciliation defect below. |

### `CR-MP-023` — A successful Gemini Settings response can outlive only session state while durable configuration remains stale

- Origin: `New implementation-review premise for an already-approved contract`
- Related approved requirement or established contract: `BEH-003`, `AC-005`, `credential-consumer-mapping.md` Gemini command contract, and `design-spec.md` Settings reconciliation/verification contract.
- Relevant behavior ID(s): `BEH-003`.
- Initiating basis kind: `User` plus an applicable operational persistence-failure contract.
- Independent product-supported initiating trigger or applicable governing contract: the exposed API Key Management Gemini setup surface supports saving AI Studio, Vertex Express, or Vertex Project. The approved contract explicitly states that Store and AppConfig cannot claim one transaction and therefore requires post-write derived-state verification, stable `GEMINI_SETUP_RECONCILIATION_REQUIRED`, and retry safety when cleanup/verification does not converge.
- Support evidence: GraphQL exposes `setGeminiSetupConfig`; web Settings calls it; `AppConfig.set/delete` intentionally catch `.env` write/remove errors and leave changes valid only for the current session.
- Forward production path: user saves Gemini setup -> web store/mutation -> GraphQL resolver -> `LlmProviderService.setGeminiSetup` -> `GeminiConfigurationService.setSetup` -> selected Store mutation and inactive AppConfig/Store cleanup -> `getSetupStatus` -> GraphQL success response -> later ordinary restart reloads durable `.env` and Store.
- Lifecycle preconditions and material consequence: when AppConfig cannot durably set/remove project/location, its current-process state changes but the file remains stale/partial. `setSetup` does not compare returned selection with command intent and the stable reconciliation-required code does not exist. The mutation can therefore report success, while a restart selects Vertex Project instead of newly selected AI Studio, or becomes unconfigured after a reported Vertex Project save.
- Reachability: `Reachable` by the supported Settings action under the explicitly governed non-transactional persistence failure.
- Review consequence / proportionate response: fail this source round with one bounded implementation-owned fix in the existing Gemini configuration/Settings boundary and deterministic failure/retry coverage. Do not add a persisted mode, fallback, or cross-resource transaction claim.

## Review Scorecard

- Overall score (`/10`): `9.29`
- Overall score (`/100`): `92.9`
- Score calculation note: simple average across the ten mandatory categories; the unresolved finding controls the Fail decision.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | Invocation, Settings, catalog, metadata, gateway, and Electron paths are traceable end to end. | One Settings return outcome is false under `CR-MP-023`. | Complete the existing spine's reconciliation result. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.7 | Concrete providers, server adapters, management, factories, and configuration owners are sharply separated. | `GeminiConfigurationService` owns verification but does not perform it. | Finish the owner contract without moving policy elsewhere. |
| 3 | API / Interface / Query / Command Clarity | 8.6 | Runtime resolver APIs are narrow and exact. | Gemini save can return success for non-durable/mismatched state and lacks the approved stable reconciliation error. | Make command success truthful and stable failure explicit. |
| 4 | Separation of Concerns and File Placement | 9.6 | The refactor deletes coordinator shells and locates concerns under their true owners. | The correction remains within one existing file/boundary. | Keep the fix bounded. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.7 | Models/configs contain no auth routing; one port and one selector are reused. | No material data-shape weakness. | Preserve the clean-cut shape. |
| 6 | Naming Quality and Local Readability | 9.5 | Provider/slot/selection names are explicit and local flows are readable. | `setSetup` reads as reconciliation-complete although it does not verify convergence. | Align behavior with the name/contract rather than add another abstraction. |
| 7 | API/E2E Readiness | 8.5 | Focused suites and builds are green, and stale harness ownership is explicit. | Approved Settings/restart behavior must be fixed before executable validation can resume. | Add bounded regression coverage, re-review source, then resume API/E2E. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.4 | Provider invocation, catalog independence, Gemini SDK modes, and Electron lifecycle match requirements. | `CR-022` can select the wrong Gemini mode or unconfigured state after restart despite a success response. | Verify durable reconciliation and surface stable mismatch. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Old construction/auth/mode machinery is removed without wrappers or fallback. | Downstream stale tests remain intentionally outside this stage. | Reconcile them only in the owning API/E2E stage after source passes. |
| 10 | Cleanup Completeness | 9.5 | Production/unit source cleanup, exports, size, residue, and Docker checks pass. | The missing negative reconciliation tests leave a behavioral cleanup gap. | Add the required deterministic scenarios. |

## Findings

### `CR-022` — Gemini Settings reports success without verifying durable reconciliation

- Severity: `Medium`
- Classification: `Local Fix`
- Affected approved behavior: `BEH-003`, `AC-005`, and the explicit Settings reconciliation contract in `credential-consumer-mapping.md` / `design-spec.md`.
- Material premise: `CR-MP-023` (`Reachable`).
- Source evidence:
  - `autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.ts:55-85` performs sequential Store/AppConfig changes and returns `getSetupStatus()` without checking that `selection` matches the requested command.
  - `autobyteus-server-ts/src/config/app-config.ts:499-535` catches config-file update/removal errors and keeps session-only state.
  - `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:392-444` returns a success string whenever `setSetup` resolves.
  - `GEMINI_SETUP_RECONCILIATION_REQUIRED` is absent from production/tests, and `gemini-configuration-service.test.ts` covers only successful paths.
- Consequence: a supported Settings save can acknowledge AI Studio/Vertex setup while durable `.env` remains stale/partial; after restart the pure priority selector can choose a different mode or `unconfigured`. The result violates the deliberate no-transaction reconciliation contract and makes retry guidance unavailable.
- Required action: in the existing Gemini configuration/Settings owner, verify the post-command durable/derived state and return the approved value-free `GEMINI_SETUP_RECONCILIATION_REQUIRED` outcome when inactive cleanup or persistence does not converge. Preserve retry safety, exact priority, no persisted mode, no fallback, and no cross-Store/AppConfig transaction claim. Add deterministic tests for persistence/cleanup failure, mismatch, and successful retry.

## Classification

`Local Fix` — bounded implementation-owned source/test correction.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- After `CR-022` is fixed and full source review passes, API/E2E must reconcile the preserved durable harness imports and re-run the complete applicable matrix, including Gemini Settings/restart, empty/degraded Store catalogs, exact provider resolution, real configured providers, unchanged Docker, packaged Electron `tmp`, external Codex, both Claude modes, cleanup, and evidence safety.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, no automatic update, unchanged Docker topology, target isolation, source immutability, and `DASHSCOPE_API_KEY` as sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Fail` (`CR-MP-023` is reachable and contradicted by current source).
- Score Summary: `9.29/10` (`92.9/100`); API/command clarity, API/E2E readiness, and runtime fidelity are below the clean-pass threshold because of `CR-022`.
- Failure Origin: bounded implementation-owned Gemini Settings reconciliation behavior.
- Recommended Recipient: `implementation_engineer`
- Notes: Provider-owned resolver architecture, provider/media wiring, catalogs, removals, and Electron temp ownership otherwise pass full review. API/E2E remains paused until `CR-022` is corrected and the cumulative source passes another full implementation review.

---

# Review Round 29 — Independent Gemini Options With Priority As Sole Authority

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
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/repository-prisma-1.0.8-assessment.md`
- Current Review Round: `29`
- Trigger: architecture round 26 passed the user's priority-only Gemini Settings revision; implementation source/test commit is `8771971101a06255b742eb980f0c8f801543990e`, with handoff-only HEAD `a3f51821019da01d3867ee782f18af9b44c60941`.
- Prior Review Round Reviewed: `28`
- Latest Authoritative Round: `29`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture round 26 `Pass`)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: N/A for this implementation-review entry point; retained as downstream context.
- Execution Coverage Report Reviewed: N/A for this implementation-review entry point; retained as downstream context.
- Failing Scenario IDs: N/A.
- Exact Failing Commands / Execution Mode: N/A.
- Failure Evidence Paths: N/A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 28 | Architecture-round-24 implementation at `62b4c2c` / handoff `63c5723` | `CR-001`–`CR-021`, `FR-001` | `CR-022` | Fail | No | The then-approved design treated a save as a switch and required inactive-option reconciliation. |
| 29 | User-approved priority-only contract; architecture-round-26 implementation at `8771971` / handoff `a3f5182` | `CR-022`, `CR-MP-023`, all preserved findings | None | Pass | Yes | Save/remove is independently option-scoped; fixed priority alone selects the effective mode. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 28 | `CR-022` | Medium / Local Fix | Obsolete — superseded by approved requirement change | `requirements.md` `BEH-003`/`AC-001`/`AC-005`, architecture round 26, `design-spec.md`, and `credential-consumer-mapping.md` now explicitly say that save/remove changes only the addressed option, performs no implicit cleanup, and does not make the saved option effective. Source removes `setSetup`, inactive cleanup, and the selected-mode mutation. | This is not an implementation workaround. The user replaced the behavior premise before reimplementation. |
| 28 | `CR-MP-023` | Reachable under the superseded switch/reconciliation contract | No longer relevant | The target no longer promises that a save switches the active mode or reconciles inactive options. A lower-priority save remaining non-effective is now the required result, not a failure consequence. | It cannot drive a finding, deduction, or reconciliation machinery in this round. |
| 1–27 | `CR-001`–`CR-021`, `FR-001` | Mixed | Remain resolved | Round-26 source changes are confined to Gemini Settings/API/UI and preserve the already reviewed resolver, providers, metadata, importer, dependency, Docker, Codex, Claude, AutoByteus, and Electron owners. | No prior source finding reopened. |

## Review Scope

- Changed implementation and behavior reviewed: independent AI Studio, Vertex Express, and Vertex Project Settings options; option-scoped save/remove; fixed-priority effective-mode projection; typed GraphQL mutation/query changes; Pinia state/actions; web option cards, operation serialization, configured/effective presentation, localization, and generated client types.
- Complete production path traced: Settings API Key Management -> `GeminiSetupForm` / option card -> serialized Gemini action -> Pinia store -> typed GraphQL mutation -> `LlmProviderResolver` -> `LlmProviderService` -> `GeminiConfigurationService` -> addressed Secret Store slot or project/location AppConfig owner -> `getSetupStatus` -> shared pure priority selector -> separate operation/effective-mode result -> refreshed Settings snapshot and UI.
- Runtime preservation traced: Gemini LLM/media client -> value-free status and project/location facts -> shared pure priority selector -> selected slot only -> exact Google SDK construction. Settings does not supply another selector.
- Files / areas reviewed: all 24 round-26 source/test/generated paths plus the handoff-only commit; the related provider-owned resolver and pure selector; requirements, supplements, architecture report, implementation handoff, rendered screenshot, relevant focused tests, residue scans, file sizes, and build/guard evidence.
- Explicit exclusions: API/E2E, Docker runtime, real provider, packaged Electron, canonical Store, credential source, credential value, and database contents were not accessed in this source-review round. Existing downstream-owned dirty artifacts and untracked E2E paths were preserved.
- Independent checks:
  - server focused suite: `3` files / `29` tests passed;
  - web focused suite: `4` files / `30` tests passed;
  - server `build:full` passed, including sanitized built-module/bootstrap smoke without `DATABASE_URL`;
  - web boundary, localization boundary, and localization literal audit passed;
  - `git diff --check`, stale-mode/reconciliation scans, implementation-path cleanliness, source-size measurement, and handoff-only commit verification passed;
  - rendered Settings screenshot `/Users/normy/.autobyteus/browser-artifacts/25c09f-1784804159075.png` was inspected and shows independent option presentation plus the priority/effective-mode explanation.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: saving or removing one Gemini option changes only that option. Save order and the most recent command have no selection authority. Effective mode is derived only by `Vertex Express -> complete Vertex Project -> AI Studio -> unconfigured`.
- Design-spec behavior map verified against the implementation: yes. The same pure selector remains the only effective-mode authority; operation results and status snapshots keep operation/configuration facts separate from effective mode.
- Design review report and round confirmed: architecture round 26 `Pass`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior, if any: none.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-003`, `AC-001`, `AC-005` — Settings options | Confirmed | User saves/removes one rendered option -> typed GraphQL command -> `GeminiConfigurationService.saveOptionConfiguration/removeOptionConfiguration` mutates only that option -> `operationResult` calls `getSetupStatus` -> shared selector returns independently derived effective mode -> UI refreshes all configured states and marks only the effective option. | None. Tests cover all three options retained together, lower-priority save non-authority, explicit priority advancement by removal, and idempotent removal. |
| `BEH-003`, `AC-005` — runtime priority | Confirmed unchanged | Concrete Gemini LLM/media client -> resolver statuses plus project/location -> `selectGeminiRuntime` -> Express, complete Project, AI Studio, or unconfigured -> only selected credential resolution / exact SDK options. | No Settings mode, save-order field, fallback, or second selector was introduced. |
| `BEH-003`, `AC-001` — UI projection | Confirmed | GraphQL returns each option's value-free state and `effectiveMode`; the web renders all three together, labels configured separately from effective, keeps keys write-only, clears editors after refreshed snapshots, and serializes conflicting operations. | None. |
| `BEH-005`, `AC-007`, `AC-017` | Confirmed | API-key options retain exact backend health/lifecycle projection and writable-state control; GraphQL errors are value-free stable rejection codes. Vertex Project remains non-secret AppConfig state while runtime consumption still follows the approved fail-closed resolver/status path. | None. |
| `BEH-009`, `BEH-013` | Confirmed unchanged | Provider-owned point-of-use resolution and intrinsic AutoByteus gateway identity have no round-26 source delta. | None. |
| `BEH-002`, `BEH-012`, `BEH-014`, `BEH-015` | Confirmed unchanged | External Codex, both Claude modes, importer/no automatic update, and exact unpatched `repository_prisma@1.0.8` remain outside the changed source range. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Architecture round 26 distinguishes preserved runtime priority from intentionally replaced Settings clearing/single-editor behavior. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Source implements independent option mutation, explicit removal, configured/effective separation, and the unchanged pure priority. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | The Settings command/return spine and separate runtime selection spine are both complete and do not compete. | None. |
| Ownership boundary preservation and clarity | Pass | `GeminiConfigurationService` owns Settings option state/projection; the pure core selector owns priority; concrete providers own runtime resolution/SDK use. | None. |
| Off-spine concern clarity | Pass | Metadata invalidation, GraphQL mapping, Pinia refresh, localization, and operation notifications serve explicit owners. | None. |
| Existing capability/subsystem reuse check | Pass | Existing management, AppConfig, provider service, GraphQL, Pinia, and Settings boundaries are extended rather than paralleled. | None. |
| Reusable owned structures check | Pass | One domain option/effective-mode result and one shared selector replace selected-mode/cleanup coordination. | None. |
| Shared-structure/data-model tightness check | Pass | Configuration option, operation, state, and effective mode are separate closed facts; raw values remain write-only inputs. | None. |
| Repeated coordination ownership check | Pass | Priority exists only in the shared selector; the web consumes server `effectiveMode` and does not reimplement selection. | None. |
| Empty indirection check | Pass | `providerApiKeyGeminiActions.ts` owns real pending/error/notification sequencing rather than pass-through delegation. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Option-card rendering, form aggregation, actions, store transport, GraphQL mapping, and server domain behavior are distinct. | None. |
| Ownership-driven dependency check | Pass | Web depends on typed GraphQL/store contracts; server configuration depends on management/AppConfig public owners; no backend bypass exists. | None. |
| Authoritative Boundary Rule check | Pass | No changed caller uses both `SecretManagementService` and backend internals, or both configuration service and its internal storage mechanisms. | None. |
| File placement check | Pass | New card/action files sit in the established provider API-key Settings area; server behavior remains under LLM management. | None. |
| Flat-vs-over-split layout judgment | Pass | The large former form was split once by a coherent per-option rendering concern without creating wrapper depth. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | `saveGeminiConfigurationOption` and `removeGeminiConfigurationOption` identify one exact option; result fields separate operation, option, and effective mode. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | `ConfigurationOption`, `EffectiveMode`, `OperationResult`, `configured`, and `effective` state their independent meanings. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Shared option card and action runner contain meaningful repetition; priority is not duplicated. | None. |
| Patch-on-patch complexity control | Pass | The source removes the old selected-mode mutation and cleanup instead of layering a compatibility/reconciliation branch. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | `setGeminiSetupConfig`, `GeminiSetupCommand`, mode selection, inactive cleanup, and reconciliation symbols are absent from production. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests assert independent retention, lower-priority save result, explicit priority advancement, idempotent removal, GraphQL value-free rejection, UI configured/effective labels, input clearing, and serialized actions. | API/E2E must now exercise the assembled boundary and restart behavior. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Shared credential-status/setup fixtures and one option-card component keep the suite navigable. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed implementation scope | Pass | Old selected-mode assertions were replaced; no compatibility mutation or reconciliation-only test remains. | API/E2E owns its preserved stale harness imports. |
| API/E2E readiness for the next workflow stage | Pass | Approved behavior, source structure, focused tests, production server build, web guards, generated types, and rendered UI evidence are green. | Resume API/E2E and reconcile durable harness/tests there. |

## Source File Size And Structure Audit

Round-26 deltas are measured from `63c57237c5ad63afc9ff126ca7a1f01e3d7f2192` to source/test commit `8771971101a06255b742eb980f0c8f801543990e`. Tests, generated GraphQL/localization derivatives, reports, and evidence are excluded. The two `settings.ts` locale dictionaries are structured message resources, not logic-bearing implementation files; both were reviewed through the passing localization boundary/literal audits and are recorded separately from the source-code size threshold.

| Source File / Group | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | 441 | Pass | Pass (`91+/43-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | 461 | Pass | Pass (`27+/15-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.ts` | 149 | Pass | Pass (`73+/28-`) | Pass | Pass | None | None. |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | 486 | Pass | Pass (`22+/35-`) | Pass; close to threshold but remains one coherent Settings runtime owner | Pass | None | Monitor future growth; no split required now. |
| `autobyteus-web/stores/llmProviderConfig.ts` | 457 | Pass | Pass (`57+/17-`) | Pass | Pass | None | None. |
| `autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue` | 181 | Pass | Pass (`193+/0-`) | Pass | Pass | None | None. |
| `autobyteus-web/components/settings/providerApiKey/GeminiSetupForm.vue` | 71 | Pass | Pass (`54+/129-`) | Pass | Pass | None | None. |
| `autobyteus-web/components/settings/providerApiKey/providerApiKeyGeminiActions.ts` | 55 | Pass | Pass (`59+/0-`) | Pass | Pass | None | None. |
| Remaining changed logic-bearing server/web files | 88–180 each | Pass | Pass (maximum `33` net additions outside generated/resource paths) | Pass | Pass | None | None. |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | 594 each | N/A — structured locale resources, not logic-bearing implementation source | Pass (`11+/2-` each) | One locale/settings catalog each; boundary guards pass | Pass | Resource-size observation only | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Old mutation/mode contracts have no wrapper, alias, dual write, or fallback. |
| No legacy old-behavior retention in changed scope | Pass | Automatic cross-option clearing and save-as-switch behavior are removed cleanly. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Stale selected-mode and reconciliation production symbols are absent. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Existing option data remains directly usable; no migration or automatic rewrite was added. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | GraphQL/web/server changed atomically to the current contract. |
| Approved transition mechanics match the reviewed design | Pass | Each operation mutates only the addressed current option and reports priority-derived effective mode separately. |

## Dead / Obsolete / Legacy Items Requiring Removal

None in implementation-owned source. Downstream-owned durable API/E2E tests still require their planned contract reconciliation before execution.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: operator/developer documentation must replace selected-mode/switch language with independent configuration, explicit removal, and fixed-priority effective-mode behavior.
- Files or areas likely affected: LLM management, secret management, Settings/API documentation, release notes, and final handoff. Delivery owns final documentation sync after executable validation.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `CR-MP-023` | No Longer Relevant | The user-approved target removed the switch/inactive-cleanup contract. A lower-priority save remaining non-effective is expected priority behavior; no inactive reconciliation occurs. |
| `MP-001`–`MP-008`, `CR-MP-022` | Confirmed | Store, Claude, importer, dependency, Codex, Google runtime modes, and metadata premises remain applicable and unchanged. |

No new material production, failure, or lifecycle premise is required for a finding or score deduction in this round.

## Review Scorecard

- Overall score (`/10`): `9.60`
- Overall score (`/100`): `96.0`
- Score calculation note: simple average across the ten mandatory categories. All categories meet the clean-pass threshold.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.7 | Settings mutation/return and runtime selection are separately traceable end to end. | API/E2E has not yet exercised the assembled new mutation contract. | Add assembled GraphQL/browser/restart evidence downstream. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.7 | Configuration, selection, runtime resolution, transport, and UI ownership are explicit and non-competing. | None material; several adapters coordinate the web return path. | Preserve current owners during durable-test reconciliation. |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Save/remove identify one option and return separate operation/effective-mode facts. | Server/domain/web repeat small closed enum/state projections across transport boundaries. | Keep codegen/schema checks authoritative; avoid adding another representation. |
| 4 | Separation of Concerns and File Placement | 9.6 | The option card, form, action runner, store, GraphQL resolver, and domain service each own one coherent concern. | The Settings runtime file is close to the source-size threshold. | Route future unrelated Settings behavior to its own existing owner. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | Configuration state, operation outcome, and effective mode are singular and non-overlapping. | GraphQL and local web support types necessarily mirror the server contract. | Continue generated-schema stability checks. |
| 6 | Naming Quality and Local Readability | 9.6 | Names explicitly distinguish configured option, operation, and effective mode. | `resolveGeminiEffectiveCredentialStatus` primarily supplies control-plane health for Project/unconfigured cases, so the name is slightly broader than its exact data role. | Consider a narrower name only if that helper changes again; no current behavior gap. |
| 7 | API/E2E Readiness | 9.4 | Focused tests, production server build, generated types, web guards, and rendered evidence pass. | Durable harness/tests still need ownership-stage reconciliation and real assembled execution. | API/E2E should update the old contract and run the prescribed matrix. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.7 | Source exactly implements priority as sole authority and never silently switches or cleans another option. | Real Settings/restart evidence is pending. | Prove independent persistence and priority advancement through the assembled product. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Old selected-mode mutation and implicit-clearing behavior are removed with no compatibility path. | Downstream tests may still reference the previous API until reconciled. | Remove/update those tests in the owning API/E2E stage. |
| 10 | Cleanup Completeness | 9.4 | Production residues and obsolete tests in implementation scope are removed; guards pass. | The cumulative dirty API/E2E artifacts remain intentionally outside this stage. | Complete downstream reconciliation, evidence cleanup, and final docs sync. |

## Findings

No implementation-source finding remains open.

`CR-022` is not marked “fixed”; it is marked **obsolete/superseded** because its switch/reconciliation requirement was explicitly withdrawn and replaced by the user's priority-only contract. The implementation correctly contains no reconciliation machinery.

## Classification

`Pass`

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- API/E2E must reconcile the preserved durable harness and tests with the new GraphQL and independent-option contract, then run assembled Settings status/save/remove, lower-priority save non-authority, explicit priority advancement, restart/reopen persistence, and value-free evidence checks.
- Broader execution should preserve and re-run the applicable provider-owned resolver, exact Gemini runtime modes, metadata provenance, real configured provider, unchanged Docker, external Codex, both Claude modes, Electron lifecycle, cleanup, and secret-safety matrix.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, no automatic update, unchanged Docker topology, target isolation, source immutability, and `DASHSCOPE_API_KEY` as sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass` (`CR-MP-023` is no longer relevant under the approved target; no new material premise drives a finding).
- Score Summary: `9.60/10` (`96.0/100`); every category is at least `9.4`.
- Failure Origin: N/A.
- Recommended Recipient: `api_e2e_engineer`
- Notes: The implementation now follows the user's exact rule: configuration operations are independent, and fixed priority is the only effective-mode authority. API/E2E may resume after reconciling its durable contract/tests.

# Review Round 30 — One-Database Encrypted Secret Vault Clean Cut

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Supplemental Task Artifacts Reviewed As Context: `encrypted-secret-vault-contract.md`, `gemini-setup-ui-ux-spec.md`, `credential-consumer-mapping.md`, `use-case-spine-validation.md`, `secret-storage-architecture.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, `repository-prisma-1.0.8-assessment.md`, and the tombstoned `secret-storage-backend-contract.md`
- Current Review Round: `30`
- Trigger: Architecture-round-28 implementation; source/test commit `0564559298ccf21267581cb4feec88770c72e7ce`, handoff-only commit/final HEAD `4d0ee81754b6b8329fe3b5ead2ef7c20ead5ed33`, starting HEAD `a3f51821019da01d3867ee782f18af9b44c60941`
- Prior Review Round Reviewed: `29`
- Latest Authoritative Round: `30`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: N/A for implementation review.
- Execution Coverage Report Reviewed: N/A for implementation review.
- Failing Scenario IDs: N/A.
- Exact Failing Commands / Execution Mode: N/A.
- Failure Evidence Paths: N/A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 29 | User-approved independent Gemini options with explicit mode authority | `CR-022`, `CR-MP-023`, all preserved findings | None | Pass | No | Superseded by the larger architecture-round-28 clean cut. |
| 30 | One-database encrypted vault implementation at `0564559` / handoff `4d0ee81` | `CR-001`–`CR-022`, `FR-001` | `CR-023` | Fail | Yes | Normal first initialization works, but the persistent bootstrap sentinel makes the approved interrupted-first-initialization recovery path permanently unavailable after process termination. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 28–29 | `CR-022` / `CR-MP-023` | Medium / superseded premise | Remains obsolete under the later approved explicit Gemini mode contract | Round-28 source preserves independent option state and explicit `GEMINI_SETUP_MODE`; no priority/reconciliation path was reintroduced. | Does not affect this review. |
| 1–27 | `CR-001`–`CR-021`, `FR-001` | Mixed | Remain resolved or superseded | The implementation cleanly removes the separate Store architecture while preserving the already approved Codex, Claude, provider, metadata, Docker, importer, and package decisions in the round-28 artifacts. | No prior implementation finding reopened. |

## Review Scope

- Changed implementation and behavior reviewed: single-application-database vault schema and migration; canonical database/key derivation; staged bootstrap; root-key file custody; authenticated encryption; repository and service lifecycle; authorization; value-free status/health; provider-owned lazy resolution; explicit Gemini mode/configuration; importer preview/execution; custom-provider coordination; GraphQL/UI/Electron projections; clean removal of separate Store/config/access-mode/reset/provisioning paths.
- Complete production paths traced: server startup -> migration -> canonical DB/key location -> vault bootstrap -> service/runtime -> API/catalog startup; Settings save/remove/status -> provider-specific GraphQL -> service authorization -> encrypted application-DB persistence; provider invocation -> intrinsic provider/slot -> lazy resolver -> selected secret reveal -> SDK lifecycle; importer preview -> source selection -> read-only vault inspection; confirmed import -> normal migration/bootstrap -> transactional batch recheck/write.
- Files / areas reviewed: the complete `a3f5182..0564559` implementation diff, handoff-only commit `4d0ee81`, all new vault owners, migration/schema, startup/AppConfig/Prisma consumers, secret catalog/service/resolver adapters, importer, representative LLM/media/search/AutoByteus/custom-provider paths, Gemini API/UI, Electron reset, implementation tests, source size/delta, removed-path scans, and the complete approved artifact chain.
- Explicit exclusions: no API/E2E, Docker runtime, real provider, packaged Electron, canonical user database, real key, credential file, or secret value was accessed. Existing downstream-owned dirty reports/evidence and untracked E2E paths were preserved.
- Independent review checks: `git diff --check a3f5182..0564559` passed; focused vault lifecycle and non-mutating inspection tests passed `2` files / `9` tests; a disposable built-module probe placed an owned stale initialization lock and proved two consecutive normal bootstrap attempts both return value-free `UNAVAILABLE` while the lock remains present.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `DATABASE_URL` is the sole database selector; normal migration owns the two vault tables; the adjacent 32-byte root key and encrypted domain must fail closed; an empty-domain key-only state is expressly recoverable as interrupted first initialization; catalogs remain credential-independent; service authorization and provider-owned point-of-use resolution own credential custody; explicit importer and Settings are the only provisioning paths.
- Design-spec behavior map verified against the implementation: mostly, but the approved `BEH-003` interrupted-initialization lifecycle is contradicted by the persistent bootstrap sentinel described in `CR-MP-024` / `CR-023`.
- Design review report and round confirmed: architecture round 28 `Pass`.
- Behavior-basis status: `Contradicted`.
- Changed or newly discovered behavior: none. The finding concerns an explicit existing vault-recovery contract, not a newly invented edge case.
- Remaining material ambiguity: none; the contract explicitly defines key-only interrupted first initialization as recoverable.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001`, `AC-001` — credential-independent catalogs | Confirmed | Server/API catalogs are assembled independently of vault readiness; provider status is overlaid value-free. | None. |
| `BEH-002`, `REQ-002`–`REQ-003`, `AC-002` — one canonical application DB | Confirmed | `AppConfig` canonicalizes one SQLite URL; migration, Prisma, vault, importer, and diagnostics consume the derived location; the separate Store paths are removed. | None. |
| `BEH-003`, `REQ-004`–`REQ-005`, `AC-003` — root key/domain lifecycle | Contradicted | Normal startup acquires `<root-key>.initialize.lock`, validates DB/key, creates or verifies metadata, and removes the lock only in the acquiring process's `finally`. | The normative vault contract requires a valid key with absent metadata/zero entries to complete interrupted first initialization. A terminated acquiring process necessarily leaves the `wx` sentinel, and all later startups fail before reaching that recovery branch. See `CR-MP-024`. |
| `BEH-004`, `REQ-006`, `AC-004` — write-only secret lifecycle | Confirmed | Provider-specific API -> authorization-owning `SecretManagementService` -> authenticated encrypted record/repository; no raw read API or value response exists. | None. |
| `BEH-005`, `REQ-007`–`REQ-008`, `AC-005` — provider-owned point-of-use resolution | Confirmed | Concrete providers retain intrinsic provider/slot identity and lazily call the injected resolver at SDK/client construction; catalogs carry no credentials. | None. |
| `BEH-006`–`BEH-007`, `REQ-010`, `AC-006` — Gemini explicit modes and metadata separation | Confirmed | Independent Settings configuration plus explicit `GEMINI_SETUP_MODE`; selected-only resolution; AI Studio live-or-curated metadata and Vertex curated-only remain separate. | None. |
| `BEH-008`, `AC-008` — custom provider lifecycle | Confirmed | Metadata plus deterministic provider-owned secret ID, bounded save compensation, and idempotent removal preserve the supported create/probe/list/use/delete surface without an update API. | None. |
| `BEH-009`, `REQ-011`, `AC-009` — explicit importer | Contradicted only for interrupted execution recovery | Preview uses the narrow query-only inspector and correctly projects key-only empty-domain state as `INITIALIZATION_REQUIRED`; execution calls the normal bootstrap before transactional write. | If the key-only state came from interruption of normal bootstrap, the stale sentinel prevents execution from completing the very recovery the preview and contract authorize. See `CR-MP-024`. |
| `BEH-010`–`BEH-015` | Confirmed | No automatic legacy import, `.env.test` production discovery, second Store, Docker topology change, Codex auth redesign, Claude mode change, or patched/old repository Prisma path was introduced. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Architecture round 28 and the normative vault contract define the clean cut, trust boundary, data transition, and recovery matrix. | None upstream. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Main-line one-DB, crypto, custody, importer, and provider behavior match; interrupted first initialization does not. | Resolve `CR-023`. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Startup, Settings, provider invocation, importer preview, and confirmed import are independently traceable. | Preserve these spines in the fix. |
| Ownership boundary preservation and clarity | Pass | Bootstrap, root-key file, crypto, repository, service, resolver, configuration, and UI owners are distinct. | Keep recovery synchronization inside bootstrap ownership. |
| Off-spine concern clarity | Pass | Health projection, metadata provenance, denied paths, compensation, UI state, and Electron cleanup serve explicit owners. | None. |
| Existing capability/subsystem reuse check | Pass | Normal migrations/Prisma/AppConfig/Settings/GraphQL/provider factories are reused; no second persistence subsystem remains. | None. |
| Reusable owned structures check | Pass | One vault domain contract, one secret catalog, one authorization service, and shared provider resolver replace repeated Store shapes. | None. |
| Shared-structure/data-model tightness check | Pass | Stable `SecretId`, closed health/status types, metadata singleton, encrypted entry, and provider consumer shapes remain narrow. | None. |
| Repeated coordination ownership check | Pass | Database selection, vault lifecycle, authorization, Gemini mode, metadata provenance, and provider resolution each have one owner. | Correct lock recovery within the vault lifecycle owner. |
| Empty indirection check | Pass | Inspection, runtime, resolver adapters, and provisioning services own real policy/lifecycle rather than pass-through calls. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New files separate crypto, key custody, bootstrap, persistence, inspection, service, and runtime responsibilities. | None. |
| Ownership-driven dependency check | Pass | Callers use service/resolver/configuration public owners and do not reach into Prisma or key/crypto internals. | None. |
| Authoritative Boundary Rule check | Pass | No reviewed caller depends on both `SecretManagementService` and its repository/key/crypto internals; inspection is a deliberately separate read-only owner. | None. |
| File placement check | Pass | Vault domain/bootstrap/crypto/persistence/root-key/service paths match their owning concern. | None. |
| Flat-vs-over-split layout judgment | Pass | The vault is split by meaningful lifecycle/trust concerns without compatibility wrappers. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | APIs are provider/operation-specific, secrets are write-only, status is value-free, and the raw service is internal/authorized. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | Vault, inspection, bootstrap, root key, consumer, mode, and status names are explicit. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Shared catalogs, selectors, resolvers, and environment-line handling own repeated policy. | None. |
| Patch-on-patch complexity control | Pass | The old Store architecture is removed rather than wrapped or dual-written. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Separate backend/config/access-mode/provision/reset paths and old construction/auth shapes are removed with no compatibility adapters. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Main lifecycle, batch, corruption, permissions, importer, and inspection coverage is coherent, but no test models process termination/stale bootstrap ownership or proves the explicit interrupted-init recovery contract. | Add a deterministic recovery/concurrency-safe regression for `CR-023`. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Temporary DB/key/source fixtures and provider consumer builders are appropriately scoped. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Old Store tests are removed; current tests target the one-DB contract. | None. |
| API/E2E readiness for the next workflow stage | Fail | A supported restart lifecycle can remain permanently degraded before any provider or importer execution. | Source re-review must pass before API/E2E resumes. |

## Source File Size And Structure Audit

Round-30 source sizes/deltas are measured from `a3f51821019da01d3867ee782f18af9b44c60941` to source/test commit `0564559298ccf21267581cb4feec88770c72e7ce`. Tests, generated code, schema/migration files, resource dictionaries, reports, and evidence are excluded from the hard source threshold.

| Source File / Group | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/app-config.ts` | 500 | Pass (not `>500`) | Pass (`32+/27-`) | Pass; one established configuration owner | Pass | None | Monitor future growth. |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | 497 | Pass | Pass (`19+/8-`) | Pass; one Settings runtime owner | Pass | None | Route future unrelated behavior elsewhere. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 497 | Pass | Pass (`10+/2-`) | Pass | Pass | None | Monitor future growth. |
| `autobyteus-web/stores/llmProviderConfig.ts` | 496 | Pass | Pass (`56+/13-`) | Pass | Pass | None | Monitor future growth. |
| `autobyteus-ts/src/llm/llm-factory.ts` | 483 | Pass | Pass (`12+/0-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | 456 | Pass | Pass (`74+/76-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | 454 | Pass | Pass (`55+/48-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/secret-management/services/secret-vault-inspection-service.ts` | 238 | Pass | Exceeds delta threshold (`252+/0-`) | Pass after explicit review: one command-only, non-mutating inspection lifecycle with closed schema/key/verifier classification | Pass | No structural split required | Preserve its no-write boundary in API/E2E. |
| `autobyteus-server-ts/src/llm-management/services/gemini-configuration-service.ts` | 228 | Pass | Pass (`147+/65-`) | Pass | Pass | None | None. |
| `autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue` | 250 | Pass | Pass (`167+/94-`) | Pass | Pass | None | None. |
| Remaining 56 changed logic-bearing files | 13–362 each | Pass | Pass | Pass | Pass | None | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No old Store alias, dual read/write, compatibility backend, old secret ID alias, or credential fallback remains. |
| No legacy old-behavior retention in changed scope | Pass | Legacy `.env` and custom-provider-v1 credentials remain non-authoritative; no automatic mutation owner was restored. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Separate Store configuration/backends/access modes/reset/provisioning and obsolete tests were removed. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Normal additive Prisma migration preserves ordinary application data; superseded separate Store data is intentionally not migrated. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Runtime uses only the current application DB tables and adjacent key. |
| Approved transition mechanics match the reviewed design | Pass | Existing app DBs migrate additively; new vault state initializes cleanly; no automatic credential import occurs. |

## Dead / Obsolete / Legacy Items Requiring Removal

None in implementation-owned source. The stale bootstrap sentinel is active lifecycle logic requiring correction, not dead or compatibility code.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the final package must describe the one-DB vault/key pair, backup/restore/reset, explicit Gemini mode, importer target/preview, test-runtime setup, removed separate Store, and exact recovery/closed states.
- Files or areas likely affected: secret-management, LLM/provider Settings, operator import/test setup, backup/restore/reset guidance, Electron/server deployment notes, release notes, and final handoff. Delivery owns final durable docs after implementation and API/E2E pass.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

No upstream premise was reclassified. The prior round's `CR-MP-023` remains no longer relevant. One new implementation-review premise is required because `CR-023` concerns an explicit failure/restart lifecycle.

### `CR-MP-024` — interrupted first initialization is reachable and must recover on normal restart

- Origin: `New`
- Related approved requirement or established contract: `encrypted-secret-vault-contract.md` “First initialization” and closed-state table; `BEH-003`; `REQ-004`–`REQ-005`; `AC-003`; importer `BEH-009`/`REQ-011` key-only `INITIALIZATION_REQUIRED` state.
- Relevant behavior ID(s): `BEH-003`, `BEH-009`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: the normative vault contract explicitly requires that “No metadata, zero entries, valid key” complete interrupted first initialization. This applies to normal server/bootstrap and confirmed-import execution and is not inferred from the lock implementation or a test.
- Support evidence: the contract specifies exclusive key creation before metadata insertion, recognizes interruption between those steps, and defines the key-only state as recoverable only for an empty domain.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: normal server start or confirmed importer execution -> normal migrations -> `SecretVaultRuntime.initialize` -> `SecretVaultBootstrap.initializeOrVerify` -> acquire filesystem bootstrap lock -> validate empty domain -> create the adjacent key -> process termination/power loss before metadata commit or `finally` -> supported normal server/import restart -> bootstrap attempts to acquire the same lock before inspecting the recoverable key-only state.
- Lifecycle preconditions and material consequence at the claimed point: selected application DB has current empty vault tables, valid owner-only key exists, metadata/entries are absent, and the terminated owner left the persistent sentinel. Each restart's exclusive open fails; bootstrap maps it to value-free `UNAVAILABLE` and never removes it because this process did not acquire a handle. Settings/provisioning/invocation therefore remain degraded indefinitely without out-of-contract manual filesystem mutation.
- Reachability: `Reachable`.
- Review consequence / proportionate response: fail this source round with one bounded implementation-owned lifecycle correction. Bootstrap mutual exclusion must remain safe for a live concurrent initializer while allowing a terminated owner's interrupted empty-domain initialization to resume. Add deterministic regression coverage for process-termination/stale-ownership recovery and live concurrency safety; do not redesign the vault or weaken fail-closed established-domain handling.

## Review Scorecard

- Overall score (`/10`): `9.19`
- Overall score (`/100`): `91.9`
- Score calculation note: simple average across the ten mandatory categories. The average does not override the fail decision; API/E2E readiness and runtime correctness are below the `9.0` clean-pass threshold because of `CR-023` / `CR-MP-024`.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Startup, Settings, provider invocation, importer preview/execution, and cleanup paths are clear and centrally owned. | Interrupted-bootstrap continuation is absent from tests and fails before its documented branch. | Add the recovery path to the lifecycle proof without creating a parallel spine. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Database selection, vault bootstrap, key custody, crypto, repository, service authorization, and provider resolution have explicit owners. | Bootstrap owns a sentinel whose lifetime cannot survive process termination safely. | Correct synchronization within the bootstrap owner. |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Provider APIs are write-only/value-free and importer/vault interfaces are narrow. | `UNAVAILABLE` from a stale internal sentinel gives operators no supported recovery despite the contract. | Make normal restart restore the documented state while keeping value-free errors. |
| 4 | Separation of Concerns and File Placement | 9.3 | The clean cut is coherently split and placed. | Several existing files sit close to 500 lines, and the new inspection service exceeds the 220-line delta review threshold, though its responsibility remains cohesive. | Preserve current boundaries and avoid adding lock-recovery logic outside bootstrap. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | One DB/domain/key/catalog/service/resolver model replaces parallel Store shapes. | No material data-shape gap. | Preserve the closed domain model through the fix. |
| 6 | Naming Quality and Local Readability | 9.4 | Names align with vault, consumer, configuration, and inspection responsibilities. | The `.initialize.lock` filename suggests recoverable ownership but stores no recoverable ownership/liveness semantics. | Use a synchronization mechanism/name whose semantics match actual lifecycle behavior. |
| 7 | API/E2E Readiness | 8.2 | Focused implementation suites/builds are broad, and main-line behavior is ready. | A supported restart state remains permanently degraded; downstream execution cannot compensate for this source defect. | Resolve `CR-023`, re-review source, then resume the full API/E2E matrix. |
| 8 | Runtime Correctness And Behavioral Fidelity | 7.8 | Crypto, persistence, authorization, point-of-use resolution, and normal startup align with the contract. | Every internally produced key-only interruption also leaves the persistent sentinel, making the approved recovery branch unreachable on later normal starts. | Implement interruption-safe mutual exclusion/recovery and deterministic lifecycle coverage. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | The separate Store and legacy credential paths are removed cleanly with no dual path or fallback. | None material. | Preserve the clean cut. |
| 10 | Cleanup Completeness | 9.4 | Old architecture/source/tests are removed and handoff scope is clean. | Crash cleanup of the bootstrap sentinel is incomplete by construction. | Ensure termination cannot leave a permanent lifecycle blocker. |

## Findings

### `CR-023` — persistent bootstrap sentinel permanently blocks approved interrupted-first-initialization recovery

- Severity / classification: `High` / `Local Fix`.
- Affected behavior and contract: `BEH-003`, `BEH-009`, `REQ-004`–`REQ-005`, `REQ-011`, `AC-003`, and the normative `encrypted-secret-vault-contract.md` first-initialization/key-only recovery table.
- Material-premise record: `CR-MP-024` (`Reachable`).
- Evidence: `autobyteus-server-ts/src/secret-management/bootstrap/secret-vault-bootstrap.ts:83-100` creates `<root-key>.initialize.lock` with `wx` and unlinks it only when the current process reaches `finally` with an acquired handle. A process termination leaves it behind. Later bootstraps fail at line 90 before database/key inspection, return `UNAVAILABLE`, and do not unlink because `lock` is null. There is no implementation test for the initialization lock or interrupted recovery. The independent disposable built-module probe returned `UNAVAILABLE` on two consecutive bootstraps and confirmed the lock still existed.
- Production trigger/path/consequence: governed interrupted first initialization -> normal startup creates lock and key -> process termination before metadata/finally -> normal supported restart -> exclusive-open failure -> permanent value-free degraded vault -> Settings/import/provider use cannot recover without manual hidden-file deletion.
- Why this is a source defect rather than a design/requirement gap: the approved contract is explicit that key-only empty-domain initialization resumes, and synchronization belongs to `SecretVaultBootstrap`; no upstream behavior decision is missing.
- Required bounded action: make bootstrap mutual exclusion interruption-safe so a terminated initializer's empty-domain state can resume while a simultaneously live initializer cannot be bypassed. Add deterministic lifecycle coverage that proves stale/terminated ownership recovery, live concurrency safety, key/domain invariants, and unchanged established-domain fail-closed behavior. Do not add a second vault path, automatic legacy import, key replacement, or broad recovery machinery.

## Classification

`Local Fix`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- After `CR-023` is corrected and source review passes, API/E2E must own `.env.test` runtime bootstrap reconciliation and execute one-DB migration/start/restart, Settings/importer, provider-resolution, real configured capability, Docker, Electron, value-leak, and cleanup evidence.
- The read-only/query-only importer inspector and coordinated DB/key backup/restore/reset semantics require realistic downstream lifecycle proof; no source finding is raised against them in this round.
- The current credential mapping supplement contains a subordinate typographic separator mismatch for the Vertex Express secret ID, while requirements, normative vault contract, catalog, and implementation consistently use `provider.google.vertex-express.api-key`. Delivery should normalize the documentation; this does not change implementation authority or drive the current finding.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, Prisma `5.22.0`, no automatic update/import, unchanged Docker topology, and `DASHSCOPE_API_KEY` as sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Fail` (`CR-MP-024` is independently contract-supported and reachable).
- Score Summary: `9.19/10` (`91.9/100`); API/E2E readiness `8.2` and runtime correctness `7.8` are below the clean-pass threshold.
- Failure Origin: implementation-owned vault bootstrap lifecycle at `SecretVaultBootstrap.initializeOrVerify`.
- Recommended Recipient: `implementation_engineer`
- Notes: The one-database clean cut is otherwise structurally strong, but source review cannot pass until normal restart can complete the expressly approved interrupted empty-domain initialization without weakening live mutual exclusion or established-domain fail-closed behavior.

# Review Round 31 — CR-023 Interruption-Safe Initialization Rework

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Supplemental Task Artifacts Reviewed As Context: `encrypted-secret-vault-contract.md`, `gemini-setup-ui-ux-spec.md`, `credential-consumer-mapping.md`, `use-case-spine-validation.md`, `secret-storage-architecture.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, `repository-prisma-1.0.8-assessment.md`, and tombstoned `secret-storage-backend-contract.md`
- Current Review Round: `31`
- Trigger: CR-023 source/test fix `e3d9a06d3c0334f87a7a5864351034249b49071d`; handoff-only final HEAD `7c0b752663cec85a671ea9c530af753f537544e5`; prior reviewed HEAD `4d0ee81754b6b8329fe3b5ead2ef7c20ead5ed33`
- Prior Review Round Reviewed: `30`
- Latest Authoritative Round: `31`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: N/A for implementation review.
- Execution Coverage Report Reviewed: N/A for implementation review.
- Failing Scenario IDs: N/A.
- Exact Failing Commands / Execution Mode: N/A.
- Failure Evidence Paths: N/A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 30 | One-database vault implementation at `0564559` / handoff `4d0ee81` | Preserved cumulative findings | `CR-023` | Fail | No | Crash-persistent sentinel prevented interrupted first-initialization recovery. |
| 31 | CR-023 rework at `e3d9a06` / handoff `7c0b752` | `CR-023`, `CR-MP-024` | `CR-024` | Fail | Yes | Process-bound SQLite locking fixes interruption/concurrency, but the lock-acquisition statement physically rewrites the established metadata database on every restart. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 30 | `CR-023` | High / Local Fix | Resolved | The persistent sentinel is removed from production. `withInitializationLock()` obtains a process-bound SQLite writer transaction before key inspection. Key-only recovery, concurrent-initializer serialization, one domain/key pair, and established missing-key `LOCKED` behavior pass deterministic tests. | The specific permanent-lock defect is closed. |
| 30 | `CR-MP-024` | Reachable | Remains confirmed and now correctly handled | A terminated initializer no longer leaves production-owned lock state; SQLite releases transaction ownership with the process, and the later bootstrap reaches the valid-key/empty-domain recovery branch. | Does not drive a new deduction. |
| 1–29 | `CR-001`–`CR-022`, `FR-001` | Mixed | Remain resolved or superseded | The bounded rework changes only bootstrap, vault repository initialization coordination, and the lifecycle test. | No preserved finding reopened. |

## Review Scope

- Changed implementation and behavior reviewed: replacement of the crash-persistent filesystem sentinel with application-SQLite transaction ownership; transaction-scoped initialization repository; key inspection/create and metadata read/count/create ordering; concurrent initializer serialization; interrupted key-only recovery; established missing-key failure; new lifecycle tests.
- Cumulative implementation behavior rechecked: one canonical application DB/key pair, normal migration, authenticated encryption, authorization-owning service, provider-owned point-of-use resolution, importer preview/execution, explicit Gemini mode, catalog independence, custom-provider lifecycle, Codex/Claude preservation, and clean Store removal remain unchanged from Round 30.
- Files / areas reviewed: `secret-vault-bootstrap.ts`, `secret-vault-prisma-repository.ts`, `secret-vault-lifecycle.test.ts`, root-key and runtime collaborators, AC-003/normative bootstrap contract, implementation handoff, full cumulative report/artifacts, diff/size/status evidence.
- Explicit exclusions: no API/E2E, Docker runtime, real provider, packaged Electron, canonical application DB, real key, credential file, or secret value was accessed.
- Independent checks:
  - `git diff --check 4d0ee81..e3d9a06` passed;
  - handoff commit `7c0b752` changes only `implementation-handoff.md`;
  - focused lifecycle/inspection/importer suite passed `3` files / `17` tests;
  - changed production files are `167` and `195` effective non-empty lines;
  - a disposable current-build established-vault restart probe observed SQLite `data_version` change `1 -> 2`, application DB mtime change, and application DB SHA-256 change after the second bootstrap, while health remained `READY`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: process termination must not strand interrupted empty-domain initialization; a live second initializer must not bypass the first; established restart verifies one key/domain pair without rewriting either; invalid/missing paired state remains closed.
- Design-spec behavior map verified against the implementation: CR-023 recovery and serialization now align, but `BEH-003` / `AC-003` established restart no-rewrite behavior is contradicted by the row-matching no-op `UPDATE` used solely to acquire the writer lock.
- Design review report and round confirmed: architecture round 28 `Pass`.
- Behavior-basis status: `Contradicted`.
- Changed or newly discovered behavior: none; `CR-024` is measured against explicit `AC-003` and the established-startup contract.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-003`, `REQ-004`–`REQ-005`, `AC-003` — interrupted initialization | Confirmed | Startup -> DB identity -> SQLite writer transaction -> key inspection -> empty-domain key reuse/create -> metadata creation/verification -> commit. SQLite releases the transaction on termination; a later process resumes. | None. |
| `BEH-003`, `AC-003` — established restart verifies without rewrite | Contradicted | Every bootstrap begins a transaction and executes `UPDATE secret_encryption_metadata SET singleton_id = singleton_id WHERE singleton_id = 1` before key/metadata verification. | On an established vault the predicate matches the singleton. Independent normal restart evidence shows the statement commits an actual application-DB change (`data_version`, mtime, and hash changed) even though no secret/configuration operation occurred. See `CR-MP-025`. |
| `BEH-003`, `AC-003` — established metadata missing key | Confirmed | Writer ownership -> key inspection `MISSING` -> metadata read -> exact `LOCKED`; no key is generated and metadata remains. | None. |
| `BEH-009`, `REQ-011`, `AC-009` — confirmed importer initialization | Confirmed for CR-023 | Confirmed execution can now call normal migration/bootstrap and recover valid key-only empty-domain state; preview remains query-only. | The same unnecessary established restart write affects execution against an already initialized target, but transactionally authoritative importer writes are otherwise unchanged. |
| `BEH-001`–`BEH-002`, `BEH-004`–`BEH-015` | Confirmed unchanged | No source delta outside bootstrap/repository initialization and lifecycle tests. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The normative contract defines recoverable interruption, live mutual exclusion, and no-rewrite established verification. | None upstream. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Interruption recovery now matches; established verification performs a committed DB rewrite. | Resolve `CR-024`. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Bootstrap transaction, key inspection, metadata read/create/verify, and commit/rollback are explicit. | Preserve the spine while removing committed no-op mutation. |
| Ownership boundary preservation and clarity | Pass | Repository owns SQLite transaction coordination; bootstrap owns lifecycle; root-key owner remains separate. | Keep the bounded correction within these owners. |
| Off-spine concern clarity | Pass | Timeout, health mapping, zeroization, and test pauses serve explicit owners. | None. |
| Existing capability/subsystem reuse check | Pass | Prisma/SQLite transaction ownership replaces the bespoke sentinel rather than adding another subsystem. | None. |
| Reusable owned structures check | Pass | `SecretVaultInitializationRepository` narrows all initialization reads/create to one transaction client. | None. |
| Shared-structure/data-model tightness check | Pass | No new broad context or duplicate repository model was introduced. | None. |
| Repeated coordination ownership check | Pass | Initialization coordination exists once in `withInitializationLock`. | Correct its lock-acquisition statement there. |
| Empty indirection check | Pass | The transaction-scoped repository enforces a real invariant, not pass-through delegation. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Bootstrap policy and repository transaction mechanics remain appropriately separated. | None. |
| Ownership-driven dependency check | Pass | Bootstrap receives only the narrowed initialization repository; it does not access Prisma directly. | None. |
| Authoritative Boundary Rule check | Pass | Callers do not depend on both repository owner and transaction internals. | None. |
| File placement check | Pass | Both implementation changes remain in vault bootstrap/persistence owners. | None. |
| Flat-vs-over-split layout judgment | Pass | No wrapper or compatibility layer was added. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | `withInitializationLock` accepts one operation over a minimal initialization interface. | Keep the contract but make acquisition non-mutating on established data. |
| Naming quality and naming-to-responsibility alignment check | Pass | Names accurately describe lifecycle and transaction-scoped ownership. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Metadata/count/create helpers share transaction/non-transaction clients. | None. |
| Patch-on-patch complexity control | Pass | The sentinel path was removed rather than retained beside SQLite ownership. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Production has no `.initialize.lock` path. The stale file appears only as a backward witness in a temporary test fixture. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Tests prove interruption, live serialization, and missing-key closure, but omit AC-003's established restart no-rewrite assertion. | Add deterministic DB/key/metadata non-mutation proof. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | One lifecycle fixture and paused root-key delegate keep scenarios bounded. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The stale-sentinel case proves it no longer controls production; it does not restore compatibility code. | None. |
| API/E2E readiness for the next workflow stage | Fail | Every normal established startup currently changes application DB state solely to acquire the bootstrap lock. | Correct and re-review before API/E2E. |

## Source File Size And Structure Audit

The cumulative Round-30 audit remains applicable. The CR-023 source delta changes only the following implementation files; tests are excluded from source thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/bootstrap/secret-vault-bootstrap.ts` | 167 | Pass | Pass (`16+/22-`) | Pass | Pass | None | None. |
| `autobyteus-server-ts/src/secret-management/persistence/secret-vault-prisma-repository.ts` | 195 | Pass | Pass (`47+/9-`) | Pass | Pass | Local behavioral correction only | Resolve `CR-024` without moving transaction policy out of this owner. |
| All other cumulative implementation source | Unchanged from Round 30 | Pass | N/A in this delta | Round-30 judgment preserved | Pass | None | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The old sentinel is ignored by absence of production logic, not via a compatibility branch. |
| No legacy old-behavior retention in changed scope | Pass | No Store or credential fallback returned. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Sentinel creation/removal and path ownership are gone from production. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | No new schema or data migration was introduced. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | One current transaction path remains. |
| Approved transition mechanics match the reviewed design | Pass | The finding concerns established restart mutation, not transition/legacy behavior. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, unchanged from Round 30.
- Why: final docs must describe one-DB vault/key lifecycle, explicit configuration/import, backup/restore/reset, and exact recovery/closed states after source/API/E2E pass.
- Files or areas likely affected: secret management, LLM/provider Settings, test/import setup, operations, release notes, and final handoff.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

No upstream premise was reclassified. `CR-MP-024` remains confirmed and is correctly handled by the rework. One new premise records the ordinary established restart that drives `CR-024`.

### `CR-MP-025` — normal established vault restart reaches the row-matching writer-lock statement

- Origin: `New`
- Related approved requirement or established contract: `AC-003`; `BEH-003`; `encrypted-secret-vault-contract.md` “Established startup”.
- Relevant behavior ID(s): `BEH-003`.
- Initiating basis kind: `System` and `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: normal server restart after successful first initialization is a supported runtime lifecycle, and AC-003 expressly requires the pair to be verified without rewriting either.
- Support evidence: the application server always invokes vault initialization after migrations; an established vault necessarily contains singleton metadata ID `1`.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: normal server restart -> migrations -> `SecretVaultRuntime.initialize` -> `SecretVaultBootstrap.initializeOrVerify` -> `SecretVaultPrismaRepository.withInitializationLock` -> row-matching `UPDATE` of singleton ID `1` -> key/metadata verification -> transaction commit.
- Lifecycle preconditions and material consequence at the claimed point: a healthy established application DB/key pair exists and no secret/configuration mutation was requested. The lock statement still commits a physical DB change. A disposable current-build probe observed the external connection's `PRAGMA data_version` advance from `1` to `2`, database mtime change, and SHA-256 change after only the second bootstrap.
- Reachability: `Reachable`.
- Review consequence / proportionate response: fail with one bounded repository-lock correction and a non-mutation regression. Preserve SQLite process-bound mutual exclusion and CR-023 recovery; acquire writer ownership without updating a committed application row or otherwise mutating established DB/key state solely for verification.

## Review Scorecard

- Overall score (`/10`): `9.33`
- Overall score (`/100`): `93.3`
- Score calculation note: simple average across ten mandatory categories. Runtime correctness and API/E2E readiness remain below `9.0`; the average does not override the fail decision.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Initialization/recovery/concurrency paths are now explicit and transaction-scoped. | The lock statement embeds an unintended persisted mutation in the verification spine. | Keep acquisition separate from application-row mutation. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Repository owns transaction mechanics and bootstrap owns lifecycle policy. | None structural; the defect is local repository behavior. | Preserve owners. |
| 3 | API / Interface / Query / Command Clarity | 9.4 | The narrowed initialization repository is clear and safe to consume. | `withInitializationLock` promises locking but also rewrites the matched metadata row. | Align method effect with its name/contract. |
| 4 | Separation of Concerns and File Placement | 9.4 | The fix is compact and correctly placed. | The writer-acquisition mechanism is coupled to a persisted domain row. | Use a non-mutating acquisition within the same owner. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | One transaction-scoped repository interface contains all initialization operations. | No material model gap. | Preserve it. |
| 6 | Naming Quality and Local Readability | 9.5 | Code and tests are readable, and comments explain process-bound ownership. | The “lock” comment omits that the selected statement causes a committed established-row rewrite. | Make implementation effects match the comment. |
| 7 | API/E2E Readiness | 8.5 | CR-023 recovery/concurrency and focused suites are green. | The assembled server would mutate DB bytes on every otherwise read-only restart verification. | Resolve and add no-rewrite evidence before downstream execution. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.4 | Interrupted recovery, live serialization, and fail-closed missing-key behavior now conform. | AC-003 established restart no-rewrite is directly violated. | Acquire the SQLite writer lock without committed application-state mutation. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Sentinel and Store paths are cleanly absent from production. | None. | Preserve clean cut. |
| 10 | Cleanup Completeness | 9.6 | The former production sentinel is fully removed and the delta is clean. | Missing no-rewrite regression allowed the replacement side effect through. | Add focused invariant coverage. |

## Findings

### `CR-024` — established startup rewrites the application database solely to acquire initialization ownership

- Severity / classification: `Medium` / `Local Fix`.
- Affected behavior and contract: `BEH-003`, `AC-003`, and the normative established-startup verification lifecycle.
- Material-premise record: `CR-MP-025` (`Reachable`).
- Evidence: `autobyteus-server-ts/src/secret-management/persistence/secret-vault-prisma-repository.ts:63-81` executes `UPDATE secret_encryption_metadata SET singleton_id = singleton_id WHERE singleton_id = 1` for every bootstrap. In an established vault this matches the singleton row. A disposable current-build restart probe confirmed `READY` but observed `PRAGMA data_version` `1 -> 2`, DB mtime change, and DB SHA-256 change after the second bootstrap. The new tests verify semantic metadata/key equality but do not assert that established restart avoids persistence changes.
- Production trigger/path/consequence: normal supported established server restart -> mandatory vault initialization -> row-matching update -> commit -> application DB changes even though startup was required only to verify the unchanged pair and no user/operator mutation occurred.
- Why this is implementation-owned: AC-003 unambiguously requires restart verification without rewriting key or metadata; the repository's lock-acquisition statement is a bounded implementation choice, not a missing design decision.
- Required bounded action: preserve process-bound SQLite mutual exclusion, interrupted key-only recovery, and live-initializer serialization, but acquire initialization ownership without updating a committed application row or causing an established verification-only startup to mutate DB/key state. Add deterministic evidence that the second established bootstrap leaves key bytes, metadata values, DB observer data-version/file state, and relevant sidecars unchanged while concurrency and crash recovery remain green.

## Classification

`Local Fix`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- After `CR-024` is corrected and source review passes, API/E2E must resume the round-28 one-DB `.env.test`, migration/start/restart, importer, Settings, provider, Docker, Electron, real configured capability, leak-scan, and cleanup matrix.
- Realistic API/E2E should still verify read-only importer preview and coordinated DB/key backup/reset behavior; no separate source finding is open for those paths.
- Normalize the subordinate Vertex Express secret-ID separator typo in final documentation; requirements, normative contract, catalog, and source are already authoritative and consistent.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, Prisma `5.22.0`, no automatic import/update, unchanged Docker topology, and `DASHSCOPE_API_KEY` as sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Fail` (`CR-MP-025` is independently supported and reachable).
- Score Summary: `9.33/10` (`93.3/100`); API/E2E readiness `8.5` and runtime correctness `8.4` remain below clean-pass threshold.
- Failure Origin: implementation-owned SQLite initialization lock acquisition in `SecretVaultPrismaRepository.withInitializationLock`.
- Recommended Recipient: `implementation_engineer`
- Notes: CR-023 is resolved. One bounded correction remains: established verification must retain SQLite process-bound serialization without committing a metadata/database rewrite solely to acquire ownership.

# Review Round 32 — CR-024 Verification-Only Restart Rework

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Supplemental Task Artifacts Reviewed As Context: `encrypted-secret-vault-contract.md`, `gemini-setup-ui-ux-spec.md`, `credential-consumer-mapping.md`, `use-case-spine-validation.md`, `secret-storage-architecture.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, `repository-prisma-1.0.8-assessment.md`, and tombstoned `secret-storage-backend-contract.md`
- Current Review Round: `32`
- Trigger: CR-024 source/test commit `14b0f7a96f82d1aa0d27a0858877207ad9953c94`; handoff-only final HEAD `eac929a1f1e411a72d232d961578a700bed12829`; prior reviewed HEAD `7c0b752663cec85a671ea9c530af753f537544e5`
- Prior Review Round Reviewed: `31`
- Latest Authoritative Round: `32`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: N/A for implementation review.
- Execution Coverage Report Reviewed: N/A for implementation review.
- Failing Scenario IDs: N/A.
- Exact Failing Commands / Execution Mode: N/A.
- Failure Evidence Paths: N/A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 30 | One-database vault implementation | Preserved cumulative findings | `CR-023` | Fail | No | Persistent sentinel blocked interrupted initialization. |
| 31 | SQLite transaction rework | `CR-023` | `CR-024` | Fail | No | Interruption/concurrency fixed, but row-matching lock statement rewrote established DB. |
| 32 | Verification-only transaction rework at `14b0f7a` / handoff `eac929a` | `CR-023`, `CR-024` | None | Pass | Yes | Prisma SQLite transaction serializes live initializers before callback, releases on termination, and established restart is byte/data-version stable. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 30 | `CR-023` | High / Local Fix | Remains resolved | No production sentinel; the transaction blocks a second live client before callback/key inspection and releases after owner termination; key-only recovery and established missing-key closure remain green. | Independent cross-process probe confirms the ownership property beyond the same-process unit fixture. |
| 31 | `CR-024` | Medium / Local Fix | Resolved | The artificial row-matching `UPDATE` is removed. New regression and independent current-build probe show established bootstrap `READY` with unchanged metadata/key, observer `data_version`, DB/key hashes, mtime, and sidecar state. | No replacement write/fallback was introduced. |
| 1–29 | `CR-001`–`CR-022`, `FR-001` | Mixed | Remain resolved or superseded | The bounded delta changes only vault initialization coordination and its lifecycle coverage. | No preserved finding reopened. |

## Review Scope

- Changed implementation and behavior reviewed: removal of the artificial ownership write; verification-only Prisma SQLite interactive transaction; cross-client/process callback serialization; process-termination release; established DB/key/sidecar non-mutation; preserved interrupted key-only recovery and missing-key closure.
- Cumulative implementation rechecked: one application DB/key pair, migration/bootstrap/crypto/service authorization, provider-owned lazy resolution, importer preview/execution, explicit Gemini mode, metadata/catalog separation, custom-provider coordination, GraphQL/UI/Electron projections, Codex/Claude preservation, and clean separate-Store removal.
- Files / areas reviewed: `secret-vault-prisma-repository.ts`, `secret-vault-bootstrap.ts`, `secret-vault-lifecycle.test.ts`, root-key/runtime collaborators, AC-003 and normative vault contract, implementation handoff, cumulative source audit/report/artifacts.
- Explicit exclusions: no API/E2E, Docker runtime, real provider, packaged Electron, canonical user DB, real key, credential source, or secret value was accessed.
- Independent checks:
  - `git diff --check 7c0b752..14b0f7a` passed;
  - focused vault lifecycle/inspection/importer suite passed `3` files / `18` tests;
  - current-build established-restart probe: `data_version 1 -> 1`, DB mtime/hash stable, key hash stable, `READY`;
  - cross-process current Prisma 5.22 probe: a live child transaction blocked the second process before callback; `SIGKILL` released ownership and the second callback entered successfully;
  - changed repository source is `191` effective non-empty lines; handoff commit changes only `implementation-handoff.md`;
  - implementation-reported server production build passed after the source fix.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a live initializer owns the pair before key inspection; terminated ownership releases automatically; interrupted valid-key/empty-domain initialization resumes; established restart verifies without rewriting DB/key; invalid pair states remain closed.
- Design-spec behavior map verified against the implementation: yes.
- Design review report and round confirmed: architecture round 28 `Pass`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-003`, `REQ-004`–`REQ-005`, `AC-003` — initialization/restart | Confirmed | Startup -> canonical DB identity -> Prisma SQLite transaction ownership -> key inspection -> transaction-scoped metadata/count/create/verify -> commit/rollback. Live owners serialize; termination releases; established read-only verification remains byte-stable. | None. |
| `BEH-009`, `REQ-011`, `AC-009` — importer execution/preview | Confirmed | Preview remains separate query-only inspection; confirmed execution uses the same corrected normal bootstrap and transactional batch recheck. | None. |
| `BEH-001`–`BEH-002`, `BEH-004`–`BEH-015` | Confirmed unchanged | No implementation delta outside vault initialization repository and lifecycle test. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Normative one-DB vault contract and architecture round 28 remain coherent. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Recovery, serialization, established verification, and closed states now align. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Initialization ownership/read/create/verify and provider/importer spines remain explicit. | None. |
| Ownership boundary preservation and clarity | Pass | Repository owns DB transaction mechanics; bootstrap owns lifecycle; root-key owner remains separate. | None. |
| Off-spine concern clarity | Pass | Health, zeroization, timeouts, metadata provenance, and UI projection retain clear owners. | None. |
| Existing capability/subsystem reuse check | Pass | Existing Prisma SQLite transactions provide process-bound ownership without a custom persistent lock. | None. |
| Reusable owned structures check | Pass | One transaction-scoped initialization repository is reused for reads/count/create. | None. |
| Shared-structure/data-model tightness check | Pass | No parallel Store/lock/config model or broad context exists. | None. |
| Repeated coordination ownership check | Pass | Initialization coordination is singular in `withInitializationLock`. | None. |
| Empty indirection check | Pass | The boundary enforces real transactional ownership. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Bootstrap policy, persistence mechanics, key custody, crypto, and service remain separate. | None. |
| Ownership-driven dependency check | Pass | Bootstrap receives only the narrow initialization repository, not Prisma internals. | None. |
| Authoritative Boundary Rule check | Pass | No caller bypasses repository/service owners. | None. |
| File placement check | Pass | Rework remains in vault persistence/lifecycle owners. | None. |
| Flat-vs-over-split layout judgment | Pass | No wrapper or extra subsystem was introduced. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | `withInitializationLock` now has lock-only external effects plus the supplied operation. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | Names and comments match the demonstrated transaction behavior. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No duplicate initialization or snapshot policy exists in production. | None. |
| Patch-on-patch complexity control | Pass | Both obsolete sentinel and artificial ownership write are removed rather than retained. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No production `.initialize.lock` or no-op ownership write remains. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests cover key-only recovery, live serialization, single domain/key, missing-key closure, and DB/key/sidecar/data-version stability. | API/E2E should exercise full process restart. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Snapshot helper and paused root-key delegate serve distinct lifecycle assertions. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Stale sentinel is only a regression witness; no production compatibility behavior exists. | None. |
| API/E2E readiness for the next workflow stage | Pass | Source findings are closed; focused suites/builds and independent lifecycle probes are green. | Resume prescribed API/E2E reconciliation/execution. |

## Source File Size And Structure Audit

The cumulative Round-30 audit remains applicable. The CR-024 rework changes one implementation file; tests are excluded from source thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/persistence/secret-vault-prisma-repository.ts` | 191 | Pass | Pass (`4+/8-`) | Pass | Pass | None | None. |
| All other cumulative implementation source | Unchanged from Round 30 | Pass | N/A in this delta | Round-30 judgment preserved | Pass | None | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No sentinel compatibility branch or Store fallback exists. |
| No legacy old-behavior retention in changed scope | Pass | No automatic credential migration/update returned. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Artificial write and persistent sentinel are absent. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | No schema/data transition change. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | One current vault path remains. |
| Approved transition mechanics match the reviewed design | Pass | Additive app DB migration and discard/reconfigure old Store decision remain intact. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, unchanged.
- Why: the final package must document the one-DB/key lifecycle, explicit provisioning/import, selected Gemini mode, backup/restore/reset, test-runtime setup, and removed separate Store.
- Files or areas likely affected: secret management, LLM/provider Settings, operator/test setup, deployment/operations, release notes, and final handoff.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

No upstream premise was reclassified. `CR-MP-024` and `CR-MP-025` remain `Reachable`; the current implementation now satisfies both.

No new material premise is required. The independent cross-process and byte-stability probes validate the exact previously recorded lifecycle triggers and consequences.

## Review Scorecard

- Overall score (`/10`): `9.62`
- Overall score (`/100`): `96.2`
- Score calculation note: simple average across ten mandatory categories. Every category meets the `>=9.0` clean-pass threshold.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.7 | Startup, provisioning, provider, importer, and restart lifecycles are singular and traceable. | Broader assembled proof is downstream. | Preserve these spines during E2E reconciliation. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.7 | DB selection, transaction ownership, key custody, crypto, service authorization, and provider resolution are explicit. | None material. | Preserve owners. |
| 3 | API / Interface / Query / Command Clarity | 9.6 | Narrow transaction repository and value-free/write-only public contracts align with effects. | Transport projections remain necessarily numerous. | Keep generated/schema checks authoritative. |
| 4 | Separation of Concerns and File Placement | 9.5 | Vault components and UI/provider concerns remain coherently separated and placed. | Several cumulative files remain close to 500 lines. | Avoid unrelated growth. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.7 | One DB/domain/key/catalog/service/resolver model replaces parallel Store shapes. | None material. | Preserve clean cut. |
| 6 | Naming Quality and Local Readability | 9.6 | Names/comments now match verified lock-only and read-only restart effects. | Transaction behavior depends on pinned Prisma/SQLite semantics. | Keep the cross-process regression when dependencies change. |
| 7 | API/E2E Readiness | 9.3 | Focused tests, builds, byte-stability, and process-termination probes pass. | Full `.env.test`, server, Docker, Electron, provider, and leak matrix is pending. | Execute downstream. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.7 | Recovery, live serialization, no-rewrite restart, closed states, encryption/custody, and explicit provisioning align. | Real assembled lifecycle proof remains pending. | Execute prescribed restart/import/provider scenarios. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Separate Store/sentinel/legacy credential paths are absent with no dual read/write or fallback. | None. | Preserve. |
| 10 | Cleanup Completeness | 9.6 | Obsolete architecture and both failed lock mechanisms are removed; source delta is clean. | Downstream-owned stale tests/reports still require reconciliation. | Complete in API/E2E/delivery ownership stages. |

## Findings

No implementation-source finding remains open.

- `CR-023`: resolved and independently confirmed across process termination/live ownership.
- `CR-024`: resolved and independently confirmed with DB/key/data-version byte stability.

## Classification

`Pass`

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- API/E2E must reconcile the preserved durable harness/tests with the round-28 one-DB contract and execute `.env.test` runtime materialization, migration/start/restart, importer preview/confirmed execution, Settings/Gemini, provider resolution, real configured capabilities, Docker, Electron, leak scans, and cleanup.
- Keep the new cross-process/no-rewrite invariants when Prisma or SQLite changes; exact current behavior was independently confirmed at Prisma `5.22.0`.
- Normalize the subordinate Vertex Express secret-ID separator typo in final documentation; requirements, normative contract, catalog, and source are authoritative and consistent.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, Prisma `5.22.0`, no automatic import/update, unchanged Docker topology, and `DASHSCOPE_API_KEY` as sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass` (`CR-MP-024` and `CR-MP-025` remain reachable and are satisfied).
- Score Summary: `9.62/10` (`96.2/100`); every category is at least `9.3`.
- Failure Origin: N/A.
- Recommended Recipient: `api_e2e_engineer`
- Notes: CR-023 and CR-024 are closed. The cumulative one-database secret-vault implementation is ready for API/E2E reconciliation and broader executable validation.

# Review Round 33 — SCSP-E2E-IMPORT-REAL-001 Focused Failure-Origin Review

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Review Round: `33`
- Trigger: user-requested real-source test import dry-run at unchanged implementation HEAD `eac929a1f1e411a72d232d961578a700bed12829`
- Requirements / Design Basis: `BEH-009`, `BEH-011`, `AC-007`, `AC-009(d)`, `DS-UC008C`, and the normative test-import workflow in `live-test-secret-provisioning.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/coverage-investigation.md`
- Execution Coverage Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-coverage-report.md`
- Failing Scenario ID: `SCSP-E2E-IMPORT-REAL-001`
- Exact Command: `pnpm secrets:local:import:test -- --source /Users/normy/.autobyteus/server-data/.env --dry-run`
- Expected: value-free preview targets the persistent project test application database selected by committed `autobyteus-server-ts/.env.test`, namely `autobyteus-server-ts/db/test.db`.
- Observed: value-free preview targeted `/Users/normy/.autobyteus/server-data/db/production.db`.
- Failure Evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/171-round14-real-source-import-preview.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/172-round14-import-target-failure-origin.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/173-round14-import-failure-evidence-scan.log`

## Approved Behavior And Reachability Confirmation

- Independent supported initiating action: an operator runs the documented root command `pnpm secrets:local:import:test` with an explicit absolute assignment source (`AC-009(d)`, `DS-UC008C`, `live-test-secret-provisioning.md:139-151`).
- Governing contract: the wrapper may read committed `.env.test` only to materialize the ignored persistent test runtime `.env`; normal AppConfig/importer behavior must then bind exclusively to that selected test application DB/key. Parent `DATABASE_URL` or other application settings must not choose a different target.
- Supported path trace: root script -> `run-test-import.mjs` -> `materializeTestRuntime()` -> persistent test runtime `.env` -> AppConfig initialized for that runtime -> normal importer preview/execution -> selected test DB only.
- Reachability status: `Reachable`. The exact documented command was executed with an approved source and reproduced the target mismatch. No synthetic downstream mechanism is used to establish the path.
- Safety consequence: a confirmed non-dry-run retry could have imported into the parent-selected production database. API/E2E correctly stopped after query-only preview, before confirmation or write.

## Focused Failure Trace

1. Root `package.json` runs `node test-support/live-e2e/run-test-import.mjs` in the caller's current OS environment.
2. `run-test-import.mjs` calls `materializeTestRuntime({ runtimeRoot: persistentTestRuntimeRoot })`, correctly writing the fixed `.env.test` selection into the ignored runtime `.env`.
3. Unlike the server/web/dev/real-provider wrappers, `run-test-import.mjs` neither spawns under nor applies `createSanitizedTestEnvironment`; evidence `172` records sanitizer calls `0` while parent `DATABASE_URL`, `DB_NAME`, `AUTOBYTEUS_SERVER_HOST`, and `APP_ENV` are set.
4. The wrapper initializes normal `AppConfig` in that same unsanitized process.
5. `AppConfig.get()` intentionally applies production precedence `process.env[key] ?? configData[key]`; `initSqlitePath()` therefore canonicalizes the parent `DATABASE_URL`, not the materialized test value.
6. The normal importer correctly receives `config.getOperationalDatabaseLocation()` and reports that parent target value-free. The importer/source reader/vault inspection did not independently select or fall back to another target.

## Failure-Origin Decision

| Question | Decision | Evidence |
| --- | --- | --- |
| Does the failing scenario still represent approved behavior? | Yes | `AC-009(d)`, `DS-UC008C`, and the live-test supplement explicitly require `secrets:local:import:test` to use the selected test DB/key. |
| Is production AppConfig precedence defective? | No | Environment-over-file precedence is the established normal application configuration contract; normal server/test wrappers isolate the child environment. Changing production precedence would alter supported non-test behavior. |
| Is the normal importer target selection defective? | No | It consumes the canonical location supplied by AppConfig and truthfully reported the resulting target; no target argument/fallback or second importer is authorized. |
| Is the failure API/E2E-owned? | Yes | The durable test wrapper executes AppConfig in an ambient parent environment instead of the reviewed sanitized test-runtime boundary. |
| Was this reasonably detectable in implementation source review? | No as an implementation-source defect | `run-test-import.mjs` is downstream durable test support and was explicitly left for API/E2E ownership after source review. |
| Was there a prior proportional test-review gap? | Yes, bounded | Review round 5 passed the wrapper's target isolation without noticing that it never used the shared sanitizer. This does not reopen the implementation scorecard. |

## Finding

| Finding ID | Severity | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| `FR-002` | Critical for test target isolation | `run-test-import.mjs` materializes the correct runtime but initializes AppConfig in the ambient parent process; `AppConfig.get()` gives that parent `DATABASE_URL` authority; evidence `171` reports the production target and evidence `172` records all relevant parent settings as set with zero sanitizer calls. | In the API/E2E-owned wrapper, apply the shared sanitized test environment before importing/initializing AppConfig, or invoke the same normal importer boundary in a sanitized child while preserving TTY/stdin and the materialized runtime. Do not change production AppConfig precedence, add a DB target argument, parse `.env.test` a second time, or create another importer. Add deterministic coverage with hostile parent `DATABASE_URL`/`APP_ENV`/host/DB-name canaries proving dry-run and confirmed import select only the materialized test DB; prove the parent target DB/key/sidecars remain absent or byte-identical. Then rerun `SCSP-E2E-IMPORT-REAL-001` preview first, verify the exact test target, and only then continue the explicitly requested import/browser/configured-provider workflow. | `Local Fix` / `api_e2e_engineer` |

## Classification And Routing

- Classification: `Local Fix`
- Confirmed Owner: `api_e2e_engineer`
- Implementation Source Review: remains `Pass`; no implementation-owned correction or score deduction.
- API/E2E Result: `Fail` for the expanded Round 14 request; historical Round 13 Pass remains evidence only.
- Delivery: paused. The proportional durable-test Pass from review round 6 is historical for the prior package and cannot authorize delivery until this durable wrapper fix is executed and proportionally reviewed.
- Required return path: API/E2E-owned wrapper/test correction -> focused target-isolation execution -> remaining user-requested browser/configured-provider workflow if safe -> API/E2E result -> separate proportional durable-test rereview when durable test support changed.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Failure Origin: API/E2E-owned ambient-environment leakage in `test-support/live-e2e/run-test-import.mjs`
- Finding: `FR-002`
- Recommended Recipient: `api_e2e_engineer`
- Notes: The dry-run safety stop prevented writes and emitted only value-free plan data. Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, both Claude modes unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic import/update, unchanged Docker topology, source/template immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

# Review Round 34 — Explicit Importer Target Authority

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Current Review Round: `34`
- Trigger: architecture-round-30 implementation at final handoff HEAD `e8ef13c3b0c86400ea79f2de0d15a5f1dc50003e`; source/test/package commit `ccc373f3755a30eca38ab50f8639539e6095385f`
- Prior Review Round Reviewed: `33`
- Latest Authoritative Round: `34`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/encrypted-secret-vault-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/gemini-setup-ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/credential-consumer-mapping.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/use-case-spine-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-architecture.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/live-test-secret-provisioning.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/threat-model-and-option-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/repository-prisma-1.0.8-assessment.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-backend-contract.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture round 30 `Pass`)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation / Execution Coverage Report: historical context only; this is an implementation-review entry point.
- Failing Scenario IDs / Commands / Evidence: N/A for this entry point.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 33 | Real-source import target-isolation failure | None | `FR-002` | Fail | No | Superseded by the user-approved explicit-target design; the special wrapper was removed. |
| 34 | Architecture-round-30 implementation | `FR-002`, `CR-023`, `CR-024` | `CR-025` | Fail | Yes | Explicit authority is correct; strict absolute-file validation misses decoded NUL. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 33 | `FR-002` | Critical | Superseded / resolved by approved design | `pnpm secrets:import` now requires `--database-url`; `run-test-import.mjs` and the old local/test importer commands are absent; no AppConfig or ambient target authority remains below the CLI. | The prior API/E2E wrapper fix is no longer the approved solution. |
| 31 | `CR-023` | High | Remains resolved | Vault initialization retains SQLite process-bound serialization and interrupted key-only recovery. Focused lifecycle tests passed. | No round-30 regression. |
| 32 | `CR-024` | High | Remains resolved | Established vault verification remains byte-stable and contains no artificial ownership write. Focused lifecycle tests passed. | No round-30 regression. |

## Review Scope

- Changed implementation and behavior reviewed: sole `secrets:import` command; exact raw and typed request shapes; strict target parsing; immutable target propagation through preview, display, confirmation, migrations, bootstrap, and transactional execution; explicit migration inputs; preservation of normal AppConfig runtime ownership.
- Files / areas reviewed: all seven changed production source files, four changed unit-test files, root package command, architecture round-30 artifacts, implementation handoff, relevant runtime/vault/inspection dependencies, all callers of `runMigrations`, residue scans, and downstream API/E2E readiness.
- Explicit exclusions: no real credential, secret-bearing source, canonical DB/key, Docker, browser, provider, external account, or packaged app was accessed. Pre-existing downstream-owned dirty tests/reports/evidence were preserved.
- Independent checks:
  - focused six-file suite: `6/6` files, `69/69` tests passed;
  - `pnpm -C autobyteus-server-ts build` passed, including shared builds, Prisma 5.22 generation, built-in bootstrap smoke, and sanitized no-`DATABASE_URL` smoke;
  - sanitized built-CLI dry-run against an absent explicit target reported `INITIALIZATION_REQUIRED`, emitted no value, and left DB/key/WAL/SHM absent;
  - `git diff --check`, command/authority/caller/residue scans, and changed-source size audit passed;
  - independent malformed-target probe reproduced `CR-025`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: the standalone operator command must receive one absolute assignment source and one explicit absolute SQLite file URL; that URL is the sole target authority and must be rejected before source or target access when malformed or non-canonicalizable.
- Design-spec behavior map verified against the implementation: confirmed for the main target-authority path, contradicted for one strict-validation case recorded as `CR-025`.
- Design review report and round confirmed: architecture round 30 `Pass`, including reachable premise `MP-011`.
- Behavior-basis status: `Contradicted`.
- Changed or newly discovered behavior: none; `CR-025` is an implementation defect against existing `BEH-009` / `REQ-002` / `AC-007`.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-009`, `REQ-002`, `AC-007`, `DS-UC008A–C` — normal explicit target | Confirmed | Root `secrets:import` -> CLI exact option parse -> one `ApplicationDatabaseLocation.fromAbsoluteFileUrl()` conversion -> frozen `ImportRequest` -> same `targetLocation` instance to inspector, confirmation, migration/bootstrap runtime, and batch write. | None. Parent `DATABASE_URL`, AppConfig, source `DATABASE_URL`, cwd, profile, and `.env.test` do not select the target. |
| `BEH-009`, `REQ-002`, `AC-007` — invalid target rejection | Contradicted | `decodeConfiguredPath()` accepts `file:///tmp/review%00target.db`; `fileURLToPath()` returns a path containing U+0000; the location is frozen and passed downstream. The CLI reads the source, inspection returns `UNAVAILABLE`, and the plan emits a NUL-bearing target instead of `IMPORT_OPTIONS_INVALID`. | Independent built-CLI result: exit `1`, `outputContainsNul=true`, `rejectedAsInvalidOptions=false`, target prefix `"/tmp/review\\u0000target.db"`. |
| `BEH-003` / one-DB runtime | Confirmed unchanged | Server startup passes AppConfig-owned app root and canonical database URL explicitly to migrations, then initializes the vault at the same typed location. | None. |
| `BEH-010`–`BEH-014` | Confirmed unchanged | No automatic legacy update, Docker change, Claude/Codex redesign, Qwen mapping change, or provider fallback was introduced. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Round-30 artifacts identify the prior implicit-target ownership defect and replace it cleanly. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Main explicit-target contract matches; decoded NUL violates the normative invalid/malformed target rule. | Resolve `CR-025`. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Operator -> CLI adapter -> typed location -> source/inspection -> plan/confirmation -> migration/bootstrap -> service transaction is singular and traceable. | None. |
| Ownership boundary preservation and clarity | Pass | CLI owns raw input; `ApplicationDatabaseLocation` owns canonical identity; inspection is read-only; runtime/service own writes. | None. |
| Off-spine concern clarity | Pass | Source trust, URL canonicalization, migration execution, inspection, and TTY projection serve explicit owners. | None. |
| Existing capability/subsystem reuse check | Pass | Shared DB-location, migration, inspection, runtime, and secret-service owners are reused. | None. |
| Reusable owned structures check | Pass | One `ApplicationDatabaseLocation` and one exact `ImportRequest` replace duplicate raw/path/profile authority. | None. |
| Shared-structure/data-model tightness check | Pass | Raw request is exactly four fields at the CLI; downstream request is exactly four fields and contains no raw URL. | None. |
| Repeated coordination ownership check | Pass | Target selection/canonicalization occurs once; migration receives explicit input rather than rereading AppConfig. | None. |
| Empty indirection check | Pass | Factories enforce target-specific construction and test seams; none is pass-through-only. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | CLI adaptation, location identity, inspection, import orchestration, and migration mechanics remain separate. | None. |
| Ownership-driven dependency check | Pass | Importer does not depend on AppConfig or its provider; runtime code still does. | None. |
| Authoritative Boundary Rule check | Pass | Importer uses the public inspection/runtime/service boundaries and does not open Prisma/key/repository internals directly. | None. |
| File placement check | Pass | Changed files remain in configuration, startup, runtime, and secret-provisioning owners. | None. |
| Flat-vs-over-split layout judgment | Pass | The layout is readable without compatibility wrappers or a parallel test-import subsystem. | None. |
| Interface/API/query/command/service-method boundary clarity | Fail | The strict absolute-file constructor accepts an OS-invalid decoded path and therefore does not fully enforce its declared boundary. | Resolve `CR-025`. |
| Naming quality and naming-to-responsibility alignment check | Pass | `RawImportCliRequest`, `ImportRequest`, `targetLocation`, and `fromAbsoluteFileUrl` communicate authority clearly. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No second URL parser, target resolver, or migration AppConfig lookup remains. | None. |
| Patch-on-patch complexity control | Pass | Old commands/wrapper/implicit target are removed rather than wrapped. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No old local/test importer command, target profile, key-path flag, or wrapper remains in implementation/package source. | Downstream E2E/docs must reconcile later. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Tests cover ordinary invalid schemes/relative/query/fragment cases but miss a decoded OS-invalid NUL path. | Add a deterministic `CR-025` regression. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Existing location/source/factory helpers keep the focused suites concise. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed implementation scope | Pass | Changed unit tests use only the new shapes. | Downstream-owned stale E2E is for API/E2E reconciliation after source passes. |
| API/E2E readiness for the next workflow stage | Fail | Main suites/build are green, but the strict target boundary is not yet complete. | Fix `CR-025`, rerun full source review, then API/E2E. |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `src/config/app-config.ts` | 497 | Pass | Review (`2+/5-`) | Existing cohesive AppConfig owner; round-30 change only adopts the typed location constructor | Pass | None | Avoid unrelated growth. |
| `src/config/application-database-location.ts` | 62 | Pass | Pass (`41+/20-`) | One canonical DB/path/key identity concern | Pass | `Local Fix` for `CR-025` only | Reject decoded NUL before construction. |
| `src/secret-management/cli/import-local-environment-secrets.ts` | 140 | Pass | Pass (`53+/14-`) | CLI-only raw parsing/projection/TTY concern | Pass | None | Add strict-invalid regression evidence. |
| `src/secret-management/provisioning/local-environment-secret-import-service.ts` | 168 | Pass | Pass (`62+/30-`) | Import orchestration and target propagation remain cohesive | Pass | None | None. |
| `src/secret-management/provisioning/local-environment-secret-import.ts` | 44 | Pass | Pass (`5+/3-`) | Tight import domain/result/error contracts | Pass | None | None. |
| `src/server-runtime.ts` | 209 | Pass | Pass (`5+/1-`) | Existing server composition/startup owner | Pass | None | None. |
| `src/startup/migrations.ts` | 280 | Pass | Review (`8+/9-`) | One Prisma command/engine/migration concern; explicit input narrows rather than expands ownership | Pass | None | Avoid unrelated growth. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No compatibility command, wrapper, alias, profile, or duplicate target parser remains. |
| No legacy old-behavior retention in changed scope | Pass | `secrets:local:import`, the test importer, AppConfig target inference, and default/e2e selection are absent. |
| Dead/obsolete code cleanup completeness in changed implementation scope | Pass | Production/package cleanup is complete; API/E2E/docs reconciliation remains owned downstream. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | One current application DB/key path remains; no legacy Store transition owner was added. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | One typed target and one current vault path. |
| Approved transition mechanics match the reviewed design | Pass | Normal application migrations receive explicit canonical DB URLs; importer execution uses the same typed target. |

## Dead / Obsolete / Legacy Items Requiring Removal

None in implementation-owned production/package source. The preserved downstream `current-database-import-lifecycle.e2e.test.ts` and old importer wording are explicitly API/E2E/delivery reconciliation work, not compatibility authority.

## Docs-Impact Verdict

- Docs impact: `Yes`.
- Why: operator syntax and target selection changed from implicit/local/test naming to one explicit absolute database URL.
- Files or areas likely affected: server README, secret-management operator docs, test-runtime/live-E2E instructions, release notes, and final handoff. Existing dirty downstream docs still contain old importer wording and must be reconciled after implementation/API-E2E pass.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-011` | Confirmed | The supported operator command and explicit target requirement remain reachable; the implementation correctly removes ambient authority but incompletely rejects one OS-invalid decoded path. |

### `CR-MP-026` — Percent-encoded NUL does not identify a usable local SQLite file

- Origin: `New`, within approved `MP-011`
- Related approved requirement or established contract: `BEH-009`, `REQ-002`, `AC-007`; malformed/non-canonicalizable database input must fail as `IMPORT_OPTIONS_INVALID` before source values are read or the target is accessed.
- Relevant behavior ID(s): `BEH-009`, `DS-UC008A–C`
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger: an operator invokes supported `pnpm secrets:import` with an absolute source and a purported absolute SQLite file URL containing `%00`.
- Support evidence: the root command intentionally accepts operator-supplied `--database-url`; invalid-input behavior is an explicit acceptance criterion, not a synthetic internal-only path.
- Forward production path: root command -> CLI parse -> `createImportRequest()` -> `ApplicationDatabaseLocation.fromAbsoluteFileUrl()` -> decoded path containing U+0000 -> source reader -> `SecretVaultInspectionService` -> `UNAVAILABLE` plan containing the NUL target.
- Lifecycle preconditions and material consequence: all OS filesystem APIs reject NUL-containing paths, so the value cannot identify the promised SQLite file. Accepting it bypasses fail-before-access, reads the selected source, and writes a control byte into value-free plan output.
- Reachability: `Reachable`.
- Review consequence / proportionate response: bounded validation and regression coverage only; no redesign or new target authority.

## Review Scorecard

- Overall score (`/10`): `9.36`
- Overall score (`/100`): `93.6`
- Score calculation note: simple average across ten mandatory categories. Categories 3, 7, and 8 are below the `9.0` clean-pass threshold because of `CR-025`.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.7 | Explicit operator-to-target-to-transaction flow is singular and traceable. | Broader assembled proof remains downstream. | Preserve this spine in E2E. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.7 | Raw input, typed location, inspection, migration/runtime, and service write owners are clear. | None material. | Preserve. |
| 3 | API / Interface / Query / Command Clarity | 8.8 | Request shapes are tight and raw authority is discarded once. | `fromAbsoluteFileUrl` accepts a decoded path that cannot be an OS file. | Enforce the constructor's strict contract. |
| 4 | Separation of Concerns and File Placement | 9.5 | CLI, config identity, import orchestration, inspection, and migrations remain separate. | Two established files remain above 220 lines. | Avoid unrelated growth. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.7 | One frozen location and exact request replace all parallel target shapes. | None material. | Preserve. |
| 6 | Naming Quality and Local Readability | 9.5 | Names describe authority and lifecycle accurately. | Strictness implied by `fromAbsoluteFileUrl` is not fully enforced. | Close `CR-025`. |
| 7 | API/E2E Readiness | 8.8 | Focused tests/build and valid absent-target probe pass. | One acceptance-criterion validation gap remains; downstream test reconciliation must wait. | Fix and re-review source. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.8 | Valid explicit targets flow correctly and dry-run is non-mutating. | Malformed decoded NUL reaches source/inspection and plan output. | Reject before service/source access. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Old commands, wrapper, profiles, and implicit target inference are removed cleanly. | None. | Preserve. |
| 10 | Cleanup Completeness | 9.3 | Implementation/package cleanup is complete. | Downstream E2E/docs still need ownership-appropriate reconciliation. | Complete after source passes. |

## Findings

| Finding ID | Severity | Affected Basis | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| `CR-025` | Medium | `BEH-009`, `REQ-002`, `AC-007`, `CR-MP-026` | `application-database-location.ts` checks scheme, query/fragment, leading slash, and `path.isAbsolute`, but not U+0000 after `fileURLToPath`. Independent built-CLI execution with `file:///tmp/review%00target.db` produced exit `1`, a NUL-bearing `TARGET`, `UNAVAILABLE`, and no `IMPORT_OPTIONS_INVALID`; source reading and target inspection therefore occurred. | In the strict absolute-file entrypoint, reject a decoded path containing U+0000 before constructing `ApplicationDatabaseLocation`. Map it value-free to `IMPORT_OPTIONS_INVALID`. Add deterministic coverage proving the raw URL is rejected before service/source/target access and no control byte reaches output. Preserve the configured AppConfig path behavior unless the same invalid-path invariant is intentionally shared without changing relative URL semantics. | `Local Fix` / `implementation_engineer` |

## Classification

`Local Fix`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- After `CR-025`, API/E2E must reconcile the preserved current-database importer E2E with the explicit `--database-url` command and rerun the user-requested real-source dry-run against the exact project test DB before any confirmed write.
- The API/E2E stage should prove hostile parent `DATABASE_URL`, source-file `DATABASE_URL`, cwd, `.env`, and `.env.test` cannot redirect the explicit target; then continue the authorized browser/provider workflow only after the value-free target matches.
- Documentation still contains historical importer syntax and remains a delivery-owned update after executable pass.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, not legal clearance or an authentication redesign. Both Claude modes remain unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded; `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8`, Prisma `5.22.0`, no automatic import/update, unchanged Docker topology, source/template immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping remain authoritative.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass` (`MP-011` and `CR-MP-026` are reachable and evidence-backed)
- Score Summary: `9.36/10` (`93.6/100`); API/interface clarity, API/E2E readiness, and runtime fidelity remain below `9.0` because of `CR-025`.
- Failure Origin: bounded strict absolute-file target validation defect in implementation-owned source.
- Recommended Recipient: `implementation_engineer`
- Notes: the explicit-target architecture and all valid-target tests/builds pass. API/E2E remains paused until `CR-025` is fixed and the full implementation-source review passes again.

# Review Round 35 — CR-025 Full Source Rereview

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Current Review Round: `35`
- Trigger: bounded `CR-025` rework at final handoff HEAD `36fc5af434e8321965854a1235f2f36aa154bd38`; source/test commit `1ccb12a9aea8c872d7032eb9ac9e1bcf9cf49d8c`
- Prior Review Round Reviewed: `34`
- Latest Authoritative Round: `35`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `encrypted-secret-vault-contract.md`, `gemini-setup-ui-ux-spec.md`, `credential-consumer-mapping.md`, `use-case-spine-validation.md`, `secret-storage-architecture.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, `repository-prisma-1.0.8-assessment.md`, and `secret-storage-backend-contract.md` at the canonical ticket directory.
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture round 30 `Pass`)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage / Execution Reports: historical downstream context only for this implementation-review entry point.
- Failing Scenario IDs / Commands / Evidence: N/A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 34 | Architecture-round-30 implementation | `FR-002`, `CR-023`, `CR-024` | `CR-025` | Fail | No | Strict target constructor accepted a decoded NUL. |
| 35 | CR-025 bounded correction | `CR-025` and preserved findings | None | Pass | Yes | Strict rejection, value-free failure projection, tests, build, and built-CLI probe pass. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 34 | `CR-025` | Medium | Resolved | `fromAbsoluteFileUrl()` now rejects `databasePath.includes("\0")` before location construction. CLI-level and independent built-process probes return `IMPORT_OPTIONS_INVALID` before service/source/target access with no NUL output. | No AppConfig relative-URL or target-authority behavior changed. |
| 33 | `FR-002` | Critical | Remains superseded / resolved | One explicit `--database-url` is still the sole importer authority; old wrapper/local/test commands remain absent. | API/E2E must reconcile its preserved durable test to the new command. |
| 31–32 | `CR-023`, `CR-024` | High | Remain resolved | Focused lifecycle tests remain green; CR-025 touches no vault initialization mechanics. | No regression. |

## Review Scope

- Changed implementation and behavior reviewed: decoded-NUL rejection in the strict importer target constructor; value-free reusable CLI failure projection; regression coverage proving failure before the importer service boundary.
- Full cumulative path rechecked: root command -> exact CLI raw request -> one typed location conversion -> frozen import request -> inspection/plan/TTY -> explicit migration/bootstrap target -> transactional secret batch; normal server AppConfig path remains independent.
- Files / areas reviewed: all CR-025 source/test changes, all round-30 production files, affected unit tests, package command, migration callers, implementation handoff, residue/size/legacy/docs readiness.
- Explicit exclusions: no real credential, secret-bearing source, canonical DB/key, provider, browser, Docker, external account, or packaged app execution.
- Independent checks:
  - focused six-file suite: `6/6` files and `71/71` tests passed;
  - server production build passed with shared builds, Prisma 5.22 generation, TypeScript, built-in bootstrap smoke, and sanitized no-`DATABASE_URL` smoke;
  - sanitized built CLI with a nonexistent source plus `file:///tmp/review%00target.db` exited `1`, wrote zero stdout bytes, wrote only `LOCAL_SECRET_IMPORT_FAILED IMPORT_OPTIONS_INVALID\n` with warnings suppressed for exact projection comparison, and contained no NUL;
  - cumulative `git diff --check`, authority-residue scan, Docker-delta scan, and source-size audit passed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: one explicit absolute SQLite file URL is the importer's sole target authority; invalid/malformed/non-canonicalizable inputs must fail before source or target access.
- Design-spec behavior map verified against the implementation: yes, including the strict invalid-target branch and preservation of the valid-target path.
- Design review report and round confirmed: architecture round 30 `Pass`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-009`, `REQ-002`, `AC-007`, `DS-UC008A–C` | Confirmed | Root `secrets:import` -> exact parse -> `fromAbsoluteFileUrl()` -> reject invalid decoded path or produce one frozen canonical target -> inspector/confirmation/runtime/service receive that target only. | None. NUL input now exits before service/source/target access. |
| `BEH-003` / one-DB runtime | Confirmed unchanged | AppConfig-owned location still supplies explicit migrations and vault runtime at normal server startup. | None. |
| `BEH-010`–`BEH-014` | Confirmed unchanged | No automatic update, Docker change, Qwen mapping change, Claude/Codex redesign, or fallback was introduced. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Explicit target ownership remains the correct response to the prior ambient-authority defect. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Strict malformed rejection and all preserved vault/provider/test constraints align. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Operator-to-typed-target-to-transaction path remains singular. | None. |
| Ownership boundary preservation and clarity | Pass | CLI owns raw input; location owns identity; inspection observes; runtime/service write. | None. |
| Off-spine concern clarity | Pass | Validation and value-free error projection serve the CLI/location owners. | None. |
| Existing capability/subsystem reuse check | Pass | The correction strengthens the existing location owner. | None. |
| Reusable owned structures check | Pass | One typed location and one failure formatter are reused. | None. |
| Shared-structure/data-model tightness check | Pass | Exact four-field raw and typed requests remain unchanged. | None. |
| Repeated coordination ownership check | Pass | No second parser or target resolver exists. | None. |
| Empty indirection check | Pass | Failure formatter owns real value-free projection used by main and tests. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Path validity remains in configuration identity; output projection remains in CLI. | None. |
| Ownership-driven dependency check | Pass | Importer still has no AppConfig/provider target dependency. | None. |
| Authoritative Boundary Rule check | Pass | No inspector/runtime/repository bypass is introduced. | None. |
| File placement check | Pass | Both changed production concerns remain under their correct owners. | None. |
| Flat-vs-over-split layout judgment | Pass | One-line invariant plus local formatter is proportionate. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | `fromAbsoluteFileUrl` now enforces the usable-file invariant implied by its boundary. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | `formatLocalImportFailure` and the strict constructor remain accurate. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Main and tests use the same failure projection. | None. |
| Patch-on-patch complexity control | Pass | The fix is one invariant, not a fallback or alternate path. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Old target authority remains absent. | Downstream owners reconcile stale test/docs. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests cover constructor rejection, pre-service behavior, failure code, and no control-byte output. | None. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Existing CLI suite and prototype spies provide bounded proof. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed implementation scope | Pass | CR-025 adds only current-contract coverage. | None. |
| API/E2E readiness for the next workflow stage | Pass | Source finding is closed; 71 tests, build, process probe, and scans pass. | Resume API/E2E reconciliation/execution. |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `src/config/app-config.ts` | 497 | Pass | Previously reviewed (`2+/5-` in round 30) | Cohesive existing AppConfig owner | Pass | None | Avoid unrelated growth. |
| `src/config/application-database-location.ts` | 62 | Pass | Pass (`1+/1-` in CR-025) | One DB/path/key identity concern | Pass | None | None. |
| `src/secret-management/cli/import-local-environment-secrets.ts` | 143 | Pass | Pass (`8+/4-` in CR-025) | CLI parse/projection/TTY concern | Pass | None | None. |
| `src/secret-management/provisioning/local-environment-secret-import-service.ts` | 168 | Pass | Unchanged in CR-025 | Cohesive import orchestration | Pass | None | None. |
| `src/secret-management/provisioning/local-environment-secret-import.ts` | 44 | Pass | Unchanged in CR-025 | Tight domain/error contracts | Pass | None | None. |
| `src/server-runtime.ts` | 209 | Pass | Unchanged in CR-025 | Server composition/startup owner | Pass | None | None. |
| `src/startup/migrations.ts` | 280 | Pass | Previously reviewed (`8+/9-` in round 30) | One Prisma migration/engine concern | Pass | None | Avoid unrelated growth. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No wrapper, profile, alias, or alternate target path. |
| No legacy old-behavior retention in changed scope | Pass | Old local/test commands and implicit target selection remain absent. |
| Dead/obsolete code cleanup completeness in changed implementation scope | Pass | Production/package source is clean. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | One current DB/key path; no old Store transition owner. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | One current typed target and vault path. |
| Approved transition mechanics match the reviewed design | Pass | Explicit URL reaches normal migration/bootstrap/service flow only after confirmation. |

## Dead / Obsolete / Legacy Items Requiring Removal

None in implementation-owned source. Preserved downstream E2E/docs remain later-stage reconciliation, not compatibility authority.

## Docs-Impact Verdict

- Docs impact: `Yes`, unchanged.
- Why: the operator command now requires an explicit absolute database URL and the old local/test commands are removed.
- Files or areas likely affected: server README, secret-management operator docs, test/runtime setup, release notes, and final handoff.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-011` | Confirmed | Explicit operator target authority remains reachable and correctly represented. |
| `CR-MP-026` | Confirmed / satisfied | Decoded NUL now fails before service/source/target access and emits no control byte. |

No new material premise is required.

## Review Scorecard

- Overall score (`/10`): `9.65`
- Overall score (`/100`): `96.5`
- Score calculation note: simple average across the ten mandatory categories; every category is at least `9.3`.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.7 | One explicit target flows from operator input to atomic write. | Broader executable proof remains downstream. | Preserve in E2E. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.7 | Raw input, location, inspection, runtime, and service owners are explicit. | None material. | Preserve. |
| 3 | API / Interface / Query / Command Clarity | 9.7 | Exact request shapes and strict target constructor now match their contracts. | None material. | Preserve. |
| 4 | Separation of Concerns and File Placement | 9.5 | Validation and failure projection land at their natural owners. | Two established cumulative files exceed 220 lines. | Avoid unrelated growth. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.7 | One frozen target replaces every duplicate authority. | None. | Preserve. |
| 6 | Naming Quality and Local Readability | 9.6 | Names match strict validation and value-free projection. | Existing CLI remains intentionally compact. | Preserve. |
| 7 | API/E2E Readiness | 9.3 | Focused tests, build, built-process probe, and scans pass. | Durable test reconciliation and broader execution remain pending. | Execute downstream. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.7 | Valid targets work; malformed target now fails before access; dry-run remains non-mutating. | Broader real-source execution remains downstream. | Execute safely after target preview. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | No old command, wrapper, fallback, or dual target path remains. | None. | Preserve. |
| 10 | Cleanup Completeness | 9.5 | Implementation/package cleanup is complete. | Downstream E2E/docs still require owner-stage reconciliation. | Complete downstream. |

## Findings

No implementation-source finding remains open.

- `CR-025`: resolved and independently confirmed.
- `FR-002`: remains superseded by the approved explicit-target design.
- `CR-023` and `CR-024`: remain resolved.

## Classification

`Pass`

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- API/E2E must update its preserved current-database importer lifecycle to the exact `--database-url` contract, then rerun the user-requested real-source dry-run first and verify the value-free target is the project test DB before any confirmed write.
- Prove hostile parent/source/cwd/`.env`/`.env.test` inputs cannot redirect the explicit target, then continue the authorized backend/frontend/browser/provider workflow only after the target check passes.
- Documentation still needs delivery-stage reconciliation to the sole `secrets:import` command.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, both Claude modes unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic import/update, unchanged Docker topology, source/template immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass` (`MP-011` confirmed; `CR-MP-026` satisfied)
- Score Summary: `9.65/10` (`96.5/100`); every category is at least `9.3`.
- Failure Origin: N/A.
- Recommended Recipient: `api_e2e_engineer`
- Notes: `CR-025` is closed. The cumulative explicit-target one-database vault implementation is ready for API/E2E reconciliation and broader executable validation.


# Review Round 36 — Round 15 Browser Status Failure-Origin Review

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Review Round: `36`
- Trigger: Round 15 API/E2E `Fail` at implementation HEAD `36fc5af434e8321965854a1235f2f36aa154bd38`
- Prior Review Round Reviewed: `35`
- Latest Authoritative Round: `36`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `encrypted-secret-vault-contract.md`, `gemini-setup-ui-ux-spec.md`, `credential-consumer-mapping.md`, `use-case-spine-validation.md`, `secret-storage-architecture.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, `repository-prisma-1.0.8-assessment.md`, and `secret-storage-backend-contract.md` in the canonical ticket directory.
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture round 30 `Pass`)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-coverage-report.md`
- Failing Scenario IDs: `SCSP-E2E-BROWSER-REAL-STATUS-001`
- Exact Failing Commands / Execution Mode: approved explicit-target dry-run and confirmed TTY import into the persistent project test DB; `pnpm dev:test`; actual Chrome at `http://127.0.0.1:3000/settings`; direct GraphQL comparison at `http://127.0.0.1:8000/graphql`.
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/180-round15-browser-openai-status-mismatch.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/181-round15-browser-openai-status-failure.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/182-round15-failure-evidence-scan.log`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 35 | CR-025 bounded correction | `CR-025` and preserved findings | None | Pass | No | Import target validation remains resolved. |
| 36 | Round 15 assembled Settings contradiction | None | `CR-026` | Fail | Yes | Supported browser status/remove lifecycle is contradicted by normalized catalog state. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 34–35 | `CR-025` | Medium | Remains resolved | Round 15 explicit-target unit/process checks, real-source preview, and confirmed import all selected only the explicit project test DB. | The current failure occurs after successful import and normal runtime start. |
| 31–32 | `CR-023`, `CR-024` | High | Remain resolved | No vault bootstrap/restart failure occurred; backend reports the imported OpenAI credential `READY/CONFIGURED`. | Not the failure origin. |
| Historical | `CR-001`–`CR-024`, `FR-001`–`FR-002` | Mixed | No finding reopened except the newly identified review gap recorded as `CR-026`. | Round 15 setup/import/preflight passed; failure is confined to assembled Settings status projection. | Preserve prior resolutions. |

## Review Scope

- Confirmed only whether the failing browser scenario represents approved behavior and traced the smallest relevant production path from supported import and Settings actions through GraphQL, Apollo normalization, Pinia state, and rendering.
- Reviewed the requirements/design basis for independent catalog and credential-status subjects; the combined provider query; GraphQL provider identity/resolvers; Apollo cache configuration; the provider store/runtime; focused web tests; and the exact browser/direct-GraphQL evidence.
- Did not repeat the full implementation scorecard, review unrelated provider execution, or proportionally review the preserved API/E2E durable changes.
- Independent discriminating probe: writing a response with one configured `LlmProviderObject:OPENAI` LLM occurrence and `null` audio/image occurrences to the repository's installed Apollo `InMemoryCache` makes the LLM, audio, and image reads all return `credentialStatus: null`; the extracted normalized entity is `LlmProviderObject:OPENAI { credentialStatus: null }`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: provider Settings must expose value-free configured/missing status and write-only save/remove without secret readback; OpenAI LLM/audio/image share one `provider.openai.api-key`.
- Design-spec behavior map verified against the failing path: the reviewed design explicitly requires catalogs to be credential-independent, status to be retrieved independently, and the UI to merge a provider-ID-keyed status projection. The implementation contradicts that boundary.
- Design review report and round confirmed: architecture round 30 `Pass`; no upstream ambiguity prevents a bounded correction.
- Behavior-basis status: `Contradicted` by implementation.
- Changed or newly discovered behavior: none. The failing path is the already-approved `BEH-004` / `DS-UC003B` Settings status lifecycle.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-001`, `DS-UC002` | Contradicted | Settings opens -> one combined catalog query obtains LLM/audio/image/video provider/model rows -> Apollo normalizes repeated provider identities -> Pinia hydrates provider cards. | Catalog rows carry `credentialStatus` even though the design requires credential-independent catalog output; media rows use catalog records with `null` status. |
| `BEH-004`, `REQ-006`, `DS-UC003B`, `DS-R001` | Contradicted | Explicit import -> encrypted application-DB row -> normal server -> backend status `READY/CONFIGURED` -> user opens Settings -> status overlay should render Configured and Remove Key. | The actual browser renders Not Configured and Save Key because the status is lost before UI hydration. |
| `REQ-009` | Confirmed at custody boundary, contradicted at projection boundary | OpenAI LLM/audio/image correctly share one secret identity and backend status. | The three capability rows do not preserve one consistent provider-status projection in the assembled client. |

## Material Premise Validation

### `CR-MP-027` — A configured shared OpenAI key must remain configured on the normal Settings surface

- Origin: `New`
- Related approved requirement or established contract: `BEH-001`, `BEH-004`, `REQ-001`, `REQ-006`, `REQ-009`, `AC-004`; `DS-UC002`, `DS-UC003B`, and `DS-R001`.
- Relevant behavior ID(s): `BEH-001`, `BEH-004`.
- Initiating basis kind: `User` plus supported `Operational` import.
- Independent product-supported initiating trigger or applicable governing contract: an operator explicitly imports a recognized OpenAI assignment into the selected application DB, then a user opens the exposed API Keys Settings surface and selects OpenAI.
- Support evidence: `secrets:import` is the approved operator command; `/settings` is the supported product surface; credential status and removal are explicit Settings actions.
- Forward current production path: explicit import -> `SecretManagementService` / encrypted application DB -> normal server GraphQL -> provider catalog and credential status -> Apollo client -> `llmProviderConfig` -> `useProviderApiKeySectionRuntime` -> `ProviderApiKeyEditor` -> Configured/Remove UI.
- Lifecycle preconditions and material consequence: the explicit import completed and the backend reports OpenAI `READY/CONFIGURED`; losing that status in client assembly falsely reports absence and removes the supported UI removal action.
- Reachability: `Reachable`.
- Review consequence / proportionate response: the observed contradiction can drive `CR-026`; a bounded implementation fix must restore the already-reviewed independent status projection and provider-identity-safe UI merge.

## Failure-Origin Analysis

### Direct source trace

1. `GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS` requests `credentialStatus` on the same `LlmProviderObject` shape in all four catalog fields:
   - LLM at `autobyteus-web/graphql/queries/llm_provider_queries.ts:15-31`;
   - audio at `:52-68`;
   - image at `:82-98`;
   - video at `:112-128`.
2. The LLM resolver enriches built-in providers with secret status through `LlmProviderService.listProvidersWithModels()` and `withCredentialStatusOrUnavailable()` (`llm-provider-service.ts:85-100`).
3. The media resolvers reuse `LlmProviderObject` and the same provider ID but return raw built-in catalog records whose `credentialStatus` is `null` (`llm-provider.ts:293-336`).
4. The product Apollo client uses an unqualified default `new InMemoryCache()` (`autobyteus-web/plugins/30.apollo.client.ts:64`). Apollo therefore normalizes each occurrence by `__typename + id`, so later OpenAI media occurrences replace the configured LLM field on the one `LlmProviderObject:OPENAI` entity.
5. The Pinia store assigns the already-normalized query result and derives `providerConfigs` from the LLM rows (`llmProviderConfig.ts:151-168`; `useProviderApiKeySectionRuntime.ts:272-279`), so both sources already contain `null`.
6. The runtime then reports not configured (`:181-188`). Separately, `:193-199` falls back to the first status from any provider rather than the selected provider ID, which can make write availability derive from an unrelated provider and is part of the same identity-unsafe projection defect.
7. The real browser/direct-GraphQL comparison exactly matches this trace: raw LLM OpenAI status is `READY/CONFIGURED`; media status is `null`; rendered state is Not Configured with no Remove Key.

### Failure classification

- Implementation defect: **Yes**.
- Earlier source-review gap: **Yes**. Round 35 was a full cumulative source review and should have caught both:
  - the direct mismatch with the reviewed design's independent catalog/status boundary (`design-spec.md:255,427-429,753`; `use-case-spine-validation.md:134,139-149`); and
  - the statically visible repeated `LlmProviderObject` / same-`id` / conflicting-field shape under the default normalized Apollo cache.
- Runtime-only or not reasonably source-detectable: **No**. Real browser execution was valuable confirmation, but the causal invariant is visible in source and reproducible with the installed cache without a server.
- Invalid/stale test, fixture, environment, or execution issue: **No**. The supported import and browser paths passed target isolation/readiness; direct GraphQL confirms the backend state in the same running application.
- Design impact or requirement gap: **No**. The reviewed design already specifies the correct separation and explicit keyed projection; no behavior decision is missing.
- Implementation change after review: **No**. The failing source is part of the cumulative reviewed implementation.

## Affected Prior Score Rationale

The Round 35 aggregate score remains historical and is not recomputed in this failure-origin-only entry point. Its following rationales are reopened until `CR-026` is resolved:

| Prior category | Prior rationale now contradicted | Current effect |
| --- | --- | --- |
| Ownership Clarity and Boundary Encapsulation | Status and catalog ownership were described as preserved. | The catalog API currently owns/embeds status and competes with the independent status owner. |
| API / Interface / Query / Command Clarity | GraphQL/UI boundaries were described as matching the reviewed contract. | The planned `providerCredentialStatuses(providerIds)` subject is absent; one combined query exposes conflicting entity fields. |
| API/E2E Readiness | The cumulative source was considered ready after focused importer checks. | A normal assembled Settings lifecycle fails and requires source rework plus rerun. |
| Runtime Correctness And Behavioral Fidelity | Provider Settings status was considered preserved. | Backend and UI contradict one another for a supported configured provider. |

## Findings

| Finding ID | Severity | Affected Basis | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| `CR-026` | High | `BEH-001`, `BEH-004`, `REQ-001`, `REQ-006`, `REQ-009`, `AC-004`, `DS-UC002`, `DS-UC003B`, `DS-R001`, `CR-MP-027` | The combined catalog query requests status for repeated `LlmProviderObject` IDs; the LLM row is configured while media rows are null; default Apollo normalization leaves `LlmProviderObject:OPENAI.credentialStatus = null`; Settings hydrates that state and renders Not Configured/no Remove despite the backend `READY/CONFIGURED`. The runtime also falls back to an arbitrary provider's status rather than the selected ID. | Implement the reviewed clean split: keep `available*ProvidersWithModels` credential-independent; expose the value-free provider status projection independently and keyed by exact provider ID (the reviewed `providerCredentialStatuses(providerIds)` boundary or an equivalently exact subject); merge it only in UI state by provider ID; remove the arbitrary `Object.values(...).find` cross-provider fallback. Do not accept a query-order or cache-policy-only mask that leaves conflicting provider semantics. Add deterministic assembled Apollo/Settings coverage with OpenAI configured in LLM plus audio/image rows, proving Configured/Remove, provider-ID isolation, and missing/unavailable behavior. | `Local Fix` / `implementation_engineer` |

## Classification

`Local Fix`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- After the bounded source fix, full implementation-source review must run again, followed by API/E2E beginning with `SCSP-E2E-BROWSER-REAL-STATUS-001`.
- API/E2E must then continue the deferred configured-provider matrix and the user's required `SCSP-E2E-REAL-DEEPSEEK-AGENT-001`; neither is currently claimed.
- The preserved TCR-003/TCR-004 and current-database importer durable changes remain awaiting the later successful proportional test-code review.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, both Claude modes unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic import/update, unchanged Docker topology, source/template immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass` (`CR-MP-027` is independently reachable through supported import and Settings actions)
- Score Summary: no new aggregate score for this bounded entry point; Round 35's affected ownership/interface/readiness/runtime rationales are reopened.
- Failure Origin: implementation-owned catalog/status boundary violation and Apollo-normalized provider-identity collision, compounded by a cross-provider UI fallback.
- Recommended Recipient: `implementation_engineer`
- Notes: the test/environment are valid. Restore the already-reviewed independent status projection, then return through full source review and API/E2E.

# Review Round 37 — User-Confirmed Provider-Centric Settings Design Impact

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review — post-classification user design direction`
- Current Review Round: `37`
- Trigger: after the Round 36 failure-origin review, the user clarified that one provider is the global credential/configuration subject, models are subordinate capability data, one API/request should be sufficient, and this is the appropriate point for a clean refactor.
- Prior Review Round Reviewed: `36`
- Latest Authoritative Round: `37`
- Implementation HEAD: `36fc5af434e8321965854a1235f2f36aa154bd38`
- Failing Scenario Preserved: `SCSP-E2E-BROWSER-REAL-STATUS-001`
- Scope Decision: the previously routed narrow `CR-026` Local Fix is superseded pending reviewed provider-centric design authority.

## Confirmed Product And Existing-Behavior Basis

- The secure vault contains one OpenAI credential subject, `provider.openai.api-key`. There are not separate OpenAI LLM, audio, image, or video secrets.
- The current web request is already one GraphQL network operation, but its payload contains four capability-specific provider collections. Each collection repeats the same provider identity and currently allows conflicting credential-status projections.
- The original/personal behavior appeared consistent because every repeated OpenAI catalog occurrence derived the same configured boolean from the same legacy environment source. That repetition did not establish four independent provider subjects; it merely duplicated one credential fact.
- The secure implementation correctly moved secret ownership to the vault, but it left provider identity/status fragmented across repeated catalog shapes. Round 36 proved the consequence through the supported import -> backend -> Settings path.
- The user has now made the target direction explicit: provider is the global subject, provider credential/configuration appears once, models remain models grouped by supported capability, and this is a clean-refactor opportunity rather than a compatibility exercise.

## Design Impact

`CR-026` remains the valid runtime contradiction: one configured OpenAI credential is rendered as not configured because repeated normalized provider objects disagree. However, the required remediation is no longer adequately described as a bounded client-side status overlay.

The revised design must define, without prescribing compatibility-only duplication:

1. **One provider identity and status authority.** A provider appears once in the Settings read model with one value-free credential status derived from the provider credential subject.
2. **Capability/model separation.** LLM, audio, image, and video catalogs describe models/capabilities and reference or nest under the provider; they do not independently own provider credential state.
3. **One-call assembly.** One GraphQL operation/request is sufficient. The solution package must choose the exact provider-centric response shape and name the backend projection/composition owner that joins credential-independent model catalogs with provider status.
4. **Failure isolation.** Missing/unavailable credential status must remain value-free and must not erase provider/model catalog availability; a capability-catalog failure must not invent or overwrite provider credential state.
5. **Consumer migration and cleanup.** Inventory supported consumers of the existing `available*ProvidersWithModels` fields, define the clean-cut migration/removal plan, and avoid wrappers, duplicate provider DTO authorities, cache-order workarounds, or arbitrary cross-provider fallback.
6. **Proof obligations.** Require deterministic assembled GraphQL/Apollo/Settings coverage for one OpenAI provider shared across LLM/audio/image/video, exact provider-ID isolation, Configured/Remove behavior, missing/unavailable states, and model-catalog independence.

A likely shape is a provider-centric Settings projection containing provider metadata and credential status once, with per-capability model groups beneath it. That is a design recommendation, not implementation authority; the solution designer must reconcile it into the mandatory artifacts and return the package through architecture review.

## Material Premise Validation

### `CR-MP-028` — A single provider credential subject must not be duplicated into competing capability authorities

- Initiating basis kind: `User` plus the established Settings and import contracts.
- Independent supported trigger: an operator explicitly configures/imports one OpenAI provider key, then a user opens Settings and inspects/removes that provider configuration while the product separately lists OpenAI models for its supported capabilities.
- Production path: one vault credential subject -> value-free provider status -> provider Settings projection; capability catalogs independently enumerate LLM/audio/image/video models for that provider.
- Reachability: `Reachable` and directly observed in `SCSP-E2E-BROWSER-REAL-STATUS-001`.
- Consequence: competing repeated provider projections can overwrite the single authoritative status and misrepresent a supported configured provider.
- Review response: the user-selected provider-centric refactor is a `Design Impact`, not a speculative cleanup and not a cache-policy-only Local Fix.

## Findings

| Finding ID | Severity | Affected Basis | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| `CR-026` | High | `BEH-001`, `BEH-004`, `REQ-001`, `REQ-006`, `REQ-009`, `AC-004`, `DS-UC002`, `DS-UC003B`, `DS-R001`, `CR-MP-027` | Preserved Round 36 browser/direct-GraphQL/Apollo evidence proves the current assembled status contradiction. | Preserve as the failing behavior to close after the revised design is implemented. Do not apply the earlier narrow cache/merge repair in isolation. | Superseded remediation; governed by `CR-027`. |
| `CR-027` | High | User-confirmed target direction; `CR-MP-028`; provider/settings ownership and API projection | One network operation currently repeats the same provider across four catalog collections; the original branch repeated one environment-derived boolean, while the secure branch permits conflicting status fields for the same normalized provider. | Revise requirements/design/supplements to a clean provider-centric Settings read model, define aggregation ownership and exact one-call contract, inventory/migrate supported consumers, remove obsolete duplicate status authority, and define the proof matrix. Return through architecture review before implementation resumes. | `Design Impact` / `solution_designer` |

## Classification

`Design Impact`

## Recommended Recipient

`solution_designer`

## Residual Risks

- API/E2E remains paused. The narrow implementation-engineer fix routed in Round 36 is superseded until the revised design passes architecture review.
- The solution package must distinguish “one API/request” from “one internal owner”: model catalogs, credential status, and Settings projection may retain separate internal responsibilities, while only the projection/composer owns their provider-centric assembly.
- Do not expose secret values or place credential state on model records.
- Preserve the pending user-required `SCSP-E2E-REAL-DEEPSEEK-AGENT-001` and configured-provider matrix for later execution after the design/source correction.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, both Claude modes unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic import/update, unchanged Docker topology, source/template immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review — user-confirmed Design Impact`
- Material-Premise Gate: `Pass` (`CR-MP-027` and `CR-MP-028` are independently reachable)
- Failure Origin: preserved implementation contradiction; remediation target now requires a provider-centric design revision.
- Recommended Recipient: `solution_designer`
- Notes: one GraphQL/network request is enough, but the response and ownership model must express provider once and models as subordinate capability data. Architecture review is required before implementation resumes.

# Review Round 38 — CR-027 Provider-Centric Settings Delta Review

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Supplemental Task Artifacts Reviewed As Context: `encrypted-secret-vault-contract.md`, `gemini-setup-ui-ux-spec.md`, `credential-consumer-mapping.md`, `use-case-spine-validation.md`, `secret-storage-architecture.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, `repository-prisma-1.0.8-assessment.md`, and the superseded `secret-storage-backend-contract.md` tombstone.
- Current Review Round: `38`
- Trigger: architecture round 32 passed the user-approved provider-centric clean cut; implementation supplied source/test commit `658824c9eef48934672a6e069012935cbff9b5e9` and handoff HEAD `f14d3a766044f38f9af0105062093eac1de60849`.
- Prior Review Round Reviewed: `37`
- Latest Authoritative Round: `38`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture round 32 `Pass`)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: N/A for this implementation-review entry point; Round-15 failure evidence remains the regression basis.
- Execution Coverage Report Reviewed: N/A for this implementation-review entry point.
- Failing Scenario IDs: N/A for this source-review round; the later API/E2E rerun must begin with preserved `SCSP-E2E-BROWSER-REAL-STATUS-001`.
- Exact Failing Commands / Execution Mode: N/A.
- Failure Evidence Paths: preserved Round-15 evidence `180-round15-browser-openai-status-mismatch.png`, `181-round15-browser-openai-status-failure.log`, and `182-round15-failure-evidence-scan.log`.
- User-directed review proportionality: this was a **delta-focused implementation review** of `36fc5af..658824c` and its directly affected production paths. Previously passed vault, importer, provider-runtime, Docker, Claude, Codex, package, and assurance areas were carried forward rather than re-audited. The mandatory scorecard records the current delta result and carried-forward posture.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 36 | Round-15 assembled browser contradiction | N/A | `CR-026` | Fail | No | Repeated capability-provider projections conflicted under Apollo normalization. |
| 37 | User-selected provider-centric refactor | `CR-026` | `CR-027` | Fail — Design Impact | No | Solution redesign and architecture review required. |
| 38 | Provider-centric implementation `658824c` | `CR-026`, `CR-027` | `CR-028`, `CR-029` | Fail — Local Fix | Yes | Core grouping is correct; Settings runtime/cache authority and generated response typing require bounded correction. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 36 | `CR-026` | High | Resolved by the reviewed delta | `providerSettings(runtimeKind)` emits each provider once with one `apiKeyConfigured` fact and four subordinate model lists; the old credential-status query/map, four-array Settings merge, cross-provider fallback, and conflicting catalog status fields are absent. The assembled Apollo test proves one OpenAI entity remains configured across LLM/audio/image data. | Must still rerun the real browser scenario after `CR-028`/`CR-029` close. |
| 37 | `CR-027` | High / Design Impact | Implemented, subject to bounded delta findings | Server composition, GraphQL group, exact-ID UI consumption, Boolean ordinary commands, specialized custom/Gemini shapes, and clean removals match the reviewed provider-centric design. | No further solution-design change is needed for the current findings. |
| 1–35 | Prior closed implementation findings | Mixed | Carried forward | The user requested a delta review; `36fc5af..658824c` does not alter their owning vault/import/runtime/package paths except where explicitly reviewed above. | No prior closed finding is reopened. |

## Review Scope

- Changed implementation and behavior reviewed: only the provider-centric Settings/API delta `36fc5af434e8321965854a1235f2f36aa154bd38..658824c9eef48934672a6e069012935cbff9b5e9`, including the server composer, GraphQL schema/resolvers, web query/mutations/store/runtime/components, generated code, and focused tests.
- Directly affected preserved production paths traced: API-key Settings initialization/save/remove/custom/Gemini; application-global model catalog selection for AutoByteus, Codex App Server, and Claude Agent SDK; route-to-route Pinia lifecycle; server runtime-specific model catalog behavior.
- Explicit exclusions: no re-review of the unchanged one-database vault, importer, Docker, Electron, provider SDK, Codex/Claude authentication, dependency, or durable API/E2E support changes. No real credential, database, root key, provider, browser, Docker daemon, or external account was accessed.
- Independent checks:
  - `git diff --check 36fc5af..658824c`: passed.
  - Focused server rerun: 3 files / 25 tests passed.
  - Focused web rerun: 4 files / 20 tests passed.
  - Changed implementation-source effective-line audit completed; no file exceeds 500 lines.
  - Production-path and coverage searches confirmed multiple supported non-AutoByteus callers mutate the global catalog runtime, while CR-027 Settings tests cover only the simple AutoByteus case and do not exercise the cross-runtime journey.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: the API-key Settings page receives each provider once, one exact value-free configuration fact, and four subordinate existing model lists; catalog APIs stay available and credential-independent; no duplicate client authority is added.
- Design-spec behavior map verified against the implementation: **partially**. The provider-centric composition is correct, but the Settings caller does not keep its runtime/query-cache authority separate from unrelated model-selection consumers, and the web maintains a hand-written parallel response shape instead of consuming the generated exact query type.
- Design review report and round confirmed: architecture round 32 `Pass`.
- Behavior-basis status: `Contradicted` by two bounded implementation details.
- Changed or newly discovered behavior: none. `CR-028` concerns a supported existing user journey; `CR-029` concerns an explicit reviewed engineering contract.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-001`, `REQ-001`, `DS-UC002` | Contradicted in the web caller/cache, otherwise confirmed | Settings -> `fetchProviderSettings` -> one GraphQL group/provider -> server exact-ID composition -> UI. | `fetchProviderSettings()` silently inherits the application-global `modelRuntimeKind`, which other supported model-selection surfaces change to Codex/Claude. The resulting hidden runtime changes which subordinate lists/custom providers Settings receives. |
| `BEH-004`, `DS-UC003B` | Contradicted in post-command refetch, otherwise confirmed | Save/Remove -> Boolean -> network-only canonical provider-settings refetch -> UI. | Save/remove/custom/Gemini refetches pass the same unrelated mutable `modelRuntimeKind`; the canonical Settings read can therefore change runtime after an unrelated model selection. |
| `BEH-012`, `BEH-013` and preserved Codex/Claude behavior | Confirmed at their own runtime surfaces | Runtime selector -> runtime-specific catalog -> supported Codex/Claude model choices. | Those valid callers are the independent trigger for `CR-MP-029`; they should not become hidden API-key Settings authority. |
| `REQ-001` generated-contract requirement | Contradicted | GraphQL schema/codegen correctly exposes `LlmProviderObject`, `ModelDetail`, `ProviderSettingsGroup`, and `GetProviderSettingsQuery`. | The store assigns the untyped raw query result into separately hand-maintained `LlmProviderRecord` / `ProviderSettingsModel` / `ProviderSettingsGroup` shapes instead of deriving from the generated exact query contract. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Round-32 architecture package defines the provider-centric owner, one-call contract, removals, and proof obligations. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Core composition matches, but hidden cross-runtime inheritance contradicts the Settings spine and the hand-written response shape contradicts the generated-contract requirement. | Resolve `CR-028` and `CR-029`. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Settings, command/refetch, and non-Settings catalog spines remain identifiable. | Preserve while separating their cache/runtime state. |
| Ownership boundary preservation and clarity | Fail | `modelRuntimeKind` currently owns both the non-Settings model catalog and Settings-query identity/cache, although those are different subjects and lifecycles. | Give Settings its own explicit runtime/cache authority. |
| Off-spine concern clarity | Pass | GraphQL composition, vault status, and model catalogs each serve the provider-settings owner clearly. | None. |
| Existing capability/subsystem reuse check | Pass | Existing catalog, provider service, GraphQL, Pinia, and Settings owners are reused. | None. |
| Reusable owned structures check | Fail | Generated `GetProviderSettingsQuery` exists, but the web hand-maintains a parallel group/provider/model response shape. | Derive store/view types from generated query/schema types. |
| Shared-structure/data-model tightness check | Fail | `ProviderSettingsModel = Pick<ModelInfo,...>` and a separate `ProviderSettingsGroup` duplicate the exact generated response contract. | Remove the overlapping client contract. |
| Repeated coordination ownership check | Fail | One global field coordinates two separate runtime/cache lifecycles. | Separate Settings query identity from general catalog selection. |
| Empty indirection check | Pass | No pass-through-only layer was introduced. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Fail | The store file is the correct location, but its state conflates general model-selection runtime with Settings runtime. | Split state/cache responsibility inside the existing store or an equally bounded owner. |
| Ownership-driven dependency check | Pass | Web depends on public GraphQL/store boundaries and server GraphQL depends on the application service. | None. |
| Authoritative Boundary Rule check | Pass | No caller bypasses the provider service or secret-management owner. | None. |
| File placement check | Pass | Changed files remain in their owning server GraphQL/provider and web Settings/store areas. | None. |
| Flat-vs-over-split layout judgment | Pass | The provider-centric composition does not create artificial folders or coordinator chains. | None. |
| Interface/API/query/command/service-method boundary clarity | Fail | Server/API subjects are clear, but the web gives one mutable runtime selector authority over both catalog and Settings queries. | Make the Settings runtime explicit at its call boundary and cache. |
| Naming quality and naming-to-responsibility alignment check | Pass | Provider/group/action names generally match their responsibilities. | A separate Settings runtime/cache name should make `CR-028` explicit. |
| No unjustified duplication of code / repeated structures in changed scope | Fail | The generated exact query response and hand-maintained Settings response interfaces overlap. | Resolve `CR-029`. |
| Patch-on-patch complexity control | Pass | The provider-centric change removes substantially more code than it adds and does not retain the obsolete status/merge paths. | Keep the correction bounded. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | Old runtime/status machinery is removed, but the new parallel client response contract is unnecessary. | Remove/replace the parallel type definitions. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Existing tests prove exact provider-ID grouping and Apollo status stability, but do not prove Settings isolation after a supported Codex/Claude catalog selection or post-command refetch. | Add the `CR-028` regression journey. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Existing provider-group fixtures are reusable for the missing runtime-isolation assertion. | Reuse them. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Obsolete status/merge tests were removed; no compatibility-only test remains. | None. |
| API/E2E readiness for the next workflow stage | Fail | The original browser contradiction is structurally fixed, but a normal supported cross-route journey can select the wrong Settings runtime. | Correct and return for delta re-review before API/E2E. |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | 359 | Pass | Reviewed | Cohesive GraphQL mapping; deletion-heavy | Pass | Accept | None. |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | 370 | Pass | Reviewed | Cohesive provider/catalog application owner; deletion-heavy | Pass | Accept | None. |
| `autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue` | 250 | Pass | Reviewed | Cohesive option UI | Pass | Accept | None. |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | 358 | Pass | Reviewed | Cohesive Settings orchestration; delegates Gemini/removal | Pass | Accept | Preserve; test corrected store runtime isolation. |
| `autobyteus-web/stores/llmProviderConfig.ts` | 319 | Pass | Reviewed | Correct store owner but conflates two runtime/cache subjects | Pass | Local Fix | Resolve `CR-028`. |
| Other changed non-generated production `.ts`/`.vue` files | 26–176 each | Pass | N/A | Cohesive and bounded | Pass | Accept except support type issue | Resolve `CR-029` in `llmProviderConfigSupport.ts`. |
| `autobyteus-web/generated/graphql.ts` | Generated | N/A | N/A | Code-generated contract | Pass | Accept | Consume its exact query type rather than duplicating it. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No old provider-status API, wrapper, or cache workaround is retained. |
| No legacy old-behavior retention in changed scope | Pass | The four-array Settings merge and cross-provider fallback are removed. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | The newly hand-maintained parallel Settings response type is unnecessary alongside generated types. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Provider-centric transport/view reorganization does not change persisted data. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | One provider-settings read is used. |
| Approved transition mechanics match the reviewed design | Pass | No migration is required. |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `ProviderSettingsModel` and hand-maintained `ProviderSettingsGroup` in `autobyteus-web/stores/llmProviderConfigSupport.ts:43-51` | `ObsoleteAdapter` | `autobyteus-web/generated/graphql.ts:3411-3416` already provides the exact `GetProviderSettingsQuery` response; requirements/design explicitly prohibit a parallel hand-maintained provider/model DTO contract. | It creates overlapping authority and allows schema/query changes to bypass compile-time checking because the raw query result is assigned into an unrelated local interface. | Derive the store group/provider/model types from the generated exact query (or use the generated typed document/result directly) and remove the parallel response contract. |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the provider-centric GraphQL Settings read and command shapes are externally relevant project behavior; existing downstream documentation changes are already preserved for delivery ownership. The two bounded corrections do not require a new product behavior decision.
- Files or areas likely affected: existing LLM/secret-management API and Settings documentation already tracked in the cumulative package.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `CR-MP-028` | Confirmed | The implementation correctly makes one provider credential/configuration authority; `CR-028` concerns a different supported caller-state coupling. |
| `MP-012` / `AR-026` | Confirmed | Four successful, non-null subordinate lists remain; no speculative partial-list recovery was added. |

### `CR-MP-029` — A supported runtime-model selection can change the global store before API-key Settings initializes or refetches

- Origin: `New`
- Related approved requirement or established contract: `BEH-001`, `BEH-004`, `REQ-001`, `DS-UC002`, `DS-UC003B`; preserved Codex/Claude runtime selection.
- Relevant behavior ID(s): `BEH-001`, `BEH-004`, `BEH-012`, `BEH-013`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: the user opens a launch/workspace/application configuration surface, selects the exposed Codex App Server or Claude Agent SDK runtime/model option, and later opens the exposed Settings -> API Keys surface or saves/removes a provider key there.
- Support evidence: `RuntimeModelConfigFields.vue`, workspace/application configuration components, and messaging launch-preset UI expose runtime selection; `useRuntimeScopedModelSelection.ts:49-54,81-104` calls the application-global Pinia store with that runtime; `pages/settings.vue:256` exposes the API-key Settings component.
- Forward production path: runtime selector -> `useRuntimeScopedModelSelection` -> `fetchProvidersWithModels('codex_app_server'|'claude_agent_sdk')` -> global `modelRuntimeKind` changes -> route to Settings -> `ProviderAPIKeyManager` -> `initialize()` -> argument-free `fetchProviderSettings()` -> inherited runtime -> server `listProviderSettings(runtimeKind)` -> external-runtime LLM list, empty media lists, and no custom providers -> rendered Settings. Save/remove/custom/Gemini commands likewise refetch with the inherited global field.
- Lifecycle preconditions and material consequence: Pinia state persists across supported route/component use. The first Settings visit after an external-runtime catalog load queries the wrong runtime; if Settings was previously cached, the shared field can make stale groups appear cache-valid, and a later command refetch can replace them with external-runtime groups. Custom providers and AutoByteus media/model lists can disappear or be misrepresented without any Settings runtime selection.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `CR-028` is valid and bounded. Separate Settings query/cache authority from the non-Settings catalog runtime and add a deterministic cross-runtime regression; no solution-design change is required.

## Review Scorecard

- Overall score (`/10`): `9.09`
- Overall score (`/100`): `90.9`
- Score calculation note: simple average across the ten mandatory categories. This delta review carries forward the prior passed implementation outside CR-027; categories below 9.0 reflect only the two current findings and prevent a pass.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Provider Settings, command/refetch, and catalog spines are explicit and mostly implemented directly. | Hidden runtime state links two otherwise distinct spines. | Make the Settings runtime/cache explicit. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.1 | Server provider composition and vault status ownership are strong. | One global store field owns both catalog and Settings query identity. | Separate those state authorities. |
| 3 | API / Interface / Query / Command Clarity | 8.8 | Server/GraphQL shapes are singular and exact. | Client query identity is implicit and the exact generated response is replaced by a hand type. | Use an explicit Settings runtime and generated query type. |
| 4 | Separation of Concerns and File Placement | 9.3 | Files reside under correct owners and obsolete coordinators were removed. | The Pinia store conflates two cache lifecycles. | Split state responsibility without unnecessary new layers. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 8.8 | Server reuses existing provider/model types. | Web duplicates the generated provider-settings result shape. | Derive from generated types. |
| 6 | Naming Quality and Local Readability | 9.4 | Provider/group/action names are clear and code is substantially reduced. | `modelRuntimeKind` does not signal that it is incorrectly being reused for Settings. | Introduce an exact Settings cache/runtime name. |
| 7 | API/E2E Readiness | 8.5 | Focused 45-test rerun and diff checks pass; assembled Apollo coverage closes the original collision. | No supported cross-runtime-to-Settings regression exists, and the journey currently fails by source trace. | Add regression and return for delta review. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.5 | Simple AutoByteus Settings behavior is correct. | Supported Codex/Claude selection can change or stale the API-key Settings catalog/refetch. | Resolve `CR-028`. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Old status API, merge, fallback, and generic operation DTOs are removed cleanly. | None material. | Preserve. |
| 10 | Cleanup Completeness | 9.2 | Most obsolete paths and tests are removed. | One parallel client response contract remains. | Resolve `CR-029`. |

## Findings

| Finding ID | Severity | Affected Basis | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| `CR-028` | Medium | `BEH-001`, `BEH-004`, `REQ-001`, `DS-UC002`, `DS-UC003B`, `CR-MP-029` | `fetchProvidersWithModels(runtimeKind)` writes `modelRuntimeKind` (`llmProviderConfig.ts:141-164`); Settings calls argument-free `fetchProviderSettings()`, which inherits and also rewrites that same field (`:177-193`); its cache validity likewise compares against that shared field. Save/remove/custom/Gemini refetch with it (`:240-336`). Supported runtime-selection surfaces call `fetchProvidersWithModels('codex_app_server'|'claude_agent_sdk')`. Server runtime catalogs return external-runtime LLMs, empty media, and no custom providers for those runtimes. | Give API-key Settings its own explicit runtime/query-cache identity (preserving the established AutoByteus Settings behavior unless an explicit reviewed Settings selector is introduced). Do not inherit the general model-selection `modelRuntimeKind`. Ensure initialization and every save/remove/custom/Gemini/reload refetch use the same exact Settings runtime. Add a deterministic regression: load Codex and Claude catalogs through the normal store path, then initialize Settings and execute a provider command; assert the actual `providerSettings` variables remain AutoByteus, custom/media/full provider groups remain present, and no stale-cache shortcut occurs. | `Local Fix` / `implementation_engineer` |
| `CR-029` | Low | `REQ-001`; design-spec generated-contract and no-parallel-DTO rules | `llmProviderConfigSupport.ts:43-51` hand-defines `ProviderSettingsModel` and `ProviderSettingsGroup`; `llmProviderConfig.ts:191` assigns the raw query data to it, while codegen already emits the exact `GetProviderSettingsQuery` at `generated/graphql.ts:3411-3416`. | Remove the parallel response contract and derive/use the generated exact query result/provider/model types. Keep any genuine UI-only projection explicitly transformed and named as a view model rather than silently treating it as the transport result. | `Local Fix` / `implementation_engineer` |

## Classification

`Local Fix`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- After the bounded fix, perform the user-requested **delta re-review**, not another unrelated cumulative audit.
- Once source review passes, API/E2E must begin with `SCSP-E2E-BROWSER-REAL-STATUS-001`, then continue the user-required `SCSP-E2E-REAL-DEEPSEEK-AGENT-001` and the configured-provider matrix.
- Previously preserved durable API/E2E changes still require the separate proportional test-code review only after a successful execution package.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, both Claude modes unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic import/update, unchanged Docker topology, source/template immutability, explicit `secrets:import --database-url`, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review — user-requested CR-027 delta review`
- Material-Premise Gate: `Pass` (`CR-MP-029` is independently reachable through supported runtime-selection and Settings surfaces)
- Score Summary: `9.09/10` (`90.9/100`); API/interface, shared-structure, API/E2E-readiness, and runtime-fidelity gaps prevent pass.
- Failure Origin: bounded implementation-owned web store runtime/cache coupling plus a parallel client response type; the provider-centric server/GraphQL design itself is sound.
- Recommended Recipient: `implementation_engineer`
- Notes: resolve `CR-028` and `CR-029`, then return only the bounded delta for source review.

# Review Round 39 — CR-028/CR-029 Bounded Delta Re-review

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Current Review Round: `39`
- Trigger: bounded implementation correction at source/test commit `c31651ca4b1b0e3012567fc3ccb3b11137e67584`; final HEAD `53dd05ecaac6e3196497597cceba0799f8093aba` changes only the canonical implementation handoff after that source commit.
- Prior Review Round Reviewed: `38`
- Latest Authoritative Round: `39`
- Review Scope: exactly `f14d3a766044f38f9af0105062093eac1de60849..c31651ca4b1b0e3012567fc3ccb3b11137e67584`, as requested by the user and implementation handoff.
- Requirements, investigation, design, supplements, architecture review, and implementation handoff: same absolute canonical paths recorded in Round 38; architecture round 32 remains `Pass`.
- Coverage/execution reports: retained for downstream API/E2E context, not re-reviewed as source.
- Failing Scenario IDs: N/A for this source review. API/E2E must begin with `SCSP-E2E-BROWSER-REAL-STATUS-001`.
- Exact Failing Commands / Failure Evidence Paths: N/A for this source review; Round-15 browser evidence remains the downstream regression basis.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 38 | CR-027 provider-centric implementation | `CR-026`, `CR-027` | `CR-028`, `CR-029` | Fail — Local Fix | No | Settings runtime/cache coupling and parallel client response type. |
| 39 | Bounded correction `c31651c` | `CR-028`, `CR-029` | None | Pass | Yes | Explicit AutoByteus Settings identity and generated exact query type close both findings. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 38 | `CR-028` | Medium | Resolved | `PROVIDER_SETTINGS_RUNTIME_KIND` is fixed to `autobyteus`; `providerSettingsRuntimeKind` is separate from `modelRuntimeKind`; argument-free `fetchProviderSettings(networkOnly)` always queries that fixed runtime and clears only its own cache identity on failure. Settings reload commands pass the exact runtime; provider, custom, and Gemini post-command refetches call the fixed Settings read. The normal Pinia regression loads Codex and Claude catalogs around Settings initialization/save and proves every Settings request remains AutoByteus with custom/media groups intact. | No hidden runtime authority remains. |
| 38 | `CR-029` | Low | Resolved | `ProviderSettingsModel` and the hand-written group interface are absent. `ProviderSettingsGroup` is now derived exactly as `GetProviderSettingsQuery['providerSettings'][number]`; `ProviderSummary` remains an explicit UI projection. | Generated contract is authoritative. |
| 36–37 | `CR-026`, `CR-027` | High | Remain resolved | The bounded fix preserves one provider/configuration fact, subordinate capability models, and the provider-centric API. | Ready for real browser rerun. |
| 1–35 | Prior closed findings | Mixed | Carried forward | User-directed delta review found no changed path that reopens their owners. | No cumulative re-audit performed. |

## Review Scope

- Changed production files reviewed:
  - `autobyteus-web/stores/llmProviderConfig.ts`
  - `autobyteus-web/stores/llmProviderConfigSupport.ts`
  - `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
- Changed focused tests reviewed:
  - `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`
  - `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts`
- Explicit exclusions: every source path outside the bounded five-file delta; previously preserved API/E2E tests/reports/evidence; real providers, credentials, DB/key, Docker, browser, and packaged execution.
- Independent checks:
  - `git diff --check f14d3a..c31651c`: passed.
  - Focused web rerun: 4 files / 22 tests passed.
  - Residue scan found no `ProviderSettingsModel`, hand-written `interface ProviderSettingsGroup`, runtime-taking `fetchProviderSettings`, or refetch through `modelRuntimeKind`.
  - Bounded source sizes: store 336, support 88, Settings runtime 359 effective non-empty lines; none exceeds 500 and bounded additions remain below the 220-line delta trigger.
  - Implementation evidence additionally records successful web production build, web/localization guards, and zero changed-file diagnostics in the existing broad typecheck baseline.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: API-key Settings is the AutoByteus provider/configuration surface; supported Codex/Claude catalog selection remains separate; provider-settings transport types come from the generated GraphQL contract.
- Design-spec behavior map verified against the implementation: yes.
- Design review report and round confirmed: architecture round 32 `Pass`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-001`, `REQ-001`, `DS-UC002` | Confirmed | Settings -> fixed AutoByteus provider-settings query/cache -> server exact provider grouping -> generated response type -> explicit UI summary. | None. |
| `BEH-004`, `DS-UC003B` | Confirmed | Boolean provider command -> network-only fixed AutoByteus provider-settings refetch -> exact group -> UI. Custom and Gemini operations use the same fixed refetch. | None. |
| `BEH-012`, `BEH-013` | Confirmed | Codex/Claude selector -> general catalog `modelRuntimeKind`; Settings identity remains unchanged. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present and preserved | Pass | Bounded correction implements the reviewed Settings/catalog separation. | None. |
| Implementation matches approved behavior-defining artifacts | Pass | Fixed AutoByteus Settings identity and generated contract match `BEH-001`/`REQ-001`. | None. |
| Data-flow spine clarity | Pass | Settings and general catalog spines no longer share hidden runtime authority. | None. |
| Ownership boundary preservation and clarity | Pass | `modelRuntimeKind` owns general catalogs; `providerSettingsRuntimeKind` owns only Settings cache identity. | None. |
| Off-spine concern clarity | Pass | Cache and query concerns serve their exact owners. | None. |
| Existing capability/subsystem reuse | Pass | Correction stays inside the existing Pinia/Settings owner. | None. |
| Reusable owned structures | Pass | Generated `GetProviderSettingsQuery` is reused. | None. |
| Shared-structure/data-model tightness | Pass | No parallel provider-settings response family remains. | None. |
| Repeated coordination ownership | Pass | One exported constant governs every Settings query/reload/refetch. | None. |
| Empty indirection | Pass | No new pass-through layer was introduced. | None. |
| Separation of concerns and file responsibility | Pass | General catalog and Settings cache state are distinct within the correct store. | None. |
| Ownership-driven dependency | Pass | Settings runtime depends on the public store constant/actions only. | None. |
| Authoritative Boundary Rule | Pass | No owner is bypassed. | None. |
| File placement | Pass | All changes remain in their owning web store/Settings files. | None. |
| Flat-vs-over-split layout | Pass | Three production files are proportionate; no new module is needed. | None. |
| Interface/API/query/command clarity | Pass | `fetchProviderSettings(networkOnly)` has no caller-supplied runtime; general reload methods accept an explicit runtime only where required. | None. |
| Naming quality | Pass | `PROVIDER_SETTINGS_RUNTIME_KIND` and `providerSettingsRuntimeKind` state exact purpose. | None. |
| No unjustified duplication | Pass | Generated query type replaces the duplicate response shape. | None. |
| Patch-on-patch complexity control | Pass | Correction is bounded and deletes obsolete type authority. | None. |
| Dead/obsolete cleanup | Pass | Parallel Settings types and stale runtime-taking calls are absent. | None. |
| Relevant test scenarios requirement-aligned | Pass | Tests prove Codex/Claude catalog loads cannot redirect Settings initialization/save or reload commands. | None. |
| Test fixtures/helpers coherent | Pass | Existing grouped provider fixtures were extended proportionately. | None. |
| No stale/compatibility-only tests | Pass | New assertions target current behavior directly. | None. |
| API/E2E readiness | Pass | Source-level defect is closed; focused suite and production build evidence are green. | Proceed to API/E2E. |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard Limit | `>220` Bounded Delta | SoC / Ownership | Placement | Verdict |
| --- | ---: | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | 336 | Pass | Pass | Two cache subjects are now explicit and bounded | Pass | Pass |
| `autobyteus-web/stores/llmProviderConfigSupport.ts` | 88 | Pass | Pass | Generated type alias plus established catalog/UI support | Pass | Pass |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts` | 359 | Pass | Pass | Cohesive Settings orchestration; exact runtime passed only to reload operations | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No dual query/cache path exists. |
| No legacy old-behavior retention in changed scope | Pass | No implicit runtime inheritance remains. |
| Dead/obsolete cleanup complete | Pass | Parallel response types are removed. |
| Persisted-data transition decision followed | Pass | No persisted data is affected. |
| No version-specific dual reads/writes or fallback | Pass | One current Settings query path. |
| Approved transition mechanics match design | Pass | N/A migration; clean direct correction. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already represented by the cumulative provider-centric documentation work.
- Why: the provider-centric Settings API is a documented product boundary; this bounded correction restores its intended runtime identity without adding another behavior.
- Additional docs required by this delta: none beyond the already-preserved downstream documentation updates.

## Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `CR-MP-028` | Confirmed | One provider/configuration authority remains. |
| `CR-MP-029` | Confirmed and handled | Supported Codex/Claude catalog calls still change `modelRuntimeKind`, but the independently owned Settings identity remains fixed to AutoByteus through initialization, cache, reload, and post-command refetch. |
| `MP-012` / `AR-026` | Confirmed | Four non-null subordinate lists remain unchanged. |

No new material premise was introduced.

## Review Scorecard

- Overall score (`/10`): `9.64`
- Overall score (`/100`): `96.4`
- Score calculation note: simple average across the mandatory categories; every category is at least `9.4`. Scores cover the bounded correction plus carried-forward CR-027 posture only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.7 | Settings and model-selection spines now have independent runtime identities. | Real browser proof remains downstream. | Execute API/E2E. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.7 | Cache/query ownership is explicit and localized. | None material. | Preserve. |
| 3 | API / Interface / Query / Command Clarity | 9.6 | Settings cannot accept an accidental runtime; reload runtime is explicit where needed. | Raw GraphQL documents remain an established project pattern. | Preserve generated result typing. |
| 4 | Separation of Concerns and File Placement | 9.6 | Correct separation lands in the existing store/Settings owners. | Store is established and moderately sized. | Avoid unrelated growth. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.7 | Generated exact query type is authoritative. | None. | Preserve. |
| 6 | Naming Quality and Local Readability | 9.6 | Names state Settings-specific authority directly. | None material. | Preserve. |
| 7 | API/E2E Readiness | 9.4 | Independent 22-test rerun, build evidence, guards, and residue checks are green. | Real browser/provider matrix is still required. | Execute downstream. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.7 | Codex/Claude catalog state cannot redirect AutoByteus Settings. | Real assembled proof pending. | Execute browser regression first. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | No dual path, fallback, or compatibility type remains. | None. | Preserve. |
| 10 | Cleanup Completeness | 9.6 | Parallel types and stale callers are removed. | Downstream dirty test/docs state remains owner-stage work. | Complete later workflow stages. |

## Findings

None.

## Classification

N/A — review passes.

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- API/E2E must begin with the real `SCSP-E2E-BROWSER-REAL-STATUS-001` browser/direct-GraphQL regression, then execute the user-required `SCSP-E2E-REAL-DEEPSEEK-AGENT-001` and configured-provider matrix.
- The preserved durable API/E2E changes receive proportional test-code review only after execution passes.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as delivery/release recheck only, both Claude modes unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic import/update, unchanged Docker topology, source/template immutability, explicit `secrets:import --database-url`, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review — bounded delta re-review`
- Material-Premise Gate: `Pass`
- Score Summary: `9.64/10` (`96.4/100`), with every category at least `9.4`.
- Recommended Recipient: `api_e2e_engineer`
- Notes: `CR-028` and `CR-029` are resolved. Proceed to API/E2E at final handoff HEAD `53dd05ecaac6e3196497597cceba0799f8093aba`.

# Review Round 40 — Round-33 Custom-Provider-V1 Migration Source Review

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/custom-provider-v1-migration-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/encrypted-secret-vault-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/credential-consumer-mapping.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/use-case-spine-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-architecture.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/live-test-secret-provisioning.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/threat-model-and-option-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/repository-prisma-1.0.8-assessment.md`
- Current Review Round: `40`
- Trigger: architecture Round 33 passed the user-approved fixed-path custom-provider-v1 migrate-or-delete transition; implementation source commit is `76afaec8684e3e8ee86dfe8b50c3591bd7abc00a`, followed only by handoff commit `5994a622b71533b064910db4da0449505578ebb3`.
- Prior Review Round Reviewed: `39`
- Latest Authoritative Round: `40`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md` (architecture Round 33 Pass)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/implementation-handoff.md`
- Coverage Investigation Reviewed: N/A for this implementation-review entry point.
- Execution Coverage Report Reviewed: N/A for this implementation-review entry point.
- Failing Scenario IDs: N/A.
- Exact Failing Commands / Execution Mode: N/A.
- Failure Evidence Paths: N/A.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 38 | CR-027 provider-centric implementation | `CR-026`, `CR-027` | `CR-028`, `CR-029` | Fail — Local Fix | No | Settings runtime/cache coupling and parallel client response type. |
| 39 | CR-028/CR-029 bounded correction | `CR-028`, `CR-029` | None | Pass | No | Provider-centric Settings was ready for API/E2E. |
| 40 | Round-33 custom-provider-v1 migration at `76afaec` | All prior findings carried forward | `CR-030` | Fail — Local Fix | Yes | Migration structure is sound, but the exact empty legacy lock format cannot be reclaimed after termination. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 38–39 | `CR-028`, `CR-029` | Medium / Low | Remain resolved | Round-33 does not modify the web Settings runtime/cache or generated query typing. | No prior provider-centric finding reopened. |
| 36–37 | `CR-026`, `CR-027` | High | Remain resolved | The provider-centric Settings API and exact provider ownership remain unchanged. | Real browser proof remains downstream after this source finding closes. |
| 1–35 | `CR-001`–`CR-025`, `FR-001`–`FR-002` | Mixed | Remain resolved | The bounded Round-33 delta does not alter their owned paths; dependency, Docker, importer, Claude, Codex, Gemini, and one-database-vault constraints remain intact. | Preserve all prior resolutions. |

## Review Scope

- Changed implementation and behavior reviewed: fixed-path custom-provider-v1 detection, validation, staged secret-free v2 publication, create-missing encrypted batch, same-process exact compensation, destructive reset, app-data-migration registration/order, v2-only runtime containment, and the shared file-lock change required by that path.
- Files / areas reviewed: all nine changed production files in `53dd05e..76afaec`; the four directly changed unit suites; existing app-data migration runner/record lifecycle; startup ordering; origin/personal v1 schema/store/file-lock writer; current secret ID/catalog, vault repository/service, provider Settings composition, and runtime-sync owners.
- Explicit exclusions: carried-forward provider/Gemini/Codex/Claude/importer/Docker/package behavior was not re-reviewed beyond delta-preservation scans. No real custom-provider file, canonical DB, root key, provider credential, Docker daemon, packaged Electron app, or external provider was accessed.
- Independent checks:
  - focused affected suite: 4 files / 67 tests passed;
  - `git diff --check 53dd05e..76afaec`: passed;
  - no Docker, dependency, package, alternate migration source, or normal-runtime v1-reader delta;
  - an isolated aged zero-byte lock probe against the built `withFilePathLock()` reproduced `Timed out acquiring file lock` after 10 seconds and left the lock present.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a supported origin/personal v1 file is preserved through one bounded startup migration when safe; otherwise only the legacy custom configuration is removed and general Settings remains usable. Normal runtime remains v2-only.
- Design-spec behavior map verified against the implementation: confirmed except for legacy lock recovery on the supported origin/personal transition path.
- Design review report and round confirmed: architecture Round 33 `Pass`; material premises `MP-013`–`MP-015` remain applicable.
- Behavior-basis status: `Contradicted` for the bounded `CR-MP-030` lifecycle; otherwise confirmed.
- Changed or newly discovered behavior, if any: none. `CR-MP-030` is a reachable state within the already-approved existing-user migration behavior.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-008` / `DS-UC007D` | Contradicted in one reachable lock-recovery state | Normal upgraded startup correctly runs Prisma -> vault -> app-data runner -> first registered `CustomProviderV1AppDataMigration`; valid v1 then stages v2, creates one encrypted batch, and publishes atomically. | `CR-MP-030`: the exact zero-byte lock written by the supported origin/personal store becomes numeric `0`, is neither a dead positive PID nor an invalid owner, and is never reclaimed even after it is stale. |
| `BEH-008` / `DS-L007` | Confirmed apart from `CR-030` | Full-set strict validation, deterministic SecretIds, create-missing transaction, owner-bound opaque receipt, exact encrypted-row compensation, staged publish, identity-checked reset, and value-free outcomes match the contract. | None beyond `CR-030`. |
| `BEH-001` | Confirmed | Custom store failure is contained before provider composition; stale `provider_*` catalog/runtime rows are cleared/filtered; built-ins and credential-independent catalogs remain available. | None. |
| `BEH-010` | Confirmed | Historical parsing exists only in the app-data migration; normal store is v2-only; no `.env` migration or fallback exists. | None. |
| `BEH-002`–`BEH-007`, `BEH-009`, `BEH-011`–`BEH-017` | Confirmed / carried forward | No relevant source, dependency, Docker, importer, Claude, Codex, Gemini, or assurance delta. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Migration-required fixed historical state is isolated from the current runtime; destructive reset and Settings containment are explicit. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Main migration protocol matches, but the exact prior-version lock format cannot complete the approved existing-user transition after a terminated legacy write. | Resolve `CR-030`. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Startup-to-migration-to-vault/file-to-v2-runtime and reset-to-reconfiguration spines are direct and ownership-readable. | None. |
| Ownership boundary preservation and clarity | Pass | App-data migration owns v1; `SecretManagementService` owns authorization/encryption; repository owns atomic persistence/receipt state; normal store owns only v2. | None. |
| Off-spine concern clarity | Pass | File identity/staging, lock acquisition, encrypted batch persistence, and Settings containment serve explicit spine owners. | Correct the lock owner's legacy-state classification only. |
| Existing capability/subsystem reuse check | Pass | Existing migration runner, file store utility, vault service/repository, provider service, and runtime sync owners are extended. | None. |
| Reusable owned structures check | Pass | One canonical snapshot/identity contract and one opaque receipt type avoid duplicated transition state. | None. |
| Shared-structure/data-model tightness check | Pass | Migration outcome is closed; v1/v2 shapes remain local/current respectively; receipt contains only exact encrypted persistence identity. | None. |
| Repeated coordination ownership check | Pass | Migration orchestration is centralized; provider failure containment is centralized in the established provider owner. | None. |
| Empty indirection check | Pass | The file owner and repository/service boundaries own concrete identity, staging, persistence, or authorization policy. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Historical parsing/orchestration and filesystem mechanics are split without teaching normal runtime v1. | None. |
| Ownership-driven dependency check | Pass | Migration calls the secret service, not the repository; normal provider paths do not reach migration internals. | None. |
| Authoritative Boundary Rule check | Pass | No caller depends on both `SecretManagementService` and its repository; provider Settings depends on the current store/runtime owners only. | None. |
| File placement check | Pass | New files reside under app-data migration ownership; persistence changes remain under their established subsystems. | None. |
| Flat-vs-over-split layout judgment | Pass | Two migration files cleanly separate protocol and file mechanics without artificial module depth. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | Create-missing batch and compensation are migration-specific, typed, and have no overwrite/general-delete mode. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | Migration, snapshot, identity, receipt, reset, and containment names describe their actual roles. | Tighten the lock-owner parsing name/condition with `CR-030`. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Current store parsing remains reused; migration-specific historical validation is intentionally isolated. | None. |
| Patch-on-patch complexity control | Pass | No compatibility reader, backup, recovery scanner, fallback, or update path was added. | Keep the fix bounded to lock classification/recovery. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | The old v1-specific runtime error branch is removed; v1 knowledge remains only in migration. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Core migration/failure tests are strong, but “terminated process” coverage uses only the new PID-bearing lock and misses the exact empty origin/personal lock format. | Add deterministic aged empty-lock recovery coverage and preserve live positive-PID serialization. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Synthetic v1, SQLite vault, service, and filesystem fixtures are focused and reusable. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Historical runtime guidance was correctly replaced by v2-only coverage; no compatibility test path remains. | None. |
| API/E2E readiness for the next workflow stage | Fail | All major source paths and 67 affected checks are green, but a supported upgraded installation can fail before migration entry. | Resolve and source-review `CR-030` before API/E2E. |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `app-data-migration-registry.ts` | 48 | Pass | Pass (`+2`) | Pass | Pass | Accept | None. |
| `custom-provider-v1-app-data-migration.ts` | 216 | Pass | Pass (216 effective new lines) | Pass; one cohesive transition protocol | Pass | Accept | None. |
| `custom-provider-v1-migration-file.ts` | 145 | Pass | Pass (145 effective new lines) | Pass; fixed-path identity/stage/publish/reset owner | Pass | Accept | None. |
| `custom-llm-provider-runtime-sync-service.ts` | 89 | Pass | Pass (`+7`) | Pass | Pass | Accept | None. |
| `llm-provider-service.ts` | 414 | Pass | Pass (`+52/-6`) | Pass; established composition owner | Pass | Accept | None. |
| `custom-llm-provider-store.ts` | 100 | Pass | Pass (`+1/-8`) | Pass; current-v2-only store | Pass | Accept | None. |
| `store-utils.ts` | 267 | Pass | Pass (`+55/-21`) | Correct generic lock owner, but one legacy lock classification is wrong | Pass | `Local Fix` | Resolve `CR-030`; avoid wider redesign. |
| `secret-vault-prisma-repository.ts` | 276 | Pass | Pass (`+96`) | Pass; atomic persistence and repository-bound receipt | Pass | Accept | None. |
| `secret-management-service.ts` | 255 | Pass | Pass (`+71/-8`) | Pass; authorization/encryption boundary | Pass | Accept | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The approved historical parser is migration-only, not a current-runtime compatibility reader. |
| No legacy old-behavior retention in changed scope | Pass | Runtime reads/writes only secret-free v2. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | The old specialized legacy runtime error path is removed. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Fail | The correct migration is present, but the exact old lock representation can prevent it from ever acquiring its fixed path. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | No normal provider path parses v1 or reads plaintext fallback. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Fail | All migration mechanics pass except terminated legacy-lock recovery under `CR-030`. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: existing-user custom-provider migration outcomes and reconfiguration guidance are user/operator-visible.
- Files or areas likely affected: server secret/custom-provider documentation, release notes, and final handoff. Delivery remains the documentation owner after source/API/E2E gates pass.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-013` | Confirmed | Origin/personal supported Settings writes the fixed v1 file and uses the same adjacent lock path. |
| `MP-014` | Confirmed | Cross-resource interruption behavior remains implemented safely after migration entry. |
| `MP-015` | Confirmed | Reset deletion failure remains value-free, non-critical, and contained to custom providers. |

### `CR-MP-030` — A terminated origin/personal custom-provider write can leave the exact empty legacy lock

- Origin: `New`
- Related approved requirement or established contract: `BEH-008`, `REQ-012`, `AC-008`, `DS-UC007D`, `DS-L007`; preserve a valid supported v1 set when safe and recover fixed-path migration ownership after termination.
- Relevant behavior ID(s): `BEH-008`.
- Initiating basis kind: `User` + `Operational`.
- Independent product-supported initiating trigger or applicable governing contract: in `origin/personal`, the user creates or deletes a custom OpenAI-compatible provider through Settings. The supported store calls `updateJsonFile()`, whose lock owner opens `<canonical>.lock` with `wx` and writes no payload. Process termination or power loss while that supported write owns the lock leaves the zero-byte lock behind; the user then starts the upgraded application.
- Support evidence:
  - `origin/personal:autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` uses `updateJsonFile()` for supported Create/Delete;
  - `origin/personal:autobyteus-server-ts/src/persistence/file/store-utils.ts` opens the lock and returns without writing an owner;
  - current `store-utils.ts:74-81` applies `Number(ownerText.trim())`, so empty text becomes numeric `0`, `Number.isSafeInteger(0)` is true, `deadOwner` is false because `0 > 0` is false, and `ownerMissingAndStale` is also false;
  - independent aged zero-byte-lock probe: built `withFilePathLock()` timed out after 10 seconds and left the lock present.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `origin/personal Settings Create/Delete -> v1 store update -> empty fixed-path lock acquired -> process/power interruption -> upgraded server startup -> Prisma/vault -> AppDataMigrationRunner -> CustomProviderV1AppDataMigration.withPathLock() -> EEXIST -> empty owner parsed as 0 -> neither recovery branch -> timeout -> RESET_UNAVAILABLE -> canonical v1 retained -> current store rejects v1 -> custom rows omitted and Create remains blocked`.
- Lifecycle preconditions and material consequence at the claimed point: the user has a valid supported v1 file and a stale zero-byte lock from a terminated supported writer. The migration never reaches validation, preservation, or the approved reset decision; every restart repeats the timeout until the operator manually discovers and removes an undocumented lock.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `CR-030` is a bounded implementation defect. Recognize only positive safe integers as PID-bearing owners; treat the exact empty/non-positive legacy representation as ownerless for stale recovery, without weakening protection for a live positive-PID owner. Add a deterministic regression using the exact aged zero-byte origin/personal lock and prove migration succeeds, the lock is removed, and live-owner serialization remains intact.

## Review Scorecard

- Overall score (`/10`): `9.38`
- Overall score (`/100`): `93.8`
- Score calculation note: simple average across the ten mandatory categories; scores below 9.0 in readiness/correctness reflect only reachable `CR-030` and prevent a pass.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.7 | Migration, compensation/reset, Settings containment, and current runtime spines are direct and complete. | One pre-entry lock state is mishandled. | Correct the lock-state branch without changing the spine. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Historical schema, secret custody, persistence, filesystem, and Settings composition each have one clear owner. | Generic lock owner misclassifies one prior representation. | Keep the fix in `store-utils.ts`. |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Migration-only batch/receipt APIs are narrow and exact; public provider API is unchanged. | No material API weakness; only lock parsing behavior is defective. | Preserve interfaces. |
| 4 | Separation of Concerns and File Placement | 9.6 | Protocol and file mechanics are separated cleanly under the correct subsystems. | `store-utils.ts` carries necessary shared-lock complexity. | Make the bounded classification correction only. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | Closed outcomes, current v2 model, snapshot identity, and opaque receipt are tight. | None material. | Preserve. |
| 6 | Naming Quality and Local Readability | 9.5 | Migration/file/receipt names are precise and local flow is readable. | `ownerMissingAndStale` does not match the numeric-0 case it unintentionally excludes. | Define positive-PID validity explicitly. |
| 7 | API/E2E Readiness | 8.6 | Affected suites and build evidence are strong. | The required existing-user upgrade can stop at a legacy lock before API/E2E migration assertions. | Add the exact regression and rerun source review first. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.5 | Valid migration, collision, compensation, reset, and containment logic are otherwise faithful. | A reachable supported interrupted legacy write leaves custom-provider migration permanently blocked. | Resolve `CR-030`. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Historical parsing is migration-only; runtime stays v2-only with no fallback. | None. | Preserve. |
| 10 | Cleanup Completeness | 9.4 | Old v1 runtime machinery is removed and no recovery/backup paths remain. | The exact obsolete zero-byte lock format is not consumed by the transition. | Add bounded stale-lock cleanup semantics and coverage. |

## Findings

| Finding ID | Severity | Affected Basis | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| `CR-030` | Medium | `BEH-008`, `REQ-012`, `AC-008`, `DS-UC007D`, `DS-L007`, `CR-MP-030` | Origin/personal's supported custom-provider writer creates an empty adjacent lock. Current `store-utils.ts:74-81` parses empty text as `0`; because `0` is a safe integer but not positive, neither dead-owner nor invalid-owner stale recovery applies. The aged-lock probe timed out after 10 seconds and retained the lock. The existing “terminated process” test uses only `99999999\n`, so it proves the new PID-bearing format rather than the exact prior-version lock. | Treat only a positive safe integer as a PID-bearing owner and allow the exact empty/non-positive legacy lock to follow bounded stale recovery. Add deterministic coverage for an aged zero-byte origin/personal lock, plus preservation of current live positive-PID serialization. Do not add a recovery scanner, compatibility reader, alternate source, or broader lock redesign. | `Local Fix` / `implementation_engineer` |

## Classification

`Local Fix`.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- After `CR-030` closes, API/E2E must run the packaged existing-user one/multiple-provider preservation and forced reset/reconfiguration journeys, including restart finalization and value-free evidence.
- Cross-resource DB/file interruption remains intentionally handled by collision plus new-ID reconfiguration; no recovery scanner or current-runtime v1 reader is authorized.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, both Claude modes unchanged, external Codex unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic `.env` import/update, unchanged Docker topology, explicit importer target authority, source/template immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review — Round-33 bounded migration delta`
- Material-Premise Gate: `Fail` because reachable `CR-MP-030` contradicts the supported existing-user transition.
- Score Summary: `9.38/10` (`93.8/100`); API/E2E readiness `8.6`, runtime correctness `8.5`.
- Recommended Recipient: `implementation_engineer`
- Notes: migration ownership and safety mechanics are otherwise accepted. Fix only `CR-030`, return the bounded source/test delta for re-review, and do not resume API/E2E yet.

# Review Round 41 — CR-030 Bounded Lock-Recovery Re-review

## Review Meta

- Review date: `2026-07-27`
- Review entry point: `Implementation re-review — bounded CR-030 source/test delta`
- Repository/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Branch: `codex/secure-centralized-secret-provisioning`
- Prior reviewed handoff HEAD: `5994a622b71533b064910db4da0449505578ebb3`
- Reviewed source/test commit: `3dbe351ee78fbc39f1a1d1f1d2dfc59400fd6672`
- Final handoff HEAD: `dd1d37f90d00331d427bad1b36e4401a3a733038`
- Exact reviewed delta: `5994a622b71533b064910db4da0449505578ebb3..3dbe351ee78fbc39f1a1d1f1d2dfc59400fd6672`
- Prior result: `Round 40 — Fail / Local Fix, 9.38/10`
- Current decision: `Pass`

## Review History And Prior-Finding Resolution

| Round / Finding | Prior Status | Current Status | Resolution Evidence |
| --- | --- | --- | --- |
| `CR-030` | Open — an aged zero-byte lock from the supported origin/personal writer parsed as PID `0` and could never be reclaimed | Resolved | `store-utils.ts` now defines a PID-bearing owner as a positive safe integer. The exact aged zero-byte representation therefore follows bounded stale recovery, while an equally aged lock containing the live current PID remains held. Exact focused regression: 14/14 passed. |
| All findings closed before Round 40 | Resolved / carried forward | Unchanged | The bounded delta touches only the shared lock-owner classifier and the focused migration test. No previously reviewed provider, vault, importer, Settings, Gemini, Claude, Codex, Docker, or dependency path changed. |

## Scope And Approved-Behavior Basis

- Reviewed only the user-requested bounded delta in `store-utils.ts` and `custom-provider-v1-app-data-migration.test.ts`; the already accepted Round-33 migration structure was not redundantly reopened.
- Applicable approved basis remains `BEH-008`, `REQ-012`, `AC-008`, `DS-UC007D`, `DS-L007`, and `custom-provider-v1-migration-contract.md`.
- Preserved existing behavior: origin/personal Settings custom-provider Create/Delete used the fixed application-owned v1 file and an empty adjacent lock. The approved upgrade must migrate or delete that fixed source without weakening exclusion for a live writer.
- Approved change: recognize the exact terminated legacy lock representation after the bounded stale interval, while retaining positive-PID ownership and live-writer serialization.

## Complete Relevant Production Path

`origin/personal Settings custom-provider Create/Delete -> fixed v1 writer acquires an empty adjacent lock -> supported operational interruption can leave the lock -> upgraded startup completes Prisma/vault initialization -> CustomProviderV1AppDataMigration requests the same fixed-path lock -> aged non-PID legacy representation is reclaimed -> strict v1 migration proceeds -> encrypted rows and secret-free v2 publish under the existing reviewed protocol`.

The live-owner preservation path remains:

`current writer acquires the fixed-path lock and writes a positive PID -> a contender observes that the PID is live -> age alone does not authorize reclamation -> contender waits until the owner releases -> migration proceeds only after exclusive ownership`.

## Structural Checklist Summary

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Data-flow spine and lifecycle fidelity | Pass | The correction changes only the lock classification point already owned by the shared fixed-path lock boundary. |
| Ownership and authoritative boundaries | Pass | `withFilePathLock()` remains the sole lock owner; migration code does not inspect or bypass lock internals. |
| Interface/API clarity | Pass | No public API, command, GraphQL, DTO, vault, or migration contract changed. |
| Separation of concerns and file placement | Pass | Classification stays in the existing lock utility; product migration tests exercise it through the real migration boundary. |
| Shared data-model tightness | Pass | One explicit `hasPidOwner` fact removes the prior overlapping safe-integer/positive conditions. |
| Naming/readability | Pass | `hasPidOwner` accurately means a positive safe-integer PID-bearing representation. |
| API/E2E readiness | Pass | Exact source regression and build typecheck are green; broader packaged upgrade execution correctly remains downstream. |
| Runtime correctness | Pass | Aged empty/non-positive representations recover; dead positive PIDs retain immediate recovery; live positive PIDs remain exclusive. |
| Legacy/runtime separation | Pass | Historical representation handling is confined to the lock/migration transition; normal custom-provider runtime remains v2-only. |
| Cleanup completeness | Pass | No recovery scanner, compatibility reader, alternate source, fallback, or wider lock redesign was introduced. |

## Local-Source And Size Check

| Source Path | Effective Non-Empty Lines | Delta | Result | Notes |
| --- | ---: | ---: | --- | --- |
| `autobyteus-server-ts/src/persistence/file/store-utils.ts` | 266 | `+3/-4` | Pass | Below both source-size guardrails; the condition is smaller and semantically tighter than the prior form. |

Tests are not subject to implementation-source size thresholds. The focused migration test adds 36 lines covering the exact old zero-byte representation and equally aged live-positive-PID non-bypass.

## Legacy / Compatibility / Cleanup Verdict

- Backward-compatibility mechanism added to normal runtime: `No`.
- Approved migration-boundary historical handling: `Yes`; exact and bounded to the fixed prior lock representation needed for the reviewed existing-user transition.
- Unapproved fallback, alternate source, recovery scanner, backup/quarantine, or version-specific provider runtime reader: `None`.
- Dead or obsolete source/test paths introduced: `None`.
- Cleanup verdict: `Pass`.

## Docs-Impact Verdict

- Docs impact: `No`.
- Why: the delta corrects internal lock recovery for the already documented migration contract and changes no operator command, user interaction, configuration, API, or supported provider behavior.

## Material Premise Validation

### Upstream / Prior Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `CR-MP-030` | Confirmed and handled | The supported origin/personal Settings writer and operational interruption path remain reachable. The corrected classifier now handles the resulting aged empty lock proportionately without weakening a live positive-PID owner. |
| Round-33 architecture premises `MP-013`, `MP-014`, `MP-015` | Confirmed | No relevant source outside the bounded lock classifier/test changed. |

No new or reclassified material premise was introduced.

## Independent Validation

- `git diff --check 5994a622b71533b064910db4da0449505578ebb3..3dbe351ee78fbc39f1a1d1f1d2dfc59400fd6672`: passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/custom-provider-v1-app-data-migration.test.ts`: 1 file / 14 tests passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`: passed.
- Diff inventory: exactly one implementation-source file and one focused test file; no unrelated production/package/Docker delta.

## Review Scorecard

- Overall score: `9.62/10`
- Overall score: `96.2/100`
- Score calculation note: simple average across the ten mandatory categories; every category is at or above the clean-pass target.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.7 | The existing-user interruption path and live-owner path are both explicit and preserved. | Broader packaged proof remains downstream. | Execute the approved API/E2E upgrade journeys. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | The shared lock boundary alone owns classification and exclusion. | Generic filesystem locking necessarily remains a low-level shared concern. | Preserve the single owner. |
| 3 | API / Interface / Query / Command Clarity | 9.5 | No API changed; the internal predicate now has one precise meaning. | The utility still reports generic lock-timeout errors by established design. | No in-scope change required. |
| 4 | Separation of Concerns and File Placement | 9.6 | Lock parsing stays in the lock owner; migration behavior is tested at the migration surface. | None material. | Preserve. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.6 | One `hasPidOwner` fact eliminates the prior condition gap. | None material. | Preserve. |
| 6 | Naming Quality and Local Readability | 9.6 | The new name matches the exact positive-PID invariant. | The surrounding utility remains necessarily procedural. | No in-scope change required. |
| 7 | API/E2E Readiness | 9.5 | Exact regression, TypeScript build check, and diff check pass. | Packaged existing-user execution has not yet run. | Resume API/E2E and execute the reviewed scenarios. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.7 | The exact legacy failure is fixed without weakening live-owner exclusion. | Filesystem/process execution still requires downstream realistic validation. | Confirm through packaged upgrade/restart coverage. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Historical knowledge remains only in the approved transition boundary; runtime is v2-only. | None. | Preserve. |
| 10 | Cleanup Completeness | 9.6 | The correction adds no fallback, scanner, alternate source, or wider mechanism. | None material. | Preserve. |

## Findings

No open implementation-source findings.

`CR-030` is resolved by the exact bounded correction and regressions described above.

## Classification

Not applicable — review passed.

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- API/E2E must now execute the reviewed packaged existing-user one/multiple-provider preservation and forced reset/reconfiguration journeys, including restart finalization, exact live-lock behavior where practical, and value-free evidence.
- Cross-resource DB/file interruption remains intentionally governed by the reviewed collision plus new-ID reconfiguration decision; no recovery scanner or current-runtime v1 reader is authorized.
- Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only, both Claude modes unchanged, external Codex unchanged, `LOCAL_HARDENED` with Codex excluded, deferred `STRONG_AGENT_ISOLATION`, exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0, no automatic `.env` import/update, unchanged Docker topology, explicit importer target authority, source/template immutability, and `DASHSCOPE_API_KEY` as the sole Qwen mapping.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation re-review — bounded CR-030 source/test delta`
- Material-Premise Gate: `Pass`
- Score Summary: `9.62/10` (`96.2/100`); every category `>=9.5`.
- Recommended Recipient: `api_e2e_engineer`
- Notes: `CR-030` is resolved with no scope widening. The reviewed Round-33 custom-provider-v1 migrate-or-delete package may resume API/E2E at final handoff HEAD `dd1d37f90d00331d427bad1b36e4401a3a733038`.
