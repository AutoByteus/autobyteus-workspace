# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after user request and live feasibility probe | N/A | N/A | Ready for Approval | BEH-001..BEH-009; REQ-001..REQ-015; AC-001..AC-014 | Presented to user for approval with DEC-001..DEC-005 |
| SR-002 | Requirements | User clarifications on MCP tool surface and fixed control port | N/A | Ready for Approval | Ready for Approval | BEH-005, BEH-006; REQ-001, REQ-005..REQ-008; AC-004..AC-006; QR-002, QR-007; DEC-006, DEC-007; ASM-004 | Minimal MCP surface; awaiting DEC-001..005 and approval |
| SR-003 | Requirements | Recording moved to lifecycle command; user approval | N/A | Ready for Approval | Approved | BEH-006; REQ-008; AC-005; QR-007; DEC-001..DEC-006 | Approved baseline; architecture design next |
| SR-004 | Mixed | Architecture investigation: DEC-002 conflicts with secret-management contract | ARCH-F-001 | Approved (SR-003) | Ready for Approval (delta) | REQ-015, AC-014, DEC-002 | Requirement Gap; replacement proposed (recording template); other requirements remain approved |
| SR-005 | Requirements | User security policy: agents may run the key importer with a user-given key file; template dropped | ARCH-F-001 | Ready for Approval (delta) | Ready for Approval (delta) | REQ-015, AC-014, DEC-002 | Proposed `--yes` non-interactive confirmation; awaiting confirmation |
| SR-006 | Mixed | Evidence of established agent importer use + `script` TTY probe; user direction | ARCH-F-001 | Ready for Approval (delta) | Approved | REQ-015, AC-014, DEC-002 | `--yes` dropped; unchanged importer; docs permit agents; design proceeds |
| SR-007 | Design | Architecture design completed on SR-006 | N/A | Requirements Approved; no design | Requirements Approved; Design Ready | All BEH/REQ/AC | design-spec.md Ready; Large / High |
| SR-008 | Mixed | ARCH-REV-001 Fail (Design Impact) | ARCH-DR-001, ARCH-DR-002, ARCH-DR-003 | Design Ready | Requirements delta Ready for Approval; Design revised (pending DR-001 approval) | REQ-006, AC-005, AC-003; BEH-001/005/006 | DR-002/003 + residuals resolved in design; DR-001 option (b) + AC-003 alternate need user approval |
| SR-009 | Mixed | User responsibility-boundary decisions resolving ARCH-DR-001; recording moved to browser MCP; import-package dropped | ARCH-DR-001..003 | Requirements delta Ready for Approval; design Needs Revision | Requirements Approved; Design Ready (rewritten) | BEH-005/006; REQ-006/007/008/011/012; AC-003/005/006/007/011; QR-007; DEC-006; SCN-004/005 | Re-review requested |
| SR-010 | Requirements (artifact repair) + Design guidance | ARCH-REV-002 Fail (Requirement Gap) | ARCH-DR-004 | Requirements Approved (SR-009, corrupted rows) | Requirements Approved (repaired); Design Ready | AC-003, AC-007, AC-014; SCN-004, SCN-005; UC-006 | Repair only; no intent change |
| SR-011 | Design (+ requirement clarification) | Implementation Design Impact IR-001 | IMP-DI-001 | Design Ready (SR-010) | Design Ready (capability gate added) | REQ-002 (scope note), AC-001 (alternate), BEH-001/003 | Option B: fail closed on isolated-launch marker; re-review |
| SR-012 | Design | ARCH-REV-004 Fail (Design Impact) | ARCH-DR-005, ARCH-DR-006 | Design Ready (SR-011) | Design Ready | REQ-001, QR-004, ASM-001 | AppImage branch (option b); stale ≥1.4.53 text aligned |

## Revision Entries

### SR-001 — Initial requirements baseline: agent-driven isolated instances, control, recording, root guide

