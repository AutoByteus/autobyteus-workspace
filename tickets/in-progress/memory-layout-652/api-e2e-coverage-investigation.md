# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/memory-layout-652/requirements-doc.md` (REQ-001…008, AC-001…007, DEC-001…004)
- Investigation Notes: `tickets/in-progress/memory-layout-652/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/memory-layout-652/solution-revision-record.md` (SR-001)
- Design Spec: `tickets/in-progress/memory-layout-652/design-spec.md` (D-1…D-13)
- Supplemental Task Artifacts: the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/memory-layout-balance-608/ui-ux-spec.md` with VIS-001…017 (`visual-references/`)
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/memory-layout-652/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/memory-layout-652/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `tickets/in-progress/memory-layout-652/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete IR-001, Medium / Low direct route, commit `7bf21db56e` (base `9f803aa84d`)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- The approved autobyteus-608 Memory layout on `/memory`: one header row on owner and run pages (Back naming its destination, the name, filter, switch), Browse/Search/Index only on top-level pages, no redundant IDs and labels (tooltips, sr-only), the reader and Work Journal filling the window, proportional reader type, a 280/300 px list, "Copy folder path", the first root document opening on arrival, one picker style, "Show [N]", "1 record", and the run title from the run's summary (else run ID · workspace in mono).
- Shared file list: an icon for every file kind (`.md` document outline; vscode-icons for `.js/.ts/.vue/.html/.css/.json`); read-only tabs up to 320 px with the name as tooltip; editable tabs stay 150 px.
- Strings localized (en, zh-CN). Preserved: routes, Back destinations, filters, paging, states, imported badges, search focus, keyboard reachability.
- Persisted data: not affected (client-only `runLabel` on the address).

## Supported Scenarios And Real Usage

- Designer journeys UXJ-001…006 (spec). Real triggers: the Memory page's tabs, cards, chips, Back, the reader's list, Copy, the run page's switch and pickers.
- Added from the handoff and the design: an org page and an org member's run title (REQ-005 names org runs); an imported source (a second node syncing into this node's hub: the amber badge in the new header rows, Semantic's not-synced note); a short window (1280×720) and a long document; search → a result's run → Back "Search results" with the mono fallback title; keyboard focus order (Back → filter → switch → content); the Files panel and Skills page for the shared icons and tab width.
- Unsupported/contrived: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Header rows, top-level bar (D-1…D-6) | Changed | design, VIS-001…017 | rendered comparison at three viewports; probe checks |
| Reader fill, typography, list, Copy, auto-open (D-8) | Changed | DC-004, DC-005, TR-004, TR-008 | probe measurements (durable SMV-110…119); rendered |
| Work Journal / Raw Traces pickers (D-9, D-10) | Changed | DC-008, DC-009 | web specs; rendered with 1 and 3 files |
| Run title (D-7) | Changed | REQ-005, DEC-002 | web specs; rendered: episode, team member, org member, search result |
| Non-embedded run list mode | Removed | D-5 | specs updated by implementation |
| File icons, tab width (D-11, D-12) | Changed | DC-010, DC-011, DEC-003 | probe (reader), rendered Files panel and Skills page |
| Routes, Back, filters, paging, states | Preserved | Scope Guardrail | probe; rendered journeys |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | | | | |
| API / transport / contract | No | `runLabel` is client-only | | | |
| Frontend component / state | Yes | memory components, FileItem, FileExplorerTabs, `pages/memory.vue` | specs (IMP-001) | rendered geometry, real data | browser |
| Browser integration / user journey | Yes | every `/memory` view | semantic-memory probe | layout values, journeys with real runs | browser against a real node |
| Authentication / session | No | | | | |
| Desktop renderer / web-equivalent UI | Yes | same | | | `nuxt dev` window |
| Desktop shell | No | no shell or build input change | | | none (rule 12 not triggered) |
| Process / lifecycle, persisted data, workers | No | | | | |
| External integration | No (memory sync used only as a data source for the imported view) | | | | |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-layout-652`, branch `codex/memory-layout-652`, commit `7bf21db56e`.
- Testing guideline: `TESTING.md` (root).
- Changed build-input paths: none (`git diff --name-only 9f803aa84d 7bf21db56e` touches no manifest, lockfile, config or workflow; the icon bundle is a committed asset, unchanged).
- Secrets: none.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `AGENTS.md`, `TESTING.md` | rules | `env -i`; own stacks; one heavy run at a time; never the user's app or data |
| `TESTING.md` § Browser probes | probes | probe-owned backend + `nuxt dev`, `AUTOBYTEUS_ALLOWED_ORIGINS`, owner credential through `probe-node-access.mjs` |
| `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` header | durable probe | `pnpm -C autobyteus-server-ts build`; `node … --browser-executable <chrome> --output-dir <dir>` |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness Check | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Semantic-memory probe | worktree | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir /tmp/api652/results/smv` | its own data root and servers | its checks | its own cleanup |
| Render stack (temporary) | `/tmp/api652/scripts/stack.mjs` | `node stack.mjs <worktree> <out>` | copied from IMP-003's stack and extended: an org and its run, a long document, a second node syncing into this node's hub | `stack.json` `ok: true` | `touch <out>/stop` (removes its root) |

