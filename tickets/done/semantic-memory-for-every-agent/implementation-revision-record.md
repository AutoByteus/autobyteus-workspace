# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-004 pass of SR-008 (the pause of 2026-11-19 ended) | N/A (review notes N-8…N-11 applied) | `Initial Baseline` | SR-008, ARCH-REV-004 | Implemented design steps 1–7 and the AC-012 measurement; ready for code review |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (`Fail`, `Local Fix`) | CR-001 | `Local Fix` | IR-001, CRR-001 | The folder view's workspace lives exactly as long as the view; ready for targeted code review |
| IR-003 | Architecture reviewer, `design-review-report.md`, ARCH-REV-005 pass of SR-009 (the design response to CRR-003 CR-002, API/E2E API-10) | CR-002 | `Design Impact` | IR-002, SR-009, ARCH-REV-005, CRR-003 | One definition folder name rule for long IDs (DEC-016); a folder that cannot be prepared never fails a run (DEC-015); ready for code review |
| IR-004 | Delivery engineer, Local Fix request on the merged state (`7ac6b392c1`, origin/personal @ `74d046320a`), evidence DEL-03, DEL-13, DEL-17, DEL-19, DEL-30 | LF-1, LF-2, LF-3, LF-4 | `Local Fix` | IR-003, CRR-004, CRR-005 | Demo fixture, two stale e2e tests, one comment; ready for the proportional test review |

## Revision Entries

### IR-001 — Semantic memory for every agent, global semantic memory, the Memory page by owner

- Triggering role, report path, and round: architecture reviewer (`/architecture_reviewer`), `design-review-report.md`, ARCH-REV-004 (`Pass`, SR-008)
- Triggering finding IDs: N/A (review notes N-8, N-9, N-10, N-11 applied; N-4 from ARCH-REV-002 applied)
- Classification: `Initial Baseline`
- Prior authoritative result: none committed. Work on SR-002 stopped on 2026-11-19 at the founder's request
  (`implementation-progress.md`, still in this folder as the record of the pause); its uncommitted state was kept as
  `wip-uncommitted.patch`. SR-008's step 1 took from it the unconditional gate, the server field removal and the core
  tests, and dropped `AgentSemanticMemoryBrowser`, its GraphQL queries and its tests. The patch file is removed: it
  holds only code that SR-008 replaced or that IR-001 now carries.
- Current authoritative result: implemented; checks in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-008 (requirements and design); the UI/UX spec `semantic-memory-view-554` (Approved 2026-11-20)
- Related architecture-review revision IDs: ARCH-REV-004 (and ARCH-REV-002 for N-4)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first committed implementation of the approved package
- Approved behavior or requirement IDs affected: BEH-001…BEH-005; REQ-001…REQ-012
- Implementation delta: see `implementation-handoff.md` § Reviewed Behavior Implementation Trace and § Key Files Or Areas
- Commits: `56b02294d0` (code, tests, docs), `a9ca3c48c6` (member-only owner loading state; rendered probe), `cff2a6596a` (link rows sort with the files), then the evidence and this record

### IR-002 — CR-001: the folder view releases its workspace when left during the first listing

