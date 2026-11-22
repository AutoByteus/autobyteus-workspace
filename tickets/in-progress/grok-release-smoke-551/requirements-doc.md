# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `grok-release-smoke-551`
- Request / ticket: Project Task `autobyteus-551`
- Requested by: `/project_task_manager`, on the founder's word of 2026-11-22 ("I think we really should have spend time to find out what the problem with grok ... create tickets for that and delegate to a software engineering team to work on grok.")
- Requirements owner: Solution Designer
- Date: 2026-11-22
- Approved by and reference: `User`, 2026-11-22, in the Solution Designer's conversation, answering DEC-003: "Since you found the reason I believe that you can have reasonable solution I trust your solution skills" (taken as approval of the recommended option (a) and of the whole basis)
- Exact approved requirements baseline / solution revision: `SR-001` (this document as of 2026-11-22)
- Behavior-defining supplements and their approved versions: none; evidence in `investigation-notes.md` and `evidence/SD-probes-2026-11-22.md`

## Problem And Desired Outcome

- Problem: Grok has failed the release smoke in beta.1, beta.3, beta.4 and beta.7, and the founder waived it almost every release. The investigation found three separate causes (`investigation-notes.md`):
  1. Grok's own startup sometimes takes 5–35 s on a loaded machine, a provider-side behavior. AutoByteus gives model discovery 15 s and run start-up 30 s.
  2. On a stale model cache, Grok first answers with its built-in model list (`grok-4.6`, `grok-4.5`) and replaces it with xAI's real list (`grok-4.7`) about 0.5 s later. AutoByteus reads the first answer and closes Grok, so it offers models that runs will refuse.
  3. Grok does not load a folder's own skills (`.grok/skills`) unless the folder is trusted. AutoByteus starts Grok without trust, so the skills it links into a run's workspace are invisible at session start.
- Affected actors or systems: AutoByteus users running Grok agents; the release smoke and the founder's release decision.
- Desired outcome: Grok agents start under load, offer the models xAI really offers, and see their workspace skills at session start. The release smoke then passes Grok without a waiver.
- Observable definition of success: two release-smoke runs at release-like load pass the Grok cases, and the live AC-104 case passes on every repeat (AC-001..AC-006).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Grok model discovery fails with "model discovery timed out" when Grok takes more than 15 s to answer `initialize` | Discovery waits as long as Grok's startup takes on a loaded machine, with margin, and still fails clearly when Grok never answers | Error text and the UI's handling of a failed discovery | Mode 1; beta.4 run 2 |
| BEH-002 | System | SCN-002 | Starting or restoring a Grok run fails when `initialize` takes more than 30 s (beta.3: 31.4 s, 34.6 s) | Run start waits with margin over the worst startup seen; a Grok that never answers still fails the run start | Other ACP request bounds (session open 120 s, prompts) unchanged; DeepSeek harness behavior unchanged apart from any shared start-up bound | Mode 1 |
| BEH-003 | User / System | SCN-003 | On a stale Grok cache, AutoByteus offers `grok-4.6`/`grok-4.5`, and not `grok-4.7`; a run later started with an offered model is refused `RUN_MODEL_NOT_OFFERED` once Grok's cache is fresh | AutoByteus offers the list xAI really offers, also on a stale cache; a model it offers is accepted when the run starts | Discovery of other runtimes; Grok model ids, effort options and the "not offered" refusal for models truly not offered | Mode 2; P4–P7 |
| BEH-004 | User / System | SCN-004 | A Grok run ignores the run workspace's `.grok/skills` at session start, including skills AutoByteus linked there; the agent finds them only if it searches files | A Grok run sees the run workspace's skills at session start, like Claude and Codex runs | Workspace skill linking rules (collision refusal, workspace-own skill wins); no permanent change to the user's Grok trust list | Mode 3; P8–P13 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| AutoByteus user with Grok | Run Grok agents and teams | Runs start, models offered are usable, workspace skills work | No change to their Grok settings or trust list on disk |
| Founder / release | Decide releases on a passing smoke | Grok passes without a waiver | Grok free tier: about two smoke runs per 24 h |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Grok model discovery (settings, run config, release smoke) | SCN-001, SCN-003 |
| UC-002 | Starting and restoring Grok runs, including team members | SCN-002, SCN-004 |
| UC-003 | Release-smoke verification of Grok | SCN-005 |

### Out Of Scope

- Per-scenario model re-resolution or retry in `release_smoke.py` / the live suite (563 FU-1): Task `autobyteus-567`. This ticket removes the cause; 567's owner decides whether it is still needed (DEC-005).
- Why Grok's startup step is slow under load (inside Grok, UNK-001); reporting it to xAI is a possible follow-up.
- Grok's refused-tool-calls live check (`autobyteus-550`).
- The Grok free-tier token quota.

### Non-Goals

- Making Grok's startup faster.
- Changing how other runtimes trust or load workspace files.

### Preserved Behavior Boundary

The preserved columns of BEH-001..004; the existing live-suite cases other than the bounds they wait on; the Claude, Codex, Antigravity and AutoByteus smoke steps.

### Prerequisites

