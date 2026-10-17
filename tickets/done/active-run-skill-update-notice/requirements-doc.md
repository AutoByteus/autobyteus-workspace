# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `active-run-skill-update-notice`
- Request / ticket: Project Task `project_task_0e330de1-0508-4424-8a6a-01e92f529312` (2026-10-13), with the user's clarification relayed by `/project_task_manager` the same day
- Requested by: `/project_task_manager` on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-13
- Approved by and reference: `Solution Designer within the direction (user informed)`. SR-001 baseline: user informed 2026-10-13. SR-003 revision (REQ-004/005/008/009/010, AC-001/002/005, QR-003, DEC-009–011, after ARCH-REV-001): still within the user's direction (DEC-009 follows the user's "same as agent messages" wording literally). User informed 2026-10-13 (SR-003 message).
- Exact approved requirements baseline / solution revision: this document at SR-003
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- **Problem:** Skills are improved continuously: the Agent Package Creator opens a PR, the user approves, the PR merges and the local checkout updates.
  - New runs get the new skill.
  - Runs that are already active read the skill earlier in their conversation and keep following the old text.
  - The user has to tell each agent to re-read its skill.
- **Affected actors:** the user; running agents of every runtime (the Project Task Manager, delegated copies, team and org members, standalone runs).
- **Desired outcome:** When a skill folder changes, every run that uses that skill gets **one short platform notice**. The notice names the skill, the changed files and where to re-read it, and the agent re-reads it. The notice is delivered:
  - **busy runs:** through the existing agent-message path, mid-turn included;
  - **idle or shut-down-but-resumable runs:** together with their next work.
- **Observable definition of success:**
  - A skill used by the Project Task Manager is edited (or its PR merged).
  - Within a few seconds, the Project Task Manager's conversation shows one system notice "Skill `X` was updated: SKILL.md, references/y.md — re-read …".
  - The agent re-reads the skill before continuing.
  - A delegated copy that was idle gets the same notice with its next task or message.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001–SCN-005 | Skill folder changes are not observed for runs; an active run keeps the skill text it already read | Changes to a skill folder used by any run are detected and batched; each affected run receives one notice | Skill files keep being read fresh at run start and on every agent read | Notes BEH-001/002 |
| BEH-002 | Contract | SCN-001 | Agent-to-agent messages reach any runtime, appending mid-turn or starting a turn | The notice to a **busy** run uses this same path, appended to the active turn | Existing message delivery semantics | Notes BEH-003 |
| BEH-003 | Contract | SCN-002, SCN-003 | A message to an idle run starts a turn; a message to a shut-down delegated copy restores it | Notices for **idle** and **shut-down** runs do not start a turn or restore anything; they are delivered together with the run's next work | Existing wake/restore triggers | Task considerations |
| BEH-004 | Contract | SCN-001–SCN-003 | Platform inputs such as delegated task work are marked as system notifications | The skill notice is marked and shown as a platform system notice, never as a user or agent message | System task notification presentation | Notes BEH-004 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Approve skill improvements and have them take effect | No manual "re-read your skill" messages | Notices must not flood conversations |
| Running agents (all runtimes) | Follow current skills | One clear notice naming the skill, files and path | Work in progress continues |
| Agent Package Creator | Improve skills | Its merged improvements reach running agents | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A skill used by a busy run changes, and the run receives one notice mid-turn through the existing message path | SCN-001 |
| UC-002 | A skill used by an idle run changes, and the run receives the notice with its next work, without an extra turn | SCN-002 |
| UC-003 | A skill used by a shut-down-but-resumable run (an auto-shut-down delegated copy, or a stopped run reopened later, including after an app restart) changes, and the run receives the notice with its next work after it wakes | SCN-003 |
| UC-004 | Several files of one or more skills change together (a merge), and each affected run receives one notice covering all of them | SCN-004 |
| UC-005 | A skill used by a run is removed, and the run is told it is no longer available | SCN-005 |

### Out Of Scope

- Notifying runs about changes to agent, team or org definition files (`agent.md`, `team.md`, configs). Running runs keep their definition, as decided in `agent-package-auto-refresh`.
- Changing how skills are exposed or loaded per runtime (prompt paths, workspace symlinks).
- Updating the Skills page live.
- Mid-turn input on runtimes without active-turn append (AutoByteus, Antigravity, Grok/ACP). Follow-ups FT-1…FT-3 (`follow-up-tasks.md`), requested by the user 2026-10-13. When those land, these runtimes receive notices mid-turn automatically through REQ-004.
- Notices for skills a run does not use.

