# Product Prototyper Baseline Acceptance Review

## Review Identity

- Package: `initial-prototype-baseline`
- Requirements revisions: `RER-002` baseline acceptance, `RER-009` focused
  Agent Team launch/member-selection parity acceptance, `RER-011`
  non-observable workspace integration, and `RER-013` independent-repository
  ownership migration
- Review dates: `2026-08-22` and `2026-08-24`
- Reviewed source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Canonical prototype root: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Canonical review URL: `http://127.0.0.1:3210`
- Original outcome: **Baseline Needed — not accepted**
- Corrected-baseline outcome: **Accepted (`PPA-001`)**
- RER-009 correction outcome: **Accepted (`PPA-002`)**
- User review status: **Confirmed** for the complete baseline and the focused
  RER-009 corrected journey.

## Original Rejected Baseline — Evidence Reviewed

The Product Prototyper directly inspected:

- the live production-build prototype at the canonical URL;
- `prototype-bootstrap-report.md`;
- `parity-inventory.md`;
- `comparison-report.md` and both machine-readable result/summary pairs;
- `evidence-index.md`, `prototype-runbook.md`, `prototype-scenarios.md`, and `mock-boundaries.md`;
- final validation and isolation logs;
- the deterministic fixture and scenario adapter;
- selected pinned-source pages, components, stores, tests, and product documentation needed to audit inventory completeness.

The original return's comparisons for the **recorded** 60 rendered rows and 18 journeys were internally consistent and passed. The source pin, independent runtime, no-live-boundary intent, and browser/external-node frames inspected were credible. That return could not be accepted because the recorded inventory was materially incomplete and one asserted configuration-equivalence claim was contradicted by source code and a direct runnable probe. The later correction and acceptance are recorded below.

## Blocking Inventory Findings

The following IDs are stable Product Prototyper review-gap IDs. Bootstrapper correction should add stable parity inventory IDs for each distinct source obligation and map every added row to controlled runnable source and prototype evidence.

### PP-GAP-001 — Electron/internal-node configuration is missing and the equivalence claim is false

- Required configuration: Electron window controlling its bundled internal node.
- Current evidence: no `CFG-*`, `STATE-*`, or journey row represents an Electron runtime; every recorded fixture has `server.isElectron = false`, the `appUpdate` snapshots have `isElectron = false`, and the only documented runnable contexts are `desktop`, `unpaired`, and `paired`.
- Direct probe: requesting context `electron_internal` falls back to `populated|desktop|...`; the Extensions page still says it is available only in Electron and `window.electronAPI` is absent. The Updates page still exposes the browser-only notice and disables `Check for Updates`.
- Source contradiction: `components/settings/ExtensionsManager.vue` renders the extension card only for Electron; `components/settings/AboutSettingsManager.vue` enables update actions only for Electron; `components/settings/ServerSettingsManager.vue` exposes embedded server status/logs only in an embedded window; native folder selection changes Workspace and Application setup behavior.
- Existing assertions affected: the context-equivalence statement in `prototype-scenarios.md` and the Electron/internal-node coverage assertion in `prototype-bootstrap-report.md` are unsubstantiated. `ROUTE-037`–`ROUTE-041` are browser/external-node evidence only, not Electron/internal-node evidence.
- Required correction: add a deterministic Electron/internal-node host adapter and complete source-versus-prototype inventory/evidence for every materially different visible surface, state, interaction, and journey. Mock the native bridge; do not bundle Electron or reach production.

### PP-GAP-002 — Electron/external-node window configuration is missing

- Required configuration: Electron window controlling an external node.
- Current evidence: no independently selectable `electron_external` context, source snapshot, prototype snapshot, or equivalence proof exists.
- Why distinct: source behavior branches on both Electron availability and `windowNodeContextStore.isEmbeddedWindow`. Electron-only capabilities remain available while embedded-only server diagnostics/native-node behavior differ from an external-node window.
- Required correction: inventory and validate the Electron/external-node combination independently, grouping only items proven byte/perceptually/behaviorally equivalent under controlled source execution.

### PP-GAP-003 — Electron server lifecycle and recovery surfaces are missing

