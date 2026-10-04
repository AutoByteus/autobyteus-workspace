# Design Spec — Public GitHub Skill Sources

## Solution And Approval Basis
- Package: `github-skill-sources`; current solution revision: **SR-008**.
- Approved requirements: `requirements-doc.md`, approval captured in SR-006, **USER-APPROVAL-006**: user “Yes, let's go.” after the proposed complete scope and SR-002–005 clarifications. Exact approved pre-status-update content: `approved-requirements-sr006.md`, SHA256 `65035d7ba2b63e33eef2e8c8bbd72066cfb0f4148eb129fc798aec004d4dccb8`.
- Design status: **Ready** for independent architecture re-review; SR-008 addresses ARCH-REV-001 / AR-001. Requirements unchanged; no implementation performed.
- All artifact paths in this document are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`; ticket artifacts live in `tickets/in-progress/github-skill-sources/`. Canonical evidence is that folder's `investigation-notes.md`.
- Behavior-defining supplements: none. User screenshot is illustrative existing UI only; Product Design assistance not requested.
- Requirements changes need renewed user approval; technical review cannot redefine the preserved precedence policy.

## Current-State Read
SkillService owns synchronous catalog discovery, CRUD, one-name validation and local-source settings. Manage Skill Sources calls path-only GraphQL operations. Local sources are not copied. The catalog already orders default skills, bundled agent-package skills, user-added directories, then registered runtime-default directories; runtime defaults supply missing names only. Existing Codex startup separately checks actual native-discovered paths against the catalog winner (E-006, SR-003).

Agent packages demonstrate public GitHub metadata/revision checks and archive installation, but their installer validates agent definitions and replaces directories before catalog validation (A-002). Reusing that entire owner for standalone skills would register wrong subjects and couple distinct lifecycles. Skill workspaces cache paths by name (A-006). Separately, the process-wide runtime WorkspaceSkillMaterializer retains a sourceRootPath and occurrence holders per workspace link. AR-001/A-012 prove that generation-root publication must transition that second consumer for a later same-workspace run; transient file-view invalidation alone cannot do so.

## Task Size And Architectural Risk
- **task_size: Large**: new GitHub source lifecycle, persistence and discovery variant, shared metadata transport extraction, GraphQL/store/modal changes, transient workspace freshness, managed-generation transfer in the existing runtime link owner and executable integration coverage. Roughly 20–25 production files plus tests/localization/docs across existing skills, network integration, API and workspace boundaries.
- **architectural_risk: High**: material new persisted source authority/commit boundary, public API fields and mutations, untrusted archive extraction and source mutation serialization, plus live runtime-link holder identity transfer for future runs. Risk is not inferred from document or skill-content volume.
- Payload inventory: SKILL.md/supporting repository files and test archives. Structural delta: registry readers/writers, managed root selection, lifecycle service, API, remote transport/extraction, source UI and workspace rebind.
- Escalation triggers: need to change local settings meaning, duplicate precedence, run materialization semantics, repository layouts/private auth, multi-process shared-data support, or agent-package update behavior. Return findings to Solution Designer; do not broaden silently.

## Architecture Investigation Evidence
| Evidence | Design decision | Residual verification |
| --- | --- | --- |
| A-001/A-004 | Keep synchronous catalog/name lookup, existing config/disabled-state formats; separate source lifecycle from catalog owner | Regression of every catalog consumer |
| A-002 | Extract reusable GitHub metadata client; do not reuse agent-package installer/validator | Agent-package transport tests unchanged |
| A-003/A-007–009 | New source registry with atomic publication; no migration or startup history gate | Failure/restart/publication tests |
| A-005 | One expanded source row contract and fragment across all fetch/mutation/reload paths | Component/store/GraphQL validation |
| A-006 | Reconcile cached skill workspaces against current catalog root | Open → update → reopen regression |
| A-012–014 / ARCH-REV-001 MP-001 | Preserve holder lifetime while permitting verified same-managed-source generation transfer on future-run acquisition | Same-workspace new-chat, reverse release order, genuine collision regressions |
| A-010/external source log | Patched direct tar dependency and bounded extraction adapter | Traversal/link/header archive tests; platform execution |

## Intended Change
Add managed GitHub repositories as another explicit skill source, **not** as agent packages. Local add/remove remains user-owned and path-based. The new source owner downloads a candidate repository, validates its discoverable skills and names, then publishes a registry pointer to the complete candidate. Checks only update remote metadata. The catalog sees only published active roots; staging and retired generations are not sources. GitHub imports have the same explicit-source priority as ordinary added folders, above runtime defaults.

## Relevant Behavior And Production-Path Map
| Behavior | Approved intent / AC | Trigger | Current evidence | Target production path / lifecycle |
| --- | --- | --- | --- | --- |
| BEH-001 User | REQ-001/002/004/008; AC-001/002/004/008 | SCN-001/005 Add GitHub URL | E-002, A-001/002 | Modal → store → source GraphQL → SkillSourceService → fetch/inspect/validate → registry publish → catalog, DS-001 |
| BEH-002 System/User | REQ-003; AC-003 | SCN-002 open Sources / Check again | E-003 | Modal → source service → metadata client → latest-check registry update → row status, DS-002 |
| BEH-003 User | REQ-004/005/007; AC-004/005 | SCN-003 confirmed Update | A-002/003/006/012–014 | Source service → candidate generation → current-catalog conflict check → atomic registry switch → catalog/file-workspace refresh; next runtime acquisition transfers same managed identity, DS-003/005/008 |
| BEH-004 User/Contract | REQ-004/006/007; AC-004/006/007 | SCN-001/003/004 and future selections | A-001/004/006, SR-003–005 | Local sources unchanged; managed removal → catalog exclusion/deletion; catalog winner → selected skill/future run binding with runtime-holder reconciliation, DS-004/005/006/008 |

## Relevant Supplemental Task Artifacts
- `approved-requirements-sr006.md`: immutable approval-content receipt (historical Draft label is the pre-approval label; SR-006 and canonical doc record approval).
- User screenshot absolute path recorded in E-001: current UI context, no target pixels prescribed.
- Independent architecture review: `design-review-report.md` and `architecture-review-revision-record.md`, ARCH-REV-001 **Fail / AR-001** against SR-007. Superseded design basis only; not a pass for SR-008. Code review, implementation handoff, API/E2E and delivery artifacts: **N/A — not applicable yet**.

## Task Design Health Assessment
- Posture: Feature with bounded refactor.
- Design issue: Yes, adding download/update/registry concerns directly to SkillService or borrowing AgentPackageService would overload/cross ownership boundaries.
- Root cause classification: Boundary Or Ownership Issue / File Placement Or Responsibility Drift (pressure introduced by this feature, not a claim current local flow is defective).
- Refactor needed now: **Yes**. Move source listing/local configuration orchestration into SkillSourceService; keep SkillService as catalog/content authority. Move GitHub metadata transport and source URL utilities/types out of agent-package domain into a narrow shared GitHub integration. Existing package installer remains package-specific, unchanged behavior.
- Preserve one duplicate validator. Introduce only a source-repository discovery variant and an explicit previous-source exclusion for updates, not a second name policy.
- Deferrals: old agent-package archive extraction/rollback hardening is not expanded here; regression-test shared metadata extraction. No general settings, database or parser redesign. Runtime scope is now the bounded existing materializer/links/binding transition needed by AR-001; unrelated runtime behavior remains unchanged.

## Terminology
- Source ID: stable identity of a managed GitHub source, independent of its changing filesystem root.
- Generation: a complete downloaded repository tree for one install attempt. It may be locally edited after publication; revision means downloaded upstream revision, not a claim that local bytes are pristine.
- Runtime-default folder: existing exact realpath-matched configured default directory, not every folder containing “codex” or “claude”.
- Managed skill identity: `(sourceId, exact skill name)` from the catalog; distinct from a generation root and from a sanitized workspace path. Only this trusted identity authorizes the bounded runtime transfer below.
- Publication: atomic replacement of the managed-source registry; this is the activation boundary, not the completion of download.

## Design Reading Order
Current evidence and approved behavior → data transition and spines → ownership/interfaces → concrete files → sequence and verification. Some adjacent template tables are combined where they describe the same boundary; no mandatory concern is omitted.

## Legacy Removal Policy
No backward-compatibility wrappers or dual authority. Existing local support is current product scope, not legacy. Move source methods rather than keeping pass-through copies on SkillService. Move shared GitHub metadata methods/utilities and update all imports rather than retaining old-location re-exports. Do not write managed source paths into AUTOBYTEUS_SKILLS_PATHS alongside the new registry.

## Persisted Data / State Transition Decision
**Directly Usable — No Migration** for existing local paths and disabled choices. Existing readers already interpret those formats correctly; they are neither renamed nor reinterpreted. **Not Affected** for existing agent-package registry, saved agent names and historical runs. New `skill-sources/github/registry.json` is additive and has no previous shape to transform.

Governing convention: `autobyteus-server-ts/docs/design/data_migration_guideline.md` at base revision, hash recorded A-007. Installed-data probe A-009 establishes five existing local paths, absent disabled list and two unrelated package records; no bulk-data conversion justified. Sources may contain arbitrary file volume; no copying of local sources or history. New repository download bytes are necessary to the user-requested import/update, not migration backups.

### New managed record and on-disk identity
Registry is a JSON array, tolerant projection of recognized fields; writer emits exact fields, **no schema version**. Required shape:

```ts
type GitHubSkillSourceRecord = {
  id: string; // generated UUID, stable across updates
  repository: { owner: string; repo: string }; // validated API-canonical identity
  state: 'ACTIVE' | 'REMOVING';
  installed: { generation: string; revision: string; defaultBranch: string };
  lastCheck: null | { checkedAt: string; latestRevision: string | null;
    defaultBranch: string | null; error: string | null };
  lastUpdateError: string | null;
};
```

Normalized duplicate identity derives from lowercase owner/repo; URL derives from validated identity. No redundant persisted rootPath/installPath/source/normalizedSource quartet. `id` and generation are opaque UUIDs; compute `<appData>/skill-sources/github/<id>/generations/<generation>/repository`. Never trust a client filesystem path for managed mutation/deletion. Staging uses separate `.staging/<attemptId>` under the same application data filesystem. All descendants being deleted must be proven under this owner by lexical + realpath/lstat checks; never follow a symlink substituted for an owned directory.

Registry absence is the ordinary empty state. Malformed content is not an empty writable registry: surface a managed-source error, refuse overwriting it and keep independent local catalog sources usable. Source reads distinguish unavailable managed metadata from no installed sources; add nullable skillSourceRegistryError to the source-query selection alongside skillSources so local rows can still render with an explicit error. Both fields derive from one source-owner snapshot per request. Local commands that commit successfully must return their current local rows even if managed metadata is unavailable, rather than reporting a false failed local mutation. Managed commands refuse publication while registry is unreadable. No global startup gate. Keep original file untouched. Source row errors and logs must not claim availability for a missing installed root. Preserve valid local operation when a GitHub source is unavailable.

### Commit, interruption and removal
- Network/extraction happen asynchronously off-catalog in staging. Move complete candidates into a fresh generation directory before publishing; only registry-named ACTIVE generations are scanned.
- Final current-catalog validation, re-read of registry and atomic registry write are one **synchronous, no-await** critical section in the single server process. The store uses same-directory exclusive temp file + fsync + rename, following A-003's synchronous file convention. That avoids converting all catalog readers/local mutations to async. Small metadata only; no synchronous network or archive extraction.
- Separate source-operation serialization covers check/update/remove per ID and duplicate imports per normalized repository. Re-read whole current registry at commit, changing just target record; do not save a stale pre-download array. Unrelated source commits cannot be lost. A check result must never resurrect removed records or regress a newer generation.
- Existing local creation/addition and agent-package name-check/publication execute synchronously against current catalog. Rechecking immediately before our synchronous commit prevents new GitHub publication from bypassing names introduced during its download. Agent-package update's transient disk state is not redesigned; an in-flight duplicate may safely reject a new skill import, not permit two successful conflicting registrations. Raw external file edits retain existing out-of-band issue behavior.
- Failure before registry rename: previous active generation remains selected. Clean candidate only. Failure writing the registry leaves original unchanged. After rename: new version is committed; cleanup/UI refresh failure is **not** a failed install/rollback. Return updated state with a cleanup/refresh warning rather than inviting an unintended retry that overwrites edits again.
- After commit retire the previous generation. Runtime holder records can still refer to that old root until their next acquisition/release; the managed-identity transfer below works whether the old tree remains or has been deleted, so deleting g1 is not treated as holder invalidation. Best-effort cleanup failures retain unreferenced owned directories, which are never catalog sources; report cleanup warning and retry bounded cleanup on a subsequent source operation. Do not add a history UI or backup journal. Interrupted pre-publication work leaves inert candidate directories; next source operation can clean unreferenced attempts under its own serialization.
- Removal persists `REMOVING` first (excluded from catalog), then closes affected transient skill workspaces and deletes owned source generations; finally removes record. On interruption/deletion failure retain REMOVING row with actionable “Removal incomplete — Retry removal”; do not claim deletion success or permit update/reimport until removal completes. Retry reuses existing record ownership. This minimal domain state represents the user-authorized multi-step removal, not a migration journal. No files outside that managed source are removed.
- Update/delete does not clear disabled_skills names or rewrite agent definitions. Successful explicit replace/remove may discard local edits, as approved. No supported concurrent old/new server writers sharing one data directory; do not add distributed locks to claim that unsupported scenario.

### Migration guideline checklist
1 Need: none, unchanged meanings plus new subject. 2 Availability: no new startup gate, unrelated local skill access remains. 3 Sources: A-004/A-008/A-009; predecessor run metadata is unrelated. 4 Dispositions: existing data untouched, only explicitly confirmed managed generations replaced/removed. 5 Commit/retry: atomic registry and generation presence suffice, REMOVING handles actual delete lifecycle. 6 Current-only: no historical decoders. 7 Cost: small source registry, no historical trace passes. 8 References: skill names stable; physical root changes require transient workspace freshness and DS-008 runtime-holder transfer. 9 Evidence: tests below; not run in design phase. 10 Lessons/review: preserve scoped admission and avoid redundant journals; High risk requires independent review via routing rules. Historical migrations remain unchanged.

## Data-Flow Spine Inventory
| Spine | Scope | Behavior | Start → end | Governing owner / reason |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/004 | URL submission → installed catalog skills | SkillSourceService controls import and publication |
| DS-002 | Primary End-to-End | BEH-002 | Sources mount/recheck → per-source remote status | SkillSourceService serializes metadata updates without content mutation |
| DS-003 | Primary End-to-End | BEH-003/004 | Confirmed Update → new catalog generation | SkillSourceService owns replacement, failure retention and cleanup |
| DS-004 | Primary End-to-End | BEH-004 | Confirmed Remove → no registration/managed copy | SkillSourceService owns removal; local mode only unlinks |
| DS-005 | Return-Event | BEH-001/003/004 | Mutation result → refreshed UI/workspace | Store refreshes catalog and issue views; workspace owner invalidates old roots |
| DS-006 | Primary End-to-End | BEH-004 | Skill browsing/future agent start → selected canonical skill and workspace exposure | SkillService selects winner; WorkspaceSkillMaterializer owns managed-generation link/holder reconciliation |
| DS-008 | Bounded Local | BEH-003/004 | Later run requests g2 while prior holder owns g1 → same source link targets g2 | WorkspaceSkillMaterializer retains leases and enforces exact managed identity/current-catalog authorization |
| DS-007 | Bounded Local | BEH-001/003 | Prepared candidate → validate/publish/retire | Source owner, single commit boundary |

## Primary Execution Spines
- DS-001: `SkillSourcesModal → skillSourcesStore → source GraphQL → SkillSourceService → GitHubRepositoryClient + managed repository preparation → SkillService inspect/name validation → registry publication → catalog rows`.
- DS-002: `Sources onMounted/Check again → store → GraphQL → source owner → GitHub metadata → lastCheck commit → source row`.
- DS-003: `Update confirmation → store → GraphQL → source owner → complete candidate → validate against current catalog excluding previous source → atomic active-generation switch → catalog/workspace refresh`.
- DS-004: `Remove confirmation → store → source GraphQL → source owner → REMOVING/owned cleanup/record removal → refreshed catalog` (local branch instead updates local settings, never deletes folder).
- DS-006: `Skills page or future agent selection/start → existing skill APIs/SkillService → catalog sources including active GitHub roots → one-name winner → file explorer or configured skill binding → runtime materializer managed-identity reconciliation (DS-008) → current workspace link and run configuration`.

## Spine Narratives
DS-001/003 share repository preparation, but import establishes source identity while update replaces only a registered source's generation. An update re-fetches latest revision after click; if unchanged, it updates metadata and returns without redownloading/erasing local edits. New bytes never become a source before validation and registry publication. DS-002 stores observation only; no downloader is called. DS-004 explicitly distinguishes ownership, and REMOVING makes deletion restartable without selecting half-deleted skills. DS-005 replaces UI snapshots even when a conflict resolves into existing dialog handling. DS-006 feeds every reader from the same catalog priority rule. For runtime acquisition it also carries trusted managed-source provenance and invokes DS-008 when a prior same-workspace run holds an earlier generation of that same skill. No provider-specific override list or stop-runs-first restriction is introduced. DS-007 is the bounded critical section, not a separate orchestrator.

## Spine Actors / Main-Line Nodes And Ownership Map
| Node | Owns | Must not own |
| --- | --- | --- |
| Modal | Input modes, confirmations, states and actions | Network/filesystem or name-precedence policy |
| skillSourcesStore | GraphQL actions and source snapshot; per-row in-flight state | Registry or local paths as GitHub IDs |
| source GraphQL fields | Transport mapping and existing structured conflict mapping | Download, discovery or persistence orchestration |
| SkillSourceService | Source lifecycle, ownership, sequencing, source identity, commit decisions | Skill content CRUD or a second duplicate policy |
| SkillService/catalog | Discovery/name validation, selection, enable state, skill content | GitHub HTTP/source mutation lifecycle |
| GitHubRepositoryClient | Public metadata and revision transport | Skill/package validation or registration |
| GitHubSkillRepository installer | Safe repository preparation and owned generation deletion | Catalog precedence or registry activation |
| GitHubSkillSourceStore | Validated source records, synchronous atomic metadata IO and read-only active-root projection | Network/UI/domain workflow |
| WorkspaceManager | Transient workspace lifetime and root freshness | Rewriting source registry or active agent runs |
| WorkspaceSkillMaterializer | Runtime workspace-link ownership, phases, occurrence leases and authorized generation transfer | Publishing sources, deleting source trees, changing collision policy or rewriting active runtime contexts |
| WorkspaceSkillLinks | Verified link inspection/create/replace/remove under exclusive owner phase | Deciding catalog precedence or which identity may transfer |

## Thin Entry Facades / Public Wrappers
GraphQL remains thin over the subject owner. Source operations use SkillSourceService; skill operations use SkillService. Reload aggregates two distinct authoritative read subjects at the resolver: catalog skills and source rows. No wrapper retained in SkillService forwarding to source service.

## Removal / Decommission Plan
| Remove/move | Replacement | Scope |
| --- | --- | --- |
| SkillService.getSkillSources/addSkillSource/removeSkillSource plus source-count orchestration | SkillSourceService (preserve local behavior) | In this change |
| SkillService.reloadSkillCatalog source-list coupling | Catalog reload yields skills; GraphQL joins source-owner list retaining existing response field names | In this change |
| Agent installer duplicated HTTP metadata methods and agent-domain URL utility/types | integrations/github transport/types and updated direct imports | In this change, unchanged agent semantics |
| Repeated GraphQL source selection sets and path-only frontend source interface | One source fragment + typed new fields | In this change |
| Unconditional root-mismatch rejection for the same catalog-managed source/name across generations | WorkspaceSkillMaterializer DS-008 authorization gate; generic collisions remain | In this change |
| Unconditional reuse of stale cached skill workspace root | WorkspaceManager skill-specific root validation/rebind | In this change |
| General old agent installer replacement/extraction implementation | None; not replaced here | N/A, explicit non-goal |

## Return Or Event Spine
DS-005: `source result → replace source rows → reload skill catalog/current selection → refresh name issues/notice wrapper → clear affected explorer caches/reconnect on next open`. No push/subscription protocol added. Use existing client refresh paths and ordinary queries. If a selected skill disappears, currentSkill becomes null as existing Reload does. Metadata-only check does not force a skill workspace reset.

## Bounded Local / Internal Spine
DS-007 parent SkillSourceService: `serialized source operation → prepare candidate off-catalog → synchronous re-read/inspect/conflict validate/write registry → committed → invalidate affected skill workspaces → cleanup retired tree → return current snapshot`. Keep synchronous publish encapsulated; transient UI activity is not a persisted state machine. REMOVING is persisted only for confirmed file removal.

## Off-Spine Concerns Around The Spine
| Concern | Serves / spines | Responsibility / placement reason |
| --- | --- | --- |
| Registry store | Source owner DS-001–004/007 | Small source metadata IO; no settings duplication |
| Skill repository discovery | SkillService DS-001/003/006 | Root-vs-collection detection, skipped-candidate diagnostics; one loader contract |
| Name validator | SkillService DS-001/003 | Existing unique realpath + name rules, explicit previous source exclusion |
| GitHub URL parser/client | Source owner/installer DS-001–003 | Public identity and HTTP translation; domain-neutral |
| Archive extractor | Installer DS-001/003 | Reject unsafe entries before writes; isolated staging |
| Error/status mapper | Source owner/API | Derived update availability; no duplicate persisted booleans |
| UI conflict/toast/localization | Frontend DS-005 | Existing shared presentation, not domain decisions |

## Ownership Boundaries / Boundary Encapsulation Map
| Boundary | Internals | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| SkillSourceService | Source store, serialization, installer, local setting updates | GraphQL source operations | Resolver directly editing registry or invoking installer |
| SkillService catalog/content | Loader/scanners/name validator/disabled store | Source owner inspection, skill resolver, workspace/runtime readers | Source owner doing its own name map or frontend precedence filtering |
| GitHubSkillSourceStore read projection | Current registry record interpretation | SkillService catalog-source provider (read-only), source owner (writer) | Catalog writer or arbitrary filesystem enumeration treated as registrations |
| WorkspaceManager | Active workspace map/close/rebind | Existing file surfaces and source lifecycle invalidation | Source service mutating active workspace map |
| WorkspaceSkillMaterializer | Registry phases/holders and link adapter | Runtime bootstrap/cleanup | Source service editing runtime registries, dropping live holders or unlinking runtime workspace paths |

Read-only registry projection is an explicit catalog dependency, not access to a lifecycle service's hidden mutation API. Registry store has no dependency on either service, avoiding cycles. Inject dependencies in tests using existing options patterns.

## Dependency Rules
UI → store → GraphQL → subject service. Source owner → catalog inspection + source repository/store + local settings. Catalog → read-only installed-source projection/scanners/disabled state. Shared GitHub transport → fetch/URL only; never skills/agent packages. Package installer → shared transport, not SkillSourceService. Managed roots never enter agent/package/application root settings. Retain the application-owned agent bundle exception. Codex/Claude bootstrap and shared profile wiring change only to supply trusted managed resolution and consume effective preparation results (DS-008).

## Interface Boundary Mapping And Check
| Interface | Subject / identity | Result / semantics | Singular / explicit / selector risk |
| --- | --- | --- | --- |
| skillSources + skillSourceRegistryError | One source-list snapshot | Default/local/GitHub rows plus explicit unavailable-registry diagnostic | Yes / Yes / Low |
| addSkillSource(path), removeSkillSource(path) | Local directory path only | Existing local-source operations; reject URLs/managed roots here | Yes / Yes / Low |
| importGitHubSkillSource(repositoryUrl) | Public repository-root URL | Source operation result | Yes / Yes / Low |
| checkGitHubSkillSourceUpdates(sourceIds?) | Managed UUID IDs, omitted means all | Current rows; failures per source without blocking others | Yes / Yes / Low |
| updateGitHubSkillSource(sourceId) | One managed UUID | Current rows + warnings; refetch latest, not stale client SHA | Yes / Yes / Low |
| removeGitHubSkillSource(sourceId) | One managed UUID, ACTIVE or REMOVING | Confirmed lifecycle/remove result; retry supported | Yes / Yes / Low |
| SkillService.inspectSkillSource(path, layout, excludedSourcePath?) | Validated server path/layout | Records, skipped diagnostics, counts, existing name conflicts/notices | Yes / Yes / Low; exclusion supplied only by source owner |
| SkillService.resolveManagedSkillForMaterialization(sourceId, name) | Exact current catalog-managed identity | Current selected Skill/provenance, or unavailable/identity-mismatch; no raw registry access from runtime | Yes / Yes / Low |
| GitHubSkillSourceStore.listActiveSources() | App data context | Read-only active roots with github_repository layout, tier 3 | Yes / Yes / Low |

New mutations use `withSkillNameConflictMapping` where appropriate. Existing local mutations retain path arguments and array results; these are not legacy wrappers, they remain the supported local-subject API. New GitHub operations return `{ sources, warnings }`; source records are reread after committed actions. Conflict exceptions remain structured GraphQL errors, not generic successful warnings.

### Source DTO
Common `path`, `skillCount`, `isDefault` remain; add stable `sourceId`, `sourceKind` (`DEFAULT|LOCAL_PATH|GITHUB_REPOSITORY`), nullable `github` object. Local IDs derive from canonical path without persisting a second local registry. GitHub object includes repositoryUrl, installed/default branch/revisions/check time, derived status/error and removal state. Derived actions: check for ACTIVE GitHub; Update for UPDATE_AVAILABLE or retryable UPDATE_FAILED; Remove for custom/local and Retry removal for REMOVING. Local rows never get remote actions. CHECKING/UPDATING are client in-flight flags. Do not persist canUpdate/status and underlying revision comparisons in parallel.

### Discovery/name boundary
Add `github_repository` layout only. If repository-root SKILL.md exists, load that single skill; an invalid root manifest rejects the root-skill repository rather than interpreting support subfolders as independent skills. Otherwise retain collection traversal of immediate child folders and conventional nested skills/ chains, returning diagnostics for malformed candidates. No arbitrary recursion into unrelated agent/team/application folders. Supporting files remain at relative repository paths. Collect all valid candidates before deduplication; use the existing realpath/name validator so duplicate valid names within the repository abort. Add optional `excludedSourcePath` to incoming validation; exclude precisely the prior registered GitHub source, **not all copies with its skill names**. Runtime defaults are still notices. GitHub-to-GitHub/local/package conflicts abort whole operation.

### Repository input/transport/extraction
- Skill boundary accepts HTTPS github.com or www.github.com, exactly owner/repo after optional `.git`/trailing slash; reject credentials, nondefault ports, query/fragment, tree/blob suffixes, empty/dot/traversal/encoded-separator segments. Do not silently reinterpret unsupported subfolder URLs. Existing agent-package input behavior is not changed by shared utility movement.
- Client resolves public repository metadata then default-branch commit. Validate returned identity segments/revision before building network URLs. Request only fixed GitHub API/archive hosts, no arbitrary user download URL or tokens/credential-store access. 404/private/403/rate-limit/timeout errors become user-actionable failures. Checks don't download archives. Archive requests are pinned to fetched revision; legitimate redirects stay HTTPS on validated GitHub API/codeload hosts, never local/private hosts.
- Use a direct patched `tar` 7.5.22 dependency (A-010), strict parsing and preservePaths=false. Do not execute shell/tar commands or downloaded scripts in the new skill path. Agent extraction remains outside this change.
- Validate raw effective entry paths before extraction into a fresh private staging directory: reject absolute/drive/UNC paths, NUL, `..`, platform separator escapes, special/device entries and conflicting duplicate normalized destinations. Interpret PAX/long-path headers with the **same library** for validation and extraction; no shell text-list preflight. Archive must have one repository wrapper directory.
- Validate links before allowing them: target and full chain must resolve inside extracted repository, no cycles or links through another unvalidated link. Extract regular files/directories first without following links; defer safe internal link creation until targets validate. Reject escaping/broken/cyclic link entries rather than resolving host files. This permits safe repository-relative supporting links without widening scope to arbitrary host symlinks. Raw symlink roots/ancestors in staging are not trusted.
- Preserve executable permission bits for supporting scripts but never execute them; discard privileged ownership/mode bits. New inputs/archives remain untrusted despite GitHub hosting. Use timeout/stream cancellation and owned temporary cleanup; do not invent file-content malware checks.


## DS-008 — Runtime Consumer Transition (AR-001 Correction)

### Supported premise and approval boundary
ARCH-REV-001 MP-001 is accepted. Header ＋ presets the existing workspace and agent without closing the previous server run. That old run still holds g1 in the process-wide materializer. A new run after successful source Update must consume g2 without sourceCollisionError. This is SCN-003 followed by the existing UC-004 future-run path, not a new live-refresh promise. Requirements remain Approved SR-006; no new scenario authority or user-facing stop/restart/update restriction is introduced.

The new run may change a shared **AutoByteus-owned workspace symlink** to the current generation. That does not update old run prompts/context/configuredSkills, send a model refresh event, or promise old-generation snapshot isolation. Existing links already expose mutable source files (A-014). Active runs reading that shared path later may observe current bytes; behavior of already-materialized active-run context remains explicitly outside the update guarantee.

### Provenance and current-selection authority
Add internal `managedSource: { sourceId: string; generation: string } | null` to Skill, with null as the normal value for non-managed skills. Catalog assigns it from the registered ACTIVE source projection; never read it from SKILL.md, derive it by path-prefix guess, or accept it from frontend input. Source ID plus exact unsanitized skill name is logical identity; generation/root is its physical selection. Local/default/package skills have null provenance and retain existing physical-root collision behavior.

SkillService exposes `resolveManagedSkillForMaterialization(sourceId, name)` using the current **winning catalog record**, returning its Skill/provenance only when it is still that ACTIVE managed source/name. This is not a second name resolver or fallback. Missing/REMOVING sources and changed catalog winner do not authorize a transfer. Runtime profile composition injects this public resolver into the shared materializer. The materializer never reads the source registry directly or calls a source mutation service. Unit tests can inject the resolver.

For a managed request, refresh its effective Skill through this boundary before filesystem preparation and again after any awaited phase before final publication. A stale g1 request cannot move an owned g2 link backwards. If the effective root changes after Codex native discovery, treat the refreshed request as `expose-resolved` (do not rely on stale `reconcile-discoverable` evidence). Change the return type cleanly to `WorkspaceSkillMaterializationResult = { materializedSkills: MaterializedWorkspaceSkill[]; effectiveRequests: WorkspaceSkillReconciliationRequest[] }`, preserving one effective request per input occurrence. Resolved requests carry the refreshed Skill; newly unavailable managed requests use reconcile-unresolved. Return both effective preparation requests and occurrence lease descriptors from the materialization operation; update all production call sites/tests cleanly so Claude's configuredSkills/context and other consumers do not retain the superseded request root when preparation refreshed it. Claude derives configuredSkills from resolved effectiveRequests; Codex stores materializedSkills for cleanup. No source provenance is serialized into run metadata or accepted through GraphQL input. Unmanaged requests preserve their existing results/selection. No legacy return-shape adapter.

### Registry state and allowed transitions
The materializer registry remains keyed by materialized workspace path. Each entry also records exact skill name, nullable managed source ID and current generation along with its existing physical root and holder set. Add one bounded `transferring` phase, not another registry or global coordinator.

| Observed entry / request | Action |
| --- | --- |
| No entry | Normal acquire/reconcile; attach trusted managed identity if present; all existing user-owned path rules apply |
| Ready, same effective physical source and identity | Existing holder join; never claim an unrelated sanitized-name alias |
| Ready, different physical root, same verified managed source ID AND exact name | Serialize DS-008 transfer; validate current catalog generation and actual owned link before replacing |
| Ready, different source ID, unmanaged source change, or different exact name sharing sanitized path | Existing source collision; do not treat same name or directory prefix as authorization |
| Acquiring/transferring with same managed identity | Wait for that phase, then re-resolve current catalog and retry; do not join readiness for an obsolete root |
| Releasing | Wait for existing cleanup, then reclassify and acquire normally |
| User-owned file/directory/live different link replaces the owned link | Do not unlink/overwrite it. Preserve configured `fail` vs ALL_INSTALLED `prefer_workspace` policy; different logical-source registry collisions remain hard errors |

Retain holders from earlier generations in the current logical entry. Allocate a new occurrence holder only on successful transfer/join (or keep a private pending holder that cannot escape failure cleanup). Existing descriptors remain valid release tokens keyed by registryKey + holderId; their old sourceRootPath is historical acquisition metadata, not cleanup authority. Last-holder cleanup uses the **entry's current root**. Never bulk-release A or reset the set to B. Old run cleanup before/after B cleanup, repeated release, failed multi-skill bootstrap rollback and release during a transition must preserve that accounting.

### Link replacement and failure mechanics
WorkspaceSkillMaterializer decides authorization; WorkspaceSkillLinks performs exact link operations under the transferring phase. Inspect the link at the workspace destination against the old registered root; whether its target still exists is irrelevant to ownership proof. Accept only a symlink still targeting that exact old root (canonical comparison where available), a missing path, or an already-current same-source link. For an old link record its raw target and filesystem identity; recheck immediately before mutation. Never recursively delete workspace paths, follow the old link to modify a source tree, or overwrite a non-symlink/live unrelated link. With no registry ownership, the existing live-different-link collision rule stays unchanged.

Prepare the new source/link first, validate SKILL.md presence, then revalidate current catalog selection and destination ownership. Use a narrow synchronous final section (current resolver + final lstat/readlink + replace + registry phase completion), with no awaited gap, to prevent same-process publication/release from changing authorization between validation and transfer. Prefer same-directory temporary symlink rename where supported; where replacing a directory symlink is not supported, perform guarded unlink of the proven old link then create the new link in that same exclusive synchronous section. Never use recursive rm or an unconditional force-replace fallback. Add injectable sync link primitives to the link adapter for deterministic tests. Filesystem permission/platform errors are failures, not reasons to weaken ownership.

On failure before mutation, retain previous entry/holders unchanged. If guarded unlink succeeded but creation fails, keep old holder accounting and restore only the old link into an absent path when safe; otherwise retain the owned-entry retry state with truthful error, never overwrite an intervening user entry. The candidate run receives failure and no leaked holder; the next acquisition can reconcile the missing/owned link. Prior source trees and the committed source registry are not rolled back by runtime preparation. No cross-resource rollback of a successful source Update.

Release during asynchronous preparation removes that holder from the carried set but cannot launch competing cleanup in the transferring phase. Once transfer settles, if no holders and no successful pending acquisition remain, route through existing last-holder cleanup using the current root; if holders remain, restore READY. Waiting callers are always settled on success/failure and retry against current state; do not leave an acquiring/transferring promise unresolved. Final registry publication and new holder creation are synchronous after link success, so cleanup cannot delete B's link based on A's old descriptor.

### Publication/reference consumer disposition
Source Update does **not** enumerate runs, reach into materializer maps or retarget every old run eagerly. It publishes g2 as already designed, retires g1, invalidates transient file workspaces, and returns. Next runtime acquisition invokes DS-008 lazily. Retiring g1 does not clear holder records and is not used as a fix for AR-001. The transition succeeds with g1 live or gone. Existing source removal, different-source replacement, registry-less live workspace links and user-owned entries retain their prior collision rules; this correction authorizes only registered same-source managed-generation advancement, not arbitrary source takeovers.

### Concrete future-run path
`Run A g1/h1 → user Sources Update commits g2 → header ＋ creates same-workspace draft → Send/bootstrap obtains catalog g2 + sourceId → existing materializer sees g1/h1 → DS-008 verifies same source/name/current g2 → owned link targets g2, holders h1+h2 → B starts → A cleanup releases h1 only → B cleanup releases h2 and removes current owned link`.

This extends DS-003's consumer-disposition contract and DS-006's actual endpoint. Transient skill_ws invalidation remains necessary but separate. Physical generation pointers and no-migration decision are retained; the missing invariant is runtime logical identity across physical generations, not a persisted schema conversion.

## Main Domain Subject Naming Check
SkillSourceService, GitHubSkillSourceRecord, GitHubSkillRepository and GitHubRepositoryClient name sources, installed repositories and transport explicitly. “Agent package” must not appear in the new skill validation errors. No generic PackageManager or competing SkillImportManager. Naming drift risk Low after the focused extraction.

## Existing Capability / Subsystem Reuse Check
| Need | Existing capability | Decision / reason |
| --- | --- | --- |
| Duplicate checks/precedence | SkillService + skill-catalog.ts | Extend previous-source exclusion only; policy unchanged |
| SKILL.md validity | SkillLoader | Reuse; no general YAML compatibility work |
| GitHub metadata | Agent installer embedded fetch methods | Extract shared domain-neutral client; avoid copy/paste or skills→agent installer dependency |
| Local config persistence | ServerSettingsService | Reuse unchanged AUTOBYTEUS_SKILLS_PATHS |
| Atomic metadata | Persistence writers and environment atomic pattern | Add narrow synchronous JSON primitive in persistence/file (existing async API does not satisfy sync publication) |
| Skill workspaces | WorkspaceManager/SkillWorkspace | Extend invalidation/freshness, no parallel file browser |
| Runtime workspace links | WorkspaceSkillMaterializer/WorkspaceSkillLinks | Extend exact managed-generation transition in existing owner; preserve all generic collisions and occurrence release semantics |
| Errors/notifications | withSkillNameConflictMapping, skillNamesStore, ConfirmationModal | Reuse |

## Subsystem / Capability-Area Allocation
Skills owns catalog and new source lifecycle as separate subject services. `integrations/github` owns source identity/network transport reused by agent installer; `persistence/file` owns atomic JSON primitive only. GraphQL owns schema mapping; workspace owns file-view lifetime; web skills store/components own presentation. Runtime backend shared capability owns DS-008; runtime-specific bootstrap supplies catalog resolution and consumes prepared skills. No new architectural framework, scheduler or database.

## Draft File Responsibility Mapping → Reusable Owned Structures Check
Initial tempting design would add all source fields/mutations to SkillService and copy agent installer. Rejected: mixed source/catalog responsibility and duplicate metadata/name rules. Final extraction: source-record/DTO types under skills/domain; source registry under skills/stores; GitHub transport types/utilities under integrations/github; archive preparation under skills/installers; catalog scanner remains under skills/services. Types must be referenced, not redefined as mostly-optional giant package objects. Only GraphQL/UI transport representations are separately mapped.

## Shared Structure / Data Model Tightness Check
- Repository identity has owner/repo once; normalized key and URL are derived, not separately mutable authoritative fields.
- Installed generation/revision is distinct from latest observation; errors never erase installed identity.
- Local and default rows have no fake GitHub revision fields; github subobject is null.
- REMOVING cannot be an active catalog source. No version-number schema switches.
- Runtime-default precedence remains derived from configured canonical folder identity, never persisted as a mutable priority label.

## Final File Responsibility / Target Folder Mapping
Paths below are exact proposed locations; all server entries are under `autobyteus-server-ts/src/` unless stated.
| Change / path | Owner / depth | Concrete concern / must not contain |
| --- | --- | --- |
| Add skills/services/skill-source-service.ts | Source lifecycle, main-line | Source list/local add/remove/GitHub commands, per-source serialization and publish; no own skill-name algorithm |
| Add skills/domain/skill-source.ts | Skill subject contract | Managed record, discriminated row and operation result; no transport calls |
| Modify skills/domain/models.ts | Skill content contract | Remove moved SkillSourceInfo definition; add optional internal managedSource provenance to Skill, set by catalog not manifest or GraphQL input |
| Add skills/stores/github-skill-source-store.ts | Persistence provider | Tolerant projection, sync atomic commits, derived active roots; no HTTP/catalog orchestration |
| Add skills/installers/github-skill-repository.ts | Managed filesystem adapter | Prepare/own generations, strict archive adapter/link handling, bounded cleanup; no registry activation |
| Modify skills/services/skill-discovery.ts | Catalog off-spine | Repository layout scan + diagnostics; preserve existing local scanner semantics |
| Modify skills/services/skill-catalog.ts | Catalog policy | Add managed read-projection sources tier 3 after ordinary local tier 3 and before tier 4; no priority policy changes |
| Modify skills/services/skill-service.ts | Catalog/content main-line | Remove source config orchestration, expose source inspection/exclusion/current managed materialization resolution; no runtime-registry access |
| Add persistence/file/atomic-json-sync.ts | Persistence primitive | Exclusive temp/fsync/rename for small sync metadata; no feature recovery state |
| Move agent-packages/utils/github-repository-source.ts → integrations/github/github-repository-source.ts | Shared integration | Existing normalization/builders with direct imports updated; strict skill-root validation separately explicit |
| Add integrations/github/types.ts and github-repository-client.ts | Shared integration | Move neutral metadata/source types and HTTP code; no domain package validation |
| Modify agent-packages/types.ts, installers/github-agent-package-installer.ts and all utility/type imports/tests | Existing package owner | Use extracted transport without local/GitHub package behavior changes; no old-path re-export |
| Modify api/graphql/types/skills.ts | Transport | Source DTO/new mutations via owner; reload aggregates catalog/source boundaries |
| Modify agent-execution/backends/shared/workspace-skill-materializer.ts | Runtime link lifecycle | Typed managed identity and transferring phase, holder preservation, current-resolution guard and effective preparation results (DS-008); no generic collision relaxation |
| Modify agent-execution/backends/shared/workspace-skill-links.ts | Runtime filesystem adapter | Compare-and-replace only an owner-proven old symlink; never recursive removal or user-owned target overwrite |
| Modify agent-execution/backends/{codex,claude,grok}/*-workspace-skill-materializer.ts and active bootstrap call sites | Runtime composition | Inject public catalog resolver into existing profile singleton; consume effective prepared skills/leases, retain Codex native-path checks; no new runtime owner |
| Modify workspaces/workspace-manager.ts | Workspace lifetime | Invalidate skill workspaces for changed roots/names; getOrCreate checks skill root before cached return; do not affect filesystem/run workspace removal |
| Modify autobyteus-web/graphql/skillSources.ts | Transport client | One row fragment; source-query registry diagnostic, new typed source mutations; reload uses same fields |
| Modify autobyteus-web/stores/skillSourcesStore.ts | Frontend source state | Source operation/row state, warnings/errors and GraphQL calls |
| Modify autobyteus-web/stores/skillStore.ts | Frontend catalog state | Common refresh clears stale selection, updates roots, coordinate transient explorer invalidation |
| Modify autobyteus-web/components/skills/SkillSourcesModal.vue | UI | Local/GitHub input, source-aware actions/states/confirmations |
| Modify autobyteus-web/components/skills/SkillWorkspaceLoader.vue as needed | UI lifetime | Re-register on selected root change as well as name; clear explorer snapshots via existing workspace store |
| Modify autobyteus-web/localization/messages/{en,zh-CN}/skills.ts | Localization | Visible new labels, overwrite/remove/trust/error guidance |
| Modify server package.json + pnpm-lock.yaml | Dependency | Direct reviewed tar dependency; no unrelated upgrades |
| Add/modify focused tests; update web docs/skills.md and server skill module docs | Validation/docs owners | Source lifecycle coverage and user-facing ownership rules |

Folder boundary check: services are main-line/source catalog control, stores persistence, installers filesystem integration, domain structures, API transport. `integrations/github` is justified by two real consumers; no generic “shared helpers” bucket. Atomic JSON primitive is concern-agnostic and belongs to persistence. Compact placement preserves existing skills structure without a module per method.

## Applied Patterns
Repository for source persistence, adapter for GitHub/archive, short source operation serialization, discriminated source row. No global event bus, universal package inheritance hierarchy or background update worker.

## Concrete Examples / Shape Guidance
1. `sourceId=uuid, installed.generation=g2` selects `.../uuid/generations/g2/repository/skills/writer`; the former g1 tree is never scanned just because it still exists during cleanup.
2. Existing custom `writer` plus incoming GitHub `writer` → structured conflict, no registry switch. Only runtime-default `writer` plus incoming GitHub `writer` → accept, incoming wins, default files untouched. Updating g1 `writer` to g2 `writer` excludes g1 source only, not another registered source's copy.
3. `https://github.com/acme/skills/tree/main/foo` → unsupported URL error, **not** silently importing all of acme/skills.
4. A UI request after publication resolves the current skill root; cached skill_ws_writer bound to g1 must close/rebind to g2. An active agent run isn't “refreshed” by this file-browser operation.
5. Run A retains holder h1 for source S/writer at g1. Update publishes g2. User presses ＋ and sends run B in the same workspace. DS-008 authorizes S/writer→S/writer, retargets only the owned link, carries h1 forward and adds h2. A closing cannot delete B's link; reversing close order is also safe. Different source T/writer still collides.

