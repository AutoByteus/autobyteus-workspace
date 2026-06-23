# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/investigation.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/centralized-memory-provider-design/tickets/in-progress/centralized-memory-provider-design/design-spec.md`
- Current Review Round: 1
- Trigger: Solution designer requested architecture review after user approval of the Memory Sync / embedded Memory Hub design on 2026-06-23.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: Round 1
- Current-State Evidence Basis: Requirements, investigation notes, and design spec were reviewed. Spot checks were performed against current code paths for local memory layout/readers/writers, GraphQL memory explorer/view resolvers, frontend Memory page/store, Node Manager tabs, REST registration, remote-access credential hash-at-rest pattern, and server URL/runtime endpoint helpers.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review after user-approved Memory Sync design handoff | N/A | None | Pass | Yes | Design is ready for implementation with residual risks tracked below. |

## Reviewed Design Spec

The reviewed design supersedes the earlier runtime memory-provider architecture with an embedded `Memory Sync` feature in `autobyteus-server-ts`. Current local runtime memory remains in `memory/agents` and `memory/agent_teams`; a Memory Sync source scans those roots and pushes changed-file full replacements to a Memory Hub, which stores imported corpus files under `memory/imports/<sourceNodeId>`. Imported memory is explicitly read-only/non-runnable and is visible only through source-aware Memory UI selection. Hub setup uses an editable `advertisedHubBaseUrl`, backend-generated hash-at-rest source tokens, source-id binding, and source-side background/manual sync workers outside runtime writers.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec includes `Larger Requirement / Feature`, no runtime-provider refactor, additive Memory Sync subsystem and import namespace. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Classifies cross-node aggregation as `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `Legacy Or Compatibility Pressure`; evidence cites current local file roots and local-only UI/API readers. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Runtime memory refactor is explicitly rejected; additive backend/frontend Memory Sync and source-aware Memory Explorer work is in scope; analytics/deletion/redaction are deferred. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, ownership map, file mapping, migration sequence, and rejection log all reinforce scanner/worker sync rather than runtime writer/provider refactor. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First completed architecture review round. | No prior unresolved findings. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Manual source-to-hub sync | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Background sync after runtime writes | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Hub ingestion and import commit | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Sync status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 / DS-010 | Import catalog and status navigation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Batch result/failure return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 / DS-014 | Source scan/change planning/live-file local flows | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 | Memory UI source-aware browsing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Runtime-updatable Memory Sync config | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | Existing Nodes page setup entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-012 / DS-013 | Hub URL/token setup and URL candidates | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-sync/source` | Pass | Pass | Pass | Pass | Owns scanner, planner, manual service, worker, state, and hub client without touching runtime writers. |
| `memory-sync/hub` | Pass | Pass | Pass | Pass | Owns credentials, advertised setup info, ingestion, import storage, and import catalog. |
| `memory-sync/shared` | Pass | Pass | Pass | Pass | Appropriate for DTOs, manifest, source-id and path policy shared by source and hub. |
| `server-addressing` | Pass | Pass | Pass | Pass | Extract/share decision avoids duplicating remote-access address candidate policy or coupling Memory Hub to phone-specific semantics. |
| REST ingestion API | Pass | Pass | Pass | Pass | Inter-server file batch and health endpoints fit REST transport. |
| GraphQL UI/config API | Pass | Pass | Pass | Pass | User-facing config, status, manual sync, credentials, URL candidates, and memory explorer fit current GraphQL/UI patterns. |
| Existing Memory explorer services/UI | Pass | Pass | Pass | Pass | Source-aware extension is the correct reuse, provided implementation keeps source resolution behind `MemoryExplorerSourceService` / imported adapter. |
| Existing Nodes page / node-bound context | Pass | Pass | Pass | Pass | Reuse as setup navigation only; design correctly forbids frontend node identity from becoming import identity. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Source node identity | Pass | Pass | Pass | Pass | `source-node-id.ts` owns stable folder-safe identity validation. |
| Relative path policy | Pass | Pass | Pass | Pass | `memory-sync-path-policy.ts` is the right owner for traversal, kind, exclusion, and symlink/root containment checks. |
| File operation DTO | Pass | Pass | Pass | Pass | V1 `MemoryFileOperation` is narrowed to `replace`; no hidden append/range fields remain. |
| Sync manifest/state | Pass | Pass | Pass | Pass | Manifest/state are sync state, not analytics indexes. |
| Hub credential record | Pass | Pass | Pass | Pass | Hash-at-rest credential model mirrors existing remote-access pattern and avoids plaintext persistence on hub. |
| URL candidate shape | Pass | Pass | Pass | Pass | Generic server-address candidate owner is justified by Memory Hub and remote-access overlap. |
| Memory explorer source input | Pass | Pass | Pass | Pass | Explicit `LOCAL` vs `IMPORTED/sourceNodeId` avoids ambiguous run-id-only detail queries. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SourceNodeMetadata` | Pass | Pass | Pass | Pass | Stable `sourceNodeId` is distinct from display name and last known endpoint. |
| `MemoryFileDescriptor` | Pass | Pass | Pass | Pass | Relative path, kind, size, mtime, and hash each have one role. |
| `MemoryFileOperation` | Pass | Pass | Pass | Pass | `operation: "replace"` keeps V1 full-file replacement explicit. |
| `MemorySyncManifest` | Pass | Pass | Pass | Pass | Manifest tracks file sync state/counts/recent batches; analytics role is explicitly rejected. |
| `MemorySyncStatus` | Pass | Pass | Pass | Pass | Separates role config, job state, error, and counts. |
| `MemoryHubConfig` | Pass | Pass | Pass | Pass | `advertisedHubBaseUrl` is separated from source target hub URL and from internal listen/runtime URLs. |
| `MemoryHubSourceCredentialRecord` | Pass | Pass | Pass | Pass | Credential id/hash/status/source binding are clear; plaintext token excluded after mutation response. |
| `MemoryExplorerSourceInput` | Pass | Pass | Pass | Pass | Avoids run-id ambiguity between local and imported corpora. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Earlier separate context-layer / Memory Hub project | Pass | Pass | Pass | Pass | Superseded by embedded `autobyteus-server-ts/src/memory-sync` for V1. |
| Runtime memory-provider refactor | Pass | Pass | Pass | Pass | Explicitly rejected for this feature; runtime writes remain local. |
| Runtime writer remote-upload hooks | Pass | Pass | Pass | Pass | Replaced by scanner/worker after local file writes. |
| Raw-trace-only sync | Pass | Pass | Pass | Pass | Replaced by full `agents` and `agent_teams` file mirror. |
| `memory/local` migration option | Pass | Pass | Pass | Pass | Rejected; current local runtime paths stay unchanged. |
| Imported memory in normal local history | Pass | Pass | Pass | Pass | Rejected; explicit Memory source selector is the visibility path. |
| Row-level Node Manager Memory Sync button | Pass | Pass | Pass | Pass | Rejected; one journey via `Open` then `Memory Sync` tab. |
| Auto-generated authoritative hub URL from listen address | Pass | Pass | Pass | Pass | Replaced by editable persisted `advertisedHubBaseUrl` plus candidate/test flow. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-sync/shared/*` | Pass | Pass | Pass | Pass | DTOs, manifest/status, source-id, and path-policy files are semantically tight. |
| `local-memory-export-scanner.ts` | Pass | Pass | Pass | Pass | Owns exportable-file discovery/exclusion only. |
| `memory-file-change-planner.ts` | Pass | Pass | Pass | Pass | Owns no-op vs full-file replace policy. |
| `memory-sync-service.ts` | Pass | Pass | Pass | Pass | Manual sync use-case owner. |
| `memory-sync-worker.ts` | Pass | Pass | Pass | Pass | Background lifecycle/non-overlap/backoff owner. |
| `memory-hub-client.ts` | Pass | Pass | Pass | Pass | Source-side transport only. |
| `memory-hub-credential-service.ts` | Pass | Pass | Pass | Pass | Credential lifecycle and validation owner. |
| `memory-hub-connection-info-service.ts` | Pass | Pass | Pass | Pass | Advertised URL + setup payload composition owner. |
| `memory-hub-ingestion-service.ts` | Pass | Pass | Pass | Pass | Auth/source/path/idempotency/commit orchestration owner. |
| `local-file-memory-import-store.ts` | Pass | Pass | Pass | Pass | Filesystem import storage and manifest API owner. |
| `memory-explorer-source-service.ts` / `imported-memory-explorer-adapter.ts` | Pass | Pass | Pass | Pass | Correctly isolates local/imported root selection and read adapter behavior. |
| API REST/GraphQL files | Pass | Pass | N/A | Pass | Transport facades are prohibited from owning sync/storage logic. |
| Frontend `MemorySyncCard`, Memory page/store changes | Pass | Pass | Pass | Pass | UI owns state and calls backend boundaries only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime writers | Pass | Pass | Pass | Pass | Must not call hub client or block on hub I/O. |
| Source sync subsystem | Pass | Pass | Pass | Pass | Reads local memory root and pushes through hub client; no hub import writes. |
| Hub ingestion subsystem | Pass | Pass | Pass | Pass | Writes imports only through ingestion/import-store boundaries. |
| Memory explorer | Pass | Pass | Pass | Pass | Must resolve explicit source scope before imported reads; normal local history excludes imports. |
| Frontend | Pass | Pass | Pass | Pass | GraphQL only for setup/status/actions; no direct REST ingestion or token generation. |
| Node Manager | Pass | Pass | Pass | Pass | Navigation/bound context only; not Memory Sync identity. |
| Server address candidates | Pass | Pass | Pass | Pass | Network candidate policy is separated from token/sync behavior. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySyncService` | Pass | Pass | Pass | Pass | GraphQL triggers service, not scanner/client directly. |
| `LocalMemoryExportScanner` | Pass | Pass | Pass | Pass | Export walk/exclusion rules remain one owner. |
| `MemoryFileChangePlanner` | Pass | Pass | Pass | Pass | Full-file replacement policy centralized. |
| `MemorySyncWorker` | Pass | Pass | Pass | Pass | Non-overlap and polling/backoff live in worker. |
| `MemoryHubIngestionService` | Pass | Pass | Pass | Pass | REST route does not write files directly. |
| `MemoryImportStore` | Pass | Pass | Pass | Pass | Filesystem import root and atomic writes are encapsulated. |
| `MemoryHubCredentialService` | Pass | Pass | Pass | Pass | Backend token generation/hash validation/source binding are authoritative. |
| `MemoryHubConnectionInfoService` | Pass | Pass | Pass | Pass | UI does not reconstruct one-time token or endpoint rules. |
| `MemoryExplorerSourceService` | Pass | Pass | Pass | Pass | Source resolution/defaulting is one boundary. |
| `ServerAddressCandidateService` | Pass | Pass | Pass | Pass | Prevents duplicated OS/interface URL policy. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `startMemorySync(input)` | Pass | Pass | Pass | Medium | Pass |
| `updateMemoryHubConfig(input)` | Pass | Pass | Pass | Low | Pass |
| `listMemoryHubUrlCandidates(input)` | Pass | Pass | Pass | Low | Pass |
| `updateMemorySyncSourceConfig(input)` | Pass | Pass | Pass | Low | Pass |
| `create/regenerate/revokeMemoryHubSourceCredential` | Pass | Pass | Pass | Low | Pass |
| `getMemoryHubConnectionInfo()` | Pass | Pass | Pass | Low | Pass |
| `testMemoryHubConnection(input)` | Pass | Pass | Pass | Low | Pass |
| `POST /rest/memory-sync/v1/batches` | Pass | Pass | Pass | Low | Pass |
| `GET /rest/memory-sync/v1/health` | Pass | Pass | Pass | Low | Pass |
| `scanLocalMemoryForExport` / `planChangedMemoryFiles` | Pass | Pass | Pass | Low | Pass |
| `commitMemoryImportBatch` | Pass | Pass | Pass | Medium | Pass |
| `MemoryExplorerSourceInput` | Pass | Pass | Pass | Medium | Pass |
| Source-aware memory explorer/list/detail queries | Pass | Pass | Pass | Medium | Pass |
| Existing `openNodeWindow(nodeId)` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/memory-sync/source` | Pass | Pass | Low | Pass | Source role only. |
| `autobyteus-server-ts/src/memory-sync/hub` | Pass | Pass | Low | Pass | Hub role only. |
| `autobyteus-server-ts/src/memory-sync/shared` | Pass | Pass | Medium | Pass | Keep limited to sync DTOs/policies. |
| `autobyteus-server-ts/src/server-addressing` | Pass | Pass | Low | Pass | Generic address candidate concern. |
| `api/rest/memory-sync.ts` | Pass | Pass | Low | Pass | REST transport only. |
| `api/graphql/types/memory-sync.ts` | Pass | Pass | Low | Pass | UI transport only. |
| `api/graphql/types/memory-explorer.ts` / `memory-view.ts` | Pass | Pass | Medium | Pass | Existing API files are correct extension points for source input. |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | Pass | Pass | Low | Pass | Node-bound setup tab content. |
| `autobyteus-web/pages/memory.vue` and memory stores/components | Pass | Pass | Medium | Pass | Existing memory flows need source propagation across all routes. |
| `memory/imports/<sourceNodeId>` | Pass | Pass | Low | Pass | Imported corpus namespace, separate from local runnable memory. |
| `{appDataDir}/memory-sync` | Pass | Pass | Low | Pass | Config/state/secrets outside exported/imported memory corpus. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local runtime memory files | Pass | Pass | N/A | Pass | Reuse as source artifacts, not provider abstraction. |
| Runtime write path | Pass | Pass | N/A | Pass | Reuse unchanged; no remote write hooks. |
| Remote-access credential pattern | Pass | Pass | Pass | Pass | Hash-at-rest, one-time plaintext, revoke/regenerate pattern is appropriate. |
| Remote-access/server URL candidate logic | Pass | Pass | Pass | Pass | Extract/share generic address-candidate owner. |
| Existing REST route registration | Pass | Pass | N/A | Pass | Add Memory Sync REST route under existing `/rest` prefix. |
| Existing GraphQL UI API | Pass | Pass | N/A | Pass | Add config/status/manual sync and source-aware memory fields. |
| Existing Nodes page | Pass | Pass | N/A | Pass | Correct setup entry; identity remains backend `sourceNodeId`. |
| Existing Memory menu/explorer | Pass | Pass | N/A | Pass | Correct browsing surface with explicit source selector. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime memory provider refactor | No | Pass | Pass | Rejected for V1. |
| Runtime remote-upload hook | No | Pass | Pass | Forbidden shortcut. |
| Existing local memory layout | Yes, intentionally retained | Pass | Pass | This is not legacy dual behavior; it is the active runtime authority kept unchanged. |
| Imported local-history mixing | No | Pass | Pass | Explicit source selector only. |
| Append/range delta protocol | No | Pass | Pass | Full-file replacement only in V1. |
| Separate Memory Hub project | No | Pass | Pass | Embedded hub in existing backend. |
| Frontend node identity as source identity | No | Pass | Pass | Explicitly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared DTO/path/source-id policies first | Pass | Pass | Pass | Pass |
| Hub import storage and credential/config/state stores | Pass | Pass | Pass | Pass |
| Source scanner/planner/client/manual sync | Pass | Pass | Pass | Pass |
| GraphQL/REST API additions | Pass | Pass | Pass | Pass |
| Source-aware Memory Explorer and route/store/query propagation | Pass | Pass | Pass | Pass |
| Nodes page Memory Sync tab | Pass | Pass | Pass | Pass |
| Background worker last | Pass | Pass | Pass | Pass |
| Test plan | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Storage layout | Yes | Pass | Pass | Pass | Shows local roots unchanged plus imports. |
| Full-file replacement / live raw traces | Yes | Pass | Pass | Pass | Explicitly covers active raw traces, archive segments, manifests, compaction rewrite. |
| Docker/Kubernetes hub URL setup | Yes | Pass | Pass | Pass | Shows `host.docker.internal`, LAN/tailnet/manual, and Ingress-style examples. |
| Token handling | Yes | Pass | Pass | Pass | Good/bad examples identify backend generation/hash-at-rest vs frontend/plaintext storage. |
| Memory UI source selection | Yes | Pass | Pass | Pass | Shows Local Memory default and imported selector placement. |
| Existing Nodes integration | Yes | Pass | Pass | Pass | Shows Open-node then Memory Sync tab; rejects row-level button and NodeProfile identity reuse. |
| Import separation | Yes | Pass | Pass | Pass | Explicitly rejects mixed local/imported history and runtime actions. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Delete propagation | A true mirror would remove files; hub corpus preservation may intentionally keep source-deleted files. | No blocking design action; default no hard delete is explicit. Future product decision needed if deletion mirroring becomes required. | Residual risk |
| Redaction/retention policy | Imported memory can contain sensitive company/tool data. | No blocking V1 architecture action; add follow-up policy before enterprise-hardening. | Residual risk |
| Transport hardening | Bearer tokens and memory bytes should use trusted transport in non-local deployments. | No blocking architecture action for V1; implementation/docs should warn for non-loopback HTTP and encourage HTTPS/private network/Kubernetes ingress policy. | Residual risk |
| Large file performance | Full-file replacement may become expensive for very large corpora. | No blocking action; V1 deliberately chooses simplicity. Monitor and design deltas only if real usage proves need. | Residual risk |
| Batch replay/conflict details | Idempotent retry depends on batch id uniqueness and committed-batch comparison policy. | Implement with committed batch metadata sufficient to return no-op for true duplicate and reject conflicting reuse of a batch id. This is compatible with the design's idempotency requirements. | Implementation note / residual risk |
| Imported run metadata `memoryDir` fields | Mirrored metadata may contain source-node absolute paths. | Imported adapters should root reads at selected import root and not use copied source `memoryDir` as an actionable local path. This is consistent with source-aware reader requirements. | Implementation note / residual risk |

## Review Decision

Pass: the design is ready for implementation.

The design is spine-first, has clear owners, obeys the Authoritative Boundary Rule, preserves local runtime memory, uses changed-file full replacement consistently, separates local/imported memory, propagates Memory UI source selection, and defines hub URL/token/path/idempotency requirements sufficiently for implementation. The open items above are residual implementation/security hardening risks, not blocking design gaps.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Full-file replacement can become expensive for large active files; V1 intentionally accepts this to avoid hidden append/range protocol ownership.
- Deletion propagation is deferred; imported corpus may retain files deleted on the source until a later explicit policy is designed.
- Sensitive imported memory requires follow-up redaction/retention and deployment transport hardening guidance.
- Implementation must ensure batch idempotency distinguishes true duplicate retries from conflicting batch-id reuse.
- Imported readers must ignore/rebase any copied source-node absolute `memoryDir` fields and must not pass imported metadata into restore/continue/archive/delete flows.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Ready for implementation. Route the requirements, investigation notes, design spec, and this design review report to `implementation_engineer`.
