# Code Review Report

## Latest Round: Implementation Review Round 4 (CRR-006)

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-006`. Prior: CRR-005 (the test review) `Pass`; the delivery engineer then reported Local Fixes LF-1…LF-4 on the merged state.
- Current Review Round: 4
- Trigger: IR-004, the delivery Local Fixes after the base refresh. `origin/personal` at `74d046320a` was merged as `7ac6b392c1`; HEAD was `e804d4d5f3`.
- Code reviewed: `27498a16ac`; records and evidence in `b4561b0b6d`. Also the delivery engineer's `a1df50ecd4`.
- Review Scope: `Targeted Delta Review`. Four files, no shared interface, data shape or spine change; every other check and score is carried forward from CRR-004.
  - Source: `autobyteus-web/demo/graphql/definitions.ts` (the base's new offline demo fixture) and a comment in `personal-settings-service.ts`.
  - Tests: `collaboration-prompt-wording.e2e.test.ts`, `open-task-tree-upgrade-startup.e2e.test.ts`.
- Checks not rerun (they ran on `27498a16ac`):
  - IMP-23: web typecheck, 0 production errors (DEL-03 had 1); demo specs 4 files, 15 tests; server typecheck at baseline.
  - IMP-24: the AC-002 grep on the merged tree finds only the retired-key drop list.
  - IMP-25: CPW 14/14.
  - IMP-26: OT 3/3 on each of two runs.

### Delta verdict

- **LF-1 (REQ-002, REQ-009).** The base's offline demo world built an `AgentDefinition` with the removed `semanticMemoryEnabled` and `semanticMemoryPath: null`, a production typecheck error that stops every desktop build. The fixture now gives a non-null path, `/demo/memory/semantic/<encodeURIComponent(id)>`, matching `semanticMemoryPath: String!`. For the demo's short ids it is the DEC-016 name. Non-blocking note: for an id over 200 encoded bytes it would not match the node's shortened name; the demo has none.
- **LF-2.** The test's collaboration excerpt now also ends at `## Semantic Memory` and `## Global Semantic Memory`, which REQ-001 and REQ-011 place after it. The excerpt's meaning is unchanged.
- **LF-3.** OT-1 waits up to 60 s for the three closed runs among the worker's episodes (the catalog takes a run within its quiet window, N-9), then reads once more so the assertion names a missing run. It is not loosened. OT-2 reads runs already on disk and waits for the start pass. The other episode readers were checked and none is stale.
- **LF-4.** The comment no longer names the removed switch (Core Principle 7: no stale text in touched files).
- **`a1df50ecd4` (delivery).** The generated icon bundle (`icons:build`) gains `heroicons:user`, which this branch's Memory components name. It is generated output, kept as is.
- No new findings. The two test files still need the proportional test review after API/E2E reruns them.

## Prior Round: Implementation Review Round 3 (CRR-004)

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-004` (prior: CRR-003 `Fail`, CR-002 `Design Impact`)
- Current Review Round: 3
- Trigger: IR-003, which implements SR-009 (passed in ARCH-REV-005; N-12…N-14). Requirements: REQ-001 and REQ-010 reworded, AC-013, AC-014, DEC-015, DEC-016.
- Code reviewed: `f393f403d5`; records and evidence in `effb76b6b3`. Delta: `git diff 2e5f786091 f393f403d5`. Of the commits in between, `e571b1dd9e` and `daba240ec1` are API/E2E's test edits and records.
- Review Scope: `Full Re-Audit` of the changed areas. The delta changes a shared interface (`prepareForRun` → nullable folders), the shared folder-name rule (semantic folder, episodic catalog folder, the `semantic_ws_` lookup), the prompt composer and two runtime owners. Every structural check was rerun on those files. Results for the untouched files (workspace and explorer enforcement, owner queries, web) are carried forward from CRR-001 and CRR-002, because their code is unchanged.
- Checks not rerun (they ran on `f393f403d5`):
  - IMP-17: 40 files, 381 tests; a negative control on the reviewed source fails all 16 new or changed tests, and shows an escape-only cut throwing `URIError` on a multi-byte id.
  - IMP-18: server impact run, 2,449 tests; typecheck at baseline.
  - IMP-19: RA-04, IC-01, RE-05, 11/11.
  - IMP-20: semantic memory and GraphQL e2e, 12/12.
  - IMP-21: rendered probe 38/38; SMV-100…102 open a file inside a shortened folder (N-12).
  - IMP-22: on the founder's node no folder name in `semantic/` or `episodic/` is over 200 bytes (names only).

### CR-002: resolved

- **Name rule (DEC-016).** The layout's private `definitionFolderName` is the only owner.
  - `encodeURIComponent(id)` when it is at most 200 bytes.
  - Otherwise `encodedPrefix(id, 120)`, then `#`, then the first 16 hex characters of `sha256(id)`.
  - `#` is always escaped by `encodeURIComponent`, so a shortened name never equals a full one.
  - The rule serves the semantic folder, the episodic catalog folder and the `semantic_ws_` lookup (through `folderOf`). The workspace id keeps the full encoded id.