## Backward-Compatibility Rejection Log
| Candidate | Decision / clean-cut replacement |
| --- | --- |
| Managed roots also stored as local folder settings | Rejected; one managed registry with read-only catalog projection |
| Skills routed through AgentPackageService | Rejected; wrong subject/validation; source owner + shared transport |
| Old source methods forwarding from SkillService | Rejected; move callers to source owner |
| Old URL module/type re-export wrappers | Rejected; update imports to new owner |
| Dual current/previous generations exposed in catalog | Rejected; exactly ACTIVE registry generation |
| Keep unconditional physical-root mismatch rejection for authorized managed generations | Rejected for DS-008 only; replace with exact managed identity/current-catalog gate while retaining rejection for different sources |
| New registry version switches/history decoder | Rejected; tolerant current-field projection; no predecessor format |

## Derived Layering
Renderer presentation → GraphQL transport → source lifecycle/catalog subjects → store/network/filesystem mechanisms. Workspace lifecycle is its own owner invoked through its API, not reached by internal-map access. This layering follows the spines, not the reverse.

## Change / Refactor Sequence
1. Lock regression tests for preserved source/duplicate/runtime-default behavior; introduce source contracts and read-only managed roots with empty default registry.
2. Extract neutral GitHub transport, update agent package imports/tests without semantic changes. Add direct patched tar and new skill repository preparation boundary.
3. Add current-only registry and synchronous atomic primitive; integrate repository scan/exclusion and catalog managed source projection. Prove inactive staging never visible.
4. Move source lifecycle from SkillService; implement import/check/update/remove and no-await publication. Test interrupted/failed operations with disposable data.
5. Implement DS-008 in the existing runtime materializer/link owner, propagate managed provenance and effective results through runtime bootstrap. Preserve every old collision/holder test; add actual source update → header ＋ → same-workspace new-run test while A remains open. Then fix transient skill-workspace freshness and source mutation/catalog refresh. Verify open-update-reopen separately; it is not proof of runtime acquisition.
6. Add GraphQL source DTO/operations, complete frontend fragment/store/modal/localization; preserve local path API and duplicate dialog. New UI fields and backend deploy together.
7. Run implementation tests; independent source review according to configured implementation routing; API/E2E real product path and docs sync through respective owners. No manual user-data edits, no release from this design phase.

