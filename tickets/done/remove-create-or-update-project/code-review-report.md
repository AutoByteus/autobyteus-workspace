# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (`Approved`, SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (SRC-01..SRC-08, as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `tickets/done/project-tool-split/` (origin; read-only)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Pass; R-1..R-3)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Targeted Delta Review` (round 2). Round 1 was a `Full Review` of `6ba0389741` and `fec0ad5449`.
- Review Scope Evidence (round >1): `git diff fec0ad5449..4807095aed -- autobyteus-server-ts` changes only two lines: `export` is dropped from `parseCreateProjectInput` and `parseUpdateProjectInput` in the contract. That is the file and item of CR-001. No shared interface, data shape, spine or other file changed. All other round-1 evidence carries forward.
- Trigger: Implementation Engineer Local Fix handoff (IR-002), commit `4807095aed` on `codex/remove-create-or-update-project`, base `origin/personal` @ `2f211340ee`
- Prior Review Round Reviewed: 1 (CRR-001, Fail, CR-001)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change is deletions in three files under `src/agent-tools/project-tasks/`: contract 226→206, manifest 112→110 and native 60→54 effective lines. The risk is High because a public agent tool contract and its protected name are removed.

## Review Scope

- Changed implementation and behavior reviewed:
  - removal of `create_or_update_project` from the contract (name set, type, description, schema), native registration and manifest;
  - removal of the dead `effectiveProjectTaskToolName` and `EffectiveProjectTaskToolName`;
  - dispatch back on `name`;
  - the skip path for definitions that still list the old name.
- Files / areas reviewed:
  - the three source files (full diff);
  - `project-task-tools.test.ts`, `project-tool-runtime-parity.test.ts`, `autobyteus-agent-tool-resolver.test.ts` and `project-task-boundaries.e2e.test.ts`;
  - the three docs, `team-status-live-probe.mjs`, `release-notes.md` and `evidence/new-build-probe.txt`.
- Explicit exclusions: the exposure, resolver and catalog code (unchanged; its skip behavior is covered by the new tests); the AC-006 real-app check (owned by API/E2E).
- Checks I ran myself:
  - `vitest run` on the three changed unit files: 113 passed.
  - `pnpm typecheck`: clean.
  - `git grep create_or_update_project -- ':!tickets'` returns only:
    - the skip and exact-set tests (DEC-003);
    - the migration fixture (DEC-002);
    - `.github/release-notes/release-notes.md` (DEC-004).
    This matches AC-004.
  - `git grep` finds no `effectiveProjectTaskToolName`, `EffectiveProjectTaskToolName` or `CreateOrUpdateProjectTool` outside `tickets/`.
  - An importer count for every export of the three touched files (this is how CR-001 was found).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
- Design-spec behavior map verified against the implementation: Yes (DS-001, DS-002).
- Design review report and round confirmed: ARCH-REV-001, round 1, Pass.
  - R-1 is applied: the exact-set test covers the contract, the MCP adapters and the native registry, and old-name negative checks appear only inside the skip tests.
  - R-2 is applied: the probe lists the four current mutation tools.
  - R-3 is applied: whole doc passages were removed.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `PROJECT_TASK_TOOL_NAMES` and `ProjectTaskToolName` hold the six current names. `PROJECT_TASK_TOOL_MANIFEST`, and therefore the MCP adapters and `protect_static_adapter`, is derived from that set. `registerProjectTaskTools` registers six classes. Dispatch in both `parseProjectTaskToolInput` and `executeProjectTaskTool` is on `name`. The `create_project`/`update_project` branches are textually unchanged. | — |
