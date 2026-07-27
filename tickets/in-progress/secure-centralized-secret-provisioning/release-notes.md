# Secure Centralized Secret Provisioning — Round 16 Candidate Notes

## Candidate

- Branch: `codex/secure-centralized-secret-provisioning`
- Final reviewed HEAD: `53dd05ecaac6e3196497597cceba0799f8093aba`
- Base checked: `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`
- Architecture review: Pass
- Implementation source review: Round 39 Pass, 9.64/10
- API/E2E: Round 16 Pass, 98.1% confidence; no category below 90%
- Proportional durable-test review: Round 8 Pass; TCR-001 through TCR-006 resolved

## User-Visible And Operational Changes

- Provider and integration credentials are encrypted inside the current SQLite
  application database, protected by the adjacent
  `<database-path>.secret.key`. Database and key are one backup/restore/reset
  pair.
- Settings -> API Key Management receives each provider once, with one
  authoritative configured state and its LLM/audio/image/video model sections.
  Repeated capability rows cannot overwrite another provider's configured fact.
- Provider Settings remain write-only: save/remove returns completion, then the
  UI refetches canonical value-free state. Secret values are never returned.
- Provider/model catalogs remain available independently of credentials.
- Gemini options remain independent with one explicit active mode. AI Studio
  metadata is `LIVE|CURATED_FALLBACK`; Vertex modes are `CURATED_ONLY`.
- The sole explicit importer command is:

  ```bash
  pnpm secrets:import -- \
    --source /absolute/path/to/assignments \
    --database-url file:/absolute/path/to/application.db \
    --dry-run
  ```

  `--database-url` is required and is the sole target authority. The importer
  never inherits a target from `.env`, `.env.test`, parent `DATABASE_URL`, the
  source file, AppConfig, or the working directory.
- Backend E2E keeps one committed non-secret `.env.test` launch template through
  a test-only bootstrap. Actual servers read only ordinary runtime `.env`.
- Electron **Reset Server Data** deletes the complete app-data directory,
  including the application DB and derived key.

## Preserved Boundaries

- Claude modes remain exactly `cli` and `managed-secret`; no fallback or
  authentication redesign was added.
- Codex retains its external account/configuration and is excluded from the
  governed-child environment part of `LOCAL_HARDENED`.
- `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0 remains an
  infrastructure dependency; query logging is default-off and there is no
  automatic package or credential import/update.
- Docker topology and the existing server-data volume are unchanged.
- Qwen importer mapping remains `DASHSCOPE_API_KEY` only.
- Source assignment files and the tracked test template remain immutable.

## Validation Highlights

- Configured OpenAI LLM/agent/audio/image, DeepSeek LLM/agent, Vertex Express,
  native Anthropic, managed-secret Claude, Codex, and Claude CLI paths passed.
- Browser Settings proved configured OpenAI with subordinate audio/image models
  through the exact provider-centric read, and the DeepSeek agent turn passed.
- Vault/importer/restart/GraphQL/custom-provider/Gemini, Docker same-volume
  persistence, repository-Prisma integration, builds, cleanup, and evidence
  safety passed.
- The Round 16 macOS arm64 Electron DMG/ZIP built at the final HEAD; focused
  Electron AppData/runtime tests passed 22/22.
- Delivery verified DMG/ZIP integrity and started the current bundled server
  under the packaged Electron runtime against an isolated temporary DB/key root;
  migrations and health passed and cleanup completed.
- The hermetic live-E2E harness unit file passed 13/13 without ambient
  Ollama/LM Studio discovery output.

## Exact Limitations

- Serper and Gemini AI Studio were not configured; no operation is claimed for
  them.
- AutoByteus discovery at the declared `api.autobyteus.com` endpoint was
  unavailable and is not claimed as passed; no alternate endpoint was invented.
- The local macOS candidate is ad-hoc/unsigned because no Apple signing identity
  was configured. It is for local user verification, not publication.
- The complete visible Electron shell still requires explicit user verification;
  delivery validated the packaged server in isolation without disturbing the
  installed production application.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains an external release recheck and is not
  legal clearance.

## Compatibility And Data Transition

Existing application rows remain directly usable. Normal additive Prisma
migration creates the vault tables without importing legacy plaintext
credentials. Users provision through Settings or the explicit importer and
remain responsible for plaintext cleanup/rotation.

These obsolete authorities remain intentionally absent with no compatibility
wrapper:

- `test-config/live-e2e.json`
- `test-support/live-e2e/live-e2e-manifest.ts`
- `test-support/live-e2e/run-test-import.mjs`
