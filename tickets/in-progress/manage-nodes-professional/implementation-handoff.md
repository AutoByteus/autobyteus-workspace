# Implementation Handoff — manage-nodes-professional (autobyteus-363)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route. The Solution Designer classified the completed design `Medium` / `Low` (SR-002), so there was no independent architecture review ([handoff-implementation.md](handoff-implementation.md)). Next recipient: from `get_handoff_rules` at handoff time.
- Requirements doc: [requirements-doc.md](requirements-doc.md) (Approved, SR-002)
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Solution revision record: [solution-revision-record.md](solution-revision-record.md)
- Design spec: [design-spec.md](design-spec.md) (Architecture Design Complete, SR-002)
- Supplemental task artifacts:
  - The Product Team's approved package: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/manage-nodes-professional/ui-ux-spec.md` with `visual-references/` VIS-001…037 (design repo `personal` @ `88e0e322`).
  - The reference diff: `git -C /Users/normy/autobyteus_org/autobyteus-web-design diff 8a71c842 88e0e322 -- components/`.
  - [follow-ups.md](follow-ups.md) (FU-001, not this ticket).
- Design review report: `N/A — not applicable` (independent architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: [implementation-revision-record.md](implementation-revision-record.md)
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review, code-review, API/E2E, delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Branch `codex/manage-nodes-professional`, base `origin/personal` @ `3b9dc912a1`. Commits:
  1. `1827e6f2bd` **baseline fix**, test only: the main probe's NP-12 allow-list gains `/rest/node-update` (see Known Risks / Environment).
  2. `523bd0454b` the implementation: components, specs, both probes, `docs/settings.md`.
  3. `d5f670021b` a test type fix in `NodeRow.spec.ts`, and `typecheck-baseline.json` dropping the removed Disclosure spec's entry.
  4. The ticket-documents and evidence commit (this file); its hash is in the handoff message.
- What the code does now: the Manage Nodes tab renders in the approved look. It starts from the approved reference code, applied unchanged where the spec agrees with it, with the deviations listed below.
  - One grid per row, laid out by the Nodes card's width (container queries: wide ≥64rem one line, medium ≥38rem two tiers, narrow stacked).
  - One collaboration capsule (`NodeCollaborationSwitch`) in the add band and every row.
  - One notice shape (`NodeNoticeIcon` plus a tone frame) for row lines, server results and the Docker hint; the ✓⚠✗ⓘ text marks are gone from rows and details. The dialog keeps its marks.
  - The server version as a quiet cell.
  - The offer summary is a button (`RemoteCollaborationOfferToggle`, names as its tooltip) that opens a framed panel with the list and connection details.
  - `NodeServerUpdate` renders twice per remote row (`part: 'cell' | 'notice'`). Only the cell watches the node.
  - Stores, utils, localization, `NodeChangeDialog.vue`, `RemoteCollaborationOfferList.vue`, server and Electron are untouched.

### Deviations from the reference code (the spec is the authority)

| # | Reference | Implemented | Why |
| --- | --- | --- | --- |
| D-1 | Medium layout areas `'name collab actions' 'server offer offer'` | `'server server server' 'offer offer offer'`; every cell below the first line spans all columns, including the 1fr one | The spec says "under them server then offer". The reference's server cell widened an auto column per row, so the capsules misaligned and "Connection details" wrapped (IMP-06). |
| D-2 | `row-gap: 0.5rem` | No row gap; server, offer and (narrow) capsule carry `margin-top: 0.5rem`, reset where they sit on the first line | A never-reached row kept two empty tracks whose gaps doubled the space above its notice. Wide layout unchanged. |
| D-3 | `text-[13px]` (add-band address input, server cell) | `text-[0.8125rem]` | The app font-size audit (`tests/integration/app-font-size-fixed-px-audit`) forbids fixed px in `components/settings`. Same pixels at the default size; follows the font-size setting. |
| D-4 | HTML comment at the template root of `NodeServerUpdate`, `NodeNoticeIcon`, `NodeCollaborationSwitch` | Moved into script doc comments | A root comment makes a fragment, which drops fallthrough attributes and broke the specs. |
| D-5 | `NodeServerUpdate` `part` optional with a default; `aria-live` on the notice | `part` required; `aria-live="polite"` on the cell root (`node-server-<key>`); the notice relies on the row's notice wrapper, which is already a live region | Progress (in the cell) is announced as on the base. No double announcement for notices. Every caller states which part it renders. |
| D-6 | Offer toggle `title` always bound | `:title="preview \|\| undefined"` | No empty tooltip when a label replaces the counts. |

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section: [design-spec.md § Task Size And Architectural Risk](design-spec.md)
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change set matches the design's file mapping: 8 components changed (7 in `nodes/` plus `NodeManager`), 3 added, 1 removed, 3 specs changed, 1 replaced, 2 probes, 1 docs section.
  - Two small extra files: `typecheck-baseline.json` (one line removed, for the removed spec) and the NP-12 baseline fix.
  - No store, API, server, Electron, persistence or localization change: `git diff 3b9dc912a1 -- autobyteus-web/stores autobyteus-web/utils autobyteus-web/localization autobyteus-server-ts autobyteus-web/electron` is empty.
- Selected route: `Direct API/E2E` (as returned by `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes`. Checked:
  - no `prototype/` imports;
  - no remaining reference to `RemoteCollaborationOfferDisclosure` in source, specs or docs;
  - the only ✓/✗ marks left in components are `NodeChangeDialog.vue`'s;
  - every test ID the probes rely on is kept (both probes pass);
  - DS-002 one-ask rule covered by a spec;
  - file sizes in range (see below);
  - no compatibility wrapper;
  - vocabulary unchanged ("remote collaboration", "notice", "offer"; no "peer" in the UI).
- New design impact or escalation trigger: `None`. No store, copy, probe-relied test ID or `NodeChangeDialog` change was needed. The Disclosure's root and `-preview` test IDs went as the design said (E-7).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-900 | New look per VIS-001…037 | `NodeManager`, `ThisNodeCard`, `NodeList`, `AddNodePanel`, `NodeRow`, `NodeServerUpdate`, `NodeConnectionDetails`, `NodeAddressHint`; new `NodeCollaborationSwitch`, `NodeNoticeIcon`, `RemoteCollaborationOfferToggle` | Rendered check IMP-06 (1440 en and zh-CN, medium, 390); probe screenshots IMP-07/08 |
| BEH-901 | This node: name, type, address, switch with On/Off/Saving, explanation, rules | `ThisNodeCard.vue` | Same store calls; main probe NP-01 (this node off) and NP-02 pass |
| BEH-902 | Add node: fields, capsule, Add, checking, errors, duplicate, flash, confirmation | `AddNodePanel.vue` (capsule via `NodeCollaborationSwitch`) | `AddNodePanel.spec.ts` (3); probe NP-04/NP-05 |
| BEH-903 | Row: dot, rename, address, switch (disabled states), Open, Remove | `NodeRow.vue` | `NodeRow.spec.ts` (17), including the capsule's dimmed and disabled states, the browser and embedded action slots, and the Open slot kept for alignment |
| BEH-904 | Row line with one fixing button, each kind; checking line | `NodeRow.vue` notice (tone frame + `NodeNoticeIcon`) | Line texts unchanged without marks; tones asserted in the probes (`tone()` helper: iota, ghost, mu; ND-04 info) |
| BEH-905 | Offer summary → list and connection details; Docker hint | `RemoteCollaborationOfferToggle.vue`, `NodeRow.vue` panel, `NodeConnectionDetails.vue`, `NodeAddressHint.vue` | `RemoteCollaborationOfferToggle.spec.ts` (3); NodeRow panel case; probe directions; ND-02 Docker hint (IMP-08 screenshot) |
| BEH-906 | Server version, Update, progress, restarting, not reachable, notes, result, Copy command | `NodeServerUpdate.vue` (`part: 'cell' \| 'notice'`) | `NodeServerUpdate.spec.ts` (13), including the DS-002 case: one GET per row, unmount releases the entry |
| BEH-907 | One confirmation dialog | `NodeChangeDialog.vue`, unchanged | Probe NP-04/06/07/09/10; dialog marks still asserted |
| BEH-908 | Contexts: desktop, Docker window, browser, en/zh-CN, narrow | Container queries in `NodeList`/`NodeRow` | IMP-06 (browser, zh-CN, 390, medium); ND-05 window on Docker |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.
- AC-901: rendered comparison IMP-06, by inspection, not pixel diff.
- AC-902: IMP-01, IMP-07, IMP-08.
- AC-903: specs plus IMP-06; update states by spec only.
- AC-904: IMP-06 and IMP-08.
- AC-905: the empty diff above.

## Key Files Or Areas

- `autobyteus-web/components/settings/nodes/NodeRow.vue` (278 lines): grid and styles, capsule, toggle, panel, notice.
- `autobyteus-web/components/settings/nodes/NodeServerUpdate.vue`: the `part` split and the live region.
- `autobyteus-web/components/settings/nodes/{NodeCollaborationSwitch,NodeNoticeIcon}.vue`, `autobyteus-web/components/settings/RemoteCollaborationOfferToggle.vue`: new.
- `autobyteus-web/components/settings/RemoteCollaborationOfferDisclosure.vue` and its spec: removed.
- Specs: `components/settings/nodes/__tests__/{NodeRow,NodeServerUpdate,AddNodePanel}.spec.ts`, `components/settings/__tests__/RemoteCollaborationOfferToggle.spec.ts`.
- Probes: `autobyteus-web/tests/e2e/{remote-nodes-page,nodes-docker-address}-probe.mjs`. `line()` returns plain text; a new `tone()` reads the notice frame; the dialog's marks are unchanged.
- `autobyteus-web/docs/settings.md` § "Nodes: Manage Nodes (one list)".

## Important Assumptions

- Text marks in row and detail lines are replaced by the icon and tone frame, as the package shows. Line wording is unchanged (DEC-903), which E-2 confirmed by `cmp`.
- The browser view keeps no empty Open slot when the window has no Open at all (`hasOpen=false`); a desktop window that can't open one node keeps the slot so icons line up. This follows the reference and VIS-025.

## Known Risks

- **Medium layout spacing:** D-1/D-2 differ from the reference code. The spec text and the alignment rule back them, but no VIS shows the 38–64rem tier exactly. Medium screenshots are in IMP-06.
- **Update states not seen rendered:** VIS-015…021, VIS-037 and the update parts of VIS-032/034 (update starting, downloading, restarting, succeeded, refused with Copy command, failed, lost). The test servers report no version, and neither probe builds these states. Covered by `NodeServerUpdate.spec.ts` only.
- **NP-12 baseline fix:** the main probe failed NP-12 on the base too. Since autobyteus-305 (`deead7bf05`) the window asks each reached remote node `GET /rest/node-update`, and the probe's allow-list was never updated. Fixed as its own commit `1827e6f2bd` (TESTING.md rule 9). It is a test expectation, not a product change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` (visual redesign, no behavior change)
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`. `NodeServerUpdate`'s two parts read one store entry, and only the cell watches (DS-002, spec-tested). The Disclosure is removed, not kept.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence: `NodeServerUpdate.spec.ts` "363 DS-002: only the cell asks the node…".

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The Disclosure and its spec are removed; no hidden marks are kept for probes; the probes were updated.
- Dead code in the touched files and modules removed: `Yes`. No unused imports or branches left. The optional `part` default is removed.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. No shared data shape changed.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`.
  - Largest source file: `NodeRow.vue` at 278 lines (base 227, design estimate ~275). It is >220 and was assessed: one concern (one row); the capsule and icon were already extracted.
  - Test probe `remote-nodes-page-probe.mjs` was already 711 lines at the base and is now 720. It is a test script, not source. The growth is the `tone()` helper and its expectations, which the design asked for.
- Notes: none.

## Persisted Data Transition Check

- Approved decision: `Not Affected` (design spec § Persisted Data). No stored format touched.

## Environment Or Dependency Notes

- Server build `pnpm -C autobyteus-server-ts build` was needed for the probes and the rendered check. It left untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` in the worktree; they are not committed.
- Docker probe: test-owned containers only. The container and volume lists were identical before and after IMP-08.
- The rendered check used test-owned servers with their own data roots under `/tmp/mnp-visual`, removed afterwards. Nothing used the user's AutoByteus, data or containers.

## Checks Run

Evidence folder: `tickets/in-progress/manage-nodes-professional/evidence/implementation/`.
Environment for all rows: macOS Darwin 25.5.0, node v22.23.1, pnpm 10.28.2.

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run` | `d5f670021b` | Whole web unit suite incl. Nodes specs, Toggle spec, font-size audit | BEH-901…908, AC-902/903 | Pass | `IMP-01-web-unit-suite.log`, `IMP-01-web-unit-suite-excerpt.log` | `Test Files  682 passed (682)`; `Tests  4958 passed \| 2 skipped (4960)` |
| IMP-02 | `cd autobyteus-web && pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals` | `d5f670021b` | Web boundary, localization | AC-905 | Pass | `IMP-02a-guard-web-boundary.log`, `IMP-02b-guard-localization-boundary.log`, `IMP-02c-audit-localization-literals.log` | `[guard:web-boundary] Passed.`; `[guard:localization-boundary] Passed.`; `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-03 | `cd autobyteus-web && pnpm typecheck` | `d5f670021b` | Nuxt app, Electron main, build scripts | — | Pass | `IMP-03-web-typecheck.log` | `production errors: 0; test-file errors: 291 in 138 files (baseline 291 in 138 files)`; `[typecheck] PASS` |
| IMP-04 | `pnpm -C autobyteus-web test:e2e:remote-nodes-page --output-dir=…/IMP-04-remote-nodes-page-probe` | `3b9dc912a1` + uncommitted 363 tree (superseded) | First run | — | Fail (NP-12, baseline cause) | `IMP-04-remote-nodes-page-probe.log`, `IMP-04-remote-nodes-page-probe/` | NP-01…NP-11 Pass; NP-12 Fail on `/rest/node-update` → fixed in `1827e6f2bd` |
| IMP-05 | `pnpm -C autobyteus-web test:e2e:nodes-docker-address --output-dir=…/IMP-05-nodes-docker-address-probe` | `3b9dc912a1` + uncommitted 363 tree (superseded) | First run | — | Pass | `IMP-05-nodes-docker-address-probe.log`, `IMP-05-nodes-docker-address-probe/` | `nodes-docker-address probe: Pass` |
| IMP-06 | Rendered check on test-owned servers and Nuxt dev (steps in the notes) | 363 tree = `523bd0454b` styles | The rendered tab | BEH-900, BEH-908, AC-901/904 | Pass (after fixes D-1, D-2) | `IMP-06-rendered-check/IMP-06-rendered-check.md` + 5 PNGs | desktop/zh-CN/medium/390 rows as in the notes' table |
| IMP-07 | `pnpm -C autobyteus-web test:e2e:remote-nodes-page -- --output-dir=…/IMP-07-remote-nodes-page-probe` | `d5f670021b` | Manage Nodes page against test servers in a browser | BEH-901…907, AC-902/903 | Pass | `IMP-07-remote-nodes-page-probe.log`, `IMP-07-remote-nodes-page-probe/` | NP-01…NP-12 Pass; `remote-nodes-page probe: Pass` |
| IMP-08 | `pnpm -C autobyteus-web test:e2e:nodes-docker-address --output-dir=…/IMP-08-nodes-docker-address-probe` | `d5f670021b` | Docker node, loopback hint, window on Docker | BEH-905, BEH-908, AC-904 | Pass | `IMP-08-nodes-docker-address-probe.log`, `IMP-08-nodes-docker-address-probe/` | ND-01…ND-05 Pass; `nodes-docker-address probe: Pass` |

Not run, and why:
- `pnpm test:electron`: no Electron file changed.
- Server tests: no server change.
- An isolated Electron desktop instance (Open icon, real desktop window). Left to API/E2E if wanted; the Open slot is spec-covered and ND-05 covers the window on a Docker node.
- Other web probes: they don't touch these components.
- A pixel diff against every VIS.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Nodes → Manage Nodes (this node card, add band, rows, notices, offer panel, connection details, Docker hint).
- Approved references: the Product `ui-ux-spec.md` and VIS-001…037; the reference implementation diff.
- Existing design system reviewed: the reference's components, which use the app's slate/emerald/amber/red tones and existing tab bar and cards; the app font-size audit (led to D-3).
- Rendered surface: Nuxt dev against three test-owned servers in the browser tool, iframe harness for exact widths. Steps are in the IMP-06 notes.
- States, layouts, viewports, interactions inspected:
  - wide 1440 (en, zh-CN);
  - medium (card 713 px);
  - narrow 390;
  - row states: never reached (info + Check again), collaborating both ways with empty offer and panel open (directions, Change address, node ID, refresh), off there (warn + Turn on there);
  - server version unknown;
  - this node on;
  - offer toggle open and close.
- Issues found and corrected: D-1 (medium misalignment), D-2 (empty-track gap), D-4 (fragments, found by specs).
- Remaining unverified states: the update states (spec only); the Electron desktop window itself.

## Downstream Coverage Hints / Suggested Scenarios

- Update states rendered (VIS-015…021, VIS-037): a remote node with a version older than the app, through Update → restarting → succeeded, and refused with Copy command. Look at the cell (version, progress) and the notice under the row, at 1440 and 390.
- The medium tier (card between 38 and 64 rem, e.g. window ~1100 px with the sidebar open): capsules and trash icons in one column across rows; server then offer under the name; no extra gap above a never-reached row's notice.
- Keyboard and screen reader: Tab order through the capsule (switch role, label), the offer toggle (`aria-expanded`), notice buttons. The server cell is a polite live region during an update.
- zh-CN at 390 (VIS-036): notice buttons below text, no clipping.
- Desktop window: Open icon present and aligned; a node that can't be opened keeps the slot.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Validate the rendered update states and the desktop window, which this implementation did not render.
- Judge whether the probes need a durable tone or capsule assertion beyond the `tone()` checks added here.
- The implementation checks above (IMP-01…08) need not be repeated unless the code changes.
