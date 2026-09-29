# Release Notes — AGY background task turn liveness

## Fixed

- **Antigravity (AGY) runs no longer fail during long background commands.** Previously, if AGY sent no stream event for 300 seconds, AutoByteus stopped the turn with "Antigravity runtime stopped unexpectedly" and the run went offline. This happened for example while AGY waited on a background `sleep`, build or test command. AGY turns now have no idle timeout. A turn ends only when AGY reports its result, when the AGY process exits or errors, or when you press Stop/Terminate.
- **Dev servers and other daemons started by AGY no longer leave a spinning tool card.** When an AGY turn finishes while a started command is still running in the background, its card now shows as succeeded with "Started as a background task; still running when the turn ended.". The same result appears after reload and in history. If you Stop a turn, still-running commands show as interrupted.

## Known limitation

- With AGY 1.2.12, a dev server or other daemon that AGY has already moved to the background keeps running after Stop/Terminate, and it can keep its port bound. Stop such processes manually if needed. This behaviour is not new.
