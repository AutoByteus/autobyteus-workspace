# Solution Revision Record — secrets-and-integrations-design (autobyteus-244)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Evidence + Requirements) | Task `autobyteus-244`, bookmark lifted 2026-10-25 | Threat model T1–T5; measured root-key and environment readability | N/A | Ready for Approval | BEH-001..005, UC-001..006, REQ-001..008, DEC-001..009 | Options report; questions to the user |
| SR-002 | Evidence + Requirements | The user, 2026-10-25: integrations model; "validate by yourself … write it to a file … user journey" | V1–V7 | Ready for Approval | Ready for Approval | DEC-001, DEC-004, DEC-006, DEC-009 | `solution-validation.md`; probes in `probes/` |
| SR-003 | Requirements (decisions) | The user, 2026-10-25: distribution, Jira market, "sounds good" | — | Ready for Approval | Ready for Approval (partly approved) | DEC-001, DEC-003, DEC-009, DEC-010, REQ-009 | Model approved; GitHub first; Jira Cloud; official-only; P1 waits for DEC-002 |
| SR-004 | Requirements (scope change by the user) | The user, 2026-10-26: "this proxy ticket could be future ticket. currently we work on mcp secret in vault?" | — | Ready for Approval | Draft (MCP-secrets scope) | Scope, FU-001…FU-004 | This ticket = MCP secrets in the vault; proxy, integrations, SSH and root key become follow-ups |
| SR-005 | Requirements (approval) | The user, 2026-10-26: UI approved; env delivery to stdio approved | — | Ready for Approval | **Approved** (MCP-secrets scope) | MREQ-001…008, MDEC-001…005 | Design next |
| SR-006 | Design | Requirements approved (SR-005) | — | N/A | Design Ready (Large/High) | DS-001…DS-005 | `design-spec.md`; sent to architecture review |
| SR-007 | Design (revision) | ARCH-REV-001 Fail (Design Impact) | AR-001…AR-010 | Design Ready | Design Ready (Large/High) | DS-001…DS-007, interfaces, file mapping | Move through the provider; states owner; server draft; live-check path; header rows; token states. Requirements unchanged |
| SR-008 | Requirements + Design (revision) | CRR-001 Fail: CR-001/CR-002 Design Impact, CR-003 Requirement Gap | CR-001…CR-004 | Design Ready | Design Ready (Large/High) | MDEC-006, MDEC-007; DS-001, the import path, the provider interface, web review state | Backups only from the move; the banner shows unreviewed candidates only; import keeps its own references and turns foreign ones into "needs secret" |

## Revision Entries

### SR-001 — Baseline: options and recommendation

- Trigger: Task `autobyteus-244` and all four user comments of 2026-10-25 (proxy/broker idea, SSH case, integration vision, bookmark lifted).
- Key evidence:
  - Measured: a same-user shell can read the vault key file and other processes' environments (macOS 26.5.2).
  - Read: agent shells inherit the server environment; the vault is a closed catalog; nodes have no authentication; `git credential fill` prints tokens.
- Supplement: `options-report.md`.
- Approval: none yet. DEC-001…DEC-008 need the user, and are asked directly in the Solution Designer conversation.
- Next action: the user's answers, then the design spec for P1 (and the phase Tasks).

### SR-002 — The Integration model, self-validated

- Trigger: the user, 2026-10-25: "all of them are supported by integrations … when they configure, then it is stored in the vault … on the server side … validate by yourself whether this works or not … write it to a file for your solutions and the validations … provide a simplest user journey".
- Validations (Measured, dummy values, local services only; probes in `probes/`):
  - V1 credential proxy: no token in the shell, forged auth replaced, allow-list and capability enforced, echo redacted, audited;
  - V1b real `git clone` through the proxy;
  - V2 ssh-agent: no export, real SSH login, host restriction enforced (A ok, B refused);
  - V3 a credential helper leaks the token (rejected as a boundary);
  - V4 a stdio MCP env token is readable (stays the stated exception);
  - V5 the vault key is readable (a gap; hardening P4 moved earlier);
  - V6 a fixed template works with an allow-list;
  - V7 keychain ACL: Read only (would prompt the user; validate in P4).
- Changed: DEC-001 reframed as the Integration model; DEC-009 moves P4 (macOS root key) right after P1.
- Approval: still none; the user's answers to DEC-001…008 are pending.

### SR-003 — Distribution, scope and first approvals

