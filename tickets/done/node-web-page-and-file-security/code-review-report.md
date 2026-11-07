# Code Review Report

Ticket: autobyteus-416, `node-web-page-and-file-security`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/`.
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security`, branch `codex/node-web-page-and-file-security`. Reviewed source: `da207045a5` against base `6225a734a3`. Ticket documents at `3e870866d5`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-001 basis; DEC-001 = A, DEC-002 = A, user, 2026-11-07)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (used for the route inventory F1–F16 and the BEH evidence)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `probes/reproduce-416.sh`; `evidence/SR-003-d6-file-origin-forms.json`, `evidence/SR-003-d6-http-page-control.json`; `follow-ups.md`
- Relevant Solution Revision IDs: SR-001, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, round 2, `Pass`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation IR-001 ready for source review (implementation engineer, 2026-11-07)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Failure Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The change is the one the design classified: two new refusal paths in the node's request gate, three other listeners, 15 file routes, the pairing service and the Electron main process, which together change the security boundary and 403's accepted-origin contract.

## Review Scope

- Changed implementation and behavior reviewed: D1–D9 as built in `da207045a5`. That covers the Host gate and allowed-host rule, the parser, settings and refusal owners, both origin rules, the MCP gateway and the local access gate, `isPairedPhoneHost`, `sendUserFile` and F1–F15, the architecture test, the D6 rule and its listener, the Electron dev origin, the dev stack, docs and GLOSSARY. I also checked the three implementation-level points the handoff raises.
- Files / areas reviewed: every changed non-test source file (30, listed in the size audit). I read the new and changed server tests: the architecture test, the e2e 416 cases, the D6 unit spec and the real-Electron spec's result log. I also read the `@fastify/websocket` 11.3.4 hooks (`index.js:112-215`) and the base `build-studio-server.ts:450-470`.
- Explicit exclusions: the 40 probe edits, which are mechanical origin additions. I read their stat and the shapes the handoff describes, not each file. No recorded check was rerun: none of the code they exercise changed after `da207045a5`, and no finding needed one.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: yes. Four ways reach a node with the app's rights (BEH-001…004), and all four are closed. BEH-005…010 are preserved.
- Design-spec behavior map verified against the implementation: yes (table below).
- Design review report and round confirmed: ARCH-REV-002, round 2, `Pass`. R-3, R-4 and R-5 are checked in the implementation (below). R-7 was not widened. R-8's control rows are kept in the real-Electron spec.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `build-studio-server.ts:458-462`: the WebSocket plugin, then `registerRemoteAccessHostGate`, then `registerMcpGatewayRoutes`, multipart, the plugin, routes. Nothing that defines routes is registered before the gate. `remote-access-host-gate.ts:37-42` → `createRequestHostPolicy` (`remote-access-request-host.ts:32-48`: missing → allow; unparseable → refuse; class or exact name → allow; `.suffix` on a label boundary → allow; else `isPairedPhoneHost`). `X-Forwarded-Host` is not read. Refusal through `refuseRemoteAccessRequest`. e2e: 6 HTTP forms and 4 WS families × 2 are refused, the terminal handler is never called and 0 sockets stay open | — |
| BEH-002 | Confirmed | `remote-access-request-origin.ts:32-57` has no loopback class. `createToolEndpointOriginPolicy` (`:63-76`) is used by the MCP hook and handler (`mcp-gateway-routes.ts:78,105`) and by `AgentToolsMcpLocalAccessGate` (`agent-tools-mcp-local-access.ts:19-20,30`), before its preflight answer (`agent-tools-mcp-http-gate.ts:17-24`). CORS follows the node rule | — |
| BEH-003 | Confirmed | `user-file-reply.ts:16-21`. All 15 call sites read: `workspaces.ts` ×2, `files.ts`, `context-files.ts` ×5 via `contextFileContent`, `run-file-changes.ts`, `team-communication.ts`, `agent-org-references.ts`, `agent-collaboration-references.ts`. `PREVIEW_DOCUMENT_SANDBOX` is removed. Architecture test C1 fails on the base | — |
| BEH-004 | Confirmed | `browser-session-profile.ts:40-47` → `isFileDocumentRequest` (`browser-file-document-request.ts:38-45`), which follows D6 rule 1 and rules 2a–c literally. This is the only `onBeforeSendHeaders` on the partition (`grep electron/`). The real Electron 42.11.16 spec passes (IMP-10) and fails without the policy (IMP-12 C4) | — |
| BEH-005…007 | Confirmed | Classes as in REQ-002. `getNodeBrowserAccess` adds the hosts of `AUTOBYTEUS_SERVER_HOST` and of the configured origins (`node-browser-access.ts:96-104`). `isPairedPhoneHost` (`remote-access-pairing-service.ts:176-185`) covers unconsumed sessions after pruning and non-revoked devices. Stored hosts are normalized through `hostNameOfUrl` → `normalizeHostName`, the same normalizer as `parseRequestHostName` (R-3). e2e: 18 allowed hosts, including a session host and a company-address phone WS | — |
| BEH-008 | Confirmed | `electronApplication.ts:77` → launch config → `baseServerManager.ts:319` → `serverRuntimeEnv.ts:130-147`: the caller value first, then the dev origin. `runtimeOverrides` never carries the key (grep). `development-runtime.mjs` owns the key in both the `.env` and the child env | — |
| BEH-009/010 | Confirmed | No PDF exception (A1). D6 leaves GET/HEAD navigations and `http(s)` pages unchanged (unit and real-Electron control rows) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, AC-001 | Contract | Attacker page | DNS rebinding | Browser | Explicit Edge | DS-001 | Host refused | R1a/R1b; IMP-02 | Supported Explicit Edge Scenario | Use |
| SCN-002 | BEH-002, AC-005 | Contract | Localhost page | Reach a node | In-app or local browser | Explicit Edge | DS-001, DS-004 | Origin refused unless listed | R2a–c; IMP-02 | Supported Explicit Edge Scenario | Use |
| SCN-003 | BEH-003, AC-007 | Contract | User or agent opens a file | Display it | Tab, in-app browser | Explicit Edge | DS-002 | Opaque origin, nosniff | R3a–d | Supported Explicit Edge Scenario | Use |
| SCN-004 | BEH-004, AC-010 | Contract | Local HTML file in the in-app browser | Call the node | In-app browser | Explicit Edge | DS-003 | `Origin: null`, refused | R4; SR-003 evidence | Supported Explicit Edge Scenario | Use |
| SCN-005…009 | BEH-005…010 | User / System / Operational | Phone, desktop, peers, developers, viewers | As today | As listed in the requirements | Normal | DS-001, DS-002, DS-005 | Works | Requirements; 403 | Supported Normal Scenario | Use |
| SCN-R1 | BEH-001 | Operational | The node's WebSocket server | A refused upgrade releases its socket | Fastify upgrade event | Normal | `onUpgrade` → routing → hooks → refusal → plugin `onResponse` destroys the socket only if `request.ws` was set | No socket left open; `close()` completes | `@fastify/websocket` `index.js:145-158`; IMP-12 C3 | Supported Normal Scenario (each refused rebinding upgrade, SCN-001) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The WebSocket plugin is registered before the Host gate (a change to D1's literal order) | SCN-001, SCN-R1 | Rebinding page opens a WS | The plugin's `onRequest` only sets `request.ws` (`index.js:145-152`). The gate is still the first rule that decides. Without this order, a refused upgrade's socket leaks and `close()` hangs | IMP-12 C3: 8 open sockets; e2e asserts 0 | Reject (as a defect) | — | It keeps D1's guarantee and fixes a real leak. Side effect, checked: the plugin's `onRoute` now also wraps `/mcp/gateway`, so a stray upgrade there is closed instead of reaching the HTTP handler. HTTP behavior is unchanged (IMP-06 passes) |
| C-02 | The D6 guard treats a disposed frame as no frame | SCN-004 | A `file://` page sends a beacon on `pagehide` | Electron throws on a disposed `WebFrameMain` read. Without the guard, the listener throws and never calls `callback` (the request stalls). With it, rule (b)/(c) still apply | Unit row "disposed frame"; design R-8 | Reject (as a defect) | — | Bounded defensive read. Its premise is a supported, measured lifecycle (frame gone on unload), not a contrived one |
| C-03 | `context-files.ts` keeps a local `contextFileContent()` builder | Design D5, removal plan | — | It returns `{ mimeType, body }` only. `sendUserFile` still writes the headers, and the architecture test accepts `body:` | `context-files.ts:80-83` | Reject | — | It removes five copies of the same MIME lookup. It is not a second reply owner |
| C-04 | `parseWebOrigin` is now duplicated verbatim in `node-browser-access.ts:35-42` and `remote-access-request-origin.ts:19-26` | Principle 11 (one owner per fact) | Engineering contract | Moving `parseConfiguredOrigins` copied the helper. If one copy ever diverges, a configured origin could stop matching the rule. Today the two are identical | Diff | Promote (non-blocking note) | This ticket | Seven lines in one folder, identical, no behavior consequence today. Recorded as a cleanup recommendation; not a fail. Optional: export it from one file |
| C-05 | Every Host miss reads the paired-device file (`listActiveDeviceSummaries`) | QR-002; D2 | Rebinding page floods a node | One local file read per refused request; no network lookup | `paired-device-service.ts:32-36`; design D2 "no cache"; phone requests already read it per request | Reject | — | The design approved it (QR-002 forbids network lookups only). No supported consequence |
| C-06 | Several D6 unit rows (srcdoc, blob:, popup, worker) have identical `details` | Test clarity | — | The labels name forms that the inputs do not distinguish at the `details` level | Unit spec | Reject | — | At the `details` level those forms really look the same (frame origin `file://`). The real-Electron spec drives each form. Not a defect |
| C-07 | The architecture test allows a stream anywhere as an object literal's `body`, not only when it is passed to `sendUserFile` | REQ-007 contract | A future route | `reply.send({ body: createReadStream() })` would pass the detector | Test source | Reject | — | Contrived: no route sends an object literal holding a stream. The third test also requires `sendUserFile(reply` in each named file route |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | One reply owner, one Host parser (three users: local gate, MCP access, Host policy; the pairing service uses its normalizer), one tool-endpoint rule, one refusal owner, one settings owner | — |
| Matches approved behavior-defining artifacts | Pass | D6 rule matches the SR-003 probe rule literally; reproduction R1–R3 after (IMP-02) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…005 as designed; the gate order holds (C-01) | — |
| Ownership boundary preservation | Pass | Handlers never check Host or Origin. The Host policy reaches pairing data only through `isPairedPhoneHost` | — |
| Off-spine concern clarity | Pass | Settings, parser, refusal and pairing lookup serve their owners | — |
| Existing capability reuse | Pass | `redactSensitiveUrl` reused; `pairing-url-policy.ts` correctly not reused | — |
| Reusable owned structures | Pass | Parser and tool-endpoint rule extracted; C-04 note | Optional: share `parseWebOrigin` |
| Shared-structure tightness | Pass | `NodeBrowserAccess` has exactly the three designed fields | — |
| Repeated coordination ownership | Pass | `sendUserFile` for F1–F15; one refusal owner for both hooks | — |
| Empty indirection | Pass | No pass-through layer. `handleGatewayOptions` lost its redundant origin check, and both of its callers check first (`mcp-gateway-routes.ts:78-83,105-109`) | — |
| Separation of concerns / file responsibility | Pass | Each new file has one concern; the largest new file has 103 effective lines | — |
| Ownership-driven dependency | Pass | `mcp-gateway` and `agent-tools` use only the parser, origin rule and settings. `remote-access/services` → `api/security/request-host-name.ts` (imports `node:net` only) follows an existing direction (`client-facing-url-resolver.ts:2`), and the design maps the pairing service to the parser. No cycle | — |
| Authoritative Boundary Rule | Pass | No caller uses both the pairing service and its stores, or both the settings owner and `appConfigProvider` for `AUTOBYTEUS_ALLOWED_*` (grep: only `node-browser-access.ts` reads them) | — |
| File placement | Pass | As in the design's mapping | — |
| Flat-vs-over-split layout | Pass | Flat `api/security`, as justified in the design | — |
| Interface boundary clarity | Pass | Signatures match the Interface Boundary Mapping. Two named origin rules, no flag | — |
| Naming and vocabulary (Principle 15) | Pass | "Allowed host", "Tool endpoint" and "User file reply" are in GLOSSARY. "Allowed origin" is updated, and the code names match | — |
| No unjustified duplication | Pass | Only C-04 (non-blocking) | See C-04 |
| Patch-on-patch complexity | Pass | Single clean pass. The plugin order is commented at the site | — |
| Dead code removed in touched files | Pass | Removed items as listed in the handoff, verified in the diff. `readSingleHeader` in `agent-tools-mcp-local-access.ts` is still used (`:26`) | — |
| Test scenarios and assertions requirement-aligned | Pass | e2e asserts status, code, no CORS, no handler, 0 sockets and exact log lines. Negative controls C1–C4 prove the guards | — |
| Test fixtures / structure coherent | Pass | 416 cases sit in the existing gate e2e file under their AC IDs | — |
| No stale or compatibility tests | Pass | Loopback-acceptance assertions replaced by listed / unlisted cases | — |
| API/E2E readiness | Pass | The open ACs are named with concrete hints (handoff § Downstream Coverage Hints) | — |

