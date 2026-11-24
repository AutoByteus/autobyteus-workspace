# Design Review Report — autobyteus-627 Private GitHub Repositories for Agent Packages and Skills

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/private-github-packages-627/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `tickets/in-progress/private-github-packages-627/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/private-github-packages-627/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `tickets/in-progress/private-github-packages-627/design-spec.md` (Ready, SR-002)
- Supplemental Task Artifacts Reviewed: `probe-627-results.txt` (evidence; statuses only); `handoff-architecture-review.md`; `follow-ups.md` (FU-627-01, FU-627-02)
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `tickets/in-progress/private-github-packages-627/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `Medium`/`High`, 2026-11-24. Design approval by the founder: `Not required` (the go-ahead covers design and implementation).
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/private-github-packages-627`, branch `codex/private-github-packages-627` at `6545fcfad3` (design commit `93bf7674c3`). Code read at the base `e3cf5454a4` with `git show`:
  - `integrations/github/public-github-request.ts` (all); `github-rate-limit-gate.ts` (`learnFrom`); `types.ts:17`.
  - `credential-proxy/integration-connection-service.ts:1-152`; `credential-proxy/integration-catalog.ts:205-242`; every caller of `disconnect`/`removeForConsumer`.
  - `secret-management/secret-vault-runtime.ts`; `server-runtime.ts:140-185`.
  - `agent-packages/installers/github-agent-package-installer.ts:63, 195-240`; the four `new GitHubRepositoryClient(` sites; every `buildGitHubRepositoryArchiveUrl` reference (the Application Packages installer imports its own copy from `application-packages/utils/github-repository-source.ts`).
- Skill update applied: the updated reviewer skill (2026-11-23) adds Principle 17 and a Data Contract Verdict, reviewed before the spines.

## Routing Classification Review

- Task size: `Medium` (about 12 server and 8 web files; existing owners; no persistence change).
- Architectural risk: `High`:
  - a secret gains a second consumer and a write path without an imported integration;
  - the shared GitHub client's request contract changes for every user;
  - the codeload behavior relied on is undocumented.
- Independent Architecture Review required by the classification: `Yes` (High).
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements / intended behavior understood:
  - A private repository imports (Agent Packages and Skills, DEC-003) and updates when this node's GitHub token can read it. The token is the GitHub integration's own, in this node's vault (DEC-001).
  - The user connects inline (DEC-002, refined in SR-002 as an always-visible connection line in the import areas).
  - Failures tell three cases apart (REQ-004).
  - The token never leaves the vault except as a request header to GitHub (REQ-005).
  - Docker nodes use their own connection (REQ-006).
  - Public sources are unchanged, even with a rejected token (REQ-007).
- Relevant existing behavior and evidence confirmed:
  - `publicGitHubRequest` sends no credentials. It follows redirects only to allowed hosts and paths (`familyOf`), and rate-limit answers throw `GitHubRateLimitError` before any status reaches the caller (`public-github-request.ts:27-69`; gate `learnFrom`). So a rate-limited 403 can never be read as "no access".
  - `IntegrationConnectionService.connect`/`status`/`disconnect` depend only on the static `DeliveryDefinitions`, not on an imported integration (`integration-connection-service.ts:57-108`). The new connect path therefore works as designed.
  - Nothing removes a token at startup or by reconciliation: the only disconnect callers are the resolver (`integrations.ts:201`) and the catalog when a source is removed or an update drops the integration (`integration-catalog.ts:225-242`). A token connected from an import area stays until a user disconnects or the integration's source goes, as the design states.
  - The vault runtime is initialized early in startup (`server-runtime.ts:162`), and `requireService()` throws `VAULT_UNAVAILABLE` (`secret-vault-runtime.ts:60-66`). P16's conditions hold (see below).
  - The branch-archive path is unreachable: `GitHubRepositoryRevisionMetadata.latestRevision` is required (`types.ts:17`), so `github-agent-package-installer.ts:226-236` never takes the branch form.
- Scope guardrail confirmed: UC-001…005 are in scope. Out of scope: Application Packages (FU-627-01), Device Flow (FU-627-02), other hosts, local clones (autobyteus-457), the vault-reading OS-user limit.
- Every prospective blocking `Design Impact` finding is traceable: N/A (no blocking finding).
- Remaining material ambiguity: one unmeasured status (AR-001, non-blocking).
- Statements about existing code the design relies on: the cited lines match.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | AR-001 (measure one status in the live test) |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probe-627-results.txt` | Pass | Pass | Pass | Pass | Pass | Evidence only; matches investigation §2.2–2.3 |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature + duplicated download policy | — |
| Root-cause classification is explicit and evidence-backed | Pass | Two archive paths with different gates, timeouts and logging (`download-utils.ts:17,69`; `github-skill-repository.ts:93-100`) | — |
| Refactor decision is explicit | Pass | Yes, limited to moving archive download into the client | — |
| Refactor decision is supported by the concrete design sections | Pass | `downloadArchive`, removal plan, file mapping | — |

## Data Contract Verdict

| Record / Message | Each Field Has A Meaning, A Writer And A Reader? | Identities, Relationships And Lifecycle Are Explicit? | Each In-Scope Flow Walked Through It, With An Example Per Case? | Checked Against Existing Data And Real Dependencies? | The Layers Above Follow It Without Mappings, Recomputed Facts Or Second Copies? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| C-1 stored data (vault entry, `connections.json`, package/skill records) | Pass | Pass | Pass | Pass | Pass | Pass: nothing changes shape. The new reader of the vault entry is named; only check-error wording changes |
| C-2 GraphQL `GitHubConnection` + `githubConnection`/`connectGitHub`/`disconnectGitHub` | Pass | Pass | Pass | Pass | Pass | Pass: `connected`/`login` from `status("github")`; `connectedAt` left out (no reader); errors use the existing codes |
| C-3 outgoing credential header per host | Pass | Pass | Pass | Pass (probes §2.2–2.3) | Pass | Pass: Bearer for api/codeload; Basic `x-access-token` for github.com; recomputed per redirect hop within `familyOf` |
| C-4 failure messages | Pass | Pass | Pass | Fail (one status unmeasured) | Pass | Pass, with AR-001 (non-blocking): ls-refs with a valid token that can't see the repository is not measured. REQ-004's update-check message depends on it being 404, not 401 |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Import (packages, skills) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Check and update | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Connect / disconnect | Pass | Pass | Pass (thin resolver; service is the governing owner) | Pass | Pass | Pass | Pass |
| LS-1 | Access rule (bounded local, in the client) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `GitHubRepositoryClient` (access rule, messages, downloads) | Pass | Pass | Pass | Pass | Installers and the skill repository take the client; nobody calls `gitHubRequest` with a token directly except the client |
| `IntegrationConnectionService` (only writer of the vault entry) | Pass | Pass | Pass | Pass | Both connect paths go through it |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `integrations/github` → `secret-management` | Pass | Pass (must not import `credential-proxy`: cycle) | Pass | Pass | — |
| `agent-packages`, `skills`, Codex strategy → `integrations/github` | Pass | Pass | Pass | Pass | — |

Composition root / Principle 16: `Pass — deviation recorded, reason holds`. Each client receives a required `readToken` through its constructor (all four sites pass it). Only the one reader function looks up the vault runtime, as `getIntegrationConnectionService` does, and the three conditions hold:
- startup initializes the vault before listening and scheduled checks (`server-runtime.ts:162`);
- a missing runtime throws `VAULT_UNAVAILABLE`, reported as the C-4 vault text, never a silent fallback;
- there is no cycle.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GitHubTokenReader` / `readNodeGitHubToken` | Pass | Pass | Pass | Low | Pass (a real I/O boundary with a test fake; not an empty port) |
| `gitHubRequest(url, {token?})` | Pass | Pass | Pass | Low | Pass |
| `GitHubRepositoryClient.downloadArchive(owner, repo, revision, file)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `githubConnection` / `connectGitHub` / `disconnectGitHub` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Token check and storage | Pass | Pass | N/A | Pass | `IntegrationConnectionService` reused |
| Header forms | Pass | Pass | N/A | Pass | Two fixed lines repeated from `credential-proxy-forwarder.ts:91-94`; importing would create a cycle. The deviation is recorded and the reason holds |
| Archive download | Pass | Pass | N/A | Pass | Merged into the client (gate, host checks, 120 s timeout, no URL logging) |
| Web token field | Pass | Pass | Pass | Pass | Follows `IntegrationDetail.vue`'s pattern; that component is bound to a card |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `integrations/github` | Pass | Pass | Pass | Pass | Gains `node-github-token.ts` |
| `api/graphql/types/integrations.ts` | Pass | Pass | Pass | Pass | Three thin entries |
| Web: `components/github`, `stores/githubConnectionStore.ts` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Archive download (two paths) | Pass | Pass | Pass | Pass | One client method |
| Access rule | Pass | Pass | Pass | Pass | One owner, every request |

## Shared Structure Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GitHubConnection` | Pass | Pass | Pass | N/A | Pass | — |
| `GitHubRequestOptions` + `token` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure: `Pass` (stored check-error text shown as is by the two views; the integration card reads the same connection).

Vocabulary (Principle 15): `Pass`:
- "private repository" is always written in full, apart from agent-private skills;
- "GitHub connection", "connection line" and "access rule" are defined;
- the glossary's "public GitHub client … (no token)" is corrected in this change;
- `publicGitHubRequest` is renamed.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server files (10) and web files (7) in § Final File Responsibility Mapping | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `integrations/github/node-github-token.ts`, `github-request.ts` | Pass | Pass | Low | Pass | — |
| `autobyteus-web/components/github/GitHubConnectionLine.vue` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `private` refusal and "clone locally" texts | Pass | Pass | Pass | Pass | — |
| `publicGitHubRequest` → `gitHubRequest` (file rename) | Pass | Pass | Pass | Pass | `PublicGitHubRequestOptions` goes with it |
| `GitHubSkillRepository.download` and options | Pass | Pass | Pass | Pass | — |
| Installer's `fetchImpl`, `downloadFileFromUrlImpl`, `getDownloadFileFromUrl` | Pass | Pass | Pass | Pass | `utils/download-utils.ts` stays for other callers |
| `buildGitHubRepositoryArchiveUrl` (integrations copy) + `latestRevision?` branch | Pass | Pass | Pass | Pass | Unreachable (`types.ts:17`); Application Packages import their own copy, so they are unaffected |
| Tests of removed options | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Request function, refusal texts | No | Pass | Pass | "Anonymous first" is the one current rule, not a legacy fallback |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Registry, skill source store, `connections.json`, vault | `Not Affected` | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Five steps (request, client, rewiring, GraphQL and web, tests and docs) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Access rule | Yes | Pass | Pass ("token whenever connected" breaks public imports on a rejected token) | Pass | — |
| Connection line states; GraphQL and stored-error examples | Yes | Pass | N/A | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A private source becomes unreadable to a still-valid token, then its update check runs

- Related approved requirement: REQ-004 / AC-004 (the "no access" case must not read as "token rejected").
- Initiating basis kind: `User` / `System`. The user removes the repository from the token's selection on GitHub, or the repository is deleted or renamed. The scheduled check then runs (SCN-003).
- Forward path (design): `fetchDefaultBranchHead` → ls-refs without a token: 401 → read the token → ls-refs with the valid token → status `X`. If `X` is 401 the design stores "token rejected … Reconnect"; if `X` is 404 it stores "no access".
- Evidence: measured ls-refs statuses are 401 anonymous, 200 with access, and 401 with an *invalid* token (§2.3). A *valid* token without access on ls-refs is not measured. REST with a valid token and no access is 404 (documented, measured anonymously).
- Reachability: `Reachable`. The consequence depends on `X`: a misleading "Reconnect" that would not help, while installed content stays unchanged.
- Review consequence: AR-001 (non-blocking). Measure `X` in the planned live test (the test token against a repository name it cannot read), before the token expires on 2026-11-25.

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking. AR-001 is a measurement in the planned live test.

## Review Decision

`Pass`. The upstream behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported material premise.

## Findings

No blocking finding.

### AR-001 — One status the failure messages rely on is not measured (non-blocking)

- Type: `Unclear` (evidence); severity: Low; blocking: No.
- Protects: REQ-004, AC-004.
- Problem: MP-001. C-4 maps a 401 with the token to "token rejected" and 403/404 to "no access". For ls-refs (the update check), the status for a *valid* token that cannot read the repository is assumed, not measured. If GitHub's git endpoint answers 401 there (as some git servers do to prompt for credentials), an update check for a repository the token no longer reaches would say "Reconnect GitHub", which would not help.
- Required update:
  - The live test (design § Guidance, gated like `mcp-github-remote-live`) also sends REST and ls-refs with the test token to a repository name the token cannot read (a non-existent name works), and records both statuses.
  - If ls-refs answers 404, the design holds as is.
  - If it answers 401, return it to the Solution Designer as a Design Impact. One possible response: tell "rejected" from "no access" with a `GET /user` call using the same token, as `verifyToken` does.
- Why proportionate: one extra request in a test that already runs, before the token expires.
- Recipient: implementation engineer (as part of the live test); Solution Designer (if the status is 401).

## Classification

N/A (Pass). AR-001 is a non-blocking `Unclear`.

## Recommended Recipient

Implementation engineer (primary). Solution Designer (informational, with AR-001).

## Residual Risks

- **Test token expiry (2026-11-25, tomorrow).** The live transport test, including AR-001's two statuses, has to run before then, or the founder renews the token.
- **Undocumented codeload behavior.** If codeload stops honoring the header, private downloads fail with "no access" while metadata succeeds. The live test catches it; the named fallback is the REST tarball with the signed redirect kept out of logs and errors.
- **DEC-015 consequence.** Removing the GitHub integration's source, or a source update that drops it, disconnects GitHub (`integration-catalog.ts:225-242`). With one token, that also ends private imports. The design accepts this, and the removal confirmation names the connection. A token connected only from an import area is not removed by anything else.
- **Rate-limit gate.** It is keyed by host family, not by token: recorded, not designed for (DESIGN "start simple").
- **The token as a GraphQL argument.** `connectGitHub(token)` carries the token the way `connectIntegration(id, token)` does today. The custody scan (AC-005) should include any GraphQL request logging.
- **The Codex release check** shares the client. A 404 on `openai/codex` `releases/latest` would send this node's token (Basic) to github.com. That is harmless (a GitHub host, a public repository) and not expected.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-001)
- Material-Premise Gate: `Pass`. MP-001 is reachable; its single unmeasured status is covered by AR-001's measurement in the planned live test.
- Notes: `task_size=Medium`, `architectural_risk=High`. The design is ready at SR-002 (`93bf7674c3`). The core shape is sound:
  - one access rule owned by the client, anonymous first, so public sources stay immune to a bad token;
  - the token only in a header, with no credential-bearing URL ever created;
  - one archive-download owner, so agent package archive URLs are no longer logged;
  - a second connect path through the existing service, which is still the only writer;
  - a sound P16 deviation and a complete removal plan.