- Phase and classification: Requirements — Initial Baseline
- Triggering user feedback: conversation of 2026-09-28 (feasibility question; root-doc requirement; openness to improving the browser MCP; "make it very easy for agents")
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-001..009, REQ-001..015, AC-001..014, SCN-001..006, DEC-001..005
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline for user approval
- Canonical sections changed: all (new)
- Supplemental artifacts added: `evidence/probe-01..03*.png`, `evidence/screencast_probe.py` (evidence only)
- Prototype evidence incorporated: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending explicit user approval
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design task-size/risk classification: N/A
- Applied handoff-rule outcome: N/A (approval hold in requirements conversation)
- Downstream impact: N/A
- Remaining gaps: DEC-001..DEC-005; U-002 (full variable list, design)
- Next action: obtain user decisions and explicit approval, then architecture design

### SR-002 — Minimal browser-MCP surface and fixed control port

- Phase and classification: Requirements — Refinement
- Triggering user feedback: conversation 2026-09-28 — user will configure the recording agent's MCP with a fixed port; rejected a broad set of new action tools ("you cannot have all those tools"); accepted exactly `start_recording` and `stop_recording`.
- Triggering finding IDs: N/A
- Prior status: Requirements Ready for Approval (SR-001, not approved)
- Current status: Requirements Ready for Approval; design not started
- IDs affected: BEH-005, BEH-006; REQ-001 (fixed default control port), REQ-005 (attach-only config replaces per-call target selection), REQ-006 (actions via `run_script` + shipped helper, no new tools), REQ-007 (presentation via helper), REQ-008 (exactly two recording tools); AC-004..AC-006; QR-002; new QR-007, DEC-006, DEC-007 (decided), ASM-004
- Scenario-basis changes: SCN-003 entry surface = MCP configured to fixed port
- Why recorded: user decisions changed intended behavior before approval
- Canonical sections changed: Relevant behavior table, In-Scope Use Cases, Non-Goals, Requirements, Acceptance Criteria, Quality, Assumptions, Open Decisions
- Supplemental artifacts: unchanged
- Intended behavior changed: Yes (pre-approval)
- Approval impact: SR-001 was never approved; approval now pending on SR-002 baseline
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Remaining gaps: DEC-001..DEC-005
- Next action: obtain DEC-001..DEC-005 answers and explicit approval of SR-002 baseline

### SR-003 — Recording in lifecycle command; approved baseline

- Phase and classification: Requirements — Refinement + Approval
- Triggering user feedback: conversation 2026-09-28 — user agreed the browser MCP's connect–operate–disconnect design is well reasoned and should be kept; recording therefore moves to the lifecycle command (direct CDP); then "yeah, I think I'll approve now".
- Triggering finding IDs: N/A
- Prior status: Ready for Approval (SR-002)
- Current status: Requirements Approved; design in progress
- IDs affected: BEH-006, REQ-008 (recording via lifecycle `record start/stop`), AC-005 (MCP tool list unchanged), QR-007 (no new MCP tools), DEC-006 (revised), DEC-001..DEC-005 (decided as recommended)
- Scenario-basis changes: SCN-004 trigger = lifecycle command record start/stop
- Why recorded: final pre-approval refinement and approval capture
- Canonical sections changed: Document Status, behavior table, Non-Goals, REQ-008, AC-005, QR-007, Open Decisions, Readiness Check
- Supplemental artifacts: unchanged (evidence only)
- Intended behavior changed: Yes (pre-approval)
- Approval impact, exact approved baseline and reference: Approved baseline = SR-003 requirements-doc.md; user approval in conversation 2026-09-28; DEC-001..DEC-005 approved as recommended (user made no changes when asked)
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A (design starts on SR-003)
- Post-design classification: pending design
- Applied handoff-rule outcome: N/A
- Remaining gaps: none at requirements level; U-002 is a design investigation item
- Next action: architecture investigation and design-spec.md

