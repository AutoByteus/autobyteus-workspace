# API/E2E Coverage Investigation — mention-candidates-in-run

## Investigation Meta

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/`.

- Requirements Doc: `requirements-doc.md` (SR-001, Approved 2026-10-06; REQ-001..006, AC-001..008)
- Investigation Notes: `investigation-notes.md` (E-01..E-06)
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec: `design-spec.md` (SR-001)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 at `e08c4a8c5` (base `f48dbfbf3`)
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

`@` now lists and accepts definitions already in the run (collaborators, shared configured members, collaborator-Team members). Still excluded: built-ins, Orgs, non-shared and team-local definitions, the run's own definition, and every candidate in application-owned runs.
- An in-run mention resolves to its in-run address. Its note line gets `, already in this run`, and the guidance adds the `send_message_to` / `delegate_task` choice.
- Notes with no in-run mention are byte-identical to before, and saved notes still parse.
- The bring-in path keeps the in-run rule (no duplicate collaborator).
- New chat drafts exclude only the target's own definition.
- The menu copy changed in en and zh-CN; the placeholder is unchanged.
- Persisted data: `Directly Usable — No Migration`. Saved notes are read by the tolerant parser.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (the reported case: `@` an agent already in the run), SCN-002 (a fresh copy of an in-run agent), SCN-003 (New chat for a Team target).
- Added real-use scenarios:
  - SCN-A1: the reported shape. An agent brought in a collaborator with its own `send_message_to`; the user then `@`s that collaborator.
  - SCN-A2: in a Team or Org run, the user `@`s a configured member, e.g. the focused member asks its teammate.
- Unsupported/contrived: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 candidates include in-run definitions | Changed | REQ-001 | GraphQL candidates for 3 roots; live menu |
| BEH-002 in-run mention accepted and resolved | Changed | REQ-002 | Wire: note address; live send |
| BEH-003 note suffix and extra guidance | Changed | REQ-003, REQ-004 | Wire note text; contracts byte-identity; web chips |
| BEH-004 New chat draft for Team target | Changed | REQ-005 | Web unit; live New chat |
| BEH-005 menu copy en/zh-CN | Changed | REQ-006 | Web unit; rendered in the desktop app in both languages |
| BEH-006 bring-in never duplicates | Preserved | AC-006 | Unit; wire (a collaborator `@`-mentioned and messaged again stays single) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | candidate policy, admission | unit suites | — | wire E2E |
| API / transport / contract | Yes | GraphQL candidates; WS `mentions` → note text | contracts unit; server unit | real WS + GraphQL | gated server E2E |
| Frontend component / state | Yes | draft eligibility, localization | web unit | rendering, wrapping | browser/desktop |
| Browser integration / user journey | Yes | `@` menu content and copy; send | none live | reported scenario end to end | live probe + desktop |
| Desktop renderer | Yes (web-equivalent) | same | — | zh-CN wrapping | isolated desktop app |
| Desktop shell, auth, workers, persistence migration | No | — | — | — | — |
| External integration | Yes (indirect) | real model reading the new guidance | — | does an agent use the address | live runtime |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run`
- Testing guideline: `TESTING.md` (root). It now documents the ad-hoc E2E and the live probe (added by mention-delegation-dismissal).
- Discrepancy: the server `typecheck` script fails at baseline (TS6059); `tsc -p tsconfig.build.json --noEmit` is used instead.
- Secrets: the Claude CLI login is available. No AutoByteus-runtime keys (not needed).
- Safety: the user's AutoByteus app and `~/.autobyteus` are never touched. Only owned temp roots and isolated instances are used.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion | REQ/AC | Validity | Action |
| --- | --- | --- | --- | --- |
| contracts `collaborator-mention-note.test.mjs` | compose/parse incl. new suffix, byte identity | AC-004, AC-005 | Still Valid (updated in IR-001) | Run |
| server unit admission/policy/roots suites | in-run candidates, resolution, bring-in rule | AC-001..003, AC-006 | Still Valid | Run |
| web `draftMentionEligibility`, `collaboratorMentionText`, `chatDraftStore`, localization specs | draft mirror, chips, copy | AC-005, AC-007, AC-008 | Still Valid | Run |
| `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | `@` of a not-in-run definition → unchanged note, no collaborator | AC-004 at the wire | Still Valid | Extend: in-run mention at the wire for 3 roots |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` T01, O01, P01, N03 | in-run Team/Org members and the Team's members are **not** offered | REQ-001, REQ-005 | `Needs Update` (stale: those definitions are now offered) | Update; also add in-run mention + copy assertions |
| `cross-scope…` A01, N01, N02 | the host/target's own definition, Daily Assistant and Orgs not offered | REQ-001 preserved | Still Valid | Run |
| `composer-mention-discoverability-probe.mjs` | composer editor with candidate doubles | unchanged editor | Still Valid (no copy/exclusion assertions) | Optional run |