- Triggering role, report path, and round: code reviewer (`/code_reviewer`), `code-review-report.md`, CRR-001 (`Fail`, `Local Fix`)
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (`56b02294d0` … `ecbb4741ca`)
- Current authoritative result: implemented in `cd26f4d913`; checks IMP-14…IMP-16 in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-008 (REQ-007; the reviewer's SCN-LEAVE)
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this revision exists: `SemanticMemoryFolder.vue` registered the folder's workspace and kept its id only after the first `fetchFolderChildren` returned, so leaving the view while it loaded (Episodic tab, Back, another page) left a `semantic_memory` entry in the web store, which `ChatWorkspaceMenu` offers until reload; a late listing also set the id on the unmounted view.
- Approved behavior or requirement IDs affected: REQ-007 (never in any workspace list or picker); no behavior change otherwise
- Implementation delta: the component keeps `registeredId` from the moment of registration, and `release()` (also on unmount) unregisters it and starts a new generation; a listing that completes in an older generation is ignored (no `workspaceId`, no error shown); a failed listing in the current generation releases and shows the error. Two component specs on the real workspace store: unmount during a pending listing leaves no `semantic_` entry and no `semantic_memory` metadata, also after the late listing; an agent change during a pending listing keeps only the current folder's workspace and shows only it. Both fail on the reviewed component (negative control, IMP-14).
- Not changed: FU-003 (the menus listing transient workspaces; `SkillWorkspaceLoader`'s same pattern) stays a follow-up, as the reviewer recorded it.
- Commits: `cd26f4d913` (fix and specs), then the evidence and these records

### IR-003 — SR-009: definition folder names and preparation failures (CRR-003 CR-002)

- Triggering role, report path, and round: architecture reviewer (`/architecture_reviewer`), `design-review-report.md`, ARCH-REV-005 (`Pass`, SR-009), the design response to CRR-003 CR-002 (API/E2E API-10: RA-04, IC-01, RE-05 failed with `ENAMETOOLONG`)
- Triggering finding IDs: CR-002 (review notes N-12, N-13, N-14 applied)
- Classification: `Design Impact`
- Prior authoritative result: IR-002 (`cd26f4d913`), then the API/E2E round 1 commits `e571b1dd9e`, `daba240ec1`
- Current authoritative result: implemented in `f393f403d5`; checks IMP-17…IMP-22 in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-009 (REQ-001 and REQ-010 reworded; AC-013, AC-014; DEC-015, DEC-016)
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API/E2E round 1 (API-10)
- Related delivery revision IDs: N/A
- Why this revision exists: an application-bundled team-local agent's encoded ID is 439 bytes, so `prepareForRun`'s `mkdir` failed and its run never started; the same name served the episodic catalog and the `semantic_ws_` lookup.
- Approved behavior or requirement IDs affected: REQ-001, REQ-010, AC-013, AC-014
- Implementation delta:
  - `AgentMemoryLayout.definitionFolderName` (private, the only rule): `encodeURIComponent(id)` up to 200 bytes; otherwise the first 120 bytes cut between characters, `#`, 16 hex characters of `sha256(id)`. The design says "never cutting inside a `%XX`"; cutting between characters is that rule plus one case it misses: a cut between the escapes of one multi-byte character (`…%E7`) is outside every `%XX` yet `decodeURIComponent` throws on it, which N-13 exists to prevent (IMP-17 shows the throw). For ASCII IDs both rules give the same name.
  - `EpisodicCatalogStore.listCatalogDefinitionIds` keeps a folder only when the layout gives its name back for the decoded ID (skips shortened names, and a name the layout refuses such as `%20`).
  - `AgentSemanticMemory.prepareForRun` prepares each folder independently, returns `{ agentFolder: string | null, globalFolder: string | null }` and logs `SEMANTIC_MEMORY_PREPARE_FAILED { definitionId, folder, reason }`; `preparedSemanticMemoryFolders` gives Claude's additional directories and Codex's writable roots; the composer adds a section only for a non-null folder (still refusing a relative one).
  - Docs: `agent_memory.md`, `agent_episodic_catalog.md`, `prompt_engineering.md`, `GLOSSARY.md`.
  - Tests: `definition-folder-names.test.ts` (new), AC-014 cases for the owner, composer, Claude and Codex; the rendered probe opens a file inside a shortened folder through the Semantic tab (SMV-100…102).
- Premise checked: "ids that fit keep their names" also holds for existing folders on the founder's node: no name in `episodic/` or `semantic/` is over 200 bytes (IMP-22, names only). An ID of 201–255 encoded bytes had a valid folder before and is now shortened; none exists there.
- Commits: `f393f403d5` (code, tests, docs, probe), then the evidence and these records

### IR-004 — Delivery Local Fixes LF-1…LF-4 on the merged state

- Triggering role, report path, and round: delivery engineer (`/delivery_engineer`), its Local Fix request after merging origin/personal @ `74d046320a` (`7ac6b392c1`); evidence `DEL-03-web-typecheck.log`, `DEL-13-e2e-prompts-and-runtimes.log`, `DEL-17-rerun-open-task-tree.log`, `DEL-19-ot1-wait-diagnostic.log`, `DEL-30-prompt-reader-files.md`
- Triggering finding IDs: LF-1, LF-2, LF-3, LF-4
- Classification: `Local Fix`
- Prior authoritative result: IR-003 (`f393f403d5`), passed in CRR-004 and CRR-005
- Current authoritative result: implemented in `27498a16ac`; checks IMP-23…IMP-26
- Related solution revision IDs: SR-009 (no requirement or design change)
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: CRR-004, CRR-005
- Related API/E2E revision IDs: API/E2E round 1 (API-10) and its later rounds
- Related delivery revision IDs: the delivery engineer's merged-state round (DEL-01…DEL-30)
- Why this revision exists: the base's new offline demo world (autobyteus-279) and a TESTING.md rule added on the base reach this ticket's clean cut and prompt change; OT-1 read the catalog without the wait its rewrite needed.
- Implementation delta:
  - LF-1 `autobyteus-web/demo/graphql/definitions.ts`: the `AgentDefinition` fixture drops `semanticMemoryEnabled` and gives `semanticMemoryPath` the demo node's folder, `/demo/memory/semantic/<encodeURIComponent(id)>` (demo IDs are short, so the name is the full encoded ID).
  - LF-2 `collaboration-prompt-wording.e2e.test.ts`: `collaborationPart` also ends at `## Semantic Memory` and at `## Global Semantic Memory` (the latter for a run whose own folder could not be prepared, DEC-015).
  - LF-3 `open-task-tree-upgrade-startup.e2e.test.ts` OT-1: waits up to 60 s (the `until` helper, as IA-03) until the worker's episodes include the three closed runs, then asserts; on a timeout it reads once more so the assertion names the missing run. OT-2 is left as it is: it reads runs that were on disk before its server started, and the episodes query waits for the catalog's start pass (N-9).
  - LF-4 `personal-settings-service.ts`: the class comment no longer lists a semantic memory switch.
- Other readers checked for the same race (asked by delivery): `task-agent-own-run-startup` reads hand-built runs on disk before its server starts (start pass, N-9); `agent-semantic-memory` SM-10 asserts an absence; `internal-agents` IA-03 already waits; `memory-explorer-graphql` composes its catalog itself. None stale.
- Kept: the delivery engineer's `icons:build` commit `a1df50ecd4` (the `heroicons:user` icon the Memory components name), as asked; no other way is needed.
- Commits: `27498a16ac` (fixes), then the evidence and these records

