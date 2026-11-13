# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `running-agent-config-reload-460`
- Request / ticket: Project Task `autobyteus-460` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-13
- Approved by and reference: `User`, 2026-11-13, in the Solution Designer's conversation: "Since you think the dynamic skill update is possible … let's consider add a new skill. If you think it's doable, then let's start your work". Earlier in the same conversation: "we still want to materialize it"; for removal "maybe just a simple message … your skill has been removed"; for AutoByteus native the system prompt is not changed (cache; FU-006 sent at the user's request).
- Exact approved requirements baseline / solution revision: SR-002 (this document)
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: a run takes its agent's configuration when it is activated (started, or resumed after a stop, an app restart or an idle shutdown). After that, only tool changes reach it (autobyteus-324). When the user adds or removes a skill, the running agent keeps its old skill list, is not told, and the user cannot tell that anything is missing. On 2026-11-10 the Project Task Manager (PM) could not use GitHub. On 2026-11-13 it did not get the reflection skill.
- Affected actors or systems: the user; every running agent (standalone, team member, delegated copy) on all six runtimes.
- Desired outcome: when the user adds or removes a skill, every running agent of that definition hears it once ("Now available: … / No longer available: …"), and an added skill is usable at once. Where something still needs a restart (integration access), the agent and the user are told so plainly.
- Observable definition of success: after adding `reflection` to the PM while its run is open, the PM's next turn (or its current one, if busy) shows a "Skill updated" card naming `reflection` with its `SKILL.md` path, and the PM can follow the skill without a restart, on any runtime.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Added skill not seen until the next activation; agent not told | Agent told at once (busy) or with its next input (idle); skill usable by its path | Runs are never woken; one notice per input | investigation-notes BEH-001 |
| BEH-002 | User | SCN-002 | Removed skill stays until the next activation | Agent told it is no longer available; its content notices stop | Files on disk are not touched | BEH-002, Claude probe |
| BEH-003 | User | — | Tools live (autobyteus-324) | Unchanged | All of autobyteus-324 | BEH-003 |
| BEH-004 | System | — | Content notices for used skills | Also cover a skill added mid-run; stop for a removed one | Notice text and rules of autobyteus skill notices | BEH-004 |
| BEH-005 | User | SCN-003 | Integration skill added mid-run: no access, nobody told | Notice says the service access starts when the run is restarted (DEC-004) | autobyteus-337 rule; no access granted mid-run | BEH-005 |
| BEH-006 | User | SCN-004 | Integration skill removed: access ends at the next call | Unchanged, plus the agent is told | Live withdrawal | BEH-006 |
| BEH-007 | User | — | Instructions, semantic memory: at the next activation only | Unchanged in this ticket (DEC-005) | — | BEH-007 |
| BEH-008 | User | SCN-005 | A resumed run hears skills that disappeared; skills added meanwhile are silently "seen" | A resumed run hears what changed since it was last told, added and removed (as tools do) | No retroactive notice for runs without a record | BEH-008 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Improve an agent while its runs keep working | Changes to skills take effect without a restart, and nothing is left unexplained | Keep it simple |
| Running agent | Use the skills it has | Knows its current skill list and where each skill is | No access beyond its definition |
| Integration owner (autobyteus-337) | Access only through the explicit skill rule | No mid-run grant outside the rule | Unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A skill is added to an agent's configuration while a run of that agent is active | SCN-001, SCN-003 |
| UC-002 | A skill is removed from an agent's configuration while a run of that agent is active | SCN-002, SCN-004 |
| UC-003 | A stopped run is resumed after its agent's skills changed | SCN-005 |

### Out Of Scope

- Live application of instructions, semantic memory, model or other definition parts (reported; DEC-005).
- Removing a skill's folder link when the skill is removed mid-run (future; FU-007).
- Live integration access (grants and shell variables) for a running session (DEC-004).
- Skill changes that come from the skill catalog alone (installing, removing or disabling a skill for an agent with all installed skills) without a definition change (FU-004).
- Antigravity restore keeping its run-start capsule (FU-002); shared workspace skill folders (FU-001).
- A "restart with new configuration" button (stop and resume already does it, except on Antigravity).

### Non-Goals

- That every runtime lists an added skill in its own skill list during the run: only Claude is proven; the others may only list it after the next activation. The notice makes it usable regardless.
- Changing AutoByteus native's system prompt during a run (FU-006).
- Enforcing that a removed skill's files cannot be read. Removal is an instruction to the agent. Only integration access is enforced.

