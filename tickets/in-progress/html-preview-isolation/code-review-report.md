# Code Review Report — html-preview-isolation (autobyteus-417)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, baseline SR-002, SR-003 wording)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (via design-spec citations)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `evidence/preview-probe/` (evidence only)
- Relevant Solution Revision IDs: `SR-003`
- Design Review Report Reviewed As Context: `design-review-report.md` (`Pass`; residual risks R-1…R-4, MP-001)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete, IR-001, code commit `cdba18ba35` on `codex/html-preview-isolation` (base `ff68bfb5fa`; ticket docs `102b15323d`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes` (High)
- Classification evidence or correction required: Confirmed. Two production files, +5/−5 effective lines; security-boundary change (iframe sandbox, new response header on a node route). No escalation trigger fired: `<iframe` in `autobyteus-web` is only `HtmlPreviewer.vue` and `ApplicationIframeHost.vue`; `/static/` has one web consumer (`HtmlPreviewer.vue:38`); Origin rule, Electron shell, `ApplicationIframeHost`, `/content` untouched.

## Review Scope

- Changed implementation and behavior reviewed: `git diff ff68bfb5fa cdba18ba35` — sandbox attribute, Blob content, static-route CSP header, both spec changes, both docs.
- Files / areas reviewed: `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` (+ spec), `autobyteus-server-ts/src/api/rest/workspaces.ts` (+ `tests/unit/api/rest/workspaces.test.ts`), `autobyteus-web/docs/file_explorer.md`, `autobyteus-web/docs/content_rendering.md`; neighbours read for impact: `FileExplorerTabs.vue` (FileViewer key), server `addHook` sites (no global `onSend`/CSP that could override or duplicate the header), `tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` (static route consumer; asserts status/type/body only, unaffected by the header).
- Explicit exclusions: IMP-08 harness and `evidence/` (evidence, not product source). Recorded checks IMP-01…08 were not rerun: the code they exercise has not changed since (`cdba18ba35`).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — opaque origin for every HTML preview (REQ-001…003), preview keeps classic scripts/CSS/images/CDN (REQ-004), static route isolated wherever opened (REQ-005), DEC-001 option A losses documented (REQ-006), application iframes unchanged (REQ-007).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-001, `Pass`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: R-3 (preview refresh on file change for the workspace path) — a pre-existing basis question already raised by implementation to the Solution Designer and flagged by the architecture review; the diff does not touch the refresh path. See CAND-04.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `HtmlPreviewer.vue:8` `sandbox="allow-scripts"`; static URL `HtmlPreviewer.vue:31-39`; `workspaces.ts:88` header on success reply; IMP-08 origin `null`, relative classic/CSS/PNG load, module/fetch blocked | — |
| BEH-002 | Confirmed | `buildBlobUrl` `HtmlPreviewer.vue:41-50`, Blob = `props.content` only; same iframe attribute; IMP-08 parent/preload/storage `SecurityError`, no IPC | — |
| BEH-003 | Confirmed | Same component on phone Artifacts path (`MobileArtifacts` → `ArtifactContentViewer` → `FileViewer` → `HtmlPreviewer`); phone probe is API/E2E's (AC-006) | — |
| BEH-004 | Confirmed | `ApplicationIframeHost.vue` untouched; IMP-05 | — |
| BEH-005 | Confirmed (for what the diff touches) | No sandbox flags added; revoke paths unchanged (spec "revokes Blob URLs…") ; refresh on workspace path pre-existing, unchanged (R-3) | — |
| BEH-006 | Confirmed | Header on every successful static reply regardless of MIME; unit tests on HTML and CSS; IMP-08 top-level origin `null` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, 005, 006 | User | User | See workspace HTML | Files area, preview mode | Normal | DS-001 | Renders, isolated | requirements, design, code | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, 003 | User | User | See artifact/reference HTML | Artifacts, references, phone Artifacts | Normal | DS-002 | Renders, isolated | same | Supported Normal Scenario | Use |
| SCN-003 | BEH-002 | User | User | See local HTML file | Desktop window | Normal | DS-002 | Renders, isolated | same | Supported Normal Scenario | Use |
| SCN-004 | BEH-001…003 | User | Untrusted HTML author | Use app rights | Any of the above | Explicit Edge | DS-001/002 → DS-003 | All refused | Task security contract; probe | Supported Explicit Edge Scenario | Use |
| SCN-005 | BEH-004 | User | User | Use applications/viewers | Applications, other viewers | Normal | unchanged | Unchanged | code | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-01 | CSP header also lands on non-HTML assets (CSS, JS, PNG) | SCN-001, REQ-004, REQ-005 | User previews workspace page with relative assets | Static route → asset reply with CSP; CSP `sandbox` only affects documents | IMP-08: CSS applied, classic JS ran, PNG `loaded 3x3` with the header on 12/12 replies | Reject | — | No consequence; design D2 intends header on every served file |
| CAND-02 | Header set before `reply.send(stream)`; a late stream error could carry CSP on a 500 | Engineering contract (header "on success only") | Stream read error after existence check (e.g. file removed/permission change between stat and read) | Fastify error reply with CSP | Code `workspaces.ts:84-90`; handoff Important Assumptions | Reject | — | Race requires artificial timing; and a CSP sandbox on an error body is harmless. No machinery warranted |
| CAND-03 | Another consumer of `/static/` or another preview iframe would be affected/uncovered | Design escalation trigger | — | — | grep: `/static/` used only by `HtmlPreviewer.vue:38` and server tests; `<iframe` only in `HtmlPreviewer.vue`, `ApplicationIframeHost.vue`; no global `onSend` hook in server `src/` | Reject | — | Not reachable |
| CAND-04 | Workspace preview does not reload on file content change (`FileExplorerTabs.vue:31,177` key `[currentWorkspaceId, activeFile]`; `updateSrc` reassigns same URL) vs BEH-005/AC-004 "refreshes" | REQ-004, AC-004, BEH-005 | User edits the open workspace HTML | Pre-existing; unchanged by this diff (same-origin flag never affected reload) | Code read; ARCH-REV R-3; IMP R-3 | Hold for Evidence | — | Not caused by this change and not measured yet; already raised to the Solution Designer as a basis question by implementation; API/E2E checks AC-004 refresh. Does not affect this source review |
| CAND-05 | Test pins header literal `"sandbox allow-scripts"` instead of importing the constant | Engineering contract | — | — | `workspaces.test.ts` new `describe` | Reject | — | Literal is the route's observable contract; constant is module-private by design |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Local Implementation Defect; one attribute + one header in existing owners | None |
| Matches approved behavior-defining supplements | Pass | None exist; probe is evidence only | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/DS-002/DS-003 unchanged in shape; only flags/header changed | None |
| Ownership boundary preservation and clarity | Pass | Iframe sandbox stays in `HtmlPreviewer`; document sandbox in the static route | None |
| Off-spine concern clarity | Pass | None added | None |
| Existing capability reuse | Pass | Platform `sandbox` + CSP; 403 gate reused | None |
| Reusable owned structures | Pass | No repeated structure; two-layer literal justified (design Key Tradeoffs) | None |
| Shared-structure tightness | Pass | N/A — no shared structure | None |
| Repeated coordination ownership | Pass | No repeated policy | None |
| Empty indirection | Pass | None | None |
| Separation of concerns / file responsibility | Pass | Each change in its owning file | None |
| Ownership-driven dependency | Pass | No new imports or cross-package coupling | None |
| Authoritative Boundary Rule | Pass | No caller bypass introduced | None |
| File placement | Pass | No files added/moved | None |
| Flat-vs-over-split layout | Pass | N/A | None |
| Interface boundary clarity | Pass | Static route contract: bytes + MIME + CSP on success; errors unchanged; matches design Interface Boundary Mapping | None |
| Naming quality / one vocabulary | Pass | `PREVIEW_DOCUMENT_SANDBOX` per design naming check; comment states intent | None |
| No unjustified duplication | Pass | — | None |
| Patch-on-patch complexity | Pass | Initial round, minimal delta | None |
| Dead code removed in touched files | Pass | `baseUrl`/`<base>` removed; remaining imports (`nextTick`, `computed`, `watch`) used | None |
| Test scenarios/assertions clear and requirement-aligned | Pass | Web: exact `allow-scripts` on both paths (AC-001), Blob text equals content; server: header on HTML and CSS (AC-005), absent on 404/400/404 and `/content` (design: error replies and `/content` unchanged). IMP-04 shows new assertions fail on base | None |
| Fixtures/helpers reusable, structure coherent | Pass | Nested `describe` with own tmp root + cleanup; follows file's `inject` pattern | None |
| No stale/duplicated/compat-only tests | Pass | Old `allow-scripts allow-same-origin` assertion replaced | None |
| API/E2E readiness | Pass | Handoff lists AC-002/003/004/006/007 for API/E2E with reusable synthetic pages and R-1/R-3 hints | None |

## Source File Size And Structure Audit

| Source File | Non-Empty Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | 71 | 69 | Pass | Pass | Pass | Pass | Clean | None |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | 88 | 92 | Pass | Pass | Pass | Pass | Clean | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No per-path exception kept for `allow-same-origin` |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | `<base>` prefix removed |
| Persisted-data decision followed | Pass | `Not Affected` |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` — done in this change.
- Why: the HTML Preview Resource Contract described `allow-scripts allow-same-origin` and the Blob-base limitation.
- Files: `autobyteus-web/docs/file_explorer.md`, `autobyteus-web/docs/content_rendering.md` — both now state the opaque origin, the CSP header, what pages can and cannot do (matches DEC-001 losses), and the no-base Blob. Release notes are delivery's.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | Unchanged; no route or gate change in the diff |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: `9.6/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | Both preview spines keep their shape; change sits at the nodes the design names | Nothing material | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.7 | Web owns iframe sandbox, node owns its documents' sandbox; independent layers as designed | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Static route contract extended by one header on success only; tested both ways | Header literal duplicated in test (intentional contract pin, CAND-05) | — |
| 4 | Separation of Concerns and File Placement | 9.7 | No new files; changes in owning files | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | No shared structure; two-layer literal justified | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Constant name and comment state intent clearly | — | — |
| 7 | API/E2E Readiness | 9.5 | Clear remaining ACs, reusable synthetic pages, R-1 closed at render layer | Refresh (R-3) still to be measured | API/E2E checks AC-004 refresh |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.6 | Real Electron (both versions) shows opaque origin, blocked parent/preload/storage, assets load; new tests fail on base | Real app shell / phone not yet exercised (API/E2E's layer) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Clean cut; no per-path exception | — | — |
| 10 | Cleanup Completeness | 9.7 | Dead `<base>` removed; docs updated | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-001, FU-002 already recorded upstream).

## Classification

N/A — `Pass`.

## Recommended Recipient

API/E2E engineer (primary pass rule); implementation engineer informational.

## Residual Risks

- R-3 / CAND-04: workspace preview refresh on file change appears not to happen today (pre-existing, unchanged here); basis question with the Solution Designer; API/E2E should measure AC-004 refresh on both paths.
- AC-002/003/004/006/007 on the real worktree build (isolated desktop instance, phone web app with stored credential, node gate refusals) remain API/E2E's.
- RSK-001, FU-001, FU-002 as recorded upstream.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.6/10; every category ≥ 9.5
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: Small/High confirmed. CRR-001.