## Validation And Acceptance Mapping
Implementation owns focused checks; API/E2E owns executable integrated coverage per TESTING.md. Required evidence, not tests claimed executed:
- AC-001/002: real tar fixtures root-skill/direct collections/skills collections; .git/trailing URL variants; empty and malformed mixed collections; no imported agents/teams/applications; restart and supporting files. GraphQL mutations use public source contract with injectable network responses, not direct registry writes as scenario triggers.
- AC-003: Sources mount triggers one check, manual retry, multiple-source per-row errors, unchanged/changed/failed metadata, no archive download during checks.
- AC-004: local/default/package/new GitHub versus incoming GitHub, duplicates within candidate, self-update exclusion, runtime-default notice; all-or-nothing names/files on rejection. Preserve existing one-per-name and Codex native-path tests.
- AC-005: staged valid update with additions/deletions/edits; local edit overwrite confirmation/cancel; invalid update/network/registry failure; concurrent check/update/remove; interruption before/after publication; committed cleanup warning distinguished from update failure; surviving disable choices preserved.
- AC-005/007 and AR-001: source import through supported API, start A with managed skill g1, update to g2 through source command, keep A alive, create B via existing header ＋/Send in same workspace; B prepares successfully against g2. Repeat with old files deleted and temporarily retained for cleanup. Test Codex expose/discoverable paths and Claude shared-owner path, both skill scopes, reversed holder release order, two new acquisitions sharing transition, stale g1 request unable to retarget backward, failed transition followed by retry, and genuine different-source/user-owned collisions unchanged. No model refresh or g1 availability assertion for A.
- AC-006/007: local unlink leaves files; default removal prohibited; owned GitHub removal ACTIVE→REMOVING→absent and retry on deletion failure; restart while REMOVING; unaffected sources/agent selections. Open old skill, update and reopen latest files, removed skill returns list/error rather than stale cached root.
- AC-008: malicious absolute/parent/backslash/drive/UNC/PAX paths, duplicate destinations, link escapes/chains/cycles, external substituted staging roots; no outside writes, no process exit, no script execution. Safe repository-relative supporting links and executable files preserved. Pin dependency version in lock.
- Real UI: isolated test-owned backend/renderer or packaged app per TESTING.md, import disposable public fixture, verify Sources row/cards/detail, simulated upstream revision through deterministic API coverage plus real public download smoke. Do not mutate user's registered sources or remote repositories to manufacture an update.
- Commands baseline: `pnpm -C autobyteus-server-ts exec vitest run <focused files> --no-watch`; `pnpm -C autobyteus-web test:nuxt <focused specs> --run`; build/typecheck, GraphQL integration and isolated product UI path. Exact test files belong to implementation/API-E2E artifacts.

