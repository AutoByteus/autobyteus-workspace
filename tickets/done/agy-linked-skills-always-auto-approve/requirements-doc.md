# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agy-linked-skills-always-auto-approve`
- Request / ticket: Critical — Chat on Antigravity fails with "Failed to prepare agent run" (2026-10-01)
- Requirements owner: Solution Designer
- Date: 2026-10-01
- Approval state and reference: Approved by user in conversation 2026-10-01 ("i approve"), after reviewing the SR-001 summary including the trade-off "Antigravity can no longer be run with auto-approve off."
- Exact approved requirements baseline / solution revision: `SR-001` (REQ-001..006, AC-001..009, SCN-001..006, DEC-001..004)
- Behavior-defining supplements and their approved versions: None (probes are evidence only).

## Problem And Desired Outcome

- Problem: Every Chat message on an Antigravity model fails before the agent starts. Antigravity copies and checks every file of every installed skill; one skill (`browser-automation`) has a local Python `.venv` with links outside its folder, and because Chat loads all installed skills, that single skill blocks the whole run. The user sees only "Failed to prepare agent run".
- Affected actors or systems: Users of Chat and any Antigravity agent/team/org run; skill authors; Antigravity runtime backend; launch-configuration UI.
- Desired outcome: Antigravity exposes skills the same way Codex and Claude Code do (one link per skill folder, no per-file copy/checks), always runs with auto-approve on, tolerates an unusable skill when the agent loads all installed skills, and reports a precise reason when a run cannot start because of a skill.
- Observable definition of success: With the user's current skill set (including `browser-automation` with its `.venv`), Chat on Antigravity starts and answers; skill files are reachable by the agent; the auto-approve control cannot be turned off for Antigravity.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | AGY copies and per-file validates every installed skill for Chat; one skill with an outside link, special file or >32 MiB file fails the run | Each skill is exposed as one link to its folder; folder contents (environments, large files, outside links) do not affect run start | Skills appear to the agent at the same location (`.agents/skills/<name>` in the run's private folder) | Source Log: app.log, skill scan |
| BEH-002 | User | SCN-002 | Explicitly named skills go through the same copy/validation; safety failure → generic error | Same linking; a named skill that cannot be exposed fails the run with a message naming the skill and reason | Semantic problems already skipped with warning stay skipped | resolver/materializer |
| BEH-003 | User | SCN-001, SCN-003 | ALL_INSTALLED: any unusable skill fails the run | ALL_INSTALLED: unusable skill skipped with a warning; run starts with the rest | Workspace-collision behavior for ALL_INSTALLED (`prefer_workspace`) | `workspace-skill-collision-policy.ts` |
| BEH-004 | User | SCN-004 | AGY auto-approve defaults on but can be turned off; off silently denies actions | AGY always runs with auto-approve on; UI shows it on and not changeable for AGY, with a short explanation | Auto-approve toggle behavior for all other runtimes | web policy + stream process |
| BEH-005 | User | SCN-005 | Resume requires each recorded skill's `SKILL.md` in the run folder | Resume of a linked run whose skill source was removed/moved continues without that skill (warning) | Old copied runs keep resuming; conversation/identity checks unchanged | `agy-run-capsule.ts:70-90` |
| BEH-006 | User | SCN-002, SCN-006 | Preparation failures show "Failed to prepare agent run '<id>'"; cause only in app log | Skill-caused failures show skill name and reason in chat and server log | Other failure messages unchanged unless incidentally improved | `agent-run-manager.ts:370-387` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Chat user | Ask the Daily Assistant anything on Antigravity | Messages are answered regardless of individual skill folder contents | — |
| AGY agent/team/org user | Run agents with named skills on Antigravity | Named skills available; clear error if one cannot be exposed | — |
| Skill author | Ship skills that create local environments (`.venv`, `node_modules`) | Skill works on Antigravity like on Codex/Claude | No requirement to restructure skills |
| Operator / developer | Diagnose failures | Cause visible in chat and server log | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Start/send in Chat (ALL_INSTALLED agent) on Antigravity | SCN-001, SCN-003 |
| UC-002 | Start an Antigravity agent/team/org member whose definition names skills | SCN-002 |
| UC-003 | Configure an Antigravity run (new chat, agent, team, member override, org, existing-run editor, mobile) | SCN-004 |
| UC-004 | Resume an existing Antigravity run | SCN-005 |
| UC-005 | See why an Antigravity run could not start because of a skill | SCN-002, SCN-006 |

