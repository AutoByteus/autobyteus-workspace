# Design Spec — résumé PDF search preview

## Solution And Approval Basis
- Package: `resume-pdf-search-preview`; current solution revision SR-002.
- Approved requirements: R1/SR-001, Solution Designer within delegated direction; user informed by message beginning “The server logs show that search results contain absolute paths”, 2026-10-12.
- Behavior-defining supplements: None; evidence inventory in investigation-notes.
- Design status: Ready for independent review, not yet reviewed.
- Canonical investigation: `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview/investigation-notes.md`.
- Authorities read: solution-designer references/architecture-design.md and design-principles.md in full, design-spec-template.md; `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/DESIGN.md`, root and package AGENTS.md, TESTING.md including refreshed-base additions, RELEASE.md. 2026-10-12. design-examples not needed for this bounded conversion.
- Project/general principle conflicts: None. TESTING.md forbids live-user-app tests; deliver isolated proof and separate user verification rather than treating the requested8001 target as a test sandbox.

## Current-State Read
Investigation E-004/006/007/008/009 establishes an identity mismatch, not a PDF decoding failure. Internal search/index uses absolute filesystem paths; the public workspace search forwards them to a client expecting tree-relative paths; content boundary rejects absolutes and returns400 before reading bytes. GraphQL resolver acquires/releases an explorer lease, not a watcher lease, and propagates abort. Existing serialized tree/file operations use workspace-relative identity. Backend correction lets current frontend consume valid locators without viewer changes or desktop replacement.

## Task Size And Architectural Risk (Mandatory)
- `task_size`: Small.
- Size evidence: one existing public search method conversion; bounded existing unit/integration/E2E assertions, browser coverage and area documentation. No new subsystem, data store, UI design or schema.
- `architectural_risk`: High.
- Risk evidence: semantics of public GraphQL `searchFiles: [String]` change from host absolute to workspace-relative; current integration explicitly asserts absolutes. It borders security-sensitive content access, whose guard remains unchanged. Actual rollout into live /app backend may disrupt conversations unless coordinated; image/host deployment tooling still unknown. These material contract/deployment concerns require independent review despite local size.
- Payload inventory: transient path strings, synthetic fixtures and evidence only; résumé untouched. Structural delta: WorkspaceFileExplorer public return identity/GraphQL consumer contract. Not inflated for content volume.
- Escalation: any need to loosen reader restrictions, mutate registry/docs, change frontend-local capabilities, change search strategy cancellation/watchers, broaden deployment interruption or add dual path formats returns Design Impact/Requirement Gap to Solution Designer.

## Architecture Investigation Evidence
| Evidence | Current fact | Decision |
| --- | --- | --- |
| E-006/009 | Installed absolute-result rejection reproduced with own fixture, relative equivalent accepted | Correct producer output; leave reader protected |
| E-007/010 | Public WorkspaceFileExplorer.searchFiles encapsulates all strategies; only production caller GraphQL | Convert once at existing public boundary |
| E-008 and tree-node.ts/getPath inspection | Tree paths are workspace relative; store/viewer uses returned path verbatim | Existing frontend works with corrected response; no PDF-specific fetch |
| E-011 | Existing integration asserts wrong public result format; E2E only suffix | Replace public-format assertions, preserve internal strategy expectations, test cross-boundary content |
| E-002 and deployment inventory | /app runtime differs from worktree, no Docker tool/socket here | Delivery must establish safe rollout/pin or report blocker |
Remaining evidence gap: changed-build tests/browser rendering and actual runtime rollout/user confirmation, assigned downstream.

## Intended Change
At `WorkspaceFileExplorer.searchFiles`, await the snapshot controller's absolute candidates. For each result, derive `path.relative(this.workspaceRootPath, candidate)` and validate the derived locator using existing `getPath`/resolveWorkspaceRelativePath before publishing it. Return the relative locator in the same native path convention as current serialized tree paths. On POSIX this is `job-applications/.../Yu_Zheng_Resume_2026_Application.pdf`. Keep order/count unchanged and don't URI-decode filenames; transport URL encoding remains the client's responsibility.

Internal indexer/search strategies continue to use absolute paths as today. Public search returns only workspace-relative paths; no legacy flag, absolute-output fallback, dual-format response or client-specific branch. Existing resolver catches failures/logs and returns [] as before. Cancellation remains forwarded and errors remain abort errors at the existing owner. No additional watcher lease or filesystem rescan is added.

