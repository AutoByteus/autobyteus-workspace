# Solution Handoff — `agent-package-auto-refresh`

- Result classification: **Architecture Design Complete**
- Current solution revision: `SR-007` (revision after ARCH-REV-001; resubmitted for ARCH-REV-002)
- Date: 2026-10-11
- Task origin: Project Task delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)

## Original Request (summary)

Automatically pick up changes to imported agent packages (agents, teams, orgs and their skills) without a manual refresh.
- **Primary journey (user):** the Project Task Manager delegates to the Agent Package Creator, which creates, edits or deletes definitions. The next `delegate_task` / `list_available_agents` must use the current definitions.
- **Done when:** changes appear within a few seconds in `list_available_agents`, the `@` menu and the Agents/Teams/Orgs pages; invalid edits are reported without breaking working definitions; running runs are unaffected; covered by tests; verified by the user in the desktop app.

## Approval Basis

- `requirements-doc.md` status **Approved** (SR-005). User reference, 2026-10-10: "I think this is reasonable approach."
- DEC-001…DEC-006 approved as recommended; DEC-007 = no change (tolerant missing skills are by design); REQ-018/AC-016 recorded within the approval.
- DSN-001 (watch GitHub-managed roots uniformly) is a Solution Designer solution-detail decision. It changes no approved behavior.
- Key approved scope:
  - Watch definition structure and files only.
  - **Skills are not watched or published.**
  - About 1 s settle; a pending change is applied before any catalog read.
  - Last good version kept, with a visible error.
  - Running copies untouched.
  - Web lists and `@` update live; Reload buttons kept.
  - GitHub Check/Update stays explicit.

## Classification

- `task_size`: **Large**
- `architectural_risk`: **High**
- Evidence:
  - a new server subsystem;
  - ownership-boundary refactor (cache providers and fresh-read path removed; services become the single catalog boundary);
  - new websocket and GraphQL contracts;
  - concurrency (settle/flush/serialized reconcile vs. in-app writes);
  - watcher lifecycle;
  - blast radius across every shared-definition reader.

## Key Evidence

- One invalid `agent-config.json` bricks the entire agent catalog today, until a manual refresh (probe `probes/apar-cache-probe.test.ts`).
- In-process chokidar with a structural allow-list:
  - 163 dirs for the largest user package, ready in 47 ms, events in 2–13 ms;
  - no skill or non-definition events; no fd growth on macOS;
  - a missing parent of a watched path is not detected, so the design watches the nearest existing ancestor.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Probes (evidence only): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/probes/`
- Supplements: none. Product Design artifacts: N/A — not requested.
- Prior review artifacts: N/A — none yet.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh`, branch `codex/agent-package-auto-refresh`
- Base: `origin/personal` @ `56530dfc6333e2308ad2ac1a943b5139cc85bf3d`; finalization target `origin/personal`
- Dependencies installed (`pnpm install --prefer-offline --ignore-scripts`) and `pnpm -C autobyteus-server-ts prebuild` run. Untracked SDK `dist/` folders are build output. No source changes yet.

## Open Risks / Uncertainty

- Linux watcher cost not measured (expected about 300 inotify watches). If it exceeds QR-002 → Design Impact.
- U-001: the web UX of restoring a run whose definition was removed (existing error) is not exercised. Validate it in AC-008.
- Test churn: about 14 test files reference the removed fresh/cache APIs.

## SR-007 Revision Summary (ARCH-REV-001 findings)

- **AR-001**: publication expands dependent subjects.
- **AR-002**: admission enumerates the catalog; the registry is application-owned only; the duplicate rule moves into the readers (DSN-002).
- **AR-003**: `definitionDiagnostics(subject: DefinitionSubject!)` replaces `definitionAdmissionDiagnostics`.
- **AR-004**: last good covers nested definitions through definition units (DSN-003; REQ-007 not narrowed, so no user approval was needed).
- **AR-005**: root state machine with runtime transitions plus identity re-arm.
- **AR-006**: the sync owns initial population; monitor armed first; bootstrapper order defined.
- Residual notes adopted. Requirements edits are editorial only. Review artifacts: `design-review-report.md`, `architecture-review-revision-record.md` (reviewer-owned).

## Expected Next Action

Architecture re-review (ARCH-REV-002) of the SR-007 package, focused on AR-001…AR-006; then implementation per the change sequence in `design-spec.md`.

## Route Applied

`get_handoff_rules` (2026-10-11, SR-006 and again for SR-007): the rule "Architecture Design Complete with task_size=Large or architectural_risk=High … requirements explicitly approved" matches → `/software_engineering_team/architecture_reviewer`. The Small/Medium–Low rule (implementation engineer) and the Delivery receipt rule do not match.

## Review Outcome Record

- 2026-10-11: ARCH-REV-002 **Pass** (informational) on SR-005 approval plus SR-007 design. AR-001…AR-006 verified resolved.
- The reviewer delivered the primary handoff to `/software_engineering_team/implementation_engineer`, with implementation notes N-1 (mandatory: admission enumeration includes org-owned team nodes of org units), N-2, N-3 and N-4.
- Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- No Solution Designer forwarding required.

## SR-008 Revision (CR-004, 2026-10-11)

- Trigger: code reviewer CRR-003, failure-origin `Design Impact` for API-REV-001 DESK-002 (nested last-good issue had no web surface).
- Decision (DSN-004): nested issues render on the **owning Team/Org card**. Team/Org GraphQL `catalogIssue` → unit-wide `catalogIssues` (root plus nested, `usingLastGood`). The badge takes a list. The notice stays for unusable definitions only.
- FU-001 (out of scope; follow-up candidate): collaborator candidates are not filtered by admission availability (same at base).
- Verification additions are in `design-spec.md` § "SR-008 Verification Additions".
- Current implementation branch `codex/agent-package-auto-refresh` @ `a28465175`. Test commits `a28465175`/`6b3a10822` await proportional test review after a passing run (per CRR-003).
- Downstream artifacts (reviewer/implementation/validation-owned) at the same folder: `code-review-report.md`, `code-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `api-e2e-*.md`, `api-e2e-evidence/`, `implementation-evidence/`.
- Route applied (SR-008): `get_handoff_rules` → the revised Large/High package matches the architecture-review rule → `/software_engineering_team/architecture_reviewer` (delta review of SR-008). After that review, the route continues implementation → source review → API/E2E, as CRR-003 noted.
- 2026-10-11: ARCH-REV-003 **Pass** (informational) on the SR-008 delta. CR-004 is resolved by design; DSN-004 and `catalogIssues` are within REQ-009; FU-001 is out of scope. The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer` with notes N-5 (unit issues via the services) and N-6 (one `DefinitionUnitIssue` mapper). No Solution Designer forwarding required.
