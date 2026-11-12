# API/E2E Execution Coverage Report — markdown-heading-links-480 (autobyteus-480): Contents links scroll within the rendered document

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1. Implementation Engineer IR-001 (SR-002), code `45e456b8b0`, documents `0afe5ee975`.
- Prior round reviewed: none (first round).
- Deviations from the plan, and why:
  - MSP-46's Markdown messages come from a delegator (`send_message_to`), not from a scripted answer. The probe's nodes run the scripted CLI in its `linked_skills` case, whose answers are "OK" or JSON-quoted, and changing that shared fixture would be a foundation change under TESTING.md's rerun-by-impact rule.
  - A task's description shows as a plain-text task notice, so both Markdown messages are `send_message_to` messages after a plain `delegate_task`. It is a real surface: agents send each other Markdown handoffs with Contents lists. `InterAgentMessageSegment` renders them through `MarkdownRenderer`.
  - API-04 added: MSP-45 run against the base renderer, to show that the durable cases catch the defect.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480/tickets/in-progress/markdown-heading-links-480/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct` (implementation → API/E2E)
- Successful-output route: Delivery Engineer
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `45e456b8b0`; tests `524e4f9be7` (the run's files, committed unchanged: `git diff 524e4f9be7 -- autobyteus-web/tests/e2e` empty) | macOS 26 arm64, Node 22 | server `dist` from `45e456b8b0` (built by the implementation; newer than any server source change); phone bundle `build:mobile-web` from `0afe5ee975` (API-02) | probe-owned nodes with temp data roots; scripted AGY CLI (`linked_skills`); clean env |
| ENV-2 | as ENV-1 | macOS, headless Chrome | desktop window: `nuxt dev` against alpha (1440×1000); phone: Chrome 390×844, mobile, mapping `192.168.77.70` → 127.0.0.1, paired through Phone Access | the external address is answered by a stub route in each context (nothing leaves the machine) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001; AC-003…005 and AC-002 (unit part); typecheck; regression | jsdom, repository | Reused: IMP-01 (`vitest run components/conversation/segments/renderer/__tests__/ utils/__tests__/markdownHeadingAnchors.spec.ts`, red on base first), IMP-02 (typecheck, guards), IMP-03 (full web suite) | `45e456b8b0` | Pass | `evidence/IMP-01-renderer-heading-link-specs.log`, `IMP-02-typecheck-guards.log`, `IMP-03-web-unit-full.excerpt.log` | `## RED Tests 11 failed \| 2 passed`; `## GREEN Tests 64 passed`; `test-file errors: 93 in 40 files (baseline 93 in 40 files)`; `Test Files 759 passed` | ran on the commit validated; only documents changed since |
| API-02 | — | phone bundle | `pnpm -C autobyteus-web build:mobile-web` | ENV-1 | Pass | `evidence/API-02-builds.log` | `mobile-web build exit 0`; `user-content-` in the bundle | server `dist` 2026-11-12 06:00, newer than the last server source change |
| MSP-44 | AC-002, AC-004, AC-005 (file action) | desktop Files panel and phone viewer: `FileViewer` → `MarkdownPreviewer` → `MarkdownRenderer` | open `headings-480/design-principles.md` from the run's file-action links on both surfaces; for each of the 25 distinct anchors (26 links), scroll to the top, then click/tap its Contents entry; then `links.md`: `#no-such-heading-480`, `other.md`, `other.md#x`, `/x.md`, `./x.md` | ENV-1, ENV-2 | Pass | `API-03-mobile-shell-probe/mobile-shell-probe.json` (`cases.MSP-44`), `MSP-44-desktop-after-contents.png`, `MSP-44-phone-after-contents.png`, `MSP-44-phone-links.png` | desktop and phone `{"entries":25,"reached":25,"urlUnchanged":25,"newTabs":0}`, each heading at `offsetFromContainerTop: 0` of the viewer's scroll container; every `nothing` entry `urlUnchanged`, `newTabs 0`, `stillShown`, no 404, `scrollUnchanged` | the file-action links that open the files are the preserved file-action rule |
| MSP-45 | AC-002, AC-004 | Skills page (desktop): `SkillDetail` → `FileExplorerTabs` | `createSkill` + `uploadSkillFile` (public GraphQL); Skills → View → `references/design-principles.md`, every entry; then `references/links.md` | ENV-1, ENV-2 | Pass | same (`MSP-45`), `MSP-45-skills-after-contents.png` | `{"entries":25,"reached":25,"urlUnchanged":25,"newTabs":0}` at `/skills`; the five links change nothing | the design's scroll-container risk: reached in the Skills layout too |
| MSP-46 | AC-003, AC-004, AC-005 | task agent's conversation, desktop and phone: `InterAgentMessageSegment` → `MarkdownRenderer` | a PTM run delegates a plain task to `/release_notes_writer`, then sends two Markdown messages (`HEADINGS-480-ONE`, `-TWO`) with the same Contents and headings; on each surface click `#notes-480` in TWO, `#setup-480` in ONE, `#setup-480` in TWO; desktop: Enter on a focused entry; then a broken anchor and `other.md`; the external `https:` link; a `mailto:` link | ENV-1, ENV-2 | Pass | same (`MSP-46`), `MSP-46-desktop-conversation.png`, `MSP-46-phone-conversation.png` | each click: its own message's heading at offset 0, `otherInWindow: false` (the other message's same heading out of view), URL unchanged, on both surfaces; desktop Enter: offset 0; external: 1 new tab at `https://example.com/heading-links-480`, page URL unchanged; `mailto`: `preventedByRenderer: [false]` | the renderer roots are scoped per message (QR-001 ids repeat across messages by design) |
| API-04 | AC-002 (cases' power) | MSP-45 on the base renderer | base `MarkdownRenderer.vue` and `useMarkdownSegments.ts` (`931a1feeb6`) swapped in for `nuxt dev`, `--cases=MSP-45`, files restored | ENV-1, ENV-2 | Fail, as expected | `evidence/API-04-red-on-base/` (`run.log`, `mobile-shell-probe.json`, screenshot) | `{"entries":25,"reached":0,"urlUnchanged":25,"newTabs":25}`: no heading has the id, and each click opened a new tab | confirms the implementation's rule-order decision: on an http-served page the base's external rule opened `#anchor` in a new tab |
| API-03 | AC-005, regression (rerun by impact: every case renders through the changed renderer) | full phone probe, 46 cases | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-03-mobile-shell-probe` | ENV-1, ENV-2 | Pass | `API-03-mobile-shell-probe/` (`mobile-shell-probe.json`, `run.log`, logs, screenshots) | `mobile-shell probe: Pass`; 46 of 46 `Pass`; `unknownBrowserErrors: 0`; cleanup `serversLeft 0`, `rootRemoved true` | includes 450's MSP-28…31 and 452's MSP-39…42 (file-action opens) |
| C-W | Windows/Linux desktop | — | — | — | Not Tested | — | — | macOS host only; no platform-specific code |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (unit table, fixture Contents), MSP-44/45 (each of the 25 anchors matches exactly one rendered heading: `headings: 1`) | Proven | — |
| AC-002 | Yes | MSP-44 (Files panel, phone viewer), MSP-45 (Skills page), API-01; API-04 shows the cases fail without the change | Proven: 25 of 25 at the viewer's top on all three surfaces, URL unchanged, no new tab | — |
| AC-003 | Yes | MSP-46 (desktop and phone), API-01 | Proven in a real conversation with two messages with the same headings | — |
| AC-004 | Yes | MSP-44, MSP-45, MSP-46, API-01 | Proven: broken anchor, `other.md`, `other.md#x`, `/x.md`, `./x.md` change nothing on every surface | — |
| AC-005 | Yes | MSP-46 (external, `mailto:`), MSP-44 and API-03 (file-action links), API-01, API-03 (regression) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | every AC on real surfaces (four), plus the unit table | Windows/Linux not run | — |
| Changed-boundary execution directness | 80% | 97% | real clicks and taps through the real renderer in the real bundle and window; real scroll containers measured | — | — |
| Cross-boundary integration realism and mock gap | 80% | 96% | real node, real delegation and inter-agent messages, real phone pairing | the external page is a stub (no outside request) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 94% | probe-owned nodes, real Phone Access, the design-principles fixture | scripted runtime; headless Chrome as the phone | a device run |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | broken anchor, four scheme-less forms, keyboard, same headings in two messages, the base's failure | the packaged app's external handler (`electronAPI.openExternalLink`, unchanged code) | — |
| User-surface, browser, and desktop-shell confidence | 75% | 96% | desktop window and phone bundle: Files panel, phone viewer, Skills page, conversations | packaged Electron window not run (no shell change) | — |
| Durable regression coverage quality and relevance | 85% | 96% | MSP-44…46 in the phone probe; red on the base (API-04) | — | — |

- Overall post-repository confidence: 82%
- Overall final confidence: 96% (95.9%, simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target met: `Yes`
- Confidence-limiting residual risks: Windows/Linux not run; the packaged window's external-link handler is unchanged and not exercised here

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (the phone probe's desktop window and phone on probe-owned nodes)
- Gap it addressed: real scroll containers per surface (the design's named risk), real browser defaults (routing, new tabs), the phone bundle, and AC-003 in a real conversation, which the implementation could not render

## Desktop Application Validation

- Surface: a `nuxt dev` window against a probe-owned node. The packaged app was not run: the change is renderer-only, and the Electron path differs only in `openExternalLink`'s desktop handler, whose code is unchanged.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No` (no unprefixed ids).

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` | Added (`524e4f9be7`) | MSP-44, MSP-45, MSP-46 | test data only; fixture read from `utils/__tests__/fixtures/design-principles.md` |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (`524e4f9be7`): header, import, call, runtime note | — | — |

- Added or updated paths attached for proportional test-code review: `No` (direct low-risk route; listed here for delivery)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference | scripted AGY CLI (`linked_skills`; `CALL_TOOL` for the delegator's messages) | real agents and messages without a paid model | transport only |
| The external website | a stub route for `https://example.com/heading-links-480*` in each context | no outside request | the tab's opening is real, the page is not |
| A phone | headless Chrome 390×844, mobile, its own host mapping | no device here | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks (API-03, API-04, debug runs) | Yes | the probe's own cleanup | `serversLeft 0`, `rootRemoved true` |
| API-04's base production files | Yes | restored from `/tmp` copies right after the run | `git status` clean for both files |
| The debug view dump in MSP-46 | Yes | removed before the commit | not committed |
| Debug output in `/tmp/api480-*` | Yes | left in `/tmp` | not evidence |
| Evidence secret scan | — | `own_`/`mra_` 30+ chars, `access_token=` values | no match |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none; Windows/Linux not run
- Next recipient: Delivery Engineer (direct route, Small/Low)
- Notes: follow-ups unchanged (FU-001: opening other files from relative links).