Do not replace `getPath`/REST validation, accept absolute paths at reader, or trim a leading slash indiscriminately. The conversion is root-aware and an escaping candidate must not be emitted as an authorized relative identity. Use the existing path owner; no new validation framework/threat model. Do not add unrelated root/file/type filtering policies for contrived strategy output.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved intent / AC | Trigger / evidence | Change or preservation | Target path / lifecycle |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001/004; AC-001 | User searches resume and selects PDF; E-001/004/009 | Correct search locator; pages render via protected bytes | DS-001 + DS-002; search snapshot then click/preview |
| BEH-002 | REQ-004; AC-003 | Browse/search equivalent file, nested lazy result; E-008 | Shared relative identity for text/media and reused tree nodes | DS-001 + DS-002; no new client owner |
| BEH-003 | REQ-002; AC-002 | Protected content requests incl prohibited inputs; E-006 | Absolute/traversal/outside denial unchanged | DS-002 authoritative reader unchanged |
| BEH-004 | REQ-003; AC-004 | Validated fix needs live delivery; E-002 | Preserve state, report actual rollout and user verification | DS-003 delivery-owned operational path |

## Relevant Supplemental Task Artifacts
Evidence-only: `evidence/runtime-failure-excerpts.log`, `evidence/installed-module-checksums.txt`, `evidence/baseline-isolated-reproduction.log` under canonical ticket root; original external screenshot E-001. All inspected/captured, related to REQ-001/002/003; no behavior approval required. Review artifacts N/A — not applicable before independent review. Implementation/validation/delivery artifacts not yet produced.

## Task Design Health Assessment (Mandatory)
- Change posture: Bug Fix.
- Current design issue found: Yes, a missing public workspace-relative identity invariant.
- Root cause classification: Missing Invariant (right public owner exists; forwards incompatible representation).
- Refactor needed now: No. Strengthen existing owner's return contract with bounded conversion.
- Evidence: strategies/index must use root-qualified filesystem candidates internally, while same workspace's read/content operations reject absolutes; public search forwarding is the only incompatible boundary.
- Structural triggers: ambiguous identity risk addressed by documenting relative string contract, not a new DTO with overlapping identities. No boundary bypass: resolver uses public explorer; client uses content endpoint. No duplicated conversion to extract; no new responsibility beyond workspace-search return identity. File placement and lifecycle remain healthy. No broad split warranted.
- Design response: remove raw absolute forwarding at public search boundary; internal search mechanics/reader remain unchanged.
- Deferrals: symlink/TOCTOU hardening, duplicate-name index behavior, frontend-host mapping generalization and ranking are not needed for approved fix; no stronger safety claim than current lexical validation.

## Terminology
Candidate = internal absolute strategy result. Locator = public workspace-relative file identity paired with request workspaceId. They are not interchangeable.

## Legacy Removal Policy (Mandatory)
Remove public raw absolute forwarding and absolute-public-result integration expectations. Keep no compatibility wrappers/dual formats/fallbacks. Internal absolute search strategies are actively used, not legacy or dead code; their tests stay absolute. No dead code identified in touched search method/module during consumer/import trace.

## Persisted Data / State Transition Decision
Not Affected. No persisted-data model/reader/writer/schema/physical-store change; documents and registry remain directly used without rewrites. Transient search response strings change only. Existing preview tab/search cache can be closed and refreshed by the user after rollout; no hidden client-state migration. No migration/startup gate/backup subsystem needed.

## Data-Flow Spine Inventory
| Spine | Scope | Start → end | Owner / purpose |
| --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Files query → workspace-scoped relative search results | WorkspaceFileExplorer owns search identity; returns valid choices |
| DS-002 | Primary End-to-End | Result click → rendered PDF/text | File explorer store owns selected state; workspace reader owns bytes; viewer owns render |
| DS-003 | Primary End-to-End, operational | Reviewed/validated candidate → delivered runtime and verified user outcome | Delivery Engineer owns integration, approval, rollout and cleanup |

## Primary Execution Spines And Narratives
DS-001: FileExplorer query → useWorkspaceFileExplorer → fileExplorerSearchActions/Apollo → GraphQL FileExplorerResolver → WorkspaceFileExplorer.searchFiles → snapshot controller/index/search strategies → public root-relative conversion/validation → GraphQL response → store TreeNode choices.
The existing workspace search owner waits for its snapshot candidate results, maps once at its public boundary and preserves ordering/cancellation and lease release. Client no longer needs to infer the root or operate on an absolute host path.

