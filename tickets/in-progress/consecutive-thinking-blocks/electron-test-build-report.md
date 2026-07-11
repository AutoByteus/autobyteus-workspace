# Electron Test Build Report

## Authoritative Round

- Ticket: `consecutive-thinking-blocks`
- Current package validation: `Round 4 — Architecture Round 6 corrected head`
- Date: `2026-07-11`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks`
- Branch/HEAD: `codex/consecutive-thinking-blocks` / `abd50be3fa1ded276242dfc59673209b914f8bad`
- Historical packages/reports: prior-candidate evidence only; not counted as current pass.
- Purpose: build the corrected server into a fresh macOS ARM64 package, verify deployment contents, and execute AC10/12/13 plus CR-CTB-003/004 through packaged production modules and HTTP GraphQL.

## Build Command And Result

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= \
  pnpm -C autobyteus-web build:electron:mac
```

- Result: `Pass`
- Version: `1.4.8`
- Electron: `42.4.1`
- Platform: macOS ARM64
- Signing/notarization: intentionally absent for the local test build; electron-builder skipped signing because `APPLE_TEAM_ID=`. `codesign -dv` reports only the executable's ad-hoc/linker signature metadata. This is not distribution-signature evidence.
- Fresh log: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/logs/api-e2e/electron-build-round-4-mac-arm64.log`

The command passed localization guards/audit, shared/server build and built-in-agent bootstrap, Prisma/native dependency preparation, mobile and Electron renderer generation, Electron TypeScript compilation, packaging, and DMG/ZIP generation.

## Fresh Artifacts

| Artifact | Absolute Path | Size | SHA-256 |
| --- | --- | ---: | --- |
| App | `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | `1.2G` on disk | N/A |
| DMG | `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.8.dmg` | `384M` | `8849590846e6024369658dabc1ba5d9396695df5c3f89e78d95dd3b96b1c8728` |
| ZIP | `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.8.zip` | `385M` | `87c16a3f61e910d8d0a0cdaea1edd43de699e8551b62bc5f084171e84b809ea7` |

## Artifact Verification

- Main executable is executable Mach-O arm64.
- Bundled `Contents/Resources/server/dist/app.js` exists.
- Bundled production JS contains:
  - `RuntimeToolTraceSequencer` and `callObserved`;
  - `hasExplicitToolArguments` parser/context wiring;
  - fallback-aware terminal argument projection;
  - narrowed accumulator construction of the sequencer.
- Three bundled `node-pty` `spawn-helper` files retain executable bits.
- `hdiutil imageinfo` passed for the DMG.
- `unzip -tq` passed for the ZIP.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/evidence/round-4/package-inspection.log`

## Packaged Server And Exact Sequence Probe

The fresh package's Electron executable ran the bundled server in Node mode on `127.0.0.1:29795`. `DATABASE_URL` was explicitly unset. `APP_ENV=test`, `DB_TYPE=sqlite`, and an isolated temporary app-data root produced an isolated `test.db`. Normal migrations completed only in that temporary database, and the server reached readiness.

A retained temporary harness imported the converter, accumulator facade, sequencer path, writer, and metadata code from the **fresh packaged server**, emitted sanitized provider events, then queried the running package through HTTP GraphQL.

Authoritative result: `Pass`.

It proved:

1. matching result preserves one live A+B normalized ID and one persisted/projected A+B block; next tool uses a fresh ID;
2. result-first `commandExecution` projects `{ command: "echo inferred" }`, flushes before strict call/result, and projects between before/after reasoning;
3. unseen insufficient hosted-search terminal flushes A, repeated insufficient update does not add rows, later readiness writes call/result without relocating the boundary, and packaged GraphQL order is `Thinking(A) -> tool -> Thinking(B)`;
4. explicit dynamic `arguments: {}` remains present/ready and writes a pair;
5. truly absent dynamic arguments remain omitted/deferred and fabricate no physical/projected tool row;
6. ignored reasoning delta/part methods emit and persist/project nothing; repeated completed snapshot is idempotent.

Evidence:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/evidence/round-4/packaged-server-process.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/evidence/round-4/packaged-exact-sequence-probe.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/evidence/round-4/packaged-exact-sequence-probe.mjs`

The first temporary probe assertion compared global reasoning order across several synthetic turns created within the same millisecond. Projection's timestamp tie ordering differed even though exact raw rows passed. The harness was corrected to assert content completeness plus requirement-relevant within-turn ordering, the test-owned run directory was reset, and the authoritative rerun passed. This was an API/E2E harness issue, not a product failure. The first log is retained as `packaged-exact-sequence-probe-attempt-1.log`.

## Non-Interference And Cleanup

A user-owned AutoByteus server PID `96219` remained on fixed embedded port `29695`. The candidate full window was not launched in parallel. The user process/data were not stopped, reused, or modified.

The package probe used only port `29795` and test-owned app data. Its server was stopped, the temp directory/SQLite/memory were removed, and port `29795` was confirmed closed. Port `29695` remained active.

Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/evidence/round-4/cleanup.log`.

## Downstream User Verification

The replacement app is ready for full-window user verification after the other AutoByteus instance is quit. Use a **new** Codex run; pre-fix history is intentionally unchanged. Confirm live and reload order for both matching-result A+B grouping and a provider-late tool boundary. Repository finalization must remain on hold until explicit user verification/authorization.

## Status

`Fresh abd50be3 package built and packaged production runtime validated successfully; ready for downstream full-window user verification.`
