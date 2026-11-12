# API/E2E Coverage Investigation — autobyteus-480

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001; unchanged at SR-002)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-002); `handoff-sr-002.md`
- Supplemental Task Artifacts: `follow-ups.md` (FU-001)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (not selected)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (Small / Low, direct API/E2E)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-heading-links-480`, branch `codex/markdown-heading-links-480`, base `origin/personal` `931a1feeb6`; code `45e456b8b0`, documents `0afe5ee975`.

## Current Requirement And Design Basis

- REQ-001 / AC-001: GitHub-compatible heading anchors (`user-content-<slug>`, duplicates numbered per document).
- REQ-002 / AC-002, AC-003: a `#anchor` click (or keyboard activation) scrolls that heading of the same rendered document into view, with no route or URL change. A missing anchor does nothing.
- REQ-003 / AC-004: a link with no scheme (`other.md`, `other.md#x`, `/x.md`) does nothing.
- REQ-004 / AC-005: external `http(s)`, file-action and other-scheme (`mailto:`) links are unchanged.
- Design: one renderer for every surface (`MarkdownRenderer` / `useMarkdownSegments`). Step 4 assigns validation of the phone bundle viewer, the desktop Files panel and the Skills page. The design's risk: a surface whose scroll container `scrollIntoView` cannot reach.
- In-design decision to prove: the anchor and no-scheme rules run before the external rule, because on an http-served page (the phone bundle, a browser window) the external rule would otherwise open `#x` and `other.md` in a new tab.

## Supported Scenarios And Real Usage

- SCN-001: a user reads a document with a Contents list and clicks an entry: a skill reference in the Skills page, a workspace file in the Files panel, the same file in the phone viewer, or an agent's answer in a conversation.
- SCN-002: a user clicks a link to another file, or an anchor no heading has.
- Real-use variants added:
  - the conversation case is a delegator's Markdown message to its task agent (a handoff with a Contents list), rendered by `InterAgentMessageSegment`. The probe's scripted runtime quotes its own answers (`linked_skills` case), and a task's description shows as a plain-text notice, so the Markdown messages are `send_message_to` messages;
  - two answers with the same headings on one screen (an agent repeating a structure);
  - keyboard Enter on a focused Contents entry;
  - an external `https:` link and a `mailto:` link in an answer.
