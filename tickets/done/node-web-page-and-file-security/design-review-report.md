# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/requirements-doc.md` (Approved, SR-001 basis; DEC-001 = A, DEC-002 = A, user, 2026-11-07)
- Upstream Investigation Notes: `.../investigation-notes.md`
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `.../design-spec.md` (SR-003, status `Ready`)
- Supplemental Task Artifacts Reviewed: `probes/reproduce-416.sh`, `probes/electron-file-origin-probe.js`, `probes/electron-origin-rewrite-and-pdf-probe.js`, `evidence/R-reproduce-416-base.txt`, `evidence/R4-electron-file-origin.json`, `evidence/A1-electron-origin-rewrite-and-pdf.json`, `evidence/A1-pdf-under-csp-sandbox.png`, `follow-ups.md`
- Reviewer evidence: `probes/arch-review-d6-child-frame-probe.js`, `evidence/ARCH-REV-001-d6-child-frame-probe.json` (round 1). In round 2, `probes/d6-file-origin-forms-probe.js` was re-run independently on Electron 42.11.16 in a scratch directory, and it reproduced `evidence/SR-003-d6-file-origin-forms.json`.
- Round-2 evidence reviewed: `probes/d6-file-origin-forms-probe.js`, `probes/d6-http-page-control-probe.js`, `evidence/SR-003-d6-file-origin-forms.json`, `evidence/SR-003-d6-http-page-control.json`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-003 re-review request from the Solution Designer after ARCH-REV-001 `Fail` (AR-001, AR-002), 2026-11-07
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security`, branch `codex/node-web-page-and-file-security` @ `6225a734a3` (no source changes). Opened: `api/security/remote-access-request-origin.ts`, `remote-access-policy-plugin.ts`, `remote-access-route-policy.ts`, `remote-access-local-trust.ts`; `compositions/build-studio-server.ts:457-476`; `mcp-gateway/mcp-gateway-routes.ts`, `mcp-gateway-http-helpers.ts`, `mcp-gateway-access.ts`; `agent-tools/mcp/agent-tools-mcp-local-access.ts` and its users; `remote-access/services/remote-access-pairing-service.ts`, `paired-device-service.ts`, `domain/models.ts`; `config/app-config.ts`, `app-config-provider.ts`; every `src/api/rest/*.ts` file-streaming site; file-serving outside `api/rest`; `autobyteus-web/electron/browser/browser-session-profile.ts`, `browser-tab-navigation.ts`, `browser-tab-manager.ts`; `electron/server/serverRuntimeEnv.ts`; `electron/application/electronApplication.ts`; Android wrapper page loading; `DESIGN.md`, `GLOSSARY.md`; reviewer Electron probe.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: the change spans the server request gate, three other listeners, 15 user-file handlers, the pairing service and the Electron main process (~20 source files in two packages), and changes the node's security boundary and the accepted-origin contract approved in 403. Confirmed against the code.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes. Four ways a web page or file reaches a node with the app's rights (rebinding, localhost origins, user files at the node origin, `file://` pages in the in-app browser) are closed; BEH-005…010 are preserved.
- Relevant existing behavior and evidence confirmed: yes. The Origin rule is at `remote-access-request-origin.ts:53-79`: the loopback class is at `:35-36,76`, and nothing checks Host except the same-origin comparison at `:73`. The gate is at `remote-access-policy-plugin.ts:55-82`, and the hook order at `build-studio-server.ts:457-460`. The MCP loopback origin is at `mcp-gateway-http-helpers.ts:51-59`, and the local access gate's at `agent-tools-mcp-local-access.ts:33-42,81-86`. The two Host parsers are at `agent-tools-mcp-local-access.ts:51-72` and `mcp-gateway-access.ts:78-88`. User-file streams are in `workspaces.ts:42-43,88-90`, `files.ts:39-40`, `context-files.ts:79-83`, `run-file-changes.ts:47-50`, `team-communication.ts:38-40`, `agent-org-references.ts:20-22` and `agent-collaboration-references.ts:39-41`. The browser session policy is empty (`browser-session-profile.ts:35-37`), and `file:` is allowed (`browser-tab-navigation.ts:10-11`). The Android wrapper loads the node origin directly (`AutoByteusWebView.kt:68`; `TrustedNavigationPolicy.kt`), so it does not depend on a loopback origin.
- Scope guardrail confirmed: yes (UC-001…005; Out of Scope; Preserved Behavior Boundary; Review Authority).
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`. Round 1's AR-001 traced to REQ-009/AC-010 and AR-002 to REQ-008/AC-008, BEH-009 and BEH-010. Both are resolved in round 2.
- Remaining material ambiguity: none in the requirements.
- Statements about existing code the design relies on, opened at their cited lines: all checked statements hold. The round-1 citation drift (`mcp-gateway-access.ts:59-…`) is corrected to `:78-88` in SR-003.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass (D1 first hook, before MCP hook and CORS; WS routes are Fastify routes, so the hook covers upgrades) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass (D3, D4; CORS delegator and MCP preflight follow) | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass (D5; inventory F1–F15 confirmed complete; no other user-file server outside `api/rest`) | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass (SR-003 D6 decides by frame origin. Every form a `file://` document can use is in the Entry-Form Table, and each was measured and reproduced as `Origin: null`) | Confirmed | — |
| BEH-005…007 | User / System | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Operational | Pass | Pass | Pass (D7) | Confirmed | — |
| BEH-009/010 | User | Pass | Pass | Pass (GET/HEAD navigations unchanged, measured. The http-page control shows that nothing is rewritten for `http(s)` pages) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/reproduce-416.sh` + `evidence/R-reproduce-416-base.txt` | Pass | Pass | Pass | Pass | Pass | — |
| `probes/electron-file-origin-probe.js` + `evidence/R4-*` | Pass | Pass | Pass | Pass | Pass | — |
| `probes/electron-origin-rewrite-and-pdf-probe.js` + `evidence/A1-*` | Pass | Pass | Pass (now used for the PDF measurement only) | Pass | Pass | — |
| `probes/d6-file-origin-forms-probe.js` + `evidence/SR-003-d6-file-origin-forms.json` | Pass | Pass (design spec evidence table, D6, Guidance) | Pass (top-level document, `about:blank`/`srcdoc`/`blob:` iframes, popup and worker, each with fetch, XHR and WS; form POST; beacon; keepalive; GET navigations) | Pass (the probe's `shouldMarkForeign` is D6 rules 1 and 2a–c verbatim) | Pass | — |
| `probes/d6-http-page-control-probe.js` + `evidence/SR-003-d6-http-page-control.json` | Pass | Pass | Pass | Pass (`marked: []`; every POST, the beacon and the WS carry the page's own Origin, which is the premise of rule (c)) | Pass | — |
| `probes/arch-review-d6-child-frame-probe.js` + `evidence/ARCH-REV-001-*` | Pass | Pass (cited as the basis of AR-001/AR-002) | Pass | Pass | Pass | — |
| `follow-ups.md` (FU-001) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change (security) | — |
| Root-cause classification is explicit and evidence-backed | Pass | Missing Invariant (Host never checked: `remote-access-request-origin.ts:73` is the only Host read) plus Duplicated Policy (15 handlers; two parsers; two loopback-origin copies), all opened | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes, bounded: reply owner, one parser, tool-endpoint rule, refusal extraction | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D4, D5, D8, D9; removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Main listener request gate | Pass | Pass | Pass | Pass | Pass. The gate is two hooks because the MCP hook must sit between them; one refusal owner and one settings owner keep them consistent (justified, Key Tradeoffs) | Pass | Pass |
| DS-002 | User file reply | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | `file://` document in the in-app browser | Pass | Pass | N/A | Pass | Pass (`onBeforeSendHeaders -> isFileDocumentRequest -> Origin: null`. The listener only applies the pure rule; one owner, `BrowserSessionProfile`) | Pass | Pass |
| DS-004 | Internal listeners | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Launchers (bounded) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RemoteAccessPairingService.isPairedPhoneHost` | Pass | Pass | Pass | Pass | Host policy never reads the stores |
| `getNodeBrowserAccess()` | Pass | Pass | Pass | Pass | Only reader of `AUTOBYTEUS_ALLOWED_*` |
| `sendUserFile` | Pass | Pass | Pass (architecture test) | Pass | — |
| `refuseRemoteAccessRequest` | Pass | Pass | Pass | Pass | — |
| `BrowserSessionProfile.applySessionPolicy` | Pass | Pass | Pass | Pass | Rule content is AR-001/AR-002, not the boundary |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `api/security` → `remote-access/services` | Pass | Pass | Pass | Pass | Existing direction (`remote-access-route-policy.ts:9-14`) |
| `mcp-gateway`, `agent-tools/mcp` → `api/security` shared pieces | Pass | Pass | Pass | Pass | Never the plugin or Host gate |
| `api/rest` → `user-file-reply.ts` | Pass | Pass | Pass | Pass | — |
| Electron `serverRuntimeEnv` ← launch config | Pass | Pass | Pass | Pass | Not through `runtimeOverrides` (browser runtime's map) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `createRequestHostPolicy(...).isAllowed(hostHeader)` | Pass | Pass | Pass | Low | Pass |
| `parseRequestHostName` | Pass | Pass | Pass | Low | Pass |
| `createRequestOriginPolicy` / `createToolEndpointOriginPolicy` | Pass | Pass | Pass | Low | Pass |
| `getNodeBrowserAccess` | Pass | Pass | Pass | Low | Pass |
| `isPairedPhoneHost(hostname)` | Pass | Pass | Pass (normalized hostname; see Residual Risks R-3) | Low | Pass |
| `sendUserFile(reply, { mimeType, body })` | Pass | Pass | Pass | Low | Pass |
| `refuseRemoteAccessRequest` | Pass | Pass | Pass | Low | Pass |
| `developmentRendererOrigin` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Request gate | Pass | Pass | N/A | Pass | — |
| Private-name classification (`pairing-url-policy.ts`) | Pass | Pass (not reused: different fact) | N/A | Pass | — |
| Settings | Pass | Pass | Pass | Pass | Lazy accessor matches the startup/lazy-services doc |
| Embedded env | Pass | Pass | N/A | Pass | — |
| In-app browser policy hook | Pass | Pass | N/A | Pass | No other `webRequest` listener on the partition |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server/src/api/security` | Pass | Pass | Pass | Pass | — |
| `server/src/remote-access/services` | Pass | Pass | Pass | Pass | — |
| `server/src/mcp-gateway`, `src/agent-tools/mcp` | Pass | Pass | Pass | Pass | Standalone host gets D4 through the shared gate; it materializes `AUTOBYTEUS_SERVER_HOST` (`standalone-host-config-materializer.ts:25`), so D8 reads cleanly there |
| `server/src/api/rest` | Pass | Pass | Pass | Pass | — |
| `web/electron/browser` | Pass | Pass | Pass (every request kind traced in the Entry-Form Table) | Pass | `browser-file-document-request.ts` holds the pure rule, so it can be unit-tested without a window |
| `web/electron/server`, `application`; launchers | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host header parser | Pass | Pass | Pass | Pass | — |
| Loopback-origin rule → tool-endpoint rule | Pass | Pass | Pass | Pass | Named rule, no flag |
| User-file headers | Pass | Pass | Pass | Pass | — |
| Refusal reply/log | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodeBrowserAccess` | Pass | Pass | Pass | N/A | Pass | — |
| `RemoteAccessRejection` code union (+`REMOTE_ACCESS_HOST_REFUSED`) | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass` (the CORS delegator and the MCP preflight follow the new rules; no stored structure changes).

Each domain word keeps one meaning: `Pass` ("Allowed host" is added beside "Allowed origin" in GLOSSARY; "Tool endpoint" is defined; "Allowed origin" is updated).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-access-host-gate.ts`, `remote-access-request-host.ts`, `request-host-name.ts`, `node-browser-access.ts`, `remote-access-refusal.ts` (Add) | Pass | Pass | Pass | Pass | — |
| `remote-access-request-origin.ts`, `remote-access-policy-plugin.ts` (Modify) | Pass | Pass | Pass | Pass | — |
| `user-file-reply.ts` (Add) + 7 route files | Pass | Pass | Pass | Pass | — |
| `tests/architecture/user-file-replies.test.ts` (Add) | Pass | Pass | N/A | Pass | Existing `tests/architecture/` folder; see Residual Risks R-4 |
| `browser-session-profile.ts` (Modify), `browser-file-document-request.ts` (Add) | Pass | Pass | N/A | Pass | The listener applies the rule; the rule is a pure function |
| Electron launch config / env, dev runtime, probes, docs | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server/src/api/security/*` (5 new) | Pass | Pass | Low | Pass | — |
| `server/src/api/rest/user-file-reply.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Loopback origin class (3 places) | Pass | Pass | Pass | Pass | — |
| Duplicate Host parsers | Pass | Pass | Pass | Pass | — |
| `readConfiguredOrigins`, `ALLOWED_ORIGINS_SETTING`, `refuse`, `parseConfiguredOrigins` (moved) | Pass | Pass | Pass | Pass | — |
| `PREVIEW_DOCUMENT_SANDBOX`, `context-files.ts` `sendFile`, per-route type/send | Pass | Pass | Pass | Pass | — |
| Tests asserting loopback acceptance | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Loopback origins | No | Pass | Pass | No restore flag |
| Allow-all hosts | No | Pass | Pass | DEC-008 |
| F2 per-route header | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Paired devices, pairing sessions | Not Affected | Pass (read only through `PairedDeviceService` / in-memory map) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server steps 1–4 | Pass | Pass | Pass | Pass |
| Launchers step 5 | Pass | Pass | Pass | Pass |
| Electron session policy step 6 | Pass | Pass | Pass | Pass (unit test over the Entry-Form rows plus the control rows; main-process test with the measured forms; AC-010 and the AR-002 check on the isolated instance) |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host rule, `.suffix` label boundary | Yes | Pass | Pass | Pass | — |
| Origin rules without a flag | Yes | Pass | Pass | Pass | — |
| `file://` rewrite | Yes | Pass (`about:blank` iframe WS refused; address-bar GET to a node file displays) | Pass (keying on the frame URL; rewriting every request of a file tab) | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A same-origin child frame or popup of a `file://` page sends requests that D6's rule does not rewrite

- Related approved requirement or established contract: REQ-009, AC-010
- Relevant behavior ID(s): BEH-004 (SCN-004)
- Initiating basis kind: `User` (and `Contract`: security)
- Independent product-supported initiating trigger: the user, or an agent's browser tool, opens a local HTML file in the in-app browser. The tab accepts `file:` (`browser-tab-navigation.ts:10`), and that is SCN-004 itself. SCN-004 treats the page as attacker-authored content, so its script is in scope.
- Support evidence: SCN-004 / REQ-009: the page "still loads and runs". Scripts creating `about:blank` or `srcdoc` iframes, or calling `window.open('about:blank')` (`POPUP_ALLOWED_PROTOCOLS` includes `about:`, `browser-tab-navigation.ts:11`), are ordinary page capabilities.
- Forward path: `file://` page → `iframe.contentWindow.fetch/WebSocket` (or `srcdoc` script) → Chromium request with `details.frame` = the child frame (`url` `about:blank`/`about:srcdoc`, `origin` `file://`) → D6 tests `frame.url` → not `file:` → no rewrite → node sees no Origin (POST) or `Origin: file://` (WS) → D3 accepts both (REQ-004 keeps `file://`).
- Lifecycle preconditions and material consequence: measured in Electron 42.11.16 (`evidence/ARCH-REV-001-d6-child-frame-probe.json`), applying D6's rule verbatim. The `about:blank` iframe WebSocket reached the server with `Origin: file://`, and the `srcdoc` iframe POST with no Origin. A node would accept both: a GraphQL POST and a `/ws/terminal` socket with the app's rights. REQ-009 is not met.
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-001 (round 1). Resolved in SR-003: the `about:blank` WS and the `srcdoc` POST now arrive as `Origin: null` (reproduced in round 2).

### `MP-002` — A GET navigation from a tab showing a `file://` page to a node URL gets `Origin: null`

- Related approved requirement or established contract: REQ-008, AC-008; D6's own "every other request passes unchanged"
- Relevant behavior ID(s): BEH-009, BEH-010
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: in a tab showing a local file, the user navigates through the address bar (`browser-shell:navigate-tab`, `register-browser-shell-ipc-handlers.ts:41`) or follows a link. An agent's browser tool can also navigate the same tab (`/browser/navigate`, `browser-bridge-server.ts:138`; `browser-tab-manager.ts:80-83`). The target is a node URL, such as a workspace file or an attachment.
- Support evidence: the in-app browser is a general browser with tab navigation, and agents' browser tools navigate existing tabs.
- Forward path: `loadURL(http://<node>/rest/...)` on the file tab → main-frame request whose `details.frame.url` is still the `file:` document → D6 rewrites → `Origin: null` → the node's D3 rule refuses `null` → 403 `REMOTE_ACCESS_ORIGIN_REFUSED` in place of the file.
- Lifecycle preconditions and material consequence: measured (same evidence, `/navigate-from-file`: `resourceType mainFrame`, rewritten, server saw `Origin: null`). The node-side refusal follows from `remote-access-request-origin.ts:67-69` (`null` is not an http(s) origin). The user or agent gets a 403 for a node file that displays from any other tab.
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-002 (round 1). Resolved in SR-003: the address-bar GET navigation now arrives with no Origin, and a node accepts it (reproduced in round 2).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. Round-1 findings AR-001 and AR-002 are `Resolved`; see `architecture-review-revision-record.md`, ARCH-REV-002.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notification to the Solution Designer.

## Residual Risks

- R-1: RSK-001/RSK-002 (setups needing a setting) are accepted by DEC-001/DEC-002 and mitigated by the log hint, docs and release note.
- R-2: Electron dev's `AUTOBYTEUS_ALLOWED_ORIGINS` in the process env shadows a data-dir `.env` value. This is dev only; the caller's value is appended. No action.
- R-3, R-4, R-5: adopted in SR-003 Guidance (stored-host normalization in `isPairedPhoneHost`; `application-backends.ts` exclusion note; bounded, escaped log of an unparseable Host). Code review checks them in the implementation.
- R-6: the node request gate is two hooks with the MCP hook between them. One refusal owner and one settings owner keep them consistent. If the MCP gateway's own hook is ever removed, fold the two hooks into one.
- R-7 (new, non-blocking): D6 rule (a) also sets `Origin: null` on GET subresource requests from a `file://` document, for example `<img>` or `<script>` to a CDN or to a node URL. CDNs ignore it. A node now refuses a `file://` page's subresource GET of a node file, where a foreign http page's no-cors GET is still accepted. This is stricter than for http pages, but no supported scenario depends on it, and it matches REQ-009 ("refused as a foreign page's would be", or stricter). If an agent-generated local report that embeds node images turns out to be a real workflow, raise it as a requirement question; do not widen the rule in implementation.
- R-8 (non-blocking): rule (c) (no Origin + non-GET/HEAD) relies on Chromium adding Origin to every non-GET/HEAD request from a web page. The control evidence confirms this on Electron 42, and the main-process test keeps the control rows so an Electron upgrade that changes it fails loudly. Nothing in the main process issues requests on the browser partition (`grep` of `autobyteus-web/electron`: no `session.fetch`/`net.request` on it), so (c) cannot catch an app-owned request. In both measurements the beacon and keepalive still had a frame, so (c) is the stated no-frame fallback rather than an observed path. It is cheap and matches the design.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 were Reachable and are now resolved by the design)
- Notes: The SR-003 changes are limited to D6 and its tracing, examples, tests and guidance. D1–D5 and D7–D9 are unchanged from round 1, where they passed, apart from the adopted R-3/R-4/R-5 guidance lines and the corrected citation. The independent re-run of the SR-003 probe on Electron 42.11.16 reproduced the evidence. The package is ready for implementation; task_size `Large`, architectural_risk `High`.