### SR-004 — DEC-002 conflicts with the secret-management contract (Requirement Gap)

- Phase and classification: Mixed (Evidence → Requirements) — Requirement Gap
- Triggering evidence: architecture investigation 2026-09-28 of `autobyteus-server-ts/docs/modules/secret_management.md` and `src/secret-management/*`
- Triggering finding IDs: ARCH-F-001 — provider keys are stored only in each application database's encrypted vault (DB + sibling root key); the sole importer `pnpm secrets:import` is operator-only with TTY confirmation and "never a startup, UI, API, MCP, agent, or test-runner fallback"; the contract creates no secret transfer. The approved DEC-002 (opt-in automated copy of the user's provider keys) would require an agent-invoked secret transfer out of the production vault.
- Prior status: Requirements Approved (SR-003)
- Current status: Ready for Approval for the REQ-015/AC-014/DEC-002 delta; all other requirements remain approved at SR-003; design paused only for REQ-015
- IDs affected: REQ-015, AC-014, DEC-002
- Scenario-basis changes: SCN-005 gains "start from a user-prepared recording template"
- Canonical sections changed: Document Status, REQ-015, AC-014, DEC-002
- Intended behavior changed: Yes (proposed)
- Approval impact: renewed explicit user approval required for the delta before REQ-015 design proceeds
- Affected design/review basis: design-spec not yet authored; REQ-015 portion blocked on approval
- Remaining gaps: DEC-002 decision
- Next action: present conflict and options to user

### SR-005 — Agent-run key import (template dropped)

- Phase and classification: Requirements — Refinement (Requirement Gap resolution in progress)
- Triggering user feedback: 2026-09-28 — "the security is that the agent could run the command to import the key file as well, it's not only human"; "I will just give the agent the key file, the agent decides by itself to run the command".
- Evidence: importer confirmation requires direct TTY on stdin and stderr plus typed `IMPORT` (`local-environment-secret-import-service.ts:176-190`, CLI `import-local-environment-secrets.ts:107-125`); AutoByteus macOS/Linux agents run `run_bash` in PTY sessions (`session-factory.ts`) but no input-sending tool exists (`tools/terminal/tools/*`); piping input removes the TTY.
- IDs affected: DEC-002 (decided: agent-run importer, no template), REQ-015, AC-014 (revised)
- Intended behavior changed: Yes — security policy (agents are permitted importer operators) and proposed importer `--yes`
- Approval impact: user decided the policy; the concrete `--yes` option awaits confirmation
- Next action: confirm `--yes`, then complete design

### SR-006 — Unchanged importer; agents run it (approved)

- Phase and classification: Mixed — Evidence + Requirements approval
- Triggering: user 2026-09-28 "in the past the agent has run them … they set up the test environment … they run it"; ticket evidence P-9; probe P-8 (`script` supplies a TTY for piped confirmation)
- IDs affected: REQ-015, AC-014 (no importer code change; guide documents interactive and `script` forms), DEC-002 (decided)
- Intended behavior changed: Yes relative to SR-005 proposal (no `--yes`); consistent with explicit user direction
- Approval impact and reference: Approved per explicit user direction in conversation 2026-09-28 (SR-006 baseline); all other requirements approved at SR-003
- Affected design basis: design-spec authored on SR-006
- Next action: complete design-spec, classify, route

### SR-007 — Architecture design complete

- Phase and classification: Design — Initial design
- Trigger: approved SR-006 requirements; architecture investigation AF-001..AF-010, P-8, P-9
- Prior status: Requirements Approved; design not started
- Current status: Requirements Approved (SR-006); Design Ready (`design-spec.md`)
- IDs affected: all BEH/REQ/AC mapped in design-spec behavior map; spines DS-001..DS-007
- Canonical sections changed: `design-spec.md` (new); investigation notes Architecture Investigation Findings
- Intended behavior changed: No
- Approval impact: none (design realizes SR-006 basis)
- Post-design classification: task_size = Large; architectural_risk = High (security/isolation boundary, new operational/IPC contracts, cross-invocation process lifecycle, cross-repo)
- Applied handoff-rule outcome: see `handoff-architecture-design-complete.md`
- Remaining gaps: none blocking; validation-time uncertainties listed as escalation triggers
- Next action: route per handoff rules