- Trigger: the user, 2026-10-25, asked how integrations are held and installed (marketplace, our GitHub repository, click install).
- Read: the existing GitHub package installer and update checks for agent packages and skill sources.
- Added DEC-010 (Needs user): declarative definitions; built in for v1; an official GitHub repository catalog for v2; third-party with a host-trust step later.
- Follow-up the same day: the user (2026-10-25): "if people are able to install the integration from GitHub, then it will be quite dangerous … I think the integration idea is really, really good … GitHub … Jira … Google Doc … later … Discord". Recorded as a direction: official, curated definitions only, no open third-party install. Integrations named: GitHub, Jira, Google Docs, Discord.
- Read: `autobyteus-message-gateway` already supports Discord and others (`src/external-channel/discord-binding-identity.ts`), with its tokens set as environment/`.env` secrets (`README.md` L50-98). Those are a future consumer of the same vault.
- The user, 2026-10-25: "The messaging gateway will possibly be integrated, will be refactored, maybe changed into integrations in the future." Recorded: out of scope now; REQ-009 keeps room for inbound integrations (bot connections, webhooks) in the same model.
- The user, 2026-10-25: "many small team has no jira … many company use them, so do they use cloud version or self hosted version do you know that?" Read (web): Atlassian Data Center end of life 2029-03-28; new-customer sales ended 2026-03-30; 99% of customers have a Cloud footprint. DEC-003 recommendation: Jira Cloud; self-hosted via the generic HTTP-token integration only. The user also agreed GitHub goes first.
- Approvals recorded (2026-10-25): DEC-001 the Integration model ("I think the integration idea is really, really good", after proposing it himself); DEC-003 Jira Cloud and DEC-009 GitHub first ("okayyy. sounds good."); DEC-010 direction: official, curated definitions only.
- Still needed before the P1 design: DEC-002 (fine-grained GitHub token now, sign-in later). DEC-004…DEC-008 are decided per phase.
- Recorded on the Task: a comment on autobyteus-244 (2026-10-25), with this package's documents attached.

### SR-004 — Scope narrowed to MCP secrets in the vault

