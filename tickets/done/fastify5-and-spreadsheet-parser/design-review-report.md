# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/requirements-doc.md` (Approved, SR-004)
- Upstream Investigation Notes: `.../investigation-notes.md`
- Upstream Solution Revision Record: `.../solution-revision-record.md`
- Reviewed Design Spec: `.../design-spec.md` (SR-004, status `Ready`)
- Supplemental Task Artifacts Reviewed: `evidence/SD-01`..`SD-09`, `probes/cors-order-probe.mjs`, `probes/excel-viewer-trial.diff`, `probes/ExcelViewerTrial.spec.ts.txt`, `probes/sheetjs-hyperlink.cjs` (via SD-09), `follow-ups.md`, `handoff-sr-003.md`, `handoff-sr-004.md`
- Relevant Solution Revision IDs: SR-002 (user approval), SR-003 (design), SR-004 (DEC-008 and the viewer delta)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer `Architecture Design Complete` (revised), SR-004, a narrow re-review of DS-006 after ARCH-REV-001
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`: AR-001, AR-002)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser` at `ddd6fdcdf6`, with no source changes. Round 1 opened: `build-studio-server.ts` L356-399, `build-standalone-application-server.ts` L18-45, `agent-tools-mcp-local-server.ts` L30-69, `agent-tools-mcp-routes.ts` L35-63, `mcp-gateway-routes.ts` L34-90, `api/graphql/index.ts`, `api/static/mobile-web.ts` L35-36, `runtime-logger-bootstrap.ts` L176-186, the gateway Dockerfile, compose files, `package.json` and `.gitignore`, the root `.dockerignore` and `package.json` `pnpm` block, `ExcelViewer.vue`, its spec, and `xlsx@0.18.5` `make_html_row`. Round 2 also opened `electron/shell/workspace-shell-window.ts` L39-60 and the Tailwind config (no `preflight`/`corePlugins` override), with `nuxt.config.ts` L236-243.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1. About 14 files in three packages within existing owners. Risk is High because a framework major sits under every request, the gateway's install and deployment path changes, a dependency comes from a non-npm host, and two security boundaries change.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. SR-004 keeps the SR-002 basis and adds DEC-008: a hyperlinked cell shows its text without a link. REQ-010, REQ-011, AC-013 and BEH-007 are aligned.
- Relevant existing behavior and evidence confirmed: Yes.
  - SD-09 reproduces `<a href>` for hyperlinked cells, including `javascript:` targets, in 0.18.5 and 0.20.3 for xlsx and biff8.
  - `workspace-shell-window.ts` L52-58 prevents every `will-navigate` and denies `window.open`, as cited.
  - The Tailwind config has no preflight override, so preflight's `a { color: inherit; text-decoration: inherit }` applies, as cited.
- Scope guardrail confirmed: Yes. FU-005 (opening links in the system browser) is recorded as a follow-up, not added to scope.
- Approved change, preserved behavior, and outside scope understood: Yes. The SR-004 delta was approved by the Solution Designer within the direction, with the user informed. The requirements doc and SR-004 record this. The visible differences are the pointer cursor, and a phone tap no longer leaving the app. Nothing that works today stops working.
- Every prospective blocking `Design Impact` finding is traceable: N/A (none)
- Remaining material ambiguity: none
- Statements about existing code the design relies on: all opened. Round 1 statements stand; DS-001..DS-005 are unchanged since SR-003. Round 2 citations, `workspace-shell-window.ts` L52-59 and Tailwind preflight, are confirmed.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User/Dev | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass (SD-06 + gate order read) | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass (SD-02/03/07) | Pass | Confirmed | — |
| BEH-007 | User | Pass (DEC-008) | Pass (SD-05, SD-08, SD-09) | Pass. DS-006 names both entry forms; the sanitiser output for links is shown in SD-09 | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-01`..`SD-07` | Pass | Pass | Pass | Pass | Pass | — |
| `evidence/SD-08`, `probes/excel-viewer-trial.diff`, `probes/ExcelViewerTrial.spec.ts.txt` | Pass | Pass | Pass. They are a starting point; the design's spec case list is authoritative and adds CSV via URL and hyperlinks | Pass. The design notes that the diff predates `ALLOW_DATA_ATTR: false` | Pass | — |
| `evidence/SD-09`, `probes/sheetjs-hyperlink.cjs` | Pass | Pass (design evidence table, DEC-008, FU-005) | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec §Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | No design issue for the dependency move; the viewer injection is a local defect (SD-05, SD-08, SD-09) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `No`; CSP is FU-003; system-browser links are FU-005 | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | — | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Server requests | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | GraphQL / GraphiQL | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | MCP requests | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Gateway install | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Gateway image | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Spreadsheet viewing | Pass | Pass | N/A | Pass | Pass. Both entry forms are traced: URL bytes (`type: 'array'`, all four extensions) and streamed string (`type: 'string'`) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Gateway `pnpm-workspace.yaml` + lockfile | Pass | Pass | Pass | Pass | — |
| `ExcelViewer.vue` `sheetHtml` | Pass | Pass | Pass | Pass | The template reads only the sanitised value |
| Remote-access policy | Pass | Pass | Pass | Pass | No new rule |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Root workspace ↔ gateway | Pass | Pass | Pass | Pass | — |
| Gateway Docker context | Pass | Pass | Pass | Pass | — |
| Web → `xlsx` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /graphiql*` (removed) | Pass | Pass | Pass | Low | Pass |
| All other routes (unchanged) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| HTML sanitisation | Pass | Pass | N/A | Pass | DOMPurify 3.4.7 |
| Separate lockfile | Pass | Pass | Pass | Pass | — |
| Route classification | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server API / MCP | Pass | Pass | Pass | Pass | — |
| Gateway packaging | Pass | Pass | Pass | Pass | — |
| Web file viewers | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Sanitiser config (one caller) | Pass | N/A | N/A | Pass | — |