- Missing observable obligations include the embedded-server startup gate, initial/loading lifecycle, ready transition, failure/log diagnostics, restart, shutdown, and recovery states represented by `components/server/ServerLoading.vue`, `ServerMonitor.vue`, `ServerLogViewer.vue`, and `ServerShutdown.vue`.
- Current `STATE-006` and `STATE-007` cover only the Agents catalog loading/error frames in browser mode. They do not substantiate Electron/internal-node lifecycle states.
- Required correction: add stable state and journey IDs with deterministic mock timing/errors, focus/feedback/recovery behavior, and matched source/prototype evidence.

### PP-GAP-004 — Populated agent and team workspace experiences are missing

- Current `ROUTE-025` captures only “No agent or team run selected”; `JRN-018` reaches the agent run-configuration form but does not launch or exercise a run.
- The pinned source exposes discoverable populated workspace surfaces including agent conversation, agent event/activity monitoring, status, todos, artifacts and viewers; team overview, member focus, member/team messages, delegated-task lifecycle/detail/reference views; running-run panels and run history.
- Required correction: inventory and reproduce deterministic agent and team journeys from setup through active/running, streaming/progressive content, stopped/completed, error, interrupt/retry/follow-up, and reopened-history states, including all real client interactions and visible feedback.

### PP-GAP-005 — Workspace tool/right-panel surfaces and file/terminal/browser interactions are missing

- Current `ROUTE-025` shows only an initialized Terminal label beside the no-selection center state. It does not inventory populated Files, Terminal, Activity, Token, Artifacts, browser/VNC, open-file content, or relevant drawer/tab/resizing interactions.
- Pinned-source evidence: `components/workspace/tools/*`, `components/fileExplorer/*`, `components/layout/RightSideTabs.vue`, `WorkspaceRightToolDrawer.vue`, workspace usage/artifact components, and their discoverable tests/docs.
- Required correction: add deterministic empty/populated/loading/error/permission/recovery and interaction rows for the supported workspace tools, including keyboard/focus and narrow-responsive behavior.

### PP-GAP-006 — Paired-mobile work journeys are incomplete

- Current mobile rows cover unpaired home, paired home, one unsupported notice, permission denied, and one work-picker transition.
- The pinned source contains materially distinct Mobile Runs, Run Setup, Chat, Team Messages/member focus, Files/File Viewer, Artifacts, Activity, Troubleshooting, Unpair Confirmation, context attachments, and team reference viewer surfaces.
- Required correction: inventory and validate every supported paired-mobile surface and its meaningful loading/empty/populated/error/permission/recovery/feedback transitions, in both applicable locales and narrow viewports.

### PP-GAP-007 — Locale and responsive coverage is only representative, not complete

- `CFG-001`–`CFG-008` cover eight narrow Simplified-Chinese frames. They do not map every desktop route/detail/create/edit/settings surface, alternate state, dialog, feedback, or journey to Simplified Chinese and narrow-responsive evidence.
- Complete parity requires every inventory obligation to state and substantiate its supported locale and viewport coverage, with explicit grouping only where the controlled evidence proves equivalence.
- Required correction: expand the matrix or add auditable equivalence groups covering all recorded and newly discovered items for English/Simplified Chinese and validated desktop/narrow viewports.

### PP-GAP-008 — The current interaction/state inventory omits discoverable CRUD, settings, and recovery patterns

- Existing journeys cover a useful sample but not all discoverable client behavior: team create/edit/delete; agent edit/delete; tool/MCP add/edit/delete/import/confirmation; node/window/phone-access actions; provider/API key and settings validation/save feedback; messaging gateway/provider/binding setup; package/extension/update actions; file context actions and dialogs; media/fullscreen behavior; workspace history archive/delete/reopen; and related loading/error/retry/permission states.
- Required correction: complete an interaction/state discovery pass across the retained source presentation and relevant source tests/docs, then add stable IDs and controlled evidence for every distinct behavior rather than treating samples as complete parity.

## Existing Rows Not Rejected

No discrepancy was found in the browser/external-node screenshots or journeys actually recorded. `ROUTE-001`–`ROUTE-041`, `CFG-001`–`CFG-011`, `STATE-001`–`STATE-008`, and `JRN-001`–`JRN-018` may be preserved as passing evidence for their exact current contexts. Their descriptions and reports must not claim untested configuration/state/journey coverage.

## Required Bootstrapper Return