## Durable Coverage To Add

| Case ID | Behavior | REQ/AC | Path | Why |
| --- | --- | --- | --- | --- |
| E-INRUN (agent/team/org) | Real GraphQL candidates: in-run collaborator listed, own definition excluded; Team/Org configured member listed. A real WS `@` of the in-run collaborator (and of a configured member) gives the suffix, the in-run guidance and the in-run address, with no new collaborator. The not-in-run mention note has no suffix and no in-run guidance | AC-001..004, AC-006 | extend `ad-hoc-task-delegation.e2e.test.ts` | No wire-level proof exists; deterministic |

## Durable Coverage To Update

| Case ID | Path | Update | Evidence |
| --- | --- | --- | --- |
| L-T01, L-O01, L-P01, L-N03 | live probe | in-run members/mounted Teams are offered; only own definition, built-ins, Orgs excluded | REQ-001, REQ-005 |
| L-A01 | live probe | assert new header/footer copy | REQ-006 |
| L-S01 | live probe | the reported scenario: after the agent's bring-in, `@` the collaborator → listed; stored note suffix and in-run guidance; still one collaborator | AC-001, AC-003, AC-006 |

## Durable Coverage To Remove

| Path / Test | Obsolete Assertion | Evidence | Replacement |
| --- | --- | --- | --- |
| live probe T01/O01/P01/N03 exclusion lists | "members / mounted Teams not offered" | REQ-001, REQ-005 | the same cases now assert they are offered |

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `tsc -p tsconfig.build.json --noEmit` | typecheck | Planned | `api-e2e-evidence/logs/R-00-typecheck.log` |
| 2 | contracts `test` | note compose/parse | Planned | `logs/R-01-contracts.log` |
| 3 | focused server suites (collaboration, roots, streaming, tools, projects, standalone integration, admission integration, architecture) | policy, admission | Planned | `logs/R-02-server-focused.log` |
| 4 | web specs (collaborators, conversation, agentInput, runSettings, stores, localization, submission, streaming) | draft mirror, chips, copy | Planned | `logs/R-03-web.log` |
| 5 | prebuild + build | dist | Planned | `logs/R-04-prebuild-build.log` |
| 6 | gated `ad-hoc-task-delegation` (extended) + `task-closure-root-visibility`; `tests/e2e/projects` | wire | Planned | `logs/R-05-gated.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are several cases, including long live-model probe runs.
- Path: `api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Category | Score | Support | Uncertainty |
| --- | --- | --- | --- |
| Requirement and AC proof | 88% | wire E2E covers AC-001..004/006 for 3 roots; unit covers AC-005/007/008 | rendered copy and real model behaviour unproven |
| Changed-boundary directness | 92% | real GraphQL/WS | renderer |
| Integration realism | 85% | scripted actor | does a real agent use the in-run guidance |
| Environment fidelity | 90% | env var issue found and excluded | — |
| Failure / edge | 90% | ineligible, own definition, no duplicate (unit + wire) | — |
| User surface | 75% | unit specs only | rendering/wrapping en + zh-CN |
| Durable regression | 92% | wire E2E extended | probe still stale before update |

- Overall: 87%. Categories below 90%: requirement proof, integration realism, user surface. Broader validation required.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed (see the execution report): live Claude probe 19 Pass; human-style desktop journey Pass in en and zh-CN.
- Modes:
  - (a) the updated live probe on the Claude runtime;
  - (b) a human-style journey in a freshly built isolated desktop app: the reported scenario in a Team run, plus the rendered en and zh-CN menu copy.
- Gap: rendered copy and wrapping, the real model behavior given the in-run guidance, and the reported user journey.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| AutoByteus runtime live | no model without the user's keys (as before) | runtime-agnostic change (note text and candidates) | none |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes` (executed; final confidence 95.3%, Pass)
- Durable coverage added/updated: `Yes` (gated E2E extended; live probe updated)
- Reroute required: `No`