- **Deviation:** the cut falls between characters, not only outside a `%XX` escape. `Pass — deviation recorded, reason holds.`
  - The reason is N-13's own purpose: the prefix must always decode.
  - A cut outside every escape can still separate the escapes of one multi-byte character (`…%E7`), and `decodeURIComponent` then throws. IMP-17 demonstrates this.
  - For ASCII ids, which include every bundled id, the two readings give the same name.
  - Unit cases put an escape at bytes 117–120 around the cut, plus a multi-byte id.
- **Catalog read-back.** `listCatalogDefinitionIds` keeps a folder only when the layout gives back that name for the decoded id.
  - A shortened name decodes to a different id that would re-encode with `%23`, so it is skipped.
  - A name the layout refuses (`%20`, which decodes to a blank id) is skipped instead of throwing.
  - The agent behind a shortened folder is reached through the runs discovery finds.
- **Contained preparation (DEC-015).** `prepareForRun` prepares each folder independently and logs `SEMANTIC_MEMORY_PREPARE_FAILED { definitionId, folder, reason }`, returning null for that folder.
  - The composer adds a section only for a non-null folder and still refuses a relative path.
  - Claude and Codex grant access only to prepared folders (`preparedSemanticMemoryFolders`).
  - AutoByteus, ACP and Antigravity pass the folders only to the composer.
  - N-14 holds: a repository grep shows no consumer treating null as "no semantic memory".
  - A layout-refused id (`..`) now gives a logged null instead of a failed start, which falls under DEC-015's "a name the file system refuses".

### Re-audit observations (CRR-004 candidates)

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CF-11 | A shortened catalog folder whose agent's runs are all gone is not found again at start, because its name cannot be decoded; it keeps its last `catalog.md` | Reject (residual, documented) | Runs leave the catalog live on delete (`runDeleted`), which rewrites the catalog. Only removing run folders while the server is stopped leaves this, and manual removal is outside the supported scenarios by default (Principle 6). Documented in `agent_episodic_catalog.md:33-34`. |
| CF-12 | `#` in a shortened folder path inside URLs (N-12) | Reject (verified) | The node-file loader encodes the path; the content route takes paths relative to the folder; `index.md` shows the name in a code span. The rendered probe opens a file inside a shortened folder (SMV-100…102). |
| CF-13 | Ids of 201–255 encoded bytes had valid full-name folders before and are now shortened | Reject (no data affected) | IMP-22: no such folder on the founder's node; DEC-016 records that nothing needs migrating. For another user's node with such an id, the old folder would simply not be found, with no data loss (the files stay). Worth a delivery note. |

