# Code Review Report — Gemini 3.8 TTS upgrade

## Review Round Meta

- Review Entry Point: **API/E2E Failure-Origin Review**, round 5 (`CRR-005`); latest authoritative code-review result. This is not successful-test-code review.
- Trigger: `/api_e2e_engineer`, `API-REV-004` Fail / 82.1%, `API-06 / SCN-004 / AC-007`, with successful live-audio proof for `AC-004/009` absent. User authorized **one** current Vertex Express call and directed stop/wait if the same error returned.
- Context: approved requirements `SR-004`, investigation and solution history through evidence-only `SR-009`, reviewed design `SR-006` / `ARCH-REV-002`, implementation `IR-002`, source review `CRR-002` Pass, prior failure-origin `CRR-003/004`, `solution-blocker-sr007.md`, `solution-access-update-sr008.md`, `solution-vertex-recheck-sr009.md`, and current API/E2E investigation, ledger, execution coverage report and revision record (`API-REV-001–004`). All are in this ticket directory. Behavior-defining Product supplement and delivery record: N/A. Task size **Large**, architectural risk **High** unchanged.
- Exact live command: `node test-support/live-e2e/run-live-e2e.mjs --scenarios=gemini.vertex-express.audio` once from the task worktree after explicit dry-run and direct-TTY import to a fresh isolated `autobyteus-server-ts/db/test.db`. Preflight READY/configured; operation failed with value-safe HTTP **404/model-unavailable** category, auth=false and quota=false; no audio. Evidence: latest execution report, ledger events 40–45, and cumulative API revision record. Temporary category diagnostic was reverted; source private `.env` metadata unchanged, owned vault/runtime cleaned.

## Bounded Scope And Supported Scenario Gate

| Scenario / contract | Independent trigger and forward path | Expected outcome / authority | Disposition |
| --- | --- | --- | --- |
| `SCN-002`, `BEH-002`, `REQ-004`, `AC-004/006` | Speech user/agent invokes `generate_speech` → media service → current model resolver/factory → Gemini audio adapter → SDK/provider → validated WAV → requested path. | Playable audio if served; explicit provider error without fallback. Approved requirements/design and current source establish this normal path. | Supported Normal Scenario / Use. |
| `SCN-004`, `BEH-003`, `REQ-005/006`, `AC-007/008` | Test operator explicitly imports to isolated vault, activates Vertex Express, and runs the scoped live scenario → same production audio factory/adapter → Google SDK/provider. | Genuine audio pass or truthful failure/skip with no secret leakage. User's `SR-009` instruction authorized **one** route recheck only. | Supported Explicit Edge Scenario / Use. |
| Vertex Express model access | Configured `VERTEX_AI_API_KEY` and selected `gemini-3.8-flash-tts` are independent of the failure path; the provider returned 404 in API-REV-001 and again on 2026-09-26. | Google’s [Gemini API speech guide](https://ai.google.dev/gemini-api/docs/generate-content/speech-generation) documents the model; the current [Google Cloud Gemini-TTS model list](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts) does not list 3.8 on that Cloud TTS page. This supports caution but does not prove universal Vertex support/absence or this key’s exact entitlement. `SR-004/006` do not guarantee Vertex access. | Observed route/key rejection; exact external cause **Unclear**. |

## Candidate Finding And Failure-Origin Gate

| Candidate | Forward path, lifecycle and consequence | Disposition |
| --- | --- | --- |
| `FO-006` — new production or harness defect | The supported operator path reached the configured Vertex Express provider: value-free dry-run READY/CREATE 10 → TTY `IMPORT` CONFIGURED 10 → preflight READY → exact `gemini-3.8-flash-tts` via existing audio adapter/SDK → provider-stage 404 before response/WAV handling. No source or durable test change in API-REV-004; installed-SDK wire and deterministic suites, plus `CRR-002` source Pass, remain applicable. Prior real `gemini-3.8-flash` Vertex LLM succeeded through the same route but does not establish TTS entitlement. | **Reject as demonstrated code/test defect.** A 404 alone does not prove model/request serialization is correct, but no contrary implementation/fixture evidence or source-review gap is shown. Do not prescribe a fallback or alias. |
| `FO-007` — this Vertex Express route/key lacks current 3.8 TTS model access | Independently initiated `SCN-004` recheck returned HTTP 404/model-unavailable once today, matching API-REV-001’s two Vertex Express calls. No audio produced; AI Studio was not called this round and its separate 429/quota history cannot establish this 404’s cause. Cloud-side model list currently omits 3.8 but is not a global Vertex verdict. | **Promote observed route-specific provider rejection; Hold for Evidence on exact rollout/endpoint/entitlement cause.** Provider or operator confirmation is needed before any claim of route availability. |
| `FO-008` — another immediate paid retry | User explicitly directed stop and wait if the same error returned. The same category did return and no changed external state was established. | **Reject as unsupported next action.** No further provider call, blind retry, or machinery is justified. |

## Focused Failure-Origin Conclusion

- `API-06` remains **Fail**, not pass or skip: one current Vertex Express attempt to exact 3.8 Flash TTS returned provider-stage 404/model-unavailable and no WAV/audio URL. `AC-007` and successful live-audio portions of `AC-004/009` remain unmet. Prior rendered Settings, deterministic speech, and real Vertex Express LLM evidence remain valid but cannot substitute for live TTS.
- Final bounded origin: **route/key-specific provider model lookup rejection** is observed; exact Vertex Express rollout, endpoint support, entitlement, or other provider-side lookup reason remains **Unclear**. No new implementation or test-harness defect is demonstrated, and this external-state failure was not reasonably detectable in source review. `CRR-002` source Pass and resolved `CR-001` remain intact. Separate AI Studio 429/quota history remains separate.
- User instruction controls the next action: **stop and wait**. Do not make another paid provider call, route-switch silently, lower the acceptance bar, or finalize a live-audio pass. The next meaningful prerequisite would be provider/operator confirmation of 3.8 TTS availability for this exact Vertex Express route/key (or another explicitly authorized changed access path) **and new user direction** before any retest. A changed default/fallback/acceptance criterion would require renewed approval through Solution Designer.
- Classification: **Unclear** for exact external availability/access cause and upstream product disposition; route to `/solution_designer` with the explicit wait instruction. No source finding or score change; no implementation/test-code review reopening. Successful-test-code review remains pending until API/E2E passes.

## Latest Authoritative Result

- Review Decision: **Fail / Unclear**, focused API/E2E failure-origin review `CRR-005`.
- Supported scenario gate: Pass for `SCN-002/004`; material-premise gate: observed Vertex provider 404, exact access cause held for evidence. No unsupported premise drives a defect attribution or required machinery.
- Failure origin: configured Vertex Express route/key rejected exact 3.8 TTS with HTTP 404/model-unavailable; no demonstrated source or harness defect. User-directed **stop/wait** is binding for next testing.
- Score summary: N/A — failure-origin-only result; prior source Pass `CRR-002` unchanged.
- Recommended recipient: `/solution_designer`.
