# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed), 2026-11-15
- Behavior-defining supplements: none
- User approval of the design: `Not required` (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/investigation-notes.md`
- Authorities read (2026-11-15): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `DESIGN.md` (root; rule 12 and the "gate that reads a package's build output" anti-pattern apply), `TESTING.md`, `RELEASE.md`
- Project design-principle conflicts or discrepancies: none. Discrepancy outside scope: FU-001 (RELEASE.md main-checkout path).

## Current-State Read

The desktop build (`autobyteus-web/package.json:45-50`) runs `pnpm typecheck` → `scripts/typecheck.mjs`, which type-checks four projects; the fourth, `tsconfig.cross-package-tests.json`, compiles four web tests together with the server's `src` (autobyteus-318). autobyteus-460 made `workspaceSkills` a required input of `CodexAgentRunContext` (`autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-context.ts:28-37`) and updated the server's callers. The web caller (`codex-turn-lifecycle-native-to-live-projection.integration.test.ts:66-79`) was not updated, so the web typecheck has one test-file error above its baseline and fails (INV-01).

The ticket's checks are chosen from TESTING.md "Choosing the path" (`TESTING.md:68-86`), which maps a backend change to server tests; the server typecheck is the one the 460 roles ran (IMP-01, IMP-12, API-09). No rule maps a server change to the web typecheck, and Rerun-by-impact step 5 (`TESTING.md:104-106`) says only "the typechecks". There is no pre-merge CI (`.github/workflows/` has only tag-triggered release workflows). So the escape is a missing selection rule in TESTING.md.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: two added lines in one test file; one cell, one paragraph and one step's wording in TESTING.md. No production, script, `tsconfig`, baseline or workflow change.
- Architectural risk: `Low`
- Risk rationale: no contract, persistence, security, concurrency, deployment or ownership change. The test now builds the run context exactly as the 10 server Codex tests do. The TESTING.md rule only adds checks.
- Escalation trigger: if the fixture import fails the Fresh-start build (AC-006) because the web gate does not build something the fixture needs, or the web typecheck count after the fix differs from 93 in 40, return a `Design Impact` (a gate or prepare-step change would fall under DESIGN.md rule 12 and the build-only release run).

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Web typecheck on base | `evidence/INV-01-web-typecheck-base.log` | TS2345 at (67,46); 94 in 41 vs baseline 93 in 40 | Defect and its only error | None |
| Probe fix | `evidence/INV-04-web-typecheck-probe-fix.log` | PASS, 93 in 40 | Fix shape (DEC-001) | Fresh-start: AC-006 |
| Test run | `evidence/INV-05-test-runtime-base.log` | 2/2 | Behavior preserved | None |
| Server fixture | `autobyteus-server-ts/tests/fixtures/run-workspace-skills-fixtures.ts:17-28` | Existing owner of a test run's skill holder | Reuse, no new helper | None |
| 460 evidence | `tickets/done/running-agent-config-reload-460/implementation-handoff.md:200,210`; `api-e2e-execution-coverage-report.md:44` | Only the server typecheck ran | Gap location (TESTING.md) | None |
| TESTING.md | `:37`, `:68-86`, `:104-106` | No rule selects the web typecheck for a server change | Text changes below | None |

## Intended Change

1. Give the failing test a workspace skill holder through the server's existing test fixture.
2. Add to TESTING.md the rule that every TypeScript change runs both typechecks, and make the Web typecheck row and Rerun-by-impact step 5 say why and which.

## Change Scope (Mandatory)

- In scope: UC-001 (test file), UC-002 (TESTING.md). Files in Target Subsystem / Folder / File Mapping.
- Derived consumers: N/A (no shared structure changes).
- Deliberately left alone: `CodexAgentRunContext` and every production type (the required field is correct); `typecheck-baseline.json` files (the count returns to the baseline exactly); `scripts/typecheck.mjs` and all `tsconfig` files (a gate change would need the build-only release run, and is not needed); the other three cross-package tests (0 errors); `autobyteus-message-gateway` (not in any release build); RELEASE.md (delivery already reruns "one relevant check" on the merged state, which step 5 now names).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-003; AC-001, AC-004, AC-006 | Desktop release build | FAIL at web typecheck (INV-01) | PASS at unchanged baseline | DS-001 |
| BEH-002 | Operational | REQ-004, REQ-005; AC-005, AC-007 | TESTING.md check selection | Server-only change → server typecheck only | Every TypeScript change → both typechecks | DS-002 |
| BEH-003 | Contract | REQ-002; AC-002, AC-003 | The test file | 2/2 | 2/2, prepared run context with a holder | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/INV-01…05` | Reproduction, baselines, probe | REQ-001…003 | Proves the defect and the fix shape | Final |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (test) plus a process-rule fix (TESTING.md)
- Current design issue found: `No`
- Structural triggers: none fire. Plausible ones ruled out: Capability-area reuse (the fixture already owns "a test run's skill holder"; reused, nothing new created); Legacy cleanup (no wrapper or fallback; the test adopts the current API); Derived data (no shared structure changes).
- Root cause classification: `Local Implementation Defect` (one caller missed by autobyteus-460, in another package), and a missing validation rule that let it through
- Refactor needed now: `No`
- Evidence: INV-01, INV-04; `codex-agent-run-context.ts:12-16` (the required field is the intended API)
- Design response: update the caller; add the selection rule
- Refactor rationale: owners and boundaries are correct
- Intentional deferrals and residual risk: RSK-001 (the rule is documented, not machine-enforced; CI would be a user decision)

## Terminology

- Cross-package tests: the web tests compiled with the server's source by `autobyteus-web/tsconfig.cross-package-tests.json`.
- Both typechecks: `pnpm -C autobyteus-web typecheck` and `pnpm -C autobyteus-server-ts typecheck`.
- `GLOSSARY.md` is the domain glossary; no domain word is added or changed.

## Section Fill Order

Followed; proportionate for a Small/Low change.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: none
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision

- Decision: `Not Affected`: no stored data, schema or reader/writer changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Release workflow | Packaged desktop build | `autobyteus-web` `build:electron*` | The gate that fails |
| DS-002 | Primary End-to-End | BEH-002 | A ticket's TypeScript change | Evidence of both typechecks before merge and after a base refresh | TESTING.md (API/E2E engineer owns the document) | The rule that was missing |

## Primary Execution Spine(s)

- DS-001: `release-desktop.yml -> pnpm build:electron:<os> -> pnpm typecheck (prepare:shared-types, nuxt prepare) -> scripts/typecheck.mjs -> tsc -p tsconfig.cross-package-tests.json -> web test -> server CodexAgentRunContext`
- DS-002: `Ticket change -> TESTING.md Choosing the path -> implementation/API-E2E run both typechecks -> evidence -> delivery audit (+ Rerun-by-impact step 5 after a base refresh) -> merge`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The release build type-checks the web package, including the web tests that compile server source; one such test must construct the server's run context with every required input | build script, typecheck script, cross-package project, test | `autobyteus-web` build | test-file baseline |
| DS-002 | A role reads TESTING.md to choose its checks; the new rule makes the choice independent of which package changed, because each typecheck reads beyond its own package | TESTING.md rules, role evidence | TESTING.md | none |

## Spine Actors / Main-Line Nodes

Build script, `scripts/typecheck.mjs`, the cross-package project, the test file; TESTING.md and the roles that follow it.

## Ownership Map

- `CodexAgentRunContext` (server): owns the run's Codex runtime state; unchanged.
- `createTestRunWorkspaceSkills` (server test fixture): owns building a test run's skill holder; reused.
- The web test: owns its harness; it supplies the holder.
- TESTING.md: owns which checks a change runs.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| None | No dead code in the touched test file (all its imports are used; checked by the cross-package project's 0 errors and by reading its imports) | — | — |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `typecheck-baseline.json` (web) | DS-001 | web typecheck | Bounds test-file errors | Existing | Not touched |

## Ownership Boundaries

The web test depends on the server's public `CodexAgentRunContext` constructor and the server's test fixture, both already used this way. No boundary changes.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `createTestRunWorkspaceSkills` | `new RunWorkspaceSkills({...})` with no-op materializer and skill service | the web test | Building `RunWorkspaceSkills` by hand in the web test | N/A |

## Dependency Rules

- Web cross-package tests may import server `src` and server `tests/fixtures` (existing precedent `UserMessageStoredUploadNames.spec.ts:3`).
- Production code is not changed to satisfy a test (DESIGN.md rule 11).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `createTestRunWorkspaceSkills({ runId })` | a test run's workspace skill holder | build an empty holder | `runId: string` | pass the harness's `runId` (`'run-codex-turn-lifecycle'`) so the holder belongs to this run |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `createTestRunWorkspaceSkills` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| workspace skills holder | `workspaceSkills` | Yes | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Not Existing |
| --- | --- | --- | --- | --- |
| A test run's skill holder | `autobyteus-server-ts/tests/fixtures/run-workspace-skills-fixtures.ts` | Reuse | Same holder every server Codex test uses | — |
| Choosing checks | TESTING.md "Choosing the path" | Extend | Where roles choose checks | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/integration` | the cross-package test | DS-001 | web typecheck | Reuse | — |
| TESTING.md | check selection | DS-002 | every role | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (identical; nothing extracted).

## Reusable Owned Structures Check

None needed: the fixture already exists.

## Shared Structure / Data Model Tightness Check

N/A: no shared structure changes.

## Final File Responsibility Mapping

| File | Owning Area | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts` | web cross-package tests | the test's harness | Build a prepared Codex run with its skill holder | Existing file | Yes, `createTestRunWorkspaceSkills` |
| `TESTING.md` | testing guideline | API/E2E-owned document | Which typechecks a change runs | Existing file | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts` | File (Modify) | test harness | Add the import and the property | Only caller missed | Casts, `@ts-*` comments, other edits |
| `TESTING.md` | File (Modify) | API/E2E-owned guideline | Three text edits below | Where checks are chosen | Ticket story, evidence |
| `tickets/in-progress/web-typecheck-gate/` | Folder | ticket | Ticket documents and evidence | Repo convention | — |

## Folder Boundary Check

| Path / Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| as above | Mixed Justified | Yes | Low | Existing files |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### Test change (exact)

After the existing import of `AgentRunMemoryRecorder` (line 23), add:

```ts
import { createTestRunWorkspaceSkills } from '../../../autobyteus-server-ts/tests/fixtures/run-workspace-skills-fixtures.js';
```

In `createNativeToProjectionHarness`, the `CodexAgentRunContext` input gains one property (the `runId` const is already in scope at line 55):

```ts
    runtimeContext: new CodexAgentRunContext({
      workspaceSkills: createTestRunWorkspaceSkills({ runId }),
      threadId: 'thread-1',
      codexThreadConfig: { ...unchanged },
    }),
```

Avoided shapes: `workspaceSkills: null` (misdescribes a prepared run, DEC-001); `as never`/`as any` on the input; `// @ts-expect-error`; a `typecheck:update-baseline` run; making the field optional in the server.

### TESTING.md changes (wording; the implementer may tighten it, keeping the meaning)

1. Web typecheck row (`TESTING.md:37`), after "…under their own configs;" insert: "those tests compile the server's `src` and the server test fixtures they import, so a server change can fail this typecheck;".
2. "Choosing the path": after the table (after line 82) and before "These are separate evidence layers", add:

   > **Both typechecks, whatever the change touches.** A change to TypeScript in any workspace package runs `pnpm -C autobyteus-web typecheck` and `pnpm -C autobyteus-server-ts typecheck`, not only the typecheck of the package it changed. Each reads beyond its own package: the web typecheck, which the desktop build runs, compiles the server's source and server test fixtures through its cross-package tests, and the server typecheck builds and reads `autobyteus-ts` and the shared packages. A server-only change that a web test calls passes the server typecheck and still stops every desktop build.

3. Rerun by impact, step 5 (`TESTING.md:104`): "rerun the typechecks" → "rerun both typechecks (web and server, as [Choosing the path](#choosing-the-path) says)".

Commit it on its own as `docs(testing): run both typechecks for every TypeScript change` (TESTING.md's own rule).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Make `workspaceSkills` optional again | Would silence the error | Rejected | Callers supply it (REQ-001) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Commit A (baseline fix, TESTING.md rule 9): the test change. Message, e.g. `test(web): baseline fix — Codex turn-lifecycle cross-package test passes the run's workspace skills (autobyteus-workspace-9)`, naming the test and cause (autobyteus-460 made `workspaceSkills` required).
2. Commit B: `docs(testing): run both typechecks for every TypeScript change` (TESTING.md only).
3. Ticket documents (implementation handoff, evidence) as the roles produce them.
4. Checks on the head: web typecheck (AC-001), the test file (AC-003), server typecheck and web guards (AC-004). API/E2E: Fresh-start build (AC-006).
5. No release; delivery merges per RELEASE.md.

## Key Tradeoffs

- Documented rule vs machine gate: DEC-002. The rule costs about two minutes per ticket and cannot drift; a machine gate would need CI, a user decision.

## Risks

- RSK-001 (rule not enforced by a machine): accepted, see investigation notes.
- Fresh-start: the fixture adds no build output to the gate's reads (its imports are already in the graph); AC-006 proves it.

## Guidance For Implementation

- Reproduction to start from: `pnpm -C autobyteus-web typecheck` on the base fails with TS2345 at `tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts(67,46)` (`evidence/INV-01-web-typecheck-base.log`); the fix turns it to `[typecheck] PASS` at `93 in 40 files`.
- Environment: Node 22, pnpm 10.28.2 (this machine has Node 26 as default and no global `pnpm`: use `/opt/homebrew/opt/node@22/bin` and `npx --yes pnpm@10.28.2`, or the shim `/tmp/wtg-bin/pnpm`).
- Stage paths explicitly; `autobyteus-application-*-sdk*/dist/` are untracked build outputs (never `git add -A`).
