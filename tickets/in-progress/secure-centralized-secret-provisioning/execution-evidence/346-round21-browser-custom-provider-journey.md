# Round 21 browser custom-provider create/delete journey

- Scenario: `SCSP-E2E-BROWSER-CUSTOM-DELETE-001`
- Implementation HEAD: `ec0df6b1a9d216366e08262cd96f5280686b04d0`
- Surface: actual Nuxt browser frontend at `http://127.0.0.1:3000/settings`, backed by the built test server at `http://127.0.0.1:8000` and the persistent project test application database selected by committed `.env.test`.
- Startup: root `pnpm dev:test`; this builds the server, starts the built server through `test-runtime-bootstrap.mjs`, and starts Nuxt through `run-test-dev.mjs`.
- Fixture: task-owned loopback OpenAI-compatible `/v1/models` endpoint at `http://127.0.0.1:63221/v1`, requiring a synthetic credential that was entered into a password field and never recorded here.

## Observations

1. Opened Settings -> API Keys with the real browser tool. Existing provider list loaded from the assembled frontend/backend.
2. Selected **New Provider**, populated name, loopback base URL, and a synthetic hidden credential.
3. Clicked **Load Models**. The UI showed one exact fixture model and enabled **Save Provider**.
4. Clicked **Save Provider**. The UI showed `Round21 Browser Fixture`, `Configured`, `READY`, one model, and the selected model name. Supporting screenshot: `344-round21-browser-custom-provider-configured.png`.
5. Clicked the production **Remove Provider** control (`data-testid=delete-custom-provider-button`). No generic provider-key removal control was used or present.
6. After the mutation completed, the custom-provider card and provider row were absent. The UI returned to the ordinary provider list without displaying `AUTOBYTEUS_LLM_DISCOVERY_FAILED`. Supporting screenshot: `345-round21-browser-custom-provider-deleted.png`.
7. Correlated backend runtime evidence in `343-round21-browser-runtime.log` shows the custom ID first targeted-reloaded with one model, then targeted-reloaded with zero models on Delete, followed by a 40-model aggregate cache. Delete completion did not depend on AutoByteus remote discovery.

## Result

**Pass.** Real assembled browser Save/Delete behavior, runtime/catalog removal, and visible post-delete state passed at the exact reviewed HEAD. The evidence intentionally claims independence from unrelated remote availability, not that no best-effort discovery can ever be attempted by the aggregate cache wrapper.
