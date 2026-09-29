# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline from user request 2026-09-29 | N/A | N/A | Ready for Approval | BEH-001..004; REQ-001..007; AC-001..007 | Presented with DEC-001..003 |
| SR-002 | Requirements | User moved skill changes to agent-team maintainers | N/A | Ready for Approval | Ready for Approval | REQ-001..005 withdrawn; REQ-006/007 kept; AC-006..008; BEH-004/005; DEC-002/003 moved | Scope = root TESTING.md + links |
| SR-003 | Requirements | User added native-dialog handling to this ticket; probes P-D1..D3 | N/A | Ready for Approval | Ready for Approval | BEH-006/007; REQ-008..011; AC-009..011; UC-005/006; SCN-005/006; DEC-004 | Two-repo ticket (workspace docs + mcps browser-automation) |
| SR-004 | Requirements | User approval | N/A | Ready for Approval | Approved | DEC-001, DEC-004, DEC-005 | Approved baseline; design next |
| SR-005 | Design | Architecture design on SR-004 | N/A | Requirements Approved | Design Ready | REQ-006..011 | design-spec.md; Medium / High |
| SR-006 | Mixed | User rejected hard-coded answers; delegated decision; ARCH-REV-001 findings | ARCH-DR-001, ARCH-DR-002 | Approved (SR-004); Design Fail | Approved (SR-006); Design Ready | BEH-006/007; REQ-008..011; AC-009..011; SCN-005/006; DEC-004/005 superseded; DEC-006 | Never-answer model; re-review |
| SR-007 | Mixed | User asked for agent-answerable dialogs via the tool; delegated choice | N/A | Approved (SR-006); Design passed (ARCH-REV-003) | Approved (SR-007); Design Ready | BEH-006; REQ-008/009/011; AC-009/011; SCN-005; DEC-005 reinstated; DEC-006 superseded; DEC-007 | Option 1 (agent decides via --dialog); implementation dialog part on hold; re-review |

## Revision Entries

### SR-001 — Initial baseline: project-agnostic testing skills + root testing guideline

- Phase and classification: Requirements — Initial Baseline
- Trigger: user conversation 2026-09-29 (skills must not carry project-specific testing policy; project guideline at repository root)
- Prior status: N/A
- Current status: Ready for Approval
- IDs: BEH-001..004, REQ-001..007, AC-001..007, SCN-001..004, DEC-001..003
- Intended behavior changed: N/A (baseline)
- Approval impact: pending
- Design: N/A
- Next action: user decisions DEC-001..003 and explicit approval

### SR-002 — Scope reduced to project documentation

- Phase and classification: Requirements — Refinement (pre-approval)
- Trigger: user 2026-09-29 — sending the skill changes as a request to the agent-team maintainers ("what we do in this project is only about our current project … only documentation testing MD"). The request text (discovery of root `TESTING.md`/`TESTING*.md`, fallback, universal safety rules, precedence, implementation-engineer line) was given to the user.
- Changes: REQ-001..REQ-005, AC-001..AC-005, BEH-001..003, UC-002/UC-003, SCN-002/SCN-003, DEC-002/DEC-003 withdrawn from this ticket; REQ-006/REQ-007 kept; REQ-007 adds the back-link from `docs/isolated-app-instances.md`; new AC-008 (path-selection walk-through).
- Observation: the team skill list visible to this agent already describes the API/E2E skill as validating "through the surfaces the project's testing guideline defines" — maintainers' change appears underway.
- Intended behavior changed: Yes (pre-approval scope reduction)
- Next action: user approval + DEC-001

### SR-003 — Native JavaScript dialog handling added

- Phase and classification: Requirements — Refinement (pre-approval)
- Trigger: user 2026-09-29 ("if you think the browser automation could handle it, then let's also improve it in the current tickets … including the testing MD")
- Evidence: probes P-D1 (silent auto-dismiss during a call), P-D2 (between-call dialog → ~20 s misleading BROWSER_UNAVAILABLE on every command), P-D3 (late CDP client cannot answer: "No dialog is showing") — investigation-notes §SR-003
- Added: BEH-006/007, REQ-008..REQ-011, AC-009..AC-011, UC-005/006, SCN-005/006, DEC-004; out of scope: answering between-call dialogs, OS dialogs, new MCP tools
- Intended behavior changed: Yes (pre-approval)
- Next action: user approval + DEC-001, DEC-004

### SR-004 — Approval

- User 2026-09-29: "Approved." — after the explanation of the optional per-command `dialog` argument (recommended) vs. a zero-argument alternative. DEC-001 `TESTING.md`, DEC-004 dismiss-by-default + report, DEC-005 optional argument on `run-script`/`navigate`/`close-tab` (no new tools) recorded as approved.
- Approved baseline: SR-004
- Next action: architecture investigation and design

### SR-005 — Architecture design complete

- Design: `design-spec.md` — root `TESTING.md` + links; browser-automation session-level `DialogHandling` (policy per operation, default dismiss, reported `dialogs`), optional `dialog`/`prompt_text` on run-script/navigate/close-tab (CLI+MCP), connect bound split (8 s for existing browsers) with `PAGE_BLOCKED` classification (heuristic; no new dependency).
- Classification: task_size Medium; architectural_risk High (public CLI/MCP contract + error semantics of a separately released tool)
- Intended behavior changed: No (realizes SR-004)
- Next action: route per handoff rules