| BEH-002 | Confirmed | Exposure drops the name: `isProjectTaskToolName("create_or_update_project")` is false. The AutoByteus resolver warns "not found in registry. Skipping." The MCP catalog filters the name out. The new tests check both host kinds on AutoByteus, Codex and Claude, including that every other listed tool remains and no error is logged. | — |
| BEH-003 | Confirmed | The deprecation passages are removed from server `projects.md`, `agent_tools_mcp_server.md` and web `docs/projects.md`. The ticket `release-notes.md` announces the removal (DEC-004). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001; REQ-001, REQ-003 | User | user / configured agent | create or update a Project | tool picker; `create_project` / `update_project` calls | Normal | DS-001 | only the two tools exist, and they are unchanged | requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002; REQ-002 | System | agent with an older definition | keep working after the upgrade | run launch | Normal | DS-002 | launches; old name skipped | the PTM package still lists the old name | Supported Normal Scenario | Use |
| SCN-003 | BEH-003; REQ-004..006 | Contract | user reading docs / release notes | know the tools | docs / notes | Normal | — | current docs; removal announced | requirements SCN-003 | Supported Normal Scenario | Use |
| ENG-007 | Core Principle 7 (No Dead Code) | Contract | team engineering contract | touched files carry no dead code | touched source files | Normal | — | nothing in a touched file is unreachable or unimported | `design-principles.md` §7 | Supported Normal Scenario (governing contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | `parseCreateProjectInput` and `parseUpdateProjectInput` are still exported, but nothing imports them anymore | ENG-007 | this change removed their only importer: `project-task-tools.test.ts` line 18 imported them for the deleted old-tool parity assertions (base lines 179-180) | Both functions are still called inside the contract by `parseProjectTaskToolInput`, so only the `export` is dead. The export misleadingly suggests external consumers. No runtime effect. | `git grep` over `src`, `tests` and `autobyteus-web` finds no importer outside the contract file. The importer count for every export of the three touched files shows these two are the only unimported exports. | Promote | This ticket (the change created the dead export in a touched file; Principle 7) | Drop `export` from both functions. Bounded Local Fix. |
| CAND-002 | The probe's manager now gets `create_task` and `update_task`, which it effectively lacked before | REQ-006; R-2 | — | the probe never calls them | design review R-2 | Reject | — | Accepted by design. Harmless. |
| CAND-003 | The exact-set registry check filters by `/project/` as well as `isProjectTaskToolName` | R-1 | — | this lets the check catch any extra project-named tool | test passes | Reject | — | It is intentionally broader, so not a defect. |
| CAND-004 | `.github/release-notes/release-notes.md` still says the old tool works | DEC-004 | — | the release step replaces the file | RELEASE.md, as recorded in DEC-004 | Reject | — | Delivery owns this. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Clean-cut removal of the transition dispatcher. | — |
| Matches behavior-defining supplements | Pass | None apply. | — |
| Data-flow spine clarity | Pass | DS-001 again dispatches directly on the tool name. | — |
| Ownership boundary preservation | Pass | Ownership of the contract, manifest and native files is unchanged. | — |
| Off-spine concern clarity | Pass | Protection still follows the name set. | — |
| Existing capability reuse | Pass | The existing unknown-name skip is used, with no new code. | — |
| Reusable owned structures | Pass | `workspacesDefinition` and `projectInput` are kept and both are used twice. | — |
| Shared-structure tightness | Pass | The identical `EffectiveProjectTaskToolName` type is removed. | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection | Pass | The dispatcher indirection is removed. | — |
| SoC and file responsibility | Pass | — | — |
| Ownership-driven dependency | Pass | The manifest's second contract import is gone. | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | The ambiguous two-meaning interface is gone. | — |
| Naming quality | Pass | — | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Pass | CR-001 is resolved in `4807095aed`: both parsers are now module-private. `git grep` finds only their definitions (l.114, l.124) and their calls in `parseProjectTaskToolInput` (l.204-205). | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | The exact-set test covers REQ-001. The skip tests cover REQ-002 on three runtimes and both host kinds, plus the resolver warning. The new tools' error table and results remain (AC-003). | — |
| Test fixtures/helpers reusable, structure coherent | Pass | The `exposures` helper now also returns the full lists for the skip checks. | — |
| No stale or compatibility-only tests | Pass | All old-tool tests were removed. Old-name references remain only within the DEC-003 exception. | — |
| API/E2E readiness | Pass | Build, typecheck, the full unit suite, the narrow E2E tests and the new-build probe pass. AC-006 is listed as pending. | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `project-task-tool-contract.ts` | 226 | 206 | Pass | Pass (−20) | Pass | Pass | Pass | — |
| `project-task-tool-manifest.ts` | 112 | 110 | Pass | Pass | Pass | Pass | Pass | — |
| `project-task-native-tools.ts` | 60 | 54 | Pass | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The split's time-boxed exception is removed. No alias and no rewrite. |
| No legacy old-behavior retention | Pass | — |
| Dead code removed (Principle 7) | Pass | CR-001 resolved |
| Persisted-data transition followed | Pass | `Not Affected`. Definitions are not rewritten. |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
None remaining. CR-001 (the unimported `export` on `parseCreateProjectInput` and `parseUpdateProjectInput`) was resolved in `4807095aed`.

## Docs-Impact Verdict

- Docs impact: `Yes`, and it is already done in this change.
- Files: server `projects.md`, `agent_tools_mcp_server.md`, web `docs/projects.md` (whole passages, per R-3), and the ticket `release-notes.md` (Improvements plus Upgrade Notes, including the third-party name note). The `.github` release notes file is left to the release step (DEC-004).

## Additional Material Premise Validation

None.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (`95/100`), a simple average for visibility only.

| Priority | Category | Score | Why | Weak / Holding Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | dispatch on `name` once again; the spine is shorter | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | unchanged owners; one fewer cross-file helper | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.6 | the two-meaning tool is gone | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | deletions only | — | — |
| 5 | Shared-Structure Tightness and Reusable Owned Structures | 9.5 | redundant type removed; shared builders kept | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | the stale "three" comment was corrected | — | — |
| 7 | API/E2E Readiness | 9.3 | local checks are green and AC-006 is clearly pending | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.6 | the new tools' branches are textually unchanged and the skip is proven on every runtime | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | thorough removal across code, tests and docs; CR-001 resolved | — | — |

## Findings

| Finding ID | Severity | Location | Evidence | Basis | Required Action | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| CR-001 (Resolved in round 2, `4807095aed`) | Low (bounded) | `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` l.114 `export function parseCreateProjectInput`, l.124 `export function parseUpdateProjectInput` | The importer count over `src`, `tests` and `autobyteus-web` finds no importer outside the contract. The only importer was `project-task-tools.test.ts` (base l.18, used at l.179-180 by the deleted old-tool test), removed in `6ba0389741`. | Core Principle 7 (ENG-007, CAND-001): exports that nothing imports are dead, and dead code in touched files belongs to the change | Drop `export` from both functions, then rerun typecheck and the changed unit files. | `Local Fix` → `/software_engineering_team/implementation_engineer` |

## Follow-ups

None.

- Sent to: `None`

## Classification

N/A (Pass). Round 1 was `Local Fix` (CR-001), which is now resolved.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (pass), with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- AC-006 (isolated real-app check with an agent that lists the old name) and the web probe run are pending. API/E2E owns them.
- A definition that relies only on the old tool loses Project mutation. This is accepted and is in the release notes.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (none required)
- Score Summary: 9.5/10. Every category is ≥ 9.3.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Round 2 was a Targeted Delta Review. CR-001 is resolved, and I reran typecheck (clean) and the three changed unit files (113 passed). No new findings.
