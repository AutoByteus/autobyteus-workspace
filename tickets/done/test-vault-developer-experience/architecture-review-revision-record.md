# Architecture Review Revision Record

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial handoff (Large/High), basis moved to SR-007 during the review | SR-006, SR-007 | N/A | Fail | AR-001..AR-006 |
| ARCH-REV-002 | Round 2 / resubmission answering ARCH-REV-001 (commit `67d1aaaacc`) | SR-008 | Fail | Pass | AR-001..AR-008 |
| ARCH-REV-003 | Round 3 / SR-009 delta (commit `a55dbc4a44`) | SR-009 | Pass (SR-008) | Fail | AR-009..AR-012 |
| ARCH-REV-004 | Round 4 / SR-010 resubmission answering ARCH-REV-003 (commit `14df2e9005`) | SR-009, SR-010 | Fail | Pass | AR-008..AR-013 |

## Revision Entries

### ARCH-REV-001 — Initial baseline: sound core, four bounded corrections

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer handoff at SR-006 (commit `4bda51cb6d`); SR-007 docs-only update (commit `51c389fe6b`) received mid-review and included.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`, `handoff-result.md`; N/A
- Relevant solution revision IDs: SR-006, SR-007
- Prior authoritative decision: N/A
- Current authoritative decision: Fail
- Baseline established:
  - Confirmed: the source selection owned in one place, the read-only store behind the unchanged service, the verify-only bootstrap, the real-app-data guard (Electron production is always `~/.autobyteus/server-data`), the test-only autobyteus-ts default slot, the removal plan and the persisted-data decisions.
  - AR-001: SR-007's `export` instruction makes P-001 reachable, and the design forwards the selector to every built test server. Deterministic `pnpm test:e2e` would then hit the read-only vault, which contradicts the preserved boundary.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (Design Impact, High);
  - AR-002 (Design Impact, Medium);
  - AR-003 (Requirement Gap, editorial, Medium);
  - AR-004 (Design Impact, Low);
  - AR-005 and AR-006 (non-blocking recommendations).
- Material classification changes: None (Large/High confirmed).
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: P-002 (setup re-run from an older worktree) is Unclear; R-A and R-B are accepted.

### ARCH-REV-002 — Round 2: ARCH-REV-001 findings resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/design-review-report.md`
- Review round and trigger: Round 2. Solution Designer resubmission at SR-008 (commit `67d1aaaacc`), with an "Architecture Review Response" table in the design spec.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`, `handoff-result.md`; AR-001..AR-006
- Relevant solution revision IDs: SR-008 (on SR-006/SR-007)
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: Pass
- What changed:
  - The behavior basis was reconfirmed at SR-008. Its clarifications stay within the user-approved direction and the preserved boundary.
  - Every prior finding was verified against the current artifacts and code.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-008; REQ-005, AC-017, DEC-012, UC-009/SCN-009; design DS-005 | Four opt-in owners named. The server setup file runs for every test file (`vitest.config.ts:26`), so capture/strip covers e2e. `createSanitizedTestEnvironment` never forwards; `startBuiltTestServer({testVaultSetting})` is explicit. The 6 init sites pass `application`. The AC-017 regression is planned. R-D rewritten; the other web probes have no vault-state assertions (P-003, residual). |
| AR-002 | Open (Medium) | Resolved | REQ-004, AC-004; Terminology; two predicates | The refused set mirrors `getProtectedProductionPaths`. App name `autobyteus` confirmed: the packaged `/Applications/AutoByteus.app` `app.asar` `package.json` has `name: autobyteus` and no `productName`. |
| AR-003 | Open (Medium) | Resolved | requirements-doc, report, investigation notes @ SR-008 | No copy/`--test-vault` model remains except as the rejected option. The baseline is SR-008; the supplement is Final. Leftover: A-13's implication column (AR-008, editorial). |
| AR-004 | Open (Low) | Resolved | Ownership Map failure rule; bounded local spine; AC-016; REQ-016 | `test`: invalid/forbidden/not-found/not-READY → throws → fatal at both sites. `application` unchanged. |
| AR-005 | Recommendation | Accepted | Prisma-free `read-only-test-vault.ts`; resolver split; lazy gated import; module-graph check | Residual: the facade placement is noted as AR-007 |
| AR-006 | Note | Accepted | REQ-014; Guidance | Gemini passes an explicit `GeminiRuntimeResolver` |

- New or remaining finding IDs:
  - AR-007 (non-blocking guidance: keep server vault code out of the default autobyteus-ts graph);
  - AR-008 (non-blocking editorial).
- Material classification changes: None (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty: R-A, R-B, R-C, R-D/P-003, P-002 (Unclear).

### ARCH-REV-003 — Round 3: SR-009 delta (autobyteus-ts reads the test vault itself); Fail on one ownership correction

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/design-review-report.md`
- Review round and trigger: Round 3. SR-009 is a requirement change (the user's words relayed by `/software_engineering_team/code_reviewer`, 2026-10-20) plus the design delta over IR-001 `12a23e7b8a`, at commit `a55dbc4a44`.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`, `handoff-result.md`; the code-review trigger is recorded in SR-009
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: Pass (ARCH-REV-002, SR-008 only)
- Current authoritative decision: Fail
- What changed:
  - The SR-009 behavior basis was confirmed: REQ-005(c), REQ-014, AC-009, AC-013, AC-018, DEC-013.
  - Confirmed sound: the lazy read-only environment default, the server disable, the kept Vitest gate, the clean removal of the installer and setter, and the persisted data being Not Affected.
  - Blocking: the move table puts the server's consumer-authorization catalog and the consumer identity union into autobyteus-ts (AR-009).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-006 | Resolved/Accepted (ARCH-REV-002) | Still resolved | SR-009 leaves DS-005, the failure rule, the refused set and the Prisma-free read path unchanged | Design delta "Tests and harnesses" and "Server" bullets |
| AR-007 | Non-blocking guidance | Obsolete | SR-009 removes the test-support installer; autobyteus-ts setup imports only credential stripping | Dependency Rules (SR-009) |
| AR-008 | Non-blocking editorial | Open (non-blocking) | — | investigation-notes A-13 unchanged |

- New or remaining finding IDs:
  - AR-009 (Design Impact, Medium, blocking);
  - AR-010 (wording), AR-011 (`readSecretEntry` error contract), AR-012 (AC-018 against the dist instance), all non-blocking;
  - AR-008 (editorial, non-blocking).
- Material classification changes: None (Large/High).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: P-004 (two autobyteus-ts instances in server tests) is Reachable with no consequence, because the selector is deleted in server test processes. R-A..R-D and P-002 are unchanged.

### ARCH-REV-004 — Round 4: SR-010 keeps consumer authorization in the server; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/design-review-report.md`
- Review round and trigger: Round 4. SR-010 resubmission (commit `14df2e9005`) answering ARCH-REV-003. Requirements are unchanged from SR-009 except for the DEC-013 wording.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`, `handoff-result.md`; AR-008..AR-012
- Relevant solution revision IDs: SR-009, SR-010
- Prior authoritative decision: Fail (ARCH-REV-003)
- Current authoritative decision: Pass
- What changed: the SR-009 basis was reconfirmed (DEC-013 wording only), and every prior finding was verified against the revised delta and the IR-001 code.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-009 | Open (Medium, blocking) | Resolved | SR-010; delta move table; Ownership Boundaries; Dependency Rules ("server consumer kinds or authorization rules in autobyteus-ts" forbidden) | autobyteus-ts gets only `SecretId`/`secretId`/`customProviderSecretId` + `providerSecretId(providerId, slot)`. The server keeps `SecretConsumerIdentity`, `serializeSecretConsumerIdentity`, `ProviderCredentialCatalog` (authorization, search bindings, `isKnownSecretId`). `readProviderApiKey(providerId, slot)`. `SecretCredentialSlot` collapses into `ProviderApiKeySlot` (identical three members at IR-001). |
| AR-010 | Non-blocking | Resolved | Delta wording | "vault format primitives + read-only reader" |
| AR-011 | Non-blocking | Resolved | Delta move table | NOT_FOUND / CORRUPT_VAULT contract; the service maps to `markCorrupt`; zeroization inside |
| AR-012 | Non-blocking | Resolved | Delta "Verification"; S9-3 | AC-018 is proven by a unit test and a built-server E2E; classification by `kind`/`code` |
| AR-008 | Non-blocking | Resolved | investigation-notes A-13 | Implication corrected |

- New or remaining finding IDs: AR-013 (non-blocking: port the bindings exactly, with no AUTOBYTEUS addition; give a clear unknown-provider error in the environment default).
- Material classification changes: None (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty: R-A..R-D, P-002 (Unclear), P-004 (no consequence).
