# Secure Centralized Secret Provisioning — Round 17 Candidate Notes

> **Blocked candidate — do not release or use for renewed verification.**
> The user's 2026-07-27 packaged Electron check exposed a confirmed Terminal
> bridge regression: the sanitized child environment drops
> `ELECTRON_RUN_AS_NODE`, so the packaged Electron executable relaunches
> application mode instead of the Node-mode PTY bridge. A reviewed correction
> and new packaged candidate are required.

## Candidate

- Branch: `codex/secure-centralized-secret-provisioning`
- Final reviewed implementation HEAD:
  `dd1d37f90d00331d427bad1b36e4401a3a733038`
- Local validated-state checkpoint:
  `3877b39bdcad2e8c88bb9f86d190308aaf034829`
- Base checked: `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`
- Architecture review: Pass
- Implementation source review: Round 41 Pass, 9.62/10
- API/E2E: Round 17 Pass, 98.9%; every applicable category >=98%
- Proportional durable-test review: Round 9 Pass; no unresolved findings

## Existing-User Startup Correction

- The supported previous application stored custom OpenAI-compatible providers
  in plaintext schema v1. The candidate now performs one bounded startup
  transition after database migration and vault initialization.
- A complete valid one- or multi-provider v1 set migrates all-or-nothing into
  encrypted vault entries plus secret-free v2 metadata, preserving provider IDs
  and names.
- The exact aged zero-byte lock left by the supported old writer is recoverable;
  a live positive-PID lock owner remains protected.
- Invalid, duplicated, unsafe, or colliding v1 data is not partially imported.
  The plaintext v1 file is deleted, built-in Settings remains available, and the
  user re-adds providers through **New Provider**.
- If safe deletion fails, startup and built-ins remain available while custom
  provider creation stays unavailable until the filesystem issue is corrected
  and the app restarts.
- There is no runtime v1 reader, compatibility fallback, backup/quarantine,
  partial migration, alternate source, or automatic `.env` import/update.

## Secure Credential And Settings Behavior

- Provider and integration credentials are encrypted inside the current SQLite
  application database, protected by the adjacent
  `<database-path>.secret.key`. Database and key are one backup/restore/reset
  pair.
- Settings -> API Key Management receives each provider once, with one
  authoritative configured state and its LLM/audio/image/video model sections.
- Provider Settings remain write-only: save/remove returns completion, then the
  UI refetches canonical value-free state. Secret values are never returned.
- Gemini options remain independent with one explicit active mode.
- The sole importer is `pnpm secrets:import -- --source <absolute>
  --database-url <absolute-file-url>`; that explicit URL is the sole target
  authority.

## Preserved Boundaries

- Claude modes remain exactly `cli` and `managed-secret`; external Codex remains
  unchanged.
- Claims remain `LOCAL_HARDENED` with Codex excluded;
  `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0 remains.
- Docker topology, source/template immutability, no automatic `.env`
  import/update, and `DASHSCOPE_API_KEY` as the sole Qwen mapping remain.

## Validation Highlights

- Actual built-server v1 migration/reset/restart E2E passed 3/3 in authoritative
  API/E2E reruns and again in the delivery integrated-state check.
- The actual packaged macOS Electron executable was launched six times across
  three isolated existing-user profiles. REST health, preload IPC, assembled
  GraphQL, Settings renderer, migration/reconfiguration, and restart passed.
- Configured OpenAI LLM/agent/audio/image, DeepSeek LLM/agent, Vertex Express,
  native Anthropic, managed-secret Claude, Codex, and Claude CLI paths passed.
- Docker, browser Settings, repository-Prisma, Electron AppData/runtime, cleanup,
  and value-safety scans passed.
- Delivery reverified the current DMG/ZIP hashes and container integrity.

## Exact Limitations

- Gemini AI Studio and Serper were not configured; no pass is claimed.
- Configured AutoByteus remote LLM/audio/image discovery returned the recorded
  stable discovery-failure codes; no alternate endpoint or pass was invented.
- The local macOS candidate is ad-hoc/unsigned because no Apple signing identity
  was configured. It is for local user verification, not publication.
- The installed application and candidate share identity and fixed port 29695;
  they cannot run side by side.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains an external release recheck and is not
  legal clearance.

## Compatibility And Data Transition

Normal additive Prisma migration creates the encrypted vault. The supported
custom-provider v1 file is the sole bounded automatic credential transition and
follows the outcomes above. Other plaintext sources remain non-authoritative;
operators use Settings or the explicit importer and remain responsible for
source cleanup/rotation.

The application DB and adjacent key must be backed up, restored, moved, and
reset together. Electron **Reset Server Data** removes the entire server data
root, including both.
