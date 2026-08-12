# API-F-022 — Restored mobile Team communication/reference projection is empty

## Classification

- API/E2E revision: `API-REV-030`
- Scenario: `API-MOBILE-REFERENCE-030-001`
- Result: **Fail**
- Preliminary origin: frontend implementation at the persisted Team-communication GraphQL DTO/hydration boundary; final origin belongs to focused `code_reviewer` review.
- Current HEAD: `67551df6ba020b86c65b4716335d90f28d40f72e`
- Authority: `SR-018` / `ARCH-REV-011` / `IR-036` / `CRR-065`

## Expected

Opening a real persisted Team from the mobile surface must hydrate the same exact root-scoped communication projection used by desktop. For the focused `/Teacher` execution, the Activity view must show the sent message, its `mobile-config-reference.txt` reference, exact reference content, and close-back behavior.

## Real reproduction

1. Started the checked built server and Nuxt frontend on owned ports `60230/31230` against the absent disposable SQLite target `autobyteus-server-ts/db/api-rev-030-live-20260812-1.db`.
2. Imported secrets interactively only into that disposable database and imported a staged test-only Nested Classroom package. The private source package remained byte-identical.
3. In real headless Google Chrome, launched a real AutoByteus `gpt-5.6-luna` Nested Classroom Team.
4. From `/Teacher`, sent one ordinary Team communication to `/StudentStudyGroup/student_one` with the exact absolute reference path ending in `mobile-config-reference.txt`; received the exact requested reply.
5. Reloaded and opened that exact Team. Desktop restored the exact user completion and the selected-active-Team configuration view was correctly read-only and topology-derived.
6. Paired a real mobile browser session to the same disposable backend, opened the latest `Nested Classroom Test Team`, selected Activity, and opened Team messages.

Exact root TeamRun: `nested_classroom_test_team_eeceab75d5cb483cab682be1841176c8`.

## Observed

- Server persistence logs show the exact root received two communication projection inserts:
  - `teammsg_ltXzBoeuWJdkCWmh1qzvKQg4l7-l6pgy`, `referenceCount=1`;
  - `teammsg_iKuFVj_esEZ54p_53haudwQ9Go3U4w-a`, `referenceCount=0`.
- The browser runner had already required a GraphQL message whose reference path exactly equalled the owned `mobile-config-reference.txt` and an exact reply to `/Teacher` before it proceeded to reload/config/mobile steps.
- The restored mobile shell selected the correct Team and focused `Teacher`, but rendered:
  - `Messages · 0`
  - `Activity · 1`
  - `No team messages yet for the focused member.`
- There were no browser console warnings/errors in the persisted-mobile row.
- The reference row therefore did not exist, so reference content and close-back could not execute.
- A separate active-run mobile attempt against the same exact root also timed out waiting for `mobile-team-reference-row`, so the symptom is not limited to terminal status.

## Boundary analysis

This is not a missing provider call, missing server record, wrong selected root, pairing failure, unavailable file, or operational-database issue. The real provider journey, exact server projection inserts, desktop restore, mobile authentication/catalog selection, and exact root/focus all succeeded.

The source provides a concrete likely mechanism:

- `GetTeamCommunicationMessages` returns Apollo GraphQL objects whose nested address/reference objects may contain GraphQL `__typename` metadata.
- `teamCommunicationHydrationService.ts` passes that response directly to `teamCommunicationStore.replaceProjection(...)`.
- `teamCommunicationStore.parseMessage(...)` calls strict `parseTeamExecutionAddress(...)` directly and silently drops an invalid message.
- The strict parser correctly requires exactly the four canonical address fields and rejects surplus metadata.
- Unlike the adjacent task-delegation hydration path, there is no GraphQL DTO projector that removes only validated Apollo metadata before invoking the strict domain parser.

That is a source-level inference from the reproduced empty store and current code, not a final ownership ruling. Runtime compatibility or a relaxed domain parser would be the wrong correction; the focused reviewer should decide whether an exact GraphQL DTO projection boundary is required.

## Prior failure resolution retained

`API-F-021` / `CR-F-038` is resolved downstream. Fresh real standalone Agent rows for AutoByteus, Codex App Server, and Claude all rendered exact assistant content before refresh, persisted it exactly once, restored it after refresh/history selection, and terminated cleanly.

## Direct evidence

- `environment/safe-server-output.log` — exact TeamRun and two projection insert records.
- `live/browser/mobile-config-reference-row.json` and `mobile-config-reference-row-final2.log` — active-run reference-row timeout on the exact root.
- `live/browser/mobile-persisted-reference-row.json` and `.log` — fresh persisted mobile failure.
- `live/browser/mobile-persisted-body.txt` — exact `Messages · 0` / no-message presentation.
- `live/browser/mobile-persisted-home.png`, `mobile-persisted-work.png`, `mobile-persisted-message-list.png`, `mobile-persisted-failure.png` — real responsive-browser evidence.
- `live/browser/mobile-config-desktop-message.png` — desktop restore of the real Team journey.
- `live/browser/mobile-config-selected-team-read-only.png` — selected-Team configuration result.

## Safety and cleanup

The operational database was not inspected, opened, copied, targeted, migrated, repaired, rolled back, deleted, or otherwise acted on. Owned `60230/31230` processes were stopped; the owned runtime/database/vault were removed; private package hashes match. Protected `60004/31004`, delivery stash, and backup were untouched. Both historical incident disclosures remain preserved.