| Data / Fixture Need | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| Agents, a team (one shared member), an org, semantic folders (nested, long names, a long document), Global | files in a probe-owned data root; definitions through GraphQL | invented data | root removed |
| Runs with 1 and 3 journal/raw-trace files; a team run; an org run | the real runtime with the scripted AGY CLI; archived segments written; the memory index | | |
| Imported source | a second server (beta) with its own memory, `updateMemorySyncSourceConfig` + `startMemorySync` into this node's hub | | |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` (mine, 554) | Memory page by owner, semantic folder view | AC-006, REQ-001…003 | Needs Update (done by implementation, reviewed) | SMV-021/062 Back text, SMV-030/101 the path as Copy's tooltip, SMV-033 auto-open, SMV-065, SMV-070/071 | Keep the implementation's updates (they follow DC-002, DC-003, DC-004, TR-004); add SMV-110…119 for the layout values |
| Memory component specs (`components/memory/__tests__/*`), `FileItem`, `FileExplorerTabs`, `pages/memory` specs | markup and behavior | AC-002…007 | Still Valid (updated by implementation, red → green) | IMP-001 | rerun in the whole web suite |
| `test:e2e:team-group-icon` | team icon fixture page | none of the ACs (fixture page edited) | Still Valid | IMP-002 | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-001 | AC-002…007 | whole web suite | Existing Test | `pnpm test:nuxt` (from `autobyteus-web`, `env -i`) | IMP-002 ran before the "1 run" edit; rerun on HEAD |
| API-002R | AC-007 | guards, localization audit, typechecks, icon bundle check | Reused | IMP-002 | no source change since `37c047cb59` except the probe file and docs |
| API-003 | AC-001, 002, 005, 006 | semantic-memory probe (updated + SMV-110…119) | Durable | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir /tmp/api652/results/smv` | real server, real page |
| API-010 | AC-001 (side by side), AC-002, AC-003, AC-004, AC-006 | rendered views at 1440×900, 1280×800, 390×844 and 1280×720 | Temporary Probe | my stack + my view checks; screenshots compared with VIS-001…017 | the comparison is visual and per viewport; durable value checks are in API-003 |
| API-011 | AC-004, REQ-005 | run titles: episode, team member, org member, search result | Temporary Probe | the same stack | the org and search paths are not in the implementation's evidence |
| API-012 | AC-006 | imported source: badges in the header rows, Semantic not synced | Temporary Probe | the same stack (beta synced) | |
| API-013 | AC-006 (keyboard) | focus order Back → filter → switch → content; Enter on Show, Go to line | Temporary Probe | the same stack | |
| API-014 | AC-005 | Files panel (a run's Files tab) and Skills page: icons for `.md .ts .js .vue .html .css .json`; Files panel tabs 150 px | Temporary Probe | the same stack (the run workspace holds those files) | |

- Test progress log: Yes.

## Durable Coverage To Add / Update

| Case ID | Path | Change |
| --- | --- | --- |
| API-003 | `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` | add SMV-110…119 (AC-001 tops, AC-002 fill and type, DC-004 list width, AC-005 icons and the 40-character read-only tab, TR-008 Copy on the clipboard); fixture: an h2 in the first document and `sites/deployment-checklist-and-rollback-pla.md` |

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| A phone-app Memory page | none exists (DEC-001) | none | No | none |
| Packaged desktop | no build input or shell change | low | No | none |

## Ambiguities Or Reroute Triggers

None at investigation.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated: `Yes` (the semantic-memory probe)
- Reroute Required: `No`
