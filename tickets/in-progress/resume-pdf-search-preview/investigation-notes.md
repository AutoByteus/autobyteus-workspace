# Investigation Notes — résumé PDF search preview

## Investigation Meta
- Package: `resume-pdf-search-preview`; Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`, Task `project_task_1aefbe1a-dfb5-4ec1-b893-8423b09a12dd`.
- Original caller: `/project_task_manager`, run `project_task_manager_2f7a8ea2d421446f8f22e4f616528547`.
- Git isolated workspace: `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview`; branch `codex/resume-pdf-search-preview`.
- Refreshed base: `origin/personal` at `2756d7b298ca5b203ebd2310d172b37a5d381b5c`; `git fetch origin` succeeded 2026-10-12. Target `origin/personal` per RELEASE.md.
- Bootstrap: successful; new templates initialized before deep investigation. Shared checkout at `/home/autobyteus/workspace/autobyteus-workspace` remains untouched (untracked .claude/, computer-use-runs/, task-plans/, web-ui-sites/).
- Current revision: SR-003; status: ARCH-REV-001 / ARCH-F-001 Design Impact investigated; revised design complete for re-review, no implementation yet.
- Authorities read: solution-designer SKILL; requirements-engineering, architecture-design, design-principles and requirements/investigation/revision/design templates; root AGENTS.md, DESIGN.md, TESTING.md with refreshed-base delta, RELEASE.md; web and server AGENTS.md. 2026-10-12. No closer applicable DESIGN.md found.

## Initial Request And Clarifications
Find why Files search `resume` → open résumé PDF fails with HTTP 400 in investor-applications workspace, fix if a bug, preserve documents/access controls/conversations, coordinate actual port8001 delivery, durable regression and realistic rendering validation, explicit cleanup report. No additional user direction received.
Screenshot was inspected directly with view_image. It shows Files active, resume query, multiple PDFs and the clipped URL/error. It does not establish the full workspace ID or endpoint. Those were subsequently obtained from runtime records, not guessed.

## Product And Domain Understanding
Files is a workspace-scoped explorer with snapshot search and lazy directory projection, shared text/media viewers and visibility-leased filesystem watching. Search selection is ordinary supported functionality (SCN-001/002). A PDF error can arise before document parsing: content bytes are protected by workspace-relative access, BEH-003.

## Source Log
All sources/commands on 2026-10-12; code paths below relative to isolated workspace unless `/app` or other absolute path.
| ID | Source / exact command or path | Observation | Follow-up |
| --- | --- | --- | --- |
| E-001 | `/home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_1aefbe1a-dfb5-4ec1-b893-8423b09a12dd/context/ctx_7cbb18ffeeeb__ctx_27db61845e57_image.png`, view_image | Search result preview error HTTP 400; URL clipped | Treat as workflow evidence, not corruption diagnosis |
| E-002 | `ps -eo pid,ppid,args`, `readlink /proc/61/cwd`, `/etc/supervisor/conf.d/supervisor-autobyteus-server.conf`, startup log | PID61 runs `node dist/app.js --host 0.0.0.0 --port 8000 --data-dir /home/autobyteus/data` in `/app/autobyteus-server-ts`; public base printed as `http://localhost:8001`; container hostname `74ff273d28fe` in request log | Host port mapping/image metadata unavailable here |
| E-003 | `/home/autobyteus/data/workspaces.json` read-only | Full registered workspace identity confirmed below | No registry modification |
| E-004 | `rg -n 'Yu_Zheng|workspaces/agent_ws|400' /var/log/supervisor/autobyteus_server.{log,err.log}` | Exact request and rejection below | Durable filtered excerpts saved |
| E-005 | `stat`, `pdfinfo`, `sha256sum` of original PDF | Regular readable 198631-byte, unencrypted two-page A4 PDF; parser succeeds. SHA below | No changes or fixture copies of personal content |
| E-006 | `/app/autobyteus-server-ts/dist/workspaces/workspace-path-utils.js`, `dist/api/rest/workspaces.js` | Absolute paths denied before fs read; Access denied maps to400 | Rules correct; don't relax them |
| E-007 | src/file-explorer/{file-explorer.ts,file-name-indexer.ts,search-snapshot/workspace-search-snapshot-controller.ts,search-strategy/*.ts}; installed counterpart inspection | Indexer and ripgrep produce absolute host paths, public search forwards them unchanged | Correction needs one public search conversion |
| E-008 | autobyteus-web/{components/fileExplorer/FileExplorer.vue,FileItem.vue,FileViewer.vue,viewers/PdfViewer.vue; composables/useWorkspaceFileExplorer.ts; stores/fileExplorerSearchActions.ts,fileExplorerContentActions.ts; utils/fileExplorer/workspaceResourceUrl.ts} | Search paths enter TreeNode unchanged; selection opens same path; media URL encodes it directly; shared PDF viewer fetches it | Existing client can consume relative response without viewer change |
| E-009 | `env -i PATH="$PATH" HOME=/tmp node --input-type=module` importing installed FileSystemWorkspace; own mkdtemp workspace and synthetic named file | Search `resume` returns absolute fixture path; `getAbsolutePath(searchResult)` throws Access denied, same relative file resolves; watcher remains absent | Baseline reproduction log; not PDF rendering proof |
| E-010 | `rg -n '\.searchFiles\(' autobyteus-server-ts/src`; source resolver | Only production public-search caller is GraphQL resolver, lease released in finally, abort forwarded | No known internal absolute-result consumers |
| E-011 | Existing search-strategy unit, file-search integration, GraphQL E2E and REST/path boundary tests | Integration explicitly expects absolute paths; GraphQL suffix assertion misses mismatch; REST test mocks path owner | Revise erroneous public format expectation and add real-owner cross-boundary regression |
| E-012 | ARCH-REV-001 / ARCH-F-001; `git grep -n -E 'toShallowJson\|getAllFilePaths'` excluding ticket/history/dist/resource artifacts; `rg -n 'file-explorer/file-explorer\|WorkspaceFileExplorer' autobyteus-server-ts/src`; src/index.ts, package.json, vitest.config.ts; method bodies and direct TS/JS tests | Both methods are test-only; no production/dynamic/configuration caller found; package private and public index does not expose class. Two stale converter JS mock properties also found. Vitest includes only test.ts | Bounded removal/test/doc disposition recorded in SR-003; current typecheck/focused suites required at implementation |

## Relevant Existing Behavior And Supported Product Paths
- BEH-001 / SCN-001: user searches and clicks nested PDF → tab opens → error before PDF bytes. Direct screenshot, runtime request and read-only logs establish actual supported failure.
- BEH-002 / SCN-002: browse/search → shared viewer; lazy/unexpanded result supported by docs and fallback TreeNode in store. Tree identities are relative whereas search identities are absolute. Text paths share the inconsistency.
- BEH-003 / SCN-003: path validation must reject absolute input even if inside root, and lexical parent/sibling escape; no guarantee expansion or symlink policy redesign proposed.
- BEH-004 / SCN-004: source checkout and installed Docker /app runtime are different. Delivery must coordinate rollout and user's re-search/open. No live automated validation was performed.

## Runtime Identity And Failure Evidence
Confirmed registered ID:
`agent_ws_337bc00ecb113ab3aa946f6338e65bdbd379eb52971d512ac13e6a23126bf8dd`
Root: `/home/autobyteus/workspace/autobyteus-investor-applications`.
Original file: `/home/autobyteus/workspace/autobyteus-investor-applications/job-applications/bit-capital-ai-engineer-2026/Yu_Zheng_Resume_2026_Application.pdf`.
Relative locator: `job-applications/bit-capital-ai-engineer-2026/Yu_Zheng_Resume_2026_Application.pdf`.
SHA-256: `7ede472f9974fa733499efc8b9e9066a6c11cec5d1e36b98982d6126851df2b5`.
Runtime `req-25k` (time1791817349080) GET `/rest/workspaces/<confirmed-ID>/content?path=%2Fhome%2Fautobyteus%2Fworkspace%2Fautobyteus-investor-applications%2Fjob-applications%2Fbit-capital-ai-engineer-2026%2FYu_Zheng_Resume_2026_Application.pdf` completed400. Error log: `Access denied: Path resolves outside the workspace boundary.` Repeated same-file400 requests req-2bn and req-2e5 corroborate.
The file IS lexically within the selected workspace; generic rejection wording is not proof it is outside. The explicit absolute-input guard rejects all absolute locators. No corruption, permissions failure or wrong registry mapping evidenced.

## Relevant Codebase And Technical Facts
- `FileNameIndexer.resolvePath` joins tree-relative path to root; `FuzzysortSearchStrategy.search` returns index values. `RipgrepSearchStrategy.search` joins root and entry too. Both internal strategies therefore intentionally use absolute search candidates.
- `WorkspaceSearchSnapshotController.search`: refresh snapshot/index → strategy search → race with abort. `WorkspaceFileExplorer.searchFiles` returns controller response directly.
- `FileExplorerResolver.searchFiles`: resolve/create workspace → acquire explorer lease → public search → release in finally. Search does not acquire watcher lease.
- Frontend `searchFiles` attempts existing tree lookup on absolute string, otherwise creates lazy search node with identical absolute `path`; `FileItem.handleClick` calls preview; store encodes unchanged string via buildWorkspaceContentUrl.
- `FileSystemWorkspace.getAbsolutePath` delegates resolveWorkspaceRelativePath; absolute input is rejected before resolving containment. REST content catches Access denied →400, never invokes PDF parser. `PdfViewer` reports the HTTP400.
- Existing `getPath` already owns workspace-relative resolution for explorer operations. Existing tree serialization uses native path-relative path convention. No need to change strategies/index formats or content reader rules.
- Existing Event Monitor mapper maps absolutes in frontend, but search need not import it: contains different prose/placeholder semantics and would require distributing a frontend build. Correction can be made at the existing public workspace search owner once, not separately in each viewer/store.

## Structural And Payload Surface Inventory
Payloads: transient search string arrays, deterministic synthetic regression PDFs/text; user PDF read only for metadata/hash, never copied or changed. No content volume or persistence schema change.
Structural: one public workspace file-search method and its GraphQL-return format, plus bounded removal of two unused methods from that touched class (E-012); internal strategies/index/cancellation and protected content readers unchanged. Browser/store consumers already accept relative tree paths. Contract semantics correction is material enough for High risk despite Small implementation.
Deployment: backend /app process is live and hosts ongoing agent conversations. No Docker executable or `/var/run/docker.sock` available in this agent container. Public port8001 was corroborated via startup/log configuration; actual host docker mapping/image digest not independently enumerated.

## Runtime, Probe, Or Reproduction Findings
Isolated installed-module probe uses one fresh synthetic tree and imports installed `/app` classes, not a running app HTTP endpoint; establishes exact producer/reader mismatch with assertions. No server/process instance launched and temporary tree removed in finally. Source code inspection agrees with installed behavior. `pdfinfo` confirms original parses, but neither metadata nor fixture `%PDF` header proves rendering. Real changed-build browser rendering remains downstream.

## Persisted Data And State Facts
Registry and original documents are read-only evidence. Search result arrays/open tabs are transient client state; no production persisted file/schema update is needed. Existing bad preview tab/cached result should be closed and query refreshed through UI after rollout, not repaired by hidden state writes. Original résumé checksum recorded for delivery continuity.

## Product Design Context / Findings
Not requested. No visual/UX redesign, Product artifacts, mocked visual reference or user visual confirmation. N/A — not applicable.

## Supplemental Artifact Inventory
Canonical root for owned artifacts: `/home/autobyteus/workspace/.codex/worktrees/resume-pdf-search-preview/tickets/in-progress/resume-pdf-search-preview`.
| Artifact | Owner / purpose | Related IDs | Status / approval |
| --- | --- | --- | --- |
| evidence/runtime-failure-excerpts.log | Solution Designer; minimal live failure evidence, read-only extraction | REQ-001; AC-001 | Captured; evidentiary, no behavior approval |
| evidence/installed-module-checksums.txt | Solution Designer; installed baseline module identity | REQ-003; AC-004 | Captured; not exact image digest/source commit proof |
| evidence/baseline-isolated-reproduction.log | Solution Designer; baseline candidate-to-reader assertion and cleanup | REQ-001/002 | Passed reproduction of failure; not changed-build pass |
| Original screenshot absolute path E-001 | User/delegator evidence | SCN-001 | Inspected; externally owned, not copied |
| design-review-report.md | Architecture Reviewer; authoritative ARCH-REV-001 / round1 Fail — Design Impact, ARCH-F-001 removal-plan omission | REQ-004/AC-003; preserved REQ-001/003 | Reviewed R1/SR-001/SR-002; externally owned, latest decision remains Fail until reviewer re-review |
| architecture-review-revision-record.md | Architecture Reviewer; cumulative independent review history | Same basis | ARCH-REV-001, read-only external authority |
No implementation/validation/delivery artifacts yet.

## Assumptions, Unknowns, And Risks
- Actual host Docker image/tag/digest and frontend packaged version are unknown; installed functions/logs are the observed runtime basis. Delivery must inventory and pin candidate, not assume git source is active.
- No changed source, executable regression or viewer render proof yet. Those belong to implementation/API-E2E.
- Safe rollout may require user-authorized interruption and host Docker tooling. No restart performed; no public release requested.
- External consumers outside repository that relied on absolute search results are not evidenced. Correcting public response format is a material contract delta to review; do not add compatibility dual formats.
- Existing symlink/TOCTOU policy is not changed or represented as stronger than current lexical containment.

## Architecture Investigation Findings (After R1 Approval)
Reconfirmed clean isolated worktree and approved R1. Traced search-only producer, complete click-to-PDF path, native relative tree serialization, getPath, GraphQL lease/abort lifecycle and downstream consumer inventory (E-007/008/010/011). Only the public search response contradicts protected reader identity; internal absolute candidates need not change. No new domain owner/refactor is needed. Target decisions are in design-spec, not here.

## Requirement Implications / Notes For Architecture
Approved REQ-001/004 need one consistent workspace-relative search identity, including unexpanded nested PDFs; REQ-002 prohibits reader relaxation. REQ-003 requires honest isolation/deployment/user verification and no uncoordinated restart. Durable tests must join search output to actual protected content/read path rather than asserting a suffix. Capture both primary fuzzy and ripgrep/fallback path conversion without revising ranking or snapshot cancellation.

## Design Impact Recovery — ARCH-REV-001 / ARCH-F-001 (SR-003)
Incoming canonical handoff/review/history read before work. R1 approval and BEH-001–004 remain unchanged; gates read earlier in this conversation still apply. Independent architecture review confirms fix and Small/High classification, but requires mandatory touched-file dead-code removal disposition. No renewed requirements approval is needed: removing unreachable methods does not change supported behavior. Reviewer artifacts remain untouched.

Independent corroboration E-012:
- `src/file-explorer/file-explorer.ts:177–182` toShallowJson serializes rootNode.toShallowDict; `:220–244` getAllFilePaths traverses rootNode. Direct method calls occur only in `tests/unit/file-explorer/file-explorer.test.{ts,js}` (shallow projection) and `tests/integration/file-explorer/file-explorer.integration.test.{ts,js}` (relative file path listing).
- `git grep` adds `tests/unit/api/graphql/converters/workspace-converter.test.js:12,26`: stale toShallowJson mock properties inside obsolete getFileExplorer scaffolding, not production invocations. Current converter TS tests and implementation use metadata only. This single tracked JS counterpart needs a narrow parity update/removal of those stale mocks, not a global generated-JS sweep.
- Live search uses snapshot controller.buildWorkspaceDirectoryTree(null) then FileNameIndexer.refreshSnapshotIndex; indexer traverses getTree. Live folder GraphQL uses returned TreeNode.toShallowDict(1). TreeNode depth/path/id tests already exist in tree-node.test.ts; no production method replacement is necessary.
- Existing consumer imports in filesystem workspace, streaming and watcher modules contain no invocation; exact-name broad tracked grep found no runtime/reflection/configuration caller. Server package is private; src/index.ts exports server/host entrypoints, not explorer methods. Compiler cannot by itself prove unused public members; implementation must repeat reference search and run current typecheck/focused suites to corroborate safe removal. External deep imports are not evidenced as supported contract. If a real consumer is discovered, return Design Impact with evidence rather than remove its supported functionality.
- Both area docs call current snapshot traversal getAllFilePaths (server doc:30, web doc:922); wording is factually obsolete and must describe snapshot tree/index refresh with current abort/watcher semantics.

This is correction of initial incomplete dead-code inventory, NOT another PDF root cause, new scenario, security policy or performance claim. Source/test/doc edits remain assigned to Implementation/Delivery. No suites, new fixtures, live requests, server/browser processes, /app edits, restart or production data mutations performed in this revision.
