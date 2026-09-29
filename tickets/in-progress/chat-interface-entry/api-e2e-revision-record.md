# API/E2E Revision Record — chat-interface-entry

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` CRR-001 / round 1 | SR-003, SR-004, SR-007; ARCH-REV-003; IR-001; CRR-001 | N/A | Fail / 88% |
| API-REV-002 | code_reviewer / `code-review-report.md` CRR-003 / round 2 | SR-010; ARCH-REV-006; IR-002, IR-003; CRR-002, CRR-003 | Fail / 88% | Pass / 95% |
| API-REV-003 | code_reviewer / `code-review-report.md` CRR-005 / round 3 | SR-011, SR-012; ARCH-REV-008; IR-004; CRR-005; DR-002 (UVF-001) | Pass / 95% | Pass / 95% |
| API-REV-004 | user direction / real desktop app via isolated instance | same as API-REV-003; HEAD `3c062a180` | Pass / 95% | Pass / 95% |

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