### Non-Goals

- Guaranteeing the agent actually re-reads the skill. The notice instructs it; agent compliance is model behavior.
- Showing diffs of what changed inside files.

### Preserved Behavior Boundary

- BEH-002 delivery semantics.
- Existing wake/restore triggers: notices never wake or restore a run by themselves.
- Skill resolution and exposure per runtime.
- The definition auto-refresh behavior of `agent-package-auto-refresh`.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- A finding that would add product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap` and needs explicit user approval.
- Adjacent concerns may be recorded as non-blocking risks or follow-ups.
- Downstream comments do not amend this basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The platform MUST detect changes (add, change, remove) to files inside the folder of every skill that is used by at least one active, idle or resumable run, in every skill source: skill source folders, bundled package skills and app-data skills. | BEH-001 | Critical | Core | Task |
| REQ-002 | A run "uses" a skill when the skill is among the run's configured skills, resolved as the run resolved them (including scope `ALL_INSTALLED`). | BEH-001 | High | Defines targeting | DEC-003 |
| REQ-003 | Changes MUST be batched: all changes that settle together (about 1 s of quiet, capped) produce **at most one notice per run**, covering every changed skill that run uses. | BEH-001 | Critical | "One notice per run, not a flood" | Task; DEC-005 |
| REQ-004 | For a **busy** run (a turn in progress), the notice MUST be sent immediately through the existing agent-message input path (`AgentRun.postUserMessage`), with the same delivery semantics an agent message gets today. On runtimes that support active-turn append (Codex, Claude Agent SDK) it arrives **inside the current turn**. On runtimes that do not (AutoByteus, Antigravity, ACP, Grok) it arrives as the **next turn, right after the current turn ends**, exactly like an agent message. No new delivery mechanism. | BEH-002 | Critical | User clarification: "just send the agent message … the same way" | User 2026-10-13; DEC-009 (SR-003) |
| REQ-005 | For an **idle** run, the notice MUST NOT start a turn. It MUST be delivered **combined with the run's next external input** (user message, agent message, task or application input) in one provider input, so one turn carries both: a clearly delimited platform-notice section first, then the input unchanged. The input keeps its own sender and presentation; the notice is presented separately as a system notice (REQ-007). | BEH-003 | High | Task: "when they next wake"; no wasted turns | DEC-001; DEC-010 (SR-003) |
| REQ-006 | For a **shut-down or stopped but resumable** run, the notice MUST NOT restore or wake it. When the run is next restored and receives input, it MUST receive one notice for the skills that changed since it last saw them. This includes changes made while the app was closed. | BEH-003 | High | Task | DEC-002 |
| REQ-007 | The notice MUST be marked as a platform system notice in the run's input and shown in the web conversation as a system notice, distinct from user and agent messages. | BEH-004 | Critical | Task | Task |
| REQ-008 | The notice MUST name each changed skill, list its changed files (up to 10 per skill, then "and N more"), give the path of the skill's **current** `SKILL.md` (the folder the skill resolves to now), and tell the agent to re-read it before continuing work that relies on it. | BEH-001 | High | Actionable notice | DEC-004; DEC-011 (SR-003) |
| REQ-009 | A skill is reported as **no longer available** only when its name no longer resolves to an installed skill. A skill whose folder moved (for example, a GitHub skill-source update that publishes a new folder) is reported as **updated**, with its new path. | BEH-001 | Medium | Stale text for a vanished skill; correct generations | DEC-006; DEC-011 (SR-003) |
| REQ-010 | Noise MUST NOT trigger notices: `.git`, `node_modules`, `.venv`/`venv`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `dist`, `build`, paths matched by the skill folder's own `.gitignore`, OS/editor temp files (`.DS_Store`, `*.swp`, `*~`, `.#*`), and writes that leave content unchanged. Other folders inside a skill (for example `lib/`, `scripts/`, `references/`) count. | BEH-001 | High | Task; ARCH-REV-001 R-3 | DEC-007 (narrowed, SR-003) |
| REQ-011 | All six runtimes (AutoByteus, Codex, Claude Agent SDK, Antigravity, ACP, Grok) MUST receive notices, including team members, org members, delegated copies and standalone runs. | BEH-002 | Critical | Task | Task |
| REQ-012 | Watching MUST cover only skill folders used by current runs, and start and stop as runs start, restore and end, with no polling. | BEH-001 | High | Cost | DEC-008 |
| REQ-013 | Detection and delivery failures MUST NOT affect the run or other runs. A failed notice is logged and retried once with the run's next input. | BEH-002 | Medium | Robustness | — |

