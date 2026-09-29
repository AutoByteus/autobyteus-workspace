# API/E2E Revision Record — chat-interface-entry

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` CRR-001 / round 1 | SR-003, SR-004, SR-007; ARCH-REV-003; IR-001; CRR-001 | N/A | Fail / 88% |
| API-REV-002 | code_reviewer / `code-review-report.md` CRR-003 / round 2 | SR-010; ARCH-REV-006; IR-002, IR-003; CRR-002, CRR-003 | Fail / 88% | Pass / 95% |
| API-REV-003 | code_reviewer / `code-review-report.md` CRR-005 / round 3 | SR-011, SR-012; ARCH-REV-008; IR-004; CRR-005; DR-002 (UVF-001) | Pass / 95% | Pass / 95% |
| API-REV-004 | user direction / real desktop app via isolated instance | same as API-REV-003; HEAD `3c062a180` | Pass / 95% | Pass / 95% |
| API-REV-005 | code_reviewer / CRR-009 / round 5 | SR-013, SR-014; ARCH-REV-010; IR-005, IR-006; CRR-008, CRR-009; UVF-002 | Pass / 95% (+ UF-01/UF-02 open) | Fail / 93% |
| API-REV-006 | code_reviewer / CRR-011 (round 8) + CRR-013 (round 9) | SR-015..SR-019; ARCH-REV-011..015; IR-007, IR-008, IR-009; CRR-010..CRR-013; DEC-017, DEC-017a | Fail / 93% | Fail / 94% |
| API-REV-007 | code_reviewer / CRR-015 / round 11 | IR-010; CRR-014, CRR-015 | Fail / 94% | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial live validation baseline: Chat journeys pass; three findings

- Triggering role, report path, and round: `code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`, round 1
- Triggering finding or scenario IDs: CRR-001 downstream hints; CR-001 (Low)
- Related revision IDs: SR-007, ARCH-REV-003, IR-001, CRR-001
- Why recorded: first completed API/E2E result
- Coverage decisions / durable test paths changed: added `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` and the `test:e2e:chat-entry-live` script; removed the stale `createDraftRun` mock (CR-001) in `WorkspaceAgentRunsTreePanel.regressions.spec.ts`
- Scenarios added: CE-01..CE-20; probe C01..C13
- Commands / environment / broader-validation delta: repository suites (server targeted, web full, electron); live browser on an owned sanitized env with Codex, Claude, AGY, and AutoByteus (local); owned server restarts; packaged mac Electron via the project harness on an isolated root

#### Prior Failure Resolution

None.

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Fail, 88%
- New failure IDs: F-01 (Local Fix, locked thinking control missing on a fresh live chat), F-02 (Unclear, intermittent resend-after-failure stream timeout that loses the chat), F-03 (Design Impact, AGY ALL_INSTALLED workspace-skill name collision)
- Recommended recipient: `/software_engineering_team/code_reviewer`
- Remaining risks / untested scope: voice dictation (no microphone audio); pixel comparison covered VIS-001/003/015/023/024/025, not all 24 references

### API-REV-002 — Prior failures resolved; D-14 and D-15 validated live; full regression green

- Triggering role, report path, and round: `code_reviewer`, `code-review-report.md` CRR-003 (Pass), round 2
- Triggering finding or scenario IDs: F-01 (CR-002), F-02 (CR-003, D-14), F-03 (CR-004, D-15)
- Related revision IDs: SR-010, ARCH-REV-006, IR-002 (`da1033860`), IR-003 (`5f11d52f6`), CRR-003
- Why recorded: the round-2 validation after rework
- Coverage changes: `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` updated (`--repeat`, C14 D-15 Rule 1/V-D, C15 Rule 2 V-B/V-A/V-E, `probe-shadow-owner` fixture, `.grok` and AGY `.agents` skill-dir maps, a disposition matcher for both log formats). `package.json` script and CR-001 are unchanged from round 1.
- Scenarios rechecked first: C05 (F-01), C07 ×14 plus the implementer's `d14 stale`/`stale-resume` (F-02), C14/C15 on Codex/Claude/Grok, C14 on AGY, and the `d15` matrix (F-03). Then full regression C01–C15.
- Commands / environment delta: server rebuilt; repository suites rerun; all live runs in owned sanitized envs. The implementer probes were audited and rerun independently. Packaged Electron was not rerun (no shell, seeding or page changes since round 1).

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-01 live footer lacks the locked thinking control | Local Fix | Resolved | Probe C05 Pass; `round2/probe-codex/C05-live-locked-footer.png` |
| F-02 resend after a failed first send loses the chat (2/14) | Unclear → CR-003 (D-14 marker) | Resolved | C07 14/14; `round2/d14-stale*` and `round2/d14-stale-resume*` Pass with 0 closes |
| F-03 AGY ALL_INSTALLED workspace-skill collision | Design Impact → CR-004 (D-15) | Resolved | C14 on Codex/Claude/Grok/AGY, C15 on Codex/Claude/Grok; `round2/d15/` 13/13; real catalog weak 77/78 (skips only the collision), strong fail-fast unchanged |

- Canonical artifacts updated: coverage investigation (round 2 delta), execution coverage report (round 2 authoritative), ledger (Seq 34–45)
- Prior result and confidence: Fail, 88%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended recipient: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Remaining risks: voice dictation not automatable; the D-14 marker has no timeout (design-approved); the Windows re-point fallback is unit-only; not every VIS reference compared pixel-wise

### API-REV-003 — D-16 Chat model labels validated live; merged HEAD regression green

- Triggering role, report path, and round: `code_reviewer`, `code-review-report.md` CRR-005 (Pass), round 3
- Triggering finding or scenario IDs: UVF-001 / DR-002 → REQ-021, AC-018, DEC-015, D-16 (V-L1..V-L5)
- Related revision IDs: SR-011, SR-012, ARCH-REV-008, IR-004 (`9d65adf6e`), CRR-005; delivery merge `7aa53519b`, C-12 fix `4b440e719`
- Why recorded: validation of the D-16 rework and of the merged HEAD
- Coverage changes: `chat-entry-live-probe.mjs` — exact option-row selector (`MODEL_ROW`), `pickModel` returns the row label, C04 compares the trigger with the policy label (with settle timing), new C16 (AC-018 with an independent catalog oracle, launch-form parity, search, fixed list, fresh trigger, 390×844)
- Scenarios: C16 new; C01–C16 re-run on Codex (C07 ×5); C01/C03/C04 on Claude and Grok; repository gear-editor probe re-run
- Commands / environment delta: server rebuilt on the merged HEAD; web suite under `LANG=en_US.UTF-8`

#### Prior Failure Resolution

None — no prior failure was open (API-REV-002 Pass).

- Canonical artifacts updated: investigation (round 3 delta), execution report ("Round 3" section), ledger (Seq 46–54)
- Prior result and confidence: Pass, 95%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Observation: O-1 — a fresh New chat trigger shows the identifier for ~0.6–3 s until the runtime catalog loads (non-blocking)
- Recommended recipient: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Remaining risks: O-1; voice dictation not automatable; the D-14 marker has no timeout (approved); the Windows re-point fallback is unit-only

### API-REV-004 — Real desktop app validated through an isolated instance

- Trigger: user direction — validate the real desktop app as an isolated instance (`isolated-app start --build`), driven by the browser-automation CLI on control port 9333, then stop it.
- Scope: DT-00..DT-05 (isolation, landing, AC-018 labels, tag-send-reply with D-13, D-08 lock/terminate/save, restart persistence and resume). HEAD `3c062a180` (contains `origin/personal` `8778420fc`).
- Coverage changes: none to repository tests; evidence under `api-e2e-evidence/round4-desktop/` (screenshots, two MP4 recordings, instance JSON).

#### Prior Failure Resolution

None — no prior failure open.

- Result and confidence: Pass, 95% (user-surface/desktop category 93% → 95%)
- New failure IDs: none. New observations: O-2 (`/` skill list loads once per session), O-3 (runtime badge truncation with long labels at 1200 px).
- Recommended recipient: `/software_engineering_team/code_reviewer` (informational addendum to the round-3 pass)

### API-REV-005 — D-17 (R3) validated; prior UF-01/UF-02 resolved; new UF-04 (D-15 regression) and UF-03

- Trigger: `code_reviewer` CRR-009 Pass (IR-005 D-17, IR-006 CR-005 fix). HEAD `e9ede7d83`.
- Coverage changes: `chat-entry-live-probe.mjs` rewritten for D-17 and extended with C17 (frame + strip), C18 (draft ⚙), C19 (CR-005, ＋), C20 (UF-04 reproduction); C12 adds the narrow chat run view (VIS-027).
- Environment delta: real desktop app via `isolated-app start --build`, driven by the browser-automation CLI (port 9333, `__abDemo`), test data created on disk and imported through Settings → Agent Packages; stopped afterwards.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| UF-01 chat header full width / tools under it | Local Fix → pending R3 → D-17 | Resolved | C17 geometry Chat = Team; desktop DT-21 |
| UF-02 strip icon opens Activity | Local Fix → D-17 (shared owner, pre-existing) | Resolved | C17; desktop DT-25 |

- Current result and confidence: Fail, 93%
- New failure IDs: UF-04 (Medium, Unclear: Local Fix vs D-15 Design Impact), UF-03 (Low, Local Fix)
- Recommended recipient: `/software_engineering_team/code_reviewer` (failure-origin review)

### API-REV-006 — UF-04 and UF-03 resolved; D-19 and DEC-017a validated; new UF-05 (Low)

- Trigger: `code_reviewer` CRR-011 (IR-007 D-18, IR-008 D-19) and CRR-013 (IR-009, DEC-017a Agent Org skills). HEADs `10556948f` then `a65f58463`. Both are validated in this one revision because IR-009 arrived before the IR-008 result was reported.
- Coverage changes: added `autobyteus-server-ts/tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts` (9 cases). Updated `chat-entry-live-probe.mjs`: C05 D-18, C15 replaced for D-19, C20 V-F under D-19, new C21/C22/C23, `--owned-codex-home`, org fixture. Fixed stale `SkillService` stubs in five integration files (RD-01, 8 ticket-caused failures).
- Environment delta: owned `CODEX_HOME` holding skills only (no credential copied or linked). A merge-base worktree was used to classify baselines and then removed. Isolated desktop instance started from the fresh bundle after a DMG-only packaging failure (`hdiutil`). Test data created on disk and imported via the UI. Grok and AutoByteus runs were stopped by the user and not run.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| UF-04 configured agent with an unresolved configured skill fails next to a live DA chat | Unclear → CR-007 → D-19 | Resolved | C20 on Codex and Claude; desktop DT-51 (team replies next to the live DA chat, no collision in the log) |
| UF-03 live ⚙ shows "Not recorded" on a fresh default-thinking chat | Local Fix → CR-008 → D-18 | Resolved | C05 on Codex and Claude Sonnet (recorded = schema defaults); desktop DT-50 |

- Canonical artifacts: investigation "Round 6 Delta"; execution report "Round 6"; ledger Seq 78–94; `api-e2e-evidence/round6/`, `round6-desktop/`, `test-data/README-d19.md`
- Prior result and confidence: Fail, 93%
- Current result and confidence: Fail, 94%
- New failure IDs: UF-05 (Low, Local Fix: the tier-4 notice toast renders beneath the Manage Skill Sources overlay)
- Observations: O-4..O-7 (non-blocking); C-22 scan: no org agent `skills/` folders in the real repos
- Recommended recipient: `/software_engineering_team/code_reviewer`
- Remaining risks: Grok and AutoByteus not rerun this round; the desktop tier-4 toast is not reproducible without writing into the user's `~/.codex/skills` (covered in the browser)

### API-REV-007 — UF-05 resolved; full regression green

- Trigger: `code_reviewer` CRR-015 Pass (IR-010, CR-010: toast layer `z-[10000]`, `data-testid="toast-container"`, `ToastContainer.spec.ts`). HEAD `e58fb160a`.
- Coverage changes: `chat-entry-live-probe.mjs` — C22e asserts that the tier-4 notice is the topmost element above the open Sources dialog; C04 waits for the tagged link; `--cases` adds prerequisite producer cases.
- Environment: unchanged (sanitized env, owned roots, owned `CODEX_HOME` with skills only).

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| UF-05 tier-4 notice beneath the Sources dialog overlay | Local Fix → CR-010 | Resolved | C22e `toastOnTop: true` (z 10000 over 1000), `round7/probe-claude/C22e-tier4-toast.png` |

- Canonical artifacts: execution report "Round 7"; investigation "Round 7 Delta"; ledger Seq 95–98
- Prior result and confidence: Fail, 94%
- Current result and confidence: Pass, 95%
- New failure IDs: none
- Recommended recipient: `/software_engineering_team/code_reviewer` (proportional test-code review of the cumulative durable changes)
- Remaining risks: Grok and AutoByteus not rerun since the user stopped those runs; desktop not rebuilt for a one-value CSS change; O-1..O-7 non-blocking
