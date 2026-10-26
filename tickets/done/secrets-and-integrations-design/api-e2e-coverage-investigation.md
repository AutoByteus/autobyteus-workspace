# API/E2E Coverage Investigation — MCP server secrets in the vault (autobyteus-244)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-008; MCP scope MREQ-001…008, MDEC-001…007)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-008)
- Design Spec: `design-spec.md` (SR-008; Large / High)
- Supplements: `options-report.md`, `solution-validation.md`, `probes/`, `follow-ups.md`
- Design Review Report / Architecture Review Revision Record: `design-review-report.md` (ARCH-REV-003 pass, AR-015, AR-016 adopted) / `architecture-review-revision-record.md`
- Implementation Handoff / Revision Record: `implementation-handoff.md` (IR-002) / `implementation-revision-record.md`
- Code Review Report / Revision Record: `code-review-report.md` (CRR-002 pass) / `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Trigger: code review CRR-002 pass (reviewed route)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`, branch `codex/secrets-and-integrations-design`. Reviewed code `4aa2543f9d` (round-2 code in `4505158d77`, `fc6032999e`, `98eeac9f31`). HEAD `f3c52bd0f6` adds review documents only.

## Current Requirement And Design Basis

- MREQ-001/004: secret values (chosen env values, the HTTP `token`, chosen headers such as `Authorization`) are `mcp.<uuid>` vault entries. `mcps.json` holds `{vaultSecretId}`; plain settings stay plain.
- MREQ-002: no API, UI, export or log shows a secret value. The UI shows states: Configured, Missing, Vault unavailable, Plain.
- MREQ-003: references are resolved only at connect: into request headers for HTTP, into the child environment for stdio (MDEC-003, R-3 accepted).
- MREQ-005 / MDEC-002 / CR-001: a move only with approval, and only the move writes the 0600 backup. Every moved server still connects.
- MREQ-006 / MDEC-004 / MDEC-007: import stores rule matches in the vault. A reference is kept if the same server holds one at that field; otherwise it becomes `needsSecret`.
- MREQ-007: a missing secret or an unavailable vault gives "Needs secret". The server does not connect with an empty value and never falls back to plain.
- MREQ-008: the gated GitHub live check from the test vault.
- MDEC-006 / AR-015: the banner shows only unreviewed candidates, stored per node `entryId`, so a URL or port change doesn't reset it.
- Persisted data: `Directly Usable — No Migration`. A plain `mcps.json` keeps working, and the move is user-triggered. New localStorage key.

## Supported Scenarios And Real Usage

- Requirement scenarios: UC-002 (an MCP server uses its credential without the agent reading it), UC-006 (move existing plain secrets), import (MREQ-006/MDEC-007), and the entry forms (form save, JSON tab, preview, import, startup load, delete).
- Added from investigating the implemented behavior (each with its real trigger):
  - SCN-A1: the user's desktop app, end to end. A stdio server with a token row is added in the form, the token is locked by the rule, the tool is called, and the app restarts. Packaged build, the app's own window.
  - SCN-A2: the banner's review state across an app restart **and** a different embedded-server port (AR-015). Same data root, new `--server-port`.
  - SCN-A3: moving a file to another install. Install A's `mcps.json`, with references, is imported into install B through B's Bulk Import view. Its values need secrets there; Replace fixes them.
  - SCN-A4: re-importing an older copy of your own file after a Replace keeps the working secret (AR-016).
  - SCN-A5: a vault that cannot open: the established database with its root key missing (moved aside while the app is stopped, restored after). The list loads, rows show "vault unavailable", and connect fails naming the field.
  - SCN-A6: HTTP token keep, replace and remove in the form; Form ↔ JSON with keep markers; an invalid keep marker.
  - SCN-A7: the move on Linux (Docker image built from this worktree): the backup file's mode and owner.
  - SCN-A8: agents on live runtimes (native via LM Studio, Claude, Codex, Grok) use vault-held MCP credentials through the in-process suites' application vault.
- Contrived: none recorded by the designer.

## Changed Surface And Boundary Classification

| Surface | Affected | Repository Evidence | Not Exercised By It | Mode |
| --- | --- | --- | --- | --- |
| Domain/backend (vault, catalog, MCP service, provider) | Yes | IMP-04/05/17/18 | — | — |
| API / GraphQL contract (clean cut) | Yes | IMP-07/19 (built server) | the packaged app's server | isolated instance |
| Persisted data (`mcps.json`, vault entries, backup) | Yes | IMP-07/18/19 | real desktop restart; Linux file modes | isolated instance; Docker |
| Frontend (rows, form, banner, card, import) | Yes | IMP-11/20/21 specs; IMP-14/16 rendered on `nuxt dev` | the packaged renderer with the packaged server; zh-CN | isolated instance |
| Browser storage (review state) | Yes | IMP-16 (reload) | app restart plus port change | isolated instance |
| Process / lifecycle (stdio env delivery, restart) | Yes | IMP-02, IMP-07 | the packaged app | isolated instance |
| Authentication / secrets (resolution at connect) | Yes | IMP-02/08/09 | live runtimes beyond AGY scripted | gated suites |
| External integration (GitHub remote MCP) | Yes | IMP-09 (strict live) | — | reuse |
| Desktop shell | Indirect (renderer + embedded server) | none | packaged behavior | isolated instance |

