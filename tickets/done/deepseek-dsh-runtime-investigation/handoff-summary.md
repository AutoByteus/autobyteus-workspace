# Handoff Summary: deepseek-dsh-runtime-investigation (autobyteus-387)

- Status: verified from the evidence (audited, with the reruns the handoff named), archived and finalized on `personal`. **No release** (the release guide's default; none requested).
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route.
  - Architecture review ARCH-REV-003 Pass; code reviews CRR-002 and CRR-005 Pass; test-code reviews CRR-004 Pass and CRR-006 Not Applicable.
  - API/E2E: API-REV-003 Pass, 95%.

## What Changed

- DeepSeek Harness (`dsh`, `deepseek_harness`) is a runtime for agents, Teams, Orgs and studio application launches. It runs on the shared ACP backend, one `dsh --profile acp` process per run, in an AutoByteus-owned `DSH_HOME` (the user's `~/.dsh` is never touched).
- dsh's model calls go through the credential proxy's new DeepSeek **provider relay**:
  - dsh holds only a run pass; the relay adds the vault key per call and streams the reply back unchanged.
  - The relay's call observations give dsh its token usage, compaction boundaries and turn liveness.
- The standalone application host runs no credential proxy, so dsh is unavailable there and a launch is refused before dsh starts.
- Settings → Agent Runtimes has a DeepSeek Harness row: version, update, and "API key set" / "API key not set" with a pointer to Settings → API Keys.
- Grok Build moved onto the shared ACP layer unchanged (AC-016).

## Integration

- Merge 1: `origin/personal` `d6bcff577b`, merged as `7c1117e209` (DR-001).
  - DR-001 blocked on `agent-provider-composition-boundaries.test.ts:700`, which came from this ticket's CR-001 move, not from the merge.
  - Fixed in IR-003 (`ee6739fe7f`, test only), reviewed in CRR-005. TESTING.md gained the rule that moved source files mark `tests/architecture/` Rerun (`14fe5959bf`).
- Merge 2: `origin/personal` `b7bb94beba` (autobyteus-388), merged as `2f85bdd672`, no conflicts.
  - Server source unchanged; the web stores, components, generated GraphQL and localization changed.
- Checks on `2f85bdd672`, all pass:
  - server unit suite: 932 files, 7,942 tests;
  - web codegen current, typecheck at its baseline, guards pass;
  - 17 web spec files (this ticket's and autobyteus-388's);
  - dsh scripted-provider E2E: 6 of 6.
  - Evidence: `evidence/delivery/DEL-05…DEL-08`.

## Verification (audit of the evidence)

- Every critical AC is directly proven. Table and lines checked: `release-deployment-report.md`, Verification.
  - The live dsh suite (IMP-08) covers tools, approvals, stop, restore, skills, Agent Tools, usage and the key scan.
  - The scripted-provider suite (API-10…16) covers key missing, changed and removed; compaction completed and refused; keep-alive and stall. It was rerun on the merged state (DEL-08).
  - Teams, Orgs and the runtime switch: API-20…22. Standalone host: API-25. Three rendered Agent Runtimes states: API-30. Fresh-start macOS build: API-35.
- No user check is needed. Signing, notarization and the x64, Windows and Linux builds happen only on the release runners (no release now).

## Notes For The Solution Designer

- AC-006: the `{{name}}` precondition cannot be produced, because the shared prompt composer refuses `{{…}}` for every runtime. Literal braces (`{probe}`) and the rule were proven.
- AC-009: no product surface removes a built-in provider key. The "key removed later" case was driven through the vault service.
- Follow-ups to send: FU-001 (urgent: data-dir `.env` provider keys reach every agent), FU-002 (prerelease suffix dropped in runtime versions), FU-003 (the release smoke check does not cover dsh).

## Release

- None. It ships with the next release the user asks for. A user needs dsh installed (Node.js 24.9+) and a DeepSeek key in Settings → API Keys.