### SR-006 — Never-answer dialog model; ARCH-REV-001 resolutions

- Trigger: user 2026-09-29 — "the agent should be deciding … you shouldn't hard code"; then preferred not complicating browser-automation because computer-use agents can see the whole screen and click dialogs with X tools; finally "You decide … accept your suggestions". ARCH-REV-001 (Fail, Design Impact): ARCH-DR-001 (close-tab/beforeunload), ARCH-DR-002 (artifact consistency), recommendations (own-tab scope, operations without options, attach early, headless note).
- Decision (DEC-006, Solution Designer under delegation): browser-automation never answers dialogs; `PAGE_DIALOG_OPEN` returned promptly for the operation's own tab; `PAGE_BLOCKED` ≤ 10 s; other tabs untouched; `close-tab` unchanged (ARCH-DR-001 option a); no new arguments or tools. DEC-004/DEC-005 superseded.
- Artifact repairs (ARCH-DR-002): duplicate approval line removed; investigation meta updated to autobyteus-mcps @ 6b39562 and current status.
- Superseded note: an interim "accept by default" edit was announced to the reviewer but never applied; withdrawn (reviewer recorded ARCH-REV-002 as withdrawn).
- Also: at the user's request, the Solution Designer authors `TESTING.md` directly (docs only).
- Intended behavior changed: Yes — under explicit user delegation
- Classification: Medium / High (unchanged)
- Next action: re-review by architecture reviewer

#### TESTING.md authored (Solution Designer, at user request; no new SR round)

- 2026-09-29: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/TESTING.md` written (119 lines) per design outline. Verified: every named script exists (root `test:e2e`, `test:e2e:real`, `test:e2e:real:preflight`, `secrets:import`, `isolated-app`, `dev`; web `test`, `test:nuxt`, `test:electron`, `test:e2e:electron`, `test:e2e:electron:isolation`, `test:e2e:isolated-app`; server/ts `test`); all 12 links/anchors resolve; `pnpm --silent isolated-app list` emits clean JSON; extracted-AppImage path matches `docs/isolated-app-instances.md`. Rule 7 (dialogs) is phrased to stay true after the browser-automation change ships. Remaining for implementation: links from README / both AGENTS.md / isolated-app guide (REQ-007), and verification. Not committed yet.

#### Review Pass Notification (informational, no new SR round)

- 2026-09-29: ARCH-REV-003 **Pass** on SR-006; ARCH-DR-001 (option a) and ARCH-DR-002 resolved; never-answer model passes; `TESTING.md` dialog rule matches DEC-006. Reviewer forwarded the package to `/implementation_engineer`. MP-003 (dialog stays open after disconnect, esp. headless) recorded as validation/escalation item. Cosmetic note on investigation-notes duplicate lines: checked — a single revision/status line remains; no action. No duplicate forwarding by Solution Designer.

### SR-007 — Agent answers dialogs through the tool (option 1)

- Trigger: user 2026-09-29 — "Is it possible to enhance the browser automation tool so that the agent is able to answer … that would be the best"; "Which option do you choose? … make the browser skill CLI able to enable the agent or the agents use the X tool … which one is better?" — delegated.
- Decision (DEC-007, Solution Designer under delegation): option 1 — optional `--dialog accept|dismiss` / `--prompt-text` on `run-script`/`navigate` (MCP parity); no decision → dismiss only to unblock + `DIALOG_DECISION_REQUIRED`; `alert` closed + reported; other tabs untouched; `PAGE_BLOCKED` kept; `close-tab` unchanged. Rationale: works on macOS/Linux/headless/Electron, deterministic, no extra process; X tools remain for OS dialogs. Option 2 (dialog keeper + `answer-dialog`) and SR-006 never-answer superseded/rejected.
- Coordination: implementation engineer told to HOLD the SR-006 dialog part (TESTING.md links and connect split/PAGE_BLOCKED may continue).
- Updated: requirements (REQ-008/009/011, AC-009/011, SCN-005, BEH-006, DEC-005/006/007, scope lines), design-spec (rewritten), `TESTING.md` rule 7.
- Classification: Medium / High (unchanged). Next: re-review.

#### Review Pass Notification (informational, no new SR round)

- 2026-09-29: ARCH-REV-004 **Pass** on SR-007 (DEC-007). Reviewer forwarded to `/implementation_engineer`, stating SR-007 supersedes SR-006 and lifts the dialog hold. Mandatory implementation guidance MP-004: `open-tab` treats the `new_page()` page as its own target before `goto`. Also recorded: page-identity comparison without CDP sessions on blocked pages; listener registered until the client stops; option-less-command wording of the `DIALOG_DECISION_REQUIRED` hint; residual MP-005 (headless may cancel an other-tab dialog on disconnect). No duplicate forwarding by Solution Designer.
- 2026-09-29 (user): headless is not a concern ("a lot of times I'm using head full"). Residual MP-005 (headless may cancel an other-tab dialog on disconnect) accepted as a documented limitation; validation priority is headful Chrome and the Electron isolated instance. No requirement change.
