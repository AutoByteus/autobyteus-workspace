# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (supersedes SR-001's "patch the private profile" direction; see `solution-revision-record.md`)
- Package identifier: `workspace-skill-collision-fix`
- Request / ticket: Project Task `autobyteus-142` — URGENT regression in v1.5.6-beta.2: agents cannot start (workspace skill path collision; new runs ENOENT)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `User`; reference: user messages in the Solution Designer conversation, 2026-10-18: "Okay, restore it. Let's go restore it." and "because the NFS is not even there yet. We shouldn't do anything considering NFS right now." (preceded by "they cannot change our behavior… NFS deals with the file system, they shouldn't do anything to our skill").
- Exact approved requirements baseline: this document at SR-002
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: The NFS extraction (`2448e166bd`, merged `55bff1f5ee`, released in v1.5.6-beta.2) switched skill exposure for Claude, Codex and Grok on **every** workspace from the established workspace-link behavior to the NFS-only private-profile behavior. In v1.5.5 and v1.5.6-beta.1 the private profile ran only for workspaces registered as shared network workspaces (NFS is not live, so in practice never). The switch caused two blocking bugs: runs refused when the workspace already holds a same-named skill entry (even a link to the same skill), and every brand-new run failing with `ENOENT realpath` on the not-yet-created memory folder.
- Affected actors or systems: every user of v1.5.6-beta.2 running agents with configured skills on Claude, Codex or Grok.
- Desired outcome: skill exposure for Claude, Codex and Grok behaves exactly as in v1.5.6-beta.1 on all workspaces. NFS is not considered: no NFS-specific skill path remains in the run path.
- Observable definition of success: with a workspace whose `.claude/skills/*` and `.codex/skills/*` are links to the agents' configured package skills, new and resumed runs on Claude, Codex and Grok start and use the skills, as they do in beta.1.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current (beta.2) | Desired (= beta.1) | Intentionally Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | System | SCN-101, SCN-102 | Configured skills linked from a private folder in the run memory; any same-named workspace entry refuses the run | Configured skills exposed through the beta.1 workspace-link materializer (`<workspace>/.claude/skills`, `.codex/skills`, `.grok/skills`), which accepts an existing link to the same skill, repairs broken links, refuses a different workspace-owned entry for configured-skill agents and prefers it for all-installed agents, and removes the links it holds when the run ends | beta.1 behavior in full, including Codex's "already discoverable natively" preflight | INV beta.1 sources |
| BEH-102 | System | SCN-103 | New run fails `ENOENT realpath <memoryDir>` | New run starts (beta.1 did not need the memory folder for skill exposure) | — | second-finding note |
| BEH-103 | System | — | NFS-only private skill profile code is in the run path for all workspaces | No NFS-specific skill code in the run path | Antigravity capsule skill linking unchanged | user direction |
| BEH-104 | System | — | Antigravity: unchanged from beta.1 | Unchanged | Yes | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Start/resume agents in their repos with their skill links | Works as in beta.1 | NFS must not change skill behavior; tests must not touch the user's real workspaces |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-101 | Start or resume a Claude/Codex/Grok run of an agent with configured skills, in a workspace with or without same-skill links | SCN-101, SCN-102 |
| UC-102 | Start a brand-new run of an agent with configured skills | SCN-103 |

### Out Of Scope

- Any improvement over beta.1 skill behavior (e.g. message wording, not removing a user-created same-skill link at run end, Antigravity `.agents/skills` refusal) — follow-ups.
- The rest of the NFS extraction (workspace registry, shared workspace admission/binding, mount observation, scoped git environment, PTY changes) stays as merged.
- Any NFS skill design for the future.

### Non-Goals

- New skill exposure behavior of any kind.

### Preserved Behavior Boundary

- Agents without configured skills unaffected; Antigravity and AutoByteus runtime skill handling unchanged; all non-skill parts of the NFS extraction unchanged.

### Review Authority

- Every blocking finding must cite REQ/AC/BEH IDs here. Proposals to improve beyond beta.1 are follow-ups, not corrections.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-101 | Claude, Codex and Grok expose configured skills on every workspace exactly as v1.5.6-beta.1 does for a non-shared workspace. | BEH-101 | Critical | User direction "restore it" | User 2026-10-18 |
| REQ-102 | A new run of an agent with configured skills starts without a pre-existing memory folder. | BEH-102 | Critical | Second finding | Task |
| REQ-103 | The NFS-only private skill profile path is removed from the run path; no code in the run path considers NFS for skills. | BEH-103 | High | "We shouldn't do anything considering NFS right now" | User 2026-10-18 |
| REQ-104 | Non-skill parts of the NFS extraction and the Antigravity/AutoByteus runtimes stay unchanged. | BEH-104 | High | Scope | — |
| REQ-105 | Regression tests cover the user's setup: workspace `.claude/skills/<s>` and `.codex/skills/<s>` links to the configured package skill; brand-new and resumed runs; plus a different same-named workspace skill. | BEH-101, BEH-102 | Critical | Bugs were shipped because tests asserted them | Task, correction note |