DS-002: FileItem click → scoped store.openFilePreview → content actions/buildWorkspaceContentUrl → protected REST /workspaces/:workspaceId/content → FileSystemWorkspace.getAbsolutePath/resolveWorkspaceRelativePath → fs stream MIME application/pdf → shared PdfViewer/vue-pdf-embed → pages.
The valid returned locator is directly encoded into the content request. The existing reader still denies absolute and escaping inputs. PDF.js is unchanged; render proof must include actual canvases/page content, not just request200.

DS-003: reviewed design → implementation/self-check → independent source review → API/E2E changed-stack verification → delivery integration/user verification/approved rollout → finalized receipt. These roles/routes remain rule-owned; authoring does not finalize or deploy.

## Spine Actors / Ownership Map
- FileExplorer/scoped composable: query and workspace scope.
- Search store: response-to-TreeNode mapping and selected state, not host authorization.
- Resolver: transport and explorer lease lifecycle, not duplicate path conversion.
- WorkspaceFileExplorer: public operation/relative identity; encapsulates snapshot controller and strategies.
- FileSystemWorkspace/path utils: authoritative filesystem resolution; existing denial contract.
- REST: stream/MIME/status mapping, not new absolute mapping.
- PdfViewer: render/loading error state, no direct filesystem/IPC bypass.
Thin entry facade: resolver is transport/lease adapter to WorkspaceFileExplorer, not a second identity owner.

## Removal / Decommission Plan (Mandatory)
| Item | Reason / replacement | Scope |
| --- | --- | --- |
| Raw absolute result pass-through in public search | Contradicts reader; replace with bounded root-relative conversion | In this change |
| Integration assertion “returns absolute paths for matches” | Tests defect, not approved usable workspace identity | In this change, replace with relative/reader interoperability |
No strategy removal, frontend workaround or dead-code follow-up discovered.

## Return Or Event Spine / Bounded Local Spines
Return: strategies → snapshot controller abort race → public conversion → resolver/GraphQL → store → renderer. Async refresh/cancellation stays existing controller-owned lifecycle. N/A for new event loop/state machine: none added, watcher behavior unchanged.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Responsibility / reason |
| --- | --- | --- |
| Path utils/getPath | Explorer and filesystem reader | Existing relative resolution/containment; preserve authoritative checks |
| Snapshot controller | Explorer | Tree/index refresh and abort ownership; unchanged |
| MIME/URL encoding | REST/client | Correct byte type and transport locator encoding; unchanged |
| Test fixtures/process cleanup | Validation owner | Fresh data/ports/build and bounded cleanup, not production state |

## Ownership Boundaries / Boundary Encapsulation Map
WorkspaceFileExplorer is the public file-operation owner; resolver must not reach its snapshot controller/index internals. Existing `getPath` delegates reusable containment policy; do not copy its security logic into search or client. REST remains authoritative for byte access; client locators alone do not authorize access. No frontend viewer direct filesystem or native IPC bypass.

## Dependency Rules / Interface Boundary Mapping And Check
- Allowed: UI → scoped store → existing GraphQL and REST; resolver → public explorer; explorer → snapshot controller + path utils; REST → workspace path owner → fs.
- Forbidden: transport/client → explorer internals; client-only containment as substitute for REST; content route acceptance of arbitrary absolute host paths; PDF-specific filesystem reading.
- `searchFiles(workspaceId, query): string[]`: workspace-owned file choices, now relative like tree identities. One meaning per result. Identity explicit via paired workspaceId; no mixed subject selector.
- `WorkspaceFileExplorer.searchFiles(query, signal): Promise<string[]>`: bounded public search, returns same relative locators; strategies retain internal candidate contract.
- Content GET uses same `{workspaceId, path=<relative>}` semantics as before. No route/schema rename/addition.
All responsibility checks singular; naming natural, no new main domain node or shared DTO.

## Existing Capability Reuse / Subsystem Allocation
Reuse file-explorer public operation, workspace-path-utils and shared PDF viewer. Extend search method return invariant only. No helper/service/cache/new owner. File responsibilities derived from existing ownership; folder layout remains current and clear.

