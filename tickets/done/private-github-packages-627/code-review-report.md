# Code Review Report — autobyteus-627 Private GitHub Repositories for Agent Packages and Skills

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md) (Approved, SR-002)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md) (Ready, SR-002), including its Data Contract (C-1…C-4) and the ten validation walks
- Supplemental Task Artifacts Reviewed As Context: `probe-627-results.txt`, `follow-ups.md` (FU-627-01, FU-627-02), `evidence/IMP-01…IMP-13`
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 Pass; the architecture reviewer's file, uncommitted, not committed by me)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (same)
- Relevant Architecture Review Revision IDs: ARCH-REV-001 (AR-001: ls-refs with a valid token that can't see the repository; measured 404 in IMP-01)
- Implementation Handoff Reviewed As Context: [implementation-handoff.md](implementation-handoff.md)
- Implementation Revision Record Reviewed As Context: [implementation-revision-record.md](implementation-revision-record.md)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: `/implementation_engineer`, implementation complete, IR-001, `Medium`/`High` (confirmed)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Reviewed commits: `3a83f76325` (implementation), `30fcc50ec7` (two e2e type fixes, browser probe), `a085e026b3` (handoff and evidence), on base `6545fcfad3`. Skill update of 2026-11-23 applied (Principle 17 Data Contract First).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High` (a second consumer of a vault secret; a write path without an imported integration; the shared GitHub client's request contract; codeload's undocumented header behavior)
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. About 13 server and 9 web source files, inside the owners the design named; no persistence change.

## Review Scope

- Changed implementation and behavior reviewed: the access rule (LS-1) and its texts (C-4) in `GitHubRepositoryClient`; the per-host credential header (C-3) in `gitHubRequest`, including redirect hops; `readNodeGitHubToken`; `downloadArchive` and the removal of both earlier download paths; the three construction sites; the GraphQL `GitHubConnection` operations; the web line, store, GraphQL documents, the two screens, en/zh-CN texts, codegen and the demo operation list; docs and glossary.
- Files / areas reviewed: every source file in `git diff 6545fcfad3..30fcc50ec7` (server `src/`, web components, stores, graphql, localization); the new and rewritten tests (`github-access-rule`, `github-request-credentials`, `node-github-token`, `github-private-repository-graphql.e2e`, `github-private-repository-live.e2e`, `unused-github-client`, the installer, skill and service tests); the docs the change edits. Read for context: `integration-connection-service.ts`, `secret-management-service.ts` (`resolveForUse`), `secret-vault-runtime.ts` (`requireService`), `github-rate-limit-gate.ts` (`learnFrom`), `package-edit-capture.ts` (the only `downloadRevision` caller).
- Reviewer's own check: `vitest run tests/unit/integrations/github tests/unit/skills/github tests/unit/agent-packages` at `a085e026b3`: 19 files, 163 tests passed.
- Explicit exclusions: Application Packages (FU-627-01), Device Flow (FU-627-02); AC-006 Docker and built-server live runs (API/E2E's).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a private repository imports (Agent Packages and Skills) and updates with this node's one GitHub token (DEC-001), connected inline from an always-visible line (DEC-002/SR-002). Failures tell three cases apart (REQ-004). The token is only ever a request header to GitHub (REQ-005). Public sources are unchanged, even with a rejected token (REQ-007).
- Design-spec behavior map verified against the implementation: yes. Each path in the Production-Path Map runs through the named code. `AgentPackageService` builds one client for the installer, the updates and edit capture. `SkillSourceService` builds one client for metadata, head and `GitHubSkillRepository`. The Codex strategy builds its client with the reader. No other `new GitHubRepositoryClient(` exists in `src/` (the installer's own construction is gone, so there are three sites, not the design's four; no gap).
- Design review report and round confirmed: ARCH-REV-001 Pass. AR-001 was measured before coding (IMP-01: `lsRefsWithToken` 404), so the update-check "no access" text holds.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none
- Remaining material ambiguity, if any: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AgentPackageService` → installer `installPackage` → `client.fetchRepositoryRevisionMetadata` (REST repo + branch, each without a token, then with Bearer) → `downloadArchive` (codeload, commit-pinned) → extract/validate. Skill sources: `SkillSourceService` → client metadata → `GitHubSkillRepository.prepare` → `client.downloadArchive`. The `payload.private` refusal is gone (`github-repository-client.ts`). Unit test "a private repository …" asserts the exact 8 requests and headers; GraphQL e2e IMP-06/13 imports a private repository end to end | — |
| BEH-002 | Confirmed | `fetchDefaultBranchHead` → ls-refs 401 without a token → Basic `x-access-token` → head. Update: edit capture's `downloadRevision` and the new revision's download both go through `downloadArchive`. A failure throws the C-4 text, stored as `lastError`; installed content untouched (`github-agent-package-updates.ts` unchanged) | — |
| BEH-003 | Confirmed | `credentialHeader(url, token)` runs per hop, after `familyOf(url)` accepted the hop; `revealToTrustedConsumer` only inside it. The credential proxy is untouched. `readNodeGitHubToken` reads `{ kind: "integration", integrationId: "github" }`; `NOT_FOUND` → null, anything else thrown | — |
| BEH-004 | Confirmed | `request`: with the token, 401 → `TOKEN_REJECTED_MESSAGE`, 403/404 → `noAccessMessage`; `tokenFor`: null → `notVisibleMessage`, `SecretVaultError` → `vaultUnavailableMessage`. All four texts match C-4 word for word. `connectGitHub` → `IntegrationConnectionService.connect` (verifyToken, then vault), errors coded | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001, C-3 | User | Node user, GitHub connected | Import a private package or skill source | Import Package / Skill sources Add | Normal | DS-001 through the access rule | Installed like a public import | Requirements SCN-001; unit + GraphQL e2e + live transport IMP-02/13 | Supported Normal Scenario | Use |
| SCN-002 | BEH-001, BEH-004, REQ-002, C-2 | User | Node user, not connected | Same, connecting on the way | Import → C-4 "connect GitHub" → connection line → Connect | Normal | DS-001 → DS-003 → DS-001 (design walk 3) | Node connected; import succeeds on the next Import | Requirements SCN-002; GraphQL e2e; browser probe IMP-10 | Supported Normal Scenario | Use |
| SCN-003 | BEH-002, REQ-003 | System | Update schedule / Check again / Update | Keep a private source current | Scheduled pass, buttons | Normal | DS-002 | Head found; update installed; failure keeps content | Requirements SCN-003; GraphQL e2e (UP_TO_DATE, then CHECK_FAILED after disconnect) | Supported Normal Scenario | Use |
| SCN-004 | BEH-004, REQ-004, C-4 | User | Node user with an expired, revoked or unselected token | Learn which case it is and recover | Card's stored check error; connection line Replace token | Normal | LS-1 → stored `lastError` → line | One of the three texts; reconnect resumes | Requirements SCN-004; unit `it.each` over every case | Supported Normal Scenario | Use |
| SCN-007 | REQ-007 | User | Node user, public repository, rejected token stored | Public imports unaffected | Import / check | Normal | LS-1, anonymous 2xx | Token never read | Requirements REQ-007; unit "REQ-007" | Supported Normal Scenario | Use |
| CT-005 | REQ-005, C-3 | Contract | — | Token custody | Every request, error, record, response | Normal | `credentialHeader` only; no URL carries a credential | Token absent everywhere but the header | Requirements REQ-005; e2e custody scan of responses, output and the data dir | Supported (contract) | Use |

SCN-005 (Docker, REQ-006) runs the same code against the node's own vault; it is API/E2E's to run (AC-006).

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Three docs this change edits still describe the old, public-only behavior | CT docs (DESIGN.md docs-follow-code; the design's docs list) | Reading the docs | Readers are told checks are unauthenticated and a 401/404 means "not public" | `update_notifications.md:146-151` ("one unauthenticated request … A `401` or `404` means the repository is missing or not public"), `:158-159` and `agent_packages.md:99-100` and `skills.md:80-81` ("REST API for the repository's identity and visibility"; the code comment itself changed this to "identity"), `agent_packages.md:91-92` ("installs a public GitHub repository archive") | Promote | This ticket | Wording only, in files this ticket edits: recorded in the Docs-Impact Verdict for delivery's documentation sync in this ticket. Not a source defect, so it does not hold back API/E2E |
| C-02 | After Connect, the import's earlier "connect GitHub" error stays until the next Import | SCN-002 | User connects after a failed import | Stale text until the user presses Import again | Handoff remaining observation; WEB-627-02 screenshot | Reject | — | The design's walk 3 has the user press Import again; the line itself shows "connected". Coupling both screens' stores to the connection would add machinery the design rejected. Not a defect |
| C-03 | A public repository whose installed commit codeload no longer serves (404) would get the "private / connect GitHub" text during edit capture | SCN-003 | Upstream force-push plus GitHub dropping the old commit | Misleading text on a failed update | Only a technical path; GitHub keeps serving unreachable commits; no product evidence it occurs | Hold for Evidence | — | Design walk 6 accepted that codeload's 404 can't be told apart. No score effect |
| C-04 | The Codex release check would show "connect GitHub" if `releases/latest` answered 404 | Walk 9 | openai/codex with no release | Misleading text | `openai/codex` publishes releases; the redirect answers 302 | Reject | — | Not a supported scenario |
| C-05 | The C-4 texts are English in zh-CN | SCN-004 | zh-CN user | English line in the card's status | Design: server texts are stored and shown as is (`lastError`); unchanged for every earlier server error | Reject | — | Approved design decision |
| C-06 | The rate-limit gate keys by host family, not token | Design Risks | Authenticated 403/429 | Could hold back the other kind of request | Recorded design risk ("start simple") | Reject | — | Recorded and accepted upstream |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Two download paths merged into `downloadArchive`; the generic URL-logging downloader is no longer used for archives | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining; C-1…C-4 matched word for word (texts, header forms, GraphQL shape) | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001…DS-003 and LS-1 run as designed; `request` is the code shape the design gave | — |
| Ownership boundary preservation and clarity | Pass | The client is the only caller of `gitHubRequest` with a token; installers and the skill repository take the client; `IntegrationConnectionService` stays the only writer | — |
| Off-spine concern clarity | Pass | Rate-limit gate reused unchanged; nothing new logged | — |
| Existing capability/subsystem reuse check | Pass | `IntegrationConnectionService` reused for connect/status/disconnect; ls-refs, gate and host allow-list reused | — |
| Reusable owned structures check | Pass | `requireToken` shared by both connect paths; `UNUSED_GITHUB_CLIENT` one fake for unreached methods | — |
| Shared-structure/data-model tightness check | Pass | `GitHubConnection { connected, login }`; `connectedAt` left out (no reader, P17) | — |
| Repeated coordination ownership check | Pass | The access rule lives once in `request`; every method uses it | — |
| Empty indirection check | Pass | `GitHubTokenReader` is a real I/O question with one production reader and test fakes (design, ARCH-REV-001) | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Header form in the transport; the rule and texts in the client; vault reading in `node-github-token.ts` | — |
| Ownership-driven dependency check | Pass | `integrations/github` → `secret-management` and `autobyteus-ts` secrets only; no import of `credential-proxy` | — |
| Visible dependencies check (P16) | Pass — deviation recorded, reason holds | `readToken` is a required constructor input at every site; only `readNodeGitHubToken` looks up the vault runtime per call, which `requireService()` fails loudly (`VAULT_UNAVAILABLE`), mapped to the vault text. Recorded in design § Task Design Health; confirmed by ARCH-REV-001 | — |
| Authoritative Boundary Rule check | Pass | The resolver calls the connection service only; installers call the client only | — |
| File placement check | Pass | `components/github/`, `stores/githubConnectionStore.ts`, `integrations/github/node-github-token.ts` | — |
| Flat-vs-over-split layout judgment | Pass | One new server file, three new web files | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `downloadArchive(owner, repo, revision, destinationFile)`, `githubConnection`/`connectGitHub`/`disconnectGitHub`, one subject each | — |
| Naming quality and naming-to-responsibility alignment (P15) | Pass | `publicGitHubRequest` → `gitHubRequest`; "private repository" always written in full; URL errors no longer say "public" | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | The two header-format lines repeat `credential-proxy-forwarder.ts:91-94` by recorded decision (dependency cycle otherwise) | — |
| Patch-on-patch complexity control | Pass | The old 404 and `private` branches were removed, not wrapped | — |
| Dead code removed in the touched files and modules (P7) | Pass | `buildGitHubRepositoryArchiveUrl`, the branch path, `getDownloadDir`, `fetchImpl`/`download`/`downloadFileFromUrlImpl` options, `GitHubSkillRepository.download`; `git grep` finds no leftover (`publicGitHubRequest`, "clone locally", "not public" in code) | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The unit access-rule test asserts the exact request/header sequence, every C-4 case, `wx` refusal, mode 0600, nothing written on 404, the reader never called for public; the GraphQL e2e scans responses, output and the data dir for the token and its Basic form | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `fakeGitHub`, `privateRepository`, `UNUSED_GITHUB_CLIENT` | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Tests of removed options rewritten against the client fake (DESIGN rule 11) | — |
| API/E2E readiness for the next workflow stage | Pass | Whole unit (9035) and integration (523) suites, affected e2e (79), live 2/2 (IMP-13), web 6121, typecheck at baseline, probe 5/5. Left to API/E2E: AC-006 Docker, built-server private import/update, full e2e suite | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `integrations/github/github-repository-client.ts` | 126 | 199 | Pass | +73 | Pass | Pass | — | — |
| `integrations/github/github-request.ts` (renamed) | 64 | 86 | Pass | +22 | Pass | Pass | — | — |
| `integrations/github/node-github-token.ts` (new) | 0 | 19 | Pass | +19 | Pass | Pass | — | — |
| `integrations/github/github-repository-source.ts` | 101 | 95 | Pass | −6 | Pass | Pass | — | — |
| `api/graphql/types/integrations.ts` | 185 | 221 | Pass | +36 | Pass | Pass | — | — |
| `agent-packages/installers/github-agent-package-installer.ts` | 313 | 285 | Pass | −28 | Pass | Pass | — | — |
| `agent-packages/services/agent-package-service.ts` | 387 | 390 | Pass | +3 | Pass | Pass | — | — |
| `skills/installers/github-skill-repository.ts` | 95 | 80 | Pass | −15 | Pass | Pass | — | — |
| `skills/services/skill-source-service.ts` | 319 | 320 | Pass | +1 | Pass | Pass | — | — |
| `codex-agent-runtime-strategy.ts` | 77 | 78 | Pass | +1 | Pass | Pass | — | — |
| web `GitHubConnectionLine.vue` (new) | 0 | 105 | Pass | +105 | Pass | Pass | — | — |
| web `githubConnectionStore.ts` (new) | 0 | 83 | Pass | +83 | Pass | Pass | — | — |
| web `AgentPackagesManager.vue` | 283 | 285 | Pass | +2 | Pass | Pass | — | — |
| web `SkillSourcesModal.vue` | 255 | 257 | Pass | +2 | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | "Anonymous first" is the one current rule, not a fallback |
| No legacy old-behavior retention in changed scope | Pass | `private` refusal and "clone locally" texts removed |
| Dead code removed in the touched files and modules (P7) | Pass | See the structural check |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; records keep their shape |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Data Contract Check (Principle 17)

- C-1 stored data: unchanged. The vault entry gains one reader; no record field added; `lastError` keeps its shape and only its wording changes.
- C-2 GraphQL: `GitHubConnection { connected: Boolean!, login: String }` from `status`/`connect`/`disconnect` (all three already return `IntegrationConnectionStatus`); `toGitHubConnection` drops `connectedAt`. The web store and generated types use the same two fields; nothing recomputes them. Errors keep the service's codes; the store maps them to localized texts.
- C-3: Bearer for `api.github.com`/`codeload.github.com`, Basic `x-access-token` for `github.com`, computed per hop after `familyOf`. Verified in `github-request-credentials.test.ts` (per host, per redirect hop, refused hop sends nothing).
- C-4: all four texts match the design exactly; the unit `it.each` asserts each text and that it never contains the token.
- Verdict: the implementation follows the contract with no mapping layer, recomputed fact or second copy.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the change adds a second consumer of the GitHub token, a connect path without an imported integration, and private-repository support. The implementation updated GLOSSARY.md, `agent_packages.md`, `credential_proxy.md`, `secret_management.md`, `skills.md`, `update_notifications.md` and the three web docs, and those are accurate. **C-01:** some older lines in the same files still describe the public-only behavior. They are this ticket's to correct (files it edits; the code comment beside them already changed) in delivery's documentation sync:
  - `autobyteus-server-ts/docs/modules/update_notifications.md:146-151`: "one unauthenticated request to `github.com` … A `401` or `404` means the repository is missing or not public." This should say that the request goes without a token first, and with this node's GitHub token on 401/404 (the access rule).
  - `update_notifications.md:158-159`, `agent_packages.md:99-100`, `skills.md:80-81`: "the REST API for the repository's identity and visibility". Visibility is no longer checked; this should say "identity".
  - `agent_packages.md:91-92`: "`importAgentPackage(input)` links a local path or installs a public GitHub repository archive". The word "public" should go, matching line 35.
- Files or areas likely affected: the three server docs above.

## Additional Material Premise Validation

None new or reclassified. AR-001 (ARCH-REV-001): `Confirmed`. It was measured (IMP-01: 404 from ls-refs, REST and codeload for a valid token without access), so the update-check "no access" text is correct.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-001…DS-003 and LS-1 run exactly as designed; one client per service for every GitHub step | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Rule and texts in the client, header in the transport, vault read in one function, one writer of the token | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | `downloadArchive` with an explicit commit and destination; three single-subject GraphQL operations; coded errors | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Small files in the owning folders; installers lost their transport | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | `GitHubConnection` has only fields with readers; `requireToken` shared; one unused-client fake | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | `gitHubRequest`, "private repository", the C-4 texts | The doc wording of C-01 (not code) | Delivery's doc sync |
| 7 | API/E2E Readiness | 9.4 | Whole unit and integration suites, affected e2e, live test with the token, web suite, browser probe | AC-006 Docker and built-server live runs remain; the test token expires 2026-11-25 | API/E2E runs the live checks first |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Every C-4 case and REQ-007 tested; `wx`/0600; nothing written on refusal; the token never in a URL, error or response | Codeload's undocumented header behavior (recorded risk) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Old refusal, texts, options and branch path removed; no dual path | — | — |
| 10 | Cleanup Completeness | 9.2 | Dead code and stale tests removed; P15 wording fixed in code and UI texts | C-01: three docs it edits keep old lines | Delivery's doc sync corrects the listed lines in this ticket |

## Findings

No source findings. C-01 is a documentation correction in this ticket, listed in the Docs-Impact Verdict for delivery's documentation sync. It does not need another implementation round.

## Follow-ups

- Follow-ups this review added: None. C-01 belongs to this ticket (files it edits); C-02…C-06 are rejected or held, not follow-ups.

## Classification

N/A (Pass).

## Recommended Recipient

- `/api_e2e_engineer` (pass), with an informational notice to `/implementation_engineer`.

## Residual Risks

- codeload honouring the `Authorization` header is measured but undocumented. The live test catches a change (metadata passes, the download says "no access").
- `test.github.token` expires 2026-11-25. Live evidence after that needs a renewed token, or an evidence decision.
- The rate-limit gate keys by host family, not token (recorded design risk).
- A token without access and a rejected token both give codeload 404. The rejection is read from REST or ls-refs, which always run first (design walk 6).
- AC-006 (Docker) has not been run yet.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.2 (lowest: Cleanup Completeness 9.2, docs C-01)
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: run the live checks before the test token expires (2026-11-25). C-01 doc lines go to delivery's documentation sync.