- User messages render as plain text, not Markdown (`UserMessage.vue`), so they are not a surface.
- Contrived (not tested): none.

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Repository Evidence | Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Frontend component | Yes | `useMarkdownSegments` heading ids; `MarkdownRenderer.handleLinkClick` | IMP-01 (jsdom: slug table, ids, scroll call on the right root, prevented defaults, external/mailto/file action) | real layout and scroll containers; real browser default navigation, popups, routing; the phone bundle; Skills layout | browser (phone probe + desktop window) |
| Browser journey | Yes | phone viewer, Files panel, Skills page, conversation (desktop and phone) | IMP-04 (desktop Files panel, temporary probe) | phone, Skills, conversation; durable coverage | `test:e2e:mobile-shell` cases |
| Backend, persistence, shell, Android | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root). "Renderer UI … that also runs in a browser → web unit tests + a browser probe"; phone behavior is proven by a `test:e2e:mobile-shell` case (the probe owns its nodes, desktop window and phones).
- Rerun by impact: `MarkdownRenderer` renders every agent answer and file preview, so every phone-probe case exercises it → the whole probe is marked **Rerun** (API-03).
- Changed build-input paths: none (`git diff --name-only 931a1feeb6...HEAD`: web source, specs, a fixture, ticket files) → no fresh-start build.
- Builds: server `dist` (built by the implementation from `45e456b8b0`); the phone bundle must be built (`build:mobile-web`) → API-02.
- Next free probe case ID: MSP-44 (MSP-43 is autobyteus-472's).

| Data | Method | Cleanup |
| --- | --- | --- |
| alpha's workspace: `headings-480/design-principles.md` (the implementation's fixture copy, 26 Contents entries) and `headings-480/links.md` (a broken anchor, `other.md`, `other.md#x`, `/x.md`, `./x.md`) | written by the case; opened from file-action links in a run's message | probe root |
| alpha: a skill `heading-links-480` with `references/design-principles.md` and `references/links.md` | `createSkill`, `uploadSkillFile` (public GraphQL) | probe root (alpha's data dir) |
| alpha: a PTM run delegates a plain task to `/release_notes_writer`, then sends it two Markdown messages with the same Contents and headings, plus a broken anchor, a relative link, an external `https:` link and a `mailto:` link | `agentCall` (`delegate_task`, `send_message_to`) | probe root |
| a phone on alpha: own headless Chrome mapping 192.168.77.70 → 127.0.0.1, paired through Phone Access | public REST | closed |
| the external link's address | answered by a stub route in each browser context (no outside request) | context closed |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| `utils/__tests__/markdownHeadingAnchors.spec.ts` (new) | AC-001 slug table, fixture Contents | Still Valid | Reuse (IMP-01) |
| `components/conversation/segments/renderer/__tests__/MarkdownRenderer.headingLinks.spec.ts` (new), `MarkdownRenderer.spec.ts` (one assertion) | AC-002…005 in jsdom | Still Valid | Reuse (IMP-01) |
| web full suite | AC-005 regression | Still Valid | Reuse (IMP-03) |
| `mobile-shell-probe.mjs` (all cases) | phone regression; file-action opens (MSP-28…31, MSP-39…42) | Still Valid | Run (API-03) |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003…005 (unit), AC-002 (unit part); typecheck; full web suite | jsdom | Reused | IMP-01, IMP-02, IMP-03 on `45e456b8b0` (the commit validated; nothing changed since but documents) | — |
| API-02 | — | builds | Build | `pnpm -C autobyteus-web build:mobile-web`; server `dist` checked current | the phone serves the bundle |
| MSP-44 | AC-002, AC-004, AC-005 (file action) | the desktop Files panel and the phone viewer, `headings-480/design-principles.md` | Durable | open from the run's file-action links on both surfaces; click every Contents entry (scroll reset first): the heading comes to the viewer's top, in view, URL unchanged, no popup; then `links.md`'s broken anchor and four relative links: nothing changes, no popup, no 404 | design step 4; scroll containers per surface |
| MSP-45 | AC-002, AC-004 | the Skills page (desktop window), skill reference file | Durable | Skills → the skill → `references/design-principles.md`: every Contents entry; then `references/links.md` | design step 4; the Skills layout's scroll container |
| MSP-46 | AC-003, AC-004, AC-005 | the task agent's conversation, desktop window and phone | Durable | a delegator's two Markdown messages (`send_message_to`) with the same Contents and headings: an entry in the second message scrolls to its own heading, the first message's stays out of view; keyboard Enter on an entry (desktop); a broken anchor and a relative link do nothing; an external `https:` link opens outside (a new tab with that address); `mailto:` is not prevented by the renderer (as today) | AC-003 in a real conversation; preserved links |
| API-03 | AC-005, regression | full phone probe (incl. MSP-44…46) | Existing + Durable | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-03-mobile-shell-probe` | rerun by impact |
| API-04 | AC-002 (the cases' power) | MSP-45 against the base renderer | Temporary Probe | base `MarkdownRenderer.vue` and `useMarkdownSegments.ts` swapped in for `nuxt dev`, `--cases=MSP-45`, restored | the durable cases must fail without the change |

- Test progress log: `Yes`

## Durable Coverage To Add / Update

| Case | Path | Why |
| --- | --- | --- |
| MSP-44…46 | `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` (new), called from `mobile-shell-probe.mjs` | TESTING.md: phone behavior by a mobile-shell case; durable form of the desktop journeys |
| — | `mobile-shell-probe.mjs` | header lines, import, call, runtime note |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | User-only? | Follow-up |
| --- | --- | --- | --- |
| Opening another file from a relative link | out of scope (DEC-001) | No | FU-001 |
| Packaged Electron window | renderer only, no shell change; `openExternalLink` uses the desktop app's handler there (unchanged code) | No | — |
| The skill preview on the phone | the phone bundle has no Skills page | — | — |

## Ambiguities Or Reroute Triggers

None at planning.

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; reroute: `No`.
