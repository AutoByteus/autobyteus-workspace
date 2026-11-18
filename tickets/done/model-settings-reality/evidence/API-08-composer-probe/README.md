# API-08 / API-13 — the existing chat-composer-polish probe (updated) against the real stack

- Command (worktree root): `cd autobyteus-web && AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault corepack pnpm test:e2e:chat-composer-polish --cases <T..> --output-dir <fresh folder> --browser-executable /usr/bin/chromium` (real Nuxt dev + real `dist/app.js` + Chromium; real Claude CLI catalog; Anthropic key from the test vault)
- Commit: `817bd9950` + the updated probe file · ENV-2 (see API-11-12-14-real-stack/README.md; no fake LM Studio here) · 2026-11-10
- `API-08a-before-update-T01-fails.log`: the unmodified probe's T01: "No Claude SDK model with thinking_enabled + reasoning_effort in the catalog" (stale premise, REQ-005).
- `API-08b-run.log` / `API-08b-evidence.json`: T01..T04, T08, T06, T07 on the updated probe: T02, T03, T04, T06, T07, T08 Pass; T01 Fail on my own brittle bulb-colour assertion (fixed).
- `API-08c-*`: T01 rerun after the fix: Pass. `API-08d-*`: T09 (all seven AutoByteus Claude rows): Pass.