Return a corrected `prototype-bootstrap-report.md`, parity inventory, comparison evidence, scenario/runbook and mock-boundary record that:

1. resolves `PP-GAP-001` through `PP-GAP-008`;
2. gives all newly discovered obligations stable inventory IDs;
3. preserves the pinned source commit and isolation boundary;
4. reports every item as pass with controlled runnable source-versus-prototype evidence;
5. removes or narrows any equivalence/completeness assertion not backed by exact evidence; and
6. identifies any remaining failed, unknown, or missing IDs instead of reporting completion.

This restriction governed the original return. The correction review below records its resolution before user review.

## Direct Review Evidence

- `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence/product-prototyper-review/direct-browser-probe.txt`
- `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence/product-prototyper-review/electron-internal-context-fallback-extensions.png`

## Corrected Baseline Review And Acceptance

### Acceptance Reference

- Acceptance ID: `PPA-001`
- Acceptance date: `2026-08-22`
- Accepted boundary: complete current-state `autobyteus-web` experience at pinned source commit `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Accepted prototype: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Accepted review URL: `http://127.0.0.1:3200`
- Intentional current-state deltas: none

### Direct Correction Review

The Product Prototyper read the corrected bootstrap report, inventory,
comparison report, scenario/runbook, mock-boundary record, evidence index,
machine summaries, static/unit/build/isolation logs, discovery audit, exact
presentation manifest, and the two pinned-source test-failure reruns. The
source worktree remained unchanged and both source `HEAD` and
`origin/personal` still resolved to the accepted pin.

Direct production-build browser inspection confirmed:

1. `electron_internal` now installs the deterministic local host bridge and
   renders the installed/enabled Voice Input extension with native-only
   actions instead of the former browser-only notice.
2. `electron_external` retains Electron capabilities while omitting the
   embedded-only Server Status & Logs control; `electron_internal` exposes it.
3. `workspace_team_active` renders the running team conversation, composer,
   Files tree/viewer and Files/Team/Terminal/Activity/Token/Artifacts/VNC
   controls without visible alerts or external resource loads.
4. The prototype reports the exact accepted source commit and uses no external
   performance resources in the inspected ordinary-review states.
5. After direct inspection, the evidence-only source frontend on port `3100`
   and synthetic observation node on `4310` were stopped; both refused
   connections while the accepted production-build prototype on `3200`
   continued returning HTTP 200.

The Product Prototyper also reran prototype unit tests, boundary validation,
and retained-presentation audit: 7/7 tests passed, all 13 isolation checks
passed, and 369/369 retained presentation files matched the pinned source byte
for byte.

### Gap Resolution

| Original review gap | Corrected evidence | Acceptance result |
| --- | --- | --- |
| `PP-GAP-001` | `HOST-001`–`HOST-005`, `STATE-009`–`STATE-013`, Electron/internal journeys and matrices | Resolved |
| `PP-GAP-002` | independent `electron_external` context and `HOST-006`–`HOST-008` | Resolved |
| `PP-GAP-003` | deterministic embedded lifecycle states and `JRN-021` recovery | Resolved |
| `PP-GAP-004` | `WKS-001`–`WKS-004`, `WKS-012`–`WKS-021` and lifecycle/history journeys | Resolved |
| `PP-GAP-005` | `WKS-005`–`WKS-011`, tool/drawer/file/resize journeys | Resolved |
| `PP-GAP-006` | `MOB-001`–`MOB-014` and mobile journeys `JRN-027`–`JRN-030`, `JRN-044`–`JRN-045` | Resolved |
| `PP-GAP-007` | 123 route and 116 correction locale/responsive matrix rows | Resolved |
| `PP-GAP-008` | `DISC-001`–`DISC-017`, 49 total journeys and exact retained-presentation audit | Resolved |

All 60 preserved rendered rows, 48 correction rows, 239 locale/responsive
matrix rows, and 49 interaction journeys pass their matched source-versus-
prototype checks. The two unchanged pinned-source unit-test harness failures
are explicitly recorded; their observable outcomes pass matched browser
journeys `JRN-047` and `JRN-049` and do not identify a prototype discrepancy.

### Acceptance Decision

