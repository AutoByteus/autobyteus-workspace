# Future-State Runtime Call Stack

- Ticket: `electron-embedded-server-config-consistency`

## Primary Spine: Embedded Electron Runtime

1. Electron launcher starts the embedded backend.
2. Electron transpile explicitly preserves the packaged entrypoint boundary while allowing imports from the project-root shared embedded config.
3. Launcher imports one shared embedded-server config module.
4. Launcher sets `AUTOBYTEUS_SERVER_HOST` to the shared embedded HTTP base URL.
5. Backend uses that stable loopback base URL for absolute media/file URL generation.
6. Electron renderer imports the same shared embedded-server config module through renderer-safe helpers.
7. Embedded node registry, window node context, and runtime config all resolve to the same embedded base URL.
8. First-run Electron `.env` generation writes the same embedded base URL when no explicit override is present.

## Bounded Local Spine: Server-Settings Data Boundary

1. `ServerSettingsManager.vue` mounts and asks the server-settings store for settings.
2. The store issues the shared server-settings query for the current backend contract.
3. The connected embedded node and connected remote nodes are expected to run the same console-server version.
4. Backend server-settings service emits explicit mutability metadata for each setting.
5. `AUTOBYTEUS_SERVER_HOST` is marked system-managed, non-editable, and non-deletable.
6. The component only consumes the backend-owned normalized result and does not infer mutability from description text.
7. Advanced settings UI renders system-managed settings read-only and hides save/delete actions without breaking same-version remote-node settings windows.

## Future-State Properties

- Embedded Electron host/port/base-url constants are no longer duplicated across runtime layers.
- Network changes do not change the default generated absolute media/file URLs for the embedded Electron case.
- Docker-specific host routing remains explicit and separate from the Electron embedded default path.
- Shared config placement does not alter the packaged Electron entrypoint or preload output paths.
- Startup-owned settings no longer cross an ownership boundary into the UI as if they were mutable user preferences.
- Remote-node settings behavior remains aligned with the embedded path because connected nodes are required to run the same server contract version.