### Preserved Behavior Boundary

- BEH-003 (live tool lists), BEH-004 (content notices), BEH-006 (live integration withdrawal), REQ-007.
- Cross-cutting: a run is never woken or given a turn by a notice. One input carries at most one platform notice (tools, then skills, then background tasks).

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

Approved direction (DEC-001): the message on every runtime, plus the runtime setup of an added skill (REQ-008). Removal is a message only (DEC-007).

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When an agent definition's skills change, each tracked run of that definition (standalone, team member, delegated copy; every runtime) hears the difference between the skill names it was last told about and its definition's current effective skills, once. | BEH-001, BEH-002 | Must | The user's wish; mirrors tools | The definition change signal and the seen record exist (investigation) | Task; DEC-001 |
| REQ-002 | For each added skill, the notice gives its name, its description and the absolute path of its `SKILL.md`, and asks the agent to read it before work the skill governs. Relative paths in the skill resolve from that skill's folder. The skill is usable from that moment on every runtime. | BEH-001 | Must | A skill is a folder; every runtime reads files by path | Native skills work this way; content notices already point every runtime at catalog folders (A-001) | DEC-001 |
| REQ-003 | For each removed skill, the notice says it is no longer available and not to rely on it. Nothing else changes in the running session (its folder link, if any, stays until the run ends; DEC-007). | BEH-002, BEH-006 | Must | The model keeps what it saw (Claude probe) | Measured | DEC-001 |
| REQ-004 | From the change on, content notices cover the run's current skills: an added skill's file changes are noticed, a removed skill's are not. | BEH-004 | Must | Consistency | Existing watcher follows the tracked set | DEC-001 |
| REQ-005 | When an added skill is an integration skill whose access the run does not hold, the notice says that access through it (e.g. GitHub) starts when the run is restarted (stop it, then send a message). No access is granted to the running session. | BEH-005 | Must | autobyteus-337; honest | Variables are fixed in the running process (investigation) | DEC-004 |
| REQ-006 | A resumed run hears, with its first input, the skills added and removed since it was last told. A run without a record hears nothing retroactively. | BEH-008 | Should | Same rule as tools; also covers Antigravity, whose restore does not re-link | Seen record keyed by name | DEC-002 |
| REQ-008 | When a skill is added, the running agent's runtime also gets it set up as at run start, where the runtime keeps skill folders: Claude, Codex, Grok and DeepSeek link it into the workspace's skill folder (Codex: unless it already discovers that copy itself), Antigravity into its run folder (kept when the run is resumed). AutoByteus native gets no system prompt change (FU-006). A failure to set it up is logged and never fails the run; the notice still gives the path. | BEH-001 | Should | The user: "we still want to materialize it"; Claude then lists it itself | Measured for Claude; others' own pickup unproven (U-001) and not required | DEC-001 |
| REQ-007 | Preserved: delivery follows the existing skill notice rules: a busy run gets it now as a system message, an idle run gets it combined with its next input, nothing wakes a run, a failed delivery stays pending, and a save that changes no skill name (or a reverted change) produces nothing. | BEH-003, BEH-004 | Must | Existing contract | Existing | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-007 | SCN-001 | An idle run; the user adds skill X to its agent | The run's next input carries one notice "Now available: X — <description>, `<abs>/SKILL.md`"; the web shows a skill notice card; the user's message is shown unchanged | Busy run: the notice arrives now as a system message | Server unit + E2E on one CLI runtime and native |
| AC-002 | REQ-002 | SCN-001 | After AC-001 | The agent can read and follow X without a restart (real runtime) | — | Live check on at least native and Claude |
| AC-003 | REQ-001, REQ-003 | SCN-002 | The user removes skill Y | One notice "Y is no longer available"; later edits of Y's files produce no notice to that run | — | Unit + E2E |
| AC-004 | REQ-007 | — | The user saves the agent without skill changes, or adds then removes X before the run's next input | No skill notice | — | Unit |
| AC-005 | REQ-004 | SCN-001 | After AC-001, X's `SKILL.md` changes | The existing "skill updated" content notice names X | — | Unit |
| AC-006 | REQ-005 | SCN-003 | The user adds the GitHub integration skill to a running agent that had no GitHub access | The notice names the skill and says GitHub access through it starts when the run is restarted; no grant is added to the run's pass | After stop and a new message, the resumed run has access | Unit + E2E (pass registry) |
| AC-007 | REQ-003 | SCN-004 | The user removes the GitHub skill from a run that had access | The next proxied call is refused (unchanged) and the agent is told | — | Existing tests stay green + unit |
| AC-008 | REQ-006 | SCN-005 | A stopped run's agent gains X and loses Y; the user sends a message | That message carries one notice: X now available, Y no longer available | No record: no notice | Unit |
| AC-009 | REQ-001 | — | Two runs of the same definition, one a team member | Both get their own notice | — | Unit |
| AC-011 | REQ-008 | SCN-001 | A Claude run; the user adds skill X | A link `<workspace>/.claude/skills/x` to X's folder exists before the notice is sent; Claude's own skill list shows X at its next turn; the link is released when the run ends | Link refused (a user-owned folder of that name): logged, notice still sent | Unit + live Claude |
| AC-012 | REQ-008 | SCN-001 | Codex, Grok, DeepSeek and Antigravity runs; the user adds X | The link exists in the runtime's skill folder (Antigravity: in its run folder, and still there after stop and resume); released at run end | Native: no system prompt change | Unit per backend |
| AC-010 | REQ-007 | BEH-003 | A save changes both tools and skills | Tools notice with this input, skill notice with the next (existing one-notice-per-input rule) | — | Unit |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Give a running agent a new skill | Agents page skill section, or the package's `agent-config.json` (package reload) | A run of the agent is open | Add skill → save → the agent's next turn | The agent knows and can use the skill | Busy run: notice inside or after the current turn per runtime | Supported Normal Scenario | 2026-11-13 reflection incident | REQ-001, 002, 004; AC-001, 002, 005, 009 |
| SCN-002 | User | User | Take a skill away | Same | Same | Remove skill → save | Agent told it is gone | — | Supported Normal Scenario | Task | REQ-001, 003; AC-003 |
| SCN-003 | User | User | Give a running agent GitHub | Same | Run without GitHub access | Add github-integration → save | Agent and user told that access starts at the restart | — | Supported Normal Scenario | 2026-11-10 incident | REQ-005; AC-006 |
| SCN-004 | User | User | Withdraw GitHub | Same | Run with access | Remove the skill | Access refused at the next call; agent told | — | Supported Normal Scenario | autobyteus-337 | REQ-003; AC-007 |
| SCN-005 | User | User | Resume a stopped run after changing its skills | Send a message to a stopped run | Stopped run | Change skills → message | Changes announced once | No record: silent | Supported Normal Scenario | PM restore 2026-11-12 | REQ-006; AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, minimal: the existing skill notice card (system notice, "Skill updated" / 技能已更新) shows the new "Now available" / "No longer available" text. No new screen or control.
- Linked UI/UX or interaction supplement: N/A — not applicable
- Product Design fields: N/A — not applicable (no Product Design requested)
- Product decisions that need the user: DEC-001 (which option).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | One definition re-read per tracked run per change burst (coalesced, as tools) | Many runs | Unit |
| QR-002 | REQ-005 | Security | No integration grant or variable is given to a running session | All runtimes | Unit |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`, `<memoryDir>/seen_skill_versions.json` gains names when told (same shape).
- Data that must be preserved: existing records. "No record" keeps meaning "has seen its current skills".
- Acceptable loss: none needed; no migration.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| autobyteus-337 integration rule | Access only from the explicit skill rule; live withdrawal | `integration-access-rule.ts` | None |
| Runtime file reading | Every runtime can read a file by absolute path | A-001 | A run without auto-execute may ask once for approval (R-001) |
| Claude CLI skill hot-reload | Only for option B | Probe | CLI version drift |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/claude-skill-hot-reload-probe*` | Claude measurement | DEC-001 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | An agent follows a skill read by path as it follows a natively listed one | REQ-002 | AC-002 live check | Holds for native (that is how native works) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How should a running agent take a skill added or removed in its configuration? (**Decided by the user 2026-11-13: A plus the runtime setup of an added skill, i.e. B for adding; REQ-008.**) | The ticket's direction | **A** Notice only: the platform tells the agent (name, description, `SKILL.md` path; or "no longer available"), on all six runtimes, with no runtime-specific work; the runtime's own list catches up at the next activation. **B** A plus re-linking skill folders into the running workspace, so Claude's own Skill tool lists it at once (measured), while Codex/Grok/dsh/AGY are unproven and each needs its own work. **C** No live change: a card tells the user the run needs a restart. | A gives the user's wish on every runtime at once, reuses the tools pattern and the existing skill notice owner, and needs no backend changes. B adds per-runtime link management in shared workspace folders (FU-001) for a convenience the notice already gives. C leaves the PM, which cannot be restarted safely before autobyteus-461, without its skills. **Recommend A.** | User | Decided (A + setup on add) |
| DEC-002 | Should a resumed run also hear skills added while it was stopped? | Today it silently records them as seen | Tools already do this | Same rule for both; it also covers Antigravity, whose restore does not re-link. Recommend yes. | Solution Designer | Decided |
| DEC-003 | Should catalog-only changes (installing, removing or disabling a skill for an agent with all installed skills) trigger the notice? | Same symptom, different trigger | The definition change signal does not fire for catalog changes | Keep this ticket to configuration edits, as asked; FU-004. Any re-resolution after a definition change still uses the current catalog. | Solution Designer | Decided |
| DEC-004 | When an integration skill (GitHub) is added to a running agent, should its access start live? | The 2026-11-10 incident | **Restart** (recommended): the notice says access starts when the run is restarted (stop, then send a message); nothing changes in the running session. **Live**: grants plus shell variables for every runtime, built per runtime: native by a small change to its shell environment; Grok and DeepSeek by triggering their existing reopen at the next turn; Claude, Codex and AGY by a new session reopen at the next turn. | Shell variables cannot be put into a running process. Live access means a new reopen path for three runtimes, which would be the largest and riskiest part of this ticket. The skill's own check already stops with a clear message. Recommend **restart** now, with live access as a later ticket if you want it. | User | Decided (restart; the user's go-ahead on the presented recommendation, 2026-11-13) |
| DEC-005 | Should other configuration parts that don't reach a running agent (instructions, semantic memory switch) be handled here? | Same "left guessing" problem | Every runtime applies them at the next activation (Antigravity: only in a new run). Options: report only (recommended) or add a "restart to apply" card now. | The ticket asks about skills; instructions need a different notice (a whole prompt, not a path) and a design of their own. Recommend a follow-up ticket (FU-005). | User | Decided (follow-up; same go-ahead) |
| DEC-007 | Removal: message only, or also unlink? | The user: "maybe just a simple message … your skill has been removed"; "maybe we do it in the future" | Unlinking means per-runtime holder release in shared folders | Message only now; unlinking is FU-007 | User | Decided |
| DEC-006 | Card label and sender | Visible text | Reuse the skill notice (sender `system.skill_update_notifier`, card "Skill updated") with the new blocks | One skill notice per input, as today; no new card type. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, 002 | AC-001, 003, 004, 009, 010 | SCN-001, 002 | — |
| REQ-002 | UC-001 | BEH-001 | AC-001, 002 | SCN-001 | — |
| REQ-003 | UC-002 | BEH-002, 006 | AC-003, 007 | SCN-002, 004 | Claude probe |
| REQ-004 | UC-001, UC-002 | BEH-004 | AC-005 | SCN-001 | — |
| REQ-005 | UC-001 | BEH-005 | AC-006 | SCN-003 | — |
| REQ-006 | UC-003 | BEH-008 | AC-008 | SCN-005 | — |
| REQ-007 | UC-001, UC-002 | BEH-003, 004 | AC-001, 004, 010 | — | — |
| REQ-008 | UC-001 | BEH-001 | AC-011, AC-012 | SCN-001 | Claude probe |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-005 (pending approval).
- Constraints: autobyteus-337 rule; the existing one-notice-per-input slot; no runtime wake-up; seen record semantics.
- Decisions deferred to architecture: how the tracker re-reads the definition (subscribe to `AgentDefinitionChangeSignal`); how to tell whether a run holds an integration's access; whether native should also refresh its system-prompt catalog (R-002).
- Technical facts to verify: `ALL_INSTALLED` and application-bundle resolution on re-read; ordering with in-flight content notices; team members and delegated copies are tracked runs.
- Known risks: R-001 (approval prompt for reading outside the workspace).

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (User, 2026-11-13)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