## Source File Size And Structure Audit

Effective non-empty lines, base → after. None is over 500, and no file grew by more than 220.

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `src/compositions/build-studio-server.ts` | 488 | 493 | Pass (closest to the limit) | Pass | Pass | — |
| `electron/application/electronApplication.ts` | 444 | 445 | Pass | Pass | Pass | — |
| `electron/server/baseServerManager.ts` | 435 | 436 | Pass | Pass | Pass | — |
| `scripts/development/development-runtime.mjs` | 299 | 304 | Pass | Pass | Pass | — |
| `src/api/rest/context-files.ts` | 230 | 230 | Pass | Pass | Pass | — |
| `src/remote-access/services/remote-access-pairing-service.ts` | 179 | 194 | Pass | Pass | Pass | — |
| `src/mcp-gateway/mcp-gateway-routes.ts` | 172 | 177 | Pass | Pass | Pass | — |
| `src/api/security/node-browser-access.ts` (new) | 0 | 103 | Pass | Pass | Pass | — |
| Other changed or new source files (22) | ≤154 | ≤156 | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No loopback-restore flag; no allow-all host |
| No legacy old-behavior retention | Pass | The loopback class is gone in all three places |
| Dead code removed in touched files | Pass | See structural checks |
| Persisted-data decision followed | Pass | `Not Affected`: sessions and devices are only read |
| No version-specific dual reads / fallback | Pass | — |
| Transition mechanics match the design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, and it is done in this change: `remote_access.md` (server and web), the server README, `node_desktop.md`, `browser_sessions.md`, `android_mobile_access.md` and `GLOSSARY.md`. The release note is a draft in the handoff, for delivery (REQ-010 / AC-014).
- The design-spec "Project documents" line (`docs/design-cases.md` Case 2) belongs to the Solution Designer. This change does not touch it, so it is not judged here.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | Resolved by D6 rule (a), as implemented (`browser-file-document-request.ts:43`); real-Electron spec |
| MP-002 | Confirmed | Resolved by D6 rule 1 (`:41-42`); real-Electron GET-navigation case |

