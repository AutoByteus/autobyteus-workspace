# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `release-smoke-new-run-skill-links`
- Request / ticket: Project Task `autobyteus-149` — Release smoke checks: add "same-skill link in the workspace" and "brand-new run of an agent with configured skills" scenarios (follow-up F6 of autobyteus-142)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer conversation message to the user, 2026-10-19 (approval summary at the end of the requirements phase). Confirmed by the `User` after a walkthrough, 2026-10-19: "I feel like it's a good one. If it is able to guard those problems, and we can just update the release … And this belongs to the project specific release strategy. I think it's good." The user keeps the full scope and a documented RELEASE.md step without script enforcement (FU-1 not wanted).
- Exact approved requirements baseline / solution revision: this document at SR-001
- Verification basis note (SR-004, 2026-10-29): AC-001's full passing run is accepted by the user with one gap. Codex was not rerun at the head because of the account usage limit, and its 2026-10-19 pass (IMP-07) stands. The user's words: "we can accept that the credit is not there and only codex app server is not tested … i will personally accept it".
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: The only checks before tagging are licensing and repository hygiene (RELEASE.md). No check starts an agent run before a release. The v1.5.6-beta.2 regression stopped runs from starting in a workspace with same-skill links, and stopped every brand-new run (ENOENT on the missing memory folder). It shipped in two betas, and the user found it himself.
- Affected actors or systems: the release owner (Delivery Engineer acting for the user); every user who installs a beta or stable release.
- Desired outcome: before every release tag, one command checks that runs start on every supported runtime in the user's setup. The command covers a brand-new run of an agent with configured skills, and a run in a workspace holding same-skill links. It gives a clear pass/fail per runtime. A failure stops the release.
- Observable definition of success: RELEASE.md lists the command among the checks before tagging. Run on the commit to be tagged, the command reports pass for each scenario on Claude, Codex, Grok, Antigravity and AutoByteus. It fails if any scenario fails, is skipped, or cannot run.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | Before tagging, only `check_licensing.py` and `check_repository_artifact_hygiene.py` run. No agent run is started. | A release smoke check also runs before every tag (beta and stable), on the merged state to be tagged. A failure blocks the tag. | Existing checks, release decision, cutting and rollout steps | INV Source Log: RELEASE.md |
| BEH-002 | Operational | SCN-001 | `workspace-skill-links-live` runs only when a ticket chooses to. It drops a runtime silently when its CLI is missing, and may fall back to any available model. | Run as part of the smoke, a runtime that cannot run, or whose cheap model is missing, is a failure with a clear reason, never a silent skip. The model is the runtime's cheapest, chosen explicitly. | Gated by default; outside the smoke, the per-runtime gates keep working as today | INV: test file |
| BEH-003 | System | SCN-001..SCN-003 | Run start works on all runtimes since autobyteus-142 | Unchanged; the smoke only observes it | All product behavior | autobyteus-142 evidence |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Release owner (Delivery Engineer) | Cut a release that does not break run start | One command, a clear verdict and a summary to put in the release report | Runs on the release machine with the CLIs signed in |
| User | Receives betas and stable releases | A run-start regression is caught before publishing | Live runs spend the user's credits: cheap, few turns |
| autobyteus-65 / autobyteus-148 owners | CI gating; stale suite repair | No duplication or overlap | This ticket adds no CI and repairs no other suites |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The release owner runs the release smoke check before tagging a beta or stable release and gets a per-runtime verdict | SCN-001, SCN-002, SCN-004 |
| UC-002 | The smoke check starts runs of an agent with configured skills in a workspace with same-skill links, and brand-new runs, on all five runtimes | SCN-001, SCN-003 |

### Out Of Scope

