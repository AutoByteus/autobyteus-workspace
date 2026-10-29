# Node26 / Nuxt Happy-DOM storage shadowing
Source9b10fcd4d; IMP69:110 pass,10 fail in3 added MCP files. All failures dereference `localStorage.clear` (or its beforeEach), before product assertions.

Direct host Node26.12.0 inspection: Object.getOwnPropertyDescriptor(globalThis,"localStorage") is a configurable non-enumerable get/set accessor; reading it returns undefined and warns that --localstorage-file was not supplied. With --no-experimental-webstorage, the property is absent.

Local primary implementation: vitest/dist/chunks/index.CmSc2RE5.js getWindowKeys omits window keys already present in global unless explicitly listed; populateGlobal then sets global.window=global. @nuxt/test-utils/dist/vitest-environment.mjs calls populateGlobal with additionalKeys only fetch/Request. This leaves Node's present-but-unavailable native localStorage instead of the Happy-DOM implementation. Product mcpSecretReviewState deliberately accesses window.localStorage; real Electron has browser Storage, unlike this Node test host.

Correction is runner environment NODE_OPTIONS=--no-experimental-webstorage, not a production or durable-test patch. Re-run only the3 failing files plus2 new MCP store consumers. Do not count previously successful cases twice. Nuxt prepare refreshed before this focused run, but the direct property/selection trace establishes the cause independently; a pass alone is not the diagnosis. Logs retained. No user localStorage file/profile or credentials accessed.