## Prior Round: API/E2E Failure-Origin Review (CRR-003)

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-003` (prior: CRR-002 `Pass`)
- Review Scope: `N/A` (failure-origin round). The CRR-002 implementation-review result below stands except where this section updates it.
- Trigger: API-REV-001 `Fail`. Code tested: `cd26f4d913`. Reports: `daba240ec1`; test edits: `e571b1dd9e`.
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record reviewed: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001)
- Failing Scenario IDs (AC-001 / REQ-001, the application-owned run kind):
  - `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` RA-04;
  - `application-import-codex-launch.e2e.test.ts` IC-01;
  - `application-reload-repair.e2e.test.ts` RE-05.
- Exact command: after `pnpm -C autobyteus-server-ts build`, run `env -i PATH HOME=<temp> TMPDIR USER pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-import-codex-launch.e2e.test.ts --no-watch`
- Failure evidence: `evidence/API-10d-re05-launch-error.log` (`ENAMETOOLONG: name too long, mkdir '<memory>/semantic/team-local-agent%3Abundle-team__<hex>…%3Aresearcher'`, a 439-byte name), `API-10-server-e2e-suite.log`, `API-10b-failing-e2e-rerun.log`, `API-10c-three-files-branch-vs-base.log`
- Testing guideline read: `TESTING.md` (§ Rules; test-owned data only)

### The failing scenario is approved behavior

- REQ-001 lists "application-owned" among the run kinds whose start must prepare the agent's folder and add the section. The three tests launch a Brief Studio draft run through the real application path (`launchDraftRun`) and expect it attached.
- Scenario validity: `Supported Normal Scenario`. Any application with a bundled team-local agent, installed at a real path.
- The tests are valid, and nothing in the environment caused it. The cause is in production code.

### Production path of the failure (confirmed in code)

1. A bundled team-local definition id embeds the application's package path in hex (`application-bundles/utils/application-bundle-identity.ts:1-7`: `bundle-team__<hex("application-local:"+package path)>__<hex app id>__<hex team id>`). Its length grows with the install path.
2. `AgentMemoryLayout.definitionFolderName` uses `encodeURIComponent(id)` as one path segment (`agent-memory-layout.ts:35-36`), with no length rule. Any real install path takes the name past the 255-byte limit of macOS and Linux.
3. At base this stayed latent. `prepareForRun` returned null unless `semanticMemoryEnabled`, and bundled agents carry no switch, so no folder was ever created for them.
4. This change makes `prepareForRun` create the folder for every run (REQ-001), so `mkdir` throws `ENAMETOOLONG` and the run start fails, in every runtime owner, because the error is not contained.
5. The same helper names the agent's episodic catalog folder (autobyteus-493) and the Memory page's `semantic_ws_<encoded id>` lookup, so the rule is shared:
   - the catalog's write already fails for these agents; it is contained and logged (the 493 contract), so the agent has no `catalog.md`;
   - the Semantic tab's `SemanticMemoryWorkspace.open` gets `ENAMETOOLONG` from `lstat`, which reads as "missing", so the page would show the missing-folder state for good.

### Origin classification

- Origin: **design gap, carried into the implementation.**
  - The design kept the folder-name rule (`encodeURIComponent(definition id)`, "the same name as the semantic folder", shared with the 493 contract) and made folder creation unconditional for every run kind.
  - It did not check that every kind's definition id fits one file name.
  - The implementation follows the design.
- Earlier review gap: **yes, partly detectable.** Core Principle 1 asks to trace each kind and entry form, and REQ-001 names the application-owned kind. In CRR-001 I verified that every runtime path calls `prepareForRun`, but I did not trace a bundled id's form to the folder name. Grepping the id builders would have shown it. The architecture reviews missed it as well.
- Kind (ticket-scope): **this ticket.**
  - Can the ticket reach its goal as is? No: AC-001 fails for application-owned runs, and those runs cannot start.
  - Whose functionality is it? The folder rule this ticket makes unconditional.
  - The episodic catalog's missing `catalog.md` for these agents comes from the same rule and the same helper. It predates this ticket (493, contained). Fixing the shared rule fixes it too, so it belongs in the same decision rather than a separate follow-up.
- Classification: **`Design Impact`**, owned by the Solution Designer. It is not a bounded `Local Fix`, because it needs design decisions:
  1. **The folder-name rule for ids that do not fit one name:** for example, a readable prefix plus a stable hash when the encoded id is over the limit, keeping `encodeURIComponent(id)` for every id that fits. It must stay one rule shared by the semantic folder, the episodic folder (whose 493 contract says "the same encoded name"), the `semantic_ws_` workspace lookup, and the docs and glossary. The 493 contract change may need the Solution Designer's approval route.
  2. **Run start when preparation fails:** whether a start fails (as now), or the run starts without the section and with a warning. DESIGN.md rule 7 favors containing the failure to that one run; REQ-001 says every run carries the section. That makes it a requirement and design call.
  3. **Existing data:** folders under the current rule are never renamed (every id that fits keeps its name). Ids over the limit never had a folder, so no migration should be needed; the design should confirm.
- Requirement Gap? Not by itself: REQ-001 already says every run kind. Decision 2 may touch REQ-001's wording.
- Task size / risk: unchanged (`Large` / `High`).

### The round's other failures

- **API/E2E-owned, already planned as Next Round:** stale test doubles this change made untrue.
  - `agent-package-private-skills`, `configured-skill-on-demand-loading`: their doubles lack `getOrCreateRunWorkspace` and `getRegisteredWorkspaceRootPath`.
  - `memory-sync-multiprocess`: queries the removed `AgentWithMemorySummary.memory`.
  - `memory-sync-api`: its schema-only server sets no catalog binding (`EPISODIC_CATALOG_NOT_COMPOSED`). Both production composition roots set the binding, so this is a test-harness gap, not a product path.
  - These are `Local Fix` (API/E2E), after the design fix.
- **Load:** the six files that pass alone or fail on base too. No source origin.
- **Pre-existing:** FU-005 (`package-personal-settings` `afterAll` timeout, also on base) and FU-004 (imported team and org cards at 0, the same on base).

### CR-002 (new, CRR-003): a bundled team-local agent's run cannot start: its semantic folder name is too long

- Basis: REQ-001 and AC-001 (the application-owned run kind); Core Principle 1. Candidate CF-10 below, `Promote`.
- Evidence: the production path above; `API-10d-re05-launch-error.log`.
- Required response: a design revision (decisions 1–3 above), then implementation, a targeted source review and API/E2E. The fix should be pinned with a unit test, for example an id longer than 255 encoded bytes prepares a folder and opens in the Semantic tab and the episodic catalog.

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- |
| CF-10 (CRR-003) | `encodeURIComponent(definition id)` as a single folder name has no length rule; a bundled team-local id embeds the package path, and an unconditional `mkdir` fails the run start | REQ-001 / AC-001 (application-owned) | `application-bundle-identity.ts:1-7`, `agent-memory-layout.ts:35-36`, `agent-semantic-memory.ts` `prepareForRun`; API-10d | Promote | This ticket (`Design Impact`) | A length-safe, shared folder-name rule and a decision on start failure (CR-002) |

## Prior Round: Implementation Review Round 2 (CRR-002)

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-002` (prior: CRR-001 `Fail`, CR-001 `Local Fix`)
- Current Review Round: 2
- Trigger: IR-002, the CR-001 Local Fix
- Code reviewed: `cd26f4d913`; records and evidence in `2e5f786091`. Delta: `git diff cff2a6596a cd26f4d913`, two web files.
- Review Scope: `Targeted Delta Review`. The change stays within CR-001's file and behavior (`SemanticMemoryFolder.vue` and its spec): no server, shared interface, data shape or other component. Every other check and score is carried forward from CRR-001, whose evidence is still valid.
- Checks not rerun (they ran on `cd26f4d913`):
  - IMP-14: spec 7/7, plus a negative control: both new specs fail on the `cff2a6596a` component.
  - IMP-15: web impact rerun, 31 files and 181 tests passed; web typecheck PASS.
  - IMP-16: rendered probe 33/33.

