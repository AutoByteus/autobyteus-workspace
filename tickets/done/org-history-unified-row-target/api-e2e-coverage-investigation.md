# API/E2E Coverage Investigation — ORG-HISTORY-UNIFIED-ROW-20260921-001

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/requirements-doc.md` (`SR-001`, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/solution-revision-record.md` (`SR-002`)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/design-spec.md`
- Supplemental Task Artifacts: `solution-handoff.md`; archived predecessor under `tickets/done/org-history-row-toggle`
- Design / Architecture Review: `N/A — independent architecture review not applicable for Small / Low`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/implementation-revision-record.md` (`IR-001`)
- Code Review: `N/A — independent source review not applicable for Small / Low`
- API/E2E Revision Record: created after the first completed result as `API-REV-001`
- Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target/tickets/in-progress/org-history-unified-row-target/api-e2e-test-case-ledger.md`
- Current investigation round: `1`
- Trigger: direct implementation handoff `IR-001`
- Prior investigation reviewed: `N/A — new ticket`; archived predecessor execution used only as environment/preservation precedent
- Latest authoritative investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The approved change merges the top-level AgentOrg history chevron into the existing primary native button. The primary button alone must own focus, disclosure/selection ARIA and the existing `openRun` sequence. Activating either the chevron pixels or summary text must toggle the exact root and open/select it exactly once. Native Space/Enter must work without custom key handlers. Stop remains a separate sibling action that cannot open, select or toggle. Agent Team behavior, sibling rows, selection/content/drafts, stored history and every backend/API/runtime contract remain unchanged. The dedicated chevron button and toggle-only path are intentionally removed without compatibility behavior. Persisted data decision: `Not Affected`.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| One primary AgentOrg run control | Changed | `REQ-001/002`, `AC-001/002`, `DS-001` | Prove one semantic/focus target and exact-once toggle/open from chevron and text targets in a real browser |
| Disclosure accessibility owner | Changed | `REQ-003`, `AC-003` | Prove primary-only `aria-expanded` and conditional exact `aria-controls`; native Space/Enter |
| Dedicated chevron button/path | Removed | legacy-removal policy, `AC-001` | Assert there is no chevron button or independent accessibility action |
| Stop, siblings, selected workspace/draft/history | Preserved | `REQ-004/005`, `AC-004/005` | Exercise active Stop isolation and retained content/selection with sibling state |
| Agent Team row | Preserved | `REQ-005`, `AC-005` | Run real Team comparator; no Team source change |
| Backend/API/provider/persistence | Preserved / unaffected | design and implementation manifests | Do not invent API probes; corroborate no inference and representative data integrity |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk After Repository Evidence | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend | No | None | exact three-file manifest | accidental cross-boundary call only | process/log corroboration |
| API/transport | No | None | no API diff | none material | no direct API probe |
| Frontend component/state | Yes | local DOM composition and existing handler ownership | real component/tree-state tests | actual event targeting/focus | browser |
| Browser/user journey | Yes | pointer and native keyboard activation | DOM-rendered tests | browser bubbling/default action/AX tree | browser |
| Auth/session | No | None | local application | none | N/A |
| Web-equivalent desktop renderer | Yes | Vue sidebar row | Nuxt tests/build | desktop-width real render | Chrome |
| Electron shell | No | no preload/IPC/window change | diff | none material | browser is sufficient |
| Process/lifecycle | Preserved | Stop only | focused tests | live active Stop isolation | browser + backend log |
| Persisted data | No | `Not Affected` | design/implementation | accidental mutation | isolated-clone hash comparison |
| Worker/distributed | No | None | N/A | none | N/A |
| External integration | No | no Send/inference required | N/A | avoid accidental provider use | blank keys + log check |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-unified-row-target`
- Stack: Nuxt 3 / Vue 3 / Pinia frontend, TypeScript backend, Vitest, normal Chrome.
- Secrets: `N/A`; no provider call is required, and the isolated environment will blank provider keys.
- Conflicting instructions: none. `autobyteus-web/AGENTS.md` requires `--run`; fresh Nuxt workspaces may require `nuxi prepare`.

