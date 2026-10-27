# Handoff — Architecture Design Complete, SR-018 (autobyteus-32), after API/E2E round 1 (API-REV-001 Fail, CRR-003)

- Package: `delegated-runtime-model-routing`, Project Task **autobyteus-32** in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- From: Solution Designer (run `solution_designer_ab383b2a28394f6ba52dde1f7083f5bd`); To: Architecture Reviewer (run `architecture_reviewer_0fda00a36595499d940b4fb4017ee06f`)
- Date: 2026-10-26; Solution revision **SR-018** (SR-016 passed ARCH-REV-003; SR-017 was a record-shape tightening from code review)
- Classification: `Architecture Design Complete`, task_size **Large**, architectural_risk **High** (unchanged; this revision removes scope)
- **Done-when** (carry forward): "…covered by tests, and the user has verified it in the desktop app."

## Trigger

Code review CRR-003 (failure origin of API/E2E round 1, `code-review-report.md` § API/E2E Failure-Origin Review): CR-003 (High, Design Impact: a Codex config file's `writable_roots` widened the router's `workspace-write` sandbox, live L-02), CR-004 (Medium, Design Impact: the confined Claude router had the user's claude.ai connectors and `Skill`, live L-01), CR-005 (Medium, implementation Local Fix: a failed router turn leaves an inactive run and every later routing waits 40 s as "busy", MR-09). Evidence A-34.

## Decision (the user, 2026-10-26)

The user removed the confinement: "our framework … by default … doesn't use a sandbox … if they want to write to other folder, it's their choice. But as long as the router agent eventually works, then that's fine … we don't have to do specific things about this", and "Just test normally … just like any other agent" (no adversarial probes). I stated the remaining risk (a web page with hidden instructions, the same exposure as any auto-approved agent); accepted.

- Requirements SR-018: REQ-003 (not confined; normal auto-approved setup; instructions keep its files in its workspace), AC-011 (no collaboration tools; normal tests), QR-004, DEC-023; supplement § 5.
- Design SR-018: `AgentRunConfig.toolConfinement` and every Codex/Claude confinement change are **removed** (clean cut: those files go back to base). Kept: own internal workspace and its listing rule, `systemRunOwner` (AR-001: no collaboration tools — correctness, a router delegation could wait on the router itself), one request at a time, everything else from SR-016/017.
- CR-003 and CR-004 no longer apply. CR-005 is carried as an implementation Local Fix (restore an inactive registered router run through `resolveCommandReadyAgentRun` before posting; failed-turn test; status not "active" while the run cannot take input).
- Follow-up FU-005 withdrawn. Design case 9 extended (`docs/design-cases.md`).

## Artifacts (absolute paths)

- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md (SR-018)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/launch-selection-order.md (SR-018)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md (A-34)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-spec.md (SR-018; previous `history/design-spec-sr017.md`)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/solution-revision-record.md (SR-018)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/follow-ups.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/code-review-report.md (CRR-003)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/docs/design-cases.md (Case 9)

## Next expected action

Architecture re-check of SR-018; on Pass: implementation (remove confinement, CR-005 fix), source review, then API/E2E reruns MR-09 and normal live routing per runtime (L-01/L-02 adversarial probes dropped by the user).

## Route taken

- 2026-10-26: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
