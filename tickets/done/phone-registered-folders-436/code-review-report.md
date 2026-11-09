# Code Review Report — phone-registered-folders-436 (autobyteus-436): the phone opens any file a conversation names, read-only

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004, user-approved 2026-11-09; DEC-001 "S, read-only")
- Investigation Notes Reviewed As Context: `investigation-notes.md` (where the design cites it)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `autobyteus-server-ts/docs/design/node_access_model.md` (NAS-39, NAS-40, §5 row)
- Relevant Solution Revision IDs: SR-004, SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001, Pass; R-1, R-2, R-3)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001, 8 assumptions)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer handoff; HEAD `ea51d4fddd` on `codex/phone-registered-folders-436`; base `origin/personal` @ `97ed263074`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification Review

- Task size: `Medium`; architectural risk: `High`. Selected route: `Implementation Review`; independent source review required: `Yes`.
- Classification evidence: confirmed. The change has about 12 production files in existing owners, and it adds a security-contract change (a route that returns any file to a phone credential). No correction.

## Review Scope

- Changed implementation and behavior reviewed: the server node-file reader, route and permission row; the phone link handler, navigation query, node-file composable, Files screen, viewer error text, protected prefix and messages; the contract §5 row, glossary and docs.
- Files reviewed: `autobyteus-server-ts/src/node-files/node-file-reader.ts`, `src/api/rest/node-files.ts`, `src/api/rest/index.ts`, `src/api/security/node-route-permissions.ts`, `src/api/rest/user-file-reply.ts` (reused); `autobyteus-web/composables/useEventMonitorFilePreview.ts`, `composables/mobile/useMobileNavigation.ts`, `composables/mobile/useMobileNodeFile.ts`, `components/mobile/views/MobileFiles.vue`, `MobileFileViewer.vue`, `utils/remoteAccess/authorizedResourceUrl.ts`; `tests/e2e/node-files/node-files.e2e.test.ts` (case list).
- Explicit exclusions: the probe internals (`mobile-shell-probe.mjs`, reviewed after API/E2E); localization text beyond the keys used. No recorded check was rerun, because none of the code those checks exercise has changed since they ran.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: tapping any absolute path on the phone opens it read-only. Inside the run's folder it opens as before. The node serves one regular file by real path to owner and phone credentials only, never lists, never writes, and streams through `sendUserFile`.
- Behavior-basis status: `Confirmed`.

