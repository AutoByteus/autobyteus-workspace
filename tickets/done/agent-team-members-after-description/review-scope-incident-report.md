# Incident Report — Unrelated baseline fixes expanded a UI ticket

## Outcome And Accountability
Date: 2026-10-13. Author: `/software_engineering_team/code_reviewer`.

**The mistake was not discovering a real bug. It was converting an unrelated discovery into mandatory implementation work inside this ticket without establishing scope authority.** I own that routing decision. Accurate defect attribution does not authorize expanding the approved work.

The user requests a separate **skill/workflow-improvement task** so this pattern does not recur. This report is a process postmortem, not a new implementation review or a claim that skills have already been fixed. The separate Agent/Org bug follow-up previously requested remains distinct from this improvement task.

## What Happened — Evidence, Not Hypothesis
1. Approved R1 asked for one presentation change: Description → Members → Instructions → Handoffs on Team detail views, preserving existing content/actions/navigation/responsiveness. `requirements-doc.md`, Scope Guardrail / Review Authority, explicitly keeps adjacent proposals non-blocking and separate-ticket candidates.
2. API-REV-002 performed the user's requested actual Electron testing. Team layout and navigation checks passed. Creating disposable Agents/Org exposed real missing-field cache errors in other production paths. Source blob comparison showed those paths were unchanged from before the UI change. No data loss or Team layout failure was observed.
3. In CRR-001 I confirmed the bugs were pre-existing and unrelated to the template change, but classified them Local Fix and directed Implementation Engineer to fix them **in this branch**, citing worktree TESTING Rule 9. I also required source review, another build and API/E2E afterward. Commit `ba869880e7ecc49fdd1c31b27a5f144ba5a7da98` records that decision.
4. Before the user redirected scope, implementation prepared local commit `d8bac598606001b702e300eeaeefe06c3caf0d3d` touching two mutation documents and the cache regression. It has not received a reviewer Pass here. That is actual additional source/test work outside the UI change, not merely a hypothetical risk.
5. The user explicitly asked for a separate follow-up instead. CRR-002 superseded the in-ticket correction instruction (`a03ef4ac6d`). A stop/separation instruction was delivered to Implementation Engineer, and a follow-up-creation request was delivered to `/project_task_manager`. Task Manager subsequently confirmed creation/linkage of **project_task_6b9ce371-7593-42d7-9d20-3c637512830a — Fix Agent/Org creation cache field completeness**, TODO/not dispatched, with nine evidence attachments and prepared-but-unreviewed commit provenance. The original Task remains UI-only/IN_PROGRESS. Task Manager notified Solution Designer to coordinate isolation and fresh scoped validation; safe code/test separation is still awaiting a durable handover/branch reference. This bug follow-up is not the new skills-improvement task requested below.

## Why I Made The Decision
### My reasoning error
I checked whether the scenario was supported, whether the bug was genuine, and who technically owned it. I **did not apply a separate gate for whether fixing it belonged to the approved ticket**.

I treated these implications as if they were valid:

`supported normal workflow + reproducible source defect + small fix → must fix in current ticket`

They are not valid. Supported behavior establishes that a bug deserves accountable tracking; smallness establishes fix size. Neither establishes scope relevance, user authorization, or necessity for this ticket's acceptance.

I also let the expanded full-product validation result drive the UI ticket's corrective route. “Test like a user” authorizes observing real product behavior; it does not automatically authorize repairing every problem encountered while preparing or executing that test.

### Documented workflow drivers
- **TESTING Rule 9 (`190–195` in the assigned worktree)** directs small baseline fixes into the same branch and reserves separate items for larger fixes/product changes. I applied this too mechanically, rather than reconciling it with the approved requirements' explicit scope guardrail or escalating the policy tension before expanding work.
- **code-reviewer skill:** its failure-origin rules establish supported behavior and classify cause/owner; its classification rules map bounded implementation defects to Implementation Engineer and require source review/API rerun after a fix. The supported-scenario gate is strong, but there is no equally explicit failure-disposition gate distinguishing **in-ticket required correction** from **unrelated accountable follow-up** before that route is invoked.
- **Returned handoff rules:** the specific condition was “failure-origin review confirms ... an implementation defect.” It selected a technical owner without separately requiring confirmation that the corrective work is in scope. I treated ownership as authorization for implementation in this ticket.
- The skill already says to understand out-of-scope behavior. Thus this is **not only missing documentation**: I failed to enforce an existing scope constraint. The improvement should make that constraint operational and testable, not simply add another vague reminder.

These are evidenced contributing rules and my recorded decision. A broader claim about every team's skills would require investigation; the improvement task should inspect the canonical skill sources, templates and routing configuration before deciding the smallest consistent change.