## Draft / Reusable Structure / Final File Responsibility Mapping
Draft and final coincide: bounded change in existing owner, no extraction required. Existing string[] remains tight once relative semantics is explicit; do not add parallel abs/rel fields.
| Change | Path | Responsibility |
| --- | --- | --- |
| Modify | autobyteus-server-ts/src/file-explorer/file-explorer.ts | Public search result conversion and existing-owner validation |
| Modify | autobyteus-server-ts/tests/integration/file-explorer/file-search.integration.test.ts | Replace absolute-public expectation; result usable by workspace reader |
| Modify/add proportionately | autobyteus-server-ts/tests/unit/file-explorer tests | Public conversion across existing fuzzy/ripgrep candidate strategies, preserved ordering/abort, no escaping publication |
| Modify/add proportionately | autobyteus-server-ts/tests/e2e/file-explorer + tests/unit/api/rest/workspaces.test.ts | GraphQL search → real protected content path, MIME/bytes, unchanged denial paths using real resolver rather than only mock |
| Add/extend | autobyteus-web/tests/e2e browser probe | Real product search→click→PDF canvases using test-owned backend/build and valid fixture, not mocked path transformation |
| Modify | server docs/modules/file_explorer.md and web docs/file_explorer.md search contract sections | Correct public relative identity and explain internal candidate format; no global TESTING/RELEASE edits for task-specific details |
Validation specialist owns final executable coverage location; Implementation owns source and implementation checks. No production web files need modification on current evidence.

## Applied Patterns / Folder Boundary Check
Existing facade, snapshot controller and strategy patterns remain. No new module depth. Transport/domain/tests stay separate in current folders; no shared miscellaneous utility folder or over-split one-function subsystem.

## Concrete Examples / Shape Guidance
Input candidate `/test/root/job-applications/resume.pdf` at workspace `/test/root` → public locator `job-applications/resume.pdf` → content URL `.../content?path=job-applications%2Fresume.pdf` → reader resolves original candidate.
Outside candidate `/test/root-other/resume.pdf` relative to `/test/root` → `../root-other/resume.pdf` → existing path owner rejects; never publish a basename-only substitute or enable absolute-reader fallback.

## Backward-Compatibility Rejection Log (Mandatory)
- Allow absolute in-root reads: Rejected; expands existing reader contract and spreads path formats.
- Try absolute then relative request/PDF-only workaround: Rejected; duplicate identity logic and extra requests, would miss text/media/lazy tree semantics.
- Format flag/legacy absolute search endpoint: Rejected; one clean-cut corrected search identity sufficient; internal candidate format is not public compatibility.
- Frontend-only mapping: Rejected for this solution; would require rebuilt client distribution and root mapping at caller despite existing central public owner. Useful Event Monitor mapper has separate prose semantics, not needed here.

## Derived Layering
N/A — existing architecture sufficient; no invented layer.

## Change / Refactor Sequence
1. Replace public pass-through in existing method; internal strategies stay unchanged; validate derived locator with existing path owner.
2. Update old public-contract assertion and add focused regression/self-check on real reader interoperation and search lifecycle.
3. Independent source review as rules dictate, then API/E2E test-owned changed build/real UI proof and safety denial checks. Do not reuse /app baseline as post-change proof.
4. Delivery syncs area documentation, integrates per RELEASE.md, obtains explicit user verification and safe rollout authority. Coordinate host Docker/image pin or a scoped approved deployment candidate, record rollback and active conversation risk; no unapproved process61 restart.
5. User closes failed tab, refreshes/re-enters search, opens result on8001; delivery records actual user outcome and preserves original checksum. Final report distinguishes any host/user-only remaining check. Stop/remove only task-owned instances/worktree/branches according to finalization; record cleanup.

## Key Tradeoffs / Risks
One bounded server conversion is simpler than rebuilding each client/viewer and keeps reader guarantees. Changing documented public result semantics is intentional, independently reviewed, no known production in-repo absolute consumer besides frontend. Windows native separator policy mirrors current tree; no cross-platform redesign requested. PDF bytes/render may reveal an independent issue; route finding rather than claiming metadata proves render. Runtime /app image remains baseline until actual delivery. No Docker CLI/socket here, so host rollout may be blocked; Delivery must ask user if disruption/prerequisites need it.

## Guidance For Implementation / Verification Intent
Follow DESIGN/TESTING and package AGENTS. Do not modify original résumé or production registry/database, /app files, user CLI configs or live server in implementation. Install/build in worktree with clean test environment, current Prisma/shared outputs and serial build/dev processes. Test smallest directly proving method/reader first, then cross-boundary GraphQL→REST and browser render. Preserve original search abort behavior/ranking/watchers. Retain baseline-failure truth and cleanup logs. Explicit user verification is delivery's gate, not implied by automation. No source-only port8001 success claim.