### CR-001: resolved

- **The fix:** `registeredId` is kept from the moment of registration.
  - `release()` (on a folder or view change, and on unmount) unregisters it and starts a new generation.
  - The watcher releases first, then registers and records its own generation before awaiting.
  - A first listing that completes in an older generation sets nothing and shows no error.
  - A failure in the current generation releases, then shows the error.
  - The late listing writes only into the explorer state object it took before the await, so no store entry comes back. The spec asserts this after the late completion.
- **Specs** (on the real workspace store):
  1. Unmount while the first listing is pending: no `semantic_` entry and no `semantic_memory` metadata remain, also after the late listing completes.
  2. An agent change while pending: only the current folder's workspace is registered and shown.
- **REQ-007:** the folder view's workspace no longer outlives the view, so the chat and Run Settings menu cannot offer it.
- **Scores:** API/E2E Readiness 8.8 → 9.4; Runtime Correctness 8.9 → 9.4.
- **Unchanged:** FU-003 (the pre-existing skill-workspace exposure).

## Prior Round: Implementation Review Round 1 (CRR-001)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-008, Approved; the UI approved by the founder 2026-11-20)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, `global-semantic-memory-investigation.md` (through the design's citations)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008, consolidated)
- Supplemental Task Artifacts Reviewed As Context:
  - the Product UI/UX spec (normative; VIS-001…VIS-019), through the handoff's rendered-result check and the components;
  - `follow-ups.md` (FU-001, FU-002).