### SR-008 — Architecture review ARCH-REV-001 findings

- Phase and classification: Mixed — Design Impact (DR-002, DR-003) and requirement-wording delta (DR-001 option b; AC-003 alternate)
- Trigger: `design-review-report.md` ARCH-REV-001 (Fail, Design Impact); `architecture-review-revision-record.md`
- Finding IDs: ARCH-DR-001 (helper loading channel vs REQ-006/AC-005), ARCH-DR-002 (record output path rule; MP-002), ARCH-DR-003 (stop on dead-process record; MP-001); residuals MP-003 (occlusion), recorder identity, Node WebSocket→CDP, Linux default app, databaseUrl format
- Prior status: Requirements Approved (SR-006); Design Ready (SR-007)
- Current status: Requirements delta Ready for Approval; design revised, DR-001 resolution pending approval
- IDs affected: REQ-006, AC-005 (helper loaded by lifecycle over CDP, called via `run_script`), AC-003 (dead-process stop → success with `wasRunning:false` instead of error); design interface rows for `start`, `stop`, `helper`, `record start`; DS-002; Guidance; Risks R-008; escalation triggers (c),(e)
- Intended behavior changed: Yes (wording of REQ-006/AC-005 loading channel; AC-003 alternate outcome) — renewed user approval required
- Design-only resolutions: DR-002 path rule (`INIT_CWD`), DR-003 branch, recorder identity, databaseUrl derivation, occlusion switches, WebSocket verification step, Linux `--app` requirement
- Architecture-review impact: narrow re-review of DR-001..003 after approval
- Next action: obtain user approval of SR-008 wording; then re-route to architecture reviewer

### SR-009 — Responsibility-boundary revision (helper + recording in browser MCP; import dropped)

- Phase and classification: Mixed — Requirement refinement (user-approved) + Design revision resolving ARCH-REV-001
- Triggering user feedback (2026-09-29): helper as a built-in browser-MCP capability ("that's fine … from responsibility boundary, I think it belongs to where they are"; also answering the dead-process stop question); "yes. move record to browser mcp … if connect does one thing and disconnect is already limiting … we could improve … but it should not break how it works"; "drop import package … belongs to functionality of the application".
- Finding IDs resolved: ARCH-DR-001 (helper channel → requirement re-approved: built into MCP `run_script`), ARCH-DR-002 (recording outputs via browser-automation `ArtifactPolicy`; lifecycle relative paths via `INIT_CWD`), ARCH-DR-003 (dead-process stop branch; AC-003 alternate re-approved); residuals (occlusion switches, recorder identity, Linux `--app`, `databaseUrl` format; Node CDP client removed).
- Prior status: SR-008 (requirements delta pending; design Needs Revision)
- Current status: Requirements Approved (SR-009); Design Ready (rewritten `design-spec.md`)
- IDs affected: BEH-005, BEH-006; REQ-006, REQ-007, REQ-008 (two MCP tools `start_recording`/`stop_recording`, background worker, existing tools unchanged), REQ-011 (per-tool skills), REQ-012 withdrawn; AC-003, AC-005, AC-006, AC-007, AC-011 withdrawn; QR-007; DEC-006; UC-004, UC-005 removed; SCN-004, SCN-005
- Intended behavior changed: Yes — approved by the user as quoted
- Design impact: lifecycle reduced to start/list/stop/restart; browser-automation gains presentation helper and recording (service + worker + ffmpeg); SR-007 design elements (lifecycle helper/record/import, Node CDP client) removed before implementation
- Post-design classification: task_size Large; architectural_risk High (unchanged)
- Architecture-review impact: prior ARCH-REV-001 applies to SR-007 basis only; re-review required (broader than the three findings because recording moved subsystem)
- Next action: route to architecture reviewer

