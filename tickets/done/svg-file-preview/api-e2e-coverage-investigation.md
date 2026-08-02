# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/svg-preview-ui-ux-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Execution Coverage Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002` — proportional-review correction verification; `API-REV-001` remains the initial affected-scope validation result
- Current Investigation Round: 2 — post-review local test-code correction and focused rerun
- Trigger: `code_reviewer` CRR-003 Pass; API/E2E coverage and execution authorized
- Prior Investigation Reviewed: None. No prior API/E2E coverage investigation, execution report, or revision record exists; absence is not treated as a prior pass or confidence value.
- Latest Authoritative Investigation: This file after the durable coverage decisions and completed execution updates; the execution report and revision record are the companion result records.

## Current Requirement And Design Basis

The approved change is a one-line extension of the authoritative frontend
filename policy: `.svg` belongs to the existing `Image` family. The existing
File Explorer store and `FileViewer -> ImageViewer` path must render lower- and
upper-case workspace SVGs without sending them to a text reader. The same policy
must make eligible absolute SVG paths and empty-authority absolute `file:` links
into the existing opt-in Event Monitor actions. Explicit click, Enter, and Space
activation must use the existing launcher, preserve the feed, open the right-side
panel with Files active, retain read-only intent, and focus the active file tab.

The clarified scope also requires an available SVG selected from the right-side
Artifacts tab to use the existing `ArtifactContentViewer` metadata-first or
shared-policy fallback classification, authorized
`/runs/:runId/file-change-content` bytes, blob URL lifecycle, and shared
`FileViewer -> ImageViewer` dispatch. Pending, streaming, failed, deleted,
unavailable, non-SVG, authorization, and read-only behavior must remain intact.
The shared policy is also consumed by team-reference and mobile read-only
consumers; this is an intentional inherited consequence that must be checked,
not silently assumed.