## Acceptance Criteria

| AC ID | Requirement IDs | Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate Outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-101 | REQ-101, REQ-105 | SCN-101 | Workspace `.claude/skills/<s>` (Claude) / `.codex/skills/<s>` (Codex) / `.grok/skills/<s>` (Grok) is a link to the configured skill's folder; new run | Run starts; skill available to the runtime | — | Unit/integration per runtime; real-app check |
| AC-102 | REQ-101, REQ-105 | SCN-102 | Same, resumed run ("continue") | Run resumes | — | Integration; real-app check |
| AC-103 | REQ-101 | SCN-101 | No workspace entry | Same as beta.1: link created in the workspace skill folder for the run and removed at run end | — | Restored beta.1 tests |
| AC-104 | REQ-101, REQ-105 | SCN-104 | Workspace entry is a different skill (real folder) with the same name; configured-skill agent | Run refused with the beta.1 collision error | All-installed agent: workspace entry preferred (beta.1) | Restored beta.1 tests + one per-runtime case |
| AC-105 | REQ-102, REQ-105 | SCN-103 | Brand-new run; member memory folder absent | Run starts | — | Unit + E2E brand-new run |
| AC-106 | REQ-103 | — | Code search | No `RuntimeSkillProfile` / `preparePrivateRuntimeSkills` / private skill adapters/discovery in `src`; no reference to shared-workspace bindings for skills | — | Review + typecheck |
| AC-107 | REQ-104 | — | Full server unit/integration suites, typecheck | Pass; Antigravity tests unchanged and passing | — | CI-equivalent run |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-101 | User | User | Start an agent in a repo with skill links | New run / `delegate_task` / team member start | Same-skill links in workspace skill folders | Start run | Run works | — | Supported Normal Scenario | Screenshots; superrepo links | AC-101, AC-103 |
| SCN-102 | User | User | Continue a run | "continue" | As SCN-101 | Restore | Run resumes | — | Supported Normal Scenario | Screenshots | AC-102 |
| SCN-103 | User/System | User or delegating agent | Brand-new run | New run | No member memory folder | Start | Run starts | — | Supported Normal Scenario | Second-finding note | AC-105 |
| SCN-104 | User | User | Start with a different same-named workspace skill | New run | Different skill folder | Start | beta.1 refusal (configured) / preference (all-installed) | — | Supported Explicit Edge Scenario (beta.1 contract) | beta.1 materializer | AC-104 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Constraint | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-101 | REQ-105 | Reliability | Tests and real-app checks use only test-owned workspaces, data packages and app data; never the user's real workspaces or `.claude`/`.codex` folders | All validation | Review of test fixtures and validation report |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Leftover private profile folders under `<memory>/runtime-skill-profiles/` from beta.2 runs are inert and may remain.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Claude/Codex/Grok native workspace skill discovery | Same as beta.1 | beta.1 in daily use | Low |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/ | User evidence | all | Read-only | Evidence |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-101 | No change between beta.1 and beta.2 outside `2448e166bd` depends on the private-profile path | Restore stays mechanical | Architecture investigation (diff beta.1..HEAD: only `2448e166bd`, `a2023feff3` unused imports, and merge `156ea2dacc` touch these files) | Verified for src |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-101 | Patch the private-profile path (SR-001) or restore beta.1 behavior? | Product direction | SR-001 patch vs. restore | The private path was an unapproved behavior change from a not-yet-live NFS project; beta.1 is proven in the user's daily use; restoring removes both bugs at their source. Restore. | User ("restore it") | Decided |
| DEC-102 | Keep the NFS-only private-profile code (unreachable) or remove it? | Dead code / NFS influence | Keep unused; remove | Without the deleted shared-workspace binding nothing can reach it; user: "We shouldn't do anything considering NFS right now". Remove; NFS reintroduces its own design later, with approval. | User direction + Solution Designer | Decided |
| DEC-103 | Restore beta.1 exactly, or also fix beta.1 quirks (e.g. a user-created same-skill Claude link is removed by the app at run end; Antigravity `.agents/skills` refusal; collision message wording)? | Scope | Exact restore vs. improvements | User asked to restore; improvements change behavior and belong to separate approved tasks. Exact restore; quirks → follow-ups. | Solution Designer (within direction) | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-101 | UC-101 | BEH-101 | AC-101..104 | SCN-101, 102, 104 |
| REQ-102 | UC-102 | BEH-102 | AC-105 | SCN-103 |
| REQ-103 | UC-101, UC-102 | BEH-103 | AC-106 | — |
| REQ-104 | — | BEH-104 | AC-107 | — |
| REQ-105 | UC-101, UC-102 | BEH-101, 102 | AC-101, 102, 104, 105 | SCN-101..104 |

## Architecture Phase Input

- Restore target: v1.5.6-beta.1 (`v1.5.6-beta.1` tag) skill exposure for Claude/Codex/Grok, minus the shared-workspace gate.
- Constraint: do not restore NFS non-skill pieces removed by the extraction.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (User, 2026-10-18, "Okay, restore it…")
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
