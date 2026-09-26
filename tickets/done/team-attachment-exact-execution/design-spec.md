# Design Spec — Team attachment exact execution ownership

## Solution And Approval Basis
Package docker-image-http400-20260926; SR-003; requirements R1 Approved by user “Yeah, approve.” in this conversation, approving the five-point focused scope. Design status **Ready**. Behavior supplements: none. Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-exact-execution/tickets/team-attachment-exact-execution/investigation-notes.md. Review artifacts: N/A — not applicable yet (pending first review).

## Current-State Read
UI knows exact AgentRun, but Team attachment DTO keeps only containing TeamRun and member address. Resolver looks through configured and task executions, returns null when address matches more than one. Final URLs repeat the ambiguous selector. Physical files already reside in exact execution directories. Draft identity legitimately predates execution creation. Org attachment final ownership already uses exact IDs and must remain unchanged.

## Task Size And Architectural Risk
**task_size=Medium; architectural_risk=High.** Several existing frontend/backend attachment components plus bounded persisted-reference transition, tests and docs; no new execution model or cross-product redesign. High due to changed REST identity/URLs, persisted history references, and coordinated client/server cutover with startup migration. Not high because of content count. Escalate to designer on new persisted authority needing transformation, loss/ambiguity requiring a product decision, scope expansion or proposed fallback. Do not downgrade to direct route.

## Architecture Investigation Evidence
| Evidence | Sources (relative worktree paths) | Decision | Uncertainty |
|---|---|---|---|
| E3-A | autobyteus-web/stores/agentTeamRunStore.ts; utils/contextFiles/contextFileOwner.ts; server src/context-files | Carry ID already present through contract; do not change index policy | Exact deployed version unknown; deployed logic verified |
| E3-B | Docker read-only structured scan, investigation notes | Convert persisted locators, leave files in place | Installation-specific unresolved references handled by preflight, no guesses |
| E3-C | src/context-files/services/context-file-record-locators.ts; src/app-data-migrations; src/server-runtime.ts | Reuse field traversal/atomic writer; startup-only current-schema cutover | Validation remains downstream work |

## Intended Change
Final Team owner is `{kind:'team_member_final', teamRunId:<containing TeamRun ID>, agentRunId:<exact selected AgentRun ID>}`. Remove memberAddress from that final DTO; it remains a draft/display/routing concept, not final file identity. New final locator:
`/rest/team-runs/<teamRunId>/agent-runs/<agentRunId>/context-files/<storedFilename>`.
Backend resolves exact ID and validates containingTeamRunId and agent_team family. Never reinterpret canonical AgentRun ID as provider thread or agent definition ID. Retain standalone/Org contracts and draft shapes.

## Relevant Behavior And Production-Path Map
| Behavior | Kind | Requirements / AC | Trigger / preserved outcome | Target path |
|---|---|---|---|---|
| BEH-001 | User | REQ-002,006 / AC-002,007 | Send selected execution images/files even after delegation | DS-001 |
| BEH-002 | User/System | REQ-002,005,006 / AC-003,006 | Reopen/upgrade history without changing owner/bytes | DS-002,004 |
| BEH-003 | User | REQ-004,006 / AC-005 | Upload before launch, bind after exact run creation; retain retry | DS-001 draft segment |
| BEH-004 | Contract | REQ-003,006 / AC-004 | Wrong-team/missing ID rejected; no fallback | DS-001,002 resolver boundary |

## Relevant Supplemental Task Artifacts
matching-errors.log (REQ-001, evidence only); original screenshots in investigation inventory. Product UI/UX, prototype, implementation and independent review artifacts: N/A — not applicable at design authoring.

## Task Design Health Assessment
Posture Bug Fix + focused Refactor. Design issue Yes. Root cause Boundary Or Ownership Issue / Missing Invariant: logical placement substituted for execution identity. Refactor needed now Yes: both serialization boundaries and downstream readers are affected; a first-match workaround hides misattribution. Response: exact final-owner DTO and current-only locator, explicit historical conversion. No unrelated index, provider, draft or UI cleanup. Residual risk: malformed/missing historical evidence can require operator recovery; never delete history to bypass.

## Terminology / Design Reading Order
AgentRun ID identifies one execution; memberAddress identifies a placement reusable by task executions; containing TeamRun ID identifies the immediate team (not necessarily root). Draft identity is temporary upload scope. Read intent/evidence → transition → spines/owners → files → sequence/validation.