- Relevant Solution Revision IDs: SR-008
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004 `Pass`; N-5…N-11)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002 (N-4), ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: implementation ready for source review (Large / High route)
- Code reviewed:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent`, branch `codex/semantic-memory-for-every-agent`, base `8430d9ef12`;
  - code commits `56b02294d0`, `a9ca3c48c6`, `cff2a6596a`; `ecbb4741ca` holds the ticket records and evidence only.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The change spans every runtime's prompt and access, a new read-only workspace kind refused on every run path, a shared file-explorer option, a GraphQL clean cut, a process binding, and a rebuilt Memory page: 168 files.

## Review Scope

- Changed implementation and behavior reviewed: the whole source diff `8430d9ef12..cff2a6596a`, with depth by risk.
  - **Server, read in full:**
    - workspaces: `semantic-memory-workspace.ts`, `workspace-access-error.ts`, `workspace-path-utils.ts`, `workspace-manager.ts`, `filesystem-workspace.ts`;
    - file explorer: `file-explorer.ts`, `directory-traversal.ts`, `tree-node.ts`, the watcher runtime and protocol, GraphQL `file-explorer.ts`, REST `workspaces.ts`;
    - semantic memory: `agent-semantic-memory.ts`, the layout, the prompt composer and sections;
    - the five runtime owners and the Claude/Codex resolvers;
    - `episodic-catalog.ts` (read API and binding) and both composition roots;
    - owner queries: `agent-memory-explorer-service.ts`, `agent-episodes.ts`, `team-memory-explorer-service.ts`, `collaboration-root-memory-catalog.ts`, `team-root-memory-source.ts`;
    - GraphQL `memory-explorer.ts` and `semantic-memory-view.ts`.
  - **Web, read where they carry REQ-007 or lifecycle:** `SemanticMemoryFolder.vue`, `stores/workspace.ts` (register/unregister), `AgentMemoryPage.vue`, `MemoryBrowse.vue` (owner switch). Readers of the web store's workspace list: `ChatWorkspaceMenu.vue`, `ApplicationWorkspaceRootSelector.vue`, `runHistoryReadModel.ts`, mobile `useMobileLaunchWorkspaces.ts`.
- Existing code read to judge the change:
  - every caller that resolves a workspace id (repository grep);
  - `agent-run-provisioning-service.ts:225-320` (runs provision by root path; the input `workspaceId` is not used to choose the workspace);
  - `agent-provider-factory-builder.ts:223-240` (ACP Grok and DeepSeek, and Antigravity, get `ClaudeWorkspaceResolver`);
  - `file-explorer-stream-handler.ts` (PING only, no write commands);
  - the search strategies (`rg --files` without follow; the fuzzysort snapshot comes from the explorer's own tree);
  - `skillStore.ts` / `SkillWorkspaceLoader.vue` (the existing transient pattern).
- Explicit exclusions:
  - pixel conformance to VIS-001…019 (the rendered probe and its screenshots are the evidence; API/E2E owns the rendered checks);
  - a line-by-line read of every localization and generated file;
  - recorded checks were not rerun (no code changed after `cff2a6596a`).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: every agent and run kind gets its folder and the global folder with both sections, and Claude and Codex get access. The switch is removed as a clean cut, and stored keys are dropped at the next write. The Memory page is organized by owner. Folders are shown read-only: the node refuses writes, links and runs; the workspace is never listed or offered as a workspace and never creates the folder. Imported sources show a note.
- Design-spec behavior map verified against the implementation: yes, with the exception in CR-001 (the web keeps a folder workspace registered past its view in one supported sequence).
- Design review report and round confirmed: ARCH-REV-004 `Pass`.
  - N-8: the filter matches the in-memory summary, and availability is built per page (`agent-episodes.ts` `pageEpisodes`).
  - N-9: cards await `whenStartPassDone()`.
  - N-10: every runtime resolves through `getOrCreateRunWorkspace`.
  - N-11: confirmed. Provisioning ignores the input `workspaceId`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior | Status | Implementation path and evidence |
| --- | --- | --- |
| BEH-001 / BEH-005 (REQ-001, REQ-010, REQ-011) | Confirmed | `AgentSemanticMemory.prepareForRun(config.agentDefinitionId)` creates both folders. Every runtime passes both paths to the composer. The two sections are added unconditionally, and the DEC-013 text is exact (`carpenter-prompt-sections.ts`). Claude gets `additionalDirectories: [agent, global]`; Codex gets `writableRoots: [agent, global]`. |
| BEH-002 / BEH-003 (REQ-002…004) | Confirmed | The field is removed everywhere; IMP-12's grep shows only the retired-key drop list. `semanticMemoryPath: String!`. |
| BEH-004 server (REQ-005, REQ-007, AC-006, AC-011) | Confirmed | **Opening:** `SemanticMemoryWorkspace.open` uses `lstat`; a root that is missing or is a link is refused, and nothing is created. **Writes:** `resolveWritableWorkspace` → `assertWritable` before any file operation, for all five mutations. **Links:** `refuseLinkOnPath` in `fileContent` and `folderChildren`; the REST content and static routes use `resolveReadablePath`, answering 403 with the code. **Traversal and watcher:** the traversal and folder projection classify by `lstat`, links are leaves, and non-regular entries are skipped (N-4); the watcher uses `followSymlinks: false`, validated in the protocol. **Never listed:** `listVisibleWorkspaces` excludes `semantic_memory`. **Never run:** `getOrCreateRunWorkspace` refuses both before and after creation, on every runtime path and in published artifacts. |
| BEH-004 owners (REQ-006, AC-008, AC-012) | Confirmed | The catalog read API and binding (`EPISODIC_CATALOG_NOT_COMPOSED` when missing). Local cards and episodes come from the catalog after its start pass; an imported source gets one discovery per request; internal agents are hidden. Team and org members come from the definition, else from the newest stored run. Imported team cards at 0 use the unchanged `TeamRootMemorySource` listing, so this change did not cause it (Known Risks; API/E2E compares with base). |
| BEH-004 web lifecycle (REQ-007 "never appears in any workspace list or picker") | **Contradicted in one sequence** | See CR-001 |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal / Event | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-RUN | BEH-001/005 | System | Run start | Every run gets both folders | Any runtime, any run kind | Normal | DS-001 | Sections and access | REQ-001/010/011; IMP-04/06 | Supported Normal Scenario | Use |
| SCN-VIEW | BEH-004 | User | Founder on the Memory page | Read an agent's or the global folder | Agent page → Semantic; Browse → Global | Normal | DS-003 | Read-only tree, preview, links shown but not opened | REQ-005/007/012; IMP-13 | Supported Normal Scenario | Use |
| SCN-LEAVE | BEH-004 | User | Founder on the Memory page | Leave a Semantic tab or Global while its folder is still loading (the "Loading folder…" state the view shows) | Episodic tab, Back, or another page | Normal (leaving a loading view is an ordinary action; the state is designed and visible) | `SemanticMemoryFolder` watcher: register, then `await fetchFolderChildren`; meanwhile the unmount runs `release()` | The registration must not outlive the view (REQ-007) | Code below | Supported Normal Scenario | Use |
| SCN-OWNERS | BEH-004 | User | Founder | Browse by owner, local and imported | Memory → Browse | Normal | DS-002 | Cards, episodes, members | REQ-006; IMP-09, IMP-13 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- |
| CF-01 | `SemanticMemoryFolder.vue`: the watcher registers the workspace, then awaits `fetchFolderChildren`, and sets `workspaceId` only after the await. `release()` (run on unmount and on a re-run of the watcher) unregisters only `workspaceId.value`. If the view unmounts while the first listing is pending, the registration is never released, and the late completion sets `workspaceId` on a dead instance. | SCN-LEAVE; REQ-007 | `SemanticMemoryFolder.vue:69-98`. The leaked entry is `{ kind: 'semantic_memory', isTemp: false, workspaceConfig: { isTransient, readOnly }, name: <agent name> }`. `ChatWorkspaceMenu.vue:265-268` lists every `allWorkspaces` entry that is not temp, so the chat's and Run Settings' workspace menu offers a "workspace" named after the agent until reload, or until that folder is opened and left again. The node still refuses it as a run's workspace, so the harm is the listing, which REQ-007 forbids. | **Promote** | This ticket (new component; REQ-007) | `Local Fix` (implementation): no registration may outlive the folder view. Keep the registered id from the moment of registration so `release()` unregisters it even while pending, and drop a completion that is no longer current (a generation token, or a check that the instance and folder are still the ones that started it). Add a spec: unmount while `fetchFolderChildren` is pending, then assert the workspace is unregistered and the store holds no `semantic_memory` entry. |
| CF-02 | `ChatWorkspaceMenu` (and mobile `useMobileLaunchWorkspaces`) list every non-temp web-store workspace, transient skill workspaces included; `SkillWorkspaceLoader` has the same register-then-await pattern | Existing behavior | `ChatWorkspaceMenu.vue:265` is the same at base `8430d9ef12`; `SkillWorkspaceLoader.vue:35-48`; the run-history sidebar filters to filesystem and temp (`runHistoryReadModel.ts:129-135`) | Promote as **Follow-up** (FU-003) | Follow-up | Pre-existing for skills. With CR-001 fixed, a semantic workspace is registered only while its view is mounted, and the chat menu is never on the same screen (no keep-alive). Filtering pickers to filesystem and temp, as the sidebar does, would harden both. |
| CF-03 | `SemanticMemoryFolder` reused with new props while a fetch is pending could show the previous agent's folder | SCN-VIEW | `AgentMemoryPage` unmounts the folder when the pane leaves Semantic; moving to another agent always passes through its Episodic pane (`selectNode` sets no pane) | Reject (not reachable through the product's navigation) | — | — |
| CF-04 | Run provisioning resolves a `workspaceId` with `getWorkspaceById`, not the run guard | AC-011 | `agent-run-provisioning-service.ts:240-265`: `workspaceRootPath` is required, the workspace is `ensureWorkspaceByRootPath(root)`, and the input `workspaceId` is never used to choose it | Reject (not reachable) | — | Matches N-11 |
| CF-05 | Content route: a check-then-read gap (a link swapped in between `assertNoSymbolicLinkOnPath` and `createReadStream`) | REQ-007 | Needs an agent to replace a regular file with a link inside the window of one request | Reject (artificial timing) | — | — |
| CF-06 | A link created while the view is open arrives as a file row (Known Risks) | REQ-007 | Opening it is refused by the node; nothing outside is read | Reject (no consequence; documented) | — | — |
| CF-07 | Episodic-catalog process binding (`setProcessEpisodicCatalog` / `getProcessEpisodicCatalog`) | Principle 16; design Hidden dependency | Set right after creation, before GraphQL is registered; a missing one throws `EPISODIC_CATALOG_NOT_COMPOSED`; released at close in both roots, guarded to the same instance; no cycle; `stop()` settles `whenStartPassDone` so no reader hangs at close | Reject (`Pass — deviation recorded, reason holds`) | — | The design's three conditions hold |
| CF-08 | `agent-package-folder-watcher` failures in the full unit run | AC-011-like | Different cases fail each run; the file and its import closure are untouched by this change | Reject as this ticket's; same family as FU-003 of autobyteus-493 | — | Rerun on a quiet host (API/E2E) |
| CF-09 | Imported team and org cards measured at 0 | REQ-006 | The listing path for imported sources is unchanged (`TeamRootMemorySource`); the stderr shows older-layout packages not admitted (N-7 territory) | Reject as a finding; residual | — | API/E2E compares with base |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | One gate owner; one workspace manager decides read-only, listing and runnability; the explorer reads workspace properties only | — |
| Matches behavior-defining supplemental artifacts | Pass | Rendered probe 33/33 against the approved reference (IMP-13); the link-row order was fixed (`cff2a6596a`) | — |
| Data-flow spine clarity | Pass | DS-001…DS-003 traceable in code | — |
| Ownership boundary preservation | Pass | Only `AgentSemanticMemory` composes the paths; only `WorkspaceManager` creates workspaces and decides runnability | — |
| Off-spine concern clarity | Pass | `agent-episodes.ts`, `memory-group-members.ts`, `workspace-access-error.ts`: owner-local splits | — |
| Existing capability reuse | Pass | The Skills transient-workspace pattern, the file explorer and its tabs, the catalog, discovery | — |
| Reusable owned structures | Pass | `memory-run-subject.ts` shared by search and episodes | — |
| Shared-structure tightness | Pass | `AgentEpisode`, `MemoryGroupMember` as designed | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection check (Core Principle 13) | Pass | No pass-through layer; `resolveWritableWorkspace` and `getOrCreateRunWorkspace` each carry a rule | — |
| Separation of concerns and file responsibility | Pass | — | — |
| Ownership-driven dependency check | Pass | Directions as designed | — |
| Visible dependencies (Core Principle 16) | Pass — deviation recorded, reason holds | CF-07; the new explorer collaborators are constructor defaults | — |
| Authoritative Boundary Rule | Pass | Runtimes resolve through `getOrCreateRunWorkspace`; the resolver never calls discovery directly | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | Explicit selectors and kinds (`MemoryGroupKind`, attribution selector) | — |
| Naming and one vocabulary (Core Principle 15) | Pass | "Global semantic memory", "episodes", "owner" are in the glossary | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files (Core Principle 7) | Pass | `listAgentRunsWithMemory`, `AgentMemoryDetail.vue`, `AgentSemanticMemoryField.vue`, `unregisterSkillWorkspace` (renamed), the field everywhere | — |
| Test scenarios requirement-aligned | Pass | Per-runtime units (no field, `false`, `true`); every mutation byte-identical; the content route returns 403; a chokidar negative control; the binding; the AC-012 measurement | — |
| Test fixtures and structure | Pass | Unit tests now inject a test-owned `AgentSemanticMemory`; the stray folders were deleted | — |
| No stale or compatibility-only tests | Pass | — | — |
| API/E2E readiness | Pass (CRR-002; CRR-001 Fail) | CR-001 is resolved | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Check | `>220` Delta | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-agent-run-backend-factory.ts` | 496 | 499 | Pass (under; a nearby `throw` compacted) | Pass | — |
| `build-studio-server.ts` | 434 | 439 | Pass | Pass | — |
| `file-explorer.ts` | 403 | 428 | Pass | Pass | — |
| `start-standalone-application-host.ts` | 404 | 410 | Pass | Pass | — |
| `agent-memory-explorer-service.ts` | — | rewritten, under 400 | Pass | Pass (rewrite with owner-local splits) | — |
| web `AgentDefinitionForm.vue` / `FileItem.vue` / `memoryExplorerStore.ts` / `workspace.ts` / `MemoryBrowse.vue` | 495 / 397 / 378 / 438 / 0 | 487 / 427 / 407 / 457 / 186 | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No deprecated GraphQL field or alias query; an old `view=` address opens Browse |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`; the key is dropped at the next write; nothing rewritten |
| No version-specific dual reads | Pass | — |
| Transition mechanics | N/A | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, updated in the change: server module docs, web `memory.md`, `agent_management.md`, `GLOSSARY.md`. The fix for CR-001 needs no doc change.

## Additional Material Premise Validation

None new beyond the gate above. N-5…N-11 are confirmed as recorded.

## Review Scorecard (Mandatory)

- Overall score: `9.3/10` (simple average for trend only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Three spines, each traceable | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner each for paths, workspaces and runnability | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit selectors, kinds and codes | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Owner-local splits | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | — | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | — | — | — |
| 7 | API/E2E Readiness | 9.4 (CRR-002; CRR-001 8.8) | Strong node-side refusals and tests; CR-001 fixed and covered by two specs with a negative control | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 (CRR-004; CRR-003 8.6) | Node enforcement is complete; the web registration lives only as long as its view; one length-safe folder-name rule; preparation failures are contained to the folder | CF-11 residual (documented) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | A clean cut | — | — |
| 10 | Cleanup Completeness | 9.4 | — | — | — |

## Findings

### CR-001 — The folder view's workspace can outlive the view and appear in the workspace menu (REQ-007)

- **Basis:** REQ-007, "The folder view's workspace never appears in any workspace list or picker". Scenario SCN-LEAVE (Supported Normal); candidate CF-01.
- **Evidence:** `autobyteus-web/components/memory/SemanticMemoryFolder.vue`.
  1. The second watcher calls `release()`, then `registerSemanticMemoryWorkspace(...)` (returns `id`), then `await fetchFolderChildren(id, '')`, then `workspaceId.value = id`.
  2. `release()` and `onBeforeUnmount(release)` unregister only `workspaceId.value`, which is still `null` during the await.
  3. So the registration leaks when the view unmounts while the first listing is pending: the user leaves during the visible "Loading folder…" state, by Episodic, Back or another page.
- **Consequence:** the leaked entry (`kind: 'semantic_memory'`, `isTemp: false`, named after the agent) remains in `workspaceStore.workspaces`. `ChatWorkspaceMenu.vue:265-268` lists every non-temp entry, so the chat and Run Settings workspace menu offers it until reload, or until that folder is opened and left again. The node still refuses it as a run's workspace, so nothing is written. The listing is what REQ-007 forbids.
- **Required action (`Local Fix`, implementation):**
  - Make the registration's lifetime the view's: remember the id when it is registered, so `release()` unregisters it while the listing is pending.
  - Ignore a listing that completes after the view or folder has changed (a generation token or equivalent).
  - Add a component spec: unmount during a pending `fetchFolderChildren`, then assert the workspace is unregistered and the store holds no `semantic_memory` entry.
- **Ticket scope:** this ticket. The component is new, and REQ-007 is in scope. The broader exposure of transient skill workspaces in the same menus predates this change and is FU-003.

## Follow-ups

- Follow-ups this review added: FU-003. `ChatWorkspaceMenu` (and the mobile launch picker) list every non-temp web-store workspace, transient ones included; `SkillWorkspaceLoader` has the same register-then-await pattern. Pre-existing for skill workspaces.

## Classification

- CRR-006: N/A (Pass). CR-001 and CR-002 are resolved.

## Recommended Recipient

CRR-006: `/api_e2e_engineer` (primary pass rule: rerun the two changed e2e files on the merged state), with an informational notice to implementation. The proportional test review follows API/E2E's pass.

## Residual Risks

- Imported team and org cards measured at 0 on the founder's import, through the unchanged path (older-layout packages not admitted). API/E2E compares with base.
- The live SML-GLOBAL run, `test:integration` and the full E2E suite are still to run; the folder-watcher timing failures need a quieter host.
- Catalog latency after a restart (N-9; the spec's loading state).
- A link created while the view is open shows as a file row until the folder is reloaded, and the node refuses opening it (documented).

## Latest Authoritative Result

- Review Decision: `Pass` (CRR-006, implementation review round 4, Targeted Delta Review of the delivery Local Fixes LF-1…LF-4). Earlier: CRR-004 `Pass` (CR-002 resolved); CRR-003 failure-origin `Fail`.
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: every category ≥ 9.4; average 9.5
- Failure Origin: N/A
- Recommended Recipient: API/E2E
- Failure Origin (CRR-003): a design gap carried into the implementation. The folder-name rule fails for long ids, and the run start is not contained. Partly detectable in CRR-001 (an earlier review gap).
- Notes:
  - Node-side enforcement (write, link, run, list refusals) is complete and verified on every runtime path.
  - The four points the handoff raised:
    1. Workspace refusals: pass.
    2. The process binding: pass (CF-07).
    3. The watcher flake: not this ticket's.
    4. Imported team cards: not this ticket's; a residual for API/E2E.