The complete corrected current-state parity baseline is **accepted**. There is
no known perceptible, client-behavior, navigation, state, focus, responsive,
access-context, locale or journey discrepancy and no unsubstantiated inventory
ID. This acceptance authorizes current-state user review only. It does not
authorize a future-state delta, production architecture or production
engineering, and it is not user approval.

## User Review And Finalization

- User confirmation reference: user message **“approved”** on `2026-08-22`,
  immediately following the request to review the complete corrected baseline
  at <http://127.0.0.1:3200>.
- Focused RER-009 confirmation reference: user message
  **“done. i checked. thanks”** on `2026-08-24`, immediately following the
  explicit request to approve the corrected Agent Teams Run → workspace draft
  → Run Team → expanded Team/member-selection journey at
  <http://127.0.0.1:3210>.
- Approved boundary: the complete current-state baseline accepted under
  `PPA-001` plus the exact current-source parity correction accepted under
  `PPA-002`; no future-state delta or production-engineering scope.
- Canonical UI/UX supplement: `ui-ux-spec.md`.
- Post-confirmation final visual references:
  `final-reference-screenshots/VIS-001`–`VIS-017`.
- Capture result: **17/17** without browser errors or external resources; exact
  routes, scenarios, contexts, hashes and viewports are in
  `final-reference-screenshots/manifest.json`.
- Post-confirmation invisible isolation correction: the retained Monaco loader
  now uses a checked-in local asset mirror rather than jsDelivr. This changes no
  approved visible or interactive behavior and removes an ordinary-review
  network dependency.
- Final validation: typecheck, lint, 7/7 prototype tests, 13/13 boundary checks,
  369/369 retained-presentation audit and production build pass; see
  `evidence/validation/product-prototyper-final-validation.txt`.

### Final Decision

The current-state product prototype package is **approved and finalized**.
Known failed, missing, unknown or unsubstantiated UI inventory IDs: **none**.

## RER-004 Repository Placement Correction

The user subsequently rejected the prototype's mistaken standalone Git
placement. Requirements Engineering reopened only repository provenance and
active-path acceptance criteria `AC-007`–`AC-009`. The approved observable
baseline, `PPA-001`, explicit user confirmation, source pin, screenshots and
parity evidence remain unchanged.

RER-004 made the prototype ordinary tracked content in the owning repository's
ticket worktree and removed the rejected standalone repository. That
historical intermediate placement contained no nested `.git`, submodule or
gitlink. Its relocation and validation evidence remains recorded in
`repository-placement-correction.md`.

## RER-007 Repository-Root Placement Correction

The user subsequently classified the accepted baseline as a separate project
that belongs at repository-root `autobyteus-web-prototype`, rather than inside
the shared prototype collection. The user explicitly authorized this
placement-only correction directly on `personal`, including commit and push,
without a new ticket, branch, worktree, repository, submodule or gitlink.

At the RER-007 placement stage, the approved project was placed at the owning
repository root under repository-relative `autobyteus-web-prototype` on
`personal`. That placement was temporarily superseded for RER-009 correction
and review by the mandatory isolated ticket worktree documented below, then
restored as the canonical checkout through the separately authorized RER-011
integration. The five unrelated projects remaining in `ui-prototypes/` retained their
original Git-tree IDs. RER-007 did not reopen UI review or change the
2026-08-22 user approval.

## RER-009 Agent Team Launch Parity Correction

### Acceptance Reference