| Behavior ID | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 (DS-001) | Confirmed | `openMobilePath` checks navigation first (R-2), then a remote run, then maps the path into the run's workspace, then the origin/context check. If the path maps into the workspace, `openFile` runs as before; otherwise `openNodeFile` pushes `screen=files&nodeFile=`. `MobileFiles` then shows `MobileFileViewer` with `useMobileNodeFile`, which does one `authorizedFetch`. Text is kept as content; other types become a blob object URL that is revoked on path change or unmount. Refusal codes are mapped to the REQ-004 messages. |
| BEH-002 (DS-002) | Confirmed | Gate row `/rest/node-files` → owner and phone. `NodeFileReader.open` accepts only an absolute path with no `..` and no NUL. It resolves `realpath`, opens read-only, checks `fstat` on that handle (directory → 400; non-regular → 400 `NODE_FILE_UNREADABLE`), then streams through `sendUserFile`. A Fastify GET route only. |
| BEH-003, BEH-004 | Confirmed preserved | The desktop branch of `useEventMonitorFilePreview` is unchanged; workspace files on the phone are unchanged; workspace routes are untouched. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RS-01 | SCN-001, REQ-001/005 | User | Owner on the phone | Read a file an agent named, anywhere | Conversation file link | Normal | DS-001 → DS-002 | Opens read-only | Requirements, MSP-16/17 | Supported Normal Scenario | Use |
| RS-02 | SCN-002, REQ-004 | User | Owner on the phone | Same; the path is missing or a folder | Link | Normal | DS-001 refusal mapping | Message | REQ-004 | Supported Normal Scenario | Use |
| RS-03 | SCN-003, NAS-39/40, NA-7 | Contract | Any credential kind | Read one file by path | GET route | Explicit Edge | DS-002 | Served or refused | Contract | Supported Explicit Edge Scenario | Use |
| RS-04 | Assumption 4 | User | Owner on the phone | Tap a path in a run that a peer node runs | Link in a remote run | Edge | `remoteRunsStore.runOfAgentRun` → host message (as before) | Not opened | Design DS-002 "this route reads this node"; a remote run's paths are the peer's | Supported Explicit Edge Scenario | Use (confirms assumption 4) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Assumption 4: a remote run's link keeps the host answer | RS-04, DS-002 | Phone views a delegated run on a peer | Opening it here would read this node's file at the peer's path: the wrong file or not found | `useEventMonitorFilePreview.ts` remote-run check | Reject (no defect) | — | Correct within design intent. The route reads this node, and REQ-001's "the node's computer" is this node. It preserves today's answer. |
| C-02 | Fourth refusal code `NODE_FILE_UNREADABLE` (R-1) | REQ-003/004, ARCH R-1 | Path denied by the OS, a loop, or a socket/device | 400 → the phone shows "could not be opened" (REQ-004 "other failures") | `node-file-reader.ts:34,40-41,72-75` | Reject (no defect) | — | It closes RSK-002's open "404/500" as the architecture review asked; no 500 branch remains. |
| C-03 | On Windows, `open()` of a directory may fail (`EISDIR`) before `fstat`, so the reader would answer "unreadable" and the phone would show "could not be opened" instead of the folder message | REQ-003/004 | Phone of a Windows desktop node taps a folder path | Only the message text is wrong; still refused, nothing is read | Node/libuv behavior on Windows not measured here | Hold for Evidence (non-blocking) | — | Not measured. Recorded under Residual Risks for the Windows check. It is a cheap hardening (`EISDIR` → folder), but this review does not prescribe it. |
| C-04 | Opening a FIFO with `O_RDONLY` can block a threadpool thread until a writer appears | QR-001 | A conversation names a named-pipe path and the phone taps it | — | `node-file-reader.ts:62` | Reject | — | Contrived: no supported workflow names a FIFO for reading. |
| C-05 | The path appears in the access log line `?path=` | QR-001 ("beyond the existing access log policy") | Any request | Logged only under `HTTP_ACCESS_LOG_MODE`, as for every route; the reader logs nothing | e2e "logs no node file path" | Reject | — | Within QR-001's stated boundary. |
| C-06 | Non-text node files reach the viewer as blob URLs in the phone's origin, so `sendUserFile`'s CSP does not apply to the blob | REQ-002, assumption 7 | Phone opens an HTML/PDF/SVG node file | Same pattern as workspace media on the phone today (`authorizedResourceUrl` blobs); `HtmlPreviewer` keeps `sandbox="allow-scripts"` without `allow-same-origin` | Assumption 7; viewer unchanged | Reject (no new risk) | — | Existing, reviewed pattern (autobyteus-416). |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Existing owners absorb it (gate, `sendUserFile`, `authorizedFetch`, `determineFileType`, `MobileFileViewer`) | — |
| Matches behavior-defining supplements | Pass | NAS-39/40 and the §5 row; R-3 sentence about the data folder added for autobyteus-441 | — |
| Data-flow spine clarity | Pass | DS-001 and DS-002 read in call order in code | — |
| Ownership boundary preservation | Pass | The gate alone decides who; the reader alone decides which path; the route does not touch `fs` or credentials | — |
| Off-spine concerns | Pass | Message mapping in `useMobileNodeFile`; MIME lookup in the reader | — |
| Capability reuse | Pass | `sendUserFile`, `authorizedFetch`, `PROTECTED_REST_PREFIXES`, `OpenFileState`, `MobileFileViewer` | — |
| Reusable owned structures / tightness | Pass | One refusal shape (`NODE_FILE_REFUSALS`); the node-file state reuses `OpenFileState`; `nodeFile` is its own route query | — |
| Repeated coordination / empty indirection | Pass | The route is a thin binding of the reader, by design (it owns HTTP mapping) | — |
| SoC and file responsibility | Pass | One concern per new file | — |
| Dependency direction | Pass | `node-files` imports nothing from workspaces or the gate; the route never reads the identity | — |
| Authoritative Boundary Rule | Pass | `MobileFiles` uses `useMobileNodeFile`, not `authorizedFetch` | — |
| File placement / layout | Pass | `src/node-files/`, `composables/mobile/` | — |
| Interface clarity | Pass | Absolute path is the explicit identity; separate from workspace `file` | — |
| Naming, one vocabulary | Pass | "node file" in code, route, query, glossary; distinct from `/rest/files/` media | — |
| Duplication / patch-on-patch | Pass | — | — |
| Dead code | Pass | The phone branch's two outside-folder `file_available_on_host` returns are removed; the key stays for no-navigation, remote runs and desktop | — |
| Tests requirement-aligned | Pass | e2e NAS-39 (owner, phone, headers, image bytes), refusals incl. symlink, NAS-40 kinds, methods, no path logged; reader unit; web composable/navigation/views/link specs | — |
| No stale tests | Pass | Specs updated for the removed host answer | — |
| API/E2E readiness | Pass | AC-005 (Docker) and AC-006 full probe sets left for API/E2E, named in the handoff | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/node-files/node-file-reader.ts` | — | 87 | Pass | Pass | Pass | Pass | Pass | — |
| `src/api/rest/node-files.ts` | — | 18 | Pass | Pass | Pass | Pass | Pass | — |
| `composables/mobile/useMobileNodeFile.ts` | — | 94 | Pass | Pass | Pass | Pass | Pass | — |
| `composables/useEventMonitorFilePreview.ts` | — | ~150 | Pass | Pass (+26/−11) | Pass | Pass | Pass | — |
| `components/mobile/views/MobileFiles.vue` | — | ~155 | Pass | Pass | Pass | Pass | Pass | — |

Evidence: `evidence/implementation/IMP-10-source-size-guardrail.log`; `build-studio-server.ts` untouched.

## Legacy / Backward-Compatibility Verdict

All checks `Pass`: there is no compatibility mechanism, no old behavior is kept for paths outside the folder (they now open), and the dead returns are removed. Persisted data: `Not Affected`.

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in `271656acc0` (glossary "Node file", both `remote_access.md`, contract §5 row including R-3).

## Additional Material Premise Validation

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (simple average)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001/DS-002 visible in call order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Gate decides who, reader decides which path, composable owns phone state | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | One GET, explicit absolute-path identity, four named refusal codes | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Small single-concern files | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Reuses `OpenFileState` and the refusal shape | `mode: 'edit'` + `readOnly` intent mirrors the workspace pattern rather than a dedicated read-only shape | — (consistent with existing viewer) |
| 6 | Naming Quality and Local Readability | 9.5 | "node file" consistent across layers; comments cite NAS IDs | — | — |
| 7 | API/E2E Readiness | 9.3 | Server e2e and MSP-16/17 pass | AC-005 Docker and full probes pending | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Open-then-`fstat` on the same handle; stream; stale-load guard by serial; object URL lifetime | Windows folder message unmeasured (C-03) | Windows check |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean replacement | — | — |
| 10 | Cleanup Completeness | 9.5 | Removed returns, updated specs, docs | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-001 (phone credential limits → autobyteus-441) and FU-002 (stale `mobile-root-shell.spec.ts`, pre-existing since autobyteus-433) were already recorded.

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E engineer (pass), then an informational notice to the implementation engineer.

## Residual Risks

- AC-005 (Docker node, `/home/autobyteus/shared`) is not run; the route reads the container's own filesystem by construction.
- C-03: on a Windows node, a folder path may answer `NODE_FILE_UNREADABLE` ("could not be opened") instead of the folder message. Worth one check on Windows; if it reproduces, map `EISDIR` to the folder refusal.
- RSK-001: a large binary node file is fetched whole into a blob on the phone, as workspace media already are.
- By the user's decision, a paired phone can read any file the node's user can read, including the node's data folder (peer secrets, MCP token). autobyteus-441 owns limits (contract §5).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10 average, every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: assumptions 1–8 accepted; assumption 4 (a remote run keeps the host answer) is correct within the design's "this route reads this node".