## Legacy Removal Policy
No backward compatibility; remove legacy runtime paths. Remove address-based Team final DTO, GET route and local-path/model parsers. No optional-ID contract, address fallback, latest/configured preference, redirects, dual writes or old-client shim. Keep address-based drafts because they are a different current lifecycle, not compatibility. Historical decoding exists only in migration-owned code. Old external bookmarks are not a supported contract; persisted app-owned attachment fields are preserved by conversion.

## Persisted Data / State Transition Decision
- Execution tree and physical context_files: **Directly Usable — No Migration**. Their exact AgentRun ownership/memoryDir already meets target invariant; no physical file relocation or identity rewriting.
- App-owned final Team locators: **Migration Required**. 192 structured references in 88 trace files on node 0; ~712 MiB total JSON/JSONL scanned (not all transformed). Normal target readers cannot infer exact execution from old URL and are deliberately current-schema-only. Rebuild cannot replace authoritative historical attachments. Change only typed locator fields, not transcript prose, provider histories, arbitrary file contents, compaction evidence or task state. Preservation AC-003/006 justifies bounded reference rewrite rather than deletion or permanent compatibility.
- Draft files: **Not Affected**; keep existing draft locator/layout.

### Migration Plan
Add STARTUP_ONLY migration `20260926_team_context_file_execution_locators_v1`, registered after existing Team V2 and Org flat-family cutovers and trace-layout migrations. Dependency constants reference existing IDs, not copied string guesses. Required on startup. New migration success is gated explicitly at both studio and standalone startup boundaries before listener/runtime admission; existing runner merely warning on failure is insufficient. Require SUCCEEDED, not SUCCEEDED_WITH_WARNINGS when an affected attachment remains unresolved.
1. Enumerate current stored Team execution trees with strict schema reader/index; derive containing TeamRun / exact AgentRun / member address / physical directory from index. Include configured and task executions, nested containing teams. Enumerate normal record sources across Team, Org and standalone agent memory through existing attachment-record enumerator so cross-root references are not missed. Existing Org-family migration remains responsible for its already-defined historic Team-to-Org conversions.
2. Plan only structured old Team final locators. Preserve absolute origin spelling and query/fragment; transform local/configured-origin URLs and relative /rest URLs only. External-host URLs are not evidence of local ownership and must not be rebound. Decode historical rooted/percent-encoded and pre-rooted bare selectors only inside this migration. Match against containing team plus canonical address; bare selector normalization is permitted only with unique corroborated placement/physical proof. Do not infer a root from a directory name or pick a matching display label globally.
3. Resolve old reference to exact owner using indexed candidate scope and physical storedFilename. When the source trace's exact execution is a matching candidate with that file, source provenance provides independent ownership evidence; otherwise require exactly one indexed matching physical owner. If source provenance does not disambiguate multiple candidates, or no candidate/file exists, report file/field and block cutover—no selection by recency/configured status. Validate physical containment/safe filename, do not follow arbitrary paths. For references in communication/task sidecars, use the referenced owner, NOT sidecar author/recipient by default.
4. Preflight all affected references before writes, hash source and intended target per file; persist a backup/manifest under app-data migration backup area (outside live memory discovery). Include original/target hashes, mapping and progress. Backup only changed record files; attachment blobs are unchanged. Bound memory by file; do not accumulate 712 MiB in RAM. Reuse `transformContextFileRecordLocators` to avoid changing prose/unrecognized fields.
5. Commit each changed file with AtomicRunPackageFileCommitWriter; require source hash to match plan. Record progress durably, strict reread and validate all transformed references resolve exact owner/file. Unchanged files remain byte-for-byte; changed JSONL lines may be serialized anew but non-locator values remain equal. Do not claim success for indeterminate rename finalization. On restart detect source or target hash and resume idempotently, preserving original backup; unrelated hash fails safely. Current target locators are already transformed, not reinterpreted.
6. Mark migration ledger SUCCEEDED only after validation and manifest completion. Failed preflight/commit logs actionable diagnostics and retains original/backup, no completion. Restart retries through existing migration lifecycle. Stop all old/new writers during migration; update server and web/Electron together. Production deployment/maintenance is Delivery-owned, not authorized by this design handoff. Test on disposable copied fixtures first. Rollback requires stopping new writer, restoring changed record backups + ledger state and matching old binary as one coordinated action; never restore backups over newer live writes. Retain historical converter to support supported upgrades; never call it from normal readers.