- Acceptance ID: `PPA-002`
- Acceptance date: `2026-08-24`
- Requirements revision: `RER-009`
- Corrected gaps: `PP-GAP-009` and `PP-GAP-010`
- Corrected inventory: `WKS-022`, `WKS-023`, and `JRN-050-A`–`JRN-050-E`
- Accepted root:
  `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Accepted branch/Bootstrapper correction commit:
  `codex/initial-prototype-baseline` /
  `da54757685e648ec068f44050fbad0217b334c5c`
- Accepted review URL: <http://127.0.0.1:3210>
- Source authority remains
  `8ef282ba77705180d985e7000d801f0e0068cdc1`; no source refresh occurred.

### Direct Product Prototyper Review

The Product Prototyper restarted the journey from a clean `team_launch`
browser context and directly exercised the real retained UI. The review
confirmed:

1. exactly one Product Review Team card **Run** action navigates from
   `/agent-teams?view=team-list` to `/workspace` with one valid Map-backed Team
   draft and no `inFlightDrafts.keys` error;
2. `prototype-workspace` resolves to `/synthetic/prototype-workspace`, updates
   the draft, clears the workspace-required feedback and enables **Run Team**;
3. **Run Team** removes all drafts/in-flight entries, selects
   `team-run-created-fixture`, and projects exactly one Product Review Team
   with researcher and writer under Prototype Workspace;
4. the Team row collapses and expands through its real disclosure control;
5. selecting `/writer` sets `aria-current="true"`, focuses
   `team-member-writer-created`, updates the navigation projection, and changes
   the center Team header to `writer`; selecting coordinator `/researcher`
   performs the corresponding inverse focus transition; and
6. the full replay emitted no captured browser error and no visible alert.

The accepted observation is recorded at
`evidence/product-prototyper-review/rer-009-direct-review.txt`. The exact matched
source/prototype contract remains `evidence/gap-010/gap-010-results.json`:
5/5 checkpoints pass with exact semantics and Pinia state, zero browser errors,
and byte-identical screenshots.

Post-confirmation final validation passes: typecheck; lint; 2 files / 8 tests;
13/13 boundary checks; 369/369 retained presentation files; production build;
20/20 `PP-GAP-009` package checks; 25/25 `PP-GAP-010` package checks; and
86/86 terminal final-package checks. `VIS-001`–`VIS-015` retain their exact
approved hashes, while new `VIS-016` and `VIS-017` were captured after the
RER-009 confirmation with zero browser errors or external resources.

### User Confirmation And Final Decision

The user reviewed the runnable corrected journey and responded
**“done. i checked. thanks”** on `2026-08-24` immediately after the explicit
approval request. This confirms only the restored current-source behavior; it
does not approve any redesign, future-state feature, production runtime,
production architecture, or production-engineering work.

The focused RER-009 current-state correction is **accepted, user-confirmed, and
finalized** under `PPA-002`. Known failed, missing, unknown or unsubstantiated
UI inventory IDs: **none**.

## RER-011 Direct Personal Integration

The user separately authorized the already accepted cumulative package to be
integrated **directly on the personal branch**. This is repository provenance
work only: PPA-001/PPA-002, the source pin, all visible behavior, and
VIS-001–VIS-017 remain unchanged and no renewed UI review is required.

The complete six-commit task history was rebased onto the freshly fetched
`origin/personal` head while preserving every patch identity and the exact
pre-rebase prototype and requirements trees. The historical RER-011 project root
was `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
on `personal`. Pre-promotion and post-promotion validation, artifact hashes,
unrelated-tree equivalence, and final Git ref equality are recorded by
`personal-integration-record.md`, `evidence/integration/`, and the terminal
handoff proof. This integration does not change the user-confirmed product
decision.

## RER-013 Independent Repository Ownership

The user explicitly selected a separate repository for the prototype. The
complete accepted tree was materialized as repository-root content at
`/home/autobyteus/workspace/autobyteus-web-prototype` on the independent
`personal` branch, with origin
`https://github.com/AutoByteus/autobyteus-web-prototype.git`.

The clean history records provenance to workspace integration commit
`0100f78d34344d87cf8b6f3627d5df2b50c935d4` and approved prototype tree
`ca1d3f9ed58f0fc1f673ff013a351841bf78e575` without importing unrelated
workspace history. Only active filesystem/repository locators and ownership
evidence changed. PPA-001/PPA-002, the pinned source, JRN-050-A–E,
VIS-001–VIS-017 and both explicit user confirmations are unchanged, so no
renewed UI review is required.

## RER-015 Workspace Repository Ownership Return

The user later reversed only the active repository-ownership choice and asked
to manage the complete accepted prototype inside `autobyteus-workspace` again.
The package is therefore ordinary root-level content at
`/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype` on
workspace branch `personal`. The independent commit
`0b02b0e1fbdbdefb78b91b1705bd497663694e0f` remains historical provenance;
the independent GitHub repository is not deleted or rewritten.

RER-015 changes only active repository/root/provenance locators and adds
ownership-validation evidence. PPA-001/PPA-002, source pin, JRN-050-A–E,
VIS-001–VIS-017 and both confirmation references remain exact. No renewed UI
review is required because observable behavior and normative hashes do not
change.
