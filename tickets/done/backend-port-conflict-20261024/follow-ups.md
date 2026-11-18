# Follow-ups

## FU-001 — Core test-tree TypeScript policy/debt (not a release-build failure)
- Found during exploratory `autobyteus-ts/node_modules/.bin/tsc --noEmit -p autobyteus-ts/tsconfig.json`; evidence `evidence/IMP-TRIAL-01-ab-core-types.log`.
- Cause established by configuration/source: `tsconfig.json` includes every `tests/**/*` under strict typing, unlike the documented production `tsconfig.build.json` which excludes tests. Unchanged fixtures such as `tests/integration/agent/edit-file-benchmark-flow.test.ts` have untyped `paths` callback parameters; many similar test-only diagnostics are listed in the log. The own anchor-frame discriminant error from that exploratory run was fixed before initial source commit and production build passes. No claim that the exploratory full-tree typecheck passes.
- Disposition: follow-up, not a prerequisite for this ticket's prescribed production build/typecheck + executable Vitest checks. Broad test-fixture typing cleanup is outside shutdown/conflict scope. Solution Designer should send the finding when the ticket leaves the team; no automatic task/release created here.

## FU-002 — Codex background-work visibility — incorporated into current ticket
- User asks to show background processes in frontend for transparency, relayed by Code Reviewer on2026-10-26. Existing Claude task events feed a per-run panel; Codex currently returns false for background tasks despite SR-006's measured command events/list API.
- Full intake/evidence and open scope decision: `background-visibility-intake.md`. Recommend a separate read-only visibility task beginning with Codex and existing panel; not arbitrary process inventory, new stop buttons, logs/persistence or idle-policy changes.
- Outside current approved shutdown/conflict R1/D3.1; not a prerequisite for its independent validation. Current CRR-002 Pass remains valid. No implementation authorized.
- Sent: Not yet sent to Project Task Manager; awaiting user's separate-task scope confirmation. No Task created/delegated.

- Superseding decision2026-10-26: user “do it in this current ticket thanks”. Incorporated as R2/UC-003/REQ-007..009/AC-007..010, not an external follow-up or new Task; prior pending/suggested-separate disposition is historical.


## FU-003 — Triage/deduplicate remote default-branch dependency advisory
- Found by Delivery during the2026-10-26 ticket/personal push response. GitHub reported990 default-branch vulnerabilities (24critical,441high,453moderate,72low), linking its dependency alerts. This is an aggregate remote advisory, **not independently validated**, and not evidence that this ticket introduced a defect.
- Evidence: successful push tool receipt; same advisory on both pushes. No provider/security scan or remediation was performed by this ticket. Existing source/package validation and secret gate passed at their own boundaries.
- Outside this ticket: dependency security remediation across the default branch is not the approved port/shutdown/read-only visibility scope. No specific regression or prerequisite established here.
- Urgent: Yes — triage the critical/high advisory and deduplicate against existing security work before creating new tasks.
- Suggested Task: assess current dependency alerts and prioritize confirmed reachable risks with owners and scoped remediations.
- Sent: Not yet; Solution Designer owns follow-up routing when this ticket leaves the team.