## Why The User's “Never-ending” Concern Is Valid
Only one expansion is established here. However, the policy combination has no clear scope stop condition: broader test → unrelated failure → same-ticket fix → further review/test → another unrelated failure → another fix. A succession of individually small fixes can still turn a bounded ticket into indefinite product maintenance.

The fix is not to hide unrelated bugs or avoid realistic testing. It is to separate **discovery, defect ownership, delivery materiality, and authorization to change this ticket**.

## Requested Improvement Task
Suggested title: **Add an explicit ticket-scope gate to failure review and rework routing**.

Investigate first: canonical `code-reviewer` skill and its report templates, `api-e2e-engineer` failure/report workflow, applicable implementation re-entry and Team handoff configuration, and baseline-failure guidance in TESTING.md. Do not blindly edit mounted skill copies or broadly rewrite all roles. Reconcile scope and baseline-accountability rules so agents receive one consistent contract.

### Proposed Acceptance Criteria
1. Before directing corrective work, record both **technical origin** and **scope disposition**. Cite the approved REQ/AC/preserved contract that makes the correction necessary, or identify it as unrelated baseline/adjacent work. A generic engineering contract alone must not erase the ticket boundary.
2. Supported-scenario proof remains mandatory but is explicitly **necessary, not sufficient**, for an in-ticket finding or required fix. “Small Local Fix” is not scope authorization.
3. Unrelated, non-blocking baseline defects default to an **accountable separate follow-up**, carrying cause, evidence, owner and reproducer. No automatic in-ticket implementation, new machinery, or repeated repair loop. Avoid duplicate follow-ups when an accountable item already exists.
4. A genuine material delivery blocker outside the original scope must be explained and routed to the proper coordinator/user for an explicit scope or release decision—not silently ignored, fixed, or waived. Preserve correctness/security/data-integrity obligations and honest uncertainty.
5. Distinguish scoped ticket acceptance from broader app-health observations. Never rewrite raw errors or call the whole app clean. Conversely, do not convert an unrelated app-health failure into a failed UI requirement without evidence tying it to that requirement.
6. Test-data preparation, broader validation, or a request to “test like a user” cannot approve unrelated repairs. New bugs found during revalidation go through the same scope gate; they do not automatically extend the current ticket.
7. Align failure handoff rules/templates and TESTING baseline guidance with this disposition, including how durable unrelated reproducers and already-prepared changes are preserved in follow-up work rather than contaminating the scoped delivery package.
8. Evaluate the revised skills with concrete cases: this UI change + pre-existing cache bug → follow-up/no UI expansion; change-caused bug violating approved behavior → in-ticket fix; pre-existing bug directly preventing a required journey → scoped necessity/authority assessment; severe adjacent delivery risk → explicit escalation; repeated unrelated discoveries → no open-ended expansion; uncertain causation → bounded investigation without presumed fix; user scope override while a fix is already prepared → preserve/isolate work and notify owners.
9. Evidence should show the right **decision and routing**, not just rewritten prose. Maintain negative cases ensuring genuine in-scope defects cannot be disguised as unrelated follow-ups.

## Immediate Boundary Already Established
- No further Agent/Org baseline repair is authorized in the UI ticket by my earlier handoff. Preserve/isolate prepared work through the owners; I do not revert another engineer's source.
- Follow-up tracking does not claim these defects technically resolved. R1 remains unchanged, Small/Low retained, and historical API failure evidence stays intact.
- Human verification, release agreement, source-package separation and final delivery gates remain owned by the responsible team. This report does not finalize the task or authorize a release.
- No skill, testing guideline, production source or test code changed by this postmortem. The requested prevention work belongs to the separate improvement task.

## Evidence Paths
Task artifact directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/`.
- `requirements-doc.md`; `code-review-report.md`; `code-review-revision-record.md` (CRR-001/002).
- `api-e2e-execution-coverage-report.md`; `api-e2e-revision-record.md`; `api-desktop-01/failure-summary.json`; `code-review-01/failure-recheck.log`.
- Applicable testing authority: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/TESTING.md`.
- Skill instructions read from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/code-reviewer/SKILL.md` and relevant API/E2E skill sections in that skill root. Symlink inspection resolves these to `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/code-reviewer/skills/code-reviewer/` and the sibling `agents/api-e2e-engineer/skills/api-e2e-engineer/`. Start the improvement investigation in that agent-team repository; confirm its applicable instructions and routing configuration before editing, not this UI worktree or only the mounted copy.

Project/task context: Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; original UI Task `project_task_7fd4b73e-075b-464c-b313-bbbd59f45797`.
