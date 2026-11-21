# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package: `ios-demo-operation-coverage`; Task autobyteus-584; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); date 2026-11-21
- Approved by: `Solution Designer within the direction (user informed)`; reference: SR-001 and the message to the user in the Solution Designer's conversation, 2026-11-21.

## Problem And Desired Outcome

- Problem: the iOS release's demo build failed its GraphQL operation coverage check on `v1.5.14-beta.4` (autobyteus-554's four memory operations unlisted, one stale entry), so no TestFlight build was uploaded. Nothing ran that check before the tag. Reproduced locally with the workflow's own script.
- Outcome: the demo build passes; a change to GraphQL documents is caught by a fast local check before any release.

## Scope Guardrail

- In scope: UC-001 the demo's operation coverage list; UC-002 a local check of the same rule without a build; UC-003 the testing guideline's rule for GraphQL or demo changes.
- Out of scope: answering memory operations in the demo (the phone has no memory page); the release (`v1.5.14-beta.5` waits for the founder); the coverage rule itself.
- Preserved: the build-time check in `build-mobile-web.mjs`; the rule's three outcomes (unanswered, stale, unexplained).
- Prerequisites: None.

## Requirements

| REQ | Requirement | Source |
| --- | --- | --- |
| REQ-001 | `AgentSemanticMemoryFolder`, `GlobalSemanticMemoryFolder`, `ListAgentEpisodes`, `ListMemoryGroupMembers` are listed as unreachable on the phone with reason `memory` (they serve only the desktop `/memory` page); `ListAgentRunsWithMemory` is removed | Task; investigation |
| REQ-002 | A unit test in the web suite applies the coverage rule to the operations defined in the web source (no build) and fails on any unanswered, stale or unexplained operation, naming it | Task scope 2 |
| REQ-003 | `TESTING.md` says that a change to GraphQL documents (`autobyteus-web/graphql/**` or an inline operation) or to the demo node (`autobyteus-web/demo/**`) runs that unit test and `build:mobile-web --demo` | Task scope 2; project-documents (the earliest stage's document) |
| REQ-004 | Proof: `prepare-demo-web.sh --build` (or `build:mobile-web --demo`) passes locally; the unit test passes; a build-only iOS release workflow run (`workflow_dispatch`, no publish, `release_ref` = the ticket branch) passes on GitHub Actions; no release tag | Task scope 3 |

## Acceptance Criteria

| AC | REQ | Outcome |
| --- | --- | --- |
| AC-001 | REQ-001 | The demo build prints "The demo answers all … compiled operations"; no unanswered/stale/unexplained |
| AC-002 | REQ-002 | On the base list the new unit test fails naming the four operations and the stale entry; with REQ-001 it passes; it needs no build output |
| AC-003 | REQ-003 | `TESTING.md` has the rule (owner: API/E2E engineer) |
| AC-004 | REQ-004 | The build-only iOS workflow run passes ("Build the bundled demo" and the following build/test job) |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Answer the memory operations in the demo, or list them unreachable? | The phone has no memory page; the four serve only desktop `/memory`; the existing `memory` reason says exactly that. **List them** | Solution Designer | Decided |
| DEC-002 | How does the local check work without a build? | Measured: the phone build compiles every operation defined in the web source (252 = 252). **Apply the same rule to the source operations** in a unit test that runs with the web suite; keep the build check as the authority | Solution Designer | Decided |