| Stage | Shape | Owner | Check | Recovery |
|---|---|---|---|---|
| Plan | address locator → exact locator | migration planner | team/address/physical proof | zero writes on unresolved preflight |
| Commit | typed record fields only | atomic writer + manifest | source/target hashes, reread | resume/recover from backup |
| Admit | exact-only app data | startup gate | migration clean success | existing startup fatal reporting; no legacy runtime fallback |

## Data-Flow Spine Inventory / Primary Execution Spines
| ID | Scope | Behavior | Chain | Governing owner / purpose |
|---|---|---|---|---|
| DS-001 | Primary End-to-End | BEH-001,003,004 | composer → Team send store → launch/restore exact target → finalize REST → finalization/resolver/layout → runtime send to same ID | Team send store sequences; finalization owns attachment admission |
| DS-002 | Primary End-to-End | BEH-002,004 | history hydration → attachment chip → exact-ID GET → read service → resolver/layout → original bytes | read service owns file retrieval |
| DS-003 | Return-Event | BEH-001,003 | finalize DTO → uploaded attachment replacement → local message → runtime input local-path normalization | finalization emits canonical locators; send store retains same target |
| DS-004 | Primary End-to-End | BEH-002 | upgrade startup → migration plan/proof → atomic typed-reference rewrite → validation/ledger → current-only listeners | app-data migration owns transition |

## Spine Narratives
DS-001 captures the submission's exact target and location; launch produces a new ID, restore preserves the captured selected ID. Draft owner stays independent. Finalize validates and moves requested draft files into the resolved execution's existing context_files. Only after success does the same-target message dispatch occur. Navigating to another member while awaiting must not retarget this submission.
DS-002 takes persisted exact locators through ordinary current-only read service. Later task executions at identical addresses cannot change results. DS-003 makes the locally visible attachment use returned locator and permits provider normalization to physical path using that same resolver. DS-004 upgrades typed references before any affected runtime consumes them; it never becomes a normal read fallback.

## Spine Actors / Ownership Map
Team send store: target capture and send sequencing. REST facade: parse/HTTP mapping only. Finalization service: validation-before-move, retry/idempotent move behavior and return descriptor. Owner resolver: sole exact execution + containing-team authority check. Execution location service: existing tree lookup/physical scope authority. Layout: safe filesystem path construction. Read/local-path services: shared resolver consumers. Migration: historic shape/proof/commit lifecycle. No new peer runtime coordinator.

## Thin Entry Facades / Public Wrappers
REST context-files routes wrap finalization/read services; must not search trees or pick owners. Startup entrypoints gate migration outcome; must not decode/transform history. Existing upload store transports typed descriptors, not identity inference.

## Removal / Decommission Plan
| Remove | Replacement | Scope |
|---|---|---|
| final Team memberAddress field and parser branch | required agentRunId + teamRunId | this change |
| final members/:memberAddress GET and local-path matching | agent-runs/:agentRunId exact route | this change |
| web final Team locator matcher and builder argument | exact-ID pattern/builder | this change |
| address-only finalization fixtures/docs as current contract | exact-ID tests/docs; old shape only migration fixtures | this change |
No deletion of member addresses from draft definitions, team tree, display or collaboration routing.

## Return Or Event Spines / Bounded Local Spines
Return spine DS-003 above. DS-004 bounded migration loop: enumerate → preflight → backup → compare source hash → atomic write → reread → manifest progress. No new event bus/state coordinator.

## Off-Spine Concerns Around The Spine
| Concern | Spine / owner served | Responsibility | Placement |
|---|---|---|---|
| DTO parser/locator builder | DS-001/002/003, attachment services | one exact shape and encoding | existing context-files domain |
| tree lookup | DS-001/002, resolver | exact scope and identity | reuse collaboration location service |
| filesystem layout | DS-001/002, services | contained physical paths | existing context-files store |
| record field traversal / atomic writer | DS-004, migration | typed transformation / durable commit | reuse existing generic capabilities |
| diagnostics / backups | DS-004, migration | explain recoverable failure | migration-owned; not normal readers |

## Ownership Boundaries / Boundary Encapsulation Map
| Boundary | Internals | Callers | Forbidden bypass |
|---|---|---|---|
| finalization/read service | owner resolver + layout | REST | route queries index itself |
| owner resolver | collaboration location service | attachment services | caller guesses memoryDir/address match |
| app-data migration | old selector parser/proof/manifest | startup runner | business reader calls old converter |

