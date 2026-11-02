# Requirements Document — clean-runner-build-order

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `clean-runner-build-order`
- Request / ticket: the user, via the delivery engineer's relay (2026-11-02): the beta `v1.5.11-beta.11` is blocked by a clean-runner failure of the web type gate; the user asked for (1) the fix, and (2) "a design rule about release-runner build order in DESIGN.md ... a design-time rule, not only a testing note". No Project Task.
- Requested by: the user, relayed by `/software_engineering_team/delivery_engineer` (run `delivery_engineer_cf0744eae4044f98b56bfb0aaa58ee61`)
- Requirements owner: Solution Designer
- Date: 2026-11-02
- Approved by and reference: Solution Designer within the direction; the user is informed in the Solution Designer's conversation (message of 2026-11-02 naming this package, the fix and the rule).
- Exact approved requirements baseline / solution revision: this document at `SR-001`.
- Behavior-defining supplements: none.

## Problem And Desired Outcome

- Problem: the web type gate (`pnpm -C autobyteus-web typecheck`, part of every `build:electron*` chain) compiles the server's source in its cross-package tests project (autobyteus-318). That source reads `autobyteus-ts` (an untracked `dist/`) and the Prisma client, but the gate's prepare step builds neither. On a release runner (`pnpm install` only) the gate fails: all five desktop builds stopped, the beta cannot be tagged (`investigation-notes.md` F-01…F-06). It is the second time this class stopped a release build (F-07), and nothing at design time asks the question.
- Affected: the release pipeline (delivery engineer), developers running the gate on a fresh clone, designers and reviewers of any build step or gate.
- Desired outcome: the web type gate passes from a fresh `pnpm install`; the rule that prevents the class is part of the project's design guide and is found by designers, with TESTING.md and RELEASE.md pointing to it.
- Observable success: a clean clone with `pnpm install --frozen-lockfile` only passes `pnpm -C autobyteus-web typecheck`; the build-only release run on the ticket branch passes all five desktop jobs; `DESIGN.md` carries the rule, checklist item and anti-pattern.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | The web gate's prepare builds only `application-sdk-contracts`; on a fresh clone the gate reports ~325 errors (autobyteus-ts, then 12 Prisma errors). | The gate's own prepare step builds everything its projects read, from the server's single prepare owner. | The gate's production-error rule and test baseline (99 in 43 files) are unchanged; the server's `prebuild` still builds and generates what it did. | F-04, F-05, F-06 |
| BEH-002 | Contract (project guide) | SCN-003 | `DESIGN.md` has no rule on release-runner build order; TESTING.md notes only the install order. | A design-time rule, a checklist item and an anti-pattern entry; a design case; TESTING.md and RELEASE.md point to the rule and do not restate it; RELEASE.md carries the case study. | Existing rules and numbering of DESIGN.md. | F-07 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Delivery engineer | Release the beta | The build-only run passes | The release script refuses an unclean tree; no tag is used until it passes |
| Designers, reviewers | Not repeat the class | The rule is read at design time and in the checklist | Proportionate: no new process layer |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The web type gate (and the server's own type check) prepare what their source reads on a fresh clone | SCN-001, SCN-002 |
| UC-002 | Designers meet the build-order rule at design time | SCN-003 |

### Out Of Scope

- Any other gate, build step or workflow (the Docker, Android and iOS releases); `prepare-server` and the electron chain order; the content of the three cross-package tests; the typecheck baseline.
- A new CI workflow that type-checks on every pull request or push (follow-up `FU-1`, not built here).
- Releasing the beta (delivery's, after this is merged).

### Non-Goals

- Making the gate faster, or removing the cross-package project. The gate may build the packages twice in a chain (once for the gate, once in `prepare-server`).

### Preserved Behavior Boundary

BEH-001's preserved column; AC-003.

### Prerequisites

None.

### Review Authority

As the template: blocking findings cite REQ/AC/BEH IDs here.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `pnpm -C autobyteus-web typecheck` passes on a clean clone after `pnpm install --frozen-lockfile` only, by building what its projects read in its own prepare step. | BEH-001 | Blocking the beta | F-01…F-06 | Reproduced both halves (F-05, F-06) | The user's relay; DEC-1 |
| REQ-002 | The server's own `pnpm -C autobyteus-server-ts typecheck` is prepared by the same step, so its fresh-clone result does not depend on a developer machine. | BEH-001 | Medium | Same source, same owner (U-1) | Expected, shown by AC-002 | DEC-1 |
| REQ-003 | `DESIGN.md` carries the build-order rule (mandatory rule 12), a checklist item and an anti-pattern entry citing both incidents; `docs/design-cases.md` a case; `TESTING.md` and `RELEASE.md` point to the rule and do not restate it; `RELEASE.md` records the case study. | BEH-002 | High | The user's request | N/A | The user's relay; DEC-2 |

## Acceptance Criteria

| AC | Requirements | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Fresh clone, `pnpm install --frozen-lockfile`, nothing else, then `pnpm -C autobyteus-web typecheck` | Exit 0; production errors 0; test baseline unchanged | Executed in a clean clone of the ticket branch; log in `evidence/` |
| AC-002 | REQ-002 | SCN-002 | Same clone, `pnpm -C autobyteus-server-ts typecheck` | Exit 0 | Executed; if it fails for another reason on the base, recorded as a follow-up |
| AC-003 | REQ-001 | SCN-001 | After the change on a machine with everything built | The gate result is the same as before (0 production errors, baseline unchanged); `pnpm -C autobyteus-server-ts build` still passes | Executed |
| AC-004 | REQ-001 | SCN-001 | The build-only release run on the pushed ticket branch (`pnpm release:test --ref codex/clean-runner-build-order`) | All five desktop build jobs pass; nothing is published | Run by delivery before the merge; run id recorded |
| AC-005 | REQ-003 | SCN-003 | Read `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `docs/design-cases.md` | Rule 12, checklist item and anti-pattern are present in DESIGN.md; the other three files point to it; no restated rule | Source check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Initiator | Goal | Trigger | Starting condition | Steps | Expected | Validity / Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Release runner / developer on a fresh clone | The web gate runs | `pnpm typecheck` in `autobyteus-web` (inside `build:electron*`) | Only `pnpm install` done | prepare step, nuxt prepare, typecheck | Passes | Supported Normal Scenario; the release workflow itself (F-01) |
| SCN-002 | Operational | Developer on a fresh clone | The server's type check runs | `pnpm typecheck` in `autobyteus-server-ts` | Only `pnpm install` done | prepare, tsc | Passes | Supported Normal Scenario (U-1 to show) |
| SCN-003 | Contract | Designer / reviewer | Designing or reviewing a build step or gate | Reading the design guide and checklist | A design adds or widens a gate | Rule and checklist asked | The design names the packages and prepare step | Supported Normal Scenario; the user's request |

## UI, Interaction, And Experience Requirements

N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Operability | The extra prepare work is the server's existing prepare (three package builds and `prisma generate`), no new build tooling | Release runners | AC-004 duration noted |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| `prisma generate` on release runners | Works on the five runners (it already runs inside `prepare-server`) | `autobyteus-server-ts` `prebuild` | Low; AC-004 shows it |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Building the same packages twice in one chain is acceptable | Simplicity over de-duplication (rule 5) | AC-004 duration | Open until AC-004 |

## Decisions

| Decision | Question | Why it matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-1 | How does the web gate get everything it reads built? | The class recurred because the web gate keeps its own list | (a) add `autobyteus-ts` to the web list (the delivery engineer's proposal): the Prisma client would still be missing (F-05→F-06); (b) add both to the web list: a second list that drifts the next time the server source needs something; (c) the web step calls the server's one prepare owner, now also covering the Prisma client | (c): one owner, shown sufficient by F-06; fixes both the missing package and the missing client, and the next addition to the server's prepare reaches the gate too | Solution Designer | Decided |
| DEC-2 | Where does the rule live and how strong is it? | The user wants it considered at design time | A testing note only (what happened after beta.14); a mandatory design rule + checklist + anti-pattern + design case, with other guides pointing to it | Mandatory rule 12 with a checklist item; proof includes the build-only run on the ticket branch before merge (feasible: F-08) | Solution Designer, within the user's request | Decided |
| DEC-3 | Build an enforceable guard now? | The user left it open ("decide whether to make that a Task") | A static check of tsconfig reads versus prepare scripts: fragile, easy to evade; a CI job that type-checks on a clean runner for every push: reliable, but a new workflow and CI cost (F-09) | Not in this fix; a follow-up Task proposing the clean-runner job (`FU-1`). The rule and the build-only run on the branch are the guard meanwhile | Solution Designer | Decided (follow-up) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-003, AC-004 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-002 | SCN-002 |
| REQ-003 | UC-002 | BEH-002 | AC-005 | SCN-003 |

## Architecture Phase Input

- Approved scenarios: SCN-001…003. Preserve: the gate's baseline, the server build. Defer to design: script names. Verify: server typecheck on a fresh clone (U-1).

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded (Solution Designer within the direction, user informed): `Yes`. Ready for design: `Yes`.