None. (`autobyteus-538`, which the Task lists as a dependency, is not needed for these fixes.)

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Grok model discovery and Grok run start-up wait for Grok's `initialize` answer for at least 90 s before failing; a Grok that never answers still fails with the current clear error | BEH-001, BEH-002 | Must | Worst startup seen 34.6 s; 90 s ≈ 2.5×, the e06 precedent | Grok log P3; beta.3/4 timings | Task comment 2026-11-21; DEC-001 |
| REQ-002 | Grok model discovery returns the catalog Grok holds after its own catalog refresh, not its built-in start-up list, while adding at most a few seconds to a discovery | BEH-003 | Must | Root cause of `RUN_MODEL_NOT_OFFERED` and of a stale model picker | P4–P7: refresh notification within ~0.5 s of start | DEC-002 |
| REQ-003 | A Grok run loads the run workspace's own Grok skills (`.grok/skills`) at session start, without writing to the user's Grok trust list | BEH-004 | Must | Root cause of AC-104; parity with Claude and Codex | P9, P12 (45 → 46 skills, nothing persisted) | DEC-003 (needs user) |
| REQ-004 | The release smoke passes the Grok cases at release-like load, with evidence of Grok's startup times in those runs | BEH-001..004 | Must | The Task's goal | — | Task "Done when"; DEC-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Grok answers `initialize` after 40 s | Discovery succeeds with Grok's models | A Grok that never answers: discovery fails after the bound with the current error | Unit test with a scripted slow ACP agent (fake clock or short test bound through the same code path) |
| AC-002 | REQ-001 | BEH-002, SCN-002 | Grok answers `initialize` after 40 s at run start or restore | The run starts | Never answers: run start fails with the current error | Unit/integration test with a scripted slow agent |
| AC-003 | REQ-002 | BEH-003, SCN-003 | Grok starts with its built-in list, then announces the refreshed list | Discovery returns the refreshed list (`grok-4.7` in the live case) | Grok's cache already fresh (no announcement): discovery returns the start-up list within the added wait | Unit test with scripted announcements (built-in list then update; update before the answer; no update). Live: Grok shows its built-in list only on the first start after ≥ 6 h without Grok use (expired sign-in, P15), which cannot be produced on demand without touching its sign-in files; the first smoke run of AC-006 is started after ≥ 6 h of Grok idle and the discovery's Grok pid is checked in Grok's log (`had_real_catalog: false`) with the summary showing `grok-4.7`. If that idle period cannot be arranged, DEC-004 applies to this case too |
| AC-004 | REQ-002 | BEH-003, SCN-003 | A model AutoByteus offers for Grok | Starting a run with it is not refused `RUN_MODEL_NOT_OFFERED` | — | Covered by AC-003 plus the smoke (AC-006) |
| AC-005 | REQ-003 | BEH-004, SCN-004 | A Grok run in a workspace with its own `.grok/skills/<name>` and an agent package skill of the same name (AC-104) | The agent uses the workspace's own skill (reply contains the workspace code) on 3 of 3 live repeats; the user's `~/.grok/trusted_folders.toml` is unchanged | The configured-agent collision refusal is unchanged | Live AC-104 case ×3 with grok-4.7; trust-list file compared before/after; unit test of the launch environment |
| AC-006 | REQ-004 | SCN-005 | Two `python3 scripts/release_smoke.py` runs at load comparable to a release (load average ≥ 40, made by a concurrent build/test run) | Exit 0; Grok cases pass; summary and Grok's startup times from its log recorded | If Grok's slow startup does not occur during these runs, DEC-004 applies | Live, quota-aware (≈ one day's Grok tier) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal Or Event | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Server, for the user or smoke | Learn Grok's models | Model list load / catalog refresh | Loaded machine | Server starts Grok, reads its models | Models returned | Grok hangs: clear failure | Supported Normal | beta.4 run 2 | REQ-001, AC-001 |
| SCN-002 | User | User or team | Start/restore a Grok run | Run launch, team member activation, restore | Loaded machine | Server starts Grok, initializes, opens session | Run active | Grok hangs: run start fails | Supported Normal | beta.3/4 | REQ-001, AC-002 |
| SCN-003 | User | User | Pick a Grok model and run it | Model picker, run config | Grok's model cache stale (normal after time passes) | Discovery, user/smoke picks a model, run starts | Model offered = model accepted | — | Supported Normal | beta.7 run 1; P4–P7 | REQ-002, AC-003, AC-004 |
| SCN-004 | User | User | Agent uses skills | Run with workspace skills (linked or the workspace's own) | Workspace never trusted in Grok | Run starts, agent asked to use a skill | Agent sees the workspace's skills at start | Collision refusal unchanged | Supported Normal | AC-104 history; P12 | REQ-003, AC-005 |
| SCN-005 | Operational | Delivery engineer | Release smoke | `release_smoke.py` | Release-like load | Live suite incl. Grok | Pass, no waiver | Quota refusal handled as today | Supported Normal | RELEASE.md §Release smoke | REQ-004, AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A, not applicable (no visible change apart from the model list now matching xAI's).

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Measurable Requirement | Conditions | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Performance | Discovery adds at most ~5 s to a Grok model list load | Fresh or stale cache | Unit test bound; live probe timing |
| QR-002 | REQ-003 | Security | No write to the user's Grok trust list or config; trust applies only to processes AutoByteus starts, for the run's workspace | Every Grok run | AC-005 file comparison; launch-environment test |
| QR-003 | all | Privacy | No Grok credential file read or copied; logs kept as evidence carry no token fields | Investigation and validation | Evidence review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Grok's own model cache is refreshed by Grok itself as a side effect of discovery living long enough.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Grok Build 1.0.92 ACP: `initialize._meta.modelState`, `_x.ai/models/update` notification | Refreshed catalog announced after start | P6, P7 | Undocumented extension; may change with Grok versions (RSK-001) |
| Grok folder trust: `GROK_FOLDER_TRUST=0` | Disables the trust gate for that process only | P9, P12; Grok docs on trust | Env name is Grok's; a Grok update could change it — test guards the effect live |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/SD-probes-2026-11-22.md` + probe scripts | Probe record P1–P13 | all | Final | Evidence, no approval |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Grok's slow startup step stays under ~90 s on the release machine | REQ-001 bound | AC-006 logs; RSK in follow-ups if exceeded | Open |
| ASM-002 | Grok announces the refreshed catalog within a few seconds when its cache is stale | REQ-002 | AC-003 live probe | Supported by P6 |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How long may Grok take to start? | 15 s / 30 s fail under load | Worst seen 34.6 s; e06 precedent: 90 s for 34 s | The delay is inside Grok and not reproducible on demand; a bound of ~2.5× the worst seen keeps a hung Grok bounded and matches the Antigravity precedent the PM asked for. 90 s for both discovery and run start-up. | Solution Designer | Decided |
| DEC-002 | Which Grok model list counts? | Built-in list causes refused runs | (a) wait briefly after `initialize` for Grok's refresh announcement and use the newest list; (b) re-check per run; (c) smoke-only retry | (a) fixes the cause for users and the smoke; (b)/(c) only hide it. Also lets Grok refresh its own cache. | Solution Designer | Decided |
| DEC-003 | May AutoByteus start Grok with the run workspace trusted (`GROK_FOLDER_TRUST=0`, per process, not saved)? | Without it Grok ignores workspace skills (AC-104 fails, linked skills are invisible). **Security:** trust also makes Grok load that workspace's Grok hooks, MCP/LSP servers and `AGENTS.md` | (a) process-scoped trust for every AutoByteus Grok run; (b) `--trust` — saves a permanent entry per workspace in the user's Grok settings; (c) keep untrusted and change the test; (d) list skills in the agent's instructions instead | The workspace is the folder the user chose for the run, and AutoByteus Claude runs already load that folder's project settings (hooks, MCP) and Codex discovers its skills, so (a) gives Grok the same trust the other runtimes already have, with nothing saved. (b) pollutes the user's settings; (c) leaves a real product gap; (d) duplicates Grok's skill loader. **Recommend (a).** | User | Decided by the user: (a), 2026-11-22 |
| DEC-004 | Evidence decision — AC-006 at "realistic load" | Grok's slow startup cannot be produced on demand (today 0.2–0.5 s even with 5 parallel starts) | Evidence: unit tests of the 90 s bounds with a slow scripted agent (AC-001/002); two live smoke runs at load ≥ 40 with Grok's startup times from its log; historical worst case 34.6 s. Missing proof: a live Grok startup above 30 s handled end to end, if it does not occur during validation | Accept the scripted proof of the bound plus the loaded live smoke; untested scope: a live > 30 s Grok startup. If one occurs during validation, it is recorded as the live proof. Follow-up only if a run exceeds 90 s. | Solution Designer | Decided |
| DEC-005 | Do the smoke changes of 563 FU-1 belong here? | Overlaps Task `autobyteus-567` | Root cause fixed by DEC-002 | Keep 567 separate: this ticket removes the drift; tell the PM that 567's "why the list changes" is answered and its retry may no longer be needed. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-002 | P3, beta.3/4 |
| REQ-002 | UC-001 | BEH-003 | AC-003, AC-004 | SCN-003 | P4–P7 |
| REQ-003 | UC-002 | BEH-004 | AC-005 | SCN-004 | P8–P13 |
| REQ-004 | UC-003 | BEH-001..004 | AC-006 | SCN-005 | RELEASE.md |

## Architecture Phase Input

- Scenarios to map: SCN-001..005.
- Constraints: no write to the user's Grok settings; no credential reads; other runtimes unchanged.
- Deferred to design: whether the 90 s start-up bound is Grok-specific or shared by all ACP runtimes; separating the `initialize` bound from the other requests that reuse `INITIALIZE_TIMEOUT_MS`; the settle-window length and how discovery ends early; where the trust variable is set.
- Facts to verify: live-suite bounds that could fire before 90 s (`workspace-skill-links-live.e2e.test.ts:143` has 120 s); whether run start re-runs discovery; restore path.
- Risks: RSK-001 (catalog announcement late under load), RSK-002 (trust scope).

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

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