## Dependency Rules
Web sends captured exact ID only; server never trusts it as an unchecked filesystem path. Resolver passes `{containingTeamRunId,agentRunId}` to existing locator and validates returned family/team/ID. Keep async and sync behavior aligned. Team index semantics remain unchanged. Migration may use domain indexing and generic file transformer/writer but must not bootstrap active agents or modify task state. Do not import Org-specific migration policy into Team runtime.

## Interface Boundary Mapping / Check
| API | Subject / identity | Responsibility | Check |
|---|---|---|---|
| buildTeamMemberFinalContextFileOwner(teamRunId,agentRunId) | exact Team execution | descriptor construction | singular / explicit / low ambiguity |
| parseFinalContextFileOwnerDescriptor | discriminated final identity | require safe nonempty IDs, reject old/mixed Team shape | singular / explicit |
| resolveFinalOwner + Sync | exact Team execution | scope validation + derived physical location | singular / explicit |
| finalize REST / exact GET | attachments of execution | admission / bytes | low ambiguity if mandatory ID |
Draft descriptor is unchanged, never accepts optional final ID to conflate lifecycle. Keep final DTO free of redundant address; derived physical scope only in resolved owner.

## Main Domain Subject Naming Check
TeamMemberFinalContextFileOwner remains natural (member's exact execution); fields now precise. Canonical agentRunId naming shared with Org; do not use ambiguous runId where team and agent could be confused. No new generic owner-manager helper.

## Existing Capability / Subsystem Reuse Check / Allocation
Extend context-files DTO/resolver/locator capabilities and Team send store. Reuse execution-location index, physical layout, attachment-record walker, atomic writer and migration registry/ledger. Create only migration-specific planner/entry files under existing app-data-migrations ownership. No new package/shared-contract workspace is warranted for this bounded fix.

## Draft File Responsibility Mapping / Reusable Owned Structures Check
Initial concern set: web capture/DTO/model; server DTO/resolver/routes/local reader; migration converter/entry; startup gates. Retain existing owner-types as shared server schema/locator source; web owner utility owns transport types for that client. Reuse record-locators walker instead of a new recursive JSON rewriter. Keep historic selector normalization inside migration, not a shared utility consumed by current runtime. Final responsibilities below tighten these candidates; no overlapping new final shape.

## Shared Structure / Data Model Tightness Check
Final Team descriptor has kind, containing teamRunId, exact agentRunId only. Address not duplicated. Resolved owner adds only physical/root ancestry already derived from location. Draft has its existing temporary scope/address. No optional ID unions or parallel current representations. Server parser validates unsafe/missing IDs and unexpected old selector fields explicitly.

## Final File Responsibility / Target Subsystem-Folder-File Mapping
All paths relative to worktree. Existing directories reflect transport/domain/service/store; no moves needed.
| Path | Action / boundary | Concrete responsibility / must not contain |
|---|---|---|
| autobyteus-web/utils/contextFiles/contextFileOwner.ts | change client DTO/builders | exact final Team ID; drafts untouched |
| autobyteus-web/stores/agentTeamRunStore.ts | change send orchestration | pass captured targetAgentRunId; preserve it across await/hydration; no backend ownership inference |
| autobyteus-web/utils/contextFiles/contextAttachmentModel.ts | change final locator recognition | exact-ID URL classified as uploaded final; no old final fallback |
| autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts | change schema/builders | exact Team DTO/parser/locator and safe fields |
| autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts | change authority lookup | exact ID + team + family validation, sync/async parity |
| autobyteus-server-ts/src/api/rest/context-files.ts | change transport | new final GET; remove old GET; preserve draft routes |
| autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts | change runtime adapter | new Team final URL only; existing origin/path guardrails |
| autobyteus-server-ts/src/context-files/services/context-file-finalization-service.ts | inspect/update typing/tests only as needed | emit exact locator, preserve sequencing; no identity guessing |
| autobyteus-server-ts/src/app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1-app-data-migration.ts | create migration entry | registry lifecycle, backup/progress/completion; no runtime fallback |
| same directory/team-context-file-locator-transition.ts | create converter | source enumeration/proof/plan/current-URL transform, file-bounded processing |
| autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts | change registry | ordered new migration + prerequisite constants |
| autobyteus-server-ts/src/server-runtime.ts; src/standalone-application-host/start-standalone-application-host.ts | change startup transport boundary | clean-success migration gate before runtime/listen |
| autobyteus-server-ts/src/context-files/services/context-file-record-locators.ts; src/run-history/store/atomic-run-package-file-commit-writer.ts | reuse | typed record transform/durable write; do not fork their logic |
| server tests/unit/context-files; tests/integration/api/rest/context-files.integration.test.ts; tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts | extend tests | duplicate address/exact-ID/wrong-team/read/restart and unchanged modes |
| server tests/unit/app-data-migrations (new migration tests); startup tests | extend tests | preflight/no-write failure, restart/hash/rollback/ledger/gates |
| web stores/__tests__/agentTeamRunStore.spec.ts; utils/contextFiles/__tests__; services/runHydration/__tests__/runProjectionConversation.spec.ts | extend tests | captured ID, upload-final shape, history render; update obsolete fixtures |
| autobyteus-web/docs/agent_execution_architecture.md; docs/settings.md | sync docs | current final contract + draft distinction; delivery owns final sync |
Physical file layout, raw-trace schema, execution index, provider implementations are unchanged. Historical migration fixtures retain old inputs deliberately.

## Applied Patterns / Folder Boundary Check / Derived Layering
Existing service-authority with typed DTOs; explicit startup migration. Transport → attachment services → resolver/layout; migration separately consumes storage authorities. Existing folder depth sufficient, no artificial modules outside migration-specific concern folder. Layer mixing risk low when route does not select owner and runtime does not parse historical shapes.

## Concrete Examples / Shape Guidance
Good: team T, agent A configured and agent B delegated both address /x_marketer; finalOwner(T,A) gives `/team-runs/T/agent-runs/A/context-files/F`; later B has no effect. Bad: owner(T,/x_marketer) or pick-first fallback. Good: old trace in A's proven indexed scope references F physically in A; migration records proof and exact URL. Bad: rewrite every occurrence of text '/x_marketer' in JSON or assume referenced file belongs to current sidecar author.

## Backward-Compatibility Rejection Log
Optional agentRunId + address fallback: rejected (bug remains). Old final URL redirect: rejected (ambiguous owner). Configured-only lookup: rejected (silently changes selected execution). Delete task history: rejected (REQ-005). Dual runtime parser: rejected; one-time typed conversion instead. Keeping draft addresses: N/A, distinct current lifecycle.

## Change / Refactor Sequence
1. Add regression fixtures with two executions at same address, including nested containing team and representative persisted bare/encoded old locators.
2. Implement exact contract across web/server/read/local paths and tests; no index behavior change.
3. Implement migration planning, proof, backups, idempotent commits and tests using copied data; register and gate both startups.
4. Remove old runtime final routes/parsers, update recognition and docs/fixtures; retain historical migration decoder only.
5. Verify integrated old-data upgrade + new send + read/restart and wrong-team cases. Independent review follows configured routing. No live node modification without Delivery's applicable verification/deployment gates.

## Key Tradeoffs
Exact-ID locator length increases but ownership is unambiguous. Keeping containing team scopes validation and nested layout instead of new global file route. Startup conversion costs bounded I/O but avoids indefinite legacy resolution and preserves history. A malformed affected record blocks clean cutover rather than silently losing or misattributing data. No transcript-wide rewrite or physical file migration.

## Risks
Client/server version mismatch requires coordinated upgrade; old clients aren't shimmed. Migration can encounter previously broken/missing or foreign-owned references; fail with evidence and obtain correction, never invent identity. Live concurrent writers invalidate hashes; stop them at cutover. Read-only diagnostic tests are not implementation validation. No rollback over new live history. Independent architecture review particularly evaluates migration proof and preservation against AC-003/006.

## Guidance For Implementation / Validation
Implementation Engineer owns source/tests, API/E2E owns executable validation; designer ran no implementation tests. Test exact IDs for configured AND task execution read; send only through existing sendable execution lifecycle (do not add support for reviving completed tasks). Include focus change during await, restore preserving selected ID, launch-returned ID, wrong-family/team/absent ID, unsafe IDs, duplicate filenames across owners, text-only and Org/standalone regressions. Ensure bytes and parsed non-locator history unchanged in migration; query/fragment/origin preserved; other-host URI untouched, prose untouched; complete trace archives covered. Test injected atomic-write/ledger interruptions and both startup gates. Run relevant Vitest suites with --run/--no-watch per AGENTS.md; use browser-equivalent workflow first, actual Electron only for shell-specific gap. Escalate any required new behavior instead of expanding scope.
