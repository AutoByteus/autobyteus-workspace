# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after the hands-on evaluation | F-01..F-14 | N/A | Ready for Approval | BEH-001..007, REQ-001..011 | Evaluation report + recommended Option A presented to the user |
| SR-002 | Mixed (Requirements + Evidence) | User update 2026-10-17 via `/project_task_manager` (Task description + screenshot 55.png) | F-15, F-16 (new); F-01, F-07, F-12 revised | Ready for Approval (SR-001, never approved) | Ready for Approval | BEH-001..008, REQ-001..013, AC-001..012, SCN-001..007 | Recommendation replaced: standing test vault + per-run copies + in-process resolver; no keys in env |
| SR-003 | Requirements | User refinement 2026-10-19 (direct, in the Solution Designer conversation) | N/A | Ready for Approval (SR-002) | Ready for Approval | BEH-009, UC-008, SCN-008, REQ-001, REQ-014, REQ-015, AC-013, AC-014, DEC-002, DEC-009 | API-like use for experiments; location defined by `AUTOBYTEUS_TEST_VAULT_DIR`; `AGENTS.md` entry |
| SR-004 | Requirements (approval) | User 2026-10-19 ("why do we need this [ask]?" … "your code automatically uses a test vault … a few lines of code"); updated solution-designer skill (approval within direction) | N/A | Ready for Approval (SR-003) | Approved | BEH-009, UC-008, SCN-008, REQ-014, AC-013, DEC-001..009 | `ask` CLI dropped; code-first API; all decisions decided within direction; requirements approved |
| SR-005 | Requirement change (user) | User 2026-10-19: "set one environment variable … your normal logic will automatically use the test vault … like a database" | N/A | Approved @ SR-004; design drafted | Ready for Approval; design Needs Revision | REQ-005, REQ-014, DS-003..006, DEC-010, DEC-011 | Usage model changes from helper calls to env-selected automatic use; handoff held |
| SR-006 | Requirements (approval) + Design | User 2026-10-19: answers on production default and the "like a database" direction ("I think we should go into this direction") | N/A | Ready for Approval @ SR-005 | Approved; design reworked | REQ-001, 005, 007, 012, 014, 016; AC-015, AC-016; DEC-010, DEC-011 | Selector env var; read-only vault selected by the normal vault runtime; production default; autobyteus-ts default resolver |
| SR-007 | Requirements (user) | User 2026-10-19: "write in TESTING.md to set the test vault environment variable … important in the requirement" | N/A | Approved @ SR-006; design under architecture review | Approved; design updated (docs guidance only) | REQ-013, AC-012 | TESTING.md must instruct setting `AUTOBYTEUS_TEST_VAULT` (section, rule, every real-key example) |
| SR-008 | Mixed (Design Impact + editorial Requirement Gap) | Architecture review ARCH-REV-001 (Fail): AR-001..AR-006 | AR-001..AR-006 | Approved @ SR-007; design Ready (failed review) | Approved @ SR-008; design Ready (revised) | REQ-004, 005, 011, 013, 014, 016; AC-004, 009, 010, 016, 017; UC-009; SCN-009; DEC-007, 012 | Live opt-in at harnesses; concrete refused set; one failure rule; Prisma-free read path; docs aligned |
| SR-009 | Requirement change (user) + Design | User via code review (2026-10-20, user's words relayed by `/software_engineering_team/code_reviewer`): normal logic never has to know; plain scripts too; "do it in this ticket" | Code-review Requirement Gap / Design Impact (CRR-001 passed IR-001) | Approved @ SR-008; implemented IR-001 `12a23e7b8a`; code review passed | Approved @ SR-009; design Ready (delta) | REQ-005(c), REQ-014; AC-009, AC-013, AC-018; DEC-011 → DEC-013 | autobyteus-ts owns the vault read side and reads the selector itself; the server disables that default |

## Revision Entries

### SR-001 — Evaluation and recommended test-vault approach

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task from `/project_task_manager` (user concern 2026-10-10); walkthrough W-01..W-10
- Triggering finding IDs: N/A (evaluation findings F-01..F-14 recorded in the report)
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..007, UC-001..006, REQ-001..011, AC-001..012, SCN-001..006, DEC-001..008
- Scenario-basis changes: Initial
- Why recorded: First baseline presented to the user for decision/approval
- Canonical sections changed: All sections created (requirements-doc, investigation-notes, test-vault-evaluation-report)
- Supplemental artifacts added: `test-vault-evaluation-report.md`, `walkthrough/*.log`
- Product design evidence incorporated: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: Not approved; awaiting DEC-001..DEC-008
- Behavior-defining supplement versions: evaluation report @ SR-001, pending approval
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: Result returned to the task delegator for the user's decision (routine approval hold; no forward handoff)
- Downstream impact: None until approval
- Remaining gaps: U-01 (local-vault origin), U-02 (shared DB schema tolerance)
- Next action: User selects options / approves; then architecture design

### SR-002 — Standing test vault, no keys in the environment

- Phase and classification: Mixed, `Refinement` driven by user direction (SR-001 was never approved, so no approved basis is invalidated)
- Triggering input: `/project_task_manager` message of 2026-10-17; Task `c15a77b2` "UPDATE 2026-10-17"; screenshot `context/55.png` (skill-update-notice incident)
- Triggering finding IDs: F-15 (env → vault helper in 9 live suites), F-16 (removed Dedicated Real-E2E Store and its rationale)
- Prior status: Requirements `Ready for Approval` @ SR-001 (not approved)
- Current status: Requirements `Ready for Approval` @ SR-002; design not started
- IDs affected:
  - REQ-005 rewritten: the SR-001 env-injecting runner is withdrawn;
  - added REQ-006 (no credential in env), REQ-007 (run copies), REQ-012 (isolated instances);
  - renumbered REQ-008..013, BEH-004/BEH-008, SCN-005/SCN-007, AC-001..012;
  - DEC-001..008 redefined; the SR-001 DEC-003 `--yes` question was dropped because the general importer is no longer used by tests.
- Scenario-basis changes: SCN-007 added (isolated instance with the test vault)
- Why recorded: the user's explicit direction adds the hard constraint "no key through environment, chat or logs" and "set up once, point tests at it"
- Canonical sections changed: requirements-doc (all sections), test-vault-evaluation-report (rewritten), investigation-notes (source log, clarifications, risks)
- Supplemental artifacts added: `context/55.png`
- Intended behavior changed: Yes (proposal only; nothing approved yet)
- Approval impact: awaiting DEC-001..DEC-008
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: approval hold; result returned to `/project_task_manager` (no matching rule)
- Remaining gaps: R-04 (layering of the in-process resolver) for design; DEC-008 leftovers are the user's decision
- Next action: user decisions/approval → architecture design

### SR-003 — Use the test vault like an API service

- Phase and classification: Requirements, `Refinement` from direct user input (not yet approved, so no approved basis is invalidated)
- Triggering input: user message of 2026-10-19 in the Solution Designer conversation:
  - set up as easily as possible;
  - used like an API service ("call with parameters, get the result back") by the implementation engineer or solution designer during investigation and experiments;
  - knowledge placed in a global design/knowledge file available to all team members;
  - location is the one decided by the test-vault DIR environment variable.
- Triggering finding IDs: N/A
- Prior status: Ready for Approval @ SR-002
- Current status: Ready for Approval @ SR-003
- IDs affected:
  - added BEH-009, UC-008, SCN-008, REQ-014 (shell/code API), REQ-015 (`AGENTS.md` entry), AC-013, AC-014, DEC-009;
  - REQ-001 and DEC-002 reworded: the location is `AUTOBYTEUS_TEST_VAULT_DIR`, with a default when unset.
- Why recorded: the user extended the use cases (experiments) and the knowledge-placement requirement
- Canonical sections changed: requirements-doc (problem/outcome, behaviors, use cases, REQs, ACs, scenarios, decisions, traceability); report §5 (new 5.0 "test vault API"), §6
- Intended behavior changed: Yes (proposal only)
- Alternative recorded: a local HTTP proxy daemon was rejected (daemon lifecycle, port, long-lived key holder, per-provider forwarding)
- Approval impact: awaiting DEC-001..DEC-009
- Applied handoff-rule outcome: approval hold within the user conversation; per `/project_task_manager` (2026-10-17), the user decides directly here and no relay is needed
- Next action: user approval → architecture design

### SR-004 — Code-first test vault API; requirements approved within the direction

- Phase and classification: Requirements, `Refinement` and approval
- Triggering input:
  - the user's message of 2026-10-19 rejects the shell `ask` command and wants code that "automatically uses a test vault … a few lines of code";
  - the solution-designer skill update of 2026-10-19 (approval within the direction; most decisions belong to the Solution Designer; new template fields Requested by, Prerequisites, Decisions).
- Triggering finding IDs: N/A
- Prior status: Ready for Approval @ SR-003
- Current status: Approved @ SR-004
- IDs affected:
  - BEH-009, UC-008, REQ-014, AC-013, SCN-008 rewritten to code-first (resolver for autobyteus-ts; activation of a vault copy for server code);
  - DEC-001..DEC-009 converted to `Decided` with reasoning; none is `Needs user`.
- Canonical sections changed: requirements-doc (status, Requested by, Prerequisites (none), Decisions, readiness); report §5.0, §6
- Intended behavior changed: Yes (the `ask` CLI was removed from the proposal)
- Approval impact: approved by the Solution Designer within the user's direction. Reference: the conversation reply of 2026-10-19 informing the user. Basis: requirements-doc @ SR-004 + report @ SR-004.
- Design/review basis: none yet; architecture design starts now
- Next action: architecture design (reading gate), design-spec, classification, handoff

### SR-005 — Select the test vault like a database (one environment variable)

- Classification: user change to intended behavior (Recovery: Requirement Gap / user change)
- Trigger: user message of 2026-10-19 that interrupted the architecture handoff
- Prior status: requirements Approved @ SR-004; design-spec drafted (`Ready`, Large/High), not handed off
- Current status: requirements Ready for Approval (DEC-010, DEC-011 Needs user); design Needs Revision
- Proposed change:
  - `AUTOBYTEUS_TEST_VAULT=<dir>` (a location, never a key) makes the normal key lookup read from that vault, read-only;
  - for server processes this is the vault runtime's store selection, so in-process suites, built test servers and isolated instances need no transfer helper;
  - for autobyteus-ts it is an optional default resolver, installed by the test setup (DEC-011);
  - the server ignores the variable on the user's real app data and logs which vault it uses;
  - unset means no change (DEC-010).
- Next action: user answers DEC-010/011 → update REQ-005/REQ-014 and rework the design

### SR-006 — Approved: the vault is selected like a database

- Classification: user approval of the changed intended behavior + design rework
- Trigger:
  - user, 2026-10-19: "if you don't set this, it by default uses the production itself"; "the user just sets this environment variable … test server, integration test, API E2E, the electron instance … good to go";
  - "I think we should go into this direction because the industry has set up a very good standard".
- Prior status: Ready for Approval @ SR-005; design Needs Revision
- Current status: requirements Approved @ SR-006 (user); design reworked (`design-spec.md` @ SR-006)
- IDs affected:
  - REQ-001 (selector `AUTOBYTEUS_TEST_VAULT`, replacing `AUTOBYTEUS_TEST_VAULT_DIR`), REQ-005, REQ-007 (read-only only; no run copies), REQ-012 (Must), REQ-014 (no extra code);
  - new REQ-016 (production default + guard), AC-015, AC-016;
  - DEC-010 decided by the user; DEC-011 decided within the user's direction.
- Evidence added: Electron production launches pass the full caller environment to the server (`autobyteus-web/electron/server/serverRuntimeEnv.ts` `inherit-caller`), so the server-side guard on `~/.autobyteus/server-data` is required. Isolated launches pass only baseline variables (`isolated-baseline`), so isolated-app must hand the selector to the instance.
- Design impact: the transfer, run-copy, `provision` subcommand and `useTestVault` helper are removed from the design. The vault runtime selects the read-only test vault store when configured.
- Next action: classify and hand off for architecture review

### SR-007 — TESTING.md must tell test runners to set the selector

- Classification: user-directed requirement refinement (documentation obligation); the user's own words are the approval
- Trigger: user 2026-10-19, in the Solution Designer conversation
- Prior status: Approved @ SR-006; design `Ready`, sent to architecture review (commit 4bda51cb6d)
- Current status: Approved @ SR-007; design-spec updated in Guidance For Implementation (docs only); no structural design change
- IDs affected: REQ-013, AC-012
- Review impact: architecture reviewer informed of the revised basis (same review; no structural change)

### SR-008 — Answering architecture review ARCH-REV-001

- Classification:
  - Design Impact: AR-001, AR-002, AR-004;
  - editorial Requirement Gap: AR-003;
  - accepted recommendations: AR-005, AR-006.
- Trigger: `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_de82e19f39ac4442a25216609c2f8983`), `design-review-report.md` ARCH-REV-001 (Fail)
- Prior status: requirements Approved @ SR-007; design Ready @ SR-007 (failed review)
- Current status: requirements Approved @ SR-008; design Ready @ SR-008
- Changes:
  - **REQ-005 / DEC-012 / AC-017 / UC-009 / SCN-009.** The workspace's deterministic harnesses never apply the selector; live runs opt in through their existing gate.
    - This resolves P-001 within the already-approved preserved boundary. It does not change the user's model: servers started with the variable, isolated instances, `test:e2e:real` and live tests all use it.
    - Classified as within direction because the preserved boundary was user-approved and live tests already require their gate; no user decision is needed. The user was informed.
  - **REQ-004 / AC-004.** Concrete refused set (Electron `userData` defaults for app `autobyteus` per OS + macOS Logs), with separate predicates.
  - **REQ-016 / AC-016.** One failure rule: a selected test vault that is invalid, forbidden, missing or not READY stops startup.
  - **REQ-014.** Gemini keeps an explicit mode resolver.
  - **REQ-013.** TESTING wording: set the variable together with the live gate; deterministic suites ignore it; not in a shell profile.
  - **Editorial (AR-003).** The superseded copy/option wording was removed from the requirements doc, report and investigation notes; baselines and supplement status updated.
  - **Design.** Harness owners (DS-005), failure rule, Prisma-free `read-only-test-vault.ts`, resolver split, `startBuiltTestServer({testVaultSetting})`, web-probe strip, review-response table.