### SR-010 — Requirements artifact repair (ARCH-DR-004) and residual guidance

- Phase and classification: Requirements artifact repair (no intended-behavior change) + design guidance
- Trigger: ARCH-REV-002 (Fail, Requirement Gap) — ARCH-DR-004
- Root cause: the SR-009 scripted edit located SCN-004/SCN-005 by `| SCN-00x |`, which first matched the Related-SCN column of the AC-007/AC-014 rows, overwriting them with scenario text and leaving SCN-004/SCN-005 stale.
- Repair: AC-007 restored to the SR-009 approved text (recording via browser MCP `start_recording`/`stop_recording`); AC-014 restored to the SR-006 approved text (agent-run importer); SCN-004/SCN-005 rewritten to the SR-009 scenario content; AC-003 alternate drops the stale "any recording state cleaned up" clause (recording no longer owned by the lifecycle, per SR-009 approval); UC-006 reference fixed; Document Status approval line and Readiness Check updated to SR-009/SR-010; investigation status line updated. Rows now edited by exact line prefix.
- Intended behavior changed: No (restoration to approved wording; AC-003 clause removal follows the SR-009 user-approved move of recording)
- Approval impact: none beyond SR-009
- Design: no structural change; Guidance adds ARCH-REV-002 residuals (worker interpreter/no launch/no-op dialog listener, cancelled-run recording, restart tab id and root flags, occlusion limitation for user Chrome, concurrent-call validation)
- Classification: Large / High (unchanged)
- Next action: re-route to architecture reviewer for repair confirmation

#### Review Pass Notification (informational, no new SR round)

- 2026-09-29: ARCH-REV-003 **Pass** on SR-010 (SR-009 basis); ARCH-DR-001..004 closed. Reviewer forwarded the package to `/implementation_engineer`. Validation note carried: MP-005 — with the recorder's no-op dialog listener, confirm Electron dialogs stay visible and usable; otherwise return Design Impact to Solution Designer. Reports: `design-review-report.md`, `architecture-review-revision-record.md`. No duplicate forwarding by Solution Designer.

#### Evidence-only clarification (no new SR round, no approval impact)

- 2026-09-29: User delegated the validation-channel choice ("you decide"). Added to design-spec Guidance: browser-side validation via the self-bootstrapping CLI `browser-automation/scripts/browser`; MCP adapter only for AC-004 (attach-only via MCP config), tool-list check, and AC-010 agent run; `uv.lock` must reflect any new Python dependency. Recommendation only — API/E2E owns final test design. Intended behavior unchanged.

- 2026-09-29: Evidence-only clarification: user direction — skills + CLI are the primary agent path, tools must stay clean ("the agent is smart enough … it's not like we have to build every little tool"; MCP may be deprecated later). Proposed CLI additions (`--port`/`--attach-only` flags, isolated-app skill launcher, `import-keys`, `__abDemo.help()`) were withdrawn before approval. Design-spec validation guidance updated: AC-010 skill-first (no MCP configured). No requirement or design-structure change.

