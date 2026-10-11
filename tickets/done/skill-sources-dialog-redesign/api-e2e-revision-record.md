# API/E2E Revision Record — skill-sources-dialog-redesign

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / `implementation-handoff.md` / round 1 | SR-002, SR-003; IR-001; ARCH-REV N/A; CRR N/A; DR N/A | N/A | Fail / 83% |
| API-REV-002 | implementation_engineer / `implementation-handoff.md` (IR-002, Rework) / round 2 | SR-003; IR-002; CRR-001 (CR-001); DR N/A | Fail / 83% | Pass / 95% |

## Revision Entries

### API-REV-001 — Round 1 baseline: rendering and flows pass; keyboard focus trap fails after confirmations/operations (F-001)

- Triggering role, report path, and round: `implementation_engineer`, `implementation-handoff.md` (IR-001), round 1, direct low-risk route.
- Triggering finding or case IDs: N/A (initial).
- Related revision IDs: SR-002 (baseline), SR-003 (text-only chips), IR-001; architecture/code review N/A (direct route); delivery N/A.
- Why this baseline was recorded: first completed API/E2E validation result.
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/skills/github-skill-runtime-harness.ts` updated as a baseline fix (commit `812a75c0a`, TESTING.md rule 9).
  - The harness drifted after `028cca231` (`ProviderPreparationGuard`, private `createBackend`, Codex `beginAcquire` lease), which caused 24 failures on the unchanged server. It now passes 220/220 with the assertions unchanged.
  - All web component/store/catalog specs remain `Still Valid`.
- Cases added, changed, removed, or rechecked:
  - Probe WEB-001..005, WEB-CHAT-A/B and WEB-INTERRUPT: 8/8 on the rerun. Attempt 1 had a WEB-CHAT-A flake in the unchanged chat picker (O-002).
  - Temporary browser journey J-01..J-13: J-10 and J-13 fail; the rest pass.
  - D-01 (Electron Browse…) deferred.
- Commands, environment, fixture, or broader-validation delta: see the investigation §Repository Coverage Execution Plan And Results and the report §Broader Validation. Browser runs used the implementation's `render-check-stack.mjs` (real backend/GraphQL/filesystem, controlled GitHub).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: all four API/E2E artifacts created; `api-e2e-evidence/` populated.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 83%
- New or remaining failure IDs: F-001. In real keyboard journeys focus is lost to `<body>`:
  - after a confirmation closes (Cancel or confirm);
  - after Enter-to-add, when the focused input is disabled during the operation.

  The next Tab leaves the popup (sidebar **Chat**), and Esc no longer closes it, because `handleKeydown` is bound to the panel. This violates REQ-008 and AC-007. Cases J-10 and J-13; evidence in `api-e2e-evidence/dialog-journey/result.json` (`trace`).
- Recommended owner: preliminary `Local Fix` → `implementation_engineer`. Per the handoff rules, the failure package goes to `/software_engineering_team/code_reviewer` for focused failure-origin review.
- Remaining risks, blocked evidence, or untested scope:
  - D-01: Browse… in a real Electron renderer, deferred to round 2.
  - The native OS picker: no computer-use tool; covered by AC-008 with Delivery.
  - O-001: `ConfirmationModal` has no focus move or Esc (shared, out of scope).
  - O-002: probe flake.

### API-REV-002 — Round 2: F-001 resolved; Electron Browse… (D-01) proven; Pass

- Triggering role, report path, and round: `implementation_engineer`, `implementation-handoff.md` (IR-002, Local Fix for CR-001), round 2. HEAD `a7d2fc85f`.
- Triggering finding or case IDs: F-001 / CR-001 (J-10, J-13).
- Related revision IDs: SR-003; IR-002; CRR-001 (failure-origin review, `Local Fix`, implementation; no source review required).
- Why this revision was recorded: rerun after rework.
- Coverage decisions or durable test paths changed:
  - API/E2E changed none.
  - `SkillSourcesModal.spec.ts` gained 7 focus-lifecycle tests (Implementation), closing the round-1 durable gap.
- Cases added, changed, removed, or rechecked:
  - J-10 and J-13 rechecked first, with the trap asserted.
  - J-14 added (fix edge paths).
  - J-01..J-09, J-11, J-12 rerun.
  - Probe rerun.
  - D-01a/b/c executed (deferred from round 1).
- Commands, environment, fixture, or broader-validation delta:
  - `pnpm --silent isolated-app start --build` (instance `iso-52227-7ac9`, stopped, data root removed).
  - `api-e2e-evidence/desktop-browse-check.mjs` added.
  - Evidence is in `api-e2e-evidence/round2/`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-001 / J-10: after Cancel, focus on body, Tab escaped to "Chat", Esc ignored | `Local Fix` (CRR-001 confirmed, implementation) | Resolved: focus returns to the trash trigger; Tab → "Copy path" (inside); Esc closes; focus → Sources. Also confirmed in Electron (D-01b) | `api-e2e-evidence/round2/dialog-journey/result.json` J-10 `trace`; `round2/desktop-check/result.json` |
| F-001 / J-13: focus lost after Enter-add and a keyboard remove | `Local Fix` | Resolved: focus = add input in both; Tab stays inside; Esc closes | J-13 `trace` |
| O-002: probe WEB-CHAT-A flake | Probe flake (not this change) | Not reproduced (8/8 on the first attempt) | `round2/github-skill-sources-probe/result.json` |

- Canonical artifacts and sections updated:
  - investigation: §Round 2 Update, meta and decision;
  - report: rewritten to round 2;
  - ledger: events 21–24;
  - this record.
- Prior result and confidence: `Fail`, 83%
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: none
- Recommended owner: N/A. Next: `/software_engineering_team/delivery_engineer`.
- Remaining risks, blocked evidence, or untested scope:
  - The native OS picker answer (choosing a folder fills the input) is left to AC-008, because there is no OS-level tool.
  - O-001: `ConfirmationModal` has no focus move or Esc (shared, out of scope).
