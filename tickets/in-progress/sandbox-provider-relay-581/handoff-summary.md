# Handoff Summary

## Summary Meta

- Ticket: `sandbox-provider-relay-581` (Project Task `autobyteus-581`): provider relay through a paired node, and disposable sandbox nodes.
- Date: `2026-11-26`
- Classification: `task_size: Large`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-003 Pass; source review CRR-001 to CRR-005; API/E2E API-REV-002 Pass at 95%; test-code review CRR-006 Pass, no findings).
- Current Status: `Delivery in progress: base integrated and docs synced; verification open on one criterion that only the user can check (AC-005 live, DEC-118). Nothing is pushed or merged yet.`
- Branch: `codex/sandbox-provider-relay`, base `origin/personal` `9f803aa84d` at bootstrap; `b86817915a` at delivery. Integration method: merge (`8c76286fbe`).
- Public skill: `codex/autobyteus-sandboxes` in `AutoByteus/autobyteus-skills` (worktree `/Users/normy/autobyteus_org/autobyteus-skills-worktrees/autobyteus-sandboxes-581`, base `origin/main` `1213803`, unchanged). Its pull request goes with this delivery (DEC-112).
- Delivery rounds: `DR-001` (`delivery-revision-record.md`, written at finalization).

## Delivery Summary

- Delivered scope:
  - **Provider relay.** A node with `AUTOBYTEUS_PROVIDER_RELAY_PEER` (a sandbox, or a node its owner configures) sends the model calls of Claude, Codex, Grok, DeepSeek Harness and the native providers through a paired node, which attaches its own credential. One owner on the relayed side (`ProviderRelayAccess`); on the relay side a handler that accepts only paired peers, attaches exactly the declared credential kind (API key, or login token when its owner turned that on), marks every reply, and writes one activity line per call without any secret. Native providers take an endpoint option in `autobyteus-ts`. Antigravity cannot be relayed (DEC-101).
  - **Login tokens (off by default):** Claude's `setup-token` (vault `provider.anthropic.login-token`) and Grok's own login (read per call, never renewed). Codex's ChatGPT login cannot be relayed (DEC-116, FU-581-07).
  - **Sandboxes.** `create_sandbox`, `run_in_sandbox` and `destroy_sandbox` on every runtime; a container from the node's own release image, paired as a normal peer marked `role: "sandbox"`, full network (DEC-110), read-only shared folders (DEC-113), at most 4, expiry, a start sweep that removes leftovers; only the creating run uses or removes one (DEC-117); macOS with Docker Desktop (DEC-105, FU-581-02).
  - **The Nodes page** labels a sandbox peer.
  - **The public skill** `autobyteus-sandboxes` (DEC-112).