## Acceptance Criteria

| AC ID | Requirement IDs | Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003, REQ-004, REQ-007, REQ-008 | SCN-001 | A run uses skill `X` and is mid-turn. `X/SKILL.md` is edited. | **Codex / Claude:** within 5 s the run receives exactly one system notice **inside the current turn**. **AutoByteus / Antigravity / ACP / Grok:** the run receives exactly one notice as the **first input after the current turn ends**, as an agent message would. In both cases the notice names `X`, `SKILL.md` and the path, the web shows it as a system notice, and the agent re-reads the file. | — | Server integration test with fake backends for both capability classes; real-run E2E on Codex, Claude (mid-turn) and AutoByteus (next turn) |
| AC-002 | REQ-005 | SCN-002 | The run is idle; `X` changes; nothing else happens for a minute. | No turn starts. When the next message arrives, **one** turn starts whose provider input is the delimited notice followed by the message. The message's own presentation is unchanged, and the notice appears as a system notice. | If that dispatch is not delivered (rejected, requeued, interrupted before forwarding), the notice stays pending for the next input | Integration test across both capability classes; real-run check |
| AC-003 | REQ-006 | SCN-003 | A delegated copy is shut down after idle; `X` changes; later it is messaged and restored. Separately: the app is closed, `X` changes, the app reopens and a stopped run is continued. | The copy is not restored by the change. On restore with input, it receives one notice for `X` before the input. The app-restart case behaves the same. | — | Integration test; desktop check |
| AC-004 | REQ-003 | SCN-004 | A merge changes 6 files across skills `X` and `Y`, both used by the run. | One notice listing `X` (its files) and `Y` (its files). | A long burst may split into at most a few notices, never one per file | Integration test counting notices |
| AC-005 | REQ-009 | SCN-005 | (a) Skill `X` folder is deleted and the name no longer resolves. (b) A GitHub skill-source update publishes a new folder for `X` and deletes the old one. | (a) The notice says `X` is no longer available. (b) The notice says `X` was updated, with the new `SKILL.md` path and the changed files; the new folder is watched from then on. | — | Integration tests |
| AC-006 | REQ-010 | SCN-001 | Writes inside `X/node_modules/`, `X/.git/`, a `.DS_Store`, and a save with identical content. | No notice. | — | Integration test |
| AC-007 | REQ-002, REQ-011 | SCN-001 | Team member A uses `X`; member B does not; an org member and a delegated copy use `X`. | A, the org member and the copy are notified; B is not. | — | Integration test |
| AC-008 | REQ-012 | SCN-001 | No run uses skill `Z`; the run using `X` ends. | `Z` is never watched; `X` watching stops after its last run ends. | — | Watch-registry test |
| AC-009 | REQ-013 | SCN-001 | Delivery to one run fails. | Other runs still receive their notices; the failed run gets the notice with its next input. | — | Fault-injection test |
| AC-010 | All | SCN-006 | The real journey: the Agent Package Creator's skill PR is merged into the local checkout while the Project Task Manager (running) and a delegated copy (idle) use that skill. | The Project Task Manager shows one system notice and re-reads the skill. The copy gets it with its next task. The user verifies in the desktop app. | — | Desktop verification with real runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | User / Agent Package Creator | Busy run learns a skill changed | Skill file edited or merged | Run busy, uses the skill | Change settles → notice appended to the active turn → agent re-reads | One notice, re-read | Delivery failure → REQ-013 | Supported Normal Scenario | Task; user clarification | REQ-001–004, REQ-007, REQ-008, REQ-011; AC-001, AC-006, AC-007 |
| SCN-002 | System | Same | Idle run learns at next work | Same | Run idle | Change settles → notice held → next input arrives → notice then input | No extra turn | — | Supported Normal Scenario | Task | REQ-005; AC-002 |
| SCN-003 | System | Same | Shut-down or stopped run learns on wake | Same; also while the app is closed | Run shut down/stopped | Run restored with input → notice then input | Not woken by the change | — | Supported Normal Scenario | Task ("when they next wake") | REQ-006; AC-003 |
| SCN-004 | Operational | User | Merge with many files | `git merge` / checkout | Runs use the skills | Burst → one batch → one notice per run | No flood | Long burst → few notices | Supported Normal Scenario | Task | REQ-003; AC-004 |
| SCN-005 | System | User | Skill removed | Folder deleted | Run uses the skill | Notice: no longer available | — | — | Supported Explicit Edge Scenario (merges can delete skills) | DEC-006 | REQ-009; AC-005 |
| SCN-006 | User | User | Self-improvement loop | Approve PR → merge → checkout | PTM running, copy idle | As above | As above | — | Supported Normal Scenario (primary) | Task | AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (minimal; no Product Design requested)
- Product design fields: N/A — not applicable
- Normative details:
  - The notice appears in the run's conversation where it was delivered, styled as a platform system notice (the same family as the existing system task notification), with a label such as "Skill updated".
  - It shows each skill, its changed files and the `SKILL.md` path.
  - English and Chinese localization follow the existing catalogs.