No new or reclassified premises. SCN-R1 (C-01) is a direct consequence of SCN-001, with measured evidence.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (simple average, for trend only)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-001 order is as designed and commented at the site; DS-003 is one listener and one pure rule | The WebSocket plugin now sits before the gate, which a reader has to reason about | Nothing required; the comment explains it |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Single owners for settings, refusal, Host rule, user-file reply and D6. No bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Signatures match the design; two named origin rules | `RequestOriginPolicy` names both rules' type (fine) | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Small single-concern files in the owning folders | `build-studio-server.ts` is at 493 (pre-existing pressure, +5) | Watch it in later tickets |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.3 | Parser and rules extracted; `NodeBrowserAccess` is tight | C-04: `parseWebOrigin` duplicated | Share it from one file |
| 6 | Naming Quality and Local Readability | 9.5 | Names match GLOSSARY; comments say why | — | — |
| 7 | API/E2E Readiness | 9.4 | Strong e2e and negative controls; open ACs are mapped | Desktop-instance and Docker ACs not yet run (by design) | API/E2E runs them |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | The rules match REQ-002/004 and D6 literally. Label-bounded suffixes; normalized hosts; bounded, escaped logs | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.7 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | Removal plan done, including the dead `path` import | — | — |

## Findings

None blocking. One non-blocking note:

- **CR-N1 (C-04): `parseWebOrigin` is duplicated** in `node-browser-access.ts:35-42` and `remote-access-request-origin.ts:19-26`. The two are identical today. Optional cleanup: export it from one file and import it in the other, so "what is a web origin" has one owner (Principle 11). It does not fail the review and lowers only category 5, which stays at or above 9.2.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (`Pass`).

## Recommended Recipient

API/E2E (the primary pass rule), with an informational notification to Implementation.

## Residual Risks

- The upgrade-socket cleanup depends on `@fastify/websocket` 11.3.4's mark-then-destroy hooks. The e2e assertion of 0 open connections will catch a plugin upgrade that changes this.
- R-7 and R-8, as recorded in the design review. RSK-001/RSK-002 are accepted by DEC-001/DEC-002.
- AC-004, AC-008…AC-013 and the AR-002 check are unproven until API/E2E runs them on the isolated desktop instance or a Docker node. Of the 40 changed probes, only one ran.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E (`/software_engineering_team/api_e2e_engineer`, per handoff rules)
- Notes: `task_size=Large`, `architectural_risk=High` preserved. The three implementation-level points the handoff raises are each accepted with evidence (C-01, C-02, C-03).
