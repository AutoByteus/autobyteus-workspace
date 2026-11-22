# API/E2E Execution Coverage Report — autobyteus-585 (`restart-notice-continue`)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md` (API-REV-001); progress `api-e2e-test-progress.md`.
- Trigger: IR-001, direct route (Small / Low). Tested at `e9ae5ad3c7` (code `75e085d889`). First round.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue/tickets/in-progress/restart-notice-continue/evidence/api-e2e/` (the implementer's in `evidence/impl/`).
- Stale tests this change made untrue:
  - MSP-75, MSP-76 and MSP-77 found notice cards by text containing the `[Platform notice — …]` header line, which this change removes on purpose. MSP-76/77 failed while the rows were correct (screenshot).
  - I rewrote their lookup to the row's label (`aria-label`, the new contract, as MSP-99 uses), in `autobyteus-web/tests/e2e/mobile-restored-run-cases.mjs`. All three pass.
- `TESTING.md` exists (superrepo), and its phone and probe commands worked as written.

## Routing Classification

- Task size: `Small`. Architectural risk: `Low`. Input route: `Direct`.
- Test-code review: `Not Required — direct low-risk route`.

## Cases

| Case | Criteria | Surface | Command | Result | Evidence | Look For |
| --- | --- | --- | --- | --- | --- | --- |
| V-01 | regression | web typecheck and guards | `typecheck`, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass | `web-tc.log`, `guard-*.log`, `audit-loc.log`, `static.txt` | `86 in 36 files (baseline 86 in 36 files)`, `PASS`; all exit 0 |
| V-02 | AC-001..AC-004, AC-006, AC-007 (spec level) | full web unit suite | `pnpm -C autobyteus-web test:nuxt run` | Pass | `web-unit.txt` | `Test Files  793 passed (793)`, `Tests  5994 passed` |
| V-03 | AC-005 desktop, AC-001, AC-007 | `pnpm -C autobyteus-web test:e2e:notice-row-presentation` | real feed in Chrome, 1280×900, Europe/Berlin | Pass | `desktop/` (`desktop-notice-row.png`, `evidence.json`) | rows: user, agent (text and tool card), notice, agent (reply). The notice has an icon, no agent avatar, label "Application restarted" (also its aria-label, role note), body without the header, the time "08:32 CET", no panel or border, not monospace. The usage line once, under the last row |
| V-04 | AC-005 phone, REQ-004, AC-003 (live and after a reload), a Team and an Org member | production phone bundle, own node delta, native runs, real restarts | `mobile-shell-probe.mjs --cases=MSP-75,MSP-76,MSP-77,MSP-99` | Pass | `phone-msp75-99/` | MSP-99 Pass (`MSP-99-wake-notice-live.png`: agent row, notice row "Background tasks finished", agent row with avatar and name again). MSP-75: 1, then 2, then 2 "Application restarted" rows after a reload, every input and reply once. MSP-76 (Team coordinator) and MSP-77 (Org member): one notice row live and after a reload, the coordinator's or member's rows around it |
| V-05 | regression | the whole phone suite, once | `node tests/e2e/mobile-shell-probe.mjs` | Pass for this change | `phone-full/results.log`, `case-results.json` | 91 cases Pass. MSP-44 and MSP-45 (heading links in the file viewer and the Skills page) fail with a `scrollIntoViewIfNeeded` timeout, alone too, and identically on base `0da6bfbfc1` (temporary worktree, removed). This change touches neither. Recorded as FU-001 |
| V-06 | regression | `test:e2e:background-contention` (its fixture changed) | probe | Pass | `bg/` | BG-BROWSER-000..007 Pass, failures `[]` |
| V-07 | REQ-002 zh-CN; dark mode | the desktop probe, run from a temporary copy with locale zh-CN (the app's stored language preference) and a dark color scheme, then removed | probe variant | Pass (zh-CN); dark mode pre-existing | `desktop-zh-dark/`, `desktop-base-dark/` | zh-CN: label 应用已重启 (aria-label too), time "2026年11月21日 GMT+1 08:32", no header. Dark mode: the app's page stays light, but the notice body follows the system's dark mode to slate-300, 1.48:1 against white (light mode 7.58:1). On base the old notice text is near white (slate-100) in dark mode, so this is pre-existing and slightly better now. FU-002 |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | Notes |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | V-02, V-03 | Proven | — |
| AC-002 | Yes | V-02 (builder spec) | Proven | — |
| AC-003 | Yes | V-02, V-04 (live and after a reload on the phone, with real frames and hydration) | Proven | — |
| AC-004 | No | V-02, V-07 (zh-CN label) | Proven | — |
| AC-005 | Yes | V-03 (desktop), V-04 (phone, including the agent's name again after the notice) | Proven | — |
| AC-006 | No | V-02, V-04 (the stale lookups rewritten), V-05, V-06 | Proven | — |
| AC-007 | No | V-02, V-03 | Proven | — |

- A Team's and an Org member's conversation were proven live on the phone (MSP-76, MSP-77). The desktop Team and Org views render through the same `AgentEventMonitor` and `AgentConversationFeed` that V-03 exercises; no separate desktop run.

## Validation Confidence Scorecard (Mandatory)

| Category | Final | Supports | Residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 96% | every AC on the real surfaces | — |
| Changed-boundary directness | 95% | the real feed on desktop; the production phone bundle with real restarts and wake notices | the desktop probe draws a fixture conversation (live delivery is proven on the phone) |
| Integration realism | 94% | real node restarts and real background tasks on the phone | the desktop Team and Org views via shared components |
| Environment fidelity | 93% | Chrome headless, light and dark, en and zh-CN, phone viewport | the real desktop app not opened |
| Durable regression coverage | 96% | desktop probe, MSP-75..77 and MSP-99, the unit specs | — |

- Overall: 95%. Every critical AC is directly proven, and no category is below 90%.

## Broader Validation Decision (Mandatory)

- `Required`, executed: the whole phone suite, the desktop probe and its zh-CN and dark variants, and base comparisons for the two observed problems.

## Durable Coverage Changed In The Codebase

| Path | Change | By |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-restored-run-cases.mjs` | MSP-75..77 find a notice row by its label (`aria-label`) instead of the removed header text | me (made untrue by this ticket) |
| the specs listed in the implementation handoff, `notice-row-presentation-probe.mjs` and its fixture, MSP-99 | new or updated | the implementer |

## Temporary Methods And Cleanup

- The zh-CN and dark copy of the probe: removed.
- The base worktree `api585-base-0da6bfbfc1` (and the probe copy placed in it): removed.
- Probe servers and browsers: stopped by the probes.

## Latest Authoritative Result

- Result: `Pass`.
- Criteria not proven, user-only, or accepted as unverified risk: `None`.
- Evidence decisions requested: `None`.
- Next recipient: delivery engineer.
- Notes:
  - Follow-ups in `follow-ups.md`: FU-001 (MSP-44/45 fail on base too) and FU-002 (conversation text pale in the system's dark mode on a light app, pre-existing).
