# Solution Handoff — agy-image-context-input

- Result classification: `Architecture Design Complete`
- Package identifier: `agy-image-context-input`
- Current SR entry: `SR-002`
- Classification: `task_size=Small`, `architectural_risk=Low` → direct implementation route (no independent architecture review per configured rule)
- Applied handoff rule: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`
- Date: 2026-10-08

## Original Request

Project Task `project_task_ad5f497a-6825-41f1-ab99-5c67b4a619f0` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): image context files attached in the desktop app never reach the model on the Antigravity (AGY) runtime; the agent says the image "didn't come through". Fix so an AGY agent receives and can describe an attached image; check non-image files and team-member/delegated runs; cover with tests including an AGY input-mapping test with an image; user verifies in the desktop app.

User screenshot: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_ad5f497a-6825-41f1-ab99-5c67b4a619f0/context/ctx_13d2e97292bc__10.png`

## Root Cause And Solution (summary)

- `AgyAgentRunBackend.dispatchUserInput` sends only `dispatch.message.content` (`autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts:76`); all context files are dropped.
- AGY headless `stream-json` input is text-only; an `image` block ends the session (probe A).
- An absolute path in text + AGY's always-allowed native `view_file` gives the model real vision of the image (probes B, C, D).
- Fix: new pure builder `backends/antigravity/input/agy-user-message-text.ts` (`buildAgyUserMessageText`) rendering typed text + `Attached images (open each with view_file to see it):` section + shared `Reference files:` section (+ URL / data-URL lines); backend sends its result. Exact rules, strings, tests and docs: `design-spec.md`.

## Approval Basis

- Requirements `Approved` (SR-001) by the user on 2026-10-08 ("Okay, go ahead, approved."), DEC-001 = A (explicit image section), DEC-002 = A (no extra UI notice).
- Design (SR-002) realizes the approved basis without changing intended behavior.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input`
- Branch: `codex/agy-image-context-input`
- Base: `origin/personal` @ `048ea6cecb3f1999d4201be5b995157a8007d8e7`
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/solution-revision-record.md`
- Probe evidence (supplement, evidence only): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/probe-evidence/`
- Architecture review artifacts: `N/A — not applicable` (direct route, Small/Low)
- Product design artifacts: `N/A — not applicable`

## Scope

- In: UC-001..UC-004 (standalone and team-member AGY runs; images local/remote/data URL; non-image files).
- Out: other runtimes, frontend, AGY CLI changes, delegated `reference_files` rendering, downloading remote images.

## Expected Output From Implementation

Implement per `design-spec.md` "Change / Refactor Sequence"; satisfy AC-001..AC-008; produce implementation handoff artifacts per the implementation skill. Opt-in live test uses `AGY_LIVE=1` with `gemini-3.8-flash-low` (the local `agy` account's Claude-model quota is exhausted until ~2026-10-10).

## Open Risks

- Model may not always open the image; mitigated by explicit wording (probe D), verified live and by the user.
- Claude-in-AGY not live-probed (quota).
- `view_file` limits for unusual/large images unknown (visible tool error; out of scope).
- User verification in the desktop app is still required (delivery stage).

## Next Expected Action

Implementation Engineer implements and validates; downstream stages per team rules.


---

## SR-003 Update (supersedes routing above)

- Result classification: `Architecture Design Complete` (revised after code review CRR-001 Requirement Gap)
- Current SR entry: `SR-003`
- Classification: `task_size=Medium`, `architectural_risk=High` — the runtime-independent AgentRun input admission contract is modified (all runtimes).
- Applied handoff rule: "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`
- Approval basis: requirements `Approved` on SR-003 — SR-001 (DEC-001 A, DEC-002 A) plus DEC-003 A ("agree. go ahead", 2026-10-08): attach-only standalone sends are admitted and delivered on every runtime; neither-text-nor-attachments still rejected.
- What changed: REQ-004 revised, REQ-007 added, AC-003 revised (server entry path), AC-006 extended, AC-009..AC-011 added, BEH-007/UC-005/SCN-007 added. Design adds the AgentRun admission step to DS-001, a text-or-attachment admission predicate, a Codex empty-text-item guard, and per-runtime/history test locks ("SR-003 Revision" in `design-spec.md`).
- Already implemented and still valid: IR-001 commit `8139c6b12` (AGY builder). API/E2E artifacts (uncommitted) remain in the worktree; E2E-CF-002 must be re-run after implementation.
- Review artifacts to include: `code-review-report.md` and `code-review-revision-record.md` (CRR-001 failure-origin round; reviewed basis = IR-001 + API-REV-001). Architecture review artifacts: none yet (first review of this package).
- Open risks: provider acceptance of image-only turns (validate one Codex attach-only send live); ACP/Grok web-URL-only attach-only remains a visible error (accepted residual); user verification in desktop app pending.
- Next expected action: independent architecture review of the SR-003 package.


---

## SR-004 Update (supersedes SR-003 routing above)

- Result classification: `Architecture Design Complete`
- Current SR entry: `SR-004`
- Classification: `task_size=Small`, `architectural_risk=Low` — no shared server contract change; frontend Send-availability rule in an existing owner plus the already-implemented AGY builder.
- Applied handoff rule: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (direct route).
- Approval basis: SR-001 (DEC-001 A, DEC-002 A) + DEC-006 (user, 2026-10-09): text (or a skill tag) is required to send; a draft with only context files cannot be sent; server admission unchanged.
- Work for implementation: "SR-004 Revision" in `design-spec.md` — remove `attachmentsAreSendable` from `hasSendableDraft` and its 4 callers; frontend tests; keep IR-001 (`8139c6b12`). Do **not** implement the superseded SR-003 revision.
- Review history to carry: `code-review-report.md` / `code-review-revision-record.md` (CRR-001, basis IR-001 + API-REV-001); `design-review-report.md` / `architecture-review-revision-record.md` (ARCH-REV-001 Fail on SR-003 — findings moot under SR-004; SR-004 itself not architecture-reviewed because the direct route applies).
- API/E2E: E2E-CF-002 (uncommitted test) must be revised by its owner; attach-only is no longer a supported send.
- Open risks: user verification in desktop app pending; Claude-in-AGY not live-probed.