- Trigger: the user, 2026-10-26: "i guess this is the same approach for all the others … i guess this proxy ticket could be future ticket. currently we work on mcp secret in vault?"
- Change: this ticket builds the MCP secrets in the vault. The proxy, the Integrations page and GitHub (FU-001), SSH (FU-002) and root-key hardening (FU-003, urgent) are follow-ups in `follow-ups.md`. DEC-002 (GitHub token type) moves with FU-001.
- Next: MCP-secrets requirements and the decisions they need (which values are secret, migration of the existing plain values, env delivery to stdio servers).
- The user, 2026-10-26: "AUTOBYTEUS_API_KEY is actually not usable anymore … i guess this mcp better use jira or github mcp as way for testing". Added MDEC-005: dummy-secret automated tests on our test MCP servers, plus a gated live check with GitHub's remote MCP server and a dedicated read-only test token in the test vault; Jira Cloud as an optional second check.
- The user, 2026-10-26: "where do i get that github token then? so that later you can test". Read: TESTING.md "Test vault" (the user runs `pnpm test-vault setup --source <file>` from an owner-private file; agents never pick it); the test vault imports only known aliases. Added MREQ-008 (a test-vault alias for the GitHub live-check token).
- 2026-10-26, at the user's request: created the private test repository `ryan-zheng-teki/autobyteus-mcp-test` with `gh` (signed in as ryan-zheng-teki): README on `main`, issue #1. The fine-grained token is left to the user (GitHub web UI only).
- 2026-10-26, at the user's request ("you can ask Computer Use Operator to do this for me for setting up github generate the token"): delegated the token creation to `/computer_use_operator` (run `computer_use_operator_810d89fa08674e7ea722e102ecd43bf7`). Brief: fine-grained, 30 days, only `autobyteus-mcp-test`, Contents and Issues read-only. Stored only in `/Users/normy/.autobyteus-test/secrets/github-mcp-test.env` (mode 600) as `AUTOBYTEUS_TEST_GITHUB_TOKEN=…`. The value is never in a message, log or repository; stop and ask the user on password, 2FA or sudo prompts.
- 2026-10-26: the Computer Use Operator reported the token created: `autobyteus-mcp-test`, owner ryan-zheng-teki, expires 2026-11-25, only `ryan-zheng-teki/autobyteus-mcp-test`, Contents/Issues/Metadata read-only. The user picked the Chrome profile `Ryan` and completed GitHub's sudo confirmation himself. Verified by the Solution Designer without printing: `~/.autobyteus-test/secrets/github-mcp-test.env` is mode 600 in a 700 folder, one line `AUTOBYTEUS_TEST_GITHUB_TOKEN=github_pat_…`; the operator's report folder (`computer-use-results/`, untracked in the main checkout) contains no token-like string. Next: the user runs `pnpm test-vault setup --source ~/.autobyteus-test/secrets/github-mcp-test.env` once the alias (MREQ-008) exists.
- The user, 2026-10-26: "please add this token into test vault yourself … we will not remove this test project. maybe in the future we could use it for testing as well". Read: `local-import-credential-alias-registry.ts` accepts only a fixed list of provider aliases; others resolve to `null` and are skipped, so the import would store nothing today (not run, to avoid touching the test vault without effect). MREQ-008 now says the team imports it once the alias exists, and the test repository stays as the permanent GitHub live-test target. Note: the token expires 2026-11-25; long-term use needs a renewal or a longer expiry (the user's call).
- The user, 2026-10-26: "i like your suggestion. thats good." Recorded as approval of MDEC-001 (lock toggle per row, pre-ticked by name/value patterns), MDEC-002 (a banner plus a per-row "Move to vault" for existing plain values, with a backup) and MDEC-004 (import uses the same rule). Still open: MDEC-003 (env delivery to stdio servers, with the stated limit).

### SR-005 — MCP-secrets requirements approved

- The user, 2026-10-26: "i like your suggestion. thats good." (MDEC-001/002/004: lock toggles pre-ticked by name/value patterns, the banner and per-row "Move to vault", import using the same rule). After the dummy-value demo (`env` empty; `ps -E -p <pid>` shows it): "I get it … I think it is the way I am much better now … Obviously we cannot guarantee every case, but as long as we are better than that's fine." (MDEC-003). MDEC-005: the test repository and token were made at his request.
- Status: requirements Approved for this ticket's scope. Next: architecture design.

### SR-006 — Architecture design (MCP secrets in the vault)

- Trigger: the requirements were approved at SR-005.
- Evidence: "Architecture Investigation" in `investigation-notes.md`, covering six config construction sites, the resolver pattern, `SecretId` being lowercase only, the GraphQL value exposure, and the dead workspace provider.
- Design: `design-spec.md`.
  - Secret references `{vaultSecretId: "mcp.<uuid>"}` in `mcps.json`.
  - A core `McpSecretResolver` is given to `McpServerInstanceManager` and used by the managed servers at connect.
  - The server owns the `mcpServer` vault consumer kind, the MCP secret fields, the secret suggestion rule and the move with backup.
  - GraphQL makes a clean cut to entries with `secret`/`configured` flags.
  - Web: lock toggles, the banner and the review dialog.
  - A test-vault alias is added for the GitHub token, with a gated live check.
- Correction to the user (recorded here and in the design case): earlier I said each run's MCP server gets its own workspace folder (`AUTOBYTEUS_AGENT_WORKSPACE`). That is false: `setWorkspacePathProvider` has no caller. The design removes the dead code.
- Classification: Large / High, so it goes to architecture review.

### SR-007 — Design revision after ARCH-REV-001

- Trigger: `design-review-report.md` ARCH-REV-001, Fail (Design Impact). Every cited line was re-opened and confirmed ("Architecture Investigation, round 2").
- Resolutions:
  - **AR-001:** `McpConfigService.moveSecretsToVault` drives the move under a service write lock. The sequence is: vault saves → `provider.replaceWithReferences` (backup, then an atomic rewrite under the file lock, then a cache update) → compensation on failure → core `addConfig` + `registerServer`. Only the provider writes `mcps.json` and its backup. `mcp-secret-move.ts` is dropped.
  - **AR-002:** `McpServerSecretFields.statesOf` is the one owner of the secret state. `McpSecretState` is `PLAIN | CONFIGURED | MISSING | VAULT_UNAVAILABLE` and is never thrown. The converter maps a view, and the configure result uses the same view. The card derives "needs secret" from the states.
  - **AR-003:**
    - `McpServerDraft` (plain / newSecret / keep) is used by configure, preview and import, with `McpConfigService` signatures.
    - `McpServerSecretFields` has a store mode and a preview mode.
    - `field` = `env:<NAME>` / `header:<Name>` / `token`.
    - `McpTokenInput` takes `{value}` or `{keep}` (absent = none).
    - The JSON-tab keep markers `{"stored": "vault"|"plain"}`.
    - `createDomainConfigFromInput`/`toStringRecord`/`asRecordStringString` are removed.
  - **AR-004:** a test-side `readLiveTestSecret` reads `test.github.token` from the test vault read-only. The suite's own application vault stores it through `configureMcpServer`. `test.github.token` is a test-only known ID: never authorized for a consumer, and its alias is accepted only by `test-vault setup`.
  - **AR-005:** `useSecretResolver` runs in `server-runtime.ts` after vault initialization (L175), before listen.
  - **AR-006 (decided within MDEC-001/MDEC-002, the user is informed):** always-secret fields (`token`, `Authorization`) never return a value, even while stored plain ("Stored as plain text · Move to vault"). Other plain values are settings and are returned, with a "Looks like a secret" hint. Candidates always include plain always-secret fields. The token output is `tokenState` (null = none).
  - **AR-007:** the form gains header rows (the env-row component shared), each with a lock toggle. This follows directly from MDEC-001; there is no new visual language, so no Product Design round.
  - **AR-008:** vault saves come before the file write, and removals after it commits. New entries are removed if the write fails.
  - **AR-009:** a paragraph on how the record shape meets MREQ-004.
  - **AR-010:** stale status lines refreshed (requirements meta, MDEC-005, MREQ order, readiness; investigation meta; this index).
- Also adopted from the residual risks: the backup is mode 0600 and the user is told its path and contents; a shared test vector keeps the rule's server and web matching the same.
- A form save that locks a stored plain row also writes the backup (MREQ-005), via the provider's `update`.
- Classification unchanged: Large / High, back to architecture review.
- ARCH-REV-002 (2026-10-26): Pass. AR-011…AR-014 are low-severity implementation clarifications that keep today's behavior; they were routed by the reviewer to the Implementation Engineer.
- The user, 2026-10-26, after being told of the AR-006/AR-007 decisions: "You can make reasonable decisions because I think you're more professional than me, you know." Recorded as a **standing direction for this ticket**: the Solution Designer makes reasonable design and product-detail decisions within the approved scope and informs the user afterwards. The user's explicit approval is still required for:
  - any change to his data (`mcps.json`, `~/.autobyteus`), with a backup;
  - credentials, passwords, 2FA or sudo;
  - releases;
  - changes of scope or product direction.
- **Correction (2026-10-26), at the user's question** ("you said that I said something is always secret … Is that just true?"): the "always secret" rule was the Solution Designer's recommendation, not the user's words. Checked against the conversation:
  - In chat I showed only the HTTP token as "always locked". The `Authorization` header appeared only as a move candidate. The "token and `Authorization` always secret" wording was in the requirements doc's MDEC-001 recommendation.
  - The user approved the overall UI with "i like your suggestion. thats good."
  - My message "you said these are always secret" therefore misattributed the rule to him.
  - The rule stays, as a Solution Designer decision under the standing direction above: these two fields carry nothing but credentials, so hiding them has no cost for settings.

### SR-008 — Revision after code review CRR-001

- Trigger: `code-review-report.md` CRR-001 (reviewed at `90c21a7cdb`; artifacts in `dba930bb54`). CR-001 and CR-002 are Design Impact, CR-003 a Requirement Gap, CR-004 a Local Fix. Evidence re-read: the review's import code (`mcp-config-service.ts` L40-80, L329-361), the web preference pattern (`utils/chat/chatLastModelPreference.ts`), `windowNodeContextStore`.
- Decisions, made by the Solution Designer under the user's standing direction (2026-10-26); the user is informed:
  - **CR-001:** only the move writes backups. `provider.update` writes none. In the form, an unchanged stored plain row offers "Move to vault" (the per-row move, with its backup notice) instead of a lock toggle. A changed or new value can still be locked (`newSecret`).
  - **CR-002 (MDEC-006):** the banner shows only unreviewed candidates. Reviewing means unticking in the dialog, "Keep as they are", or unlocking a pre-locked row and saving. The state is a per-device web preference, `autobyteus.mcp.secretReview.<node key>`; there is no migration, and if it is lost the banner shows once more.
  - **CR-003 (MDEC-007):** an imported reference is `keep` when the same server holds the same reference at the same field. Otherwise it becomes `missingSecret`: a fresh empty reference, state MISSING, "needs secret". It is listed in the new import-result field `needsSecret`. This narrows autobyteus-190 SCN-002 only for secret values.
  - **CR-004:** the implementation deletes the three twins.
- Classification is unchanged: Large / High. The changes are bounded: one draft kind, one result field, one provider branch removed, and one web preference module. Per the configured route, a revised Large/High package goes to architecture review (a focused round on SR-008), then to implementation (CR-001…CR-004), then back to code review.
- ARCH-REV-003 (2026-10-26): Pass. AR-015 (key the review state by the node `entryId`) goes to implementation. **AR-016 adopted** by the Solution Designer: on import, if a server with the same ID here already holds a reference at that field, it keeps its own reference (`keep`), whatever the imported reference is. Without this, re-importing an older copy of your own file (made before a Replace) would remove the working secret. It is just as safe, because a foreign ID is never adopted. MDEC-007 and the design's CR-003 bullet are reworded. This is the reviewer's own pre-reviewed recommendation, so it goes straight to implementation with no further review round.
