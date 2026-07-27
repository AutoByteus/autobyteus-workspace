# Secure Centralized Secret Provisioning — Round 21 Verification Candidate Notes

> **Local verification candidate; not a released build.** Repository
> finalization, push, merge, tag, publication, deployment, and worktree cleanup
> remain on hold until the user explicitly verifies this exact candidate.

## Candidate Identity

- Ticket worktree:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Branch: `codex/secure-centralized-secret-provisioning`
- Final reviewed implementation/test authority:
  `ec0df6b1a9d216366e08262cd96f5280686b04d0`
- Reviewed-package safety checkpoint:
  `c265d1a96da2a92846ec8a2629cc2abdb1a8bc8a`
- Exact source HEAD used for this fresh package:
  `4bf6e7d18229336cd690497370f1a66dedaafc4a`
- Tracked base checked:
  `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`
- Integration status: ahead 54, behind 0; merge-base equals the tracked base.
- API/E2E: Round 21 `Pass`, 98.9% confidence; no missing or failing
  critical acceptance criterion.
- Proportional durable-test review: Round 11 `Pass`; no unresolved finding.

## Narrow Approved Scope

The candidate centralizes supported application-owned credentials in an
application-local encrypted vault while preserving the explicit assurance and
consumer boundaries:

- one application database plus its adjacent key;
- file-root and value-safe local custody;
- explicit subject/provider consumer mapping;
- point-of-use resolution without putting secret values into metadata,
  GraphQL responses, logs, or ticket evidence;
- ordinary provider and Gemini Settings use save/overwrite behavior;
- existing custom-provider Delete remains provider lifecycle and removes its
  linked credential;
- explicit importer target authority and source immutability;
- no automatic `.env` credential import or update;
- `DASHSCOPE_API_KEY` is the sole Qwen mapping;
- exact unpatched `repository_prisma@1.0.8` with Prisma `5.22.0`;
- unchanged Docker service topology.

Claude remains exactly `auto|cli|api-key`, default `cli`. Only explicit
`api-key` resolves `agentRuntime/claude_agent_sdk/apiKey` and replaces
`ANTHROPIC_API_KEY` for that launch. Inherited Electron, terminal, Claude, and
Codex environments preserve continuity; they are not process-isolation proof.
`LOCAL_HARDENED` covers local vault/file-root/value-safe custody, Codex remains
excluded, and `STRONG_AGENT_ISOLATION` remains deferred.

## Scope Reset From The Earlier Candidate

The user correctly identified changes outside the credential-custody ticket.
The reviewed Round 21 state addresses that concern:

- all 18 paths listed in `scope-audit.md` were restored exactly to
  `origin/personal`;
- unrelated Electron launcher, isolated-PTY environment, Claude MCP/session,
  and built-in runtime-default changes were removed;
- redundant standalone ordinary-provider/Gemini credential-removal source and
  UI were removed;
- provider/Gemini public mutation surfaces and restart behavior were reconciled
  to the restored contract;
- the bounded custom-provider Delete correction no longer reports failure after
  successful deletion merely because unrelated AutoByteus remote discovery is
  unavailable.

The earlier packaged-terminal failure remains historical evidence for the
superseded candidate. The fresh candidate retains the base runtime environment
behavior and passes both the native terminal verifier and an actual packaged
Electron Node-mode `IsolatedPtySession` marker probe.

## Fresh macOS arm64 Artifacts

- App:
  `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG:
  `autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.dmg`
- ZIP:
  `autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.zip`
- DMG SHA-256:
  `70ef790c788fc25e2f4d738224f913c27b0e217a80cb73fe2085f669474d3dd2`
- ZIP SHA-256:
  `411347e28fe919dcb35feb0ea90d9d8565d8775a99c6e0158483b9b6fff8db37`

Build `1.4.26` was produced from the secure-ticket worktree with the README
no-sign command. DMG verification, ZIP integrity, packaged-server isolated
startup, native `node-pty` spawn, and packaged Electron isolated PTY execution
all passed. The app is ad-hoc/unsigned and is suitable only as a local
verification candidate, not as a distributable release.

## Truthful Limitations

- Gemini AI Studio and Serper were not configured in the canonical provider
  run and remain truthful skips.
- AutoByteus remote discovery remained unavailable under its exact codes; no
  unavailable capability is claimed as passed.
- Inherited child environments are continuity behavior, not strong isolation.
- The official Anthropic authentication review is a delivery/release risk
  recheck, not legal clearance.
- Delivery did not attach to, inspect, stop, or replace the user's installed
  AutoByteus application or its retained project test database/key/config.
- A real user GUI verification of this exact fresh candidate is still required.