| Instruction / Configuration | Learned Constraint |
| --- | --- |
| `autobyteus-web/AGENTS.md`, `README.md`, `package.json` | Use pnpm/Nuxt; `test:nuxt ... --run`; browser is valid for web-equivalent renderer behavior |
| `autobyteus-server-ts/AGENTS.md`, package scripts | Use owned loopback server/profile; clean generated prerequisites created by validation |
| `validation/README.md`, `ir001-source-manifest.json` | Focused 17 and adjacent 87 pass locally; broad drift is baseline-qualified; verify all three hashes independently |
| archived predecessor API/E2E package | Safe proven setup uses a copy-on-write isolated profile clone, transaction-consistent SQLite backup, owned ports and normal Chrome |

| Component | Setup / Start | Readiness | Cleanup |
| --- | --- | --- | --- |
| Backend | candidate build/start on fresh owned loopback port with explicit isolated profile, DB and memory | listening/health log | interrupt owned process; verify port absent |
| Frontend | `BACKEND_NODE_BASE_URL=<owned-backend> pnpm -C autobyteus-web dev --port <owned>` | Nuxt ready and page load | interrupt owned process; verify port absent |
| Browser | normal Chrome against owned Nuxt | semantic DOM/AX contains history rows | close only validation-created tab |

| Fixture Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Representative stopped Org/Team history | isolated clone of representative local profile plus SQLite backup | never start/restart the user server or mutate live profile | delete only owned clone after evidence |
| Active Org Stop | create a disposable Org run through ordinary UI in the clone; do not Send | user-like frontend flow; no provider inference | Stop through UI and remove clone |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Representative existing data: stopped AgentOrg and Team history in the isolated clone.
- Evidence: before/after hashes for exact representative trees and SQLite database; unchanged selection/content through toggles.
- Migration scenarios: `N/A`.
- Upstream ambiguity/reroute: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Decision | Evidence | Action |
| --- | --- | --- | --- |
| `WorkspaceAgentOrgDisclosure.spec.ts` unified structure, chevron/text exact-once, ARIA, Stop, preservation | Still Valid | Direct map to `AC-001`–`AC-004`; exact pre-change source fails 6/8 | rerun exact candidate |
| `WorkspaceHistoryFamilyPublication.spec.ts` real sidebar/Pinia opening path | Still Valid | exercises primary path after early history publication | rerun exact candidate |
| `WorkspaceHistoryWorkspaceSection.spec.ts` Team comparator | Still Valid | preserved `REQ-005/AC-005` | rerun adjacent comparator |
| exact pre-change substitution | Still Valid as temporary regression proof | implementation baseline log | carry evidence; no new permanent harness |
| broad 18 failures / 16 errors | Qualified baseline | identical failure set on pre-change component | do not force unrelated change or claim broad green |

## Durable Coverage Decisions

- Add/update/remove by API/E2E: none planned. `IR-001` already provides requirement-linked durable coverage at the correct real-component/Pinia boundaries.
- Stale assertions were updated by Implementation; API/E2E will not reintroduce the removed disclosure-only contract.
- Temporary executable coverage: real Chrome plus isolated process/file corroboration closes the remaining event-composition and user-surface gap without duplicating repository tests.

## Repository Coverage Execution Plan And Results

| Order | Command / Check | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Verify `ir001-source-manifest.json` SHA-256 | candidate identity | Pass — 3/3 exact | `validation/api-e2e/manifest-check.json` |
| 2 | `pnpm -C autobyteus-web exec nuxi prepare` | Nuxt test workspace | Pass | `validation/api-e2e/nuxt-prepare.log` |
| 3 | `pnpm -C autobyteus-web test:nuxt` for Org disclosure, family publication and Team section with `--run` | changed component + real Pinia + comparator | Pass — 3 files / 28 tests | `validation/api-e2e/repository-tests.log` |
| 4 | `pnpm -C autobyteus-server-ts build` | listening-server prerequisite / preserved backend | Pass — production build and sanitized bootstrap | `validation/api-e2e/server-build.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes`; repository, multiple browser input modes, active lifecycle, preservation and cleanup are independently meaningful.
- Canonical path: `api-e2e-test-case-ledger.md`
- Initialized before execution: `Yes`