## Shared Structure / Data Model Tightness Verdict

N/A. No shared structure changes.

Derived consumers of a changed structure listed with a decision for each: `N/A`

Each domain word keeps one meaning: `Pass`

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server manifest, `api/graphql/index.ts`, two MCP route files | Pass | Pass | N/A | Pass | — |
| Gateway manifest, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, Dockerfile, README | Pass | Pass | N/A | Pass | The README note now reconciles L290-291 |
| `ExcelViewer.vue` | Pass | Pass | N/A | Pass | Allowlist with `ALLOW_DATA_ATTR: false` |
| `ExcelViewer.spec.ts` | Pass | Pass | N/A | Pass | Covers CSV via URL and `https:`/`javascript:` hyperlink cells |
| `docs/content_rendering.md` | Pass | Pass | N/A | Pass | States that hyperlinks are shown as text |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-message-gateway/pnpm-workspace.yaml`, `pnpm-lock.yaml` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `graphiql: true` | Pass | Pass | Pass | Pass | — |
| MCP `config: { cors: false }` ×2 | Pass | Pass | Pass | Pass | — |
| Gateway Dockerfile root-workspace lines | Pass | Pass | Pass | Pass | — |
| Viewer `id`/`editable` options | Pass | Pass | Pass | Pass | — |
| Spec `vi.mock('xlsx')` | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| GraphiQL, parser, gateway workspace, hyperlinks | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| All | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Three commits (viewer → server → gateway), then clean-clone checks | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| MCP route, GraphQL, viewer, Dockerfile | Yes | Pass | Pass | Pass | The viewer example shows a `javascript:` link cell becoming `<td>evil</td>` and rejects `a[href]` |

## Material Premise Validation (Only When Needed)

### `MP-001` — A spreadsheet cell with a hyperlink reaches the viewer and is rendered as a link on base

- Related approved requirement or established contract: REQ-010, REQ-011, AC-013, DEC-008
- Relevant behavior ID(s): BEH-007, SCN-006
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: a user opens an `.xlsx`/`.xls` that contains a hyperlink cell from any viewer surface (SCN-006).
- Support evidence: the file viewer; opening a spreadsheet is a Supported Normal Scenario.
- Forward production path: `ExcelViewer.loadExcel → XLSX.read` sets `cell.l`, then `sheet_to_html` emits `<a href>` (SD-09, both versions). Base renders it through `v-html`. Under the target, `DOMPurify.sanitize` with the table allowlist and `ALLOW_DATA_ATTR: false` gives `<td>text</td>` (SD-09).
- Lifecycle preconditions and material consequence: settled by DEC-008. The text shows without a link, and the `javascript:` script path is removed.
- Reachability: `Reachable`
- Review consequence: AR-001 was raised in round 1 and is resolved by DEC-008 and the design update.

## Unresolved Approved-Behavior Or Current-State Gaps

None

## Review Decision

`Pass`

## Findings

None open. AR-001 and AR-002 are resolved; see ARCH-REV-002 in the revision record.

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Residual Risks

- RSK-001..RSK-003 as recorded. Validation must include the AC-003 probe on base and branch, the packaged app, and both Docker images.
- The root lockfile diff is large (design Risks). Code review should confirm it moves only the intended trees.
- `probes/excel-viewer-trial.diff` predates `ALLOW_DATA_ATTR: false`. Implementation follows the design example, not the diff, and the design says so.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: DS-001..DS-005 are unchanged since round 1 and still pass. DS-006 and the SR-004 requirements delta resolve AR-001 (DEC-008, aligned REQ-010/REQ-011/AC-013, `ALLOW_DATA_ATTR: false`, hyperlink spec cases) and AR-002 (CSV-via-URL case). The design is ready for implementation.
