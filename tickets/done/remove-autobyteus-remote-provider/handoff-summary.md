# Handoff Summary — remove-autobyteus-remote-provider

## User Verification

- Verified by the user on 2026-10-12: "i just verified. all working. now finalize and release a new beta"
- Decisions:
  1. **Accepted as done.** This covers the Settings check (AC-002) and the native AutoByteus runtime check (AC-007) from How To Verify.
  2. **Release:** a new beta. The next beta is `v1.5.2-beta.1`, computed by `scripts/release_versions.py next-beta`.
  3. **OBS-001:** the user did not decide on a ticket. It goes to the Solution Designer as a separate-ticket candidate.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider`, branch `codex/remove-autobyteus-remote-provider` (local only, not pushed).
  - `4196f55a5`: frozen provider display names for the released token-usage backfill.
  - `fdb7635f3`: removal of the remote provider.
  - `ac3868577`: current docs.
  - `403eb2784`: removal of the single-valued `MultimediaRuntime` (IR-002, your 2026-10-12 request).
  - `7deec52d1`: the API/E2E durable tests.
  - `5a25fe46e`: `docs(testing)`, the "Local model servers share limited compute" bullet.
  - `08f030719`: checkpoint of the ticket records.
  - Not committed yet: the delivery documents in this folder.
- Base and finalization target: `origin/personal`. The branch is current with `origin/personal` @ `beb6b3b49` (re-fetched at DR-001; no new commits, so no merge was needed).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` build folders.

## What Changed

- **Remote provider removed.** The remote AutoByteus LLM, image and audio provider is gone. This covers:
  - adapters, discovery, the client and cert utilities, and the prompt renderer;
  - the `AUTOBYTEUS` members of `LLMRuntime`, `LLMProvider` and `MultimediaProvider`;
  - the vault binding, the `.env` import alias and app-launch readiness;
  - the AutoByteus-only tool preprocessor;
  - the Docker entrypoint lines and the live-E2E scenarios.
- **Settings.** No "AutoByteus" provider row and no "AutoByteus LLM Hosts" card. LM Studio, Ollama, "AutoByteus VNC Hosts" and the other providers are unchanged.
- **`MultimediaRuntime` removed** (IR-002). It had one value left. Media GraphQL rows still return `runtime: 'api'`.
- **Leftover data, no migration (DEC-002).**
  - Saved remote model ids show as unavailable and block launch or resume. They are not cleared or replaced.
  - A leftover `AUTOBYTEUS_LLM_SERVER_HOSTS` shows as a deletable custom setting.
  - A leftover vault key is never read.
  - Token-usage history still shows "AutoByteus". The released backfill uses a frozen copy of the display-name table.
- **Not changed: the native AutoByteus runtime** (`RuntimeKind.AUTOBYTEUS`), its "AutoByteus" label, saved native runs, `AUTOBYTEUS_SERVER_HOST` and the VNC hosts.
- **Docs:** 9 current docs updated, plus `TESTING.md` (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-001 Pass (SR-003); ARCH-REV-002 Pass (SR-004) |
| Code review | CRR-001 Pass; CRR-003 reopened it as Design Impact CR-001 (`MultimediaRuntime`); CRR-005 Pass (9.6/10) |
| Test-code review | CRR-002 Fail (TR-001); CRR-004 Pass; CRR-006 Pass |
| API/E2E | API-REV-003 Pass, 95%. AC-001..AC-008 directly proven, including a packaged isolated desktop app, live LM Studio inference and a Docker start. Round 3 on fresh builds: autobyteus-ts 2017 tests; server unit 5230 tests; integration (only the 2 known `TESTING.md` cadence cases fail); affected e2e 30 files / 109 tests |
| Delivery smoke on `08f030719` | • Core and server typechecks: clean.<br>• Core multimedia unit: 16 files, 138/138.<br>• Affected server unit: 5 files, 85/85.<br>• Web Settings specs: 3 files, 29/29.<br>• Logs: `delivery-evidence/` |

## How To Verify

Start an isolated app freshly built from this worktree. It uses separate data and does not touch your own app:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider
pnpm --silent isolated-app start --build
```

1. **Settings (AC-002).**
   - Provider API keys: there is no "AutoByteus" provider.
   - Server Settings: there is no "AutoByteus LLM Hosts" card. LM Studio, Ollama and "AutoByteus VNC Hosts" are still there.
2. **Native AutoByteus runtime (AC-007), the check you said matters most.**
   - Start a new agent run on the **AutoByteus** runtime with an LM Studio, custom or API model. The composer label still says "AutoByteus".
   - It replies. Stop it, then reopen and continue it.
   - LM Studio runs locally, so run one local-model run at a time.
3. **Optional, leftover host value (AC-005).** Add a custom server setting `AUTOBYTEUS_LLM_SERVER_HOSTS` with any value. After a restart (`pnpm --silent isolated-app restart <instanceId>`) the app starts normally and lists it as an ordinary custom setting you can delete.
4. Stop with `pnpm --silent isolated-app stop <instanceId>`.

## Decisions Needed At Verification

1. **Release:** finalize only (merge to `personal`), or also publish a beta or stable version? The last tag is `v1.5.1`.
2. **OBS-001 (separate-ticket candidate):** a stopped native run whose model is no longer offered cannot switch to another model ("Both models need verified context capacities before replacement."). This is pre-existing and not caused by this change. Should the Solution Designer open a ticket for it?

## Residual Risks (non-blocking)

- OBS-002: a launch profile with a remote id is blocked as `CURRENT_MODEL_SELECTION_REQUIRED` rather than `MODEL_UNAVAILABLE`. Only the wording differs; it still blocks and keeps the value.
- BAS-001 (baseline): `docker/Dockerfile.remote-server` and `Dockerfile.allinone` miss two workspace contract packages, so `pnpm install` fails on base too.
- BAS-002 (baseline): the `RUN_LMSTUDIO_E2E` suite setup is broken.
- Not tested: paid API inference and Ollama. Both share the paths already proven with LM Studio and a custom provider.
- RSK-003: rebase coordination with the `anthropic-incomplete-content-block` ticket. This branch deletes `autobyteus-llm.ts`.
- Code follow-ups:
  - `BaseLLM.releaseConversation` and the summary-port release step have no production override.
  - The `logicalConversationId` kwarg is only filtered.
  - The server dynamic-source `modelKind` is always LLM (R-003).
  - Multi-kind freshness aggregation in `useProviderApiKeySectionRuntime`.
