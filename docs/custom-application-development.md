# Custom Application Development — Milestone 1

External AutoByteus application authors use the devkit, canonical source layout, package validator, and the real standalone or Studio hosts described here.

## Installable packages

External projects should depend on these package names:

- `@autobyteus/application-devkit` for the `autobyteus-app` CLI.
- `@autobyteus/application-frontend-sdk` for `startApplication(...)`.
- `@autobyteus/application-backend-sdk` for `defineApplication(...)`.
- `@autobyteus/application-sdk-contracts` for shared manifest, iframe, backend, and request-context types.

Publishing/release automation for those packages may still be handled separately; this repository now treats these names as the canonical external install path.

## Canonical project layout

```text
my-autobyteus-app/
  package.json
  application.json
  autobyteus-app.config.mjs
  src/
    frontend/
      index.html
      app.ts
      styles.css
    backend/
      index.ts
      migrations/
      assets/
    agents/
    agent-teams/
  dist/
    importable-package/
      applications/
        <app-id>/
          application.json
          ui/
          backend/
          agents/
          agent-teams/
```

Developers edit `src/**`, `application.json`, and `autobyteus-app.config.mjs`. The runtime `ui/` and `backend/` folders are generated only inside `dist/importable-package/applications/<app-id>/` because the production AutoByteus package contract still expects those names.

Do not use generated `ui/` or `backend/` trees as source. Maintained repository samples use checked-in devkit configuration when their authoring roots differ from the starter defaults.

## Create a starter

```bash
pnpm dlx --package @autobyteus/application-devkit autobyteus-app create my-autobyteus-app --id my-autobyteus-app --name "My AutoByteus App"
cd my-autobyteus-app
pnpm install
```

The starter frontend calls `startApplication(...)` once. It does not include a dev-only alternate startup path.

Local application ids must start with a letter or number and contain only letters, numbers, underscores, or hyphens. The id becomes the generated package directory name under `applications/<app-id>/`.

## Pack an importable package

```bash
autobyteus-app pack
```

Default output:

```text
dist/importable-package/applications/<app-id>/application.json
dist/importable-package/applications/<app-id>/ui/index.html
dist/importable-package/applications/<app-id>/backend/bundle.json
dist/importable-package/applications/<app-id>/backend/dist/entry.mjs
```

Import `dist/importable-package` into AutoByteus. Do not import the source repository root.

Packing publishes atomically. The devkit assembles and validates into a
uniquely named staging directory, writes generated metadata such as the package
README using the final canonical package-root name, and only then swaps the
validated directory into place. A failed build or validation leaves the
previous package intact, and successful publication removes staging/previous
scratch directories. Runtime hosts treat the resulting package as immutable
input.

## Validate before distribution

```bash
autobyteus-app validate --package-root dist/importable-package
```

The devkit validator checks package-root shape, application manifest v4 fields, generated UI files, the backend bundle manifest v1 seven-flag exposure authority, backend entry file presence, v6 frontend-SDK/backend-definition versions, and manifest path containment. It is a preflight tool for developers and CI; the server import/discovery validation remains the authoritative production gate.

## Develop in either real host

```bash
autobyteus-app dev
```

The default command builds a disposable package, starts the real selected-application standalone host, and rebuilds/restarts it when resolved application inputs change. No backend URL or application ID override is required.

```bash
autobyteus-app dev --host studio --studio-url http://127.0.0.1:8000
```

Studio mode packs the configured output, imports or finds that exact local package through Studio's public API, and requests package reload after rebuild. Use Studio's explicit **Reload application** action to remount the current view.

Both development modes use the same atomic package publication path. A watched
rebuild never exposes a partially assembled package to either host.

## Run an existing build standalone

```bash
pnpm build
pnpm start
```

`start` validates `dist/importable-package` and runs it without rebuilding or watching. Mutable database, vault, logs, and application state live under `.autobyteus/standalone-data` by default; the package remains read-only.

Studio is assembled by `buildStudioServer`; standalone uses
`buildStandaloneApplicationServer` behind `startStandaloneApplicationHost`.
Each host builds one `ApplicationPlatformRuntime`. Runtime construction prepares
services and managers but starts no agent or team run. Application business
demand creates new runs, and post-listen recovery may restore recorded runs.
The process-owned `AgentToolsMcpRuntime` and scoped session managers preserve
the internal `/mcp/agent-tools/:sessionId` callback; Studio-only `/mcp/gateway`
is a separate external-client surface.

## Portable launch defaults

Distributable applications declare complete bundle-owned launch defaults for
every required execution-resource slot. Standalone uses those package defaults
directly and does not copy Studio settings. Studio may store a sparse,
host-owned override; resetting it reveals the original package default.
Invalid saved overrides remain visible for correction rather than being
silently repaired or deleted.

## Agent-published artifacts

When an application agent needs to publish files back to the application, configure the agent with the canonical local tool name:

```json
{
  "toolNames": ["publish_artifacts"]
}
```

The agent must call the plural batch contract even for a single file:

```ts
publish_artifacts({
  artifacts: [{ path: "relative/or/absolute/file.md", description: "Optional summary" }]
})
```

Each artifact item accepts only `path` and optional `description`; blank descriptions normalize to `null`. Paths may be relative to the current run workspace or absolute. Relative inputs are resolved against the workspace root before storage, and published artifact summaries/revisions expose the normalized absolute source path. Absolute paths may point inside or outside the workspace when they resolve to a readable file for the runtime server; publication snapshots the file into run memory at publish time. Application handlers should treat `path` as the source identity/display path and apply any app-specific artifact meaning in app-owned resolvers.

The old singular `publish_artifact` tool is not registered, exposed, allowlisted, discoverable, or mapped as an alias. Existing custom agent configs that still list only `publish_artifact` must be migrated to `publish_artifacts` before they can publish artifacts.

Application backends observe durable published artifacts through `artifactHandlers.persisted`, `publishedArtifacts.list(...)`, and `publishedArtifacts.readRevision(...)`.

## Runtime skill access

Application-authored run launches use the same configured-skill boundary as the
native AutoByteus UI. Agents and team members can use the skills listed on their
definition; an agent with no configured skills exposes no AutoByteus-managed
skills by default. The SDK contract supports `PRELOADED_ONLY` for this
host-managed behavior and `NONE` for explicit no-skill suppression. Do not send
`GLOBAL_DISCOVERY` or model broad/orchestrator agents as "all installed skills"
launches; configure the exact allowed `skillNames[]` on the agent definition
instead.

## Trust and safety boundary

AutoByteus user import of a generated package is prebuilt-only: import validation reads files and does not run app-owned `npm install`, build scripts, or package lifecycle scripts. This is not a sandbox guarantee. Application backend code is still executed later by the existing application worker runtime when the user launches the application.