| Case | Journey | Authority | Surface |
| --- | --- | --- | --- |
| R01 | exact manifest and proportional repository checks | `AC-001`–`AC-005` | Vitest/build/diff |
| B01 | one primary control; no separate chevron; text and chevron pointer exact-once | `AC-001/002` | real Chrome + real history |
| B02 | native Space/Enter and exact ARIA | `AC-003` | real Chrome keyboard/DOM |
| B03 | active Stop isolation and sibling/selection/content retention | `AC-004/005` | real Chrome + backend lifecycle |
| B04 | Agent Team comparator, no inference, persistence integrity | `AC-005` | real Chrome/process/files |
| C01 | cleanup and final resource audit | all | workflow |

## Post-Repository Confidence And Broader-Validation Decision

Independent execution now proves the exact three-file candidate, the changed component, real Pinia publication path, preserved Team comparator and buildable listening backend. Category scores are: requirement proof 90, directness 94, integration realism 75, fixture fidelity 80, edge/lifecycle 85, browser 65, durable coverage 98; overall **83.9%** (simple average). Critical real-browser behavior is not yet directly proven, and browser/integration/fixture/lifecycle categories remain below 90%.

- Broader validation: `Required — normal Chrome`.
- Gap: one-control accessibility tree, actual chevron/text event targeting without double toggle, native keyboard, active Stop isolation and representative retained content/data.
- Expected confidence: at least 95% if all cases pass with no category below 90%.
- Desktop decision: browser directly exercises the changed web renderer; no Electron shell code changed, so Electron execution would add no material evidence.
- Reroute before execution: `No`.

## Live Environment And Fixture Plan

- Start owned backend and Nuxt on fresh loopback ports against an isolated profile clone.
- Load representative stopped Org and Team histories in normal Chrome.
- Assert semantic DOM counts/roles/relationships; use pointer on icon and summary; native Space/Enter; exact URL/selection/content state; active Stop with another row selected; Team comparator.
- Capture DOM/AX values, screenshots, console and service logs, before/after hashes.
- Close validation tab, stop owned processes, remove owned clone/generated prerequisites and verify no listeners remain.

## Not Tested / Deferred

| Boundary | Reason | Risk |
| --- | --- | --- |
| Electron shell | no shell/preload/window code changed | negligible; no shell claim |
| Provider inference | no Send/provider behavior in scope | none; keys intentionally blank |
| broad pre-existing failing suites | exact same identities/counts on pre-change component | qualified repository debt, not this ticket |

## Investigation Decision

- Proceed: `Yes`
- API/E2E-owned durable coverage change: `No`
- Broader validation: `Required — normal Chrome with owned services and isolated data`
- Reroute required: `No`

## Final Investigation Update

- Repository evidence: exact 3/3 manifest; 3 files / 28 tests Pass; backend production build and sanitized bootstrap Pass.
- Broader execution: required normal Chrome validation completed. `R01`, `B01`–`B04`, and `C01` all Pass.
- Final confidence: **96.9%**; no applicable category below 90%; every critical AC directly proven.
- API/E2E-owned durable test changes: none.
- Persisted-data result: owned clone database and exact representative Org/Team trees byte exact before/after.
- Qualification: two setup-only server starts inherited the parent live-profile `DATABASE_URL`; no acceptance actions ran there and zero migrations were pending. The corrected explicit process-level datasource/memory run produced all acceptance evidence. See `setup-isolation-correction.json`; do not claim the live user database was bit-for-bit untouched during setup.
- Result: `Pass`; direct Low-risk route proceeds to Delivery.