## Key Tradeoffs
Generation-pointer activation changes physical roots but gives one publication boundary without a backup journal or replacing live tree before validation. Transient workspace freshness plus trusted runtime identity transfer are required costs. Retaining old generations until holders end is not the solution: it would keep two physical identities and still trigger the original mismatch. Small synchronous metadata/scans align with existing catalog semantics; blocking archive extraction is prohibited. Shared metadata extraction limits duplication while leaving unrelated existing package replacement untouched. We deliberately keep editable managed copies plus explicit overwrite warning, not dirty-file merge/history UI.

## Risks
High-risk review should focus on single-process no-await name publication, mutable directory/link boundary, safe archive implementation, generation cleanup vs truthful result, source registry admission, cached workspace consumers and runtime occurrence holders across managed-generation transfer. Out-of-band edits can still create conflicts, governed by existing banner/first-winner behavior, not new automatic renaming. Network rate limits affect checks but not installed availability. No claim a downloaded skill is trustworthy, and no live active-run migration promise. Node/tar and Windows/macOS behavior need executable validation; no runtime tests performed during design.

## Guidance For Implementation
Implement the spines and boundaries above; do not perform Product redesign or modify precedence. Preserve all canonical requirements, approval receipt, investigation and revision history in handoffs. Return requirement changes for approval and technical gaps for design revision. Do not treat prototype tests or successful download alone as publication/rollback proof. Update failure and post-commit warning must be distinguishable. Independent architecture review is expected because of the completed High-risk classification; implementation must wait for the route outcome.

## Repository Design-Guide Check (SR-008)
SOLUTION_DESIGN_BEST_PRACTICES.md read. Required normal path is the existing ＋ new-chat action after successful source Update, not a synthesized collision. Smallest coherent correction extends the existing link owner with trusted identity/one transfer phase; no new runtime manager, persisted lease registry, all-run update fan-out or historical scan. Retain holder/collision guarantees, not the accidental invariant that one logical managed source has a forever-constant physical root. Only the requested runtime profile participates; other runtime discovery is not a launch dependency. Current-catalog reread uses existing synchronous discovery at the point it proves selected-generation authority; no new caching/performance program. Validation must demonstrate B starting while A stays open, plus ownership and cleanup regressions; no executable result yet.