- CI gating or running any of this in GitHub workflows (autobyteus-65).
- Repairing the other stale gated suites (Codex backend-factory, thread-manager, thread and client-manager suites; Claude open_tab fixture; Codex memory-persistence and interrupted-compaction E2E) — autobyteus-148.
- Any change to product behavior, including F2/F3 (the app removes a user's own same-skill Claude link at run end; Antigravity refuses `.agents/skills/<name>`) — autobyteus-150. The smoke does not assert either behavior.
- Grok native listing of `.grok/skills` (F7 / autobyteus-144).
- The isolated desktop instance journey as a routine pre-release step.
- Enforcing the check mechanically in `scripts/desktop-release.sh` or the release workflows.

### Non-Goals

- Broad pre-release regression coverage beyond run start with configured skills (other runtime features are not added to the smoke).
- Proving paid inference quality.

### Preserved Behavior Boundary

- BEH-003 (all product behavior) unchanged; no production source changes.
- Existing release steps in RELEASE.md (Finalization Target, Release Decision, the two existing checks, Cutting The Release, Rollout, Recovery) unchanged except for the added check.
- `workspace-skill-links-live`, `agy-linked-skills-transport` and other suites keep their current gates and cases when run on their own.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | One command runs the whole release smoke check from the repository root and exits non-zero unless every required scenario passed on every required runtime. | BEH-001 | Critical | A single, unambiguous pre-tag step | Task; DEC-001 |
| REQ-002 | On Claude, Codex and Grok, the smoke check uses the real CLI: (a) a new run in a workspace with same-skill links starts, keeps the link and answers from the skill; (b) the same run restored ("continue") answers from the skill; (c) a brand-new team member with configured skills, whose memory folder does not exist yet, starts and answers from the skill; (d) a different same-named workspace skill refuses a configured-skill agent and is used by an all-installed agent. | BEH-001, BEH-002 | Critical | These runtimes' own skill discovery is part of the behavior under test | Task; autobyteus-142 SCN-101..104; DEC-002 |
| REQ-003 | On Antigravity and AutoByteus, the smoke check uses scripted fixtures with no model or provider call: a brand-new run, and a brand-new team member, of an agent with configured skills, in a workspace with same-skill links, start and can reach the configured skill. | BEH-001 | High | Covers the remaining supported runtimes at zero cost | Task ("scripted fixtures where a live run is not needed"); DEC-002 |
| REQ-004 | Live runs use each runtime's cheapest model at low reasoning effort, with short prompts. The model can be overridden. When the chosen model is not available, the check fails and lists the available models; it does not fall back to an arbitrary model. | BEH-002 | High | Cost bound | Task (cost); DEC-005 |
| REQ-005 | A required runtime or scenario that is skipped, cannot start (CLI missing, not signed in, gate not set) or has no result counts as failed, with the reason shown. | BEH-002 | Critical | TESTING.md: "A skip is not a pass" | DEC-004 |
| REQ-006 | The command prints a per-runtime, per-scenario summary with the tested commit and models, suitable for pasting into the delivery/release report. | BEH-001 | Medium | Durable release evidence | DEC-001 |
| REQ-007 | RELEASE.md "Checks Before Tagging" requires the smoke check before every beta and stable tag, on the merged state to be tagged. It states the prerequisites (signed-in CLIs on the release machine), the cost, what a failure means (no tag; fix first) and the only exception (an explicit user waiver recorded in the release report). TESTING.md lists the command in its test-layer table. | BEH-001 | Critical | "Documented where the release rules live" | Task; DEC-001, DEC-003, DEC-004 |
| REQ-008 | The smoke check uses only test-owned packages, workspaces, app data and a throwaway `CODEX_HOME`. It never touches the user's workspaces, app data or CLI config. It leaves no tracked or untracked files in the worktree, so the release script's clean-worktree check still passes afterwards. | BEH-001 | Critical | TESTING.md data rules; release script requires a clean worktree | TESTING.md; RELEASE.md |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-006 | SCN-001 | Release machine with Claude, Codex, Grok signed in; dependencies installed; the command run on the commit to be tagged | Exit 0. The summary lists each runtime × scenario as passed, with the commit and the models used. | — | Run the command; record its output |
| AC-002 | REQ-002 | SCN-001, SCN-003 | As AC-001 | Claude, Codex and Grok each pass scenarios (a)–(d) of REQ-002 through the real server and CLI | — | Summary + suite output |
| AC-003 | REQ-003 | SCN-001, SCN-003 | As AC-001 | Antigravity (scripted CLI) and AutoByteus (scripted LLM) each pass the brand-new run and brand-new team member scenarios in a workspace with same-skill links; no provider call is made | — | Summary + suite output |
| AC-004 | REQ-005 | SCN-004 | One required CLI missing or a gate unset (e.g. `PATH` without `grok`) | Exit non-zero; the summary names the runtime and the reason ("not available" / "skipped") | — | Negative run of the command |
| AC-005 | REQ-001 | SCN-004 | A scenario fails (e.g. a deliberately broken assertion or a regression) | Exit non-zero; the failing runtime × scenario is named | — | Negative proof (temporary, not committed) |
| AC-006 | REQ-004 | SCN-001 | Default run | Models: Claude `haiku`, Codex the cheapest current model (`gpt-5.6-luna` today), Grok `grok-4.7` at low effort. With an override env var, that model is used. With an unavailable pinned model, the check fails and lists available models. | — | Summary; negative run with a bogus model override |
| AC-007 | REQ-007 | SCN-002 | Read RELEASE.md and TESTING.md | RELEASE.md "Checks Before Tagging" contains the command, when it runs (every beta and stable tag), prerequisites, cost, failure rule and waiver rule. TESTING.md test-layer table has one row for it. | — | Doc review |
| AC-008 | REQ-008 | SCN-001 | After a full run | `git status --porcelain` in the worktree is unchanged by the run; no user folders or CLI configs changed (Codex used a throwaway home) | — | `git status` before/after; review of fixtures |
| AC-009 | Preserved | BEH-003 | Full server typecheck and the touched suites run on their own | Typecheck passes; touched suites keep their existing cases passing with their existing gates | — | Typecheck + suite runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Release owner | Prove run start works in the user's setup before a tag | The smoke command | Merged state to be tagged; CLIs signed in | Run the command → live tier on Claude/Codex/Grok, scripted tier on AGY/AutoByteus → summary | All pass → proceed to tag | Any failure/skip → no tag | Supported Normal Scenario (new operational step) | Task; autobyteus-142 F6 | REQ-001..006, REQ-008; AC-001..006, AC-008 |
| SCN-002 | Contract | RELEASE.md | Release rules require the check | Reading RELEASE.md before tagging | — | Checks Before Tagging lists the smoke | Release owner runs it | User waiver recorded in the release report | Supported Normal Scenario | Task "documented where the release rules live" | REQ-007; AC-007 |
| SCN-003 | User (simulated) | User | Start agents with configured skills in a repo with same-skill links; brand-new runs and team members | createAgentRun / first message / lazy team member / restore | Workspace `.claude/.codex/.grok/skills/<s>` link to the package skill | As autobyteus-142 SCN-101..104 | Runs start and use the skill | Different same-named skill → refusal (configured) / preference (all-installed) | Supported Normal Scenario (+ beta.1 edge contract for SCN-104) | autobyteus-142 requirements | REQ-002, REQ-003; AC-002, AC-003 |
| SCN-004 | Operational | Release owner | Know why the check did not pass | The smoke command | A CLI missing, not signed in, a model retired, or a regression | Run the command | Non-zero exit; the runtime/scenario and reason are named | — | Supported Explicit Edge Scenario (TESTING.md "A skip is not a pass") | TESTING.md | REQ-004, REQ-005; AC-004..006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. All Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 | Other (cost) | Live tier: at most about 6 short turns per live runtime per smoke run, on the cheapest model at low effort | Every smoke run | Count prompts in the suite; summary lists models |
| QR-002 | REQ-001 | Operability | A full smoke run takes under about 10 minutes on the release machine | Normal network | Timing in the summary |
| QR-003 | REQ-008 | Reliability | Suites run serially (shared test DB) | Every smoke run | Runner design |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Only test-owned temp data, removed after the run. Claude and Grok sessions created by the live run land in the host CLIs' own session stores, as with any existing live suite.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Claude/Codex/Grok CLIs signed in on the release machine | Needed for the live tier | INV Source Log | Login expiry → clear failure (RSK-001) |
| Codex model catalog | Cheapest model present | INV | Retirement → clear failure (RSK-003) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `tickets/done/workspace-skill-collision-fix/` (finalized, read-only) | Scenario basis | REQ-002, REQ-003 | Final | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Releases are cut on a machine where the user's Claude, Codex and Grok CLIs are signed in (as for every live run so far) | The live tier needs them | First smoke run during validation; waiver rule covers exceptions | Open (validated in API/E2E) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does the check live? | Must be found and run before a release | (a) RELEASE.md step + one command + suites in the server E2E tree; (b) release GitHub workflows; (c) inside `desktop-release.sh` | Workflows have no CLI logins and CI is autobyteus-65's scope. The release script is also used for build-only tests and manual dispatch. RELEASE.md is where the release owner reads the pre-tag checks, and the existing checks are plain commands there too. **(a)**, with one TESTING.md row for the new command (TESTING.md's own rule). | Solution Designer | Decided |
| DEC-002 | Live or scripted per runtime? | Cost vs. fidelity | Live for all; scripted for all; mixed | For Claude/Codex/Grok, run start depends on the real CLI's skill discovery (Codex decides materialization from its own `skills/list`); a scripted stand-in would decide the behavior under test, and the Claude/Codex stand-ins answer no turn. Live on the cheapest model costs about 5 short turns per runtime (autobyteus-142: 40–60 s each). For Antigravity there is no isolated signed-in recipe and a live run writes into the user's `agy` history; its scripted CLI runs the real server path. AutoByteus skills come from the server catalog/prompt, with no CLI; a deterministic LLM proves the start path. **Live for Claude/Codex/Grok; scripted for Antigravity/AutoByteus.** | Solution Designer | Decided |
| DEC-003 | Before which releases? | The regression shipped in betas | Every tag; stable only; only when skill/runtime code changed | The user runs betas, and both affected releases were betas. Change-based selection would miss regressions from shared code and is hard to judge. The cost is small. **Every beta and stable tag.** | Solution Designer | Decided |
| DEC-004 | What does a skipped or unavailable runtime mean? | A silent skip is how a check stops checking | Fail; warn; pass | TESTING.md: "A skip is not a pass." The user decides releases, so he can still release knowingly. **Fail; the only exception is an explicit user waiver at the release decision, recorded in the release report with the runtime and reason.** | Solution Designer | Decided |
| DEC-005 | Which models? | Cost and stability | Cheapest pinned; first available; user's default | Arbitrary fallback hides cost and changes silently. **Pin the cheapest per runtime (Claude `haiku`, Codex `gpt-5.6-luna` today, Grok `grok-4.7` — its only model — at low effort), override by env var, fail with the available list when missing.** | Solution Designer | Decided |
| DEC-006 | Include the isolated desktop instance journey? | Fidelity vs. time | Include; exclude | It needs a full app build and a manual workspace registration (the native folder picker cannot be automated). The embedded server runs the same server path the live tier uses. Packaged server startup is already checked by the release workflow. **Exclude from the routine smoke**; it stays a ticket-level validation layer. | Solution Designer | Decided |
| DEC-007 | Scenario set for Antigravity/AutoByteus | Coverage vs. relevance | Full set; start scenarios only | Neither runtime reads `.claude/.codex/.grok/skills`. The collision and all-installed cases are workspace-link materializer contracts for the other three. Antigravity's own `.agents/skills` collision behavior awaits the user's decision (autobyteus-150). **Brand-new run and brand-new team member in a linked workspace only.** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-005 | SCN-001, SCN-004 | — |
| REQ-002 | UC-002 | BEH-001, BEH-002 | AC-002 | SCN-001, SCN-003 | autobyteus-142 |
| REQ-003 | UC-002 | BEH-001 | AC-003 | SCN-001, SCN-003 | autobyteus-142 |
| REQ-004 | UC-001 | BEH-002 | AC-006 | SCN-001, SCN-004 | — |
| REQ-005 | UC-001 | BEH-002 | AC-004 | SCN-004 | — |
| REQ-006 | UC-001 | BEH-001 | AC-001 | SCN-001 | — |
| REQ-007 | UC-001 | BEH-001 | AC-007 | SCN-002 | — |
| REQ-008 | UC-001, UC-002 | BEH-001 | AC-008 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-004.
- Constraints: no production source change; no CI; no repair of autobyteus-148 suites; no F2/F3 assertions; serial execution; clean worktree after the run; clean environment per TESTING.md.
- Deferred to architecture: runner location and form; how per-runtime results are gathered; where the Antigravity and AutoByteus scenarios live; how the live suite fails on a missing runtime/model in smoke mode; retry policy for stochastic live answers.
- Technical facts to verify: vitest JSON reporter output; the Codex cheapest model in the live catalog; the AGY suite's `HOME` requirement.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-10-19)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
