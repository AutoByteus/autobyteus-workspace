# Native accepted-input history integration

Run from the workspace root:

```sh
pnpm test:native-input-history
```

This workspace-owned harness composes two independent product boundaries:

- native/server input acceptance, raw history, pending FIFO and projection;
- renderer saved-message hydration and live input-state presentation.

The dependency direction is **workspace harness → native/server and web**.
No web source, local test, setup or configuration imports this harness or the
core through it. The harness explicitly imports core runtime classes itself;
it is not a core re-export for web tests. The existing mandatory web guard and
its scan remain unchanged, and the root command runs it before the harness.

The config reuses the installed renderer Nuxt test environment and its setup
files, but selects only this external harness. Dependency deduplication shares
test tools, Pinia and presentation contracts with that environment; it does
not alias the core. No production dependency or workspace install change.
Ordinary web tests still use their normal config and supported contract input.

Use current core `dist` outputs (build changed core source first). The actual
native Agent and hosted-Team fixtures produce fresh serialized accepted input.
Models, provisioning and Apollo transport are controlled; the test exercises
real FIFO, normal history readers and renderer hydration. It checks Held A,
Queued B, repeated reconstruction, rich files/timestamp and no-send controls,
then new C authorizes recovery and A/B/C are consumed once.

API-owned native fixtures are imported read-only. Temporary runs/memory are
closed by the fixture. No old capture is patched or used as the acceptance
oracle. This is narrow in-process coverage, not a packaged renderer reload,
HTTP/WS, external-provider or complete desktop-build signoff.