- Intended behavior changed: clarified (REQ-005 scope for deterministic harnesses; REQ-016 failure); no change to the user's model
- Next action: return to architecture review (round 2)

### SR-009 — autobyteus-ts reads the test vault itself

- Classification: user change to intended behavior (Requirement Gap) with Design Impact
- Trigger:
  - `/software_engineering_team/code_reviewer` (run `code_reviewer_d7dd6fff4f6b4ef5a6afc43d26371de7`), 2026-10-20, relaying the user's direction from the code-review conversation, with the user's words: "do you think we can do it in this ticket? if yes that would be great";
  - the bar is the database model: normal logic never has to know.
- Evidence: A-27..A-29
- Prior status: requirements Approved @ SR-008; design passed ARCH-REV-002; implemented IR-001 (`12a23e7b8a`); code review CRR-001 passed; API/E2E on hold
- Current status: requirements Approved @ SR-009 (user's relayed words); design `Ready` with the SR-009 delta; classification still Large/High
- IDs affected:
  - REQ-005(c) and REQ-014 rewritten;
  - AC-009 and AC-013 rewritten; AC-018 new;
  - DEC-011 superseded by DEC-013.
- Design:
  - the vault read side and location policy move to `autobyteus-ts/src/secrets/vault/` (one owner);
  - autobyteus-ts gets an environment default key source;
  - the server disables that default;
  - the test-support installer and `setDefaultProviderApiKeyResolver` are removed;
  - Vitest setup deletes the selector unless the live gate is set.
- Review impact: the ARCH-REV-002 pass covered SR-008 only. The SR-009 delta goes back to architecture review before implementation continues.
- Next action: handoff to `/software_engineering_team/architecture_reviewer`