### Out Of Scope

- Changing how Codex, Claude, AutoByteus or other runtimes expose skills or handle auto-approve.
- Changing the `browser-automation` skill itself or where it creates its `.venv`.
- Adding a Skills-page indicator of runtime compatibility.
- Migrating, rewriting or cleaning old Antigravity run folders that contain copied skills.
- New sandboxing or file-access restrictions for Antigravity beyond what the CLI provides.
- General rewording of non-skill preparation errors.

### Non-Goals

- Run-start immutability of skill content (a resumed or long-running AGY run may see updated skill files, as on Codex/Claude).
- Supporting Antigravity with auto-approve off.

### Preserved Behavior Boundary

- Skills are exposed inside the run's private Antigravity folder, never written into the user's selected workspace (BEH-001 preserved column).
- ALL_INSTALLED vs CONFIGURED request-strength semantics already used for workspace skill collisions (BEH-003).
- Existing semantic skip-with-warning for missing/malformed manifest or name mismatch (BEH-002).
- Restore's conversation-ID, identity and workspace checks (BEH-005).
- Auto-approve behavior of non-Antigravity runtimes (BEH-004).
- Disabled skills remain excluded.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis. Note specifically: re-introducing per-file validation or copying of skill folders for Antigravity is a scope change, not a design correction.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Starting an Antigravity run must not depend on the contents of a skill folder beyond its `SKILL.md` (e.g. `.venv`, `node_modules`, links pointing outside the folder, large or special files must not prevent the run from starting). | BEH-001 | Critical | Root cause of the incident | Investigation; user agreement 2026-10-01 |
| REQ-002 | Antigravity must expose each resolved skill as a link to the skill's real folder, located in the run's private Antigravity folder at the same path skills use today; skill files are not copied. Files inside the skill (including ones linked into a team's shared folder) remain reachable to the agent. | BEH-001, BEH-002 | Critical | Parity with Codex/Claude; probe PRB-002/003 | User: "learn from codex and claude… link by symbolic link" |
| REQ-003 | When an agent loads all installed skills (ALL_INSTALLED), a skill that cannot be exposed is skipped with a warning naming the skill and reason, and the run starts with the remaining skills. When an agent names a skill explicitly (CONFIGURED) and that skill cannot be exposed, the run does not start and reports the skill and reason. Existing skip-with-warning cases for named skills remain as they are. | BEH-002, BEH-003 | High | One skill must not disable Chat; explicit requests should not degrade silently | User agreement 2026-10-01 |
| REQ-004 | Every Antigravity run (new or resumed, standalone, team member or org member, from any entry point) runs with auto-approve on, regardless of the stored or submitted setting. Every UI surface that shows the auto-approve control for an Antigravity run or member shows it on and not changeable, with a short explanation that Antigravity always auto-approves. | BEH-004 | High | Linked skills are unreadable with auto-approve off (PRB-001); off mode already cannot approve in chat | User: "for antigravity it's always auto approve on" |
| REQ-005 | Resuming an Antigravity run must not fail solely because a skill recorded for that run is no longer available; the run resumes without it and a warning names the skill. Runs created before this change continue to resume without dedicated compatibility work. | BEH-005 | Medium | Links can break when skills are deleted/moved; user does not require special handling of old runs | User: "we just don't care about them anymore" |
| REQ-006 | When an Antigravity run cannot start because of a skill, the error shown in chat and written to the server log names the skill and the reason in plain language instead of only "Failed to prepare agent run". | BEH-006 | High | Incident was undiagnosable from the UI and server.log | Investigation |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Installed skill contains a `.venv` with links outside its folder and a file >32 MiB; Chat on Antigravity; send a message | Run starts; agent replies; skill is listed/usable | — | Automated server test with fixture skill + live AGY check on user's real skill set |
| AC-002 | REQ-002 | BEH-001 / SCN-001, SCN-002 | New Antigravity run with skills | Run folder's `.agents/skills/<name>` is a link to the skill's real folder; no skill files copied; agent can read `SKILL.md` and a sibling file | Nothing is written into the user's selected workspace for skills | Automated capsule test + live AGY probe |
| AC-003 | REQ-002 | BEH-002 / SCN-002 | Team-private skill whose files link into the team's `shared/` folder (e.g. Solution Designer) on Antigravity | Agent can read the linked shared file through the skill | — | Automated test with fixture; live check optional |
| AC-004 | REQ-003 | BEH-003 / SCN-003 | ALL_INSTALLED agent; one installed skill cannot be exposed (e.g. its folder is unreadable/vanished) | Run starts; warning names the skill and reason; other skills present | — | Automated test |
| AC-005 | REQ-003, REQ-006 | BEH-002, BEH-006 / SCN-002 | CONFIGURED agent names a skill that cannot be exposed | Run does not start; chat error and server log name the skill and reason | Named skill with missing/malformed manifest or name mismatch is still skipped with warning (unchanged) | Automated test |
| AC-006 | REQ-004 | BEH-004 / SCN-004 | Launch an Antigravity run with stored/submitted auto-approve `false` (standalone, team member, org member, resume, and a non-UI entry such as agent-initiated delegation) | `agy` is started with auto-approve (skip-permissions); init permission mode is `always-proceed` | Non-Antigravity runtimes still honor `false` | Automated server tests |
| AC-007 | REQ-004 | BEH-004 / SCN-004 | Open each launch/config surface with Antigravity selected (new chat, agent run form, team form, member override, org panel, existing-run editor, mobile card) | Auto-approve shown on, cannot be changed, short explanation visible | Switching to another runtime restores the normal editable toggle | Automated web tests + rendered check |
| AC-008 | REQ-005 | BEH-005 / SCN-005 | Existing linked Antigravity run; its skill source folder was deleted; resume | Run resumes; warning names the missing skill | — | Automated test |
| AC-009 | REQ-005 | BEH-005 / SCN-005 | Antigravity run created before this change (copied skills); resume | Run resumes as before | — | Automated test with legacy-shaped capsule fixture |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Chat user | Get an answer from the Daily Assistant on Antigravity | Chat page, Antigravity model, send (with or without attachments) | Installed skills include ones with local environments | Open Chat → choose Antigravity model → type/attach → send | Agent starts and replies; installed skills available | — | Supported Normal Scenario | User report + screenshots 2026-10-01 | REQ-001/002, AC-001/002 |
| SCN-002 | User | Agent/team/org user | Run an agent that names specific skills on Antigravity | Agent/team/org launch | Definition lists skills | Launch → first message | Named skills available | A named skill that cannot be exposed → run fails with skill+reason | Supported Normal Scenario | Existing AGY team/org usage (2026-09-24 ticket) | REQ-002/003/006, AC-002/003/005 |
| SCN-003 | User | Chat user | Use Chat even if one installed skill is unusable | Chat send | One installed skill cannot be exposed | Send | Run starts without that skill; warning recorded | — | Supported Normal Scenario | User agreement 2026-10-01 | REQ-003, AC-004 |
| SCN-004 | User | Any user | Configure an Antigravity run | All launch/config surfaces | Antigravity selected | Open configuration | Auto-approve on and locked with explanation | Other runtimes unchanged | Supported Normal Scenario | User decision 2026-10-01 | REQ-004, AC-006/007 |
| SCN-005 | User | Any user | Continue an earlier Antigravity conversation | Open existing run, send | Run created before or after this change; skill may have been removed since | Reopen → send | Run resumes | Missing skill → resumes without it, warning | Supported Normal Scenario | `restoreAgyRunCapsule`; user decision | REQ-005, AC-008/009 |
| SCN-006 | Operational | Operator | Diagnose a failed Antigravity start | Chat error card; server log | Run failed on a skill | Read error | Skill name and reason visible | — | Supported Normal Scenario | Incident diagnosis needed app.log | REQ-006, AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (limited)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product prototype ticket record and folder (externally owned): N/A — not applicable
- Prototype revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: For Antigravity, the existing auto-approve control renders in its "on" state, disabled, with a one-line explanation (wording to be finalized in design, e.g. "Antigravity always runs with auto-approve."). Existing layout otherwise unchanged.
- Explicitly illustrative fixture content or permitted implementation variation: Exact explanation wording and whether it replaces the existing AGY help text.
- Required screens, states, transitions: Surfaces listed in AC-007; switching runtime away from Antigravity restores the editable control.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001/002, AC-001 | Performance | Skill exposure work per run does not scale with skill folder size (no per-file reading/copying) | New AGY runs | Code review + test with large fixture |
| QR-002 | REQ-004, AC-006 | Security | The relaxation (no per-file checks, always skip-permissions) applies only to Antigravity | All runtimes | Tests for non-AGY runtimes unchanged |
| QR-003 | REQ-006 | Operability | Error text includes skill name and reason; no secrets or file contents | AGY preparation | Test asserts message |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (AGY run folders; stored run configs).
- Data or state that must be preserved: Existing runs remain resumable (REQ-005).
- Loss, reset, rebuild, or regeneration that is acceptable: No dedicated handling for old copied-skill runs (user decision). Stored `autoExecuteTools: false` for Antigravity is ignored at run time.
- Retention, privacy, compliance, volume, downtime, or operational constraints: None.
- Unknowns requiring downstream investigation: None material.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Antigravity CLI (`agy`) | Discovers symlinked skill folders under `.agents/skills`; readable with skip-permissions | PRB-002/003 | Future CLI changes; covered by live validation |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` | Evidence | All | Current | Evidence only |
| `probes/agy-symlink-skill-probe.py` | AGY linked-skill probe | REQ-002/004 | Current | Evidence only |
| `probes/agy-skill-scan.mjs` | Skill-folder scan | REQ-001 | Current | Evidence only |
| `probes/app-log-excerpt-2026-10-01.txt` | Incident trace | REQ-006 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The installed `agy` CLI's symlink behavior (PRB-002) holds for the version shipped/used by users | REQ-002 relies on it | Live AGY validation (API/E2E) | Open |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Copy vs link | Root cause | Link (user) | User | Resolved 2026-10-01 |
| DEC-002 | AGY auto-approve optional vs always on | Linking requires on | Always on (user) | User | Resolved 2026-10-01 |
| DEC-003 | Unusable skill: skip vs fail | Chat resilience vs explicit intent | ALL_INSTALLED skip, CONFIGURED fail (user) | User | Resolved 2026-10-01 |
| DEC-004 | Old copied-skill runs | Compatibility effort | No dedicated work (user) | User | Resolved 2026-10-01 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001 | skill scan, app log |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002, AC-003 | SCN-001, SCN-002 | PRB-002/003 |
| REQ-003 | UC-001, UC-002 | BEH-002, BEH-003 | AC-004, AC-005 | SCN-002, SCN-003 | — |
| REQ-004 | UC-003 | BEH-004 | AC-006, AC-007 | SCN-004 | PRB-001 |
| REQ-005 | UC-004 | BEH-005 | AC-008, AC-009 | SCN-005 | — |
| REQ-006 | UC-005 | BEH-006 | AC-005 | SCN-002, SCN-006 | app log |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-006.
- Product and system constraints architecture must preserve: links only inside the run's private AGY folder; ALL_INSTALLED/CONFIGURED strength split; non-AGY runtimes unchanged; semantic skip-with-warning cases unchanged.
- Decisions intentionally deferred to architecture design: whether to reuse shared link helpers; removal set of AGY-only resolver/fingerprint/copier code; how the server enforces auto-approve (factory vs config normalization); how skill errors reach the chat (error type/message path); exact list of web surfaces.
- Technical facts architecture should verify: no non-AGY consumers of detailed resolution/fingerprint; all entry points that create/restore AGY runs (incl. agent-initiated delegation, messaging gateway); relative links inside team-private skills resolve through a linked folder.
- Known feasibility or integration risks: RSK-001 (security posture reversal, deliberate), ASM-001.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-01, "i approve")
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
