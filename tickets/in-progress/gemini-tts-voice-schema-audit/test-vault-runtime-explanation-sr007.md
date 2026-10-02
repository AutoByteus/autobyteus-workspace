# How the Imported Test Vault Was Used — `SR-007`

## Direct Answer
`pnpm secrets:import` writes encrypted secret records to the **specified SQLite DB** and creates/uses its adjacent root-key file; it does not leave a vault process running and does not make unrelated tests automatically use that DB. The later test process must initialize its own Prisma/vault runtime against the **same absolute database URL**. The successful 2026-10-02 current-key speech check was a one-off inline Node ESM probe, not the standard `pnpm test:e2e:real` command.

## Actual One-Off Command Shape
After a value-free `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/tmp/autobyteus-current-key-probe-Dm6jfP/test.db --dry-run` and a direct-TTY confirmed rerun without `--dry-run`, Solution Designer executed `node --input-type=module <<'EOF' ... EOF` from the feature worktree's `autobyteus-server-ts` directory. The important binding lines were:

```js
const location = ApplicationDatabaseLocation.fromAbsoluteFileUrl(
  'file:/tmp/autobyteus-current-key-probe-Dm6jfP/test.db',
);
await initializePrisma({ datasourceUrl: location.databaseUrl });
await getSecretVaultRuntime().initialize(location);
const resolver = createMediaProviderApiKeyResolver('audio');
await resolver.resolve('GEMINI', 'geminiVertexExpressApiKey'); // readiness; no value printed
const client = AudioClientFactory.createAudioClient(
  'gemini-3.8-flash-tts', undefined, resolver,
  async () => ({ kind: 'vertexExpress' }),
);
const result = await client.generateSpeech('Short test transcript.');
// Verify nonempty RIFF/WAVE; delete generated audio; close client/vault/Prisma.
```

The actual transcript was a short AutoByteus current-key check. One generation produced a 322,538-byte adapter-validated WAV, which was removed. The isolated DB/key were also removed, so this historical command cannot be rerun against that vanished path without a fresh explicit import. No `.env` value was read directly by the script; the audio resolver fetched the configured Vertex Express slot from the initialized isolated vault.

## Contrast With Standard E2E
The feature worktree's root `pnpm test:e2e:real` runs `test-support/live-e2e/run-live-e2e.mjs` after build. That runner starts a test-owned server, passes the test database URL to the test process, and `LiveE2eHarness.open()` initializes the vault against AppConfig's operational DB only after checking it matches the expected test DB. To use imported secrets there, the operator must import into **that runner's exact test DB** first. Importing into some different `/tmp` DB does not configure the standard runner. The one-off probe explicitly bound to its own `/tmp` DB instead, which is the manual glue behind the earlier usability assessment.

## Status, Authority And Route
- Stable package `gemini-tts-voice-schema-audit`, current `SR-007`; [requirements](requirements-doc.md) remain Draft/unapproved. This is evidence-only clarification of [SR-006 usability assessment](test-vault-usability-assessment-sr006.md), not approval of a new importer/test helper or a change to voice behavior. [Investigation](investigation-notes.md) and [solution history](solution-revision-record.md) are canonical. No Product supplement; design/review/task-size/risk/delivery receipt N/A.
- Isolated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-tts-voice-schema-audit`, branch `codex/gemini-tts-voice-schema-audit`, base `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`, target `origin/personal`/`personal`. Feature source at `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-38-tts-upgrade` was inspected read-only. No new import, paid call, secret or source/test change in this round.
- `get_handoff_rules` returned only completed-architecture review/direct-implementation and Delivery Completed receipt-gap conditions. None matches this evidence-only Draft clarification. Return the mechanism and actual command shape to the user; no provider call or specialist handoff.
