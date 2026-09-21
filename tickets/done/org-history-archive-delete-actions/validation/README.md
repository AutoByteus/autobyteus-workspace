# IR-001 Validation Evidence

Implementation-scoped evidence only; this directory is not an API/E2E acceptance package.

- `ir001-source-manifest.json` — SHA-256 manifest for the 26 changed implementation/test/doc files.
- `server-focused-tests.log` — 4 files / 19 tests passed.
- `web-focused-tests.log` — 4 files / 122 tests passed; the termination-error control intentionally logs its injected exception.
- `server-build.log` — production server build and sanitized bootstrap smoke passed.
- `web-build.log` — production Nuxt client/server build and prerender passed.
- `web-localization-checks.log` — localization boundary and literal audits passed.
- `diff-check.log` — `git diff --check` passed.
- `server-typecheck-rootdir-baseline.log` — existing `TS6059` tests-outside-`rootDir` qualification for direct no-emit config; production build typecheck passed.
- `web-typecheck-tooling-limit.log` — standalone typecheck unavailable due missing/incompatible `vue-tsc`; production Nuxt build passed.
- `rendered-preview-check.md` — real component desktop/narrow/mouse/keyboard/accessibility implementation inspection using disposable props and no backend.
- `ir002-source-manifest.json` — cumulative SHA-256 manifest after the `CR-001` local fix.
- `ir002-preservation.json` — four changed test/source paths and 22 hash-identical IR-001 paths; no removals.
- `ir002-panel-modal-tests.log` — actual panel-focused suite, 1 file / 65 tests passed, including the real zh-CN shared modal boundary.
- `ir002-web-focused-tests.log` — cumulative web focus, 4 files / 123 tests passed.
- `ir002-web-build.log` — Nuxt production build/prerender passed after the local fix.
- `ir002-localization-boundary.log` / `ir002-localization-literals.log` — both localization checks passed.
- `ir002-diff-check.log` — cumulative `git diff --check` passed.

No user profile, retained AgentOrg package, user server, provider, or real destructive data path was used.
