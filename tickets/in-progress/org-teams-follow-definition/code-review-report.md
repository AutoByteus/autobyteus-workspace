# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; SR-016..SR-018 change no approved requirement; REQ-007/AC-006 conversion keeps every reference)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-018)
- Design Spec Reviewed As Context: `design-spec.md` (§ SR-016, § SR-017, § SR-018 Revisions)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md` (§1, §7, §9 as extended by SR-017), `release-notes.md`; delivery's DR-001
- Relevant Solution Revision IDs: SR-016, SR-017, SR-018
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-011, ARCH-REV-012, ARCH-REV-013 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-011, ARCH-REV-012, ARCH-REV-013
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (§ IR-006)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-005, IR-006
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-011`
- Current Review Round: `11`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1):
  - The base's own changes (autobyteus-587, -599, -579) were reviewed in their own tickets. This round covers:
    - this ticket's side of the two merges (`21622d75e9`, `b933110420`): the Org-hosting files stay deleted; `remoteNodeOf`; FU-003 on the base's node path;
    - all new code of `dd310a30eb`, read in full: `org-path-rewrite.ts` (new); the migration's step order; `org-conversion.ts`, `org-log-split.ts` and the follow-ups;
    - the new tests.
  - I re-traced the conversion order from the migration runner and ran the gate.
