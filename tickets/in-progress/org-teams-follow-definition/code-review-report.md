# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-015; REQ-004, REQ-009, DEC-005)
- Investigation Notes Reviewed As Context: through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-015)
- Design Spec Reviewed As Context: `design-spec.md` (DS-006; § SR-015 Revision)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md`
- Relevant Solution Revision IDs: SR-015
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-010)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-010
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (§ IR-005)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-004, IR-005
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Current Review Round: `7`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): IR-005 (`26f976f91b..cfc4bc67f2`, 3 source files, +15 effective lines) changes only the F-5 path: an opt-in Org-rule compilation mode, passed through the plan, used by `OrgMembershipPlanner.viewFor`. CRR-005 covers everything else (with API-REV-002's reruns).
- Trigger: IR-005 ready for source review (implementation engineer)
- Prior Review Round Reviewed: CRR-006 (failure-origin review, Fail)
- Latest Authoritative Round: 7
- API/E2E and delivery records: API-REV-002 (Fail on F-5 only)

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, branch `codex/org-teams-follow-definition`, commit `cfc4bc67f2` (IR-005; cumulative base `9f6add773b`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None (unchanged from CRR-001).

## Review Scope

- Path re-traced from its real trigger:
  - An Org definition change (or reopen) reaches `AgentOrgContainers.followDefinition`, then `OrgMembershipPlanner.viewFor`, then `resolveConfiguration` (topology and launch; it compiles no rules, as the handoff says and the code shows).
  - Then `planAgentOrgContainer({ …, compilation: { kind: "running_org" } })` → `CollaborationHandoffCompiler.compileOrg(topology, compilation)` → `resolveOrgEndpoint(org, address, keepAbsentMember)`.
  - For `P/x` with `P` a mounted Team placement and `x` not in its current definition, the result is `{ kind: "absent_member", address: P/x }`, kept as written as `from` or `to`.
  - Then `orgLevelRules` → the container's Org rules → `orgRulesFrom` leaves the rule out until `x` returns (unchanged read side).
- Still refused in `running_org` mode, as at launch:
  - zero or more than two segments;
  - an unknown direct placement;
  - an Agent as an intermediate segment;
  - a Team placement as `from` (must resolve to an Agent);
  - invalid rules;
  - a self-target (an absent `from` equal to an absent `to` is caught by the new branch; an absent endpoint against an existing Agent cannot be equal);
  - duplicates (`seenPairs` on the written addresses, unchanged).
- Strict by default: every other `compileOrg` caller (launch, definition save, admission, `AgentOrgRunPlanner.build`) passes no compilation and gets `launch`. `rg compileOrg(`: only `planAgentOrgContainer` forwards an option, and only `viewFor` sets `running_org`.
- Placement: the mode sits in the compiler, which owns endpoint resolution, as an opt-in beside the existing `TeamHandoffCompilation`. That is the one place the rule can live without copying the resolver. The shared default is not loosened (CRR-006's condition holds).
- Gate run by me (with `pnpm` on PATH):
  - `node scripts/typecheck.mjs`: production 0 errors; tests 974 in 300 files, equal to the baseline. PASS.
  - `vitest run tests/unit/agent-org-execution tests/unit/agent-collaboration tests/unit/agent-org-definition tests/unit/agent-team-definition tests/unit/collaboration-definition-admission tests/unit/agent-package-definitions tests/unit/run-history tests/unit/api tests/app-data-migrations tests/architecture tests/integration/agent-org-execution`: 287/289 files, 2123/2130 tests.
    - The only failures are `agent-package-folder-watcher.test.ts` and `unreadable-package-root.test.ts`, and their failure counts vary between runs (10, then 6).
    - Both are on IR-001's environment list (`evidence/implementation/ir-001/test-summary.md`: "package watchers … no built watcher runtime", failing before this ticket's slices). IR-005 touches no package-watcher code.
  - Control: with `viewFor` passing `launch`, both F-5 positive cases fail (2 failed / 18). Restored: 18/18. Worktree clean.
- Explicit exclusions: OC-13 on the built server is API/E2E's rerun. The implementation engineer reran org-follows-definition 6/6 after a rebuild.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-004/DEC-005 (a rule naming a member gone from its Team is left out until it returns), REQ-009 (the Org follows its definition).
- Design-spec behavior map verified against the implementation: Yes (DS-006 plans from the units' current members; the container keeps the Org rules).
- Behavior-basis status: `Confirmed`.
- Remaining material ambiguity: None. Launches stay strict (today's rule, recorded in CRR-006).

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| S-13 the Org follows its definition while a rule names an absent Team member (F-5) | Confirmed | Traced above. Tests: a view is returned, both rules (`from` and `to`) are kept, `/writer` is planned, no warning; a launch compile of the same definition still throws; invalid endpoints (unknown placement, Agent intermediate, three segments, empty rules) are still not followed, each with its reason; reopen creates `/writer` and stores the rule | — |
| S-01..S-12 | Confirmed | Unchanged since CRR-005; API-REV-002 reran them green | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-13 Org follows its definition during a REQ-004 gap | REQ-009, REQ-004, DEC-005 | User | Author | Mount a Team / add an agent while an Org rule names a member gone from its Team | Org definition change; reopen | Normal | F-5 path | Followed; the rule kept and left out until the member returns | Unit cases + control; OC-13 rerun pending | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-31 | The mode lives in the shared compiler (opt-in), where CRR-006 said "don't loosen the shared compiler for other callers" | CRR-006 condition | — | The default stays strict; only `viewFor` opts in. Duplicating `resolveOrgEndpoint` in the planner would be the worse design | `rg compileOrg(` | Reject | — | Condition met: not loosened for others |
| C-32 | An absent-member rule whose two endpoints sit inside the same Team (`P/x → P/y`) is dropped by `orgLevelRules` as team-internal | DS-006 | — | Same as at launch for such a rule (Org-level rules exclude team-internal pairs); not a new behavior | Code read | Reject | — | Unchanged semantics |
| C-33 | Package-watcher failures in the gate | Environment | — | On IR-001's environment list; counts vary; not touched by IR-005 | IR-001 test summary | Reject | — | Environment |

## Structural / Design Checks

| Check | Result (`Pass`/`Pass — deviation recorded, reason holds`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | — | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Container keeps the rules as written | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-006 unchanged in shape | — |
| Ownership boundary preservation and clarity | Pass | Endpoint resolution stays in the compiler; the planner states its intent (`running_org`) | — |
| Off-spine concern clarity | Pass | — | — |
| Existing capability/subsystem reuse check | Pass | Mirrors `TeamHandoffCompilation` | — |
| Reusable owned structures check | Pass | — | — |
| Shared-structure/data-model tightness check | Pass | `absent_member` endpoint kind carries only the written address | — |
| Repeated coordination ownership check | Pass | One rule, one place | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Compiler 190 → 201 effective lines | — |
| Ownership-driven dependency check | Pass | — | — |
| Authoritative Boundary Rule check | Pass | — | — |
| File placement check | Pass | — | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Optional, defaulted parameter; strict default | — |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Pass | `running_org`, `absent_member`, `keepAbsentMember` say what they do | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | One condition at the point of the throw | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Positive, negative and reopen cases; launch still strict | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | — | — |
| API/E2E readiness for the next workflow stage | Pass | OC-13 rerun named | — |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines, `26f976f91b` → `cfc4bc67f2`: `collaboration-handoff-compiler.ts` 190 → 201; `agent-org-container-plan.ts` 77 → 79; `org-membership-planner.ts` 60 → 62. All pass.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | No stored shape changed |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `No` new. `agent_orgs.md` already states that an Org rule to a member not in its Team is left out until it returns; F-5 makes the follow path match it.

## Additional Material Premise Validation (When Required)

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| CRR-006 F-5 premise | Confirmed resolved | Traced; control run by me |

## Review Scorecard (Mandatory)

- Overall score: `9.45/10` (simple average; not the decision rule). Pass bar: at least 9.4 in every category (user's standing instruction).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-006 unchanged in shape; the gap state no longer stops it | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | Endpoint rules stay with the compiler; intent stated by the caller | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | Defaulted opt-in mirroring `TeamHandoffCompilation` | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Small deltas at their owners | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | One new endpoint kind, minimal | — | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Clear names and why-comments | — | — |
| `7` | `API/E2E Readiness` | 9.4 | Unit cases with a control; OC-13 rerun named | Built-server OC-13 pending | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | REQ-009 now holds during a REQ-004 gap; strictness kept everywhere else | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | — | — | — |
| `10` | `Cleanup Completeness` | 9.6 | — | — | — |

## Findings

No open findings. CRR-006's F-5 is resolved (revision record CRR-007).

## Follow-ups

- Follow-ups this review added: None. FU-001 unchanged.

## Classification

- N/A (Pass).

## Recommended Recipient

API/E2E engineer (implementation review passes), then the informational note to the implementation engineer.

## Residual Risks

- API/E2E reruns the OC file (OC-13). Launches are unchanged, so OF, `stopped-org-workspace` and OCU-05 need no rerun.
- A new launch from a definition whose Org rule names a member its Team lacks stays refused (today's rule, outside REQ-004).
- FU-001 remains.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.45/10 average; every category at least 9.4
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: Large/High preserved. CR-001..CR-007, N-1, F-1..F-5 and A-1 are all resolved.