- 2026-09-29: Evidence-only design clarification (no requirement change): in-page popups/modals implemented by the app or website are ordinary DOM and are handled through the helper; to behave like a human with popups open, helper targeting uses hit-testing (topmost element at the target's center) and adds error code `OBSCURED`. Clarifies REQ-006 "visible text" semantics. Native `alert/confirm/prompt` and OS dialogs remain out of scope (documented limitation; possible follow-up ticket).

### SR-011 — Isolated-launch capability gate (IMP-DI-001)

- Phase and classification: Design Impact (with requirement clarification; no intended-behavior change)
- Trigger: implementation-engineer Design Impact IR-001, finding IMP-DI-001 (`implementation-handoff.md`, `implementation-revision-record.md`): default `start` uses the installed app; builds predating this change (installed 1.4.91-beta.4; beta.5 on origin/personal) are not isolated and show the update toast.
- Decision: option B — desktop builds ship `isolated-launch.json` (`isolatedLaunchContract: 1`) via `extraResources`; `start`/`restart` refuse apps without it with `APP_ISOLATION_UNSUPPORTED` (exit 3). Options A (docs-only) and C (launcher-side scrub) rejected (design-spec §Implementation Design Impact Resolution).
- IDs affected: REQ-002 (scope note: enforceable only for builds carrying the contract; lifecycle refuses others), AC-001 (alternate outcome), design interface/file mapping, guide prerequisites.
- Intended behavior changed: No — enforces approved REQ-002; user-visible consequence (installed pre-change apps refused until the next release) communicated to the user 2026-09-29.
- Also recorded: implementation notes REQ-002 supersedes AC-014 of the earlier electron-e2e-runtime-isolation ticket (provider-key env not passed to the e2e server; keys come from the vault) — consistent with SR-006; origin/personal advanced 3 commits (beta.5) — rebase is delivery's concern.
- Classification: Large / High (unchanged)
- Routing: revised architecture package → architecture reviewer (per handoff rules), then implementation round IR-002.
- SR-011 user acknowledgment (2026-09-29): user asked whether the capability gate is a hack and proposed releasing a beta first; after explanation (gate is a standard capability check protecting installs where skills/CLI are newer than the installed app; worktree `--build` path already validated; beta release belongs to delivery after review/validation), user confirmed: "if you think the design is good, okay, that's fine." No release before review; continue current routing.

### SR-012 — AppImage branch and prerequisite alignment (ARCH-REV-004)

- Phase and classification: Design Impact (no intended-behavior change)
- Trigger: ARCH-REV-004 (Fail, Design Impact) — ARCH-DR-005 (packed Linux AppImage always refused by the marker gate; MP-006), ARCH-DR-006 (stale "≥1.4.53" prerequisite in ASM-001 and design Guidance)
- Resolution: option (b) — detect packed AppImage (type-2 magic at offset 8 or `.AppImage` suffix) without executing it → `APPIMAGE_EXTRACTION_REQUIRED` (exit 2) with exact extract + `--app <squashfs-root>/<executable>` recovery; extracted layout goes through the normal marker gate; marker placed in AppImage `resources/` by the same `extraResources` entry; tests + guide/troubleshooting. Option (a) rejected (executes app runtime to probe; not validatable on macOS host). ASM-001 and design Guidance prerequisites aligned with the isolated-launch contract.
- Intended behavior changed: No (REQ-001 explicit-executable path; QR-004 Linux support preserved)
- Classification: Large / High (unchanged)
- Routing: architecture reviewer (narrow re-review: AppImage branch + two text lines)

#### Review Pass Notification (informational, no new SR round)

- 2026-09-29: ARCH-REV-005 **Pass** on SR-012 (with SR-011); ARCH-DR-005/006 closed, no open findings. Reviewer forwarded the package to `/implementation_engineer` for IR-002. New residual for Linux validation: no Chromium sandbox handling — direct launches of unpacked/extracted builds may fail on distros restricting user namespaces; must return as Design Impact, never a silent `--no-sandbox`. No duplicate forwarding by Solution Designer.

- 2026-09-29: User decisions (verification-scope clarification, no behavior change): (1) Linux Chromium-sandbox/user-namespace restrictions are the user's responsibility ("the user can run no sandbox by themselves") — ARCH-REV-005 residual reclassified from Design Impact trigger to documented Linux note; no pass-through/`--no-sandbox` added (offered as possible follow-up). (2) Validation in this ticket runs on macOS; the user validates Linux after delivery. QR-004 verification intent and design Guidance updated.
