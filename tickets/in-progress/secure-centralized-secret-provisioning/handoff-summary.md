# Secure Centralized Secret Provisioning — Round 21 User Verification Handoff

## Status

`Ready for explicit user verification; not finalized and not released.`

- Ticket worktree:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Ticket branch: `codex/secure-centralized-secret-provisioning`
- Final reviewed implementation/test authority:
  `ec0df6b1a9d216366e08262cd96f5280686b04d0`
- Reviewed-package safety checkpoint:
  `c265d1a96da2a92846ec8a2629cc2abdb1a8bc8a`
- Exact source HEAD used to build the fresh candidate:
  `4bf6e7d18229336cd690497370f1a66dedaafc4a`
- Tracked base:
  `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`
- Current relation to base: 0 behind / 54 ahead; exact merge-base is the tracked
  base, so no base commit needed integration.
- API/E2E: Round 21 `Pass`, 98.9% confidence.
- Proportional durable-test review: Round 11 `Pass`, no unresolved finding.

Only local checkpoint commits and the required latest-base refresh were made.
No ticket archive, push, merge, tag, publication, deployment, release, or
worktree cleanup has occurred.

## Direct Response To The Scope Concern

The earlier candidate contained unrelated product changes. The user was right
to stop and question it. The solution package now includes the exhaustive
`scope-audit.md`; architecture approved the narrow correction; implementation
restored all 18 enumerated paths exactly to `origin/personal` and removed the
redundant ordinary-provider/Gemini credential-removal behavior.

The fresh candidate therefore does **not** carry the ticket-created Electron
launcher, isolated-PTY environment, Claude MCP/session, built-in runtime-default,
or ordinary/Gemini standalone removal changes. It keeps the centralized secret
vault and its required provider/importer/migration work. The earlier packaged
Terminal failure belongs to the superseded candidate and is retained only as
historical evidence.

## What Round 21 Proves

The authoritative API/E2E package passed at 98.9% and includes:

- focused and cumulative secret/provider/restart/terminal coverage;
- real configured provider execution where capabilities were available;
- explicit Claude `api-key` resolution plus authenticated Claude CLI and Codex
  continuity checks;
- unchanged clean-source Docker build and same-volume restart/reopen;
- current packaged existing-user custom-provider-v1 migration/reopen/Delete;
- actual browser custom-provider Save/Delete;
- exact repository Prisma integration policy;
- final cleanup and value-safety scans.

The Round 21 correction makes custom-provider Delete finish against its targeted
provider/catalog boundary instead of throwing after the destructive commit due
to unrelated unavailable AutoByteus remote discovery.

## Fresh macOS arm64 Candidate

These artifacts were rebuilt from exact secure-ticket HEAD
`4bf6e7d18229336cd690497370f1a66dedaafc4a` after the Round 21 reviews and docs
sync:

- Application:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.dmg`
- ZIP:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.zip`
- DMG SHA-256:
  `70ef790c788fc25e2f4d738224f913c27b0e217a80cb73fe2085f669474d3dd2`
- ZIP SHA-256:
  `411347e28fe919dcb35feb0ea90d9d8565d8775a99c6e0158483b9b6fff8db37`

The candidate is version `1.4.26`, arm64, and ad-hoc/unsigned. It is a local
verification build rather than a signed/notarized release.

## Delivery Validation Performed

The fresh artifact passed:

1. app/executable/plist/arm64 presence checks;
2. DMG checksum verification;
3. ZIP integrity verification;
4. isolated packaged-server startup with a temporary DB and adjacent key;
5. packaged `node-pty` helper selection and real spawn probe;
6. actual packaged Electron runtime in Node mode through
   `IsolatedPtySession`, with marker `SCSP_PACKAGED_PTY_OK`;
7. read-only confirmation that the user's installed application remained on
   port `29695` and was not stopped or modified.

Delivery deliberately did not launch the candidate GUI because the installed
application was still using the fixed desktop port. This avoids attaching to or
interfering with the user's application and state.

## How To Verify This Exact Candidate

1. Quit the currently installed/running AutoByteus application normally.
2. Confirm nothing is listening on port `29695`:
   `lsof -nP -iTCP:29695 -sTCP:LISTEN` should return no listener.
3. Open the fresh DMG path above, or launch the fresh `.app` directly. Because
   it is unsigned, macOS may require **Control-click → Open**.
4. Prefer a disposable macOS account/profile. If reusing application data,
   back up the application database **together with its adjacent `.secret.key`**
   as one unit before testing; do not copy or restore only one of them.
5. Verify Settings still matches the narrow contract:
   - ordinary provider credentials can be saved and overwritten, with no new
     standalone Remove action;
   - Gemini modes can Save, Save and use, and Use this mode, with no new
     standalone credential-removal action;
   - custom-provider Delete still removes that provider.
6. Open Terminal, start a session, run `pwd`, and run a unique `printf` marker.
   This is the most important regression check from the earlier failure.
7. If desired, recheck your normal agent/team workflows, Codex account
   continuity, and Claude selection. Claude must remain
   `auto|cli|api-key` with default `cli`; only explicit `api-key` is vault-backed.
8. Quit the candidate and report either:
   - **Verified** — this exact candidate behaves correctly; or
   - **Failed** — include the action, visible error, and approximate timestamp.

Do not run the installed app and this candidate simultaneously: both use the
same fixed desktop port and can make the observed binary/state ambiguous.

## Preserved Security And Compatibility Boundaries

- `LOCAL_HARDENED` means local vault/file-root/value-safe custody only.
- Codex is excluded from vault governance.
- Inherited Electron/terminal/Claude/Codex environments are continuity, not
  process isolation; `STRONG_AGENT_ISOLATION` remains deferred.
- Claude stays `auto|cli|api-key`, default `cli`; no silent fallback or login
  broker was added.
- One application DB plus adjacent key; no automatic `.env` migration/update.
- Explicit importer target authority and source/template immutability.
- `DASHSCOPE_API_KEY` only for Qwen.
- Exact unpatched `repository_prisma@1.0.8` with Prisma `5.22.0`.
- Docker topology unchanged.

## Truthful Limitations

- Gemini AI Studio and Serper were not configured; those capabilities were
  skipped rather than claimed.
- AutoByteus remote discovery was unavailable under its exact codes; the
  unrelated outage is not claimed as passed.
- The app is unsigned/ad-hoc and not a release artifact.
- Anthropic source review is a risk recheck, not legal clearance.
- Delivery did not inspect or modify secret values, the retained persistent
  project test DB/key/config, or the user's installed AutoByteus process.

## Next Decision

Wait for the user's explicit result on this exact candidate. A **Verified**
message permits delivery to begin the separate finalization sequence, including
a fresh target-base check. Until then, do not archive the ticket, push, merge,
tag, release, deploy, or remove the ticket worktree.