- Trigger: IR-008 (`26c6240f33`) ready for a targeted delta review of CRR-010's CR-008 remainder (this report keeps CRR-009's IR-006 audit and the IR-007/IR-008 deltas below)
- Prior Review Round Reviewed: CRR-010 (Fail)
- Latest Authoritative Round: 11
- API/E2E and delivery records: API-REV-003 (Pass, before IR-006); delivery DR-001 (integration blocked, the cause of SR-016)

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, branch `codex/org-teams-follow-definition`, HEAD `26c6240f33` (IR-008 and IR-007 on IR-006 `dd310a30eb`; merges `21622d75e9` with `f2c0d2a902` and `b933110420` with `a07d6fbac8`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None (unchanged from CRR-001).

## Review Scope

- SR-016 (merge), checked:
  - Every Org-hosting file this ticket deleted stays deleted after both merges: each file deleted in `9f6add773b..46e53e9ed0` was checked for existence at HEAD, and none reappeared. No `AgentOrgRun` / `AgentOrgRunMessageDelivery` / `AgentOrgExecutionScopeBuilder` remains in `src` outside the tree schema's name.
  - `LiveAgentOrgContainer.remoteNodeOf()` returns `null` (`live-agent-org-container.ts:134`).
  - FU-003's receiver sits on the base's node path: `peer-gateway.ts:404-405` `peerRunMembers` through `admit`, composed in `remote-collaboration-composition.ts:115`; the composition still imports no `projects/` (architecture tests green).
  - Tests: the container in `ActiveCollaborationRootDirectory` answers `remoteNodeOf` null and hosts no agent. A peer file to a Team unit's member lands in `agent_teams/<teamRunId>/<member>/received_files/<sender>/` and the log names it. Both an agent unit and a Team unit's member renew a lost session with the hand-over notice first (real supervisor).
- SR-017/SR-018 (conversion), traced from the runner:
  - `migrate` classifies every Org; the wait now spans reader **and** path-writer predecessors (`waitingFor`).
  - For each pending Org, `convertOne` runs `convertReleasedOrg`: plan the split, renames, unit files, unit logs, remove the Org log. The container file is **no longer written there**. In a `finally`, the Org's committed moves are taken from its released tree (`committedMovesOf`: target present, source gone), also when a step failed.
  - Then one `rewriteMovedFolderPaths` over every candidate: `agents/*` and `agent_teams/*` logs and sidecars through the frozen visitor; agent runs' own `communication_messages_*` (added); traces of agent folders and Team member folders with an unterminated tail kept; ad-hoc `task.json` and comments (added).
  - Then `writeConvertedContainer` per Org whose pass part succeeded.
  - A follow-up (`passOverConverted`) adds converted Orgs' moves from their container files (units and former units).
  - `removeOrgLog` before the container file: a retry finds no Org log, keeps the unit logs, and the pass revisits them. That matches SR-018.
  - The rewrite: an exact prefix map after `path.resolve`, keeping the relative remainder. Values that are not absolute, or are outside every prefix, come back byte for byte; whole-file atomic writes; unchanged lines kept by the frozen visitor.
  - Failure handling: an unreadable candidate fails every Org's part; a file that fails to rewrite fails the Orgs it names. Their container is not written, so the next start repeats.
- Gate run by me:
  - `node scripts/typecheck.mjs`: production 0 errors; tests 973 in 300 files, equal to the merged baseline. PASS.
  - `vitest run tests/unit/agent-org-execution tests/unit/agent-collaboration tests/unit/remote-collaboration tests/unit/agent-communication tests/unit/agent-team-execution tests/unit/agent-execution tests/unit/run-history tests/unit/api tests/app-data-migrations tests/architecture tests/integration/agent-org-execution`: 514/515 files (4 skipped), 4244 tests passed, 8 skipped.
    - The one failure, `web-generated-graphql-current`, needs `pnpm`, which the platform restart removed from `/tmp`.
    - Rerun with corepack `pnpm`: passes. 0 product failures.
- Explicit exclusions: built-server, two-node and real-runtime reruns belong to API/E2E after this round (the implementation engineer reports two-server 62/62, OF 6/6, AOML 2/2, OC + stopped-org 14/14).

## IR-007 Delta (CRR-010)

- **CR-009: resolved.** `org-units-remote-files-and-renewal.test.ts:86`: an agent unit's own standalone root (its run file has `containedIn`) places a peer file by run ID in `agents/<runId>/received_files/<sender>/<name>`, and the log line and the agent's input name it.
- **CR-008: partly resolved.**
  - `moveNeedles(moves)` now gives, per Org, each move's resolved old folder in two forms: raw and JSON-encoded. `movedPath` takes injectable `PathSemantics`, and the tests run a real pass with `path.win32`.
  - That covers a Windows path stored with **backslashes**, which is the shape 587's received-file paths have (built with `path.join`).
  - It does not cover the other stored shape SR-017 names. A member's own file it names in `send_message_to(reference_files)` is normalized before storage by `normalizeExplicitAbsoluteLocalReferenceFiles` → `normalizeAbsoluteLocalReferenceFilePath` → `normalizeAgentRunFilePathDisplay` (`agent-run-file-path-identity.ts:20-21`: `value.replace(/\\/g, "/")`), on every platform. On Windows that line stores `C:/Users/…/agent_orgs/<org>/<unit>/notes.md`.
  - **Measured** with the implementation's own needles: `JSON.stringify({referenceFiles:["C:/Users/u/.autobyteus/memory/agent_orgs/org1/team1/notes.md"]})` contains neither `C:\Users\u\.autobyteus\memory\agent_orgs\org1\team1` (raw) nor its JSON-encoded form. Yet `path.win32.resolve(stored).startsWith(from + "\\")` is `true`, so `movedPath` would map it if the file were parsed.
  - So a file whose only old path is an agent-named one (SR-017's "member line forwarding its own folder file to a delegated run", in that run's log) is skipped on Windows, and the container file is still written. That is MP-CR-03 again for this shape.
- Gate on `d2fb8782bd`:
  - typecheck PASS (973);
  - `tests/app-data-migrations tests/unit/agent-org-execution tests/unit/remote-collaboration tests/architecture`: 132 files, 1030 tests pass.

## IR-008 Delta (CRR-011)

- **CR-008: resolved.**
  - `moveNeedles` adds each move's resolved old folder with forward slashes (`from.replace(/\\/g, "/")`; its JSON encoding is the same text). Together with the raw and JSON-encoded backslash forms (IR-007), every stored shape the app writes on Windows is found: 587's `path.join` paths and agent-named reference files normalized by `normalizeAgentRunFilePathDisplay`. On POSIX the three forms collapse to one (a `Set`).
  - `movedPath` keeps a forward-slash Windows path in that form (`slashes`: `sep` is `\\`, the value has `/` and no `\\`), so the rewritten value matches the app's own normalization. A second pass finds no old form, so it is idempotent by structure.
  - A lower-case drive letter stays unmatched, consistent with the app's case-sensitive comparison (`isAgentRunFilePathWithinRoot`).
- Test: "CRR-010: a Windows path the app stored with forward slashes … is found and moved, in its form" (`path.win32`). **Control (mine):** with the forward-slash needle removed, it fails (1 failed / 13). Restored: 13/13. Worktree clean.
- Gate on `26c6240f33`:
  - typecheck PASS (973);
  - `tests/app-data-migrations tests/unit/agent-org-execution tests/unit/remote-collaboration tests/architecture`: 132 files, 1031 tests pass.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-007/AC-006: a converted Org keeps every conversation, message, memory folder, Task link and history entry. SR-017 adds that stored typed paths into a moved member folder follow it. SR-018 makes the container file the one completion marker, written only after every candidate file was visited with the Org's moves.
- Design-spec behavior map verified against the implementation: Yes on Linux and macOS. **Not on Windows**, a shipped platform (RELEASE.md: "the Windows `.exe`"): CR-008.
- Behavior-basis status: `Confirmed` (after IR-007/IR-008, the completion marker's meaning holds on Windows too).

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| SR-016 base behaviors in units | Confirmed | Traced above | Agent-unit cross-node file case not tested (CR-009) |
| SR-017 typed path rewrite (POSIX) | Confirmed | Traced above; beta.7 cross-node fixture test: every typed entry names the new folder, the Org route and the units' readers open it, prose and foreign paths stay; re-run changes no byte | — |
| SR-017/SR-018 on Windows | Confirmed after IR-008 (was **Contradicted** at IR-006) | The byte pre-check needle is `Buffer.from("agent_orgs/<orgRunId>/")` (`org-path-rewrite.ts`, `rewriteMovedFolderPaths`). Every candidate is JSON or JSON lines, and a Windows path in JSON is stored as `C:\\…\\agent_orgs\\<orgRunId>\\…`. **Measured:** `JSON.stringify({referenceFiles:["C:\\Users\\u\\.autobyteus\\memory\\agent_orgs\\org1\\team1\\received_files\\a.txt"]}).includes("agent_orgs/org1/")` → `false`. So on Windows no candidate is ever parsed, no path is moved, the pass "succeeds", and the container file is written | Earlier migrations in this repository handle Windows paths (`path.sep`/`win32` in `team-agent-memory-layout`, `agent-org-flat-team-families-v1`, `team-context-file-execution-locators-v1`, …) |
| SR-018 step order and retry | Confirmed | Container file last; interrupt-before-pass, interrupt-after-pass, failed-Org-isolation, writer-wait and late-writer follow-up tests | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-14 upgrade a Windows install whose Org received a file from another node (or named a member file) | REQ-007, AC-006, SR-017, SR-018 | Operational | Upgrade | Keep every reference | Startup migration | Normal | Runner → `convertOne` → `rewriteMovedFolderPaths` (pre-check never matches) → `writeConvertedContainer` | Every typed path still names `agent_orgs\<org>\<unit>\…`, which no longer exists: references broken; the Org is marked converted, so no later start repairs it | Read; measured needle | Supported Normal Scenario (Windows is a release platform; 587's cross-node files shipped in `v1.5.14-beta.7`) | Use |
| S-15 a file from another node to an agent unit | SR-016 Tests | System | Peer agent | The file lands in the agent unit's own folder | Peer `acceptPeerRunMessage` | Normal | The standalone root's 587 path | Not shown by a test of this ticket | Test list in § SR-016 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-34 | The pre-check needle is POSIX-only; on Windows the pass skips every file and the container is written anyway | S-14; SR-018 ("its existence means every candidate file was visited with that Org's full map") | Upgrade on Windows | Broken references, marked done; a sealed-file one-time change never happens | Read; needle measured | **Promote** | This ticket (introduced by IR-006) | CR-008. The design's string is POSIX shorthand; its intent (skip files without the old prefix) is clear |
| C-35 | The SR-016 test list asks for a cross-node file to an agent unit as well; only the Team unit's member is tested | S-15 | — | An agent unit goes through the standalone root and its builder, a different 587 wiring from a Team root | Test file `org-units-remote-files-and-renewal.test.ts:53-82` | **Promote** (minor) | This ticket | CR-009 |
| C-36 | An unreadable unrelated candidate fails every pending Org's pass, so no Org converts until it is readable | SR-018 | Permission error on one file | Orgs stay released (not loaded) with a FAILED detail naming the file; the next start retries | Code read | Reject | — | Infrastructure failure (Principle 6). Conservative and reported; it never marks an Org done falsely |
| C-37 | Path-writer predecessors join the wait: a stuck non-terminal writer (e.g. a June raw-trace migration) holds every Org | SR-018 / R-4 (c) | — | As designed and reviewed (ARCH-REV-013) | Design | Reject | — | Design-owned, same rule as readers since IR-001 |
| C-38 | Node sizes for the cost measurement are assumed (handoff note 1) | Migration Plan acceptance | — | 838 ms on the synthetic large Org plus about 140 MB of synthetic node data | Handoff | Reject as a defect | — | Never reading user data is right. The Solution Designer may give real layout sizes; noted for API/E2E or delivery |

## Structural / Design Checks

| Check | Result (`Pass`/`Pass — deviation recorded, reason holds`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | — | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | SR-017/SR-018 met on every platform after IR-007/IR-008 | — |
| Data-flow spine inventory clarity and preservation | Pass | Classify → units → one pass → container last | — |
| Ownership boundary preservation and clarity | Pass | One module owns the path map and the pass; the frozen visitor owns the record formats | — |
| Off-spine concern clarity | Pass | — | — |
| Existing capability/subsystem reuse check | Pass | Frozen `transformContextFileRecordLocators` / `listContextFileRecordSources` reused; additions only where the visitor does not reach | — |
| Reusable owned structures check | Pass | `FolderMove`, `movedPath` | — |
| Shared-structure/data-model tightness check | Pass | — | — |
| Repeated coordination ownership check | Pass | One place maps paths (unit logs included) | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Migration main 226, `org-path-rewrite.ts` 174 effective lines | — |
| Ownership-driven dependency check | Pass | Architecture tests green after the merges | — |
| Authoritative Boundary Rule check | Pass | — | — |
| File placement check | Pass | Frozen with the migration | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass — deviation recorded, reason holds | `OrgContainerPort` (ten read-only methods), unchanged | — |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Pass | Doc comments now match the order (`removeOrgLog`, `convertReleasedOrg`) | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | `notesOf` shared by both item kinds | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Windows forms and the agent-unit 587 case added | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `released-org-tree-v1-fixtures.ts` extended with the beta.7 shape | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | `remote-message-routing.test.ts` dropped (deleted on the base; this ticket's edit only removed the Org root case) | — |
| API/E2E readiness for the next workflow stage | Pass | Gate green | — |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines at HEAD: `agent-org-units-own-runs-v1-app-data-migration.ts` 226; `org-path-rewrite.ts` 174 (new); `released-org-tree-v1.ts` 143; `org-unit-targets.ts` 133; `org-conversion.ts` 124. All pass.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Readers unchanged; no lasting mapping (SR-017 option (a)) |
| No legacy old-behavior retention in changed scope | Pass | Org-hosting code from the base not ported |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Every stored path form on every platform |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done (`agent_orgs.md`, `release-notes.md`). CR-008 is fixed, so the release notes' path-move statement holds on every platform.

## Additional Material Premise Validation (When Required)

### `MP-CR-03` — the completion marker means every candidate was visited with the Org's map

- Origin: `New`
- Related approved requirement or established contract: SR-018 step 4; REQ-007/AC-006
- Relevant behavior ID(s): S-14
- Coherent product goal or governing event: upgrade keeps every stored reference
- Scenario validity: `Supported Normal Scenario` (Windows desktop release; cross-node files shipped in beta.7)
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger: first start of the new build on a Windows install with an Org that received or named files
- Support evidence: RELEASE.md platform list; design § SR-017 evidence (587 since `v1.5.14-beta.7`)
- Forward path: runner → `rewriteMovedFolderPaths` → pre-check `bytes.includes("agent_orgs/<id>/")` false for JSON-escaped Windows paths → no parse → `writeConvertedContainer`
- Lifecycle preconditions and material consequence: the Org is marked converted with every typed path still naming the old folder. No later start revisits it (classified done), and follow-ups only add moves for writer predecessors' files.
- Reachability: `Reachable` (the needle is measured; the platform is shipped)
- Review consequence: CR-008 (`Local Fix`)

## Review Scorecard (Mandatory)

- Overall score: `9.45/10` (simple average; not the decision rule). Pass bar: at least 9.4 in every category (user's standing instruction).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | One completion marker, one pass, the order SR-018 decides | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | Path map in one frozen module; container hosts nothing after the merge | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | — | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | — | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | Frozen visitor reused | — | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Clear headers with the predecessor evidence | — | — |
| `7` | `API/E2E Readiness` | 9.4 | Conversion tests with real `path.win32` passes for every stored form; agent-unit 587 case; reruns named | — | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | The completion marker holds on every platform; stored forms kept | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | — | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Org-hosting code from the base not ported; stale test dropped | — | — |

## Findings

No open findings.

| ID | Finding | Evidence | Required Action | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| CR-008 | — | IR-007 (backslash raw and JSON forms) + IR-008 (forward-slash form); `path.win32` pass tests; control | — | Resolved | — |
| CR-009 | — | `org-units-remote-files-and-renewal.test.ts:86` | — | Resolved | — |

## Follow-ups

- Follow-ups this review added: None.

## Classification

- N/A (Pass). Large/High preserved.

## Recommended Recipient

API/E2E engineer (implementation review passes), then the informational note to the implementation engineer. The next API/E2E round covers IR-006..IR-008: the migration suites, OC-11/OC-12, the two-server file (62 cases), OF, AOML, OC + stopped-org, and the SR-017 conversion on the built server (a released Org whose member received a file from another node and forwarded its own file, if feasible).

## Residual Risks

- Cost measured with assumed node sizes (C-38); real layout sizes from the Solution Designer would firm it up.
- A non-terminal path-writer predecessor holds every Org (C-37, design-owned).
- FU-001 remains.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (MP-CR-03 resolved)
- Score Summary: 9.45/10 average; every category at least 9.4
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: SR-016..SR-018 are implemented and correct on every platform. CR-001..CR-009, N-1, F-1..F-5 and A-1 are all resolved.