- Permitted variation: exact styling and wording.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-004; AC-001 | Performance | Busy-run notice ≤ 5 s after the last write of a burst | Timed tests |
| QR-002 | REQ-012 | Operability | Watched folders limited to used skill folders, minus ignored subfolders; no polling; handles released when no run uses a skill | Registry inspection |
| QR-003 | REQ-004, REQ-005, REQ-006 | Cost | Notices never trigger an LLM turn by themselves for idle or shut-down runs. A busy run on a non-append runtime may get one notice turn after its current turn (agent-message semantics, REQ-004). | Tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Possibly` (an additive per-run record of the skill versions a run has seen, so REQ-006 holds across app restarts).
- Must preserve: existing run history, metadata and conversations unchanged.
- Acceptable loss: if that record is missing for an older run, the run gets no retroactive notice. Notices for changes made before this feature existed are not required.
- Unknowns: storage location and shape (design).

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Existing exact-run message delivery | Reused for busy runs; mid-turn semantics per runtime unchanged | Notes | Runtime-specific mid-turn behavior (U-001) |
| `agent-package-auto-refresh` watching stack | Reused approach (in-process watcher, settle window) | Merged `b57d85ad9` | — |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | Every runtime reads skill files from disk (directly or through links), so content is current once the agent re-reads | Investigation (materializer symlinks; native on-demand read) | Confirmed by code |
| ASM-002 | Agents comply with a clear re-read instruction | Real-run verification | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Idle runs: deliver now (starts a turn) or with their next input? | Cost and noise | Task: "idle … when they next wake". The message path starts a turn for idle runs. | An idle agent has nothing to apply the skill to until new work arrives. A turn per idle run per change wastes tokens and adds noise. **Hold the notice and put it ahead of the next input.** | Solution Designer | Decided |
| DEC-002 | Must notices survive an app restart for stopped runs? | Users reopen yesterday's runs | Task: "shut down but resumable, when they next wake" | Restarting the app is the most common way a run "wakes" later. Without this, a reopened run follows old text, which is the original problem. **Yes**, using an additive per-run record of skill versions seen (design decides the mechanism). | Solution Designer | Decided |
| DEC-003 | What counts as "uses a skill"? | Targeting | Configured skills vs. skills actually read | Which skills a run actually read cannot be observed reliably across six runtimes. Configured skills are the advertised set. **Configured skills, including `ALL_INSTALLED`.** The wording "re-read it if you rely on it" keeps it harmless when the agent never used it. | Solution Designer | Decided |
| DEC-004 | Notice content | Usefulness vs. length | Task allows the skill, files or a summary | Name, changed files (capped at 10) and the exact `SKILL.md` path the run reads are enough to act on. No diffs: they cost tokens and the agent re-reads anyway. | Solution Designer | Decided |
| DEC-005 | Batching window | One notice per run | The prior ticket's settle window | Reuse ~1 s quiet, capped at ~3 s, for consistency with the definition refresh. | Solution Designer | Decided |
| DEC-006 | Removed skills | Merges can delete skills | Not in the Task text | A run following a deleted skill is the same staleness problem. Telling it the skill is gone is consistent and cheap. **Include.** | Solution Designer | Decided |
| DEC-007 | Noise rules | False notices | Task: ignore noise | Skill folders are code-like (scripts, venvs). Ignore VCS, dependency and build folders, temp files, and content-identical writes. | Solution Designer | Decided |
| DEC-008 | Watch scope | Cost (the `autobyteus_mcps` source has 36k dirs) | Watch all skill sources vs. used skills only | Only used skills matter for this feature. **Watch only skill folders used by current runs.** | Solution Designer | Decided |
| DEC-009 | Busy runs on runtimes without active-turn append (AutoByteus, Antigravity, ACP, Grok): how is the notice delivered? (ARCH-REV-001 AR-001) | REQ-004 claimed mid-turn delivery for every runtime; only Codex and Claude support append | (a) Agent-message semantics: delivered as the next turn right after the current one (may be a notice-only turn). (b) Hold as a preface for the next external input. | The user's direction settles this: "just send the agent message … the same way … we already send the agent message from other agents directly now". Agent messages to a busy agent on these runtimes arrive as its next turn. (a) follows the direction literally, and the agent re-reads right after its current work instead of waiting for new work. **(a).** The cost is at most one notice turn per busy run per change, the same as an agent message. | Solution Designer (within the direction; user informed) | Decided (SR-003) |
| DEC-010 | How does an idle run get "notice plus next input in one turn"? (ARCH-REV-001 AR-002) | The input queue dispatches one entry per turn start, so queuing the notice separately gives it its own turn | Separate queued entry vs. combining at dispatch | The notice is attached to the next external input **when that input is dispatched to the provider**: one provider message with a delimited platform-notice section, then the input. Admission order, sender, presentation and memory of the input are unchanged; the notice is published and recorded separately. **Combine at dispatch.** | Solution Designer | Decided (SR-003) |
| DEC-011 | What identifies a skill across changes? (ARCH-REV-001 AR-003) | GitHub skill-source updates publish a new folder and delete the old one | Folder path vs. skill name | Agents know skills by name, and folders are an implementation detail of sources. **Key by name.** On a change, re-resolve the name through the skill catalog: found means updated (diff by relative file digests, with the new path); not found means no longer available. | Solution Designer | Decided (SR-003) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001–005 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001–003 | BEH-001 | AC-007 | SCN-001 |
| REQ-003 | UC-004 | BEH-001 | AC-004 | SCN-004 |
| REQ-004 | UC-001 | BEH-002 | AC-001 | SCN-001 |
| REQ-005 | UC-002 | BEH-003 | AC-002 | SCN-002 |
| REQ-006 | UC-003 | BEH-003 | AC-003 | SCN-003 |
| REQ-007 | UC-001–003 | BEH-004 | AC-001 | SCN-001 |
| REQ-008 | UC-001–004 | BEH-001 | AC-001 | SCN-001 |
| REQ-009 | UC-005 | BEH-001 | AC-005 | SCN-005 |
| REQ-010 | UC-001 | BEH-001 | AC-006 | SCN-001 |
| REQ-011 | UC-001–003 | BEH-002 | AC-007, AC-010 | SCN-001, SCN-006 |
| REQ-012 | UC-001 | BEH-001 | AC-008 | SCN-001 |
| REQ-013 | UC-001 | BEH-002 | AC-009 | SCN-001 |

## Architecture Phase Input

- Scenarios to map: SCN-001…SCN-006.
- Constraints:
  - reuse the existing exact-run delivery path for busy runs;
  - no wake or restore by notices;
  - the system-notice presentation family;
  - all six runtimes.
- Deferred to design:
  - the run → used-skills record;
  - the watch mechanism and ignore rules;
  - the hold-until-next-input mechanism;
  - the persisted "skill versions seen" record;
  - the per-runtime `SKILL.md` path in the notice.
- Facts to verify: per-runtime mid-turn append; team/org/delegated runs in `AgentRunManager`; the restore and next-input hooks.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: `Yes`
- Desired and preserved behavior explicit: `Yes`
- Scope and non-goals clear: `Yes`
- Requirements and ACs testable and traceable: `Yes`
- Scenarios covered: `Yes`
- Product design: `N/A`
- Assumptions and decisions visible: `Yes`
- Content ready for approval: `Yes`

### Approved Basis Ready For Design

- Approved: `Yes` (Solution Designer within the direction; user informed 2026-10-13)
- Basis recorded: `Yes`
- Ready for design: `Yes`