Critical criteria for this investigation are AC-001 through AC-007 for the
policy, workspace, Event Monitor, safety, shared viewer, and interaction paths;
AC-009 and AC-010 for the Artifacts-tab metadata/fallback and lifecycle paths;
and AC-008 for delivery-owned documentation (tracked here as a downstream
handoff dependency, not an API/E2E code change). The approved persisted-data
outcome is `Not Affected`; no migration, compatibility reader, schema change,
or byte rewrite is expected.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / REQ-001, REQ-002 — shared policy and workspace Files | Changed | `requirements-doc.md`, `design-spec.md` DS-001/DS-003, IR-002, CRR-003 | Recheck lower/upper/nested SVG policy, store mode/type, remote workspace URL, and ImageViewer dispatch; retain negative archive/binary matrix. |
| BEH-002 / REQ-003, REQ-005 — Event Monitor | Changed | `requirements-doc.md`, UI UXJ-002, design DS-002, CRR-003 | Recheck bare path and `file:` action eligibility plus real renderer click/Enter/Space semantics, feed stability, right-panel/Files activation, read-only intent, and active-tab focus. |
| BEH-003/BEH-005 / REQ-004 — viewer and content boundaries | Preserved with newly reachable SVG input | design DS-003; implementation handoff; CRR-003 | Exercise MIME/bytes at workspace REST, run-file-change, and trusted Electron local-file boundaries; verify no raw text read, unauthenticated URL, or inline SVG DOM path. |
| BEH-004 / AC-001, AC-005 — conservative negative policy | Preserved | requirements and implementation handoff | Keep unsupported archives, installers, bundles, binaries, unknown paths, invalid URI/path candidates inert and content-free. |
| BEH-006 / REQ-007 — right-side Artifacts tab | Changed | requirements, UI UXJ-003, design DS-005, ARCH-REV-002, IR-002, CRR-003 | Add durable SVG metadata-first and path-fallback assertions, authorized route/blob evidence, and lifecycle cleanup/regression checks. |
| Shared-policy inherited team-reference consumers | Changed by intended shared-policy inheritance | investigation notes; design ownership map | Validate communication/task reference fallback for SVG and authorized blob/read-only viewer behavior; no stale “SVG must be unsupported” assertion is allowed. |
| Shared-policy inherited mobile consumers | Changed by intended shared-policy inheritance | requirements risks; mobile source/tests | Validate mobile artifact fallback and mobile workspace Image viewer acceptance; preserve active mobile credential and unsupported behavior. |
| Persisted data / API schema | Preserved | requirements persisted-data outcome; implementation handoff | No migration or compatibility coverage; test normal readers/routes with existing-shaped fixtures only. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? (`Yes`/`No`) | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes, indirectly | Existing artifact extension inference and generic MIME lookup are newly exercised for SVG; no production backend source changed. | `autobyteus-server-ts/src/utils/artifact-utils.ts`; `tests/unit/utils/artifact-utils.test.ts`; route tests. | Existing tests lack SVG MIME/type assertions. | Live route injection with real temporary SVG bytes. |
| API / transport / contract | Yes, newly reachable | Existing workspace REST and run-file-change REST content routes; trusted Electron local-file response. | PNG/media route tests and path-boundary tests exist; Electron local response tests cover generic MIME/ranges. | No existing SVG `image/svg+xml` byte assertion; auth/containment needs correlation. | Live API/route execution and Electron protocol-focused execution. |
| Frontend component / state | Yes | Shared `fileTypePolicy.ts` changes classification; existing store, FileViewer, ArtifactContentViewer, team reference, and mobile adapters are consumers. | Focused policy/action/store/viewer/artifact/mobile/team tests now directly cover SVG; source traces confirm one shared owner. | Full authenticated app state is not exercised by the temporary browser fixture. | Completed Nuxt Vitest component/store suites plus Chromium probe. |
| Browser integration / user journey | Yes | Existing web-equivalent UI: Markdown/Event Monitor action DOM, right panel activation/focus, Files/Artifacts viewers, image decode/error. | MarkdownRenderer tests cover generic click/keyboard behavior; implementation browser shell attempt had no backend and is not acceptance evidence. | No SVG-specific click/keyboard/focus execution and no real `<img>` decode/error evidence. | Targeted browser probe against a temporary deterministic fixture plus live app checks where setup permits. |
| Authentication / session / permissions | Yes, preserved boundary | `authorizedFetch`/mobile credential and existing workspace/run authorization remain owners. | Team/mobile component tests assert bearer credentials; route tests exercise containment but not full auth middleware. | No new auth contract; live client credential path is not yet run for SVG. | Live API/browser only if safe deterministic credential setup is available. |
| Desktop renderer / web-equivalent UI | Yes | Browser renderer uses the same Vue `FileViewer`/`ImageViewer`; no template/source change. | `FileViewer.spec.ts`, MarkdownRenderer tests, existing browser probes. | Browser `<img>` success and malformed SVG error behavior are not proven by happy-dom. | Browser probe; do not claim Electron shell proof from browser alone. |
| Desktop shell / Electron-specific integration | Yes, only at preserved transport boundary | `local-file://` response MIME/byte validation is newly used for SVG; no Electron source changed. | `local-file-response.spec.ts`, local validation/protocol lifecycle tests. | Actual packaged application/window IPC lifecycle is not material to this one-line renderer policy change. | Electron Vitest protocol response checks; actual desktop app is last resort and not planned unless a material gap appears. |
| Process / lifecycle | Yes for transient URL cleanup and artifact state | ArtifactContentViewer creates/revokes blob URLs and handles pending/streaming/failed/deleted transitions. | ArtifactContentViewer tests cover SVG metadata/fallback cleanup plus existing status/retry/deleted cases; launcher focus is covered directly. | Packaged Electron window lifecycle and the unrelated watcher runtime remain unexercised. | Completed Nuxt lifecycle tests; browser observation; server watcher suite recorded as partial. |
| Persisted-data transition | No | No stored shape, file bytes, or schema changes; transient preview state only. | Requirements/design/implementation persisted-data checks all say `Not Affected`. | None material; no migration scenario exists. | No migration run; normal existing fixture reads suffice. |
| Worker / queue / distributed coordination | No | No worker/queue/node coordination changed. | No relevant production diff. | None for this scope. | Not required. |
| External integration | No | No external service or provider changed. | No relevant production diff. | None for this scope. | Not required. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview`
- Project type and runtime stack: pnpm TypeScript monorepo; Nuxt/Vue frontend with Vitest and Nuxt test utilities; Fastify/REST/GraphQL Node server with Vitest; Electron main/local-file protocol tests; Playwright Core browser probes.
- Conflicting, missing, or unclear project instructions: No conflicting instructions found. The frontend and server each have local `AGENTS.md`; root and frontend READMEs define test and browser-probe commands. The implementation handoff's prior browser attempt lacked a backend, so it is retained as a limitation rather than reused as pass evidence.
- Required environment variables or secrets available: `N/A` for focused repository checks; live browser/API setup should use isolated temporary data and no secret values. Mobile component tests use deterministic fake credentials only.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/README.md` | Monorepo setup and package commands | `pnpm install`; root e2e scripts; do not alter unrelated shared resources. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/AGENTS.md` | Frontend testing/release rules | Colocated Vitest tests; use `pnpm test:nuxt --run`; `pnpm test:electron` for Electron tests. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/README.md` | Frontend test and browser probe execution | Specific file command with `--run`; browser responsive probe requires a started frontend/backend target and Playwright Core. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/vitest.config.mts` | Nuxt test configuration | Nuxt/happy-dom environment, localization/websocket setup, excludes Electron/server tests. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/electron/vitest.config.ts` | Electron test configuration | Node environment; includes Electron tests only. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/AGENTS.md` | Server test commands | `pnpm -C autobyteus-server-ts exec vitest`; integration subset with `vitest run ... --no-watch`; single tests with `--no-watch`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/vitest.config.ts` | Server test configuration | Node/fork pool, no file parallelism, `tests/**/*.test.ts`, Prisma setup/global setup. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/tests/e2e/*.mjs` | Existing browser probe conventions | Playwright Core; owned process cleanup and evidence output; use a temporary fixture route only when it is not appropriate to add durable product coverage. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Frontend Nuxt test runner | `autobyteus-web` | `pnpm test:nuxt --run <paths>` | Uses installed pnpm dependencies and happy-dom. | Vitest exits with result summary. | Process exits after run. |
| Electron local-file tests | `autobyteus-web` | `pnpm test:electron --run electron/local-file-protocol/__tests__/local-file-response.spec.ts` (or direct config invocation) | Node-only protocol response functions; no packaged app needed. | Vitest exits with result summary. | Process exits; temp files removed by test hooks. |
| Server unit/integration/e2e route tests | repository root or `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch` | Fastify inject / temporary workspace and app-data directories; no external server required. | Test process and route assertions. | Test hooks close Fastify and remove temp dirs. |
| Browser probe (if run) | `autobyteus-web` | Existing probe conventions; temporary fixture route and `pnpm dev --host 127.0.0.1 --port <owned-port>` | Use a unique owned port/output directory; no user desktop app interaction. | HTTP readiness and semantic DOM assertions. | Kill only owned process/group; remove temporary route and evidence only if not retained. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Valid SVG bytes | Inline minimal SVG string in test temp files (`image/svg+xml`) | Deterministic, no external asset or network dependency. | Test hooks remove temp roots. |
| Malformed SVG bytes | Inline malformed `<svg` or invalid XML bytes at an image URL/response | Proves existing image decode error path only; must not introduce a parser or fallback. | Browser fixture/object URL released after probe. |
| Workspace/run artifact | Existing server route projection stubs or isolated temporary workspace/app-data dirs | No production data; paths are created under OS temp dirs. | Fastify close and recursive temp cleanup in hooks. |
| Mobile credential | Existing fake `mra_secret` test session | Test-only deterministic bearer value; no real identity. | Pinia/session reset and global mocks restored. |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` Persisted Data / State Transition Decision; `implementation-handoff.md` Persisted Data Transition Check; IR-002.
- Representative existing-data setup and required behavior: Existing-shaped workspace files, run-file-change projection rows, artifact metadata, team/mobile reference records remain readable by current readers. No stored record is changed.
- Evidence planned for the approved direct-use, discard/rebuild, or migration outcome: Exercise existing readers/routes with temporary current-shaped SVG files and existing text/non-SVG status rows; do not add migration or compatibility branches.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: Not applicable.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/utils/fileExplorer/__tests__/fileUtils.test.ts` — policy matrix | Image/text/audio/video/Excel/PDF classification, SVG lower/upper/nested cases, unsupported archive/binary negatives | AC-001, AC-005; DS-004 | Still Valid | Existing test already contains `diagram.svg`, `DIAGRAM.SVG`, nested SVG, and negative archive/binary assertions. | Rerun; no removal. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` — action policy | Bare and `file:` SVG action type plus invalid/inert URI/path matrix | AC-001, AC-003, AC-004, AC-005, AC-007; DS-002/DS-004 | Still Valid | Existing test contains uppercase SVG URI and action creation `previewType: Image`, plus unsupported and malformed URI cases. | Rerun; extend only if execution identifies a real gap. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts` — shared dispatch | Generic `Image` state mounts `ImageViewer` with URL; text dispatch and error/loading states | AC-002, AC-006; DS-003 | Still Valid | Explicit `diagram.SVG` path now proves the same shared ImageViewer branch; final focused run passed. | Updated and rerun; retain generic branch coverage. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/stores/__tests__/fileExplorerNodeRouting.spec.ts` — store/content routing | Remote workspace media URL, Electron local-file URL, no content access for Unsupported, text-reader path | AC-002, AC-004, AC-005, AC-006; DS-001/DS-003 | Still Valid | Representative remote, trusted-local, and embedded SVG paths now carry through existing URL branches; final focused run passed. | Updated and rerun; classifier remains mocked to isolate routing while policy tests prove classification. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` — action DOM | Opt-in action rendering, click, Enter/Space, invalid/inert paths, label/focus-related attributes | AC-003, AC-004, AC-007; DS-002 | Still Valid | SVG controls now assert role/labels/URLs and click, Enter, Space emission; actual focus handoff is proven by the launcher test and Chromium probe. Final focused run passed. | Updated and rerun; happy-dom-only `activeElement`/`tabIndex` assertions were removed because that environment did not model the browser focus contract. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/composables/__tests__/useEventMonitorFilePreview.spec.ts` — launcher/focus handoff | SVG Event Monitor launch opens the active workspace Files panel and focuses the active file tab with read-only intent | AC-003, AC-007; DS-002 | Still Valid | New focused durable test passed and asserts launcher arguments, panel activation, Files tab, and deferred focus. | Added and rerun; this is the durable focus proof that happy-dom Markdown rendering cannot provide. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` — Artifacts adapter | Text/media fetch, authorized URL shape, pending/409, failed, 404/deleted, retry, PNG blob URL cleanup, read-only FileViewer prop wiring | AC-009, AC-010; DS-005 | Still Valid | Metadata-first and shared-policy fallback SVG cases now assert MIME-independent blob dispatch, authorized route, read-only state, and revoke-on-unmount; lifecycle regression tests remain. Final focused run passed. | Updated and rerun; retain status and cleanup matrix. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/workspace/agent/__tests__/ArtifactsTab.spec.ts` and `ArtifactList.spec.ts` | Right-side tab selection, row selection, same-row refresh, newest artifact selection, keyboard row navigation | AC-009, AC-010; UXJ-003 | Still Valid | These tests assert the selection/adapter handoff and lifecycle-neutral list behavior, not extension policy. | Rerun; no SVG-specific list branch is needed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/tests/unit/utils/artifact-utils.test.ts` | Server artifact type inference for existing image/audio/video/PDF/spreadsheet and unknown types | AC-009; DS-005 | Still Valid | Lower- and upper-case SVG inference is now explicit; final server unit run passed. | Updated and rerun; retain the broader inference matrix. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/tests/unit/api/rest/run-file-changes.test.ts` | Fastify route streams text and binary bytes, MIME, cache header, missing/pending/history failures | AC-009, AC-010; DS-003/DS-005 | Still Valid | SVG bytes and `image/svg+xml` are asserted alongside existing route failures; final isolated unit run passed. The test mocks only the unrelated projection-service class to avoid Vitest/Prisma externalization. | Updated and rerun; retain failure/lifecycle cases. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` | Real workspace route streams encoded PNG and rejects sibling/absolute traversal | AC-002, AC-004, AC-006; DS-003 | Still Valid | A real temporary SVG file now proves `image/svg+xml` and exact bytes through Fastify; focused and broader file-explorer runs passed this file. | Updated and rerun; retain traversal tests. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/electron/local-file-protocol/__tests__/local-file-response.spec.ts` | Trusted local-file regular-file validation, MIME, bytes, ranges, HEAD, malformed URL, cleanup | AC-004, AC-006; DS-003 | Still Valid | Minimal SVG response now asserts status, MIME, no-store, and exact bytes; final Electron boundary run passed. | Updated and rerun; no packaged Electron run is required. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/electron/__tests__/localFileValidation.spec.ts` and local-file protocol lifecycle spec | Trusted capability/regular-file and fail-closed protocol gate | AC-004, AC-006; DS-003 | Still Valid | Validation is extension-independent and no source change touches the gate. | Rerun; no SVG-specific branch exists to add. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts` | Mobile artifact fetch through active credential, text/PDF selection, blob URL, FileViewer type | Shared-policy inheritance; AC-009/AC-010; mobile UX | Still Valid | Available SVG fallback now proves active credential, authorized URL, blob/Image selection, and cleanup while preserving initial artifact selection. Final inherited-consumer run passed. | Updated and rerun; retain active credential and read-only assertions. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/mobile/__tests__/MobileFileViewer.spec.ts` | Mobile read-only Image/Audio/Video/PDF/Excel viewer routing and attach affordance | Shared-policy inheritance; AC-004/AC-006 | Still Valid | Image matrix now includes `images/diagram.svg`; final inherited-consumer run passed. | Updated and rerun; no mobile layout fork is needed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts` | Team communication reference authorized text/media fetch, blob URL, errors, read-only/preview controls | Shared-policy inheritance; AC-004/AC-006 | Still Valid | Fallback `type: file` SVG now proves authorized route, blob URL, Image dispatch, read-only state, and cleanup. Final inherited-consumer run passed. | Updated and rerun; no SVG-specific branch was introduced. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Task reference route and text content loading | Shared-policy inheritance; AC-004/AC-006 | Still Valid | Fallback uppercase SVG now proves shared policy, authorized blob fetch, Image dispatch, read-only state, and cleanup. Final inherited-consumer run passed. | Updated and rerun; no duplicate lifecycle matrix was added. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/tests/e2e/*.mjs` existing responsive/diagram probes | Browser shell/responsive and diagram viewer behavior | General browser confidence, not SVG acceptance | Out Of Scope | Existing probes do not mount the affected File Explorer/Event Monitor/Artifact journey; they remain useful unrelated regressions. | Do not alter; use a temporary targeted probe if browser evidence is needed. |

## Stale Or Obsolete Coverage Decisions

No existing test asserts that SVG must remain Unsupported. No durable coverage is
stale or eligible for removal. Unsupported archive/binary/invalid-path cases are
approved current behavior (AC-004/AC-005), not legacy retention.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | None | The change adds SVG to Image and does not remove any supported family or failure state. | Requirements, design, IR-002, CRR-003 | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Artifact / Path | Why Durable Coverage Is Needed / Final Evidence |
| --- | --- | --- | --- | --- |
| SVG-COV-001 | Artifact metadata-first SVG -> authorized blob -> shared ImageViewer | BEH-006, REQ-007, AC-009/AC-010, DS-005 | Existing `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | The clarified explicit product journey was not present as a durable SVG assertion; metadata path must not regress. |
| SVG-COV-002 | Artifact shared-policy fallback SVG -> authorized blob -> shared ImageViewer and cleanup | BEH-006, AC-009/AC-010, DS-005 | Same ArtifactContentViewer spec | The one-line policy change specifically closes this fallback gap; durable coverage must protect it. |
| SVG-COV-003 | Workspace REST SVG MIME/bytes | BEH-001/BEH-005, AC-002/AC-004/AC-006, DS-003 | Existing `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` | Proves real workspace containment/MIME boundary, not only mocked URL construction. |
| SVG-COV-004 | Run-file-change SVG MIME/bytes | BEH-006/BEH-005, AC-009/AC-010, DS-003/DS-005 | Existing `autobyteus-server-ts/tests/unit/api/rest/run-file-changes.test.ts` | ArtifactContentViewer consumes this route; PNG-only coverage leaves SVG content contract unproved. |
| SVG-COV-005 | Trusted Electron local-file SVG MIME/bytes | BEH-005, AC-004/AC-006, DS-003 | Existing `autobyteus-web/electron/local-file-protocol/__tests__/local-file-response.spec.ts` | Confirms local media branch is MIME-correct without running a packaged app. |
| SVG-COV-013 | Event Monitor launcher opens Files and focuses the active file tab with read-only intent | BEH-002, AC-003/AC-007, DS-002 | New `autobyteus-web/composables/__tests__/useEventMonitorFilePreview.spec.ts` | The renderer action test cannot reliably model browser focus in happy-dom; the launcher owns the panel/tab/focus handoff and needs a direct durable assertion. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| SVG-COV-006 | `fileUtils.test.ts` and `absoluteFilePathAction.spec.ts` existing SVG cases | Recheck only unless execution exposes a gap | AC-001, AC-003, AC-005, AC-007 | Updated by implementation and source-reviewed; final focused run passed and no duplicate test was needed. |
| SVG-COV-007 | `FileViewer.spec.ts` Image dispatch | Use explicit `diagram.SVG` path and assert shared ImageViewer props | AC-002, AC-006, DS-003 | Keeps generic Image branch while naming SVG. |
| SVG-COV-008 | `fileExplorerNodeRouting.spec.ts` remote/local media cases | Use representative SVG paths in remote and trusted local cases | AC-002, AC-004, AC-006, DS-001/DS-003 | Test still mocks classifier to isolate routing; policy test supplies classification proof. |
| SVG-COV-009 | `MarkdownRenderer.spec.ts` action semantics | Add SVG action through actual DOM for click, Enter, Space and label/focus attributes | AC-003, AC-007, DS-002 | Existing generic semantic test remains; new case binds the changed family to the contract. |
| SVG-COV-010 | Server `artifact-utils.test.ts` | Add lower/upper SVG inference | AC-009, DS-005 | Production inference is unchanged but must be executable evidence. |
| SVG-COV-011 | `MobileArtifactsContentViewerIntegration.spec.ts`, `MobileFileViewer.spec.ts` | Add SVG fallback/artifact and workspace Image representative | Shared-policy inheritance; AC-006/AC-009 | Retain active mobile credential assertions and read-only state. |
| SVG-COV-012 | Team communication/task reference specs | Add type-file SVG fallback cases | Shared-policy inheritance; AC-006 | Do not add an SVG-specific branch; verify existing route/blob/viewer adapters. |

## Durable Coverage To Remove

None. No obsolete assertion or compatibility-only test exists.

## Durable Coverage Change Result

- Completed before final execution: `SVG-COV-001` through `SVG-COV-005` were added to existing owner-local suites; `SVG-COV-006` was rechecked; `SVG-COV-007` through `SVG-COV-012` were updated; and `SVG-COV-013` was added as a focused launcher/focus test.
- No durable coverage was removed or replaced. Unsupported archive/binary/invalid-path cases remain current safety behavior.
- Every listed durable change is in the following package and must receive proportional test-code review before delivery:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/fileExplorer/__tests__/FileViewer.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/stores/__tests__/fileExplorerNodeRouting.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/composables/__tests__/useEventMonitorFilePreview.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/tests/unit/utils/artifact-utils.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/tests/unit/api/rest/run-file-changes.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/electron/local-file-protocol/__tests__/local-file-response.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/mobile/__tests__/MobileFileViewer.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts`
- The two implementation/source-review tests remain relevant cumulative coverage and were rerun unchanged: `fileUtils.test.ts` and `absoluteFilePathAction.spec.ts`.

## Repository Coverage Execution Plan And Results

The investigation was written before durable edits. Execution then proceeded
narrowest-first, with each final result recorded below. The initial failures
were local test/assertion or module-resolution issues and were corrected before
the final result; unrelated broad-suite failures remain explicitly classified
instead of being treated as SVG regressions.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt --run utils/fileExplorer/__tests__/fileUtils.test.ts utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts components/fileExplorer/__tests__/FileViewer.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts composables/__tests__/useEventMonitorFilePreview.spec.ts` | `autobyteus-web`, Nuxt Vitest | Policy, action eligibility, launcher focus, store URL branches, shared ImageViewer dispatch | `Pass` — 5 files / 83 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/01-web-core-rerun.log`; first run's stale local expectation and correction are in `01-web-core.log`. |
| 2 | `pnpm test:nuxt --run components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts components/workspace/agent/__tests__/ArtifactList.spec.ts` | `autobyteus-web`, Nuxt Vitest | Event Monitor SVG DOM activation and Artifacts metadata/fallback/blob/lifecycle behavior | `Pass` — 4 files / 45 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/02-web-event-artifact-final.log`; initial happy-dom focus assertion corrections are retained in `02-web-event-artifact.log` and `02-web-event-artifact-rerun.log`. |
| 3 | `pnpm test:nuxt --run components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | `autobyteus-web`, Nuxt Vitest | Inherited mobile/team-reference policy, credential/auth URL, blob/read-only paths | `Pass` — 4 files / 23 tests; proportional-review title correction rerun has the same result | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/03-web-inherited-consumers.log` and `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/03-web-inherited-consumers-rerun.log` |
| 4 | `pnpm test:electron --run electron/local-file-protocol/__tests__/local-file-response.spec.ts electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/__tests__/localFileValidation.spec.ts` | `autobyteus-web`, Electron Vitest config | Trusted local-file SVG MIME/bytes, ranges, validation, fail-closed gate | `Pass` — 3 files / 19 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/04-electron-boundary.log` |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/utils/artifact-utils.test.ts tests/unit/api/rest/run-file-changes.test.ts --no-watch` | Repository root, server Vitest; `prisma generate` completed before rerun | Artifact inference and run-file-change SVG MIME/bytes/status route | `Pass` — 2 files / 7 tests | Final `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/05-server-unit-rerun.log`; initial Vitest/Prisma ESM-CJS externalization failure is `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/05-server-unit.log`. The durable route unit test isolates the unrelated projection-service import with a narrow Vitest mock. |
| 6 | Documented server command plus targeted reruns: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts tests/integration/api/run-file-changes-api.integration.test.ts --no-watch`; targeted integration `-t "hydrates unified rows through GraphQL and serves current text/media bytes through the run-scoped route"`; targeted workspace REST test | Repository root, temporary inline Vitest config for integration/e2e dependency resolution; temporary config removed after execution | Real workspace containment/MIME/bytes and run-file-change GraphQL/REST current text/media route | `Pass` for affected SVG boundary — targeted integration 1 test and workspace e2e 5 tests passed. The default command failed before tests on Prisma externalization; the broader integration file had 4/5 passing and 1 unrelated legacy team-metadata fixture failure. | Initial setup `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/06-server-api-e2e.log`; targeted integration `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/06-server-integration-targeted.log`; workspace e2e `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/09-server-file-explorer-e2e.log`; broader integration result `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/06-server-integration-inline-after-generate.log`. |
| 7 | `pnpm test:nuxt --run components/fileExplorer/__tests__/FileExplorerTabs.spec.ts components/fileExplorer/__tests__/FileItem.spec.ts` | `autobyteus-web`, Nuxt Vitest | Existing tab/focus/loading shell and file-row regression | `Pass` — 2 files / 9 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/07-web-shell-regression.log` |
| 8 | `pnpm test:nuxt --run` | `autobyteus-web`, Nuxt Vitest | Broader frontend regression after durable coverage edits | `Affected scope Pass; broader baseline has unrelated failures` — 391/400 files passed, 2,203/2,229 tests passed, 1 skipped, 2 unhandled errors | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/08-web-full.log`; failures are existing agent/run-history mock-shape, workspace fixture, wording, service-state, and glossary regressions, not changed SVG scenarios. |
| 9 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/file-explorer --no-watch` with temporary dependency-inline config | Repository root, server Vitest; temporary config removed | Broader affected server file-explorer/API regression and watcher lifecycle | `Partial` — workspace REST file passed (5/5); 4 files / 13 tests passed, 2 existing watcher lifecycle tests failed with `WATCHER_UNAVAILABLE` because the watcher runtime entrypoint was absent | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/09-server-file-explorer-e2e-full.log` |
| 10 | `pnpm build` | `autobyteus-web`, Nuxt production build | Bundle/static generation and runtime module integration | `Pass` — client/server/prerender build completed | `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/10-web-build.log` |
| 11 | Temporary owned Nuxt fixture + real Google Chrome probe; valid/malformed SVG files, production `FileViewer`/`ImageViewer`/`MarkdownRenderer`, semantic click/Enter/Space/focus checks | `autobyteus-web`, owned random localhost port; temp route/public assets removed; dev server/browser terminated | Actual SVG decode/error, MIME-visible malformed image, Event Monitor semantics and active-tab focus handoff | `Pass` — SVG-BR-001 through SVG-BR-003; no probe failures | JSON evidence `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/11-browser-svg-probe.json`; stdout `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/11-browser-svg-probe.log`. The fixture's expected health requests to deliberately unavailable port 9 failed with `ERR_UNSAFE_PORT`; no page errors or probe failures occurred. |

## Post-Repository Confidence Scorecard (Mandatory)

The scorecard below is the final post-repository and post-browser assessment for
`API-REV-001`. It scores the affected SVG scope, not the unrelated baseline
failures recorded in the execution table.

| Confidence Category | Score (`0-100%`/`N/A`) | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `96%` | AC-001 through AC-007 and AC-009/AC-010 have direct policy, component, route, Electron, and Chromium evidence. AC-008 is explicitly delivery-owned and is not an API/E2E acceptance claim. | The temporary browser fixture did not exercise the full authenticated Artifacts tab against a live backend. | A reusable authenticated full-app fixture could raise this to complete end-to-end proof. |
| Changed-boundary execution directness | `97%` | Shared policy/action/store/viewer, launcher focus, Artifact metadata/fallback, server inference/routes, workspace REST, and Electron MIME/bytes were all directly executed. | Some adapter tests intentionally mock unrelated stores or projection dependencies to isolate the changed boundary. | A full integrated app fixture would reduce the remaining adapter isolation. |
| Cross-boundary integration realism and mock gap | `95%` | Real Fastify workspace and targeted run-file-change routes, exact bytes/MIME, Chromium image decode/error, and Electron protocol responses complement focused component tests. | Full authenticated browser-to-run-file-change-to-Artifacts flow was not available without inventing credentials or a shared backend. | Stand up the project's supported authenticated browser fixture if one becomes available. |
| Environment, configuration, identity, and fixture fidelity | `93%` | Isolated temp workspaces/app-data, generated Prisma client, deterministic SVG bytes, owned browser port/processes, and fake test credentials were used; cleanup was verified. | Server integration required temporary dependency inlining; browser health probes intentionally pointed at unavailable port 9 and did not validate production auth/session wiring. | Use a documented full server/frontend environment with deterministic auth and no temporary config workaround. |
| Failure, edge-case, lifecycle, and recovery evidence | `94%` | Unsupported/invalid path safety, route 404/409/pending/history cases, Artifact status/retry/revoke lifecycle, malformed SVG decode, and watcher regression execution are covered. | The broader watcher lifecycle suite could not start its runtime entrypoint; packaged Electron process/window lifecycle was not launched. | Restore the watcher runtime fixture and run packaged-shell lifecycle only if later source changes make it material. |
| User-surface, browser, and desktop-shell confidence | `95%` | Real Chrome proved valid and malformed `<img>` behavior plus click/Enter/Space and active-tab focus; Electron protocol tests proved shell transport MIME/bytes. | The browser probe used a temporary fixture rather than the full authenticated application; packaged Electron window lifecycle remains out of scope for the one-line policy change. | A supported full-app browser journey would close the remaining UI integration gap. |
| Durable regression coverage quality and relevance | `95%` | Narrow owner-local additions/updates cover every newly reachable SVG boundary, preserve negative/lifecycle matrices, pass focused suites/build, and introduce no removals or compatibility tests. | Newly changed test code still requires the mandated proportional `code_reviewer` test review. | Complete the downstream proportional test-code review. |

- Overall post-repository confidence: `95%` (simple average: `(96 + 97 + 95 + 93 + 94 + 95 + 95) / 7`)
- Every critical acceptance criterion directly proven: `Yes` for API/E2E-owned AC-001–AC-007 and AC-009/AC-010; AC-008 remains delivery-owned and is not silently claimed here.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes` for the affected API/E2E scope; the bounded residuals are explicit and not changed-boundary failures.
- Material residual risks: no full authenticated production-like browser/backend journey; no packaged Electron window lifecycle; two unrelated watcher runtime failures and unrelated full-suite regressions; temporary server test dependency configuration was needed only for test execution and was removed.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — completed
- Selected execution mode (`Browser`/`Live API`/`Project Desktop Validation`/`CLI`/`Lifecycle`/`Worker or Distributed`/`Other`/`None`): `Browser` plus targeted `Live API`/route execution; Electron-focused protocol tests cover the shell-specific boundary.
- Specific confidence gap or residual risk addressed: The implementation source review and happy-dom tests could not directly prove SVG `<img>` decode/error behavior, actual Event Monitor DOM activation/focus, or the real authorized workspace/run-file-change MIME/byte boundary.
- Why the selected mode can materially improve confidence: A browser observes semantic action controls, keyboard activation, panel/tab/focus behavior, and actual image load/error events; temp-file Fastify routes observe bytes, MIME, containment, and artifact lifecycle without mocks.
- Expected confidence after the selected validation: At least 95% overall with no applicable category below 90% if all critical scenarios pass and browser/API setup is faithful; achieved at 95% with the documented fixture and broader-suite residuals.
- Browser-specific decision and rationale: Required for the affected user-surface because the prior browser attempt stopped at a backend-unavailable shell. Prefer a temporary owned fixture or real dev target; do not claim Electron shell behavior from browser evidence.
- If `Not Required`, evidence proving the real changed boundary without broader execution: Not applicable.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`; validation was not blocked. The watcher runtime entrypoint and full authenticated backend were not required to prove the affected SVG boundary and are recorded as residual limits.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron 42.4.1 renderer plus trusted `local-file://` protocol.
- Relevant README or development instructions: frontend `AGENTS.md`, frontend `README.md`, Electron Vitest config, and implementation handoff.
- Web-equivalent behavior: Policy, right-side Files/Artifacts UI, Event Monitor actions, ImageViewer decode, and object URL lifecycle are web-equivalent and should be browser-tested.
- Shell-specific or lifecycle behavior: local-file capability gate, path validation, MIME/byte response, and Electron process/window lifecycle. Only the preserved local-file response boundary is material to this change; no main/preload/window source changed.
- Chosen validation approach and why it fits the project: Electron local-file response/protocol/validation suites were run and passed; a packaged desktop app was not launched because no main/preload/window source changed and the focused shell boundary was directly covered.
- Server/frontend setup when browser validation is used: A temporary Nuxt fixture page used the production FileViewer/ImageViewer/MarkdownRenderer with deterministic public SVG assets and an owned dev server. The real workspace and run-file-change boundaries were separately exercised by Fastify route tests; the fixture did not fabricate authenticated full-app data.
- Effect on any already-running desktop application: `None`; no desktop app will be stopped or reused.
- Behavior not directly proven and confidence consequence: Packaged Electron window lifecycle remains unproven but is not a changed boundary; state the residual risk if no actual desktop launch is performed.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Repository suites ran first. Then an owned `pnpm dev --host 127.0.0.1 --port <owned-port>` served a temporary fixture and real Google Chrome ran the SVG probe; Fastify route tests used isolated temp workspace/app-data setup.
- Environment choices that materially affect the run: isolated OS temp workspace/app-data; deterministic valid and malformed SVG content; desktop viewport; no user credentials or shared databases.
- Health / readiness checks: The fixture waited for its HTTP readiness/semantic marker. Its deliberately unavailable backend health target at port 9 generated expected `ERR_UNSAFE_PORT` request failures; no page errors or probe failures occurred.
- Seed data / fixtures: valid 150x150 SVG and malformed SVG public assets; temporary route mounted production viewer/renderer components; Fastify tests created real temporary workspace/run-file files.
- Test identities, authentication, permissions, or session state: mobile/team/component tests used deterministic fake credentials and asserted auth headers/URLs. The browser fixture did not fabricate an authenticated full-app session; targeted route tests proved the content boundary separately.
- Requirement-linked journeys or scenarios: SVG-COV-001/002/003/004/005/007/008/009/011/012/013; AC-001 through AC-007 and AC-009/010.
- DOM, screenshot, log, API, process, or other evidence captured: JSON probe summary, stdout/browser events, response MIME/bytes, focused action attributes, action count, active-tab focus, Fastify route output, Electron output, and cleanup status are retained in `api-e2e-test-output`.
- Owned processes and temporary state cleaned up: Browser closed, dev server terminated, temporary route/public SVG files removed, temporary server configs removed, test temp roots cleaned by hooks, and no owned probe processes remain.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| SVG-PROBE-001 | Executed temporary Nuxt fixture using production `FileViewer`/`ImageViewer`/`MarkdownRenderer`, real Chrome, deterministic valid/malformed SVG responses, and launcher focus callback | Actual image decode/error, click/Enter/Space, semantic attributes, focus transition, and no inline SVG DOM path | One-off fixture is retained only as JSON/stdout evidence; stable policy/route/launcher contracts are durable in repository tests. |
| SVG-PROBE-002 | Full authenticated app/backend browser journey | Not executed because no safe deterministic credential/backend fixture was available; the real content routes and component credential paths were separately tested. | Do not add a product E2E harness for this one-line policy change without a reusable project fixture. Residual is explicit in the scorecard. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron app/window lifecycle | No main/preload/window source changed; project-supported local protocol tests provide direct boundary evidence. | Low bounded shell-lifecycle uncertainty. | Escalate only if Electron focused tests fail or browser evidence reveals shell-only behavior. |
| Real authenticated production-like remote node | No secret/account should be invented for this local change; no deterministic project fixture was available. | Auth middleware behavior for this newly reachable extension is not observed through a full browser session. | Local route/component credential tests provide bounded evidence; use a supported authenticated fixture in a future iteration if this path becomes critical. |
| Interactive/inline SVG DOM or sanitization | Explicitly out of scope; `<img>` image boundary is required. | None for approved behavior; future interactive SVG is a separate design. | No test or implementation addition. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation start; execution corrections were local | `Local Fix` | CRR-003 Pass and ARCH-REV-002 explicitly approve workspace, Event Monitor, and right-side Artifacts-tab paths and existing boundaries. A stale FileViewer expected URL, two happy-dom focus assertions, and server Vitest Prisma externalization were corrected without changing production source; final evidence is green for the affected paths. | N/A |
| Any failing test whose assertion conflicts with AC-001–AC-010 rather than implementation | `Unclear` until validity is checked | Coverage decisions above; do not label a failure a source defect without assertion review. | `solution_designer` if requirements/design conflict is found |
| Any durable coverage addition/update/removal after this artifact | `Local Fix` process gate, not a runtime defect | Team rule requires coverage investigation first and code-review rerun for repository-resident durable coverage. | `code_reviewer` after successful execution |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed for `API-REV-001`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — the explicit owner-local tests listed above were added/updated; none were removed.
- Final affected-scope result: `Pass`
- Post-repository confidence: `95%`; no applicable category below `90%`
- Broader validation decision: `Required` — completed through real Chrome plus targeted Fastify route and Electron boundary checks
- Reroute Required Before Validation Execution: `No`
- Reroute after execution: `No` for the affected SVG behavior. The unrelated frontend baseline failures, legacy team-metadata fixture failure, and missing watcher runtime entrypoint are recorded residuals and do not implicate changed SVG paths.
- Recommended Recipient: `code_reviewer` for proportional review of every repository-resident durable coverage addition/update; no `solution_designer` requirement/design reroute is indicated.
- Notes: This investigation is now authoritative after execution. The companion execution report and `API-REV-001` revision record contain the same final result and evidence references. Delivery must not proceed until the downstream durable test-code review is complete.

## Proportional Review Correction Rerun

- Trigger: `code_reviewer` CRR-004 / CR-TF-001 identified that the mobile artifact integration test title disclosed text and PDF but not the newly added SVG path.
- Local correction: Renamed the test to `fetches selected text, PDF, and SVG artifact content through the active mobile credential`; no behavior, fixture, or assertion changed.
- Focused rerun: `pnpm test:nuxt --run components/mobile/__tests__/MobileArtifactsContentViewerIntegration.spec.ts components/mobile/__tests__/MobileFileViewer.spec.ts components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` from `autobyteus-web`.
- Result: `Pass` — 4 files / 23 tests, with the same output count and affected behavior as the original `API-REV-001` run. Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/svg-file-preview/tickets/done/svg-file-preview/api-e2e-test-output/03-web-inherited-consumers-rerun.log`.
- API-REV-001 evidence/confidence: unchanged (`Pass`, `95%`) because the rerun output did not change. The correction verification is recorded in the execution report and the appended API-REV-002 revision entry.