## Project Execution Discovery

- `TESTING.md` (root):
  - layers (server E2E, gated runtime suites, isolated desktop instance, Docker server nodes);
  - "Rerun by impact" rule 4: a changed shared foundation (`autobyteus-ts`, contracts, schema) means a full rerun;
  - clean env;
  - test vault (`pnpm test-vault`, IDs only);
  - isolated instance rules 1–5;
  - Docker: a test-owned container from a worktree-built image (the dependency and code change is packaged, so the image is built from the worktree, as in autobyteus-181 API-07);
  - one local-model run at a time;
  - Codex with a throwaway `CODEX_HOME`.
- `docs/isolated-app-instances.md`:
  - `--data-root <owned dir>` (never deleted) and `--server-port`, to restart on the same data with a new port;
  - control port for CDP attach (attach only).
- `autobyteus-server-ts/docs/modules/secret_management.md`:
  - the vault health values;
  - the root key at `<db>.secret.key`;
  - established components missing → fail closed.

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/e2e/tool-management/mcp-secrets-in-vault.e2e.test.ts`, `mcp-bulk-import.e2e.test.ts` and the other MCP e2e on the new shapes | Still Valid (IMP-19) | Reuse; rerun inside the full e2e |
| `tests/e2e/mcp/mcp-github-remote-live.e2e.test.ts` | Still Valid (IMP-09 strict) | Reuse (connect path unchanged in round 2) |
| `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts`, `mcp-http-auth-agent-tool-call.e2e.test.ts` (now open the application vault) | Still Valid; live cells unrun | Run the live gates |
| server unit/integration, core, web specs | Still Valid (IMP-01/02/17/18/20/21) | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | MREQ-001…008 (repository) | core, server unit/integration, built-server e2e, web suite and specs, codegen, live GitHub | Reused | IMP-01…IMP-22 | code unchanged since the round-2 commits |
| API-01 | regression (rule 4) | full server e2e | Existing Test | builds; `pnpm test:e2e` | vault, catalog and core changed |
| API-02 | MREQ-003, UC-002 (SCN-A8) | gated runtime suites | Existing Test | `mcp-runtime-tool-matrix` + `mcp-http-auth-agent-tool-call` with LM Studio, Claude, Codex (live if available; MCP client), Grok (if available), AGY scripted | live runtimes with vault-held MCP credentials |
| API-03 | MREQ-001/002/003, SCN-A1, SCN-A6 | isolated desktop A: form-added stdio server with a locked token; tool via gateway; `mcps.json`; restart; HTTP token keep/replace/remove; JSON keep markers | Journey | CDP driver + GraphQL + file reads | the user's real setting |
| API-04 | MREQ-005, MDEC-006, AR-015, SCN-A2 | isolated desktop B (owned data root): plain candidates; "Keep as they are"; dialog untick + move; backup 0600; restart on a new server port; banner stays away | Journey | same | — |
| API-05 | MREQ-006, MDEC-007, AR-016, SCN-A3/A4 | A's file into B's Bulk Import; `needsSecret`; Replace; re-import an older copy | Journey | same | — |
| API-06 | MREQ-007, SCN-A5 | B with its root key moved aside: list, row states, connect error; key restored | Journey | same | — |
| API-07 | MREQ-002 (UI), localization | zh-CN strings of the new UI in the packaged app | Journey | same | — |
| API-08 | MREQ-005 (backup), SCN-A7 | Docker image from the worktree; test-owned container; plain server → move → `stat` of the backup | Journey | buildx; docker run; GraphQL | Linux file mode |
| API-09 | MREQ-002, safety | dummy-value scan of app logs, container logs, evidence; user data untouched; cleanup | Temporary Probe | grep, `git status` | — |

- Test progress log: `Yes`.
- Durable coverage by API/E2E: none planned. The desktop journeys are one-off driver scripts (sources kept in the evidence), because the repository has no durable desktop-journey harness for Settings. Their server-side halves already have durable e2e (IMP-19).

## Not Tested / Deferred (planned)

| Behavior | Reason |
| --- | --- |
| Root-key hardening (FU-003) and agent-shell inheritance (FU-004) | outside this ticket |
| Windows | not available here |

## Ambiguities Or Reroute Triggers

None at planning.

## Investigation Decision

Proceed: `Yes`. Durable coverage changes by API/E2E: `No` (planned). Reroute: `No`.
