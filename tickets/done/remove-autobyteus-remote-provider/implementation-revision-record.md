# Implementation Revision Record — remove-autobyteus-remote-provider

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass (`design-review-report.md`, round 1) | N/A | `Initial Baseline` | SR-003, ARCH-REV-001 | Implementation complete; routed to Code Review |
| IR-002 | Code Reviewer Design Impact (CRR-003) → SR-004 → Architecture Reviewer pass ARCH-REV-002 | CR-001 | `Design Impact` (resolved upstream; implemented here) | SR-004, ARCH-REV-002, CRR-003, API-REV-002 | `MultimediaRuntime` removed; routed to Code Review |

## Revision Entries

### IR-001 — Clean-cut removal of the remote AutoByteus LLM/image/audio provider

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-review-report.md`, round 1 (Pass)
- Triggering finding IDs: N/A. Non-blocking notes R-001, R-002 and R-003 were applied as guidance (see the handoff).
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Implementation complete; local checks pass (see the handoff); `task_size=Large`, `architectural_risk=High` confirmed.
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff for the approved SR-003 design.
- Approved behavior or requirement IDs affected: BEH-001..BEH-010; REQ-001..REQ-010; AC-001..AC-008.
- Implementation delta:
  - The released token-usage backfill migration now reads a migration-owned frozen display-name table. This was done first, as its own commit.
  - autobyteus-ts: the remote LLM adapter, discovery, renderer, payload/usage helpers, the `clients/` folder and the media providers/clients are deleted. The `AUTOBYTEUS` enum members are removed. Also removed: the host-scoped marker, media `hostUrl`, `model-identifier.ts`, the media source-model registry and LLM `syncRuntimeModels`/`retainSourceModels`.
  - Server: the following are removed:
    - the discovery service
    - the catalog, availability, provider-service, built-in-catalog and settings branches
    - `notifyCredentialRevision`/`credentialRevisions`
    - the `modelDiscovery` consumer
    - the AUTOBYTEUS binding and alias
    - the readiness case
    - the AutoByteus-only preprocessor and its loader helper

    GraphQL media rows now emit `hostUrl: null`.
  - Web: the hosts card, the store target, the post-save refresh and the enum member are removed. Discovery-setting convergence is now LLM-only (`modelKinds` removed).
  - Ops/test-support: the Docker host-key lines are removed, and so are the live-E2E remote scenarios and harness hooks.
  - Docs: current docs are updated. Generic tests are retargeted, remote-only tests deleted, and AC-003..AC-006 tests added.
- Changed files or areas: see "Key Files Or Areas" in `implementation-handoff.md`.
- Local validation and result: see "Local Implementation Checks Run" in `implementation-handoff.md`.
- Next recipient or routing: Code Review (`get_handoff_rules`, Large/High route).
- Remaining limitations or risks: see "Known Risks" in `implementation-handoff.md`.

### IR-002 — Remove the single-valued `MultimediaRuntime` (SR-004 delta)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer` ARCH-REV-002 Pass on SR-004 (`design-review-report.md`). The design revision came from the code reviewer's Design Impact CR-001 (CRR-003, `code-review-report.md`) and the user's 2026-10-12 request.
- Triggering finding IDs: CR-001
- Classification: `Design Impact` (resolved upstream as SR-004; implemented in this round)
- Prior authoritative result: IR-001, which kept `MultimediaRuntime` (single value `API`) as a Follow-up.
- Current authoritative result: `MultimediaRuntime` and the media `runtime` field are removed. GraphQL media rows emit the literal `runtime: 'api'`, with no schema or web change. Commit `403eb2784`.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001 (Pass, superseded), CRR-003 (CR-001)
- Related API/E2E revision IDs: API-REV-002 (prior pass; rerun required)
- Related delivery revision IDs: N/A
- Why this revision is recorded: it implements the SR-004 Change Sequence step 6.
- Approved behavior or requirement IDs affected: REQ-002, REQ-010; no observable behavior change.
- Implementation delta:
  - Deleted `autobyteus-ts/src/multimedia/runtimes.ts` and its `multimedia/index.ts` export.
  - Removed the `runtime` option, field, default and `toString()` mention from `AudioModel`/`ImageModel`/`VideoModel`.
  - The six Gemini checks (`createClient` in `{audio,image,video}-model.ts`; `requiresGeminiRuntimeResolver` in `{audio,image,video}-client-factory.ts`) are now `provider === MultimediaProvider.GEMINI`.
  - Server `video-model-provider.ts`: by-runtime logging dropped.
  - `llm-provider-model-catalog.ts` `mapMedia` emits `runtime: 'api'`.
  - Deleted `tests/unit/multimedia/runtimes.test.ts`, and removed the stale `runtime: "api"` fields from the video model mocks in `server-owned-media-tools.e2e.test.ts`. Only that hunk was committed; the API/E2E engineer's uncommitted edits in the same file are left untouched.
  - The server dynamic-source `modelKind` is untouched (explicit Follow-up).
- Changed files or areas: the 11 files listed above plus `multimedia/index.ts` (12 files, +10/−59).
- Local validation and result:
  - `git grep MultimediaRuntime`: nothing found outside tickets and historical build logs.
  - autobyteus-ts `tsc -p tsconfig.build.json`: pass. Full `tsconfig.json`: no new errors (272, all pre-existing).
  - Server typecheck and build: pass.
  - autobyteus-ts unit: 297 files / 2010 tests pass.
  - Server `test:unit`: 665 files / 5230 tests pass.
  - Clean-env e2e: `server-owned-media-tools`, `removed-remote-provider-leftover-startup` (media rows `runtime: 'api'`, `hostUrl: null`) and `removed-remote-provider-saved-selection-graphql` → 3 files / 10 tests pass.
  - Web: unchanged code, so not rerun.
- Next recipient or routing: Code Review (source re-review), per `get_handoff_rules`.
- Remaining limitations or risks: none new. The OBS-001 resume limitation is pre-existing and out of scope (requirements "Out Of Scope").