- Docs synced by delivery (`docs-sync-report.md`): `credential_proxy.md` (C5 duration), `sandboxes.md` (`SANDBOX_TOOL_FAILED`, empty fields), `remote_collaboration.md` (the role mark), `autobyteus-web/docs/settings.md` (the chip), `node_access_model.md` (renumbered NAS-44 to NAS-46 after the base took NAS-42/43), the ticket's `design-spec.md` (C1, C3, C7, C8, C10 as implemented), the public skill (`SANDBOX_TOOL_FAILED`, the create example), one stale test comment. No change to `DESIGN.md`, `TESTING.md` or `RELEASE.md`.
- Durable coverage added by the ticket: unit, two-node integration (incl. a 32 MiB body limit with a mutation check) and architecture tests; the gated live suite `tests/e2e/sandboxes/sandbox-live.e2e.test.ts` (SBX-01 to SBX-08; needs Docker Desktop and a locally built image).
- `.gitleaks.toml`: two narrow false-positive entries (the Nodes page probe's node-ID row keys; the type name `SecretConsumerIdentity` in the Claude strategy). The Secret Gate on `origin/personal..HEAD` then passes.

## Delivery's round

- **DR-001** fetched the base (35 commits, three conflicts, resolved keeping both sides), checkpointed the review documents first, reran the post-integration checks, read the evidence behind each critical criterion, synced the docs, wrote the release notes. It did not push or merge anything.

## Verification Summary

- Judged from the evidence by delivery. Every critical acceptance criterion is directly proven except one part: **AC-005's live part (Claude and Grok login tokens) is Not Tested and needs the user (DEC-118)**; it is not accepted as unverified risk. What delivery checked: `pnpm test-vault status` shows `provider.anthropic.login-token` missing, and the user's Grok login has expired (DEC-102 forbids renewing it).
- Final confidence 95% (every category 95%); the default target is met apart from that part.
- Key evidence opened by delivery:
  - AC-001, AC-006, AC-007, AC-008, AC-009, AC-015: `evidence/API-L-sandbox-live/run5-round2/SBX-01.json`: `readyMs 8067`; `network "internet 200 host 200"`; the host lists `sbx_…` as `role: sandbox`; four runtimes complete (`autobyteus` claude-haiku-5-5, `claude_agent_sdk`, `codex_app_server` gpt-5.6-luna, `grok_build`), `relayedLines {"anthropic/apiKey/200": 3, "openai/apiKey/200": 1, "xai/apiKey/200": 5}`; `run5-vitest.log` `Tests 8 passed (8)`.
  - AC-001, AC-002, AC-007 (a relayed node outside Docker): `API-L09/API-L09-owner-relayed-node.json`: all five runtimes `completed: true`, `allFromB: true`, `bNativeProvidersConfiguredBeforeRelay: []`, `bValueScan hits {}`, `c5SecretHits []`.
  - AC-010, AC-011: `SBX-03.json`: the delegated answer `done` with the file and its content, six transcripts on the host, leak scan: `sandboxFiles hits []` over 662,446,080 bytes, `processes hits []` over 46 processes, `containerEnv []`, `runMemory hits {}`, `c5Log []`. `SBX-04.json`: `SANDBOX_NOT_YOURS` twice; after destroy no container, volume, peer or record, and the folders and transcripts kept (AC-012). `API-L10`: a real model with only the three tools and the skill created the sandbox, delegated with `node`, read the file and transcript, did not open the planted symlink, destroyed the sandbox: `canaryInFrames false`, `canaryInHostFiles []`, `containersLeft 0` (AC-016).
  - AC-003: `SBX-05.json`: `RELAY_PEER_NOT_ACCEPTED` after unpairing, `c5LinesAfterUnpair: 0`; AC-013: `SBX-06.json` removed at expiry in 528 ms, folders kept; `SBX-07.json` after a host crash with a lost record no container or peer is left; AC-014: `SBX-08.json` five at once give four sandboxes and `SANDBOX_LIMIT_REACHED`, `SANDBOX_REMOTE_COLLABORATION_OFF`, `SANDBOX_SHARED_FOLDER_INVALID`, nothing left.
  - AC-015 rendered: `API-L11-round2`: one "sandbox" chip on the `sbx_…` row, none on the plain peer, none after destroy.
  - AC-004: automated (the two-node integration suite, API-R04).
  - Whole-change: server unit suite 9124 passed, integration 534 passed, E2E 575 passed (API-R03 to R05, round 1, still valid), fresh-start desktop build ok (API-R09).
- Integrated-state checks by delivery on `8c76286fbe` (details in `release-deployment-report.md`): server typecheck PASS (production errors 0; test files 972 in 299 = baseline); web typecheck PASS (85 in 35 = baseline); 25 server test files, 190 tests passed (extensions routes, sandboxes, credential proxy, architecture incl. the GraphQL codegen currency test, the two relay integration suites, the node access E2E); web node specs 6 files, 69 tests; Electron application specs 4 files, 48 tests; `check_repository_artifact_hygiene.py` passes.

## Residual Risks For The User

- **AC-005 live (Claude and Grok login tokens): the user's check is open.** To prove it: run `claude setup-token`, add the token to the test vault as `provider.anthropic.login-token` (`pnpm test-vault setup`), use Grok once so its login is fresh, and let API/E2E run `probes/sandbox-live-smoke.mjs --login-tokens --runtimes=claude_agent_sdk,grok_build` (about 10 minutes, no value printed). Or the user accepts the risk in a new decision that supersedes DEC-118; then the automated request shapes, the two-node integration test and IMP-09 are the only evidence for the login-token shapes.
- **Release image.** A published image for unreleased code cannot exist; the live suite used the beta image with this commit's server package (TESTING.md's method). The sandbox image is the node's own release tag, which the Server Docker Release publishes.
- **Platforms.** Sandboxes are verified on macOS with Docker Desktop only; Linux and Windows hosts refuse (FU-581-02).
- **A sandbox is a normal peer with full network access** (user decisions DEC-110, DEC-111): an agent under evaluation can reach host agents shared with peers and the host's network. The restricted forms are FU-581-05 and FU-581-06.
- **Signing and notarization** of the desktop app run only on the release runners; no build input changed after the fresh-start build (API-R09).

## Follow-ups

`follow-ups.md` (all for the Solution Designer to send; none sent yet, none urgent):

- **FU-581-01** Antigravity through a relay (TLS interception).
- **FU-581-02** Sandboxes on Linux and Windows hosts.
- **FU-581-03** Media providers through the relay.
- **FU-581-04** Integrations (GitHub) through the relay.
- **FU-581-05** Restricted-network sandboxes.
- **FU-581-06** Restricted sandbox peers.
- **FU-581-07** Codex's ChatGPT login through a relay (HTTPS for the local relay).

## Release

- No release: none was asked for, and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no "What you need to do" section). Before any tag, the checks in `RELEASE.md` apply (the smoke check, the Secret Gate over the release range, and desktop signing readiness).
