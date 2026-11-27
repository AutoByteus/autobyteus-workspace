# Docs Sync Report: autobyteus-581

## Scope

- Ticket: `sandbox-provider-relay-581` (provider relay through a paired node, and disposable sandbox nodes). `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review ARCH-REV-003 Pass; source review CRR-001 to CRR-005; API/E2E API-REV-002 Pass; test-code review CRR-006 Pass).
- Trigger: `/code_reviewer` CRR-006 Pass, delivery package for code `7296a698d6`, API/E2E documents and evidence `7a76435f8c`.
- Bootstrap base reference: `origin/personal` @ `9f803aa84d`.
- Integrated base reference used for docs sync: `origin/personal` @ `b86817915a` (35 commits: autobyteus-516 extensions, autobyteus-652 Memory layout), merged as `8c76286fbe`; refreshed once more to `41f6894d9d` (6 commits, autobyteus-657: the extensions catalog public key; no overlap with this ticket's files), merged as `6c3f35d8ba`.
- Post-integration verification reference: `8c76286fbe` and `6c3f35d8ba` (the docs-sync edits of this round change no source: one comment in a test file). Commands and results are in the release/deployment report, "Initial Delivery Integration Refresh".

## Why Docs Were Updated

- Summary: the implementation wrote its own module docs (credential proxy, secret management, node access model, the two runtime docs, the new `sandboxes.md`, GLOSSARY, TESTING). Delivery checked every one against the final code, brought the ones the review and validation rounds left behind into line (DEC-116, DEC-117, deviations 1, 5, 10 and 11, the added refusals), added the two places that still described the old peer and Nodes page, and renumbered the node access scenarios after the base took two of them.
- Why this should live in long-lived project docs: a future change to the relay, the sandbox tools, a peer's record or the Nodes page starts from these module docs. They must say what shipped, not the design's first form.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; the ticket's design cites rules 7, 9, 10, 12 and Principle 16 | No change | No rule changed. The sandbox tools' process binding is Principle 16's allowed exception with its conditions met (implementation deviation 9); the rule text needs nothing. |
| `TESTING.md` | The ticket added a sandbox-node rule and the gated live suite | No change (the ticket's addition stands) | The "Sandbox nodes" rule matches the gated suite `tests/e2e/sandboxes/sandbox-live.e2e.test.ts` (image, test vault, no leftover containers). Rerun-by-impact step 5 was applied to the base refresh (both typechecks). |
| `RELEASE.md` | Release steps; the ticket adds a container image use and a public skill | No change | A release needs nothing new: the sandbox image is the node's own release image (`autobyteus/autobyteus-server:<release>`), which the Server Docker Release already publishes. The public skill is a separate repository with its own pull request (below). |
| `GLOSSARY.md` | New terms: relayed node, relay node, relay credential kind, login token, node pass, provider relay activity, sandbox, host node, sandbox peer | No change | Reads as implemented. |
| `autobyteus-server-ts/docs/modules/credential_proxy.md` | Relay design | Updated | C5: `durationMs` of a forwarded call is the time to the provider's response headers (code reviewer's note). The Codex rows already say Codex has no login-token mode. |
| `autobyteus-server-ts/docs/modules/sandboxes.md` | New module doc | Updated | The refusal list names `SANDBOX_TOOL_FAILED` (D-1) and says a tool result leaves out empty fields (D-2). The run-memory mount at `<data>/memory` and `SANDBOX_ARGUMENT_INVALID` were already there. |
| `autobyteus-server-ts/docs/modules/secret_management.md` | New consumer and the Claude login-token ID | No change | Reads as implemented. |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md`, `grok_build_runtime.md` | Relay launch shapes | No change | Reads as implemented. |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | No change | Lists `sandboxes.md`. |
| `autobyteus-server-ts/docs/design/node_access_model.md` | Scenario table | Updated (merge) | The base took NAS-42 and NAS-43 (extensions). The relay scenarios are now NAS-44 (relayed call), NAS-45 (unpaired, removed or wrongly signed peer) and NAS-46 (sandbox peer); three test titles follow. |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Peer record | Updated | New bullet: `PeerNode.role: "sandbox"`, written from the invite, only labels and enables cleanup; it changes no route or permission. |
| `autobyteus-web/docs/settings.md` | Nodes page rows | Updated | The "sandbox" chip beside a sandbox peer's name. |
| `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md` | Nodes page and pairing | No change | They describe the credential and pairing model, which the ticket did not change. |
| `tickets/done/sandbox-provider-relay-581/design-spec.md` | Ticket-local; the reviewers named four places that no longer match the code | Updated | C1 (no Codex login token, DEC-116), C3 (`localPassHeader` and `dropFromCaller` gone, no `codexLogin`, the forwarder's credential parameter), C7 (`SANDBOX_ARGUMENT_INVALID`, `SANDBOX_TOOL_FAILED`), C8 (run-memory mount at `<data>/memory`, no memory variable, the temp-workspace variable), C10 heading. The design decisions are unchanged. |
| Public skill `autobyteus-sandboxes/SKILL.md` (repository `AutoByteus/autobyteus-skills`, branch `codex/autobyteus-sandboxes`) | The skill is documentation of the tools; the reviewers named D-1 and D-2 | Updated, committed on its branch | `SANDBOX_TOOL_FAILED` row added; the create example no longer shows `"teams": []`, and a sentence says empty fields are left out. Re-checked against `sandbox-tool-contract.ts` and the manifest: names, fields and refusal codes match. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `credential_proxy.md` | Correction | `durationMs` semantics in C5 | The line is written when response headers arrive (`provider-relay-peer-handler.ts`, `record` after `forward`) |
| `sandboxes.md` | Addition | `SANDBOX_TOOL_FAILED`; empty fields left out of a result | D-1, D-2 |
| `node_access_model.md` | Renumbering | NAS-44 to NAS-46 for the relay scenarios | Merge with the base's NAS-42 and NAS-43 |
| `remote_collaboration.md` | Addition | The `sandbox` role mark on a peer | The ticket added a persisted field the module doc did not name |
| `autobyteus-web/docs/settings.md` | Addition | The sandbox chip on the Nodes page | The ticket added it (AC-015) |
| `design-spec.md` (ticket) | Correction | C1, C3, C7, C8, C10 as implemented | Reviewers' doc lines; DEC-116, deviations 1, 5, 11 |
| `SKILL.md` (public skill) | Correction | D-1, D-2 | Reviewers' doc lines |
| `tests/e2e/sandboxes/sandbox-live.e2e.test.ts` | Comment only | The comment on `hostNodeId` names its source, `/rest/remote-access/status` | The code reviewer's optional note; no behavior change |
| `.gitleaks.toml` (project config, not a doc) | Two narrow allowlist entries | The Nodes page probe's node-ID row keys (generic rule, that file only); the type name `SecretConsumerIdentity` in `claude-agent-runtime-strategy.ts` (env-style rule, that file only) | The Secret Gate flagged three false positives by shape (`srv_` + 32 characters, a public node ID; a TypeScript type name); `RELEASE.md` says to add the narrowest entry with its reason. No secret was found. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Provider relay | One owner, `ProviderRelayAccess`; per-kind routes; the relay node attaches exactly the declared kind; marked replies; one activity line per call | design-spec C1 to C5, implementation-handoff | `credential_proxy.md`, `GLOSSARY.md` |
| Login tokens | Claude `setup-token` in the vault; Grok's login read per call, never renewed; Codex has none through a relay | requirements DEC-102, DEC-116 | `credential_proxy.md`, `secret_management.md`, `GLOSSARY.md` |
| Sandbox lifecycle | Create, run, destroy, expiry and the start sweep; records at `<app-data>/sandboxes/sandboxes.json`; only the creating run uses or removes one | design-spec C6 to C8, DEC-117 | `sandboxes.md` |
| Sandbox as a normal peer | Not restricted; the `sandbox` role only labels and cleans up | DEC-111, FU-581-06 | `sandboxes.md`, `remote_collaboration.md` |
| Testing sandboxes | A test-owned host, the image method, the test vault, no leftover containers | API/E2E execution report | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `RunPassHolder.providerRelayId`, `grantProviderRelay(run, id)`, `AcpAgentLaunchProfile.providerRelayId`, `createDeepSeekProviderRelay`, the single-route `ProviderRelay` | Pass holders `run \| node` with per-relay kinds; `ProviderRelay.routes`; profiles with `relay: {relayId, runtimeKind, use}` | `credential_proxy.md`, `secret_management.md` |
| The `agentRuntime/deepseek_harness` secret consumer | `providerRelay/deepseek/apiKey` | `secret_management.md` |
| Codex login-token mode through a relay (DEC-115 try, DEC-116 decision) | Codex always on the relay node's API key | `credential_proxy.md`, `GLOSSARY.md`, design-spec C1/C3 |
| `AUTOBYTEUS_MEMORY_DIR` and `/home/autobyteus/run-memory` in a sandbox | The run-memory folder bound at the node's own `<data>/memory` | `sandboxes.md`, design-spec C8 |
| An owner caller of `run_in_sandbox` and `destroy_sandbox` | The creating run only (DEC-117) | `sandboxes.md` |

## Docs Impact Decision

- Docs impact: `Updated` (the long-lived docs above), with explicit no-change decisions for `DESIGN.md`, `TESTING.md`, `RELEASE.md` and the others listed.
- Follow-ups recorded in `follow-ups.md` by the earlier roles (FU-581-01 to FU-581-07) are unchanged. Delivery found no new follow-up. One note, not a follow-up: the long-lived docs and the source comments cite DEC-115 (the live check and its fallback) where DEC-116 is the decision that records "Codex login token not supported". Both are in the requirements doc and say the same thing; nothing was changed in reviewed source.

## Delivery Continuation

- Result: `Pass` for docs sync.
- Next delivery action: none; AC-005's live part was accepted unverified by the user (DEC-119), so finalization proceeds.
- Notes: no documentation was left stale by a known gap.
